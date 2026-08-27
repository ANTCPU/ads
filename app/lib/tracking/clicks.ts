// ─── Click Tracking ───────────────────────────────────────────────────────────
// Single reusable function for tracking ad clicks.
// Replaces inline tracking logic in ArenaUniversalClient,
// ArenaClient, and dashboard/user.
//
// What it does:
// 1. Inserts a row into ad_clicks (ad_id, email, source)
// 2. Increments click_count on the ad
// 3. Fires /api/scout/score to recalculate points + rank
// 4. Notifies Discord on click milestones (every 10 clicks) — rich embed
// ─────────────────────────────────────────────────────────────────────────────

import { SupabaseClient } from '@supabase/supabase-js';
import { TrackingSource } from './sources';

// ✅ notifyDiscord REMOVED — routed through /api/discord-notify
// This file is imported by client components — must never import discord.ts

export type ClickableAd = {
  id:          string;
  brand:       string;
  title:       string;
  email:       string;
  click_count: number;
};

export async function trackClick(
  ad:        ClickableAd,
  userEmail: string,
  source:    TrackingSource,
  supabase:  SupabaseClient,
): Promise<number> {

  const newCount = (ad.click_count || 0) + 1;

  // 1 + 2 — write click row + increment counter in parallel
  await Promise.all([
    supabase.from('ad_clicks').insert([{
      ad_id: ad.id,
      email: userEmail || 'visitor',
      source,
    }]),
    supabase.from('ads')
      .update({ click_count: newCount })
      .eq('id', ad.id),
  ]);

  // 3 — recalculate score + rank (fire and forget)
  fetch('/api/scout/score', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ad_id: ad.id }),
  }).catch(() => {});

  // 4 — 🔒 Discord milestone every 10 clicks — via API route only
  if (newCount % 10 === 0) {
    fetch('/api/discord-notify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '',
        event:   'click_milestone',
        embed: {
          title:  '👆 Click Milestone',
          color:  0xF0883E, // DC.orange
          fields: [
            { name: 'Brand',  value: ad.brand,         inline: true  },
            { name: 'Clicks', value: String(newCount), inline: true  },
            { name: 'Source', value: source,           inline: true  },
            { name: 'Ad',     value: ad.title,         inline: false },
            { name: 'Email',  value: ad.email || '—',  inline: false },
          ],
          footer:    'ANTCPU ADS · Scout',
          timestamp: true,
        },
      }),
    }).catch(() => {});
  }

  return newCount;
}
