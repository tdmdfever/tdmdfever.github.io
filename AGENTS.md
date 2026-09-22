## Project overview

Terry Deng's personal portfolio site: resume (viewable + downloadable), contact
links, projects, and a life-updates feed with a timeline. Built with Astro so
that adding content is a file change, not a code change. Deploys to GitHub
Pages via GitHub Actions. Live at https://tdmdfever.github.io/ (repo
`tdmdfever/tdmdfever.github.io`, public).

## Where content lives

- `src/data/site.ts` — name, tagline, email, GitHub, LinkedIn. Single source of
  truth; every page that shows contact info reads from here (home page and
  footer both render `ContactLinks.astro`).
  **No phone numbers anywhere on the site, on purpose** (Terry doesn't want
  spam calls/texts). Don't add a phone field or `tel:` links. The
  `public/resume.pdf` published here must be the phone-free copy; Terry keeps
  the version with a phone number for sending to people directly. Email is
  fine to show.
- `src/data/timeline.ts` — milestone events (`{ date, label }`) shown next to
  `/updates`. Order doesn't matter, it's sorted automatically.
- `src/content/projects/*.md` — one file per project (Astro content
  collection, schema in `src/content.config.ts`). Requires `title`,
  `description`, `date`; optional `tags`, `featuredOrder`, `demo`, and `links`
  — an ordered list of `{ label, url }` shown as buttons on the project page
  and in the home-page tile, in the order written (any number, any label, e.g.
  Live Site / Illustrated Explainer / Repo). The FIRST link is drawn as the
  primary (solid gold) button and the rest as secondary, so put the main
  action first.
