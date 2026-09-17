// app/lib/tracking/likes.ts
// ─── Like Tracking ────────────────────────────────────────────────────────────
// Records a like event for an ad.
//
// What it does:
// 1. Writes a row to ad_likes (ad_id, session_id)
// 2. Increments like_count on the ad
// 3. Adds +1 pt directly to ad.points (v3 fix — was 0)
// 4. Fires /api/scout/score to recalculate points + rank
// 5. Notifies Discord on every 25 like milestone via /api/discord-notify
// 6. Awards first-like badge to the LIKER (userEmail) — not the ad owner
// 7. Notifies ad OWNER on first like on their ad
// 8. Notifies LIKER — badge confirmation + streak nudge
//
// IMPROVEMENT LOG:
// v3 — points: +1 added directly to ad.points on every like (was missing)
//    — LikeableAd gains points field (required for direct increment)
// v2 — C-04 fix: first-like badge now goes to liker (userEmail), not ad owner
//    — Owner notified on first like received on their ad
//    — Liker notified with badge confirmation + streak-aware nudge
// ─────────────────────────────────────────────────────────────────────────────

import { SupabaseClient } from '@supabase/supabase-js';
import { TrackingSource } from './sources';
import { awardBadge }     from '../badges';

// ✅ notifyDiscord REMOVED — routed through /api/discord-notify
// This file is imported by client components — must never import discord.ts

const BASE_URL = typeof window !== 'undefined'
  ? ''
  : (process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app');

export type LikeableAd = {
  id:         string;
  brand:      string;
  title:      string;
  email:      string;   // ad owner email
  like_count: number;
  points:     number;   // ← v3 — required for direct points increment
};

export async function recordLike(
  ad:        LikeableAd,
  sessionId: string,
  source:    TrackingSource,
  supabase:  SupabaseClient,
  userEmail?: string,   // liker — optional, anon if absent
): Promise<number> {

  const newCount   = (ad.like_count || 0) + 1;
  const newPoints  = (ad.points     || 0) + 1;   // ← +1 pt per like
  const likerEmail = userEmail && userEmail !== 'visitor' ? userEmail : null;

  // 1 + 2 + 3 — write like row, increment count, add points — all parallel
  await Promise.all([
    supabase.from('ad_likes').insert([{
      ad_id:      ad.id,
      session_id: sessionId,
      email:      likerEmail,
    }]),
    supabase.from('ads')
      .update({
        like_count: newCount,
        points:     newPoints,   // ← direct points increment
      })
      .eq('id', ad.id),
  ]);

  // 4 — recalculate score + rank (fire and forget)
  fetch(`${BASE_URL}/api/scout/score`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ad_id: ad.id }),
  }).catch(() => {});

  // 5 — Discord milestone every 25 likes
  if (newCount % 25 === 0) {
    fetch(`${BASE_URL}/api/discord-notify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '',
        event:   'general',
        embed: {
          title:  '😊 Like Milestone',
          color:  0x2E7D32,
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

  // ── Post-like notifications — fire and forget block ───────────────────────
  (async () => {
    try {

      // 6 — Award first-like badge to LIKER
      if (likerEmail) {
        await awardBadge(supabase, likerEmail, 'first-like');
      }

      // 7 — Notify AD OWNER on first like on this specific ad
      if (newCount === 1 && ad.email && ad.email !== likerEmail) {
        fetch(`${BASE_URL}/api/notify`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email:   ad.email,
            type:    'like',
            title:   `😊 First like on "${ad.title}"`,
            message: `Someone liked your ad for the first time — +1 point added. Keep sharing to earn more engagement and climb the Arena.`,
          }),
        }).catch(() => {});
      }

      // 8 — Notify LIKER — badge + streak-aware nudge
      if (likerEmail) {

        const { data: likerRow } = await supabase
          .from('ad_signups')
          .select('streak_days, points')
          .eq('email', likerEmail)
          .maybeSingle();

        const streak = likerRow?.streak_days || 0;
        const points = likerRow?.points      || 0;

        fetch(`${BASE_URL}/api/notify`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email:   likerEmail,
            type:    'badge',
            title:   '😊 Supporter badge earned',
            message: streak >= 2
              ? `You liked ${ad.brand}'s ad. 🔥 You're on a ${streak}-day streak — ${streak >= 2 && streak < 3 ? '1 more day to unlock the Arena Active badge!' : 'keep it going.'}`
              : `You liked ${ad.brand}'s ad. Share an ad today to start building your streak and unlock the Arena Active badge.`,
          }),
        }).catch(() => {});

        if (streak >= 1 && streak < 3) {
          fetch(`${BASE_URL}/api/notify`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email:   likerEmail,
              type:    'streak',
              title:   `🔥 ${streak}-day streak — keep going`,
              message: `${3 - streak} more active day${3 - streak !== 1 ? 's' : ''} to unlock the Arena Active badge. Share an ad today to extend your streak.`,
            }),
          }).catch(() => {});
        }

        if (points > 0) {
          const nextThreshold = [100, 300, 750].find(t => t > points);
          if (nextThreshold && (nextThreshold - points) <= 20) {
            fetch(`${BASE_URL}/api/notify`, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email:   likerEmail,
                type:    'points',
                title:   `⚡ ${nextThreshold - points} pts to next tier`,
                message: `You're ${nextThreshold - points} points away from the next Arena tier. Share an ad to close the gap.`,
              }),
            }).catch(() => {});
          }
        }
      }

    } catch {}
  })();

  return newCount;
}
