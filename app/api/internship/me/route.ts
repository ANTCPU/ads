// ============================================================
// app/api/internship/me/route.ts
// GET — Unified identity lookup
//
// Lookup order:
//   1. antcpu_users  — master table (owner/staff/alumni)
//   2. challengers   — internship participants
//
// No status filter — any active account resolves.
// Access flags injected from antcpu_users into response.
//
// Lookup params (any one):
//   ?email=     ?intern_id=     ?handle=     ?num=
// ============================================================

import { createClient }              from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'no-store, max-age=0',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

// ── Role milestone map ────────────────────────────────────────

const ROLE_GATES: Array<{ gate: string; pct: number; role: string }> = [
  { gate: 'd1',  pct: 5,  role: 'Registered'     },
  { gate: 'd2',  pct: 10, role: 'AI Tool User'    },
  { gate: 'd3',  pct: 15, role: 'Explorer'        },
  { gate: 'd7',  pct: 25, role: 'Week 1 Complete' },
  { gate: 'd14', pct: 50, role: 'Week 2 Complete' },
  { gate: 'd21', pct: 75, role: 'Week 3 Complete' },
  { gate: 'd24', pct: 95, role: 'Finalist'        },
];

function buildEarnedRoles(completedGates: string[]) {
  if (!completedGates?.length) return [];
  return ROLE_GATES.filter(r => completedGates.includes(r.gate));
}

// ── CV block ──────────────────────────────────────────────────

function buildCv(data: Record<string, unknown>) {
  const email          = data.email            as string;
  const intern_id      = data.intern_id         as string;
  const track          = data.track             as string;
  const cohort         = (data.cohort           as string) || 'october-2026';
  const role_title     = (data.role_title       as string) || 'Registered';
  const progress       = (data.progress_pct     as number) || 0;
  const week           = (data.week             as number) || 1;
  const submissions    = (data.submissions      as number) || 0;
  const gates          = (data.completed_gates  as string[]) || [];
  const challenger_num = (data.challenger_num   as number)  || null;
  const handle         = (data.handle           as string)  || null;
  const cohort_short   = (data.cohort_short     as string)  || null;

  const cohortLabel = cohort
    .replace('-', ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  const trackLabel = track === 'dev' ? '💻 Developer' : '📣 Marketer';

  const profileUrl = email
    ? `https://antcpu-ads.vercel.app/profile/${encodeURIComponent(email)}`
    : `https://antcpu.io/leaderboard/`;

  return {
    is_challenger:  true,
    challenger_num,
    handle,
    cohort_short,
    track_label:    trackLabel,
    cohort:         cohortLabel,
    current_role:   role_title,
    progress_pct:   progress,
    week,
    earned_roles:   buildEarnedRoles(gates),
    submissions,
    profile_url:    profileUrl,
    intern_id,
    verified_url:   'https://antcpu.io/leaderboard/',
  };
}

// ── GET ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email     = searchParams.get('email')?.toLowerCase().trim() ?? null;
    const intern_id = searchParams.get('intern_id');
    const handle    = searchParams.get('handle');
    const num       = searchParams.get('num');

    if (!email && !intern_id && !handle && !num) {
      return NextResponse.json(
        { error: 'email, intern_id, handle or num required' },
        { status: 400, headers: CORS }
      );
    }

    // ── 1. antcpu_users lookup — master table ─────────────────
    let masterRecord: Record<string, unknown> | null = null;

    if (email) {
      const { data } = await supabase
        .from('antcpu_users')
        .select('*')
        .eq('email', email)
        .maybeSingle();
      masterRecord = data ?? null;
    }

    // ── 2. challengers lookup — no status filter ───────────────
    let challengerQuery = supabase
      .from('challengers')
      .select('*');

    if (email)     challengerQuery = challengerQuery.eq('email',           email);
    else if (intern_id) challengerQuery = challengerQuery.eq('intern_id',  intern_id);
    else if (handle)    challengerQuery = challengerQuery.eq('handle',     handle);
    else if (num)       challengerQuery = challengerQuery.eq('challenger_num', parseInt(num));

    const { data: challenger, error: challengerError } =
      await challengerQuery.maybeSingle();

    // ── 3. Nothing found anywhere ──────────────────────────────
    if (!masterRecord && (challengerError || !challenger)) {
      return NextResponse.json(
        { error: 'Challenger not found' },
        { status: 404, headers: CORS }
      );
    }

    // ── 4. Build access flags from antcpu_users ────────────────
    const m = masterRecord as any;

    const accessFlags = {
      antcpu_user_id:        m?.id                        ?? null,
      access_level:          m?.access_level              ?? 'challenger',
      can_access_admin:      m?.can_access_admin          ?? false,
      can_access_arena:      m?.can_access_arena          ?? true,
      can_access_internship: m?.can_access_internship     ?? true,
      can_access_edu:        m?.can_access_edu            ?? false,
      track_scope:           m?.track_scope               ?? null,
      cohort_scope:          m?.cohort_scope              ?? null,
      brand_name:            m?.brand_name                ?? null,
      brand_role:            m?.brand_role                ?? null,
      is_owner:              m?.access_level === 'owner',
      is_staff:              m?.access_level === 'staff',
      is_alumni:             m?.access_level === 'alumni',
    };

    // ── 5. Base — challenger row or master-only fallback ───────
    const base: Record<string, unknown> = challenger ?? {
      email:           m?.email,
      name:            m?.name,
      first_name:      (m?.name as string)?.split(' ')[0] ?? null,
      intern_id:       m?.intern_id ?? null,
      track:           m?.track_scope ?? 'dev',
      progress_pct:    100,
      completed_gates: ['d1'],
      role_title:      m?.access_level ?? 'Member',
      cohort:          m?.cohort_scope ?? 'october-2026',
      week:            4,
    };

    // ── 6. Merge and return ────────────────────────────────────
    const merged = { ...base, ...accessFlags };

    return NextResponse.json(
      {
        challenger: merged,
        cv:         buildCv(merged),
      },
      { headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[me] GET error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}
