// Worker for sync-genshin-odds.mjs: runs the real calculator engine for one starting state
// across every goal combination the widget offers. Run only through `npm run sync:genshin`.
import { parentPort } from 'node:worker_threads';

const engineUrl = (file) => new URL(`../../genshin-wish-calculator/src/engine/${file}`, import.meta.url).href;
const { runExactSimulation } = await import(engineUrl('exactEngine.ts'));
const { DEFAULT_CR_PARAMS } = await import(engineUrl('capturingRadiance.ts'));

export const MAX_PULLS = 300;

// The goal list the live calculator would hold for each toggle combination. 5★ A and B are
// identity-agnostic featured 5★ goals in sequential phases (no linkedCharacterGoalId); the
// 4★ is anchored to 5★ A, so it is available on the same banner, and targets C2.
const fiveA = { id: 'a', name: '5★ A', kind: '5star_character', banner: 'character', targetId: 'char5' };
const fourA = { id: 'c', name: '4★ A', kind: '4star_character', banner: 'character', targetId: 'c4a', targetLevel: 2, anchoredFiveStarGoalIds: ['a'] };
const fiveB = { id: 'b', name: '5★ B', kind: '5star_character', banner: 'character', targetId: 'char5' };
const COMBOS = { A: [fiveA], A4: [fiveA, fourA], AB: [fiveA, fiveB], A4B: [fiveA, fourA, fiveB] };

parentPort.on('message', ({ pity, guaranteed }) => {
  // crCounter 0, model A, r2 0.55 are the calculator's own defaults; pity4/guaranteed4 do
  // not affect 5★ odds.
  const state = { pity5: pity, guaranteed5: guaranteed, crCounter: 0, pity4: 0, guaranteed4: false };
  const combos = {};
  for (const [name, goals] of Object.entries(COMBOS)) {
    const result = runExactSimulation({
      pullBudget: MAX_PULLS,
      characterBanner: { state, featured5StarId: 'char5' },
      weaponBanner: { state: { pity5: 0, guaranteed5: false, fatePoints: 0, pity4: 0, guaranteed4: false } },
      crModelId: 'A',
      crParams: DEFAULT_CR_PARAMS,
      goals,
      trialCount: 1, // unused by the exact engine
    });
    combos[name] = {
      series: result.series.map((s) => Array.from(s.probabilities)),
      levels: result.breakdowns.map((b) => ({ labels: b.levelLabels, p: b.levelProbabilities.map((row) => Array.from(row)) })),
    };
  }
  parentPort.postMessage({ pity, guaranteed, combos });
});
