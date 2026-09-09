// app/api/session/set/route.ts

// ─── Session Set ──────────────────────────────────────────────────────────────
// Called from persistSession() in login/page.tsx — every login path hits this.
// PIN users, no-PIN users, Pi auth, super admin — all flow through here.
//
// Sets arena_session as HttpOnly — not readable by JS, survives mobile Safari.
// sameSite: 'none' — required for cross-origin reads from antcpu.com/cloud/
// secure: true     — required when sameSite is 'none' (browser enforced)
//
// syncBadges() now returns enriched session data:
//   { membershipTier, streakDays, trialStatus, lastActiveDate, preferredLocale }
// This is returned to the caller so persistSession() can write it to localStorage.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse }                          from 'next/server';
import { createClient }                                       from '@supabase/supabase-js';
import { awardBadge, checkAndAwardPointsBadges,
         checkAndAwardActivityBadge }                        from '../../../lib/badges';
import { calcMembershipTier, upgradeMembershipTier,
         MembershipTier }                                    from '../../../lib/membership';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Enriched session data returned to caller ─────────────────────────────────

type SyncResult = {
  membershipTier:  MembershipTier;
  streakDays:      number;
  trialStatus:     string;
  lastActiveDate:  string | null;
  preferredLocale: string;
};

// ─── syncBadges ───────────────────────────────────────────────────────────────
// Fires on every session establishment regardless of login path.
// Idempotent — safe to run on every login, never duplicates.
// Returns enriched data for localStorage sync including preferredLocale.

async function syncBadges(email: string): Promise<SyncResult> {
  const fallback: SyncResult = {
    membershipTier:  'trial',
    streakDays:      0,
    trialStatus:     'trial',
    lastActiveDate:  null,
    preferredLocale: 'en',
  };

  try {
    // ── Fetch full user row ───────────────────────────────────────────────────
    const { data: user } = await supabase
      .from('ad_signups')
      .select('promo_code, points, membership_tier, status, streak_days, last_active_date, preferred_locale')
      .eq('email', email)
      .maybeSingle();

    if (!user) return fallback;

    const checks: Promise<unknown>[] = [];

    // ── Tier 1 — Identity badges ──────────────────────────────────────────────

    checks.push(
      (async () => {
        const { count } = await supabase
          .from('ad_signups')
          .select('*', { count: 'exact', head: true });
        if ((count || 0) <= 100) {
          await awardBadge(supabase, email, 'arena-original');
        }
      })()
    );

    const promo = user.promo_code?.toUpperCase();
    if (promo === 'MAPOFPI')    checks.push(awardBadge(supabase, email, 'pi-pioneer'));
    if (promo === 'INTERNSHIP') checks.push(awardBadge(supabase, email, 'challenger'));

    // ── Tier 3 — Points milestones ────────────────────────────────────────────
    if ((user.points || 0) > 0) {
      checks.push(checkAndAwardPointsBadges(supabase, email, user.points || 0));
    }

    await Promise.all(checks);

    // ── Streak logic ──────────────────────────────────────────────────────────
    // today / yesterday as 'YYYY-MM-DD' strings — timezone-safe via UTC
    const now       = new Date();
    const today     = now.toISOString().slice(0, 10);
    const yesterday = new Date(now.getTime() - 86_400_000).toISOString().slice(0, 10);

    const lastActive = user.last_active_date || null;  // 'YYYY-MM-DD' or null
    let   streakDays = user.streak_days      || 0;

    // Count today's shares for this user
    const todayStart = `${today}T00:00:00.000Z`;
    const { count: sharesToday } = await supabase
      .from('ad_shares')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .gte('created_at', todayStart);

    const activeToday = (sharesToday || 0) >= 3;

    let newLastActive = lastActive;

    if (lastActive === today) {
      // Already counted today — no change to streak
    } else if (activeToday) {
      if (lastActive === yesterday) {
        // Consecutive day — extend streak
        streakDays    = streakDays + 1;
        newLastActive = today;
      } else {
        // Gap or first active day — start/restart streak at 1
        streakDays    = 1;
        newLastActive = today;
      }
    } else if (lastActive && lastActive < yesterday) {
      // No shares today AND gap in streak — reset
      streakDays = 0;
    }
    // else: no shares today, lastActive = yesterday → streak intact, just waiting

    // Write streak back if anything changed
    if (newLastActive !== lastActive || streakDays !== (user.streak_days || 0)) {
      await supabase
        .from('ad_signups')
        .update({
          streak_days:      streakDays,
          last_active_date: newLastActive,
        })
        .eq('email', email);
    }

    // Award arena-active badge if streak qualifies
    await checkAndAwardActivityBadge(supabase, email, streakDays);

    // ── Retroactive first-reaction badge ──────────────────────────────────────
    // Covers existing users whose past reactions had no email attached.
    // Checks if this user owns any ad that has received reactions.
    (async () => {
      try {
        const { data: userAds } = await supabase
          .from('ads')
          .select('id')
          .eq('email', email);
        if (userAds && userAds.length > 0) {
          const adIds = userAds.map((a: { id: string }) => a.id);
          const { count } = await supabase
            .from('ad_reactions')
            .select('*', { count: 'exact', head: true })
            .in('ad_id', adIds);
          if ((count || 0) > 0) {
            await awardBadge(supabase, email, 'first-reaction');
          }
        }
      } catch {}
    })();

    // ── Membership tier recalculation ─────────────────────────────────────────
    const { data: badgeRows } = await supabase
      .from('user_badges')
      .select('badge_slug')
      .eq('user_email', email);

    const currentTier = (user.membership_tier || 'trial') as MembershipTier;
    const badgeSlugs  = (badgeRows || []).map((b: { badge_slug: string }) => b.badge_slug);
    const newTier     = calcMembershipTier(user.points || 0, badgeSlugs, currentTier);

    if (newTier !== currentTier) {
      await upgradeMembershipTier(supabase, email, newTier, currentTier);
    }

    return {
      membershipTier:  newTier !== currentTier ? newTier : currentTier,
      streakDays,
      trialStatus:     user.status           || 'trial',
      lastActiveDate:  newLastActive,
      preferredLocale: user.preferred_locale || 'en',
    };

  } catch {
    return fallback;
  }
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { email, name, brand, trialStatus, role } = await req.json();

    if (!email || !role) {
      return NextResponse.json(
        { ok: false, error: 'email and role required' },
        { status: 400 }
      );
    }

    const session = JSON.stringify({ email, name, brand, trialStatus, role });
    const maxAge  = (trialStatus === 'team' || role === 'super')
      ? 90 * 86400
      :  3 * 86400;

    // ── Run syncBadges and await result ───────────────────────────────────────
    // Previously fire-and-forget. Now awaited so we can return enriched data.
    // Still silent-fails internally — never blocks session.
    const sync = await syncBadges(email).catch(() => ({
      membershipTier:  'trial' as MembershipTier,
      streakDays:      0,
      trialStatus:     trialStatus || 'trial',
      lastActiveDate:  null,
      preferredLocale: 'en',
    }));

    const res = NextResponse.json({
      ok:              true,
      membershipTier:  sync.membershipTier,
      streakDays:      sync.streakDays,
      trialStatus:     sync.trialStatus,
      lastActiveDate:  sync.lastActiveDate,
      preferredLocale: sync.preferredLocale,
    });

    res.cookies.set('arena_session', session, {
      httpOnly: true,
      secure:   true,
      sameSite: 'none',
      maxAge,
      path:     '/',
    });

    return res;

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
