// ─── Share Tracking ───────────────────────────────────────────────────────────
// Single reusable function for recording share events.
// Replaces inline share tracking in ArenaUniversalClient,
// ArenaClient, and dashboard/user.
//
// What it does:
// 1. Writes a row to ad_shares (ad_id, email, platform, url, brand, source)
// 2. Increments share_count on the ad
// 3. Fires /api/scout/score to recalculate points + rank
// 4. Notifies Discord on every 5 share milestone via /api/discord-notify
// 5. Awards first-share badge — checks user's TOTAL share history, not ad count
//
// Note: called AFTER the platform intent opens or text is copied —
// not before — so we only count confirmed share attempts.
//
// IMPROVEMENT LOG:
// v2 — detectPlatform() helper exported for callers
//    — source field added to ad_shares insert
//    — source passed through to scout/score
//    — first-share badge checks user total history (not ad.share_count === 1)
// ─────────────────────────────────────────────────────────────────────────────

import { SupabaseClient } from '@supabase/supabase-js';
import { TrackingSource } from './sources';
import { awardBadge } from '../badges';

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

// ─── detectPlatform ───────────────────────────────────────────────────────────
// Call before sharing to get the right platform label.
// Pass the result to recordShare as the platform argument.
//
// Usage:
//   let usedNative = false;
//   try { await navigator.share(...); usedNative = true; } catch {}
//   const platform = detectPlatform(usedNative);

export function detectPlatform(usedNativeShare: boolean): string {
  return usedNativeShare ? 'native' : 'copy';
}

// ─── recordShare ──────────────────────────────────────────────────────────────

export async function recordShare(
  ad:        ShareableAd,
  userEmail: string,
  platform:  string,
  source:    TrackingSource,
  supabase:  SupabaseClient,
): Promise<number> {

  const newShares = (ad.share_count || 0) + 1;
  const email     = userEmail || 'visitor';

  // 1 + 2 — write share row + increment count in parallel
  await Promise.all([
    supabase.from('ad_shares').insert([{
      ad_id:    ad.id,
      email,
      platform,
      source,
      url:      ad.url || null,
      brand:    ad.brand,
    }]),
    supabase.from('ads')
      .update({ share_count: newShares })
      .eq('id', ad.id),
  ]);

  // 3 — recalculate score + rank (fire and forget)
  // Pass source so scout can apply multipliers (e.g. cloud_guest = 2x)
  fetch('/api/scout/score', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ad_id: ad.id, source }),
  }).catch(() => {});

  // 4 — Discord milestone every 5 shares
  if (newShares % 5 === 0) {
    fetch('/api/discord-notify', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '',
        event:   'share',
        embed: {
          title:  '↗ Share Milestone',
          color:  0x0070F3,
          fields: [
            { name: 'Platform', value: platform,          inline: true  },
            { name: 'Shares',   value: String(newShares), inline: true  },
            { name: 'Source',   value: source,            inline: true  },
            { name: 'Brand',    value: ad.brand,          inline: false },
            { name: 'Ad',       value: ad.title,          inline: false },
            { name: 'By',       value: email,             inline: false },
          ],
          footer:    'ANTCPU ADS · Share Tracking',
          timestamp: true,
        },
      }),
    }).catch(() => {});
  }

  // 5 — first-share badge
  // Checks user's TOTAL share history — not just this ad's count.
  // count will be 1 if this is their first ever share (just inserted above).
  // Idempotent — awardBadge never duplicates.
  if (email !== 'visitor') {
    (async () => {
      try {
        const { count } = await supabase
          .from('ad_shares')
          .select('*', { count: 'exact', head: true })
          .eq('email', email);
        if ((count || 0) <= 1) {
          await awardBadge(supabase, email, 'first-share');
        }
      } catch {}
    })();
  }

  return newShares;
}
