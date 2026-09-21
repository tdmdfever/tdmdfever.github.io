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

A GitHub Actions workflow ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)) builds and deploys on every push to `main`. [astro.config.mjs](astro.config.mjs) is already set up for a repo named `tdmdfever.github.io`.

1. Create the `tdmdfever.github.io` repo on GitHub and add it as a remote.
2. In the repo, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Push to `main`.
