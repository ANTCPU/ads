// ============================================================
// app/api/internship/progress/route.ts
// POST — Complete a gate, advance progress + log
//
// v2 changes:
// — GATES pct values aligned to DB gates table exactly
// — GATES d3/d4/d5 labels updated for new week-unlock model
//   d3: 'Explored the Arena'
//   d4: 'First Arena Action Taken'
//   d5: 'First Submission Made'
// — ROLE_AT_PCT aligned to config.js roles exactly —
//   all thresholds present, both tracks covered, no gaps
// — Discord footer: hardcoded 'October 2026' → dynamic date
// — All other logic, types, resolver, DB update unchanged
// ============================================================

import { createClient }             from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { notifyDiscord, DC }        from '../../../lib/discord';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

// ── Types ──────────────────────────────────────────────────

type ChallengerRow = {
  id:               string;
  intern_id:        string;
  challenger_num:   number | null;
  handle:           string | null;
  email:            string;
  first_name:       string | null;
  track:            string | null;
  country:          string | null;
  completed_gates:  string[] | null;
  progress_pct:     number | null;
  week:             number | null;
  role_title:       string | null;
  profile_complete: boolean | null;
};

type UpdatedRow = {
  id:               string;
  intern_id:        string;
  challenger_num:   number | null;
  handle:           string | null;
  first_name:       string | null;
  track:            string | null;
  country:          string | null;
  progress_pct:     number | null;
  week:             number | null;
  role_title:       string | null;
  completed_gates:  string[] | null;
  profile_complete: boolean | null;
};

// ── Gate registry ──────────────────────────────────────────
// pct values match DB gates table exactly.
// Labels are past-tense — used in Discord + activity_log only.
// Frontend labels come from DB gates.label column.

const GATES: Record<string, {
  pct: number; week: number; label: string; icon: string
}> = {
  // Week 1 — Explorer — all unlock Day 1
  d1:  { pct: 5,   week: 1, label: 'Registered & Introduced',       icon: '👋' },
  d2:  { pct: 10,  week: 1, label: 'Completed Profile',             icon: '👤' },
  d3:  { pct: 15,  week: 1, label: 'Explored the Arena',            icon: '🔭' },
  d4:  { pct: 20,  week: 1, label: 'First Arena Action Taken',      icon: '⚡' },
  d5:  { pct: 22,  week: 1, label: 'First Submission Made',         icon: '📤' },
  d6:  { pct: 24,  week: 1, label: 'Gave Peer Feedback',            icon: '💬' },
  d7:  { pct: 25,  week: 1, label: 'Week 1 Reflection Done',        icon: '🔭' },
  // Week 2 — Creator — unlocks Day 8
  d8:  { pct: 30,  week: 2, label: 'Week 2 Brief Reviewed',         icon: '⚡' },
  d9:  { pct: 35,  week: 2, label: 'Research & Analysis Done',      icon: '🔍' },
  d10: { pct: 38,  week: 2, label: 'Build Day 1 Complete',          icon: '🔧' },
  d11: { pct: 42,  week: 2, label: 'Build Day 2 Complete',          icon: '🔧' },
  d12: { pct: 46,  week: 2, label: 'Shipped & Submitted',           icon: '📤' },
  d13: { pct: 48,  week: 2, label: 'Peer Review Given',             icon: '💡' },
  d14: { pct: 50,  week: 2, label: 'Week 2 Reflection Done',        icon: '⚡' },
  // Week 3 — Collaborator — unlocks Day 14
  d15: { pct: 55,  week: 3, label: 'Met the Team',                  icon: '🤝' },
  d16: { pct: 58,  week: 3, label: 'Team Brief Defined',            icon: '💻' },
  d17: { pct: 62,  week: 3, label: 'Built Together Day 1',          icon: '🔨' },
  d18: { pct: 65,  week: 3, label: 'Built Together Day 2',          icon: '🔨' },
  d19: { pct: 70,  week: 3, label: 'Team Project Shipped',          icon: '🏗️' },
  d20: { pct: 72,  week: 3, label: 'Cross-Track Review Given',      icon: '📊' },
  d21: { pct: 75,  week: 3, label: 'Week 3 Reflection Done',        icon: '🤝' },
  // Week 4 — Leader — unlocks Day 21
  d22: { pct: 80,  week: 4, label: 'Role Claimed',                  icon: '🚀' },
  d23: { pct: 85,  week: 4, label: 'Final Build Shipped',           icon: '💻' },
  d24: { pct: 95,  week: 4, label: 'Final Submission & Showcase',   icon: '🎖️' },
  d25: { pct: 86,  week: 4, label: 'Handoff Complete',              icon: '🤝' },
  d26: { pct: 88,  week: 4, label: 'Launched',                      icon: '🚀' },
  d27: { pct: 90,  week: 4, label: 'Community Interaction Done',    icon: '💬' },
  d28: { pct: 93,  week: 4, label: 'Final Polish Done',             icon: '✨' },
  d29: { pct: 95,  week: 4, label: 'Final Submission Made',         icon: '🎖️' },
  d30: { pct: 100, week: 4, label: 'Selection Day Complete',        icon: '🏆' },
};

// ── Role map ───────────────────────────────────────────────
// Aligned to config.js roles exactly — all pct thresholds
// present for both dev and marketing tracks.
// role_title is a single string in the DB — this map picks
// the most meaningful unified title at each threshold.
// Track-specific display titles are handled by the frontend
// via config.js roles arrays.

