// Renders the first page of public/resume.pdf to public/resume-preview.png
// so the preview image on /resume always matches the current PDF. Runs
// automatically before dev/build (see astro.config.mjs) — never edit
// resume-preview.png by hand.
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const PDF_PATH = fileURLToPath(new URL('../public/resume.pdf', import.meta.url));
const OUTPUT_PATH = fileURLToPath(new URL('../public/resume-preview.png', import.meta.url));

// 200 DPI matches the resolution of the original hand-generated preview
// (1700x2200 for a Letter-size page). PDF user space is 72 DPI.
const SCALE = 200 / 72;

export async function generateResumePreview() {
  const data = await readFile(PDF_PATH);
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(data), disableWorker: true })
    .promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: SCALE });

  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const context = canvas.getContext('2d');

  await page.render({ canvasContext: context, viewport, canvas }).promise;

  const buffer = await canvas.encode('png');
  await writeFile(OUTPUT_PATH, buffer);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await generateResumePreview();
  console.log('Generated resume-preview.png from resume.pdf');
}
