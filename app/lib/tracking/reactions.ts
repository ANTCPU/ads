// app/lib/tracking/reactions.ts
import { SupabaseClient } from '@supabase/supabase-js';
import { TrackingSource } from './sources';
import { awardBadge } from '../badges';

export type ReactableAd = {
  id:             string;
  brand:          string;
  title:          string;
  email:          string;   // ad owner email
  reaction_count: number;
};

export type ReactionType = 'hot' | 'watching' | 'interesting';

export async function recordReaction(
  ad:           ReactableAd,
  reactionType: ReactionType,
  sessionId:    string,
  userEmail:    string | null,   // null = anon
  source:       TrackingSource,
  supabase:     SupabaseClient,
): Promise<number> {

  const newCount = (ad.reaction_count || 0) + 1;
  const email    = userEmail && userEmail !== 'visitor' ? userEmail : null;

  // 1 + 2 — write reaction row + increment count in parallel
  await Promise.all([
    supabase.from('ad_reactions').insert([{
      ad_id:         ad.id,
      reaction_type: reactionType,
      session_id:    sessionId,
      email,          // null for anon — new field
      source,
    }]),
    supabase.from('ads')
      .update({ reaction_count: newCount })
      .eq('id', ad.id),
  ]);

  // 3 — recalculate score (fire and forget)
  fetch('/api/scout/score', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ad_id: ad.id, source }),
  }).catch(() => {});

  // 4 — first-reaction badge (new users — forward path)
  // Checks user's TOTAL reaction history — same pattern as first-share
  if (email) {
    (async () => {
      try {
        const { count } = await supabase
          .from('ad_reactions')
          .select('*', { count: 'exact', head: true })
          .eq('email', email);
        if ((count || 0) <= 1) {
          await awardBadge(supabase, email, 'first-reaction');
        }
      } catch {}
    })();
  }

  return newCount;
}
