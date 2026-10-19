// app/internship/week/[week]/WeekClient.tsx
// Version: v1.0
// Updated: 2026-10-19

'use client';

import { useEffect, useState } from 'react';

const BG     = '#0a0a0a';
const CARD   = '#111';
const BORDER = '#1e1e1e';
const ACCENT = '#f97316';
const GREEN  = '#22c55e';
const MUTED  = '#555';
const WHITE  = '#f1f1f1';

type Gate = { id: string; pct: number; label: string; icon: string };

type WeekData = {
  name:   string;
  theme:  string;
  range:  string;
  locked: boolean;
  gates:  Gate[];
};

type ChallengerState = {
  handle:       string;
  intern_id:    string;
  progress_pct: number;
  completed_gates: string[];
  team_id:      string | null;
};

export default function WeekClient({
  week,
  data,
}: {
  week: number;
  data: WeekData;
}) {
  const [challenger, setChallenger] = useState<ChallengerState | null>(null);
  const [loading,    setLoading]    = useState(true);

  // ── Load challenger state from localStorage handle
  useEffect(() => {
    const handle = localStorage.getItem('intern_handle');
    const intern_id = localStorage.getItem('intern_id');
    if (!handle || !intern_id) { setLoading(false); return; }

    fetch(`/api/internship/me?handle=${handle}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) setChallenger({
          handle,
          intern_id,
          progress_pct:    d.progress_pct    ?? 0,
          completed_gates: d.completed_gates ?? [],
          team_id:         d.team_id         ?? null,
        });
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, []);

  // ── Session ping — real last_seen signal (identified)
  useEffect(() => {
    const intern_id = localStorage.getItem('intern_id');
    const handle    = localStorage.getItem('intern_handle');
    if (!intern_id || !handle) return;
    fetch('/api/internship/session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ intern_id, handle, page: `week/${week}` }),
    }).catch(() => null);
  }, [week]);

  // ── Doorbell ping — anonymous page view (page_views table)
  useEffect(() => {
    const email = localStorage.getItem('intern_email') ?? undefined;
    fetch('/api/doorbell', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        page:  `/internship/week/${week}`,
        ref:   document.referrer || 'direct',
        ts:    new Date().toISOString(),
        ua:    navigator.userAgent.slice(0, 120),
        email: email ?? null,
      }),
    }).catch(() => null);
  }, [week]);

  // ── Gate status for this challenger
  const gateStatus = (gate: Gate): 'done' | 'next' | 'locked' => {
    if (!challenger) return 'locked';
    if (challenger.completed_gates.includes(gate.id)) return 'done';
    // next = first incomplete gate at or above current progress
    const firstIncomplete = data.gates.find(
      g => !challenger.completed_gates.includes(g.id)
    );
    if (firstIncomplete?.id === gate.id) return 'next';
    return 'locked';
  };

  const weekDone  = data.gates.filter(g =>
    challenger?.completed_gates.includes(g.id)
  ).length;
  const weekTotal = data.gates.length;
  const weekPct   = Math.round((weekDone / weekTotal) * 100);

  const officeUrl = challenger
    ? `https://antcpu-ads.vercel.app/office/${challenger.handle}`
    : 'https://antcpu-ads.vercel.app/office';

  return (
    <main style={{
      minHeight:  '100vh',
      background: BG,
      color:      WHITE,
      fontFamily: 'monospace',
      padding:    '2rem 1rem',
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{
            fontSize:      '0.7rem',
            color:         MUTED,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            marginBottom:  '0.5rem',
          }}>
            ANTCPU Internship · Week {week} of 4
          </div>
          <div style={{
            fontSize:   '1.6rem',
            fontWeight: 900,
            marginBottom: '0.4rem',
          }}>
            {data.locked ? '🔒 ' : ''}{data.name}
          </div>
          <div style={{ fontSize: '0.88rem', color: '#aaa', lineHeight: 1.6 }}>
            {data.theme}
          </div>
          <div style={{
            marginTop:  '0.5rem',
            fontSize:   '0.72rem',
            color:      ACCENT,
            fontWeight: 700,
          }}>
            {data.range}
          </div>
        </div>

        {/* ── Locked state ── */}
        {data.locked && (
          <div style={{
            background:   CARD,
            border:       `1px solid ${BORDER}`,
            borderRadius: 12,
            padding:      '1.5rem',
            marginBottom: '1.5rem',
            textAlign:    'center',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
            <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>
              Week 4 unlocks after Week 3 is complete
            </div>
            <div style={{ fontSize: '0.82rem', color: MUTED }}>
              Complete all Week 3 gates to unlock the Finalist track.
            </div>
          </div>
        )}

        {/* ── Progress bar ── */}
        {!data.locked && (
          <div style={{
            background:   CARD,
            border:       `1px solid ${BORDER}`,
            borderRadius: 12,
            padding:      '1.25rem',
            marginBottom: '1.5rem',
          }}>
            <div style={{
              display:        'flex',
              justifyContent: 'space-between',
              fontSize:       '0.75rem',
              color:          MUTED,
              marginBottom:   '0.6rem',
            }}>
              <span>Week {week} progress</span>
              <span style={{ color: weekPct === 100 ? GREEN : WHITE }}>
                {loading ? '...' : `${weekDone} / ${weekTotal} gates`}
              </span>
            </div>
            <div style={{
              height:       6,
              background:   BORDER,
              borderRadius: 999,
              overflow:     'hidden',
            }}>
              <div style={{
                height:       '100%',
                width:        `${loading ? 0 : weekPct}%`,
                background:   weekPct === 100 ? GREEN : ACCENT,
                borderRadius: 999,
                transition:   'width 0.6s ease',
              }} />
            </div>
            {!loading && challenger && (
              <div style={{
                marginTop: '0.5rem',
                fontSize:  '0.72rem',
                color:     MUTED,
              }}>
                Overall: {challenger.progress_pct}% complete
              </div>
            )}
          </div>
        )}

        {/* ── Gate list ── */}
        <div style={{
          background:   CARD,
          border:       `1px solid ${BORDER}`,
          borderRadius: 12,
          padding:      '1.25rem',
          marginBottom: '1.5rem',
        }}>
          <div style={{
            fontSize:      '0.7rem',
            color:         MUTED,
            fontWeight:    700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            marginBottom:  '1rem',
          }}>
            Gates — Week {week}
          </div>

          {data.gates.map((gate, idx) => {
            const status = gateStatus(gate);
            return (
              <div key={gate.id} style={{
                display:       'flex',
                alignItems:    'center',
                gap:           '0.75rem',
                padding:       '0.65rem 0',
                borderBottom:  idx < data.gates.length - 1
                  ? `1px solid ${BORDER}` : 'none',
                opacity:       data.locked ? 0.4 : 1,
              }}>
                {/* status icon */}
                <div style={{
                  width:        20,
                  textAlign:    'center',
                  fontSize:     '0.85rem',
                  flexShrink:   0,
                }}>
                  {status === 'done'   ? '✅' :
                   status === 'next'   ? '▶️' : '⬜'}
                </div>

                {/* gate icon */}
                <div style={{ fontSize: '1rem', flexShrink: 0 }}>
                  {gate.icon}
                </div>

                {/* label + pct */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize:   '0.85rem',
                    fontWeight: status === 'next' ? 700 : 400,
                    color:      status === 'done' ? GREEN :
                                status === 'next' ? WHITE : MUTED,
                  }}>
                    {gate.label}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: MUTED }}>
                    {gate.id} · +{gate.pct}%
                  </div>
                </div>

                {/* next CTA */}
                {status === 'next' && !data.locked && (
                  <a href={officeUrl} style={{
                    fontSize:     '0.72rem',
                    fontWeight:   700,
                    color:        '#000',
                    background:   ACCENT,
                    padding:      '0.25rem 0.6rem',
                    borderRadius: 6,
                    textDecoration: 'none',
                    flexShrink:   0,
                  }}>
                    Do this →
                  </a>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Week nav ── */}
        <div style={{
          display: 'flex',
          gap:     '0.75rem',
          marginBottom: '1.5rem',
          flexWrap: 'wrap',
        }}>
          {[1,2,3,4].map(w => (
            <a key={w} href={`/internship/week/${w}`} style={{
              fontSize:     '0.75rem',
              fontWeight:   w === week ? 700 : 400,
              color:        w === week ? ACCENT : MUTED,
              border:       `1px solid ${w === week ? ACCENT + '40' : BORDER}`,
              borderRadius: 8,
              padding:      '0.3rem 0.75rem',
              textDecoration: 'none',
              background:   w === week ? ACCENT + '10' : 'transparent',
            }}>
              Week {w}
            </a>
          ))}
        </div>

        {/* ── CTAs ── */}
        {!data.locked && (
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href={officeUrl} style={{
              flex:           1,
              minWidth:       140,
              display:        'block',
              textAlign:      'center',
              background:     ACCENT,
              color:          '#000',
              fontWeight:     800,
              fontSize:       '0.85rem',
              padding:        '0.75rem 1rem',
              borderRadius:   10,
              textDecoration: 'none',
            }}>
              🏠 Go to My Office →
            </a>
            <a href="/internship/submit" style={{
              flex:           1,
              minWidth:       140,
              display:        'block',
              textAlign:      'center',
              background:     'transparent',
              color:          WHITE,
              fontWeight:     700,
              fontSize:       '0.85rem',
              padding:        '0.75rem 1rem',
              borderRadius:   10,
              textDecoration: 'none',
              border:         `1px solid ${BORDER}`,
            }}>
              📤 Submit Work →
            </a>
          </div>
        )}

        {/* ── Footer ── */}
        <div style={{
          marginTop:  '2rem',
          fontSize:   '0.7rem',
          color:      MUTED,
          textAlign:  'center',
          lineHeight: 1.8,
        }}>
          ANTCPU Internship Challenge · october-2026 cohort<br />
          <a href="/internship" style={{ color: MUTED }}>← Back to Internship</a>
        </div>

      </div>
    </main>
  );
}
