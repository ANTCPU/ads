'use client';

import { useState, useEffect } from 'react';

// ── Types ─────────────────────────────────────────────────────
type Person = {
  intern_id: string;
  handle: string;
  name: string;
  track: 'dev' | 'marketing';
  cohort: string;
  cohortLabel: string;
  isDefault: boolean;
};

type DmMessage = {
  id: string;
  content: string;
  sender_intern_id: string;
  is_mine: boolean;
  created_at: string;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const KNOWN_COHORTS = ['october-2026', 'november-2026', 'december-2026'];

function cohortDisplayLabel(slug: string, currentCohort: string): string {
  if (slug === currentCohort) return 'Current';
  return slug.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ── Inline DM Thread ──────────────────────────────────────────
function InlineDmThread({
  person,
  myInternId,
  myCohort,
  accent,
  border,
}: {
  person: Person;
  myInternId: string;
  myCohort: string;
  accent: string;
  border: string;
}) {
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [loaded,   setLoaded]   = useState(false);
  const [input,    setInput]    = useState('');
  const [sending,  setSending]  = useState(false);
  const [sent,     setSent]     = useState(false);
  const [err,      setErr]      = useState('');

  useEffect(() => {
    if (!myInternId) return;
    fetch(`/api/internship/messages?intern_id=${myInternId}`)
      .then(r => r.json())
      .then(d => {
        const threads = (d.threads ?? []).filter((t: any) =>
          t.other?.intern_id === person.intern_id
        );
        setMessages(threads.map((t: any) => ({
          id:               t.id,
          content:          t.preview,
          sender_intern_id: t.is_mine ? myInternId : person.intern_id,
          is_mine:          t.is_mine,
          created_at:       t.created_at,
        })));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, [myInternId, person.intern_id]);

  async function send() {
    if (!input.trim() || sending || !myInternId) return;
    setSending(true);
    setErr('');
    const res = await fetch('/api/internship/messages', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender_intern_id:    myInternId,
        recipient_intern_id: person.intern_id,
        content:             input.trim(),
        cohort:              myCohort,
      }),
    }).catch(() => null);
    if (res && !res.ok) {
      const d = await res.json().catch(() => ({}));
      setErr(d.error ?? 'Failed to send');
    } else {
      setMessages(m => [...m, {
        id:               Date.now().toString(),
        content:          input.trim(),
        sender_intern_id: myInternId,
        is_mine:          true,
        created_at:       new Date().toISOString(),
      }]);
      setInput('');
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    }
    setSending(false);
  }

  return (
    <div style={{
      marginTop: '0.5rem',
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${border}`,
      borderRadius: 8,
      overflow: 'hidden',
    }}>
      {/* Messages */}
      <div style={{ maxHeight: 160, overflowY: 'auto', padding: '0.5rem 0.75rem' }}>
        {!loaded && (
          <p style={{ fontSize: '0.7rem', color: '#555' }}>Loading...</p>
        )}
        {loaded && messages.length === 0 && (
          <p style={{ fontSize: '0.7rem', color: '#666', margin: 0 }}>
            No messages yet — start the conversation.
          </p>
        )}
        {messages.map(m => (
          <div key={m.id} style={{ marginBottom: '0.4rem', textAlign: m.is_mine ? 'right' : 'left' }}>
            <span style={{
              display: 'inline-block',
              fontSize: '0.72rem', lineHeight: 1.4,
              background: m.is_mine ? `${accent}22` : 'rgba(255,255,255,0.06)',
              border: `1px solid ${m.is_mine ? accent + '44' : border}`,
              color: m.is_mine ? accent : '#ccc',
              borderRadius: 8, padding: '0.25rem 0.6rem',
              maxWidth: '85%',
            }}>
              {m.content}
            </span>
            <div style={{ fontSize: '0.6rem', color: '#555', marginTop: 2 }}>
              {m.is_mine ? 'You' : person.name} · {relativeTime(m.created_at)}
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      {err && <p style={{ fontSize: '0.65rem', color: '#f87171', padding: '0 0.75rem' }}>{err}</p>}
      <div style={{
        borderTop: `1px solid ${border}`,
        display: 'flex', gap: '0.4rem',
        padding: '0.35rem 0.5rem',
      }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={`Message ${person.name}...`}
          style={{
            flex: 1, fontSize: '0.75rem',
            background: 'transparent', border: 'none',
            color: '#ccc', outline: 'none',
          }}
        />
        {sent && <span style={{ fontSize: '0.7rem', color: '#22c55e', alignSelf: 'center' }}>✓</span>}
        <button
          onClick={send}
          disabled={sending || !input.trim()}
          style={{
            fontSize: '0.68rem', fontWeight: 700,
            padding: '0.25rem 0.6rem',
            background: accent, color: '#000',
            border: 'none', borderRadius: 6,
            cursor: 'pointer', opacity: sending ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          {sending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}

// ── Person Row ────────────────────────────────────────────────
function PersonRow({
  person, myInternId, myCohort, accent, border, subtext, openId, onToggle,
}: {
  person: Person;
  myInternId: string;
  myCohort: string;
  accent: string;
  border: string;
  subtext: string;
  openId: string | null;
  onToggle: (id: string) => void;
}) {
  const isOpen = openId === person.intern_id;
  const trackEmoji = person.track === 'marketing' ? '📣' : '💻';

  return (
    <div style={{
      borderRadius: 8,
      border: `1px solid ${isOpen ? accent + '55' : border}`,
      padding: '0.55rem 0.75rem',
      marginBottom: '0.4rem',
      background: isOpen ? `${accent}08` : 'rgba(255,255,255,0.02)',
      transition: 'border-color 0.15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {/* Name + meta */}
        <a
          href={`/office/${person.handle}`}
          style={{ textDecoration: 'none', flex: 1, minWidth: 0 }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#e2e8f0' }}>
            {trackEmoji} {person.name}
          </div>
          <div style={{ fontSize: '0.62rem', color: subtext }}>
            @{person.handle}
            {person.cohortLabel && <span> · {person.cohortLabel}</span>}
          </div>
        </a>

        {/* DM button */}
        <button
          onClick={() => onToggle(person.intern_id)}
          style={{
            fontSize: '0.68rem', fontWeight: 700,
            padding: '0.22rem 0.55rem',
            background: isOpen ? accent : `${accent}18`,
            border: `1px solid ${accent}44`,
            borderRadius: 6,
            color: isOpen ? '#000' : accent,
            cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          💬
        </button>
      </div>

      {/* Inline thread */}
      {isOpen && (
        <InlineDmThread
          person={person}
          myInternId={myInternId}
          myCohort={myCohort}
          accent={accent}
          border={border}
        />
      )}
    </div>
  );
}

// ── Main PeoplePanel ──────────────────────────────────────────
export default function PeoplePanel({
  myInternId,
  myHandle,
  myCohort,
  myTrack,
  isTeam,
  isFounder = false,
  accent,
  border,
  subtext,
}: {
  myInternId: string;
  myHandle: string;
  myCohort: string;
  myTrack: 'dev' | 'marketing';
  isTeam: boolean;
  isFounder?: boolean;
  accent: string;
  border: string;
  subtext: string;
}) {
  const [people,      setPeople]      = useState<Person[]>([]);
  const [loaded,      setLoaded]      = useState(false);
  const [openId,      setOpenId]      = useState<string | null>(null);
  const [addHandle,   setAddHandle]   = useState('');
  const [addLoading,  setAddLoading]  = useState(false);
  const [addError,    setAddError]    = useState('');

  // ── Seed people on mount ──────────────────────────────────
  useEffect(() => {
    async function seed() {
      const list: Person[] = [];

      if (!isTeam) {
        // Challenger: seed Arena4 + Mohamed39 as default contacts
        const [a4, m39] = await Promise.all([
          fetch('/api/internship/me?handle=Arena4').then(r => r.json()).catch(() => null),
          fetch('/api/internship/me?handle=Mohamed39').then(r => r.json()).catch(() => null),
        ]);

        if (a4?.challenger) {
          const c = a4.challenger;
          list.push({
            intern_id:   c.intern_id,
            handle:      c.handle ?? 'Arena4',
            name:        c.first_name ?? 'Arena4',
            track:       'dev',
            cohort:      c.cohort ?? myCohort,
            cohortLabel: '💻 Dev Lead',
            isDefault:   true,
          });
        }
        if (m39?.challenger) {
          const c = m39.challenger;
          list.push({
            intern_id:   c.intern_id,
            handle:      c.handle ?? 'Mohamed39',
            name:        c.first_name ?? 'Mohamed39',
            track:       'marketing',
            cohort:      c.cohort ?? myCohort,
            cohortLabel: '📣 Marketing Lead',
            isDefault:   true,
          });
        }

        // Cohort peers — same track, use view=office for full roster
        const peers = await fetch(
          `/api/internship/challengers?view=office&cohort=${myCohort}`
        ).then(r => r.json()).catch(() => ({ challengers: [] }));

        (peers.challengers ?? [])
          .filter((c: any) => c.track === myTrack && c.handle !== myHandle)
          .slice(0, 20)
          .forEach((c: any) => {
            list.push({
              intern_id:   c.intern_id,
              handle:      c.handle,
              name:        c.name ?? c.handle,
              track:       c.track,
              cohort:      c.cohort ?? myCohort,
              cohortLabel: 'Current',
              isDefault:   true,
            });
          });

      } else {
        // Mentor / Founder: use view=office for direct table access
        // Founder gets all cohorts + both tracks in one call
        // Mentor gets their track across all known cohorts
        if (isFounder) {
          // Single call — no cohort filter, no track filter, intern_id auth
          const data = await fetch(
            `/api/internship/challengers?view=office&intern_id=${encodeURIComponent(myInternId)}`
          ).then(r => r.json()).catch(() => ({ challengers: [] }));

          (data.challengers ?? [])
            .filter((c: any) => c.handle !== myHandle)
            .forEach((c: any) => {
              list.push({
                intern_id:   c.intern_id,
                handle:      c.handle,
                name:        c.name ?? c.first_name ?? c.handle,
                // name is full name e.g. 'Antony Ciccone' from challengers table
                track:       c.track,
                cohort:      c.cohort ?? myCohort,
                cohortLabel: cohortDisplayLabel(c.cohort ?? myCohort, myCohort),
                isDefault:   true,
              });
            });
        } else {
          // Mentor: all known cohorts, their track only
          const allCohorts = KNOWN_COHORTS;
          const results = await Promise.all(
            allCohorts.map(cohort =>
              fetch(`/api/internship/challengers?view=office&cohort=${cohort}`)
                .then(r => r.json())
                .then(d => ({ cohort, challengers: d.challengers ?? [] }))
                .catch(() => ({ cohort, challengers: [] }))
            )
          );

          results.forEach(({ cohort, challengers }) => {
            challengers
              .filter((c: any) => c.track === myTrack && c.handle !== myHandle)
              .forEach((c: any) => {
                list.push({
                  intern_id:   c.intern_id,
                  handle:      c.handle,
                  name:        c.name ?? c.first_name ?? c.handle,
                  track:       c.track,
                  cohort:      cohort,
                  cohortLabel: cohortDisplayLabel(cohort, myCohort),
                  isDefault:   true,
                });
              });
          });
        }
      }

      // Dedupe by intern_id
      const seen = new Set<string>();
      const deduped = list.filter(p => {
        if (seen.has(p.intern_id)) return false;
        seen.add(p.intern_id);
        return true;
      });

      setPeople(deduped);
      setLoaded(true);
    }

    seed();
  }, [myInternId, myHandle, myCohort, myTrack, isTeam]);

  // ── Toggle thread open/close ──────────────────────────────
  function toggleThread(id: string) {
    setOpenId(prev => prev === id ? null : id);
  }

  // ── Add person by handle ──────────────────────────────────
  async function addPerson() {
    const h = addHandle.trim();
    if (!h || addLoading) return;
    setAddLoading(true);
    setAddError('');

    const data = await fetch(`/api/internship/me?handle=${encodeURIComponent(h)}`)
      .then(r => r.json())
      .catch(() => null);

    if (!data?.challenger?.intern_id) {
      setAddError('Handle not found');
      setAddLoading(false);
      return;
    }

    const c = data.challenger;
    if (people.some(p => p.intern_id === c.intern_id)) {
      setAddError('Already in your list');
      setAddLoading(false);
      return;
    }

    const roleLabel = c.profile_type === 'founder' || c.access_level === 'founder'
      ? '⚡ Founder · antcpu'
      : c.profile_type === 'team' || c.role_title?.includes('Mentor')
      ? (c.track === 'marketing' ? '📣 Marketing Lead' : '💻 Dev Lead')
      : cohortDisplayLabel(c.cohort ?? myCohort, myCohort);
    setPeople(prev => [...prev, {
      intern_id:   c.intern_id,
      handle:      c.handle ?? h,
      name:        c.name ?? c.first_name ?? h,
      track:       c.track ?? myTrack,
      cohort:      c.cohort ?? myCohort,
      cohortLabel: roleLabel,
      isDefault:   false,
    }]);
    setAddHandle('');
    setAddLoading(false);
  }

  // ── Group by cohortLabel for mentor view ──────────────────
  const groups: Record<string, Person[]> = {};
  people.forEach(p => {
    if (!groups[p.cohortLabel]) groups[p.cohortLabel] = [];
    groups[p.cohortLabel].push(p);
  });

  const groupOrder = isTeam
    ? ['Current', ...KNOWN_COHORTS
        .filter(c => c !== myCohort)
        .map(c => cohortDisplayLabel(c, myCohort))]
    : ['💻 Dev Lead', '📣 Marketing Lead', 'Current'];

  const sortedGroups = [
    ...groupOrder.filter(g => groups[g]),
    ...Object.keys(groups).filter(g => !groupOrder.includes(g)),
  ];

  return (
    <div style={{ padding: '0.75rem' }}>

      {/* Header */}
      <div style={{ marginBottom: '0.75rem' }}>
        <p style={{ fontSize: '0.65rem', fontWeight: 800, color: subtext, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.15rem' }}>
          {isFounder ? 'All Challengers' : isTeam ? `Your ${myTrack === 'dev' ? 'Dev' : 'Marketing'} Challengers` : 'Your People'}
        </p>
        <p style={{ fontSize: '0.65rem', color: subtext, opacity: 0.6 }}>
          Click 💬 to open a direct message thread.
        </p>
      </div>

      {/* Loading */}
      {!loaded && (
        <p style={{ fontSize: '0.75rem', color: subtext, padding: '0.5rem 0' }}>Loading...</p>
      )}

      {/* Grouped people list */}
      {loaded && sortedGroups.map(group => (
        <div key={group} style={{ marginBottom: '0.75rem' }}>
          <p style={{
            fontSize: '0.6rem', fontWeight: 800,
            color: subtext, opacity: 0.5,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            marginBottom: '0.35rem',
          }}>
            {group}
          </p>
          {groups[group].map(p => (
            <PersonRow
              key={p.intern_id}
              person={p}
              myInternId={myInternId}
              myCohort={myCohort}
              accent={accent}
              border={border}
              subtext={subtext}
              openId={openId}
              onToggle={toggleThread}
            />
          ))}
        </div>
      ))}

      {loaded && people.length === 0 && (
        <p style={{ fontSize: '0.75rem', color: subtext, opacity: 0.5 }}>No people found yet.</p>
      )}

      {/* ➕ Add person */}
      <div style={{
        marginTop: '0.75rem',
        paddingTop: '0.75rem',
        borderTop: `1px solid ${border}`,
      }}>
        <p style={{ fontSize: '0.62rem', color: subtext, opacity: 0.6, marginBottom: '0.4rem' }}>
          ➕ Add someone by handle
        </p>
        {addError && (
          <p style={{ fontSize: '0.65rem', color: '#f87171', marginBottom: '0.3rem' }}>{addError}</p>
        )}
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <input
            value={addHandle}
            onChange={e => { setAddHandle(e.target.value); setAddError(''); }}
            onKeyDown={e => e.key === 'Enter' && addPerson()}
            placeholder="e.g. Hatem41"
            style={{
              flex: 1, fontSize: '0.75rem',
              background: 'rgba(255,255,255,0.04)',
              border: `1px solid ${border}`,
              borderRadius: 6, padding: '0.3rem 0.6rem',
              color: '#ccc', outline: 'none',
            }}
          />
          <button
            onClick={addPerson}
            disabled={addLoading || !addHandle.trim()}
            style={{
              fontSize: '0.68rem', fontWeight: 700,
              padding: '0.3rem 0.7rem',
              background: accent, color: '#000',
              border: 'none', borderRadius: 6,
              cursor: 'pointer', opacity: addLoading ? 0.5 : 1,
              flexShrink: 0,
            }}
          >
            {addLoading ? '...' : '➕ Add'}
          </button>
        </div>
      </div>

    </div>
  );
}
