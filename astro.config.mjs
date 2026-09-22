// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { fileURLToPath } from 'node:url';
import { generateResumePreview } from './scripts/generate-resume-preview.mjs';

const resumePdfPath = fileURLToPath(new URL('./public/resume.pdf', import.meta.url));

// Keeps public/resume-preview.png in sync with public/resume.pdf: renders
// once before build/dev start, then re-renders whenever resume.pdf changes
// while the dev server is running.
function resumePreview() {
  return {
    name: 'resume-preview',
    hooks: {
      'astro:build:start': async () => {
        await generateResumePreview();
      },
      'astro:server:setup': async ({ server }) => {
        await generateResumePreview();
        server.watcher.on('change', async (path) => {
          if (path === resumePdfPath) {
            await generateResumePreview();
            server.ws.send({ type: 'full-reload' });
          }
        });
      },
    },
  };
}

// https://astro.build/config
export default defineConfig({
  integrations: [resumePreview(), react()],
  vite: {
    // Guarantee a single copy of React. Two copies (e.g. after the dev server re-bundles
    // dependencies) make the island throw "Invalid hook call" and go blank.
    resolve: { dedupe: ['react', 'react-dom'] },
    // The Genshin widget is a client:visible island, so its React client-hydration
    // chain is only ever imported dynamically, from the browser, once it scrolls
    // into view — invisible to Vite's normal startup crawl (which only follows
    // static imports). Left alone, Vite discovers this chain lazily, mid-session,
    // and re-optimizes dependencies on the fly; if that races against an
    // already-loaded page, the page's live React and the freshly re-bundled
    // jsx-runtime disagree and hydration throws "_jsxDEV is not a function" (the
    // whole widget vanishes) or fails to even fetch the renderer chunk (it loads
    // but sliders/checkboxes are inert) — this was reproduced repeatedly. Listing
    // these here forces them into the ONE optimization pass at cold start, so
    // there is nothing left to discover lazily and no more mid-session race.
    optimizeDeps: {
      include: ['@astrojs/react/client.js', 'react/jsx-dev-runtime', 'react/jsx-runtime', 'react-dom/client'],
    },
  },
  // User/org site: repo is named "tdmdfever.github.io", served at the root.
  site: 'https://tdmdfever.github.io',
  base: '/',
});
