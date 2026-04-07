const NON_ALPHANUMERIC = /[^a-z0-9]+/g;
const EDGE_HYPHENS = /^-+|-+$/g;

export function slugify(value: string, fallback = 'store'): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\x00-\x7F]/g, '')
    .replace(NON_ALPHANUMERIC, '-')
    .replace(EDGE_HYPHENS, '');

  return normalized.length > 0 ? normalized : fallback;
}
