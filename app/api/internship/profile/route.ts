// ============================================================
// app/api/internship/profile/route.ts
// POST — Complete profile (gate d2), advance progress + log
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
  profile_type:     string | null;
  profile_complete: boolean | null;
};

// ── Gate d2 constants ──────────────────────────────────────
const GATE_ID    = 'd2';
const GATE_PCT   = 10;
const GATE_WEEK  = 1;
const GATE_LABEL = 'Completed Your Profile';
const GATE_ICON  = '👤';

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

// ── profile_type resolver ──────────────────────────────────
function resolveProfileType(track: string, intent: string): string {
  if (track === 'dev')                           return 'builder';
  if (track === 'marketing' && intent === 'grow') return 'creator';
  if (track === 'marketing' && intent === 'all')  return 'connector';
  if (track === 'marketing' && intent === 'learn') return 'strategist';
  return 'builder';
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
      'progress_pct, week, profile_complete'
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
    const {
      intern_id, handle, num, email,
      bio, links, open_to, availability, profile_intent,
    } = body;

    if (!intern_id && !handle && !num && !email) {
      return NextResponse.json(
        { error: 'intern_id, handle, num or email required' },
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

    if (challenger.profile_complete) {
      return NextResponse.json(
        {
          ok:               true,
          already_complete: true,
          challenger_num:   challenger.challenger_num,
          handle:           challenger.handle,
        },
        { headers: CORS }
      );
    }

    const profile_type = resolveProfileType(
      challenger.track    ?? 'dev',
      profile_intent      ?? 'build'
    );

    const updatedGates = [...(challenger.completed_gates ?? []), GATE_ID];
    const newPct       = Math.max(challenger.progress_pct ?? 0, GATE_PCT);
    const newRole      = roleForPct(newPct);

    const [{ data: updatedRaw, error: updateError }] = await Promise.all([
      supabase
        .from('challengers')
        .update({
          bio:              bio          ?? null,
          links:            links        ?? {},
          open_to:          open_to      ?? [],
          availability:     availability ?? null,
          profile_type,
          profile_complete: true,
          completed_gates:  updatedGates,
          progress_pct:     newPct,
          week:             GATE_WEEK,
          role_title:       newRole,
        })
        .eq('id', challenger.id)
        .select(
          'id, intern_id, challenger_num, handle, first_name, ' +
          'track, country, progress_pct, week, role_title, ' +
          'completed_gates, profile_type, profile_complete'
        )
        .single(),

      supabase
        .from('activity_log')
        .insert({
          challenger_id: challenger.id,
          type:          'gate',
          event:         'gate_complete',
          label:         GATE_LABEL,
          icon:          GATE_ICON,
          gate_id:       GATE_ID,
          points:        GATE_PCT,
        }),
    ]);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update profile' },
        { status: 500, headers: CORS }
      );
    }

    const updated = updatedRaw as unknown as UpdatedRow | null;

    const firstName  = updated?.first_name ?? challenger.first_name ?? 'Challenger';
    const track      = updated?.track      ?? challenger.track      ?? 'dev';
    const country    = updated?.country    ?? challenger.country    ?? '—';
    const trackLabel = track === 'dev' ? '💻 Dev' : '📣 Marketing';
    const openToStr  = Array.isArray(open_to) && open_to.length
      ? open_to.join(' · ') : '—';
    const topLink    = links?.github ?? links?.portfolio ?? links?.instagram ?? null;

    notifyDiscord('', 'internship', {
      title:  '✅ Profile Complete',
      color:  DC.intern,
      fields: [
        { name: 'Challenger', value: `${firstName} · ${trackLabel}`, inline: true },
        { name: 'Progress',   value: `5% → ${newPct}% · gate d2 ✓`, inline: true },
        { name: 'Type',       value: profile_type,                   inline: true },
        { name: 'Open to',    value: openToStr,                      inline: true },
        { name: 'Country',    value: country,                        inline: true },
        ...(topLink ? [{ name: 'Link', value: topLink, inline: true }] : []),
      ],
      footer:    `intern_id: ${updated?.intern_id ?? '—'} · October 2026`,
      timestamp: true,
    }).catch(() => {});

    return NextResponse.json(
      {
        ok:             true,
        gate_id:        GATE_ID,
        new_pct:        newPct,
        new_role:       newRole,
        new_week:       GATE_WEEK,
        challenger_num: updated?.challenger_num ?? null,
        handle:         updated?.handle         ?? null,
        challenger:     updated,
      },
      { headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[internship/profile] POST error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}
