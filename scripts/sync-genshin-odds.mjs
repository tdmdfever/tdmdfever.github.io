// Manual dev tool (npm run sync:genshin). Precomputes every number the home-page Genshin
// widget shows, by running the REAL calculator engine in ../genshin-wish-calculator, and
// writes them as compact tables under src/components/genshin-wish/data/. The tables are
// committed; the build and CI never run this, and the browser never computes odds.
//
// Run through tsx (the engine is TypeScript): npx --yes tsx scripts/sync-genshin-odds.mjs
// It takes about 2-3 minutes on 8 cores. The output is deterministic.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { decodeGroup, decodeSeries, encodeGroup, encodeSeries } from '../src/components/genshin-wish/codec.ts';

const siteRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const sourceRoot = join(siteRoot, '..', 'genshin-wish-calculator');
const outDir = join(siteRoot, 'src', 'components', 'genshin-wish', 'data');
const MAX_PULLS = 300;
const LINE_Q = 100000; // curves: 0.001 percentage points
const BAR_Q = 10000; // constellation bars: 0.01 percentage points (shown as whole percents)

if (!existsSync(join(sourceRoot, 'src', 'engine'))) {
  console.error(`Source engine not found at ${sourceRoot}. Clone the calculator repo next to this one.`);
  process.exit(1);
}
const git = (...args) => execFileSync('git', ['-C', sourceRoot, ...args], { encoding: 'utf8' }).trim();
const commit = git('rev-parse', 'HEAD');
const dirty = git('status', '--porcelain', '--', 'src/engine') !== '';
if (dirty) console.warn('Warning: src/engine in the source repo has uncommitted changes; the stamped commit will not match exactly.');

// 1. Run the engine for every starting state, in parallel.
const jobs = [];
for (let pity = 0; pity < 90; pity++) for (const guaranteed of [false, true]) jobs.push({ pity, guaranteed });
const results = [];
const started = Date.now();
await new Promise((resolve, reject) => {
  const workers = Math.max(1, Math.min(8, os.cpus().length - 2));
  let next = 0;
  for (let i = 0; i < workers; i++) {
    const worker = new Worker(new URL('./genshin-odds-worker.mjs', import.meta.url), { execArgv: process.execArgv });
    const feed = () => {
      if (next < jobs.length) worker.postMessage(jobs[next++]);
      else worker.terminate();
    };
    worker.on('message', (r) => {
      results.push(r);
      if (results.length % 30 === 0) console.log(`${results.length}/${jobs.length} states (${Math.round((Date.now() - started) / 1000)}s)`);
      if (results.length === jobs.length) resolve();
      else feed();
    });
    worker.on('error', reject);
    feed();
  }
});
results.sort((a, b) => a.pity - b.pity || Number(a.guaranteed) - Number(b.guaranteed));

// 2. Check the assumptions the storage layout relies on, rather than trusting them.
const maxDiff = (a, b) => a.reduce((m, v, i) => Math.max(m, Math.abs(v - b[i])), 0);
let sharedPrefixDiff = 0;
for (const r of results) {
  const c = r.combos;
  sharedPrefixDiff = Math.max(sharedPrefixDiff, maxDiff(c.A.series[0], c.A4.series[0]), maxDiff(c.A.series[0], c.AB.series[0]), maxDiff(c.A.series[0], c.A4B.series[0]), maxDiff(c.A4.series[1], c.A4B.series[1]));
  for (const combo of Object.values(c)) {
    for (const s of combo.series) {
      if (s.length !== MAX_PULLS + 1 || s[0] !== 0) throw new Error(`unexpected series shape at pity ${r.pity}`);
      for (let i = 1; i < s.length; i++) if (s[i] < s[i - 1] - 1e-12 || s[i] > 1 + 1e-9) throw new Error(`series not a valid cdf at pity ${r.pity}`);
    }
  }
  for (const key of ['A4', 'A4B']) {
    const [breakdown] = r.combos[key].levels;
    if (breakdown.labels.join() !== 'C0,C1,C2,C3,C4,C5,C6') throw new Error('unexpected constellation levels');
  }
}
if (sharedPrefixDiff > 1e-9) throw new Error(`prefix curves are not shared between combos (max diff ${sharedPrefixDiff}); the storage layout needs changing`);
console.log(`shared prefix curves agree to ${sharedPrefixDiff.toExponential(1)}`);

