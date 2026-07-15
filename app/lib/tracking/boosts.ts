// ─── Boost Tracking ───────────────────────────────────────────────────────────
// Records a boost event for an ad.
//
// What it does:
// 1. Writes a row to ad_boosts (ad_id, session_id)
// 2. Increments boost_count on the ad
// 3. Fires /api/scout/score to recalculate points + rank
// 4. Notifies Discord on every boost
// ─────────────────────────────────────────────────────────────────────────────

import { SupabaseClient } from '@supabase/supabase-js';
import { notifyDiscord, DC } from '../discord';
import { TrackingSource } from './sources';

export type BoostableAd = {
  id: string;
  brand: string;
  title: string;
  email: string;
  boost_count: number;
};

export async function recordBoost(
  ad: BoostableAd,
  sessionId: string,
  source: TrackingSource,
  supabase: SupabaseClient,
): Promise<number> {
  const newCount = (ad.boost_count || 0) + 1;

  // — write to ad_boosts + increment boost_count in parallel
  await Promise.all([
    supabase.from('ad_boosts').insert([{
      ad_id: ad.id,
      session_id: sessionId,
    }]),
    supabase.from('ads')
      .update({ boost_count: newCount })
      .eq('id', ad.id),
  ]);

  // — recalculate score + rank (fire and forget)
  fetch('/api/scout/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ad_id: ad.id }),
  }).catch(() => {});

  // — discord on every boost
  notifyDiscord('', 'general', {
    title: '⚡ Ad Boosted',
    color: DC.gold,
    fields: [
      { name: 'Brand', value: ad.brand, inline: true },
      { name: 'Total Boosts', value: String(newCount), inline: true },
      { name: 'Source', value: source, inline: true },
      { name: 'Ad', value: ad.title, inline: false },
    ],
    footer: 'ANTCPU ADS · Boost Tracking',
    timestamp: true,
  });

  return newCount;
}
