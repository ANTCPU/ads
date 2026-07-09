// ============================================================
// lib/sanitize.ts — Field sanitizers
// Reusable across: create-shop-ad, login, CreateAdDrawer,
// any future form that accepts user text
// ============================================================

/**
 * Strips URLs, bare domains, and @handles from free-text fields.
 * Used on description fields where links are not allowed.
 * NOTE: does NOT trim — call on blur, not on every keystroke.
 */
export function sanitizeDescription(raw: string): string {
  return raw
    .replace(/https?:\/\/[^\s]+/gi, '')
    .replace(/\b(?:www\.)?[\w-]+\.[a-z]{2,}(?:\/[^\s]*)?\b/gi, '')
    .replace(/@[\w.]+/g, '')
    .replace(/\s{2,}/g, ' ');
}

/**
 * Returns true if the raw string contains a URL, domain, or @handle.
 * Use to show a live warning before sanitizing.
 */
export function containsUrl(raw: string): boolean {
  return /https?:\/\/|www\.|@[\w.]+|\b[\w-]+\.[a-z]{2,}\b/i.test(raw);
}

/**
 * Collapses multiple spaces into one.
 * Safe to run on every keystroke — does NOT trim edges.
 * Call .trim() separately on submit only.
 */
export function sanitizeText(raw: string): string {
  return raw.replace(/\s{2,}/g, ' ');
}

/**
 * Final submit sanitizer — trim + collapse spaces.
 * Call this on form submit, not on keystroke.
 */
export function sanitizeOnSubmit(raw: string): string {
  return raw.replace(/\s{2,}/g, ' ').trim();
}
