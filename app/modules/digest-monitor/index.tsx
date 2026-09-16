// app/modules/digest-monitor/index.tsx
// ─── Email system monitor — digest runs + validity + send log ─────────────────
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { SupabaseClient }                      from '@supabase/supabase-js';
import { G, sectionCard, sectionLabel, sectionSub } from '../../lib/adminTokens';

// ─── Types ────────────────────────────────────────────────────────────────────

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

type ValidityRow = {
  email:       string;
  status:      string;
  bounced_at:  string | null;
  bounce_type: string | null;
  unsubbed_at: string | null;
  source:      string | null;
  updated_at:  string;
};

type SendRow = {
  id:          string;
  email:       string;
  template:    string;
  segment:     string | null;
  status:      string;
  skip_reason: string | null;
  locale:      string | null;
  created_at:  string;
};

type ValiditySummary = {
  total:        number;
  valid:        number;
  unknown:      number;
  bounced:      number;
  unsubscribed: number;
  invalid:      number;
};

type Tab = 'runs' | 'validity' | 'sends';

type Props = { supabase: SupabaseClient };

// ─── Status colors ────────────────────────────────────────────────────────────

const VALIDITY_COLOR: Record<string, string> = {
  valid:        G.green,
  unknown:      G.muted,
  bounced:      G.red,
  unsubscribed: G.orange,
  invalid:      G.red,
};

