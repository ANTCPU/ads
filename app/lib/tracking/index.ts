// ─── Tracking — Public API ────────────────────────────────────────────────────
// Import everything from here.
// Never import directly from clicks.ts, shares.ts, likes.ts, boosts.ts, or sources.ts.
// ─────────────────────────────────────────────────────────────────────────────

export { trackClick } from './clicks';
export { recordShare } from './shares';
export { recordLike } from './likes';
export { recordBoost } from './boosts';
export { SOURCE } from './sources';
export type { TrackingSource } from './sources';
export type { ClickableAd } from './clicks';
export type { ShareableAd } from './shares';
export type { LikeableAd } from './likes';
export type { BoostableAd } from './boosts';
