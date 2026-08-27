// ─── Share Tracking ───────────────────────────────────────────────────────────
// Single reusable function for recording share events.
// Replaces inline share tracking in ArenaUniversalClient,
// ArenaClient, and dashboard/user.
//
// What it does:
// 1. Writes a row to ad_shares (ad_id, email, platform, url, brand)
// 2. Increments share_count on the ad
// 3. Fires /api/scout/score to recalculate points + rank
// 4. Notifies Discord via /api/discord-notify — never calls Discord directly
//
// Note: called AFTER the platform intent opens or text is copied —
// not before — so we only count confirmed share attempts.
// ─────────────────────────────────────────────────────────────────────────────

import { SupabaseClient } from '@supabase/supabase-js';
import { TrackingSource } from './sources';

// ✅ notifyDiscord REMOVED — routed through /api/discord-notify
// This file is imported by client components so must never import discord.ts

export type ShareableAd = {
  id:          string;
  brand:       string;
  title:       string;
  email:       string;
  share_count: number;
  url?:        string;
};

export async function recordShare(
  ad:        ShareableAd,
  userEmail: string,
  platform:  string,
  source:    TrackingSource,
  supabase:  SupabaseClient,
): Promise<number> {

  const newShares = (ad.share_count || 0) + 1;

  // 1 + 2 — write share row + increment count in parallel
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
      event:   'share',
      embed: {
        title:  '↗ Ad Shared',
        color:  0x0070F3, // DC.blue — hardcoded so we don't import discord.ts
        fields: [
          { name: 'Platform', value: platform,               inline: true  },
          { name: 'Shares',   value: String(newShares),      inline: true  },
          { name: 'Source',   value: source,                 inline: true  },
          { name: 'Brand',    value: ad.brand,               inline: false },
          { name: 'Ad',       value: ad.title,               inline: false },
          { name: 'By',       value: userEmail || 'visitor', inline: false },
        ],
        footer:    'ANTCPU ADS · Share Tracking',
        timestamp: true,
      },
    }),
  }).catch(() => {});

  return newShares;
}
