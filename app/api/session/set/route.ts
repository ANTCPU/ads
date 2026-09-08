import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { awardBadge, checkAndAwardPointsBadges } from '../../../lib/badges';

// ─── Session Set ──────────────────────────────────────────────────────────────
// Called from persistSession() in login/page.tsx — every login path hits this.
// PIN users, no-PIN users, Pi auth, super admin — all flow through here.
//
// Sets arena_session as HttpOnly — not readable by JS, survives mobile Safari.
// sameSite: 'none' — required for cross-origin reads from antcpu.com/cloud/
// secure: true     — required when sameSite is 'none' (browser enforced)
//
// Badge sync runs server-side after cookie is set — fire and forget.
// Uses SERVICE_ROLE_KEY — never exposed to client.
// Tier 4 manual badges handled separately via Vault (future).
// ─────────────────────────────────────────────────────────────────────────────

// Service role client — server-side only, never sent to browser
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── Badge sync ───────────────────────────────────────────────────────────────
// Fires on every session establishment regardless of login path.
// Idempotent — safe to run on every login, never duplicates.
// Silent fail — never blocks session or redirects.

async function syncBadges(email: string): Promise<void> {
  try {
    // Fetch user data needed for badge checks
    const { data: user } = await supabase
      .from('ad_signups')
      .select('promo_code, points')
      .eq('email', email)
      .maybeSingle();

    if (!user) return;

    const checks: Promise<unknown>[] = [];

    // ── Tier 1 — Identity ──────────────────────────────────────────────────

    // arena-original — awarded if ≤100 users total
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

    // promo-based identity badges
    const promo = user.promo_code?.toUpperCase();
    if (promo === 'MAPOFPI')    checks.push(awardBadge(supabase, email, 'pi-pioneer'));
    if (promo === 'INTERNSHIP') checks.push(awardBadge(supabase, email, 'challenger'));

    // ── Tier 3 — Points milestones ─────────────────────────────────────────
    // Catches any users who crossed thresholds before badge system existed
    if ((user.points || 0) > 0) {
      checks.push(checkAndAwardPointsBadges(supabase, email, user.points || 0));
    }

    await Promise.all(checks);

  } catch {
    // Silent fail — badge sync never blocks session
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

    const res = NextResponse.json({ ok: true });
    res.cookies.set('arena_session', session, {
      httpOnly: true,
      secure:   true,
      sameSite: 'none',
      maxAge,
      path:     '/',
    });

    // ── Badge sync — fire and forget, never awaited ────────────────────────
    // Runs after cookie is set — session is already established before this.
    // Tier 4 manual badges handled via Vault (future).
    syncBadges(email).catch(() => {});

    return res;

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
