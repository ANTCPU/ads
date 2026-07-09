// ============================================================
// lib/sanitize.ts — Field sanitizers
// Reusable across: create-shop-ad, login, CreateAdDrawer,
//                  any future form that accepts user text
// ============================================================

/**
 * Strips URLs, bare domains, and @handles from free-text fields.
 * Used on description fields where links are not allowed.
 */
export function sanitizeDescription(raw: string): string {
  return raw
    .replace(/https?:\/\/[^\s]+/gi, '')
    .replace(/\b(?:www\.)?[\w-]+\.[a-z]{2,}(?:\/[^\s]*)?\b/gi, '')
    .replace(/@[\w.]+/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Returns true if the raw string contains a URL, domain, or @handle.
 * Use to show a live warning before sanitizing.
 */
export function containsUrl(raw: string): boolean {
  return /https?:\/\/|www\.|@[\w.]+|\b[\w-]+\.[a-z]{2,}\b/i.test(raw);
}

/**
 * Strips leading/trailing whitespace and collapses internal spaces.
 * Safe to run on any field.
 */
export function sanitizeText(raw: string): string {
  return raw.replace(/\s{2,}/g, ' ').trim();
}