const ROLE_AT_PCT: Array<[number, string]> = [
  [100, 'Human in the Loop Intern'],
  [98,  'Showcase Published'      ],
  [95,  'Finalist'                ],
  [92,  'Intern Candidate'        ],
  [88,  'Technical Lead'          ],
  [85,  'Developer'               ],
  [80,  'Project Lead'            ],
  [75,  'Week 3 Complete'         ],
  [70,  'Senior Contributor'      ],
  [65,  'Cross-Track Collaborator'],
  [60,  'Contributor'             ],
  [55,  'Team Member'             ],
  [50,  'Week 2 Complete'         ],
  [45,  'Automation Engineer'     ],
  [40,  'AI Integration Dev'      ],
  [35,  'Workflow Builder'        ],
  [30,  'Builder'                 ],
  [25,  'Week 1 Complete'         ],
  [20,  'Junior Automation Dev'   ],
  [15,  'Explorer'                ],
  [10,  'AI Tool User'            ],
  [5,   'Registered'              ],
];

function roleForPct(pct: number): string {
  for (const [threshold, role] of ROLE_AT_PCT) {
    if (pct >= threshold) return role;
  }
  return 'Registered';
}

// ── Challenger resolver ────────────────────────────────────

async function resolveChallenger(params: {
  intern_id?: string | null;
  handle?:    string | null;
  num?:       string | null;
  email?:     string | null;
}): Promise<ChallengerRow | null> {

  let query = supabase
    .from('challengers')
    .select(
      'id, intern_id, challenger_num, handle, email, ' +
      'first_name, track, country, completed_gates, ' +
      'progress_pct, week, role_title, profile_complete'
    )
    .eq('status', 'active');

  if (params.intern_id)   query = query.eq('intern_id',      params.intern_id);
  else if (params.handle) query = query.eq('handle',         params.handle);
  else if (params.num)    query = query.eq('challenger_num', parseInt(params.num));
  else if (params.email)  query = query.eq('email',          params.email);
  else return null;

  const { data } = await query.single();
  return (data as unknown as ChallengerRow) ?? null;
}

// ── POST ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { intern_id, handle, num, email, gate_id } = body;

    if (!intern_id && !handle && !num && !email) {
      return NextResponse.json(
        { error: 'intern_id, handle, num or email required' },
        { status: 400, headers: CORS }
      );
    }

    if (!gate_id || !GATES[gate_id]) {
      return NextResponse.json(
        { error: `Unknown gate_id: ${gate_id}` },
        { status: 400, headers: CORS }
      );
    }

    const challenger = await resolveChallenger(
      { intern_id, handle, num, email }
    );

    if (!challenger) {
      return NextResponse.json(
        { error: 'Challenger not found' },
        { status: 404, headers: CORS }
      );
    }

    const gate            = GATES[gate_id];
    const completedGates  = challenger.completed_gates ?? [];

    // Already complete — return current state, no DB write
    if (completedGates.includes(gate_id)) {
      return NextResponse.json(
        {
          ok:               true,
          already_complete: true,
          gate_id,
          progress_pct:     challenger.progress_pct,
          role_title:       challenger.role_title,
          challenger_num:   challenger.challenger_num,
          handle:           challenger.handle,
        },
        { headers: CORS }
      );
    }

    const updatedGates = [...completedGates, gate_id];
    const newPct       = Math.max(challenger.progress_pct ?? 0, gate.pct);
    const newRole      = roleForPct(newPct);
    const newWeek      = gate.week;

    // DB update + activity log — parallel
    const [{ data: updatedRaw, error: updateError }] = await Promise.all([
      supabase
        .from('challengers')
        .update({
          completed_gates: updatedGates,
          progress_pct:    newPct,
          week:            newWeek,
          role_title:      newRole,
          last_seen_at:    new Date().toISOString(),
        })
        .eq('id', challenger.id)
        .select(
          'id, intern_id, challenger_num, handle, first_name, ' +
          'track, country, progress_pct, week, role_title, ' +
          'completed_gates, profile_complete'
        )
        .single(),

      supabase
        .from('activity_log')
        .insert({
          challenger_id: challenger.id,
          type:          'gate',
          event:         'gate_complete',
          label:         gate.label,
          icon:          gate.icon,
          gate_id,
          points:        gate.pct,
        }),
    ]);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update progress' },
        { status: 500, headers: CORS }
      );
    }

    const updated    = updatedRaw as unknown as UpdatedRow | null;
    const firstName  = updated?.first_name ?? challenger.first_name ?? 'Challenger';
    const track      = updated?.track      ?? challenger.track      ?? 'dev';
    const trackLabel = track === 'dev' ? '💻 Dev' : '📣 Marketing';
    const prevPct    = challenger.progress_pct ?? 0;

    // Dynamic cohort label — no hardcoded month
    const cohortLabel = new Date().toLocaleDateString('en-US', {
      month: 'long',
      year:  'numeric',
    });

    notifyDiscord('', 'internship', {
      title:  `${gate.icon} Gate Complete — ${gate.label}`,
      color:  DC.intern,
      fields: [
        { name: 'Challenger', value: `${firstName} · ${trackLabel}`,            inline: true },
        { name: 'Progress',   value: `${prevPct}% → ${newPct}% · ${gate_id} ✓`, inline: true },
        { name: 'Role',       value: newRole,                                    inline: true },
        { name: 'Week',       value: `Week ${newWeek}`,                          inline: true },
      ],
      footer:    `intern_id: ${updated?.intern_id ?? '—'} · ${cohortLabel}`,
      timestamp: true,
    }).catch(() => {});

    return NextResponse.json(
      {
        ok:             true,
        gate_id,
        new_pct:        newPct,
        new_role:       newRole,
        new_week:       newWeek,
        challenger_num: updated?.challenger_num ?? null,
        handle:         updated?.handle         ?? null,
        challenger:     updated,
      },
      { headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[internship/progress] POST error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}