- `src/components/embeds/<project-slug>.astro` — optional. If a component
  with a project's slug exists here AND that project's `demo` is not `false`
  (default `true`), the home page renders that project as a wide
  `FeaturedProjectTile` with the component embedded inside it (see "Genshin
  embed" below). Swapping which project demos is just adding/removing that
  project's embed file; setting `demo: false` retires a demo without deleting
  its file or code, dropping it back to a plain card — combine with
  `featuredOrder` to push it down the list while a newer project's demo takes
  the top spot. `src/utils/projects.ts` (`getFeaturedProjects()`,
  `getEmbed()`) is the one place this logic lives; `index.astro` is currently
  its only reader. The embeds folder is scanned at startup, so restart the
  dev server after adding or removing an embed file (not needed for `demo` or
  `featuredOrder`, which are ordinary frontmatter and reload live).
- `src/content/updates/*.md` — one file per update post (content
  collection). Requires `title`, `description`, `date`.
- `public/resume.pdf` — the resume, full stop. This is the only file to edit;
  everything else about the resume is generated from it. `/resume` (and the
  home page's "Resume" button, which just links there) shows only this PDF's
  preview image and a download button — no separate text/HTML version exists
  anywhere on the site (there was one, `src/data/resume.ts` +
  `src/components/Resume.astro`; both were deleted, along with `Inline.astro`
  and `utils/inline.ts` which only existed to render it). Don't recreate that
  system — the PDF preview is the whole resume now.
- `public/resume-preview.png` — plain static image shown on `/resume`.
  Deliberately an `<img>`, not an embedded PDF viewer — no toolbar/zoom/
  sidebar wanted. **Generated, don't edit by hand**: an Astro integration in
  `astro.config.mjs` (`resumePreview()`, using
  `scripts/generate-resume-preview.mjs`) renders page 1 of `resume.pdf` to
  this PNG at 200 DPI via `pdfjs-dist` + `@napi-rs/canvas`. It runs on
  `astro:build:start` and once on `astro:server:setup`, and during
  `astro dev` it also watches `public/resume.pdf` and re-renders +
  full-reloads on change.

## Design system

Dark-only: blue-tinted charcoal ground, panels a step lighter, hairline
borders, warm off-white text, soft gold accent. It deliberately matches the
Illustrated Explainer page of the Genshin project (a sibling repo) so the two
read as one system. **All colors, fonts, spacing and radii are tokens in
`src/styles/tokens.css` (the style guide, with a header explaining each one);
components must use `var(--color-*)`, `--font-*`, `--space-*`, `--radius` /
`--radius-sm` and never hard-code values.** Re-theming means editing that one
file; a swap reaches every page and the Genshin widget (tested: changing the gold
left no old gold anywhere in the served pages or widget CSS). `tokens.css` is
imported in `Layout.astro` right before `global.css`, NOT via a CSS `@import`
inside `global.css`: the dev server does not live-reload `@import`ed files (edits
to them never showed up until a restart), which would defeat the point. Two places
cannot read the tokens and are updated by hand: `<meta name="theme-color">` in
`Layout.astro` (match `--color-bg`) and `public/favicon.svg` (plain black/white).

- Surfaces: `--color-bg` (page), `--color-surface` (panels: `.card`, the project
  tile, code), `--color-surface-2` (panels nested in panels: the widget's
  charts). Borders: `--color-border`, `--color-border-strong`.
- Accent: `--color-accent` (gold) is only for links, interactive states and
  data highlights, never large fills. `--color-accent-2` (lavender) is only for
  a second data series in charts (dashed, so it never relies on colour alone); the
  Genshin widget currently uses it just for the constellation bars.
- Type, all IBM Plex, self-hosted via `@fontsource` and imported in
  `Layout.astro` (no third-party requests): Serif 600 for h1-h3, Sans 400/500/
  600 + 400 italic for prose, Mono 400/500 for dates, numbers, tags, labels and
  buttons. Using a new weight or style means importing its CSS in `Layout.astro`.
- Shape: panels and buttons use `--radius`, tags `--radius-sm`; sliders, rules
  and the timeline line stay sharp.
- Buttons vs tags must stay visibly different (Terry flagged them looking too
  alike). Tags = labels: small, mono, caps, outlined, tight corners. Buttons =
  actions: larger, sans, sentence case, filled, softly rounded. Primary is solid
  gold, secondary is a raised `--color-surface-2` key that turns gold on hover,
  and `target="_blank"` buttons get a small arrow. Don't restyle one to match
  the other.
- Text is cream (`--color-text` `#d9d0ba`, ~11.8:1 on the ground), not white, on
  purpose (Terry found off-white still too bright). Muted text is a warm gray
  to sit with it.
- The `/resume` page previews a black-on-white PDF, which is a flashbang on a dark
  site. The preview image sits on a cream "sheet" (`--color-paper`) and is
  multiplied onto it (`mix-blend-mode: multiply`, `resume-sheet` in `resume.astro`),
  so the page's white becomes cream while black text stays black (14:1 on the
  paper; the sheet is 12:1 against the page vs 18:1 for pure white). Only the
  preview changes; the downloadable PDF is untouched. Alternatives considered and
  not built: inverting the preview to dark (stops matching the printed document),
  or a small thumbnail card with a download button.
- Project write-ups use `.prose--wide` (full page width, same side margins as the
  header and footer). Other `.prose` blocks (update posts, hero tagline) keep the
  42rem cap.
- Contrast was checked (WCAG AA): muted text is >= 5.5:1 on every surface, gold
  >= 8:1. Re-check if you change tokens.
- History: a first pass used pure black, terminal green, `>` prompts and
  uppercase tracked headings. It was rejected as too "hacker-y" and replaced.
  Don't reintroduce terminal ornaments (prompts, blocks, tracked-caps headings).

## Updates page timeline (non-obvious logic)

`src/pages/updates/index.astro` renders one CSS grid row per post on desktop
(≥800px) and attaches each `timeline.ts` event's dot to the row of the
**earliest** post in that event's calendar month — not the newest/topmost
post that month. This is computed fresh from dates on every build (group by
`YYYY-MM`, find the last post per month since posts are sorted newest-first).
A month with an event but no posts gets its own standalone row instead. Below
800px it falls back to a simpler stacked list + separate timeline
(`.updates-stacked`). Don't hardcode row positions when editing this — the
whole point is that it recomputes as posts/events are added.

## Deploying

`.github/workflows/deploy.yml` builds and deploys to GitHub Pages on push to
`main` (official `withastro/action@v3`, pinned to Node 22 — Astro 7 requires
>=22.12 and the action defaults to Node 20). `astro.config.mjs` is set for a
user site: repo `tdmdfever.github.io`, `site: 'https://tdmdfever.github.io'`,
`base: '/'`. Pushed to GitHub on 2026-09-21. Pages' source is set to **GitHub
Actions** (Settings → Pages), not "deploy from branch": a `<user>.github.io` repo
starts in branch mode, which would publish the raw source instead of the build,
so the source was switched with `gh api -X PUT repos/<owner>/<repo>/pages -f
build_type=workflow`. Every push to `main` redeploys.

CI builds from this repo alone, so nothing under `src/` may import from
outside it (e.g. the sibling `../genshin-wish-calculator` folder): that works
locally and fails on deploy. Data or code from other repos must be copied in
(the Genshin widget's numbers are generated files, see "Genshin embed").

## Genshin embed

A React island (`client:visible`, the only hydration on the site) inside the
Genshin project's `FeaturedProjectTile`. Controls: current pity (0-89), pull
budget, a "guaranteed" checkbox, and a goal chain "First 5★ → 4★ to C2 → Second
5★" where the last two are toggles (4 plans). Outputs: one full-width
cumulative-odds chart (the whole plan, plus the earlier goals as thinner lines), a
per-goal table (odds at the budget, 50% by, 90% by), and, when the 4★ is on, a bar
chart of the chance of owning at least each of C0-C6 (lavender, goal level at
full strength). Pity is shown as a band on the chart: shaded = soft pity, dashed
line = hard pity, for the first 5★. Every plan uses the same 0-300 pull range, so
toggling a goal never rescales the chart or the budget slider.

Naming: the goals are called **First 5★**, **4★ to C2** and **Second 5★** on
screen (`GOAL_NAMES` in `odds.ts`); "A / B" was confusing. Internally, and in the
data keys and generator, they are still 5★ A, 4★ A and 5★ B (`A`, `A4`, `AB`,
`A4B`). A goal's name is underlined (`Term` / `.wish__term`, and chip titles) when
it appears in a sentence or as a chip title, and plain in the table, legend and
chart labels. Links are gold and never underlined, so the two don't clash.

**Nothing is computed in the browser.** Every curve was precomputed by the
calculator's real engine and committed as data; the widget only looks values up
and decodes them (a few hundred integer additions), so there is no compute time
and no engine in the bundle. Engine details, provenance, assumptions and the
known approximation live in `src/components/genshin-wish/data/README.md`, not here.

Files:

- `src/components/embeds/genshin-wish-calculator.astro` — thin wrapper that the
  home-page glob picks up; renders `<WishOdds client:visible />`.
- `src/components/genshin-wish/WishOdds.tsx` + `WishOdds.css` — the UI. Hand-
  rolled inline SVG charts, drawn at the container's measured pixel width. Uses
  the site's CSS custom properties only, and a container query (not a viewport
  media query) so it follows the embed slot's width.
- `src/components/genshin-wish/odds.ts` — picks the right table for the current
  toggles, decodes it (memoised), plus `formatPct` and `pullsToReach`.
- `src/components/genshin-wish/codec.ts` — the compact text codec, shared by the
  generator (encode) and the widget (decode) so they cannot drift.
- `src/components/genshin-wish/data/` — `odds-base.json` (bundled: the single-goal
  plan and a `meta` block with the source commit) and
  `odds-extras.json` (a separate chunk fetched shortly after the widget mounts:
  the other three plans and the constellation bars). Generated; never edit.
- `scripts/sync-genshin-odds.mjs` + `scripts/genshin-odds-worker.mjs`, run as
  `npm run sync:genshin` — regenerates both JSON files by running the engine in
  the sibling `../genshin-wish-calculator` checkout (~3 min, needs `npx tsx`). A
  manual dev tool: the build and CI never run it, and the generated files are
  committed. Re-run it whenever the calculator's engine changes, then compare a few
  numbers against the live calculator before committing. It aborts (writing
  nothing) if its own assumptions or the encode/decode round trip fail.

Constraints to keep:

- Nothing under `src/` may import from outside this repo (see Deploying). The
  generator reads the sibling repo, but it is a dev tool that CI never runs.
- The goal toggles are disabled until `odds-extras.json` has loaded (a few
  hundred ms; "loading…" hint, and a "couldn't load" hint if the request fails,
  in which case the single-goal plan keeps working). Keep the default plan in
  `odds-base.json` so the first paint never waits for a fetch.
- The budget slider (1-300, the same for every plan) only moves a marker; it never
  triggers work.
- Vertical space is deliberate: the sliders are `position: sticky` (top: 0) on wide
  slots, so you can drag the budget while the charts scroll underneath and watch the
  constellation bars change without scrolling back. The pinned bar needs an opaque
  background matching the tile (`--color-surface`) or the charts show through. Not
  pinned on phones (it would eat the screen). Each panel's big readout sits beside
  its title, there is no separate legend (the table's first column carries the line
  styles, and the soft/hard-pity meaning is in the chart's own labels), and there is
  one "Estimate" note covering both the curve and the bars. Keep the sliders' labels
  and hints to one line each or the pinned bar gets taller. The three-goal widget is
  ~1,100 px tall at 1100 px wide (it was ~1,450); the bars fit under the pinned bar in
  an 800 px-tall window.
- The odds table uses `table-layout: fixed` with widths set on the header cells, so
  the columns stay put as goals are added or removed. There is deliberately no
  "any 5★" reference line or row: it made the single-goal view differ from the rest.
  (The soft-pity ramp looks compressed at high pity because the chart is cumulative
  and conditional on not having pulled a 5★ yet; that is correct, not an artefact.)
- Storage precision is documented in `codec.ts` and the data README: curves to
  0.001 pp, bars to 0.01 pp. A value that is not certain is never stored as
  exactly 1, so `formatPct` never shows "100%" for a chance below it. Never
  compare a probability with `=== 1`.
- The three-goal plan (4★ on and 5★ B on) is the calculator's own approximation
  and can be up to ~9 points off a full simulation at some pull counts (the
  calculator's documented "phase-handoff residual"); the widget shows a note under
  the chart and under the bars in that plan. Do not remove the notes without
  changing the data source.
- global.css has `section + section { margin-top }`; the widget's panels reset
  it, so avoid adding sibling `<section>`s inside it without doing the same.
- The soft-pity band starts one pull BEFORE `SOFT_PITY_PULL` (offset by pity:
  `SOFT_PITY_PULL - 1 - pity`, floored at 0) on purpose: the rate first rises at
  pull 74, so the cumulative curve bends at pull 73 (pity 72). The band's solid
  left edge sits on that bend.
- Both charts use the `MARGIN_LINE` / `MARGIN_BARS` constants in `WishOdds.tsx`,
  which share left/right margins so the plot areas line up when stacked.
- Charts have `role="img"` with a short `aria-labelledby` name and the numbers in
  `aria-describedby`; a debounced `role="status"` region announces the summary.
- Genshin widget dev flakiness. **The dominant real-world cause, found
  2026-09-22 after the widget broke a fourth time despite an earlier "fix":
  `astro dev` and `astro build` share the exact same cache directory,
  `node_modules/.vite/deps`, and corrupt it if run close together.** Direct
  proof: a literal collision artifact was found on disk, `node_modules/.vite/deps
  2` (Vite/the OS renaming a second concurrent write rather than colliding
  silently), timestamped to the exact moment a `npm run build` sanity check ran
  right after a dev-server restart. After that collision, the dev server served
  a stack trace rooted in `node_modules/react-dom/cjs/react-dom-client.production.js`
  — the **production** React build, loaded during a **dev** session — while
  `WishOdds.tsx` still compiled its JSX against the dev-only `_jsxDEV` runtime,
  which production React doesn't export. Same `_jsxDEV is not a function`
  error as every earlier occurrence, different mechanism. This was very likely
  the dominant cause all along, not just this one instance: a `npm run build`
  check after nearly every fix, often with the dev server still running, is
  standard practice in this repo (see "Checking a visual change"), and matches
  the timing of prior recurrences better than the theories below.

  **The rule this implies: never run `npm run build` / `astro build` while
  `astro dev` is running.** If a build needs checking while dev must stay up,
  treat it exactly like a `node_modules` change afterward: `astro dev stop`,
  `rm -rf node_modules/.vite`, `astro dev --background`.

  Two earlier, narrower theories, kept for reference since they're still
  plausible contributing mechanisms (both involve the same cache directory,
  just corrupted a different way) — not fully retracted, just superseded as
  the primary explanation:
  - `vite.optimizeDeps.include` in `astro.config.mjs` (lists
    `@astrojs/react/client.js`, `react/jsx-dev-runtime`, `react/jsx-runtime`,
    `react-dom/client`) forces the widget's React client-hydration chain to be
    pre-bundled at cold start. Reasoning: the widget is `client:visible`, so
    that chain is only ever imported dynamically from the browser once
    scrolled into view — invisible to Vite's normal startup crawl — and left
    alone, Vite would discover it lazily mid-session and could race an
    already-loaded page. Kept; harmless either way.
  - `vite.resolve.dedupe: ['react', 'react-dom']` guards against two loaded
    copies of React disagreeing. Kept as cheap insurance.

  It showed up (at least) three ways depending on exactly how the cache was
  corrupted — useful for recognizing it fast, not for picking a different fix:
  - **Widget vanishes** (empty ~34px gap). `_jsxDEV is not a function`, thrown
    at the very first line of `WishOdds()` while it constructs its own
    `<WishOddsBoundary>` — exactly why the boundary can't catch it (a boundary
    only catches errors in its children, not in the code that creates it).
  - **Widget renders but is inert** (sliders/checkboxes don't respond).
    `Failed to fetch dynamically imported module: .../@astrojs/react/dist/client.js`,
    retried and given up — hydration never completes, so static markup sits
    there with nothing behind it.
  - **Same `_jsxDEV` error, but the stack trace runs through
    `react-dom/cjs/react-dom-client.production.js`** — the build/dev cache
    collision described above.
  In every variant, a plain `astro dev stop && astro dev --background` was
  not reliably enough — Vite/the build tooling can reuse an existing, broken
  `.vite/deps` directory across a process restart. `rm -rf node_modules/.vite`
  before restarting is what actually clears it.

  Mitigation still in place as defense in depth: `WishOddsBoundary` in
  `WishOdds.tsx` turns a render crash into a fallback message (link to the
  live calculator; in dev it also prints the error stack and logs
  `[wish-odds]`).

  **If it recurs**: first ask whether a build ran near the dev server
  recently — that's now the leading suspect. Then `astro dev stop`,
  `rm -rf node_modules/.vite`, `astro dev --background`. Read the browser
  console first if you can; the stack trace tells you which variant above
  it is. Verify with real interaction (drag a slider, click a checkbox), not
  just a page load — a plain load can look fine while hydration is actually
  broken.
  The *other*, unrelated failure (embed missing entirely, plain card shown
  instead) is the embeds glob being read at startup: restart the dev server
  (no cache-clear needed for this one).
- Bundle: the island's critical path is ~92 KB gzipped JS (react-dom ~66, react
  ~3, widget + the single-goal tables ~24); `odds-extras` adds ~209 KB gzipped as
  a separate chunk fetched after mount. Nothing loads until the tile scrolls into
  view. Vite warns that the extras chunk is over 500 kB (~1.9 MB raw); that is
  expected.

## Viewing on a phone during dev

`astro dev --host --background` exposes the dev server on the local network.
Get the LAN IP with `ipconfig getifaddr en0` (or `en1`), then visit
`http://<that-ip>:4321` from a phone on the same Wi-Fi. macOS may prompt a
firewall permission dialog for Node — it needs to be allowed.

## Verifying UI changes

No browser-automation tool is kept installed permanently — it's not a
dependency of the site. To actually look at a page after a CSS/layout
change: install Playwright temporarily, screenshot, then remove it:

```
npm install --no-save playwright
npx playwright install chromium
# ...take screenshots...
npm uninstall --no-save playwright
rm -rf ~/Library/Caches/ms-playwright
```

**If the dev server needs to stay running afterward** (e.g. for the user to
look at): a plain restart after the final `npm uninstall` should now be
enough — see the Genshin widget dev-flakiness entry below for the
`optimizeDeps` fix that addressed this at the root (2026-09-22) and was
stress-tested specifically against `node_modules` churn without a restart. If
the widget still misbehaves after a restart, fall back to `astro dev stop`,
`rm -rf node_modules/.vite`, `astro dev --background`.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
