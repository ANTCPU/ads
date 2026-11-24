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

type Message = {
  id: string;
  author_name: string;
  author_type: string;
  content: string;
  created_at: string;
};

type DmThread = {
  id: string;
  preview: string;
  is_read: boolean;
  created_at: string;
  is_mine: boolean;
  other: { first_name: string; initials: string; color: string } | null;
};

const MOOD: Record<string, string> = {
  shining: '🌟', none: '😊', nudge: '😐', 'at-risk': '😟', stalled: '😴',
};

const FLAG_OPTIONS = ['none', 'nudge', 'at-risk', 'stalled', 'shining'] as const;

// ── MoodSummary ───────────────────────────────────────────────
function MoodSummary({ challengers, accent }: { challengers: Challenger[]; accent: string }) {
  const counts = challengers.reduce((acc, c) => {
    acc[c.flag] = (acc[c.flag] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {Object.entries(MOOD).map(([flag, emoji]) => (
        <span key={flag} style={{
          fontSize: '0.72rem', fontWeight: 700,
          background: 'rgba(255,255,255,0.05)',
          border: `1px solid rgba(255,255,255,0.1)`,
          borderRadius: 999, padding: '0.2rem 0.6rem',
          color: counts[flag] ? accent : '#555',
        }}>
          {emoji} {counts[flag] ?? 0}
        </span>
      ))}
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
  const [flagging, setFlagging]   = useState(false);
  const [flagOpen, setFlagOpen]   = useState(false);
  const [currentFlag, setCurrentFlag] = useState(c.flag);
  const [dmOpen, setDmOpen]       = useState(false);
  const [dmText, setDmText]       = useState('');
  const [dmSending, setDmSending] = useState(false);
  const [dmSent, setDmSent]       = useState(false);

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

  async function sendDm() {
    if (!dmText.trim() || dmSending) return;
    setDmSending(true);
    await fetch('/api/internship/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_intern_id: mentorInternId,
        recipient_intern_id: c.intern_id,
        content: dmText.trim(),
        cohort,
      }),
    }).catch(() => null);
    setDmText('');
    setDmSent(true);
    setDmSending(false);
    setTimeout(() => { setDmOpen(false); setDmSent(false); }, 1500);
  }

  return (
    <div style={{
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${border}`,
      borderRadius: 10, padding: '0.6rem 0.75rem',
      marginBottom: '0.4rem',
    }}>
      {/* Main row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        {/* Name + handle */}
        <a href={`/office/${c.handle}`} style={{ textDecoration: 'none', flex: 1, minWidth: 120 }}>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#e6edf3' }}>
            {c.track === 'marketing' ? '📣' : '💻'} {c.name}
          </div>
          <div style={{ fontSize: '0.65rem', color: '#666' }}>@{c.handle} · {c.country}</div>
        </a>

        {/* Progress bar */}
        <div style={{ flex: 2, minWidth: 80 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: '0.6rem', color: '#555' }}>{c.progress_pct}%</span>
            <span style={{ fontSize: '0.6rem', color: '#555' }}>{c.hrs_since}h ago</span>
          </div>
          <div style={{ height: 4, borderRadius: 999, background: '#1e293b', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${c.progress_pct}%`, background: progressColor, borderRadius: 999, transition: 'width 0.6s ease' }} />
          </div>
        </div>

        {/* Mood */}
        <span style={{ fontSize: '1rem', flexShrink: 0 }}>{MOOD[currentFlag] ?? '😊'}</span>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0, position: 'relative' }}>
          {/* DM button */}
          <button onClick={() => setDmOpen(o => !o)} style={{
            fontSize: '0.68rem', fontWeight: 700, padding: '0.25rem 0.5rem',
            background: `${accent}18`, border: `1px solid ${accent}44`,
            borderRadius: 6, color: accent, cursor: 'pointer',
          }}>
            💬 DM
          </button>

          {/* Flag button */}
          <button onClick={() => setFlagOpen(o => !o)} disabled={flagging} style={{
            fontSize: '0.68rem', fontWeight: 700, padding: '0.25rem 0.5rem',
            background: 'rgba(255,255,255,0.05)', border: `1px solid ${border}`,
            borderRadius: 6, color: '#888', cursor: 'pointer',
          }}>
            {flagging ? '...' : '🚩'}
          </button>

          {/* Flag dropdown */}
          {flagOpen && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, zIndex: 20,
              background: '#0d1117', border: `1px solid ${border}`,
              borderRadius: 8, overflow: 'hidden', marginTop: 4, minWidth: 120,
            }}>
              {FLAG_OPTIONS.map(f => (
                <button key={f} onClick={() => updateFlag(f)} style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '0.4rem 0.75rem', background: 'transparent',
                  border: 'none', color: currentFlag === f ? accent : '#aaa',
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

      {/* DM input */}
      {dmOpen && (
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem' }}>
          {dmSent ? (
            <span style={{ fontSize: '0.75rem', color: '#22c55e', padding: '0.3rem 0' }}>✅ Message sent</span>
          ) : (
            <>
              <input
                value={dmText}
                onChange={e => setDmText(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendDm()}
                placeholder={`Message ${c.name}...`}
                style={{
                  flex: 1, fontSize: '0.78rem', background: 'rgba(255,255,255,0.05)',
                  border: `1px solid ${border}`, borderRadius: 6,
                  padding: '0.3rem 0.6rem', color: '#e6edf3', outline: 'none',
                }}
              />
              <button onClick={sendDm} disabled={dmSending || !dmText.trim()} style={{
                fontSize: '0.72rem', fontWeight: 700, padding: '0.3rem 0.6rem',
                background: accent, color: '#000', border: 'none',
                borderRadius: 6, cursor: 'pointer', opacity: dmSending ? 0.5 : 1,
              }}>
                {dmSending ? '...' : 'Send'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── RoomFeed ──────────────────────────────────────────────────
function RoomFeed({
  room, cohort, handle, accent, border, subtext,
}: {
  room: string; cohort: string; handle: string;
  accent: string; border: string; subtext: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState('');
  const [sending, setSending]   = useState(false);
  const [loading, setLoading]   = useState(false);

  const fetchMessages = useCallback(() => {
    setLoading(true);
    fetch(`/api/internship/office?cohort=${cohort}&room=${room}`)
      .then(r => r.json())
      .then(d => setMessages(d.messages ?? []))
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [cohort, room]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  async function post() {
    if (!input.trim() || sending) return;
    setSending(true);
    await fetch('/api/internship/office', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cohort, room, author_id: handle, content: input.trim() }),
    }).catch(() => null);
    setInput('');
    fetchMessages();
    setSending(false);
  }

  const ROOM_LABELS: Record<string, string> = {
    general: '💬 General', dev: '💻 Dev', marketing: '📣 Marketing',
    mentors: '🎓 Mentors', standups: '📋 Standups',
  };

  return (
    <div style={{ border: `1px solid ${border}`, borderRadius: 10, overflow: 'hidden', marginBottom: '1rem' }}>
      <div style={{ padding: '0.5rem 0.75rem', borderBottom: `1px solid ${border}`, background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: accent }}>{ROOM_LABELS[room] ?? room}</span>
        <button onClick={fetchMessages} style={{ fontSize: '0.65rem', color: '#555', background: 'none', border: 'none', cursor: 'pointer' }}>↻ Refresh</button>
      </div>
      <div style={{ padding: '0.5rem 0.75rem', maxHeight: 200, overflowY: 'auto', background: 'rgba(0,0,0,0.15)' }}>
        {loading ? (
          <p style={{ fontSize: '0.72rem', color: '#555', textAlign: 'center', padding: '0.5rem 0' }}>Loading...</p>
        ) : messages.length === 0 ? (
          <p style={{ fontSize: '0.72rem', color: '#555', textAlign: 'center', padding: '0.5rem 0' }}>No messages yet.</p>
        ) : (
          messages.slice(0, 8).map(m => (
            <div key={m.id} style={{ marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: m.author_type === 'mentor' ? '#ffd700' : m.author_type === 'system' ? subtext : accent }}>
                  {m.author_type === 'mentor' ? '🎓 ' : m.author_type === 'system' ? '⚡ ' : ''}{m.author_name}
                </span>
                <span style={{ fontSize: '0.62rem', color: '#555' }}>{relativeTime(m.created_at)}</span>
              </div>
              <p style={{ fontSize: '0.78rem', color: '#ccc', margin: '0.1rem 0 0', lineHeight: 1.4 }}>{m.content}</p>
            </div>
          ))
        )}
      </div>
      <div style={{ padding: '0.4rem 0.75rem', borderTop: `1px solid ${border}`, display: 'flex', gap: '0.4rem' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && post()}
          placeholder={`Post to #${room} as mentor...`}
          style={{
            flex: 1, fontSize: '0.78rem', background: 'transparent',
            border: 'none', color: '#ccc', outline: 'none',
          }}
        />
        <button onClick={post} disabled={sending || !input.trim()} style={{
          fontSize: '0.68rem', fontWeight: 700, padding: '0.25rem 0.6rem',
          background: accent, color: '#000', border: 'none',
          borderRadius: 6, cursor: 'pointer', opacity: sending ? 0.5 : 1,
        }}>
          {sending ? '...' : 'Post'}
        </button>
      </div>
    </div>
  );
}

// ── DM Inbox ──────────────────────────────────────────────────
function DmInbox({ internId, accent, border }: { internId: string; accent: string; border: string }) {
  const [threads, setThreads] = useState<DmThread[]>([]);
  const [loaded, setLoaded]   = useState(false);

  useEffect(() => {
    fetch(`/api/internship/messages?intern_id=${internId}`)
      .then(r => r.json())
      .then(d => { setThreads(d.threads ?? []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [internId]);

  if (!loaded) return null;
  if (threads.length === 0) return (
    <div style={{ fontSize: '0.72rem', color: '#555', padding: '0.5rem 0' }}>No DMs yet.</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {threads.slice(0, 5).map(t => (
        <div key={t.id} style={{
          background: t.is_read ? 'transparent' : `${accent}0d`,
          border: `1px solid ${t.is_read ? border : accent + '44'}`,
          borderRadius: 8, padding: '0.5rem 0.75rem',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: t.is_read ? '#888' : accent }}>
              {t.is_mine ? '→ ' : '← '}{t.other?.first_name ?? 'Unknown'}
            </span>
            <span style={{ fontSize: '0.62rem', color: '#555' }}>{relativeTime(t.created_at)}</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: '#aaa', margin: 0 }}>{t.preview}…</p>
        </div>
      ))}
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
  const [challengers, setChallengers] = useState<Challenger[]>([]);
  const [loaded, setLoaded]           = useState(false);
  const [filter, setFilter]           = useState<'all' | 'nudge' | 'at-risk' | 'stalled'>('all');
  const [dmTab, setDmTab]             = useState(false);

  const cohort = data.cohort ?? 'november-2026';
  const track  = data.track;

  const fetchChallengers = useCallback(() => {
    const url = isFounder
      ? `/api/internship/challengers?view=public&cohort=${cohort}`
      : `/api/internship/challengers?view=public&cohort=${cohort}`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        let list: Challenger[] = d.challengers ?? [];
        // Filter by track unless founder
        if (!isFounder) list = list.filter(c => c.track === track);
        setChallengers(list);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [cohort, track, isFounder]);

  useEffect(() => { fetchChallengers(); }, [fetchChallengers]);

  const filtered = filter === 'all'
    ? challengers
    : challengers.filter(c => c.flag === filter);

  const rooms = isFounder
    ? ['general', 'dev', 'marketing', 'mentors']
    : track === 'marketing'
      ? ['marketing', 'general', 'mentors']
      : ['dev', 'general', 'mentors'];

  return (
    <div style={{ marginTop: '1.5rem' }}>

      {/* ── Graduate badge ── */}
      <div style={{
        borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem',
        background: `${accent}0d`, border: `1px solid ${accent}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem',
      }}>
        <div>
          <div style={{ fontSize: '0.72rem', fontWeight: 800, color: accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>
            🎓 Challenge Graduate · 100% Complete
          </div>
          <div style={{ fontSize: '0.82rem', color: subtext }}>
            {isFounder ? 'Founder · Full platform access' : `${track === 'marketing' ? '📣 Marketing' : '💻 Dev'} Lead · Mentoring ${cohort}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, background: accent, color: '#000', borderRadius: 999, padding: '0.2rem 0.6rem' }}>
            ✅ d25-final
          </span>
          <span style={{ fontSize: '0.68rem', fontWeight: 700, background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e44', borderRadius: 999, padding: '0.2rem 0.6rem' }}>
            🏆 Graduate
          </span>
        </div>
      </div>

      {/* ── Challenger feed header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: accent }}>
            {isFounder ? '⚡ All Challengers' : track === 'marketing' ? '📣 Marketing Challengers' : '💻 Dev Challengers'} — {cohort}
          </div>
          {loaded && <MoodSummary challengers={challengers} accent={accent} />}
        </div>
        <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
          {(['all', 'nudge', 'at-risk', 'stalled'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.5rem',
              background: filter === f ? accent : 'transparent',
              border: `1px solid ${filter === f ? accent : border}`,
              borderRadius: 6, color: filter === f ? '#000' : '#888',
              cursor: 'pointer',
            }}>
              {f === 'all' ? `All (${challengers.length})` : `${MOOD[f]} ${f}`}
            </button>
          ))}
          <button onClick={fetchChallengers} style={{
            fontSize: '0.65rem', padding: '0.2rem 0.5rem',
            background: 'transparent', border: `1px solid ${border}`,
            borderRadius: 6, color: '#555', cursor: 'pointer',
          }}>↻</button>
        </div>
      </div>

      {/* ── Challenger list ── */}
      <div style={{ marginBottom: '1.5rem' }}>
        {!loaded && <p style={{ fontSize: '0.75rem', color: '#555' }}>Loading challengers...</p>}
        {loaded && filtered.length === 0 && <p style={{ fontSize: '0.75rem', color: '#555' }}>No challengers match this filter.</p>}
        {filtered.map(c => (
          <ChallengerRow
            key={c.handle}
            c={c}
            accent={accent}
            border={border}
            mentorInternId={data.intern_id}
            cohort={cohort}
          />
        ))}
      </div>

      {/* ── DM inbox toggle ── */}
      <div style={{ marginBottom: '1rem' }}>
        <button onClick={() => setDmTab(o => !o)} style={{
          fontSize: '0.75rem', fontWeight: 700, padding: '0.4rem 0.75rem',
          background: dmTab ? accent : 'transparent',
          border: `1px solid ${dmTab ? accent : border}`,
          borderRadius: 8, color: dmTab ? '#000' : accent,
          cursor: 'pointer', marginBottom: dmTab ? '0.75rem' : 0,
        }}>
          💬 DM Inbox
        </button>
        {dmTab && <DmInbox internId={data.intern_id} accent={accent} border={border} />}
      </div>

      {/* ── Room feeds ── */}
      <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
        Room Feeds
      </div>
      {rooms.map(room => (
        <RoomFeed
          key={room}
          room={room}
          cohort={cohort}
          handle={data.handle}
          accent={accent}
          border={border}
          subtext={subtext}
        />
      ))}

    </div>
  );
}
