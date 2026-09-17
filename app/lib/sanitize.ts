// app/lib/sanitize.ts
// ─── Field Sanitizers ─────────────────────────────────────────────────────────
// Reusable across: create-shop-ad, login, CreateAdDrawer, aria-review,
// any future form that accepts user text.
//
// Two layers:
//   Layer 1 — CLEAN  — strip/collapse. Safe to call on blur or submit.
//   Layer 2 — DETECT — named pattern detection. Use for live warnings + Aria flags.
//
// All existing callers (sanitizeDescription, containsUrl, sanitizeText,
// sanitizeOnSubmit) are preserved with identical signatures.
//
// v2 (Sep 2026):
//   — detect() added — returns typed DetectResult with named flags
//   — detectAll() added — runs all checks, returns array of FlagReason
//   — sanitizeDescription improved — catches more domain patterns
//   — containsUrl preserved — still works, now backed by detect()
//   — server-safe — no DOM, no window, no process.env reads
// ─────────────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

export type FlagReason =
  | 'url'           // http/https link
  | 'domain'        // bare domain e.g. antcpu.com
  | 'handle'        // @username
  | 'phone'         // phone number pattern
  | 'email'         // email address
  | 'allcaps'       // excessive caps — spam signal
  | 'repeated_char' // aaaaaaa / !!!!!! — spam signal
  | 'too_short'     // below minimum meaningful length
  | 'too_long';     // above field maximum

export type DetectResult = {
  clean:   boolean;           // true = no flags found
  flags:   FlagReason[];      // which patterns triggered
  matched: string[];          // the actual matched strings (for logging/Aria)
};

// ─── Patterns ─────────────────────────────────────────────────────────────────
// Centralised — used by both clean and detect layers.

const PATTERNS = {
  url:           /https?:\/\/[^\s]+/gi,
  domain:        /\b(?:www\.)?[\w-]+\.[a-z]{2,}(?:\/[^\s]*)?\b/gi,
  handle:        /@[\w.]+/g,
  phone:         /(?:\+?\d[\s\-.]?){7,14}\d/g,
  email:         /[\w.+-]+@[\w-]+\.[a-z]{2,}/gi,
  allcaps:       /\b[A-Z]{5,}\b/g,
  repeated_char: /(.)\1{4,}/g,
} as const;

// ─── Layer 2 — DETECT ────────────────────────────────────────────────────────

/**
 * Runs a single named check against raw text.
 * Returns true if the pattern is found.
 */
export function detect(raw: string, flag: FlagReason): boolean {
  if (flag === 'too_short') return false; // length checks need a threshold — use detectAll
  if (flag === 'too_long')  return false;
  const pattern = PATTERNS[flag as keyof typeof PATTERNS];
  if (!pattern) return false;
  pattern.lastIndex = 0;
  return pattern.test(raw);
}

/**
 * Runs all checks and returns a DetectResult.
 * Pass optional minLength / maxLength for length checks.
 *
 * Usage in Aria review:
 *   const result = detectAll(ad.description, { minLength: 20, maxLength: 300 });
 *   if (!result.clean) flagAd(result.flags);
 */
export function detectAll(
  raw:       string,
  options?:  { minLength?: number; maxLength?: number },
): DetectResult {
  const flags:   FlagReason[] = [];
  const matched: string[]     = [];

  const checks: FlagReason[] = ['url', 'domain', 'handle', 'phone', 'email', 'allcaps', 'repeated_char'];

  for (const flag of checks) {
    const pattern = PATTERNS[flag as keyof typeof PATTERNS];
    if (!pattern) continue;
    pattern.lastIndex = 0;
    const hits = raw.match(pattern);
    if (hits && hits.length > 0) {
      flags.push(flag);
      matched.push(...hits.slice(0, 3));   // cap at 3 per flag — enough for logging
    }
  }

  if (options?.minLength && raw.trim().length < options.minLength) {
    flags.push('too_short');
  }
  if (options?.maxLength && raw.trim().length > options.maxLength) {
    flags.push('too_long');
  }

  return {
    clean:   flags.length === 0,
    flags,
    matched: [...new Set(matched)],   // dedupe
  };
}

// ─── Layer 1 — CLEAN ─────────────────────────────────────────────────────────

/**
 * Strips URLs, bare domains, @handles, phone numbers, and email addresses
 * from free-text fields. Used on description fields where links are not allowed.
 * NOTE: does NOT trim — call on blur, not on every keystroke.
 */
export function sanitizeDescription(raw: string): string {
  return raw
    .replace(PATTERNS.url,           '')
    .replace(PATTERNS.email,         '')   // email before domain — more specific
    .replace(PATTERNS.domain,        '')
    .replace(PATTERNS.handle,        '')
    .replace(PATTERNS.phone,         '')
    .replace(/\s{2,}/g, ' ');
}

/**
 * Returns true if the raw string contains a URL, domain, or @handle.
 * Use to show a live warning before sanitizing.
 * Preserved for existing callers — now backed by detect().
 */
export function containsUrl(raw: string): boolean {
  return detect(raw, 'url') || detect(raw, 'domain') || detect(raw, 'handle');
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
