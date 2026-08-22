// @ts-check
import { defineConfig } from 'astro/config';
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
  integrations: [resumePreview()],
  // User/org site: repo is named "tdmdfever.github.io", served at the root.
  site: 'https://tdmdfever.github.io',
  base: '/',
});
