// ─── Social Share — Bones ─────────────────────────────────────────────────────
// Types and core logic only.
// Platform implementations live in app/lib/platforms/
// Content (hashtags, emojis, templates) lives in app/lib/content/
//
// getShareAction always passes ctx.url (ad destination) to intentUrl.
// ctx.profileUrl is available to buildPost for platforms that want it (LinkedIn etc.)
// but is never used as the intent target — that is always the ad URL.
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
  brand:        string;
  title:        string;
  description:  string;
  url:          string;        // ad destination URL — always used as intent target
  profileUrl:   string;        // /profile/[email] — available to buildPost, never the intent target
  category:     AdType | string;
  country?:     string;
  isChampion?:  boolean;
  promoCode?:   string;
  pointsLabel?: string;        // optional social proof e.g. "⚡ 395 pts" — opt-in per platform
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
// Returns the intent URL (if platform supports it) and the post text.
//
// Intent URL always uses ctx.url — the ad destination.
// Post text is built by the platform's buildPost — it may use ctx.profileUrl
// if the platform wants to include a profile link in the copy.

export function getShareAction(
  platform: Platform,
  ctx: ShareContext
): { url: string | null; text: string } {
  const text = platform.buildPost(ctx);
  const url  = platform.supportsIntent
    ? platform.intentUrl(text, ctx.url)   // ← always the ad destination URL
    : null;
  return { url, text };
}

// ─── Re-exports for backwards compatibility ───────────────────────────────────
// Files that import PLATFORMS from socialShare.ts directly will still work.
// Migrate them to import from app/lib/platforms/index.ts over time.

export { PLATFORMS } from './platforms/index';
