// ============================================================
// app/api/internship/me/route.ts
// GET — Load challenger by email or intern_id
//       Returns full challenger row + CV block
// Called by:
//   antcpu.io/dev/        — workspace identity load
//   antcpu.io/marketing/  — workspace identity load
//   antcpu-ads.vercel.app/profile/[slug] — CV layer on Arena profile
// ============================================================

import { createClient } from '@supabase/supabase-js';
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

// ── Role milestone map — gates that earn a named role ─────────

const ROLE_GATES: Array<{ gate: string; pct: number; role: string }> = [
  { gate: 'd1',  pct: 5,   role: 'Registered'       },
  { gate: 'd2',  pct: 10,  role: 'AI Tool User'      },
  { gate: 'd3',  pct: 15,  role: 'Explorer'          },
  { gate: 'd7',  pct: 25,  role: 'Week 1 Complete'   },
  { gate: 'd14', pct: 50,  role: 'Week 2 Complete'   },
  { gate: 'd21', pct: 75,  role: 'Week 3 Complete'   },
  { gate: 'd29', pct: 95,  role: 'Finalist'          },
  { gate: 'd31', pct: 100, role: 'Intern'            },
];

function buildEarnedRoles(completedGates: string[]) {
  if (!completedGates?.length) return [];
  return ROLE_GATES.filter(r => completedGates.includes(r.gate));
}

function buildCv(data: Record<string, unknown>) {
  const email       = data.email        as string;
  const intern_id   = data.intern_id    as string;
  const track       = data.track        as string;
  const cohort      = data.cohort       as string || 'october-2026';
  const role_title  = data.role_title   as string || 'Registered';
  const progress    = data.progress_pct as number || 0;
  const week        = data.week         as number || 1;
  const submissions = data.submissions  as number || 0;
  const gates       = data.completed_gates as string[] || [];

  // Format cohort — "october-2026" → "October 2026"
  const cohortLabel = cohort
    .replace('-', ' ')
    .replace(/\b\w/g, c => c.toUpperCase());

  const trackLabel = track === 'dev' ? '💻 Developer' : '📣 Marketer';

  const profileUrl = email
    ? `https://antcpu-ads.vercel.app/profile/${encodeURIComponent(email)}`
    : `https://antcpu.io/leaderboard/`;

  return {
    is_challenger: true,
    track_label:   trackLabel,
    cohort:        cohortLabel,
    current_role:  role_title,
    progress_pct:  progress,
    week,
    earned_roles:  buildEarnedRoles(gates),
    submissions,
    profile_url:   profileUrl,
    intern_id,
    verified_url:  'https://antcpu.io/leaderboard/',
  };
}

// ── GET ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const email     = searchParams.get('email');
    const intern_id = searchParams.get('intern_id');

    if (!email && !intern_id) {
      return NextResponse.json(
        { error: 'email or intern_id required' },
        { status: 400, headers: CORS }
      );
    }

    let query = supabase
      .from('challengers')
      .select('*')
      .eq('status', 'active');

    if (email)     query = query.eq('email', email);
    if (intern_id) query = query.eq('intern_id', intern_id);

    const { data, error } = await query.single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Challenger not found' },
        { status: 404, headers: CORS }
      );
    }

    return NextResponse.json(
      {
        challenger: data,
        cv:         buildCv(data)
      },
      { headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[internship/me] GET error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}
