// ─── Boost Tracking ───────────────────────────────────────────────────────────
// Records a boost event for an ad.
//
// What it does:
// 1. Writes a row to ad_boosts (ad_id, session_id)
// 2. Increments boost_count on the ad
// 3. Fires /api/scout/score to recalculate points + rank
// 4. Notifies Discord via /api/discord-notify — never calls Discord directly
// ─────────────────────────────────────────────────────────────────────────────

import { SupabaseClient } from '@supabase/supabase-js';
import { TrackingSource } from './sources';

// ✅ notifyDiscord REMOVED — routed through /api/discord-notify
// This file is imported by client components — must never import discord.ts

export type BoostableAd = {
  id:          string;
  brand:       string;
  title:       string;
  email:       string;
  boost_count: number;
};

export async function recordBoost(
  ad:        BoostableAd,
  sessionId: string,
  source:    TrackingSource,
  supabase:  SupabaseClient,
): Promise<number> {

  const newCount = (ad.boost_count || 0) + 1;

  // 1 + 2 — write boost row + increment count in parallel
  await Promise.all([
    supabase.from('ad_boosts').insert([{
      ad_id:      ad.id,
      session_id: sessionId,
    }]),
    supabase.from('ads')
      .update({ boost_count: newCount })
      .eq('id', ad.id),
  ]);

  // 3 — recalculate score + rank (fire and forget)
  fetch('/api/scout/score', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ad_id: ad.id }),
  }).catch(() => {});

  // 4 — 🔒 Discord via API route — webhook URL never touches client bundle
  fetch('/api/discord-notify', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: '',
      event:   'general',
      embed: {
        title:  '⚡ Ad Boosted',
        color:  0xD4AF37, // DC.gold
        fields: [
          { name: 'Brand',        value: ad.brand,       inline: true  },
          { name: 'Total Boosts', value: String(newCount), inline: true },
          { name: 'Source',       value: source,         inline: true  },
          { name: 'Ad',           value: ad.title,       inline: false },
        ],
        footer:    'ANTCPU ADS · Boost Tracking',
        timestamp: true,
      },
    }),
  }).catch(() => {});

  return newCount;
}
