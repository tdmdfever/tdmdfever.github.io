// Compact text codec for the precomputed odds tables (see data/README.md).
// The generator (scripts/sync-genshin-odds.mjs) encodes with this file and the widget
// decodes with it, so the two can never drift apart. Pure functions, no dependencies.
//
// A series is a non-decreasing probability curve, one value per pull (index 0 = 0 pulls).
// Each value is rounded to an integer multiple of 1/q, then stored as the zigzag-encoded
// second difference, comma-separated. Curves are smooth, so nearly every number is tiny
// and the text gzips very well. Rounding error is at most 0.5/q, except that a value which is
// not certain (further than float noise below 1) is never rounded UP to exactly 1: 99.995% must
// not be stored, and so shown, as "100%". That edge case can cost up to 1/q.

const zigzag = (n: number) => (n >= 0 ? n * 2 : -n * 2 - 1);
const unzigzag = (n: number) => (n % 2 === 0 ? n / 2 : -(n + 1) / 2);

export function encodeSeries(values: ArrayLike<number>, q: number): string {
  const out: number[] = [];
  let prev = 0;
  let prevDelta = 0;
  for (let i = 0; i < values.length; i++) {
    const p = Math.min(1, Math.max(0, values[i]));
    let v = Math.round(p * q);
    if (v === q && p < 1 - 1e-9) v = q - 1;
    const delta = v - prev;
    out.push(zigzag(delta - prevDelta));
    prevDelta = delta;
    prev = v;
  }
  return out.join(',');
}

export function decodeSeries(text: string, q: number): Float64Array {
  const parts = text.split(',');
  const out = new Float64Array(parts.length);
  let prev = 0;
  let prevDelta = 0;
  for (let i = 0; i < parts.length; i++) {
    const delta = prevDelta + unzigzag(Number(parts[i]));
    prev += delta;
    prevDelta = delta;
    out[i] = prev / q;
  }
  return out;
}

/** Several series packed into one string, separated by ';'. */
export function encodeGroup(series: ArrayLike<number>[], q: number): string {
  return series.map((s) => encodeSeries(s, q)).join(';');
}

export function decodeGroup(text: string, q: number): Float64Array[] {
  return text.split(';').map((s) => decodeSeries(s, q));
}
