// ─── Boost Tracking ───────────────────────────────────────────────────────────
// Records a boost event for an ad.
//
// What it does:
// 1. Writes a row to ad_boosts (ad_id, session_id, email)
// 2. Increments boost_count on the ad
// 3. Fires /api/scout/score to recalculate points + rank
// 4. Notifies Discord on every 10 boost milestone via /api/discord-notify
// 5. Awards first-boost badge to the BOOSTER (userEmail) — not the ad owner
// 6. Notifies ad OWNER on first boost received on their ad
// 7. Notifies BOOSTER — badge confirmation + streak-aware nudge
//
// IMPROVEMENT LOG:
// v2 — C-05 fix: first-boost badge now goes to booster (userEmail), not ad owner
//    — Owner notified on first boost received on their ad
//    — Booster notified with badge confirmation + streak-aware nudge
//    — userEmail stored in ad_boosts row for analytics
// ─────────────────────────────────────────────────────────────────────────────

import { SupabaseClient } from '@supabase/supabase-js';
import { TrackingSource } from './sources';
import { awardBadge }     from '../badges';

// ✅ notifyDiscord REMOVED — routed through /api/discord-notify
// This file is imported by client components — must never import discord.ts

const BASE_URL = typeof window !== 'undefined'
  ? ''
  : (process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app');

export type BoostableAd = {
  id:          string;
  brand:       string;
  title:       string;
  email:       string;   // ad owner email
  boost_count: number;
};

export async function recordBoost(
  ad:        BoostableAd,
  sessionId: string,
  source:    TrackingSource,
  supabase:  SupabaseClient,
  userEmail?: string,   // booster — optional, anon if absent
): Promise<number> {

  const newCount    = (ad.boost_count || 0) + 1;
  const boosterEmail = userEmail && userEmail !== 'visitor' ? userEmail : null;

  // 1 + 2 — write boost row + increment count in parallel
  await Promise.all([
    supabase.from('ad_boosts').insert([{
      ad_id:      ad.id,
      session_id: sessionId,
      email:      boosterEmail,   // store who boosted — null for anon
    }]),
    supabase.from('ads')
      .update({ boost_count: newCount })
      .eq('id', ad.id),
  ]);

  // 3 — recalculate score + rank (fire and forget)
  fetch(`${BASE_URL}/api/scout/score`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ad_id: ad.id }),
  }).catch(() => {});

  // 4 — Discord milestone every 10 boosts
  if (newCount % 10 === 0) {
    fetch(`${BASE_URL}/api/discord-notify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '',
        event:   'general',
        embed: {
          title:  '⚡ Boost Milestone',
          color:  0xD4AF37,
          fields: [
            { name: 'Brand',        value: ad.brand,         inline: true  },
            { name: 'Total Boosts', value: String(newCount), inline: true  },
            { name: 'Source',       value: source,           inline: true  },
            { name: 'Ad',           value: ad.title,         inline: false },
          ],
          footer:    'ANTCPU ADS · Boost Tracking',
          timestamp: true,
        },
      }),
    }).catch(() => {});
  }

  // ── Post-boost notifications — fire and forget block ─────────────────────
  (async () => {
    try {

      // 5 — Award first-boost badge to BOOSTER (fix C-05)
      if (boosterEmail) {
        await awardBadge(supabase, boosterEmail, 'first-boost');
      }

      // 6 — Notify AD OWNER on first boost on this specific ad
      if (newCount === 1 && ad.email && ad.email !== boosterEmail) {
        fetch(`${BASE_URL}/api/notify`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email:   ad.email,
            type:    'boost',
            title:   `⚡ First boost on "${ad.title}"`,
            message: `Someone boosted your ad for the first time. Boosts multiply your points — share your ad to keep the momentum going.`,
          }),
        }).catch(() => {});
      }

      // 7 — Notify BOOSTER — badge + streak-aware nudge
      if (boosterEmail) {

        const { data: boosterRow } = await supabase
          .from('ad_signups')
          .select('streak_days, points')
          .eq('email', boosterEmail)
          .maybeSingle();

        const streak = boosterRow?.streak_days || 0;
        const points = boosterRow?.points      || 0;

        // Badge confirmation
        fetch(`${BASE_URL}/api/notify`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email:   boosterEmail,
            type:    'badge',
            title:   '⚡ Booster badge earned',
            message: streak >= 2
              ? `You boosted ${ad.brand}'s ad. 🔥 You're on a ${streak}-day streak — ${streak < 3 ? '1 more day to unlock the Arena Active badge!' : 'keep it going.'}`
              : `You boosted ${ad.brand}'s ad. Share an ad today to start building your streak and unlock the Arena Active badge.`,
          }),
        }).catch(() => {});

        // Streak nudge — only if building but not yet at threshold
        if (streak >= 1 && streak < 3) {
          fetch(`${BASE_URL}/api/notify`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email:   boosterEmail,
              type:    'streak',
              title:   `🔥 ${streak}-day streak — keep going`,
              message: `${3 - streak} more active day${3 - streak !== 1 ? 's' : ''} to unlock the Arena Active badge. Share an ad today to extend your streak.`,
            }),
          }).catch(() => {});
        }

        // Points milestone nudge
        if (points > 0) {
          const nextThreshold = [100, 300, 750].find(t => t > points);
          if (nextThreshold && (nextThreshold - points) <= 20) {
            fetch(`${BASE_URL}/api/notify`, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email:   boosterEmail,
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
