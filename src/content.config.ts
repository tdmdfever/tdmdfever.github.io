import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    // Buttons shown on the project page, in the order written. Any number,
    // any label (e.g. "Live Site", "Repo", "Illustrated Explainer").
    links: z.array(z.object({ label: z.string(), url: z.string().url() })).default([]),
    image: z.string().optional(),
    draft: z.boolean().default(false),
    // Controls placement (and order) in the home page's "Featured projects"
    // section — lower numbers first. Omit to leave a project out of that
    // section; if no project sets this, the home page falls back to the
    // 3 most recent by date.
    featuredOrder: z.number().optional(),
  }),
});

const updates = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/updates' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, updates };
