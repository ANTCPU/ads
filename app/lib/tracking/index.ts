// ─── Tracking — Public API ────────────────────────────────────────────────────
// Import everything from here.
// Never import directly from clicks.ts, shares.ts, or sources.ts.
// ─────────────────────────────────────────────────────────────────────────────

export { trackClick }          from './clicks';
export { recordShare }         from './shares';
export { SOURCE }              from './sources';
export type { TrackingSource } from './sources';
export type { ClickableAd }    from './clicks';
export type { ShareableAd }    from './shares';
