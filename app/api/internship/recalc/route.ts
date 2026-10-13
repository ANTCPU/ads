// ============================================================
// app/api/internship/recalc/route.ts  v1.0
// POST — Backfill progress for stuck challengers
//
// Source of truth priority:
//   1. submissions table  (gate_id + status)
//   2. activity_log table (gate_id + event)
//   3. challengers.completed_gates (existing)
//
// Auth: x-recalc-secret header
// Supports: dry_run, intern_id filter, max_pct ceiling
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
  'Access-Control-Allow-Headers': 'Content-Type, x-recalc-secret',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

const GATE_PCT: Record<string, number> = {
  d1:5,  d2:10, d3:15, d4:20, d5:22, d6:24, d7:25,
  d8:30, d9:35, d10:38, d11:42, d12:46, d13:48, d14:50,
  d15:55, d16:58, d17:62, d18:65, d19:70, d20:72, d21:75,
  d22:80, d23:85, d24:95, d25:86, d26:88, d27:90, d28:93,
  d29:95, d30:100,
};

const GATE_WEEK: Record<string, number> = {
  d1:1,  d2:1,  d3:1,  d4:1,  d5:1,  d6:1,  d7:1,
  d8:2,  d9:2,  d10:2, d11:2, d12:2, d13:2, d14:2,
  d15:3, d16:3, d17:3, d18:3, d19:3, d20:3, d21:3,
  d22:4, d23:4, d24:4, d25:4, d26:4, d27:4, d28:4,
  d29:4, d30:4,
};

const ROLE_AT_PCT: Array<[number, string]> = [
  [100,'Human in the Loop Intern'],[98,'Showcase Published'],
  [95,'Finalist'],[92,'Intern Candidate'],[88,'Technical Lead'],
  [85,'Developer'],[80,'Project Lead'],[75,'Week 3 Complete'],
  [70,'Senior Contributor'],[65,'Cross-Track Collaborator'],
  [60,'Contributor'],[55,'Team Member'],[50,'Week 2 Complete'],
  [45,'Automation Engineer'],[40,'AI Integration Dev'],
  [35,'Workflow Builder'],[30,'Builder'],[25,'Week 1 Complete'],
  [20,'Junior Automation Dev'],[15,'Explorer'],
  [10,'AI Tool User'],[5,'Registered'],
];

