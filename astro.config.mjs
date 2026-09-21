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
  },
  // User/org site: repo is named "tdmdfever.github.io", served at the root.
  site: 'https://tdmdfever.github.io',
  base: '/',
});
