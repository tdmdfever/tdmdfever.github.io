// Data-access layer for the Genshin wish-odds widget. Nothing here computes probabilities:
// every curve was precomputed by the real calculator engine (scripts/sync-genshin-odds.mjs)
// and lives in data/*.json. This file only picks the right table for the current toggles and
// decodes it (a few hundred integer additions).
import base from './data/odds-base.json';
import { decodeGroup, decodeSeries } from './codec';


export const MAX_PITY = 89;
export const { softPityPull: SOFT_PITY_PULL, hardPityPull: HARD_PITY_PULL } = base.meta.pity;
const LINE_Q = 1 / base.meta.precision.curves;
const BAR_Q = 1 / base.meta.precision.bars;

/** Every plan is tabulated, and charted, out to the same number of pulls. */
export const MAX_PULLS = base.meta.maxPulls;

export interface Plan {
  /** Add a 4★ character (C2) that is on the same banner as 5★ A. */
  fourStar: boolean;
  /** Then add a second, later 5★ (5★ B). */
  secondFive: boolean;
}

export type ComboId = 'A' | 'A4' | 'AB' | 'A4B';
export const comboOf = (plan: Plan): ComboId => (plan.fourStar ? (plan.secondFive ? 'A4B' : 'A4') : plan.secondFive ? 'AB' : 'A');
export const needsExtras = (plan: Plan): boolean => plan.fourStar || plan.secondFive;

/** What the goals are called on screen. (Internally: 5★ A, 4★ A, 5★ B.) */
export const GOAL_NAMES = { first: 'First 5★', four: '4★ to C2', second: 'Second 5★' } as const;

/** The goals in the plan, in order. */
export function goalNames(plan: Plan): string[] {
  const names: string[] = [GOAL_NAMES.first];
  if (plan.fourStar) names.push(GOAL_NAMES.four);
  if (plan.secondFive) names.push(GOAL_NAMES.second);
  return names;
}

export const planName = (plan: Plan): string => goalNames(plan).join(' → ');

/** The goals of a plan, cumulatively: stage i is "the first i + 1 goals are all done". */
export function stageLabels(plan: Plan): string[] {
  return goalNames(plan).map((name, i) => (i === 0 ? name : `+ ${name}`));
}

export interface Curves {
  /** One cumulative curve per stage; the last is the whole plan. Index = pulls (0..MAX_PULLS). */
  stages: Float64Array[];
  /** Chance of owning at least C0..C6 of the 4★, by pull. Null unless the plan has the 4★. */
  levels: Float64Array[] | null;
}

// Decoded results, keyed by table and state, so revisiting a slider position costs nothing.
const cache = new Map<string, Float64Array | Float64Array[]>();
function memo<T extends Float64Array | Float64Array[]>(key: string, make: () => T): T {
  let hit = cache.get(key) as T | undefined;
  if (!hit) {
    hit = make();
    cache.set(key, hit);
  }
  return hit;
}

const line = (name: string, index: number, text: string) => memo(`${name}:${index}`, () => decodeSeries(text, LINE_Q));

/** Null when the plan needs the extras tables and they have not loaded yet. */
export function getCurves(plan: Plan, pity: number, guaranteed: boolean, extras: Extras | null): Curves | null {
  if (needsExtras(plan) && !extras) return null;
  const index = pity * 2 + (guaranteed ? 1 : 0);
  const stages = [line('A', index, base.A[index])];
  if (extras) {
    if (plan.fourStar) stages.push(line('A4', index, extras.A4[index]));
    if (plan.secondFive) stages.push(line(plan.fourStar ? 'A4B' : 'AB', index, (plan.fourStar ? extras.A4B : extras.AB)[index]));
  }
  let levels: Float64Array[] | null = null;
  if (plan.fourStar && extras) {
    const table = plan.secondFive ? extras.barsA4B : extras.barsA4;
    levels = memo(`bars${plan.secondFive ? 'A4B' : 'A4'}:${index}`, () => decodeGroup(table[index], BAR_Q));
  }
  return { stages, levels };
}

/** The extras chunk is fetched on demand as its own file, not bundled with the widget. */
export const loadExtras = () => import('./data/odds-extras.json').then((m) => m.default);
export type Extras = Awaited<ReturnType<typeof loadExtras>>;

/** Fewest pulls whose cumulative odds reach `target`, or null if not reached by `limit` pulls. */
export function pullsToReach(cdf: Float64Array, target: number, limit: number): number | null {
  for (let pulls = 0; pulls <= limit; pulls++) if (cdf[pulls] >= target - 1e-9) return pulls;
  return null;
}

/**
 * "0.6%", "8.9%", "59%", "99.4%", "100%". Never rounds up to 100% unless the value
 * really is 1 (within storage precision), so a 99.96% chance is not shown as certain.
 */
export function formatPct(p: number): string {
  const pct = Math.min(1, Math.max(0, p)) * 100;
  if (pct >= 100 - 1e-7) return '100%'; // matches the codec: only float-noise-close-to-1 is stored as certain
  if (pct >= 99) return `${(Math.floor(pct * 10) / 10).toFixed(1)}%`;
  if (pct < 9.95) return `${pct.toFixed(1)}%`;
  return `${Math.round(pct)}%`;
}
