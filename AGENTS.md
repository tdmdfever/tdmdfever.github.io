## Project overview

Terry Deng's personal portfolio site: resume (viewable + downloadable), contact
links, projects, and a life-updates feed with a timeline. Built with Astro so
that adding content is a file change, not a code change. Deploys to GitHub
Pages via GitHub Actions (not yet pushed to a GitHub repo).

## Where content lives

- `src/data/site.ts` — name, tagline, email, phone, GitHub, LinkedIn. Single
  source of truth; every page that shows contact info reads from here.
- `src/data/timeline.ts` — milestone events (`{ date, label }`) shown next to
  `/updates`. Order doesn't matter, it's sorted automatically.
- `src/content/projects/*.md` — one file per project (Astro content
  collection, schema in `src/content.config.ts`). Requires `title`,
  `description`, `date`; optional `tags`, `repoUrl`, `demoUrl`.
- `src/content/updates/*.md` — one file per update post (content
  collection). Requires `title`, `description`, `date`.
- `public/resume.pdf` — the downloadable resume file. This is the only file
  to edit; `resume-preview.png` regenerates from it automatically.
- `public/resume-preview.png` — plain static image shown on `/resume`.
  Deliberately an `<img>`, not an embedded PDF viewer — no toolbar/zoom/
  sidebar wanted. **Generated, don't edit by hand**: an Astro integration in
  `astro.config.mjs` (`resumePreview()`, using
  `scripts/generate-resume-preview.mjs`) renders page 1 of `resume.pdf` to
  this PNG at 200 DPI via `pdfjs-dist` + `@napi-rs/canvas`. It runs on
  `astro:build:start` and once on `astro:server:setup`, and during
  `astro dev` it also watches `public/resume.pdf` and re-renders +
  full-reloads on change.

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
`main` (official `withastro/action`). `astro.config.mjs` has placeholder
`site`/`base` values with instructions in the comments — update them once the
GitHub repo exists (see README for the exact steps).

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
