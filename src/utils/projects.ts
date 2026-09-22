import { getCollection, type CollectionEntry } from 'astro:content';

// A project gets an interactive embed by having a component named after its
// slug in src/components/embeds/ (e.g. genshin-wish-calculator.astro). To swap
// which project demos, add that project's embed file — nothing else changes,
// since getEmbed() below looks it up by id. To retire a demo without deleting
// its file, set `demo: false` in that project's frontmatter instead.
const embedModules = import.meta.glob('../components/embeds/*.astro', { eager: true }) as Record<
  string,
  { default: any }
>;

export async function getFeaturedProjects() {
  const all = await getCollection('projects', ({ data }) => !data.draft);
  const manuallyFeatured = all
    .filter((project) => project.data.featuredOrder !== undefined)
    .sort((a, b) => a.data.featuredOrder! - b.data.featuredOrder!);
  const featured = manuallyFeatured.length > 0
    ? manuallyFeatured
    : all.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf()).slice(0, 3);
  return { all, featured };
}

export function getEmbed(project: CollectionEntry<'projects'>) {
  if (!project.data.demo) return undefined;
  return embedModules[`../components/embeds/${project.id}.astro`]?.default;
}
