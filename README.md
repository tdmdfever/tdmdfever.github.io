# Personal Portfolio Site

Built with [Astro](https://astro.build). Resume, projects, and life updates,
designed so new content is just a file, not a code change.

## Commands

| Command         | Action                                       |
| :--------------- | :-------------------------------------------- |
| `npm install`     | Install dependencies                          |
| `npm run dev`      | Start local dev server at `localhost:4321`   |
| `npm run build`    | Build the production site to `./dist/`       |
| `npm run preview`  | Preview the production build locally         |

## Deploying to GitHub Pages

A GitHub Actions workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) is already set up to build and deploy on every push to `main`. Once you've created the GitHub repo:

1. In the repo settings, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
2. Update `site` (and `base`, if needed) in [astro.config.mjs](astro.config.mjs) — instructions are in the comments there.
3. Push to `main`.
