// ============================================================
// app/api/internship/progress/route.ts
// POST — Complete a gate, advance progress + log
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
const GATES: Record<string, {
  pct: number; week: number; label: string; icon: string
}> = {
  d1:  { pct: 5,   week: 1, label: 'Registered & Introduced',      icon: '👋' },
  d2:  { pct: 10,  week: 1, label: 'Completed Profile',            icon: '👤' },
  d3:  { pct: 15,  week: 1, label: 'Explored Workspace + EDU',     icon: '🔭' },
  d4:  { pct: 20,  week: 1, label: 'Showed Best Work',             icon: '💼' },
  d5:  { pct: 22,  week: 1, label: 'Joined Community Session',     icon: '🤝' },
  d6:  { pct: 24,  week: 1, label: 'Gave Peer Feedback',           icon: '💬' },
  d7:  { pct: 25,  week: 1, label: 'Week 1 Reflection',            icon: '🔭' },
  d8:  { pct: 30,  week: 2, label: 'W2 Brief + Workspace Tour',    icon: '⚡' },
  d9:  { pct: 33,  week: 2, label: 'Analyzed Something',           icon: '🔍' },
  d10: { pct: 36,  week: 2, label: 'Found the Failure',            icon: '🐛' },
  d11: { pct: 40,  week: 2, label: 'Improved It',                  icon: '🔧' },
  d12: { pct: 44,  week: 2, label: 'Explained Thinking',           icon: '📝' },
  d13: { pct: 47,  week: 2, label: 'Gave Feedback',                icon: '💡' },
  d14: { pct: 50,  week: 2, label: 'Week 2 Reflection',            icon: '⚡' },
  d15: { pct: 52,  week: 3, label: 'Teams Announced',              icon: '🤝' },
  d16: { pct: 55,  week: 3, label: 'Dev Explained the Build',      icon: '💻' },
  d17: { pct: 58,  week: 3, label: 'Marketing Explained Campaign', icon: '📣' },
  d18: { pct: 61,  week: 3, label: 'Dev Improved on Feedback',     icon: '🔨' },
  d19: { pct: 64,  week: 3, label: 'Marketing Improved on Feedback',icon:'📊'},
  d20: { pct: 70,  week: 3, label: 'Joint Submission',             icon: '🏗️' },
  d21: { pct: 75,  week: 3, label: 'Week 3 Reflection',            icon: '🤝' },
  d22: { pct: 78,  week: 4, label: 'Mission Briefing',             icon: '🚀' },
  d23: { pct: 80,  week: 4, label: 'Planning Day',                 icon: '🗺️' },
  d24: { pct: 83,  week: 4, label: 'Build + Prepare',              icon: '🔧' },
  d25: { pct: 86,  week: 4, label: 'Handoff',                      icon: '🤝' },
  d26: { pct: 88,  week: 4, label: 'Launch',                       icon: '🚀' },
  d27: { pct: 90,  week: 4, label: 'Community Interaction',        icon: '💬' },
  d28: { pct: 93,  week: 4, label: 'Final Polish',                 icon: '✨' },
  d29: { pct: 95,  week: 4, label: 'Final Submission',             icon: '🎖️' },
  d30: { pct: 100, week: 4, label: 'Selection Day',                icon: '🏆' },
};

// ── Role map ───────────────────────────────────────────────
const ROLE_AT_PCT: Array<[number, string]> = [
  [100, 'Human in the Loop Intern'],
  [95,  'Finalist'                ],
  [85,  'Developer'               ],
  [80,  'Project Lead'            ],
  [75,  'Week 3 Complete'         ],
  [65,  'Cross-Track Collaborator'],
  [60,  'Contributor'             ],
  [55,  'Team Member'             ],
  [50,  'Week 2 Complete'         ],
  [46,  'Automation Engineer'     ],
  [42,  'AI Integration Dev'      ],
  [38,  'Workflow Builder'        ],
  [35,  'Builder'                 ],
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

    const challenger = await resolveChallenger({ intern_id, handle, num, email });

    if (!challenger) {
      return NextResponse.json(
        { error: 'Challenger not found' },
        { status: 404, headers: CORS }
      );
    }

    const gate = GATES[gate_id];
    const completedGates: string[] = challenger.completed_gates ?? [];

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

    const updated = updatedRaw as unknown as UpdatedRow | null;

    const firstName  = updated?.first_name ?? challenger.first_name ?? 'Challenger';
    const track      = updated?.track      ?? challenger.track      ?? 'dev';
    const trackLabel = track === 'dev' ? '💻 Dev' : '📣 Marketing';
    const prevPct    = challenger.progress_pct ?? 0;

    notifyDiscord('', 'internship', {
      title:  `${gate.icon} Gate Complete — ${gate.label}`,
      color:  DC.intern,
      fields: [
        { name: 'Challenger', value: `${firstName} · ${trackLabel}`,      inline: true },
        { name: 'Progress',   value: `${prevPct}% → ${newPct}% · ${gate_id} ✓`, inline: true },
        { name: 'Role',       value: newRole,                              inline: true },
        { name: 'Week',       value: `Week ${newWeek}`,                   inline: true },
      ],
      footer:    `intern_id: ${updated?.intern_id ?? '—'} · October 2026`,
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
