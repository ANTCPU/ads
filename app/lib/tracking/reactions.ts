// app/lib/tracking/reactions.ts
// ─── Reaction Tracking ────────────────────────────────────────────────────────
// v2 (Sep 2026):
//   — points field added to ReactableAd (fixes TS2353 build error)
//   — points added directly to ad.points per reaction type
//     hot=+3, watching=+2, interesting=+2
//   — owner notified on first reaction received on their ad
//   — reactor gets badge + streak nudge (same pattern as likes/boosts)
//   — ReactionType exported from here (single source — picker imports it)
//   — BASE_URL pattern matches likes.ts / boosts.ts
// ─────────────────────────────────────────────────────────────────────────────

import { SupabaseClient } from '@supabase/supabase-js';
import { TrackingSource } from './sources';
import { awardBadge }     from '../badges';

// ✅ notifyDiscord REMOVED — routed through /api/discord-notify
// This file is imported by client components — must never import discord.ts

const BASE_URL = typeof window !== 'undefined'
  ? ''
  : (process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app');

export type ReactableAd = {
  id:             string;
  brand:          string;
  title:          string;
  email:          string;   // ad owner email
  reaction_count: number;
  points:         number;   // ← added v2 — required for direct points increment
};

export type ReactionType = 'hot' | 'watching' | 'interesting';

// Points awarded to the ad owner per reaction type
const REACTION_POINTS: Record<ReactionType, number> = {
  hot:         3,   // strongest signal — someone's excited
  watching:    2,   // interest signal
  interesting: 2,   // discovery signal
};

export async function recordReaction(
  ad:           ReactableAd,
  reactionType: ReactionType,
  sessionId:    string,
  userEmail:    string | null,   // null = anon
  source:       TrackingSource,
  supabase:     SupabaseClient,
): Promise<number> {

  const newCount  = (ad.reaction_count || 0) + 1;
  const pts       = REACTION_POINTS[reactionType];
  const newPoints = (ad.points || 0) + pts;
  const email     = userEmail && userEmail !== 'visitor' ? userEmail : null;

  // 1 + 2 + 3 — write reaction row, increment count, add points — all parallel
  await Promise.all([
    supabase.from('ad_reactions').insert([{
      ad_id:         ad.id,
      reaction_type: reactionType,
      session_id:    sessionId,
      email,
      source,
    }]),
    supabase.from('ads')
      .update({
        reaction_count: newCount,
        points:         newPoints,   // ← direct points increment
      })
      .eq('id', ad.id),
  ]);

  // 4 — recalculate rank (fire and forget)
  fetch(`${BASE_URL}/api/scout/score`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ad_id: ad.id, source }),
  }).catch(() => {});

  // ── Post-reaction notifications — fire and forget ─────────────────────────
  (async () => {
    try {

      // 5 — first-reaction badge to REACTOR
      if (email) {
        const { count } = await supabase
          .from('ad_reactions')
          .select('*', { count: 'exact', head: true })
          .eq('email', email);
        if ((count || 0) <= 1) {
          await awardBadge(supabase, email, 'first-reaction');
        }
      }

      // 6 — notify AD OWNER on first reaction on this specific ad
      if (newCount === 1 && ad.email && ad.email !== email) {
        fetch(`${BASE_URL}/api/notify`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email:   ad.email,
            type:    'reaction',
            title:   `🔥 First reaction on "${ad.title}"`,
            message: `Someone reacted to your ad for the first time — +${pts} points added. Reactions shape the Arena rankings. Keep sharing to earn more.`,
          }),
        }).catch(() => {});
      }

      // 7 — notify REACTOR — badge + streak nudge
      if (email) {
        const { data: reactorRow } = await supabase
          .from('ad_signups')
          .select('streak_days, points')
          .eq('email', email)
          .maybeSingle();

        const streak = reactorRow?.streak_days || 0;
        const rPts   = reactorRow?.points      || 0;

        const label = reactionType === 'hot'
          ? '🔥 Hot'
          : reactionType === 'watching'
          ? '👀 Watching'
          : '💡 Interesting';

        fetch(`${BASE_URL}/api/notify`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            type:    'badge',
            title:   `${label} — reaction recorded`,
            message: streak >= 2
              ? `You reacted to ${ad.brand}'s ad. 🔥 You're on a ${streak}-day streak — ${streak < 3 ? '1 more day to unlock the Arena Active badge!' : 'keep it going.'}`
              : `You reacted to ${ad.brand}'s ad. Share an ad today to start building your streak.`,
          }),
        }).catch(() => {});

        if (streak >= 1 && streak < 3) {
          fetch(`${BASE_URL}/api/notify`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              type:    'streak',
              title:   `🔥 ${streak}-day streak — keep going`,
              message: `${3 - streak} more active day${3 - streak !== 1 ? 's' : ''} to unlock the Arena Active badge. Share an ad today to extend your streak.`,
            }),
          }).catch(() => {});
        }

        if (rPts > 0) {
          const nextThreshold = [100, 300, 750].find(t => t > rPts);
          if (nextThreshold && (nextThreshold - rPts) <= 20) {
            fetch(`${BASE_URL}/api/notify`, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email,
                type:    'points',
                title:   `⚡ ${nextThreshold - rPts} pts to next tier`,
                message: `You're ${nextThreshold - rPts} points away from the next Arena tier. Share an ad to close the gap.`,
              }),
            }).catch(() => {});
          }
        }
      }

    } catch {}
  })();

  return newCount;
}
