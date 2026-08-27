// ─── Like Tracking ────────────────────────────────────────────────────────────
// Records a like event for an ad.
//
// What it does:
// 1. Writes a row to ad_likes (ad_id, session_id)
// 2. Increments like_count on the ad
// 3. Fires /api/scout/score to recalculate points + rank
// 4. Notifies Discord on every 25 like milestone via /api/discord-notify
// ─────────────────────────────────────────────────────────────────────────────

import { SupabaseClient } from '@supabase/supabase-js';
import { TrackingSource } from './sources';

// ✅ notifyDiscord REMOVED — routed through /api/discord-notify
// This file is imported by client components — must never import discord.ts

export type LikeableAd = {
  id:         string;
  brand:      string;
  title:      string;
  email:      string;
  like_count: number;
};

export async function recordLike(
  ad:        LikeableAd,
  sessionId: string,
  source:    TrackingSource,
  supabase:  SupabaseClient,
): Promise<number> {

  const newCount = (ad.like_count || 0) + 1;

  // 1 + 2 — write like row + increment count in parallel
  await Promise.all([
    supabase.from('ad_likes').insert([{
      ad_id:      ad.id,
      session_id: sessionId,
    }]),
    supabase.from('ads')
      .update({ like_count: newCount })
      .eq('id', ad.id),
  ]);

  // 3 — recalculate score + rank (fire and forget)
  fetch('/api/scout/score', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ad_id: ad.id }),
  }).catch(() => {});

  // 4 — 🔒 Discord milestone every 25 likes — via API route only
  if (newCount % 25 === 0) {
    fetch('/api/discord-notify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '',
        event:   'general',
        embed: {
          title:  '😊 Like Milestone',
          color:  0x2E7D32, // DC.green
          fields: [
            { name: 'Brand',  value: ad.brand,         inline: true  },
            { name: 'Likes',  value: String(newCount), inline: true  },
            { name: 'Source', value: source,           inline: true  },
            { name: 'Ad',     value: ad.title,         inline: false },
          ],
          footer:    'ANTCPU ADS · Like Tracking',
          timestamp: true,
        },
      }),
    }).catch(() => {});
  }

  return newCount;
}