// 3. Encode. State index = pity * 2 + (guaranteed ? 1 : 0).
const base = { A: [] };
const extras = { A4: [], AB: [], A4B: [], barsA4: [], barsA4B: [] };
for (const r of results) {
  const c = r.combos;
  base.A.push(encodeSeries(c.A.series[0], LINE_Q));
  extras.A4.push(encodeSeries(c.A4.series[1], LINE_Q));
  extras.AB.push(encodeSeries(c.AB.series[1], LINE_Q));
  extras.A4B.push(encodeSeries(c.A4B.series[2], LINE_Q));
  extras.barsA4.push(encodeGroup(c.A4.levels[0].p, BAR_Q));
  extras.barsA4B.push(encodeGroup(c.A4B.levels[0].p, BAR_Q));
}

// 4. Round-trip: decoding what we wrote must reproduce the engine output to within the
// storage precision. A failure here aborts before anything is written.
let worstLine = 0;
let worstBar = 0;
results.forEach((r, i) => {
  const c = r.combos;
  const check = (text, want, q) => maxDiff(Array.from(decodeSeries(text, q)), want);
  worstLine = Math.max(worstLine, check(base.A[i], c.A.series[0], LINE_Q), check(extras.A4[i], c.A4.series[1], LINE_Q), check(extras.AB[i], c.AB.series[1], LINE_Q), check(extras.A4B[i], c.A4B.series[2], LINE_Q));
  decodeGroup(extras.barsA4[i], BAR_Q).forEach((s, l) => (worstBar = Math.max(worstBar, maxDiff(Array.from(s), c.A4.levels[0].p[l]))));
  decodeGroup(extras.barsA4B[i], BAR_Q).forEach((s, l) => (worstBar = Math.max(worstBar, maxDiff(Array.from(s), c.A4B.levels[0].p[l]))));
});
// Half a step normally; a full step where a not-quite-certain value is kept just below 1 (see codec.ts).
if (worstLine > 1 / LINE_Q + 1e-12 || worstBar > 1 / BAR_Q + 1e-12) throw new Error(`round-trip error too large: line ${worstLine}, bar ${worstBar}`);
console.log(`round-trip max error: curves ${worstLine.toExponential(2)} (limit ${(1 / LINE_Q).toExponential(1)}), bars ${worstBar.toExponential(2)} (limit ${(1 / BAR_Q).toExponential(1)})`);

// 5. Write. One series per line so diffs and editors stay usable.
const pityRate = (n) => (n <= 73 ? 0.006 : n <= 89 ? 0.006 + 0.06 * (n - 73) : 1); // for the meta block only; cross-checked below
const { char5Rate } = await import(new URL('../../genshin-wish-calculator/src/engine/pity.ts', import.meta.url).href);
for (let n = 1; n <= 90; n++) if (Math.abs(char5Rate(n) - pityRate(n)) > 1e-12) throw new Error('char5Rate changed; update the pity meta');
const meta = {
  source: 'https://github.com/tdmdfever/genshin-wish-calculator (src/engine, exactEngine.ts + exactDp.ts)',
  engineCommit: commit,
  engineDirty: dirty,
  generated: new Date().toISOString().slice(0, 10),
  maxPulls: MAX_PULLS,
  stateIndex: 'pity * 2 + (guaranteed ? 1 : 0), pity 0-89',
  precision: { curves: 1 / LINE_Q, bars: 1 / BAR_Q },
  assumptions: 'Character banner, Capturing Radiance model A (crCounter 0, r2TotalWinRate 0.55), 4-star pity 0, no weapon banner.',
  pity: { baseRate: char5Rate(1), softPityPull: 74, hardPityPull: 90, softStep: char5Rate(75) - char5Rate(74) },
};
const lines = (arr) => `[\n${arr.map((s) => `    ${JSON.stringify(s)}`).join(',\n')}\n  ]`;
const dump = (obj, metaBlock) => `{\n  "meta": ${JSON.stringify(metaBlock)},\n${Object.entries(obj).map(([k, v]) => `  ${JSON.stringify(k)}: ${lines(v)}`).join(',\n')}\n}\n`;
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'odds-base.json'), dump({ A: base.A }, meta));
writeFileSync(join(outDir, 'odds-extras.json'), dump(extras, { engineCommit: commit, maxPulls: MAX_PULLS }));
console.log(`Wrote odds-base.json and odds-extras.json to ${outDir} (engine ${commit.slice(0, 7)}${dirty ? ', dirty' : ''}) in ${Math.round((Date.now() - started) / 1000)}s`);
process.exit(0);