function roleForPct(pct: number): string {
  for (const [t, r] of ROLE_AT_PCT) if (pct >= t) return r;
  return 'Registered';
}

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('x-recalc-secret');
    if (secret !== process.env.RECALC_SECRET && secret !== 'antcpu-recalc-2026') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS });
    }

    const body     = await req.json().catch(() => ({}));
    const dryRun   = body.dry_run   === true;
    const targetId = body.intern_id || null;
    const maxPct   = body.max_pct   ?? 50; // recalc anyone below 50%

    // ── 1. Fetch challengers to recalc ────────────────────
    let q = supabase
      .from('challengers')
      .select('id, intern_id, handle, first_name, track, progress_pct, week, completed_gates, role_title, profile_complete')
      .eq('status', 'active')
      .lte('progress_pct', maxPct);

    if (targetId) q = q.eq('intern_id', targetId);

    const { data: challengers, error: fetchErr } = await q;
    if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500, headers: CORS });
    if (!challengers?.length) return NextResponse.json({ ok: true, updated: 0, message: 'No challengers found' }, { headers: CORS });

    type Result = {
      intern_id: string; handle: string | null;
      old_pct: number; new_pct: number;
      gates_added: string[]; updated: boolean;
      source: string[];
    };

    const results: Result[] = [];

    // ── 2. Process each challenger ────────────────────────
    for (const c of challengers) {
      const existing = new Set<string>(c.completed_gates ?? []);
      const inferred = new Set<string>(existing);
      const sources: string[] = [];

      // Parallel fetch — submissions + activity_log
      const [{ data: subs }, { data: acts }] = await Promise.all([
        supabase
          .from('submissions')
          .select('gate_id, status, created_at')
          .eq('challenger_id', c.id)
          .not('gate_id', 'is', null),
        supabase
          .from('activity_log')
          .select('gate_id, event, created_at')
          .eq('challenger_id', c.id)
          .not('gate_id', 'is', null),
      ]);

      // Submissions — non-draft gate_ids count
      for (const s of subs ?? []) {
        if (s.gate_id && GATE_PCT[s.gate_id] && s.status !== 'draft') {
          if (!inferred.has(s.gate_id)) sources.push('sub:' + s.gate_id);
          inferred.add(s.gate_id);
        }
      }

      // Activity log — all gate events count
      for (const a of acts ?? []) {
        if (a.gate_id && GATE_PCT[a.gate_id]) {
          if (!inferred.has(a.gate_id)) sources.push('act:' + a.gate_id);
          inferred.add(a.gate_id);
        }
      }

      // Baseline grants — d1 if any record exists
      if ((subs?.length ?? 0) > 0 || (acts?.length ?? 0) > 0) {
        if (!inferred.has('d1')) sources.push('baseline:d1');
        inferred.add('d1');
      }

      // d2 if profile_complete flag is set
      if (c.profile_complete && !inferred.has('d2')) {
        sources.push('profile:d2');
        inferred.add('d2');
      }

      // Compute new pct
      const newPct = Math.max(
        c.progress_pct ?? 0,
        ...Array.from(inferred).map(g => GATE_PCT[g] ?? 0)
      );

      const gatesAdded = Array.from(inferred).filter(g => !existing.has(g));
      const gatesArray = Array.from(inferred).sort((a, b) => (GATE_PCT[a] ?? 0) - (GATE_PCT[b] ?? 0));
      const topGate    = gatesArray[gatesArray.length - 1];
      const newWeek    = GATE_WEEK[topGate] ?? c.week ?? 1;
      const newRole    = roleForPct(newPct);
      const didChange  = newPct > (c.progress_pct ?? 0) || gatesAdded.length > 0;

      results.push({
        intern_id:   c.intern_id,
        handle:      c.handle,
        old_pct:     c.progress_pct ?? 0,
        new_pct:     newPct,
        gates_added: gatesAdded,
        updated:     didChange && !dryRun,
        source:      sources,
      });

      if (didChange && !dryRun) {
        await supabase
          .from('challengers')
          .update({
            completed_gates: gatesArray,
            progress_pct:    newPct,
            week:            newWeek,
            role_title:      newRole,
          })
          .eq('id', c.id);
      }
    }

    const updatedCount = results.filter(r => r.updated).length;
    const movers = results
      .filter(r => r.new_pct > r.old_pct)
      .sort((a, b) => (b.new_pct - b.old_pct) - (a.new_pct - a.old_pct));

    if (!dryRun && updatedCount > 0) {
      notifyDiscord('', 'internship', {
        title:  `🔄 Recalc — ${updatedCount} challengers advanced`,
        color:  DC.intern,
        fields: [
          { name: 'Processed', value: String(challengers.length), inline: true },
          { name: 'Updated',   value: String(updatedCount),       inline: true },
          { name: 'Avg old',   value: Math.round(results.reduce((s,r) => s + r.old_pct, 0) / results.length) + '%', inline: true },
          { name: 'Avg new',   value: Math.round(results.reduce((s,r) => s + r.new_pct, 0) / results.length) + '%', inline: true },
          { name: 'Top mover',
            value: movers[0] ? `${movers[0].handle} · ${movers[0].old_pct}% → ${movers[0].new_pct}%` : '—',
            inline: false },
        ],
        footer:    'recalc · antcpu internship · ' + new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
        timestamp: true,
      }).catch(() => {});
    }

    return NextResponse.json({
      ok:        true,
      dry_run:   dryRun,
      processed: challengers.length,
      updated:   updatedCount,
      movers:    movers.map(m => ({ handle: m.handle, old_pct: m.old_pct, new_pct: m.new_pct, gates_added: m.gates_added })),
      results,
    }, { headers: CORS });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[recalc] error:', message);
    return NextResponse.json({ error: message }, { status: 500, headers: CORS });
  }
}
