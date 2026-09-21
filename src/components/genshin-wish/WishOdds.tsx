import { Component, Fragment, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type ErrorInfo, type ReactNode, type RefObject } from 'react';
import './WishOdds.css';
import {
  GOAL_NAMES,
  HARD_PITY_PULL,
  MAX_PITY,
  MAX_PULLS,
  SOFT_PITY_PULL,
  formatPct,
  getCurves,
  goalNames,
  loadExtras,
  planName,
  pullsToReach,
  stageLabels,
  type Curves,
  type Extras,
  type Plan,
} from './odds';

const LIVE_SITE_URL = 'https://tdmdfever.github.io/genshin-wish-calculator/';
const DEFAULT_WIDTH = 640;
const GOAL_LEVEL = 2; // the 4★ goal is "C2"
const SINGLE_PLAN: Plan = { fourStar: false, secondFive: false };

// A goal's name inside a sentence (or as a chip title): underlined, so it reads as "one of the
// three goals" and not as ordinary words. Not used in tables, legends or chart labels.
function Term({ children }: { children: ReactNode }) {
  return <span className="wish__term">{children}</span>;
}

// The plan's goals as underlined terms joined by arrows, for the line under a readout.
function PlanTerms({ plan }: { plan: Plan }) {
  const names = goalNames(plan);
  return (
    <>
      {names.map((name, i) => (
        <Fragment key={name}>
          {i > 0 && ' → '}
          <Term>{name}</Term>
        </Fragment>
      ))}
    </>
  );
}

// Charts are drawn at the container's real pixel width (not scaled from a fixed viewBox)
// so text stays a readable size on a ~310px phone slot.
function useWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(220, Math.round(el.clientWidth)));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

