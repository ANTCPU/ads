// ─── Share Tracking ───────────────────────────────────────────────────────────
// Single reusable function for recording share events.
// Replaces inline share tracking in ArenaUniversalClient,
// ArenaClient, and dashboard/user.
//
// What it does:
// 1. Writes a row to ad_shares (ad_id, email, platform, url, brand)
// 2. Increments share_count on the ad
// 3. Fires /api/scout/score to recalculate points + rank
// 4. Notifies Discord with rich embed — platform + source context
//
// Note: called AFTER the platform intent opens or text is copied —
// not before — so we only count confirmed share attempts.
// ─────────────────────────────────────────────────────────────────────────────

import { SupabaseClient } from '@supabase/supabase-js';
import { notifyDiscord, DC } from '../discord';
import { TrackingSource } from './sources';

export type ShareableAd = {
  id: string;
  brand: string;
  title: string;
  email: string;
  share_count: number;
  url?: string;
};

export async function recordShare(
  ad: ShareableAd,
  userEmail: string,
  platform: string,
  source: TrackingSource,
  supabase: SupabaseClient,
): Promise<number> {
  const newShares = (ad.share_count || 0) + 1;

  // — write to ad_shares + increment share_count in parallel
  await Promise.all([
    supabase.from('ad_shares').insert([{
      ad_id:    ad.id,
      email:    userEmail || 'visitor',
      platform,
      url:      ad.url || null,
      brand:    ad.brand,
    }]),
    supabase.from('ads')
      .update({ share_count: newShares })
      .eq('id', ad.id),
  ]);

  // — recalculate score + rank (fire and forget)
  fetch('/api/scout/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ad_id: ad.id }),
  }).catch(() => {});

  // — discord notification — rich embed
  notifyDiscord('', 'share', {
    title: '↗ Ad Shared',
    color: DC.blue,
    fields: [
      { name: 'Platform', value: platform,              inline: true },
      { name: 'Shares',   value: String(newShares),     inline: true },
      { name: 'Source',   value: source,                inline: true },
      { name: 'Brand',    value: ad.brand,              inline: false },
      { name: 'Ad',       value: ad.title,              inline: false },
      { name: 'By',       value: userEmail || 'visitor', inline: false },
    ],
    footer: 'ANTCPU ADS · Share Tracking',
    timestamp: true,
  });

  return newShares;
}
