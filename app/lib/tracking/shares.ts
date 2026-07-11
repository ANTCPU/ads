// ─── Share Tracking ───────────────────────────────────────────────────────────
// Single reusable function for recording share events.
// Replaces inline share tracking in ArenaUniversalClient,
// ArenaClient, and dashboard/user.
//
// What it does:
// 1. Increments share_count on the ad
// 2. Fires /api/scout/score to recalculate points + rank
// 3. Notifies Discord with platform + source context
//
// Note: called AFTER the platform intent opens or text is copied —
// not before — so we only count confirmed share attempts.
// ─────────────────────────────────────────────────────────────────────────────

import { SupabaseClient } from '@supabase/supabase-js';
import { notifyDiscord } from '../discord';
import { TrackingSource } from './sources';

export type ShareableAd = {
  id:          string;
  brand:       string;
  title:       string;
  email:       string;
  share_count: number;
};

export async function recordShare(
  ad:          ShareableAd,
  userEmail:   string,
  platform:    string,
  source:      TrackingSource,
  supabase:    SupabaseClient,
): Promise<number> {
  const newShares = (ad.share_count || 0) + 1;

  // — increment share_count
  await supabase
    .from('ads')
    .update({ share_count: newShares })
    .eq('id', ad.id);

  // — recalculate score + rank (fire and forget)
  fetch('/api/scout/score', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ad_id: ad.id }),
  }).catch(() => {});

  // — discord notification
  notifyDiscord(
    `↗ **Ad Shared** — ${ad.brand} via ${platform}\n` +
    `**Title:** "${ad.title}"\n` +
    `**By:** ${userEmail || 'visitor'}\n` +
    `**Source:** ${source}\n` +
    `**Total shares:** ${newShares}`
  );

  return newShares;
}
