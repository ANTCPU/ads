// ============================================================
// app/api/internship/me/route.ts
// GET — Unified identity lookup
//
// Lookup order:
//   1. antcpu_users  — master table (owner/staff/alumni)
//   2. challengers   — internship participants
//
// Removes .eq('status','active') filter — any account resolves.
// Injects access flags from antcpu_users into response.
//
// Lookup params (any one):
//   ?email=     ?intern_id=     ?handle=     ?num=
// ============================================================

import { createClient }          from '@supabase/supabase-js';
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

const ROLE_GATES = [
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
  const email          = data.email           as string;
  const intern_id      = data.intern_id        as string;
  const track          = data.track            as string;
  const cohort         = (data.cohort          as string) || 'october-2026';
  const role_title     = (data.role_title      as string) || 'Registered';
  const progress       = (data.progress_pct    as number) || 0;
  const week           = (data.week            as number) || 1;
  const submissions    = (data.submissions     as number) || 0;
  const gates          = (data.completed_gates as string[]) || [];
  const challenger_num = (data.challenger_num  as number)  || null;
  const handle         = (data.handle          as string)  || null;
  const cohort_short   = (data.cohort_short    as string)  || null;

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
    const email     = searchParams.get('email');
    const intern_id = searchParams.get('intern_id');
    const handle    = searchParams.get('handle');
    const num       = searchParams.get('num');

    if (!email && !intern_id && !handle && !num) {
      return NextResponse.json(
        { error: 'email, intern_id, handle or num required' },
        { status: 400, headers: CORS }
      );
    }

    // ── 1. Check antcpu_users first ───────────────────────────
    // Master table — owner, staff, alumni

    let masterRecord = null;

    if (email) {
      const { data } = await supabase
        .from('antcpu_users')
        .select('*')
        .eq('email', email)
        .single();
      masterRecord = data || null;
    }

    // ── 2. Check challengers ──────────────────────────────────
    // No status filter — any challenger resolves

    let challengerQuery = supabase
      .from('challengers')
      .select('*');

    if (email)     challengerQuery = challengerQuery.eq('email',           email);
    else if (intern_id) challengerQuery = challengerQuery.eq('intern_id',  intern_id);
    else if (handle)    challengerQuery = challengerQuery.eq('handle',     handle);
    else if (num)       challengerQuery = challengerQuery.eq('challenger_num', parseInt(num));

    const { data: challenger, error: challengerError } =
      await challengerQuery.single();

    // ── 3. Nothing found ──────────────────────────────────────

    if (!masterRecord && (challengerError || !challenger)) {
      return NextResponse.json(
        { error: 'Challenger not found' },
        { status: 404, headers: CORS }
      );
    }

    // ── 4. Build access flags ─────────────────────────────────

    const access = masterRecord ?? {};

    const accessFlags = {
      antcpu_user_id:        (access as any).id            || null,
      access_level:          (access as any).access_level  || 'challenger',
      can_access_admin:      (access as any).can_access_admin      ?? false,
      can_access_arena:      (access as any).can_access_arena      ?? true,
      can_access_internship: (access as any).can_access_internship ?? true,
      can_access_edu:        (access as any).can_access_edu        ?? false,
      track_scope:           (access as any).track_scope   || null,
      cohort_scope:          (access as any).cohort_scope  || null,
      brand_name:            (access as any).brand_name    || null,
      brand_role:            (access as any).brand_role    || null,
      is_owner:              (access as any).access_level === 'owner',
      is_staff:              (access as any).access_level === 'staff',
      is_alumni:             (access as any).access_level === 'alumni',
    };

    // ── 5. Merge challenger + access ──────────────────────────
    // If challenger row exists use it as base.
    // If master-only (owner with no challenger row) use master.

    const base = challenger ?? {
      email:          (access as any).email,
      name:           (access as any).name,
      intern_id:      (access as any).intern_id || null,
      first_name:     ((access as any).name || '').split(' ')[0],
      track:          (access as any).track_scope || 'dev',
      progress_pct:   0,
      completed_gates: [],
      role_title:     (access as any).access_level || 'Member',
      cohort:         (access as any).cohort_scope || null,
    };

    return NextResponse.json(
      {
        challenger: {
          ...base,
          ...accessFlags,
        },
        cv: challenger ? buildCv(challenger) : null,
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