const SEND_STATUS_COLOR: Record<string, string> = {
  sent:    G.green,
  skipped: G.orange,
  failed:  G.red,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function DigestMonitor({ supabase }: Props) {
  const [tab,      setTab]      = useState<Tab>('runs');
  const [runs,     setRuns]     = useState<DigestRun[]>([]);
  const [validity, setValidity] = useState<ValidityRow[]>([]);
  const [sends,    setSends]    = useState<SendRow[]>([]);
  const [summary,  setSummary]  = useState<ValiditySummary | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [firing,   setFiring]   = useState(false);
  const [result,   setResult]   = useState<string | null>(null);

  // ── Load all three data sources in parallel ───────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    const [runsRes, validityRes, sendsRes] = await Promise.all([
      supabase
        .from('digest_runs')
        .select('*')
        .order('run_at', { ascending: false })
        .limit(10),
      supabase
        .from('email_validity')
        .select('email, status, bounced_at, bounce_type, unsubbed_at, source, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50),
      supabase
        .from('email_sends')
        .select('id, email, template, segment, status, skip_reason, locale, created_at')
        .order('created_at', { ascending: false })
        .limit(30),
    ]);

    const v = validityRes.data || [];
    setRuns(runsRes.data     || []);
    setValidity(v);
    setSends(sendsRes.data   || []);

    // Build validity summary
    setSummary({
      total:        v.length,
      valid:        v.filter(r => r.status === 'valid').length,
      unknown:      v.filter(r => r.status === 'unknown').length,
      bounced:      v.filter(r => r.status === 'bounced').length,
      unsubscribed: v.filter(r => r.status === 'unsubscribed').length,
      invalid:      v.filter(r => r.status === 'invalid').length,
    });

    setLoading(false);
  }, [supabase]);

  useEffect(() => { load(); }, [load]);

  // ── Manual digest trigger ─────────────────────────────────────────────────
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
        : `✅ sent: ${data.sent} · gated: ${
            (data.gated?.too_new || 0) +
            (data.gated?.daily_cap || 0) +
            (data.gated?.monthly || 0)
          } · in-app: ${data.notified} · ${data.duration_ms}ms`
      );
      await load();
    } catch (e: unknown) {
      setResult(`❌ ${e instanceof Error ? e.message : 'unknown error'}`);
    }
    setFiring(false);
  }

  // ── Tab button style ──────────────────────────────────────────────────────
  const tabStyle = (active: boolean): React.CSSProperties => ({
    background:   active ? G.orange : 'transparent',
    border:       `1px solid ${active ? G.orange : G.border2}`,
    borderRadius: '6px',
    color:        active ? '#000' : G.muted,
    fontSize:     '0.72rem',
    fontWeight:   700,
    padding:      '0.25rem 0.65rem',
    cursor:       'pointer',
    transition:   'all 0.15s',
  });

  return (
    <div style={sectionCard}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={sectionLabel}>📧 Email System</div>
          <div style={sectionSub}>
            Cron: Monday 09:00 UTC ·
            {summary && (
              <span style={{ marginLeft: '0.4rem' }}>
                <span style={{ color: G.green }}>{summary.valid} valid</span>
                {summary.bounced > 0 && <span style={{ color: G.red, marginLeft: '0.4rem' }}>{summary.bounced} bounced</span>}
                {summary.unsubscribed > 0 && <span style={{ color: G.orange, marginLeft: '0.4rem' }}>{summary.unsubscribed} unsub</span>}
                {summary.unknown > 0 && <span style={{ color: G.muted, marginLeft: '0.4rem' }}>{summary.unknown} unknown</span>}
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={load} disabled={loading}
            style={{ background: 'none', border: `1px solid ${G.border2}`, borderRadius: '6px', color: G.muted, fontSize: '0.65rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
            ↻
          </button>
          <button onClick={fireNow} disabled={firing}
            style={{ background: firing ? G.card2 : G.orange, border: 'none', borderRadius: '8px', color: firing ? G.muted : '#000', fontSize: '0.75rem', fontWeight: 700, padding: '0.45rem 0.85rem', cursor: firing ? 'default' : 'pointer' }}>
            {firing ? '⏳ Firing…' : '▶ Fire Now'}
          </button>
        </div>
      </div>

      {/* ── Fire result ── */}
      {result && (
        <div style={{ background: result.startsWith('✅') ? '#0a1a0a' : '#1a0a0a', border: `1px solid ${result.startsWith('✅') ? G.green + '40' : G.red + '40'}`, borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '0.75rem', fontSize: '0.78rem', color: result.startsWith('✅') ? G.green : G.red, fontWeight: 600 }}>
          {result}
        </div>
      )}

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.85rem' }}>
        <button style={tabStyle(tab === 'runs')}     onClick={() => setTab('runs')}>
          📋 Runs {runs.length > 0 ? `(${runs.length})` : ''}
        </button>
        <button style={tabStyle(tab === 'validity')} onClick={() => setTab('validity')}>
          🛡 Validity {summary ? `(${summary.total})` : ''}
        </button>
        <button style={tabStyle(tab === 'sends')}    onClick={() => setTab('sends')}>
          📨 Send Log {sends.length > 0 ? `(${sends.length})` : ''}
        </button>
      </div>

      {loading ? (
        <div style={{ color: G.muted, fontSize: '0.82rem', padding: '0.5rem 0' }}>Loading...</div>
      ) : (
        <>
          {/* ── RUNS TAB ── */}
          {tab === 'runs' && (
            runs.length === 0 ? (
              <div style={{ color: G.muted, fontSize: '0.82rem', textAlign: 'center', padding: '1rem 0' }}>
                No runs yet — next cron fires Monday 09:00 UTC.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {runs.map((run, i) => {
                  const gated       = (run.gated_too_new || 0) + (run.gated_daily_cap || 0) + (run.gated_monthly || 0);
                  const statusColor = run.errors > 0 ? G.red : run.sent === run.total_eligible ? G.green : G.orange;
                  return (
                    <div key={run.id} style={{ background: G.card2, border: `1px solid ${i === 0 ? statusColor + '50' : G.border}`, borderLeft: `3px solid ${statusColor}`, borderRadius: '10px', padding: '0.85rem 1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.35rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {i === 0 && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: G.orange, background: `${G.orange}20`, border: `1px solid ${G.orange}40`, borderRadius: '999px', padding: '0.1rem 0.45rem' }}>LATEST</span>}
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: G.text }}>{run.week_label}</span>
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: run.triggered_by === 'cron' ? G.green : G.blue, background: run.triggered_by === 'cron' ? `${G.green}15` : `${G.blue}15`, border: `1px solid ${run.triggered_by === 'cron' ? G.green : G.blue}30`, borderRadius: '999px', padding: '0.1rem 0.45rem' }}>
                            {run.triggered_by === 'cron' ? '⏰ cron' : '▶ manual'}
                          </span>
                        </div>
                        <span style={{ fontSize: '0.65rem', color: G.dim }}>
                          {new Date(run.run_at).toLocaleString()} · {run.duration_ms ? `${run.duration_ms}ms` : '—'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', fontSize: '0.72rem' }}>
                        <span style={{ color: G.green,  fontWeight: 700 }}>✅ {run.sent} sent</span>
                        <span style={{ color: G.muted }}>👥 {run.total_eligible} eligible</span>
                        <span style={{ color: gated > 0 ? G.orange : G.dim }}>📭 {gated} gated</span>
                        <span style={{ color: run.notified > 0 ? G.blue : G.dim }}>✉️ {run.notified} in-app</span>
                        {run.errors > 0 && <span style={{ color: G.red, fontWeight: 700 }}>❌ {run.errors} errors</span>}
                      </div>
                      {gated > 0 && (
                        <div style={{ marginTop: '0.3rem', fontSize: '0.65rem', color: G.dim }}>
                          too new: {run.gated_too_new} · daily cap: {run.gated_daily_cap} · monthly: {run.gated_monthly}
                        </div>
                      )}
                      {run.notes && (
                        <div style={{ marginTop: '0.35rem', fontSize: '0.65rem', color: G.red, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          {run.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}

          {/* ── VALIDITY TAB ── */}
          {tab === 'validity' && (
            <>
              {/* Summary pills */}
              {summary && (
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  {[
                    { label: 'valid',        value: summary.valid,        color: G.green  },
                    { label: 'unknown',      value: summary.unknown,      color: G.muted  },
                    { label: 'bounced',      value: summary.bounced,      color: G.red    },
                    { label: 'unsubscribed', value: summary.unsubscribed, color: G.orange },
                    { label: 'invalid',      value: summary.invalid,      color: G.red    },
                  ].filter(s => s.value > 0).map(s => (
                    <span key={s.label} style={{ background: `${s.color}15`, border: `1px solid ${s.color}30`, color: s.color, borderRadius: '999px', padding: '0.2rem 0.65rem', fontSize: '0.68rem', fontWeight: 700 }}>
                      {s.value} {s.label}
                    </span>
                  ))}
                </div>
              )}
              {validity.length === 0 ? (
                <div style={{ color: G.muted, fontSize: '0.82rem', textAlign: 'center', padding: '1rem 0' }}>No validity records yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '320px', overflowY: 'auto' }}>
                  {validity.map(v => (
                    <div key={v.email} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: G.card2, border: `1px solid ${G.border}`, borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: VALIDITY_COLOR[v.status] || G.muted, background: `${VALIDITY_COLOR[v.status] || G.muted}15`, border: `1px solid ${VALIDITY_COLOR[v.status] || G.muted}30`, borderRadius: '999px', padding: '0.1rem 0.45rem', flexShrink: 0 }}>
                        {v.status}
                      </span>
                      <span style={{ flex: 1, fontSize: '0.75rem', color: G.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.email}
                      </span>
                      <span style={{ fontSize: '0.62rem', color: G.dim, flexShrink: 0 }}>
                        {v.source || '—'}
                      </span>
                      {v.bounced_at && (
                        <span style={{ fontSize: '0.62rem', color: G.red, flexShrink: 0 }}>
                          {v.bounce_type || 'bounce'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── SEND LOG TAB ── */}
          {tab === 'sends' && (
            sends.length === 0 ? (
              <div style={{ color: G.muted, fontSize: '0.82rem', textAlign: 'center', padding: '1rem 0' }}>
                No sends logged yet — first send populates this.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '320px', overflowY: 'auto' }}>
                {sends.map(s => (
                  <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: G.card2, border: `1px solid ${G.border}`, borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: SEND_STATUS_COLOR[s.status] || G.muted, background: `${SEND_STATUS_COLOR[s.status] || G.muted}15`, border: `1px solid ${SEND_STATUS_COLOR[s.status] || G.muted}30`, borderRadius: '999px', padding: '0.1rem 0.45rem', flexShrink: 0 }}>
                      {s.status}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.75rem', color: G.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.email}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: G.dim }}>
                        {s.template}{s.segment ? ` · ${s.segment}` : ''}{s.skip_reason ? ` · ${s.skip_reason}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: '0.62rem', color: G.dim, flexShrink: 0 }}>
                      {new Date(s.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      )}
    </div>
  );
}
