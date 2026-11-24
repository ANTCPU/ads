'use client';

import { useState, useEffect, useCallback } from 'react';
import { relativeTime } from '../../../lib/officeConstants';
import type { OfficeData } from '../../../types/office';

// ── Types ─────────────────────────────────────────────────────
type Challenger = {
  handle: string;
  name: string;
  track: string;
  progress_pct: number;
  country: string;
  email: string | null;
  intern_id: string;
  flag: string;
  hrs_since: number;
  cohort: string;
};

type DmMessage = {
  id: string;
  content: string;
  sender_intern_id: string;
  is_mine: boolean;
  created_at: string;
  author: { first_name: string } | null;
};

const MOOD: Record<string, string> = {
  shining: '🌟', none: '😊', nudge: '😐', 'at-risk': '😟', stalled: '😴',
};

const FLAG_OPTIONS = ['none', 'nudge', 'at-risk', 'stalled', 'shining'] as const;

const KNOWN_COHORTS = ['november-2026', 'december-2026'];

// ── MoodBar ───────────────────────────────────────────────────
function MoodBar({ challengers, accent }: { challengers: Challenger[]; accent: string }) {
  const counts = challengers.reduce((acc, c) => {
    acc[c.flag] = (acc[c.flag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
      {Object.entries(MOOD).map(([flag, emoji]) => (
        <span key={flag} style={{
          fontSize: '0.7rem', fontWeight: 700,
          background: counts[flag] ? 'rgba(255,255,255,0.06)' : 'transparent',
          border: `1px solid ${counts[flag] ? 'rgba(255,255,255,0.12)' : 'transparent'}`,
          borderRadius: 999, padding: '0.15rem 0.5rem',
          color: counts[flag] ? accent : '#444',
        }}>
          {emoji} {counts[flag] ?? 0}
        </span>
      ))}
    </div>
  );
}

// ── InlineDmThread ────────────────────────────────────────────
function InlineDmThread({
  challenger, mentorInternId, cohort, accent, border,
}: {
  challenger: Challenger;
  mentorInternId: string;
  cohort: string;
  accent: string;
  border: string;
}) {
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loaded, setLoaded]     = useState(false);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const [sent, setSent]         = useState(false);

  useEffect(() => {
    // Fetch thread between mentor and this challenger
    fetch(`/api/internship/messages?intern_id=${mentorInternId}`)
      .then(r => r.json())
      .then(d => {
        // Find threads involving this challenger
        const threads = (d.threads ?? []).filter((t: any) =>
          t.other?.intern_id === challenger.intern_id ||
          t.sender_intern_id === challenger.intern_id ||
          t.recipient_intern_id === challenger.intern_id
        );
        // Flatten previews into message-like objects
        setMessages(threads.map((t: any) => ({
          id:               t.id,
          content:          t.preview,
          sender_intern_id: t.is_mine ? mentorInternId : challenger.intern_id,
          is_mine:          t.is_mine,
          created_at:       t.created_at,
          author:           t.is_mine ? null : { first_name: challenger.name },
        })));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [mentorInternId, challenger.intern_id, challenger.name]);

  async function send() {
    if (!input.trim() || sending) return;
    setSending(true);
    await fetch('/api/internship/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_intern_id:    mentorInternId,
        recipient_intern_id: challenger.intern_id,
        content:             input.trim(),
        cohort,
      }),
    }).catch(() => null);
    // Optimistic add
    setMessages(m => [...m, {
      id:               Date.now().toString(),
      content:          input.trim(),
      sender_intern_id: mentorInternId,
      is_mine:          true,
      created_at:       new Date().toISOString(),
      author:           null,
    }]);
    setInput('');
    setSent(true);
    setSending(false);
    setTimeout(() => setSent(false), 2000);
  }

  return (
    <div style={{
      marginTop: '0.5rem',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: 8, overflow: 'hidden',
    }}>
      {/* Thread messages */}
      <div style={{ maxHeight: 160, overflowY: 'auto', padding: '0.5rem 0.75rem' }}>
        {!loaded && <p style={{ fontSize: '0.7rem', color: '#555' }}>Loading...</p>}
        {loaded && messages.length === 0 && (
          <p style={{ fontSize: '0.7rem', color: '#888', margin: 0 }}>
            No messages yet — start the conversation.
          </p>
        )}
        {messages.map(m => (
          <div key={m.id} style={{
            marginBottom: '0.4rem',
            textAlign: m.is_mine ? 'right' : 'left',
          }}>
            <span style={{
              display: 'inline-block',
              fontSize: '0.72rem', lineHeight: 1.4,
              background: m.is_mine ? `${accent}22` : '#f1f5f9',
              border: `1px solid ${m.is_mine ? accent + '44' : '#e2e8f0'}`,
              color: m.is_mine ? accent : '#374151',
              borderRadius: 8, padding: '0.25rem 0.6rem',
              maxWidth: '85%',
            }}>
              {m.content}
            </span>
            <div style={{ fontSize: '0.6rem', color: '#444', marginTop: 2 }}>
              {m.is_mine ? 'You' : challenger.name} · {relativeTime(m.created_at)}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div style={{
        borderTop: '1px solid #e2e8f0',
        display: 'flex', gap: '0.4rem',
        padding: '0.35rem 0.5rem',
        background: '#f8fafc',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={`Message ${challenger.name}...`}
          style={{
            flex: 1, fontSize: '0.75rem',
            background: 'transparent', border: 'none',
            color: '#111', outline: 'none',
          }}
        />
        {sent && <span style={{ fontSize: '0.7rem', color: '#22c55e', alignSelf: 'center' }}>✓</span>}
        <button onClick={send} disabled={sending || !input.trim()} style={{
          fontSize: '0.68rem', fontWeight: 700,
          padding: '0.25rem 0.6rem',
          background: accent, color: '#000',
          border: 'none', borderRadius: 6,
          cursor: 'pointer', opacity: sending ? 0.5 : 1,
          flexShrink: 0,
        }}>
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

// ── ChallengerRow ─────────────────────────────────────────────
function ChallengerRow({
  c, accent, border, mentorInternId, cohort,
}: {
  c: Challenger; accent: string; border: string;
  mentorInternId: string; cohort: string;
}) {
  const [dmOpen, setDmOpen]       = useState(false);
  const [flagOpen, setFlagOpen]   = useState(false);
  const [flagging, setFlagging]   = useState(false);
  const [currentFlag, setCurrentFlag] = useState(c.flag);

  const progressColor = c.progress_pct >= 75 ? '#22c55e'
    : c.progress_pct >= 40 ? accent : '#f97316';

  async function updateFlag(flag: string) {
    setFlagging(true);
    setFlagOpen(false);
    await fetch('/api/internship/flags', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ intern_id: c.intern_id, flag }),
    }).catch(() => null);
    setCurrentFlag(flag);
    setFlagging(false);
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.9)',
      border: `1px solid rgba(0,0,0,0.08)`,
      borderRadius: 10,
      padding: '0.6rem 0.75rem',
      marginBottom: '0.4rem',
    }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>

        {/* Name */}
        <a href={`/office/${c.handle}`} style={{ textDecoration: 'none', flex: 1, minWidth: 100 }}>
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111' }}>
            {c.track === 'marketing' ? '📣' : '💻'} {c.name}
          </div>
          <div style={{ fontSize: '0.62rem', color: '#888' }}>
            @{c.handle} · {c.country}
          </div>
        </a>

        {/* Progress */}
        <div style={{ flex: 2, minWidth: 80 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: '0.6rem', color: '#888' }}>{c.progress_pct}%</span>
            <span style={{ fontSize: '0.6rem', color: '#888' }}>{c.hrs_since}h</span>
          </div>
          <div style={{ height: 4, borderRadius: 999, background: '#1e293b', overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${c.progress_pct}%`,
              background: progressColor, borderRadius: 999,
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>

        {/* Mood */}
        <span style={{ fontSize: '0.95rem', flexShrink: 0 }}>
          {MOOD[currentFlag] ?? '😊'}
        </span>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0, position: 'relative' }}>
          <button
            onClick={() => { setDmOpen(o => !o); setFlagOpen(false); }}
            style={{
              fontSize: '0.68rem', fontWeight: 700,
              padding: '0.22rem 0.5rem',
              background: dmOpen ? accent : `${accent}18`,
              border: `1px solid ${accent}44`,
              borderRadius: 6, color: dmOpen ? '#000' : accent,
              cursor: 'pointer',
            }}>
            💬
          </button>
          <button
            onClick={() => { setFlagOpen(o => !o); setDmOpen(false); }}
            disabled={flagging}
            style={{
              fontSize: '0.68rem', fontWeight: 700,
              padding: '0.22rem 0.5rem',
              background: flagOpen ? 'rgba(255,255,255,0.1)' : 'transparent',
              border: `1px solid ${border}`,
              borderRadius: 6, color: '#888',
              cursor: 'pointer',
            }}>
            {flagging ? '…' : '🚩'}
          </button>

          {/* Flag dropdown */}
          {flagOpen && (
            <div style={{
              position: 'absolute', top: '110%', right: 0, zIndex: 30,
              background: '#0d1117', border: `1px solid ${border}`,
              borderRadius: 8, overflow: 'hidden', minWidth: 130,
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
            }}>
              {FLAG_OPTIONS.map(f => (
                <button key={f} onClick={() => updateFlag(f)} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '0.4rem 0.75rem',
                  background: currentFlag === f ? `${accent}18` : 'transparent',
                  border: 'none',
                  color: currentFlag === f ? accent : '#aaa',
                  fontSize: '0.75rem', fontWeight: currentFlag === f ? 700 : 400,
                  cursor: 'pointer',
                }}>
                  {MOOD[f]} {f}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inline DM thread */}
      {dmOpen && (
        <InlineDmThread
          challenger={c}
          mentorInternId={mentorInternId}
          cohort={cohort}
          accent={accent}
          border={border}
        />
      )}
    </div>
  );
}

// ── Main MentorDashboard ──────────────────────────────────────
export default function MentorDashboard({
  data, accent, border, subtext, isFounder,
}: {
  data: OfficeData;
  accent: string;
  border: string;
  subtext: string;
  isFounder: boolean;
}) {
  const [activeCohort, setActiveCohort] = useState(data.cohort ?? 'november-2026');
  const [challengers, setChallengers]   = useState<Challenger[]>([]);
  const [loaded, setLoaded]             = useState(false);
  const [flagFilter, setFlagFilter]     = useState<string>('all');
  const [trackFilter, setTrackFilter]   = useState<string>(isFounder ? 'all' : data.track ?? 'all');

  // Build cohort list — known + current + next if available
  const cohortList = [...new Set([
    ...KNOWN_COHORTS,
    data.cohort,
    data.clock?.next_cohort?.cohort,
  ].filter(Boolean))] as string[];

  const fetchChallengers = useCallback(() => {
    setLoaded(false);
    fetch(`/api/internship/challengers?view=public&cohort=${activeCohort}`)
      .then(r => r.json())
      .then(d => {
        let list: Challenger[] = d.challengers ?? [];
        // Non-founders only see their track by default
        if (!isFounder && trackFilter !== 'all') {
          list = list.filter(c => c.track === trackFilter);
        }
        setChallengers(list);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [activeCohort, isFounder, trackFilter]);

  useEffect(() => { fetchChallengers(); }, [fetchChallengers]);

  // Apply filters
  const filtered = challengers.filter(c => {
    if (flagFilter !== 'all' && c.flag !== flagFilter) return false;
    if (isFounder && trackFilter !== 'all' && c.track !== trackFilter) return false;
    return true;
  });

  return (
    <div style={{ marginTop: '1.5rem' }}>

      {/* ── Graduate badge ── */}
      <div style={{
        borderRadius: 12, padding: '0.875rem 1.25rem', marginBottom: '1.25rem',
        background: 'rgba(255,255,255,0.92)', border: `1px solid ${accent}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem',
      }}>
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 3 }}>
            🎓 Challenge Graduate · 100% Complete
          </div>
          <div style={{ fontSize: '0.78rem', color: subtext }}>
            {isFounder
              ? 'Founder · Full platform access · All cohorts'
              : `${data.track === 'marketing' ? '📣 Marketing' : '💻 Dev'} Lead · Mentoring ${activeCohort}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, background: accent, color: '#000', borderRadius: 999, padding: '0.2rem 0.55rem' }}>
            ✅ d25-final
          </span>
          <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#22c55e18', color: '#22c55e', border: '1px solid #22c55e33', borderRadius: 999, padding: '0.2rem 0.55rem' }}>
            🏆 Graduate
          </span>
        </div>
      </div>

      {/* ── Cohort selector ── */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
          Cohort
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
          {cohortList.map(c => (
            <button key={c} onClick={() => { setActiveCohort(c); setFlagFilter('all'); }} style={{
              fontSize: '0.72rem', fontWeight: 700,
              padding: '0.3rem 0.75rem',
              background: activeCohort === c ? accent : 'transparent',
              border: `1px solid ${activeCohort === c ? accent : border}`,
              borderRadius: 999, color: activeCohort === c ? '#000' : '#888',
              cursor: 'pointer',
            }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* ── Filters row ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Flag filter */}
          {(['all', 'nudge', 'at-risk', 'stalled', 'shining'] as const).map(f => (
            <button key={f} onClick={() => setFlagFilter(f)} style={{
              fontSize: '0.62rem', fontWeight: 700,
              padding: '0.18rem 0.45rem',
              background: flagFilter === f ? accent : 'transparent',
              border: `1px solid ${flagFilter === f ? accent : border}`,
              borderRadius: 6, color: flagFilter === f ? '#000' : '#666',
              cursor: 'pointer',
            }}>
              {f === 'all' ? `All (${challengers.length})` : `${MOOD[f]} ${f}`}
            </button>
          ))}

          {/* Track filter — founder only */}
          {isFounder && (
            <>
              <span style={{ color: '#333', fontSize: '0.65rem' }}>|</span>
              {(['all', 'dev', 'marketing'] as const).map(t => (
                <button key={t} onClick={() => setTrackFilter(t)} style={{
                  fontSize: '0.62rem', fontWeight: 700,
                  padding: '0.18rem 0.45rem',
                  background: trackFilter === t ? accent : 'transparent',
                  border: `1px solid ${trackFilter === t ? accent : border}`,
                  borderRadius: 6, color: trackFilter === t ? '#000' : '#666',
                  cursor: 'pointer',
                }}>
                  {t === 'all' ? '⚡ All' : t === 'dev' ? '💻 Dev' : '📣 Mkt'}
                </button>
              ))}
            </>
          )}
        </div>

        <button onClick={fetchChallengers} style={{
          fontSize: '0.65rem', padding: '0.2rem 0.5rem',
          background: 'transparent', border: `1px solid ${border}`,
          borderRadius: 6, color: '#555', cursor: 'pointer',
        }}>↻</button>
      </div>

      {/* ── Mood summary ── */}
      {loaded && challengers.length > 0 && (
        <MoodBar challengers={challengers} accent={accent} />
      )}

      {/* ── Challenger list ── */}
      <div style={{ marginTop: '0.75rem' }}>
        {!loaded && (
          <p style={{ fontSize: '0.75rem', color: '#555', padding: '0.5rem 0' }}>Loading challengers...</p>
        )}
        {loaded && filtered.length === 0 && (
          <p style={{ fontSize: '0.75rem', color: '#555', padding: '0.5rem 0' }}>
            {challengers.length === 0 ? `No challengers in ${activeCohort} yet.` : 'No challengers match this filter.'}
          </p>
        )}
        {filtered.map(c => (
          <ChallengerRow
            key={`${c.handle}-${activeCohort}`}
            c={c}
            accent={accent}
            border={border}
            mentorInternId={data.intern_id}
            cohort={activeCohort}
          />
        ))}
      </div>

    </div>
  );
}
