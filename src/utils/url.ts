// Joins a site-relative path with Astro's configured `base`, so links and
// asset URLs (e.g. /resume.pdf) still work once this is deployed under a
// GitHub Pages project sub-path instead of the domain root.
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL;
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
  return normalizedBase + normalizedPath;
}
