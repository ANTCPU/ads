// ─── Social Share — Bones ─────────────────────────────────────────────────────
// Types and core logic only.
// Platform implementations live in app/lib/platforms/
// Content (hashtags, emojis, templates) lives in app/lib/content/
// ─────────────────────────────────────────────────────────────────────────────

export type AdType =
  | 'Brand Awareness'
  | 'Product Launch'
  | 'Pi Commerce'
  | 'Content Promotion'
  | 'Service Offering'
  | 'Event'
  | 'Other';

export interface ShareContext {
  brand:       string;
  title:       string;
  description: string;
  url:         string;       // destination URL
  profileUrl:  string;       // /profile/[email]
  category:    AdType | string;
  country?:    string;
  isChampion?: boolean;
  promoCode?:  string;
}

export interface Platform {
  key:            string;
  label:          string;
  icon:           string;
  color:          string;
  supportsIntent: boolean;
  profileUrl:     (handle: string) => string;
  intentUrl:      (text: string, url: string) => string;
  buildPost:      (ctx: ShareContext) => string;
}

// ─── Core action resolver ─────────────────────────────────────────────────────
// Given a platform and context, returns the intent URL (if supported)
// and the post text for clipboard fallback.

export function getShareAction(
  platform: Platform,
  ctx: ShareContext
): { url: string | null; text: string } {
  const text = platform.buildPost(ctx);
  const url  = platform.supportsIntent
    ? platform.intentUrl(text, ctx.profileUrl)
    : null;
  return { url, text };
}

// ─── Re-exports for backwards compatibility ───────────────────────────────────
// Files that import PLATFORMS from socialShare.ts directly will still work.
// Migrate them to import from app/lib/platforms/index.ts over time.

export { PLATFORMS } from './platforms/index';