const fmt = (n: number) => n.toFixed(1);
const linePath = (points: [number, number][]) => points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${fmt(x)} ${fmt(y)}`).join('');

// The two charts share left/right margins so their plot areas line up when stacked.
const MARGIN_LINE = { top: 40, right: 16, bottom: 46, left: 38 };
const MARGIN_BARS = { top: 22, right: 16, bottom: 42, left: 38 };

function YAxis({ x0, x1, y, ticks = [0, 0.5, 1] }: { x0: number; x1: number; y: (p: number) => number; ticks?: number[] }) {
  return (
    <>
      {ticks.map((tick) => (
        <g key={tick}>
          <line className="wish__grid" x1={x0} x2={x1} y1={y(tick)} y2={y(tick)} />
          <text className="wish__tick" x={x0 - 6} y={y(tick)} textAnchor="end" dominantBaseline="central">
            {tick * 100}%
          </text>
        </g>
      ))}
    </>
  );
}

function OddsChart({ curves, plan, pity, budget }: { curves: Curves; plan: Plan; pity: number; budget: number }) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const w = useWidth(box);
  const h = w < 500 ? 210 : 260;
  const m = MARGIN_LINE;
  const iw = w - m.left - m.right;
  const ih = h - m.top - m.bottom;
  const x = (pull: number) => m.left + (pull / MAX_PULLS) * iw;
  const y = (p: number) => m.top + (1 - p) * ih;

  const stages = curves.stages;
  const last = stages.length - 1;

  // Paths depend only on the curves and the chart size, so dragging the budget slider redraws
  // just the marker.
  const paths = useMemo(
    () =>
      stages.map((cdf) => {
        const points: [number, number][] = [];
        for (let pull = 0; pull <= MAX_PULLS; pull++) points.push([x(pull), y(cdf[pull])]);
        return linePath(points);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [curves, w, h],
  );

  // The first 5★ arrives by hard pity at pull 90 - pity, and the rate first climbs at pull 74 (so the
  // curve bends one pull earlier). If pity is already past that bend, the zone starts at pull 0.
  const hardAt = HARD_PITY_PULL - pity;
  const softAt = Math.max(0, SOFT_PITY_PULL - 1 - pity);
  const step = w < 500 ? 60 : 30;
  const ticks: number[] = [];
  for (let t = 0; t < MAX_PULLS; t += step) ticks.push(t);
  ticks.push(MAX_PULLS);

  const labels = stageLabels(plan);
  const summary = stages.map((cdf, i) => `${labels[i]}: ${formatPct(cdf[budget])}`).join('; ');
  const keyPulls = [60, 90, 120, 180, 240, 300];
  const desc =
    `Cumulative odds by pull, from 0 to ${MAX_PULLS} pulls. ` +
    `The whole plan (${planName(plan)}): ${keyPulls.map((p) => `${formatPct(stages[last][p])} by pull ${p}`).join(', ')}. ` +
    `Your first 5-star is guaranteed by pull ${hardAt}. Marker at your budget of ${budget} pulls: ${summary}.`;

  const markerAnchor = x(budget) < m.left + 34 ? 'start' : x(budget) > w - m.right - 34 ? 'end' : 'middle';

  return (
    <div className="wish__chart" ref={box}>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
        <title id={`${id}-t`}>Odds of finishing your plan, by pull</title>
        <desc id={`${id}-d`}>{desc}</desc>

        <YAxis x0={m.left} x1={w - m.right} y={y} />
        {ticks.map((tick) => (
          <text key={tick} className="wish__tick" x={x(tick)} y={h - m.bottom + 15} textAnchor={tick === 0 ? 'start' : tick === MAX_PULLS ? 'end' : 'middle'}>
            {tick === MAX_PULLS && w >= 700 ? `${tick} pulls` : tick}
          </text>
        ))}

        {/* Pity zone for the first 5★: the shaded band is soft pity, the dashed line is hard pity */}
        <rect className="wish__band" x={x(softAt)} y={m.top} width={x(hardAt) - x(softAt)} height={ih} />
        {softAt > 0 && <line className="wish__guide wish__guide--solid" x1={x(softAt)} x2={x(softAt)} y1={m.top - 24} y2={m.top + ih} />}
        <line className="wish__guide" x1={x(hardAt)} x2={x(hardAt)} y1={m.top - 10} y2={m.top + ih} />
        <text className="wish__label" x={Math.max(x(softAt), m.left) + 4} y={m.top - 28}>
          {w >= 500 ? 'soft pity: 5★ chance climbs' : 'soft pity'}
        </text>
        <text className="wish__label" x={x(hardAt) + 4} y={m.top - 13}>
          {w >= 500 ? 'hard pity: 5★ guaranteed' : 'hard pity'}
        </text>

        <path className="wish__area" d={`${paths[last]}L${fmt(x(MAX_PULLS))} ${fmt(y(0))}L${fmt(x(0))} ${fmt(y(0))}Z`} />
        {stages.slice(0, last).map((_, i) => (
          <path key={i} className={`wish__line wish__line--stage wish__line--stage${i}`} d={paths[i]} />
        ))}
        <path className="wish__line" d={paths[last]} />

        <line className="wish__marker-line" x1={x(budget)} x2={x(budget)} y1={m.top} y2={m.top + ih} />
        <text className="wish__label wish__label--marker" x={x(budget)} y={h - m.bottom + 31} textAnchor={markerAnchor}>
          pull {budget}
        </text>
        {stages.slice(0, last).map((cdf, i) => (
          <circle key={i} className="wish__marker-dot wish__marker-dot--stage" cx={x(budget)} cy={y(cdf[budget])} r={3.5} />
        ))}
        <circle className="wish__marker-dot" cx={x(budget)} cy={y(stages[last][budget])} r={5} />
      </svg>
    </div>
  );
}

function BarsChart({ levels, budget }: { levels: Float64Array[]; budget: number }) {
  const id = useId();
  const box = useRef<HTMLDivElement>(null);
  const w = useWidth(box);
  const h = w < 500 ? 180 : 200;
  const m = MARGIN_BARS;
  const iw = w - m.left - m.right;
  const ih = h - m.top - m.bottom;
  const band = iw / levels.length;
  const barW = Math.min(band * 0.56, 72);
  const y = (p: number) => m.top + (1 - p) * ih;

  const desc = `Chance of owning at least each constellation of the 4-star by pull ${budget}: ${levels
    .map((cdf, i) => `C${i} ${formatPct(cdf[budget])}`)
    .join(', ')}. C${GOAL_LEVEL} is the goal.`;

  return (
    <div className="wish__chart" ref={box}>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-labelledby={`${id}-t`} aria-describedby={`${id}-d`}>
        <title id={`${id}-t`}>4-star constellation odds at pull {budget}</title>
        <desc id={`${id}-d`}>{desc}</desc>
        <YAxis x0={m.left} x1={w - m.right} y={y} />
        {levels.map((cdf, i) => {
          const p = cdf[budget];
          const cx = m.left + band * (i + 0.5);
          return (
            <g key={i}>
              <rect
                className={i === GOAL_LEVEL ? 'wish__bar wish__bar--goal' : 'wish__bar'}
                x={cx - barW / 2}
                y={y(p)}
                width={barW}
                height={Math.max(0, m.top + ih - y(p))}
              />
              <text className="wish__value" x={cx} y={y(p) - 5} textAnchor="middle">
                {formatPct(p)}
              </text>
              <text className="wish__tick" x={cx} y={h - m.bottom + 15} textAnchor="middle">
                C{i}
              </text>
              {i === GOAL_LEVEL && (
                <text className="wish__label wish__label--goal" x={cx} y={h - m.bottom + 30} textAnchor="middle">
                  goal
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function LineSwatch({ className }: { className: string }) {
  return (
    <svg width="22" height="8" aria-hidden="true">
      <line className={className} x1="0" x2="22" y1="4" y2="4" />
    </svg>
  );
}

function WishOddsInner() {
  const [pity, setPity] = useState(0);
  const [guaranteed, setGuaranteed] = useState(false);
  const [budget, setBudget] = useState(90);
  const [plan, setPlan] = useState<Plan>(SINGLE_PLAN);
  const ids = { pity: useId(), budget: useId(), guaranteed: useId(), four: useId(), second: useId() };

  // The tables for the longer plans are a separate file, fetched just after the widget mounts.
  // It is data, not computation: until it arrives the two goal toggles stay disabled.
  const [extras, setExtras] = useState<Extras | null>(null);
  const [extrasFailed, setExtrasFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(() => {
      loadExtras().then(
        (loaded) => alive && setExtras(loaded),
        () => alive && setExtrasFailed(true),
      );
    }, 200);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, []);

  // Every number on screen is a lookup. The budget slider only moves a marker.
  const curves = useMemo(() => getCurves(plan, pity, guaranteed, extras) ?? getCurves(SINGLE_PLAN, pity, guaranteed, null)!, [plan, pity, guaranteed, extras]);

  const labels = stageLabels(plan);
  const whole = curves.stages[curves.stages.length - 1];
  const single = curves.stages.length === 1;
  const p50 = pullsToReach(whole, 0.5, MAX_PULLS);
  const p90 = pullsToReach(whole, 0.9, MAX_PULLS);
  const beyond = `>${MAX_PULLS}`;

  const summary =
    `Plan: ${planName(plan)}. ${pity} pulls since your last 5-star, ${guaranteed ? 'with' : 'without'} a guaranteed featured character. ` +
    `Chance of finishing the whole plan within ${budget} pulls: ${formatPct(whole[budget])}. ` +
    (single ? '' : `By goal: ${curves.stages.map((cdf, i) => `${labels[i]} ${formatPct(cdf[budget])}`).join(', ')}. `) +
    `The whole plan reaches 50% by pull ${p50 ?? beyond} and 90% by pull ${p90 ?? beyond}. ` +
    (curves.levels ? `4-star constellation odds at pull ${budget}: ${curves.levels.map((cdf, i) => `C${i} ${formatPct(cdf[budget])}`).join(', ')}.` : '');

  // Screen readers get the summary once things settle, not on every slider step.
  const [announced, setAnnounced] = useState(summary);
  useEffect(() => {
    const timer = setTimeout(() => setAnnounced(summary), 500);
    return () => clearTimeout(timer);
  }, [summary]);

  const toggle = (key: keyof Plan) => (e: ChangeEvent<HTMLInputElement>) => setPlan((current) => ({ ...current, [key]: e.target.checked }));
  const goalsDisabled = !extras;
  const goalsHint = extrasFailed ? "couldn't load the longer plans; reload to retry" : goalsDisabled ? 'loading…' : null;

  return (
    <div className="wish">
      <p className="wish__caption">
        Each pull in Genshin Impact&rsquo;s gacha is a lottery for a rare 5★. The odds climb the longer you go without one
        (&ldquo;pity&rdquo;) and reach 100% at pull {HARD_PITY_PULL}, but a 5★ is only the character you want about half the time. Drag to see
        the exact odds, then add goals to plan further ahead.
      </p>

      <div className="wish__controls">
        <div className="wish__field">
          <label htmlFor={ids.pity}>
            Current pity <span className="wish__hint">(pulls since last 5★)</span>
          </label>
          <div className="wish__slider">
            <input
              id={ids.pity}
              type="range"
              min={0}
              max={MAX_PITY}
              step={1}
              value={pity}
              style={{ '--fill': `${(pity / MAX_PITY) * 100}%` } as CSSProperties}
              aria-valuetext={`${pity} pulls since last 5-star`}
              onChange={(e) => setPity(Number(e.target.value))}
            />
            <output htmlFor={ids.pity}>{pity}</output>
          </div>
        </div>

        <div className="wish__field">
          <label htmlFor={ids.budget}>
            Pull budget <span className="wish__hint">(pulls you can afford)</span>
          </label>
          <div className="wish__slider">
            <input
              id={ids.budget}
              type="range"
              min={1}
              max={MAX_PULLS}
              step={1}
              value={budget}
              style={{ '--fill': `${((budget - 1) / (MAX_PULLS - 1)) * 100}%` } as CSSProperties}
              aria-valuetext={`${budget} pulls`}
              onChange={(e) => setBudget(Number(e.target.value))}
            />
            <output htmlFor={ids.budget}>{budget}</output>
          </div>
        </div>

        <div className="wish__field wish__field--check">
          <input id={ids.guaranteed} type="checkbox" checked={guaranteed} onChange={(e) => setGuaranteed(e.target.checked)} />
          <label htmlFor={ids.guaranteed}>
            Guaranteed featured 5★ <span className="wish__hint">(lost the last 50/50)</span>
          </label>
        </div>
      </div>

      <fieldset className="wish__plan" aria-busy={goalsDisabled && !extrasFailed}>
        <legend>Your plan, in order</legend>
        <div className="wish__chain">
          <span className="wish__goal wish__goal--fixed">
            <span className="wish__goal-name">{GOAL_NAMES.first}</span>
            <span className="wish__goal-what">the featured 5★ you want</span>
          </span>
          <span className="wish__arrow" aria-hidden="true">
            →
          </span>
          <label className="wish__goal" htmlFor={ids.four} data-on={plan.fourStar || undefined} data-disabled={goalsDisabled || undefined}>
            <input id={ids.four} type="checkbox" checked={plan.fourStar} disabled={goalsDisabled} onChange={toggle('fourStar')} />
            <span className="wish__goal-text">
              <span className="wish__goal-name">{GOAL_NAMES.four}</span>
              <span className="wish__goal-what">
                3 copies of a 4★ on the <Term>{GOAL_NAMES.first}</Term>&rsquo;s banner
              </span>
            </span>
          </label>
          <span className="wish__arrow" aria-hidden="true">
            →
          </span>
          <label className="wish__goal" htmlFor={ids.second} data-on={plan.secondFive || undefined} data-disabled={goalsDisabled || undefined}>
            <input id={ids.second} type="checkbox" checked={plan.secondFive} disabled={goalsDisabled} onChange={toggle('secondFive')} />
            <span className="wish__goal-text">
              <span className="wish__goal-name">{GOAL_NAMES.second}</span>
              <span className="wish__goal-what">another featured 5★, on a later banner</span>
            </span>
          </label>
        </div>
        {goalsHint && <p className="wish__plan-hint">{goalsHint}</p>}
      </fieldset>

      <section className="wish__panel" aria-labelledby={`${ids.budget}-h`}>
        <div className="wish__head">
          <div className="wish__head-text">
            <h4 id={`${ids.budget}-h`}>Cumulative odds</h4>
            <p className="wish__what">
              {single
                ? 'Chance of the featured character within a given number of pulls, adding up every pull'
                : 'Chance of finishing every goal, in order, within a given number of pulls'}
            </p>
          </div>
          <p className="wish__readout" aria-hidden="true">
            <strong>{formatPct(whole[budget])}</strong> by pull {budget}
            <span className="wish__sub">
              {single ? (
                <>
                  chance of your <Term>{GOAL_NAMES.first}</Term>
                </>
              ) : (
                <>
                  all of <PlanTerms plan={plan} />
                </>
              )}
            </span>
          </p>
        </div>
        <OddsChart curves={curves} plan={plan} pity={pity} budget={budget} />
        <table className="wish__table">
          <caption className="wish__sr">Odds by goal at pull {budget}</caption>
          <thead>
            <tr>
              <th scope="col">Goal</th>
              <th scope="col">by pull {budget}</th>
              <th scope="col">50% by</th>
              <th scope="col">90% by</th>
            </tr>
          </thead>
          <tbody>
            {curves.stages.map((cdf, i) => (
              <tr key={i}>
                <th scope="row">
                  <span className="wish__rowkey">
                    <LineSwatch className={i === curves.stages.length - 1 ? 'wish__line' : `wish__line wish__line--stage wish__line--stage${i}`} />
                    {labels[i]}
                  </span>
                </th>
                <td>{formatPct(cdf[budget])}</td>
                <td>{pullsToReach(cdf, 0.5, MAX_PULLS) ?? beyond}</td>
                <td>{pullsToReach(cdf, 0.9, MAX_PULLS) ?? beyond}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {plan.fourStar && plan.secondFive && (
          <p className="wish__note">
            Estimate: with all three goals on, the bold curve and the constellation bars below are the calculator&rsquo;s own approximation and
            can sit several points away from a full simulation at some pull counts. The shorter curves are not affected.
          </p>
        )}
      </section>

      {curves.levels && (
        <section className="wish__panel" aria-labelledby={`${ids.four}-h`}>
          <div className="wish__head">
            <div className="wish__head-text">
              <h4 id={`${ids.four}-h`}>4★ constellation odds</h4>
              <p className="wish__what">
                Chance of owning at least this constellation by pull {budget} (C0 is your first copy).{' '}
                {plan.secondFive ? (
                  <>
                    Extra copies stop counting once you start the <Term>{GOAL_NAMES.second}</Term> (the 4★ is only on the{' '}
                    <Term>{GOAL_NAMES.first}</Term>&rsquo;s banner).
                  </>
                ) : (
                  <>
                    Extra copies keep counting while you keep pulling on the <Term>{GOAL_NAMES.first}</Term>&rsquo;s banner.
                  </>
                )}
              </p>
            </div>
            <p className="wish__readout" aria-hidden="true">
              <strong>{formatPct(curves.levels[GOAL_LEVEL][budget])}</strong> to reach C{GOAL_LEVEL} by pull {budget}
              <span className="wish__sub">
                C0 {formatPct(curves.levels[0][budget])} · C6 {formatPct(curves.levels[6][budget])}
              </span>
            </p>
          </div>
          <BarsChart levels={curves.levels} budget={budget} />
        </section>
      )}

      <p className="wish__sr" role="status" aria-live="polite" aria-atomic="true">
        {announced}
      </p>

      <p className="wish__foot">
        Your own goals, the weapon banner and other 4★ characters are in the{' '}
        <a href={LIVE_SITE_URL} target="_blank" rel="noreferrer noopener">
          full calculator &rarr;
        </a>
      </p>
    </div>
  );
}

// If anything in the widget throws while rendering in the browser, React unmounts the whole
// tree, which used to leave an empty hole in the tile. This boundary shows a fallback that
// links to the full calculator instead, and logs the real error (and, in dev, prints it).
class WishOddsBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[wish-odds] the widget crashed while rendering:', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="wish__fallback" role="alert">
        <p>
          The interactive preview didn&rsquo;t load. Try reloading the page, or use the{' '}
          <a href={LIVE_SITE_URL} target="_blank" rel="noreferrer noopener">
            full calculator &rarr;
          </a>
        </p>
        {import.meta.env.DEV && <pre>{String(this.state.error.stack ?? this.state.error.message).slice(0, 600)}</pre>}
      </div>
    );
  }
}

export default function WishOdds() {
  return (
    <WishOddsBoundary>
      <WishOddsInner />
    </WishOddsBoundary>
  );
}
