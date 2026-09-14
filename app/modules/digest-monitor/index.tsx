// app/modules/digest-monitor/index.tsx
// ─── Weekly digest run history + manual trigger ───────────────────────────────
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient }                      from '@supabase/supabase-js';
import { G, rowBtn, sectionCard, sectionLabel, sectionSub } from '../../lib/adminTokens';

type DigestRun = {
  id:              string;
  run_at:          string;
  week_label:      string;
  triggered_by:    string;
  total_eligible:  number;
  sent:            number;
  gated_too_new:   number;
  gated_daily_cap: number;
  gated_monthly:   number;
  notified:        number;
  errors:          number;
  duration_ms:     number;
  notes:           string | null;
};

type Props = { supabase: SupabaseClient };

export default function DigestMonitor({ supabase }: Props) {
  const [runs,    setRuns]    = useState<DigestRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [firing,  setFiring]  = useState(false);
  const [result,  setResult]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('digest_runs')
      .select('*')
      .order('run_at', { ascending: false })
      .limit(10);
    if (data) setRuns(data);
    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  async function fireNow() {
    setFiring(true);
    setResult(null);
    try {
      const res  = await fetch('/api/send-weekly', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ secret: process.env.NEXT_PUBLIC_WEEKLY_SECRET }),
      });
      const data = await res.json();
      setResult(data.error
        ? `❌ ${data.error}`
        : `✅ sent: ${data.sent} · gated: ${(data.gated?.too_new||0)+(data.gated?.daily_cap||0)+(data.gated?.monthly||0)} · in-app: ${data.notified} · ${data.duration_ms}ms`
      );
      await load();
    } catch (e: any) { setResult(`❌ ${e.message}`); }
    setFiring(false);
  }

  return (
    <div style={sectionCard}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={sectionLabel}>📧 Weekly Digest Monitor</div>
          <div style={sectionSub}>Cron: Monday 09:00 UTC · <code style={{ color: G.orange, fontSize: '0.68rem' }}>digest_runs</code> · last 10</div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={load} disabled={loading} style={{ background: 'none', border: `1px solid ${G.border2}`, borderRadius: '6px', color: G.muted, fontSize: '0.65rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>↻</button>
          <button onClick={fireNow} disabled={firing} style={{ background: firing ? G.card2 : G.orange, border: 'none', borderRadius: '8px', color: firing ? G.muted : '#000', fontSize: '0.75rem', fontWeight: 700, padding: '0.45rem 0.85rem', cursor: firing ? 'default' : 'pointer' }}>
            {firing ? '⏳ Firing…' : '▶ Fire Now'}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div style={{ background: result.startsWith('✅') ? '#0a1a0a' : '#1a0a0a', border: `1px solid ${result.startsWith('✅') ? G.green + '40' : G.red + '40'}`, borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '1rem', fontSize: '0.78rem', color: result.startsWith('✅') ? G.green : G.red, fontWeight: 600 }}>
          {result}
        </div>
      )}

      {/* Runs */}
      {loading ? (
        <div style={{ color: G.muted, fontSize: '0.82rem', padding: '0.5rem 0' }}>Loading...</div>
      ) : runs.length === 0 ? (
        <div style={{ color: G.muted, fontSize: '0.82rem', textAlign: 'center', padding: '1rem 0' }}>No runs yet — next cron fires Monday 09:00 UTC.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {runs.map((run, i) => {
            const gated       = (run.gated_too_new||0) + (run.gated_daily_cap||0) + (run.gated_monthly||0);
            const statusColor = run.errors > 0 ? G.red : run.sent === run.total_eligible ? G.green : G.orange;
            return (
              <div key={run.id} style={{ background: G.card2, border: `1px solid ${i === 0 ? statusColor + '50' : G.border}`, borderLeft: `3px solid ${statusColor}`, borderRadius: '10px', padding: '0.85rem 1rem' }}>
                {/* Row 1 */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {i === 0 && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: G.orange, background: `${G.orange}20`, border: `1px solid ${G.orange}40`, borderRadius: '999px', padding: '0.1rem 0.45rem' }}>LATEST</span>}
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: G.text }}>{run.week_label}</span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: run.triggered_by === 'cron' ? G.green : G.blue, background: run.triggered_by === 'cron' ? `${G.green}15` : `${G.blue}15`, border: `1px solid ${run.triggered_by === 'cron' ? G.green : G.blue}30`, borderRadius: '999px', padding: '0.1rem 0.45rem' }}>
                      {run.triggered_by === 'cron' ? '⏰ cron' : '▶ manual'}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.65rem', color: G.dim }}>{new Date(run.run_at).toLocaleString()} · {run.duration_ms ? `${run.duration_ms}ms` : '—'}</span>
                </div>
                {/* Row 2 — counts */}
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.72rem' }}>
                  <span style={{ color: G.green,  fontWeight: 700 }}>✅ {run.sent} sent</span>
                  <span style={{ color: G.muted }}>👥 {run.total_eligible} eligible</span>
                  <span style={{ color: gated > 0 ? G.orange : G.dim }}>📭 {gated} gated</span>
                  <span style={{ color: run.notified > 0 ? G.blue : G.dim }}>✉️ {run.notified} in-app</span>
                  {run.errors > 0 && <span style={{ color: G.red, fontWeight: 700 }}>❌ {run.errors} errors</span>}
                </div>
                {/* Row 3 — gate breakdown */}
                {gated > 0 && <div style={{ marginTop: '0.3rem', fontSize: '0.65rem', color: G.dim }}>too new: {run.gated_too_new} · daily cap: {run.gated_daily_cap} · monthly: {run.gated_monthly}</div>}
                {/* Row 4 — notes */}
                {run.notes && <div style={{ marginTop: '0.35rem', fontSize: '0.65rem', color: G.red, fontFamily: 'monospace', wordBreak: 'break-all' }}>{run.notes}</div>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
