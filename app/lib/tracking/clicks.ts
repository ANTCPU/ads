// ─── Click Tracking ───────────────────────────────────────────────────────────
// Single reusable function for tracking ad clicks.
//
// What it does:
// 1. Inserts a row into ad_clicks (ad_id, email, source)
// 2. Increments click_count on the ad
// 3. Fires /api/scout/score to recalculate points + rank
// 4. Notifies Discord on click milestones (every 10 clicks)
// 5. Awards first-click badge to the CLICKER (userEmail) — not the ad owner
// 6. Notifies ad OWNER on click milestones (10, 25, 50)
// 7. Notifies CLICKER — badge confirmation on first click
//
// IMPROVEMENT LOG:
// v2 — C-03 fix: first-click badge now goes to clicker (userEmail), not ad owner
//    — Owner notified on click milestones (10, 25, 50)
//    — Clicker notified with badge confirmation on first click
// ─────────────────────────────────────────────────────────────────────────────

import { SupabaseClient } from '@supabase/supabase-js';
import { TrackingSource } from './sources';
import { awardBadge }     from '../badges';

// ✅ notifyDiscord REMOVED — routed through /api/discord-notify
// This file is imported by client components — must never import discord.ts

const BASE_URL = typeof window !== 'undefined'
  ? ''
  : (process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app');

export type ClickableAd = {
  id:          string;
  brand:       string;
  title:       string;
  email:       string;   // ad owner email
  click_count: number;
};

export async function trackClick(
  ad:        ClickableAd,
  userEmail: string,
  source:    TrackingSource,
  supabase:  SupabaseClient,
): Promise<number> {

  const newCount    = (ad.click_count || 0) + 1;
  const clickerEmail = userEmail && userEmail !== 'visitor' ? userEmail : null;

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
  fetch(`${BASE_URL}/api/scout/score`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ad_id: ad.id }),
  }).catch(() => {});

  // 4 — Discord milestone every 10 clicks
  if (newCount % 10 === 0) {
    fetch(`${BASE_URL}/api/discord-notify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '',
        event:   'click_milestone',
        embed: {
          title:  '👆 Click Milestone',
          color:  0xF0883E,
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

  // ── Post-click notifications — fire and forget block ─────────────────────
  (async () => {
    try {

      // 5 — Award first-click badge to CLICKER (fix C-03)
      if (clickerEmail) {
        await awardBadge(supabase, clickerEmail, 'first-click');
      }

      // 6 — Notify AD OWNER on click milestones (10, 25, 50)
      if ([10, 25, 50].includes(newCount) && ad.email) {
        fetch(`${BASE_URL}/api/notify`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email:   ad.email,
            type:    'click',
            title:   `👆 ${newCount} clicks on "${ad.title}"`,
            message: `Your ad just hit ${newCount} clicks. Share it to keep driving traffic and climb the Arena rankings.`,
          }),
        }).catch(() => {});
      }

      // 7 — Notify CLICKER on their first ever click (badge confirmation)
      if (clickerEmail) {
        const { count } = await supabase
          .from('ad_clicks')
          .select('*', { count: 'exact', head: true })
          .eq('email', clickerEmail);

        if ((count || 0) <= 1) {
          fetch(`${BASE_URL}/api/notify`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email:   clickerEmail,
              type:    'badge',
              title:   '👆 Explorer badge earned',
              message: `You visited ${ad.brand}'s ad. Share it to earn points and start building your Arena streak.`,
            }),
          }).catch(() => {});
        }
      }

    } catch {}
  })();

  return newCount;
}
