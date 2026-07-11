// ─── Click Tracking ───────────────────────────────────────────────────────────
// Single reusable function for tracking ad clicks.
// Replaces inline tracking logic in ArenaUniversalClient,
// ArenaClient, and dashboard/user.
//
// What it does:
// 1. Inserts a row into ad_clicks (ad_id, email, source)
// 2. Increments click_count on the ad
// 3. Fires /api/scout/score to recalculate points + rank
// 4. Notifies Discord on click milestones (every 10 clicks)
// ─────────────────────────────────────────────────────────────────────────────

import { SupabaseClient } from '@supabase/supabase-js';
import { notifyDiscord } from '../discord';
import { TrackingSource } from './sources';

export type ClickableAd = {
  id:          string;
  brand:       string;
  title:       string;
  email:       string;
  click_count: number;
};

export async function trackClick(
  ad:       ClickableAd,
  userEmail: string,
  source:   TrackingSource,
  supabase: SupabaseClient,
): Promise<number> {
  const newCount = (ad.click_count || 0) + 1;

  // — write to ad_clicks + increment counter in parallel
  await Promise.all([
    supabase.from('ad_clicks').insert([{
      ad_id:  ad.id,
      email:  userEmail || 'visitor',
      source,
    }]),
    supabase.from('ads').update({ click_count: newCount }).eq('id', ad.id),
  ]);

  // — recalculate score + rank (fire and forget)
  fetch('/api/scout/score', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ad_id: ad.id }),
  }).catch(() => {});

  // — discord milestone every 10 clicks
  if (newCount % 10 === 0) {
    notifyDiscord(
      `👆 **Click Milestone** — ${ad.brand} hit **${newCount} clicks**\n` +
      `**Ad:** "${ad.title}"\n**Source:** ${source}`
    );
  }

  return newCount;
}
