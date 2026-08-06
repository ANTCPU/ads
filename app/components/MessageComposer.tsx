'use client';
// ─────────────────────────────────────────────────────────────────────────────
// MessageComposer
// Self-contained in-app message sender.
// Calls /api/notify → inserts into notifications table →
// appears in user's ✉️ envelope immediately.
//
// Used in:
//   dashboard/antcpu  → standalone card, email field open
//   dashboard/users   → inline per-user, email pre-filled + hidden
//
// Props:
//   email?    pre-filled email — if omitted, shows email input
//   name?     shown in header "Message · [name]"
//   onSent?   callback after successful send
//   onCancel? callback on cancel button
//   dark?     true = dark bg (users page) · false = light bg (antcpu dash)
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState } from 'react';

const ADS_BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app';

// ── Message types ─────────────────────────────────────────────────────────────
// Each type has an accent color + suggested title prefix.
// Clicking a type pill pre-fills the title — user just completes it.

const MSG_TYPES = [
  { key: 'nudge',    label: '⚡ Nudge',    color: '#0070f3', prefix: '⚡ Quick note from ANTCPU — ' },
  { key: 'points',   label: '🏆 Points',   color: '#D4AF37', prefix: '⚡ Points update — '          },
  { key: 'info',     label: 'ℹ️ Info',     color: '#555555', prefix: 'ℹ️ Arena update — '           },
  { key: 'rank',     label: '📊 Rank',     color: '#7928ca', prefix: '📊 Your ranking — '           },
  { key: 'approved', label: '✅ Approved', color: '#22c55e', prefix: '✅ Good news — '              },
  { key: 'aria',     label: '🦋 Aria',     color: '#f0883e', prefix: '🦋 Aria note — '              },
] as const;

type MsgTypeKey = typeof MSG_TYPES[number]['key'];

type Props = {
  email?:    string;
  name?:     string;
  onSent?:   (email: string) => void;
  onCancel?: () => void;
  dark?:     boolean;
};

export default function MessageComposer({
  email:    prefillEmail = '',
  name:     prefillName  = '',
  onSent,
  onCancel,
  dark = false,
}: Props) {

  const [email,   setEmail]   = useState(prefillEmail);
  const [type,    setType]    = useState<MsgTypeKey>('nudge');
  const [title,   setTitle]   = useState('');
  const [body,    setBody]    = useState('');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const accent      = MSG_TYPES.find(t => t.key === type)?.color || '#0070f3';
  const hasEmail    = prefillEmail.trim().length > 0;
  const canSend     = email.trim().length > 3 && title.trim().length > 0 && !sending;

  // ── bg/text colours — adapts to light (antcpu dash) or dark (users page) ──
  const bg      = dark ? '#111'    : '#fafafa';
  const border  = dark ? '#222'    : '#e5e5e5';
  const text    = dark ? '#fff'    : '#0a0a0a';
  const subtext = dark ? '#555'    : '#888';
  const inpBg   = dark ? '#0a0a0a' : '#fff';

  const inp: React.CSSProperties = {
    width: '100%', background: inpBg, border: `1px solid ${border}`,
    borderRadius: '8px', padding: '0.6rem 0.85rem', fontSize: '0.85rem',
    color: text, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'system-ui, sans-serif',
  };

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setError('');
    try {
      const res = await fetch(`${ADS_BASE}/api/notify`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email:   email.trim().toLowerCase(),
          type,
          title:   title.trim(),
          message: body.trim(),
        }),
      });
      const d = await res.json();
      if (d.ok) {
        setSent(true);
        if (onSent) onSent(email.trim());
        // Auto-reset after 3s so composer can be reused
        setTimeout(() => {
          setSent(false);
          setTitle('');
          setBody('');
          if (!hasEmail) setEmail('');
        }, 3000);
      } else {
        setError(d.error || 'Send failed — try again.');
      }
    } catch {
      setError('Network error — try again.');
    }
    setSending(false);
  }

  // ── Sent state ────────────────────────────────────────────────────────────
  if (sent) {
    return (
      <div style={{
        background: dark ? '#0a1a0a' : '#f0fdf4',
        border: `1px solid ${dark ? '#1a3a1a' : '#bbf7d0'}`,
        borderRadius: '10px', padding: '1rem 1.25rem',
        display: 'flex', alignItems: 'center', gap: '0.75rem',
      }}>
        <span style={{ fontSize: '1.2rem' }}>✅</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#22c55e' }}>
            Message sent
          </div>
          <div style={{ fontSize: '0.72rem', color: subtext, marginTop: '0.15rem' }}>
            Appears in {prefillName || email}'s envelope now
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: bg, border: `1px solid ${border}`,
      borderRadius: '12px', padding: '1.1rem 1.25rem',
      display: 'flex', flexDirection: 'column', gap: '0.75rem',
    }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: text }}>
          ✉️ Message{prefillName ? ` · ${prefillName}` : ''}
        </div>
        {onCancel && (
          <button onClick={onCancel} style={{
            background: 'none', border: 'none', color: subtext,
            cursor: 'pointer', fontSize: '1rem', lineHeight: 1, padding: '0.1rem',
          }}>✕</button>
        )}
      </div>

      {/* ── Email field — only shown when not pre-filled ── */}
      {!hasEmail && (
        <input
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="user@email.com"
          type="email"
          style={inp}
        />
      )}

      {/* ── Type pills ── */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
        {MSG_TYPES.map(t => (
          <button
            key={t.key}
            onClick={() => {
              setType(t.key);
              // Pre-fill title prefix if title is empty or still a prefix
              const isPrefix = MSG_TYPES.some(x => title === x.prefix || title === '');
              if (isPrefix) setTitle(t.prefix);
            }}
            style={{
              background:  type === t.key ? t.color + '20' : 'transparent',
              border:      `1px solid ${type === t.key ? t.color : border}`,
              color:       type === t.key ? t.color : subtext,
              borderRadius: '999px',
              padding:     '0.2rem 0.65rem',
              fontSize:    '0.7rem',
              fontWeight:  700,
              cursor:      'pointer',
              transition:  'all 0.15s',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Title ── */}
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Message title..."
        style={{ ...inp, borderColor: title.trim().length > 0 ? border : '#ef444440' }}
      />

      {/* ── Body ── */}
      <textarea
        value={body}
        onChange={e => setBody(e.target.value)}
        placeholder="Message body (optional — title alone is enough)"
        rows={3}
        style={{ ...inp, resize: 'vertical' }}
      />

      {/* ── Error ── */}
      {error && (
        <div style={{ fontSize: '0.72rem', color: '#ef4444' }}>{error}</div>
      )}

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
        {onCancel && (
          <button onClick={onCancel} style={{
            background: 'transparent', border: `1px solid ${border}`,
            color: subtext, borderRadius: '8px',
            padding: '0.5rem 1rem', fontSize: '0.8rem',
            fontWeight: 600, cursor: 'pointer',
          }}>
            Cancel
          </button>
        )}
        <button
          onClick={handleSend}
          disabled={!canSend}
          style={{
            background:   canSend ? accent : (dark ? '#1a1a1a' : '#f5f5f5'),
            border:       'none',
            color:        canSend ? '#fff' : subtext,
            borderRadius: '8px',
            padding:      '0.5rem 1.25rem',
            fontSize:     '0.82rem',
            fontWeight:   700,
            cursor:       canSend ? 'pointer' : 'not-allowed',
            transition:   'all 0.15s',
          }}
        >
          {sending ? '...' : '✉️ Send Message →'}
        </button>
      </div>

    </div>
  );
}
