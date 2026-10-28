// ============================================================
// app/office/[handle]/AdShareCard.tsx
// Ad centerpiece + mega share module
// Shows the challenger's live Arena ad as the hero of their office.
// Every share = an ad impression.
// ============================================================

'use client';

import { useState } from 'react';

type AdData = {
  title: string;
  description: string;
  url: string;
  category: string;
};

const PLATFORMS = [
  { label: 'WhatsApp',  icon: '💬', color: '#25d366', fn: (u: string, t: string) => `https://wa.me/?text=${enc(t + '\n\n' + u)}` },
  { label: 'X',         icon: '𝕏',  color: '#000',    fn: (u: string, t: string) => `https://twitter.com/intent/tweet?text=${enc(t + '\n\n' + u)}` },
  { label: 'LinkedIn',  icon: 'in', color: '#0077b5', fn: (u: string)            => `https://www.linkedin.com/sharing/share-offsite/?url=${enc(u)}` },
  { label: 'Telegram',  icon: '✈️', color: '#229ed9', fn: (u: string, t: string) => `https://t.me/share/url?url=${enc(u)}&text=${enc(t)}` },
  { label: 'Bluesky',   icon: '🦋', color: '#0085ff', fn: (u: string, t: string) => `https://bsky.app/intent/compose?text=${enc(t + '\n\n' + u)}` },
  { label: 'Reddit',    icon: '🔴', color: '#ff4500', fn: (u: string, t: string) => `https://reddit.com/submit?url=${enc(u)}&title=${enc(t)}` },
  { label: 'Facebook',  icon: '👤', color: '#1877f2', fn: (u: string)            => `https://www.facebook.com/sharer/sharer.php?u=${enc(u)}` },
  { label: 'Pinterest', icon: '📌', color: '#e60023', fn: (u: string, t: string) => `https://pinterest.com/pin/create/button/?url=${enc(u)}&description=${enc(t)}` },
];

// Track share clicks — fires activity ping for bonus gate b1
function trackShare(platform: string, sharedHandle: string) {
  try {
    const s = JSON.parse(localStorage.getItem('antcpu_session') || '{}');
    const intern_id = s?.intern_id || localStorage.getItem('intern_id') || '';
    if (!intern_id) return;
    fetch('/api/internship/activity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intern_id,
        label: `Shared ${sharedHandle}'s ad on ${platform}`,
        icon: '📤',
        type: 'share',
        gate_id: 'b1',
      }),
    }).catch(() => null);
  } catch {}
}

function enc(s: string) { return encodeURIComponent(s); }

export default function AdShareCard({
  ad,
  brandSlug,
  name,
  handle,
  isOwner,
  accent,
}: {
  ad: AdData | null;
  brandSlug: string | null;
  name: string;
  handle: string;
  isOwner: boolean;
  accent: string;
}) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const arenaUrl = brandSlug
    ? `https://antcpu-ads.vercel.app/arena/${brandSlug}`
    : `https://antcpu-ads.vercel.app/arena`;

  const shareUrl  = ad?.url ?? arenaUrl;
  const shareText = ad
    ? `${ad.title} — by ${name} on the antcpu Arena`
    : `${name} is building on the antcpu Arena`;

  async function copy() {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // All challengers have an Arena ad — if somehow missing, show arena link
  if (!ad && !brandSlug) return null;

  return (
    <div style={{
      border: `1.5px solid ${accent}33`,
      borderRadius: 14,
      overflow: 'hidden',
      marginBottom: '2rem',
      background: '#fff',
      boxShadow: `0 2px 16px ${accent}11`,
    }}>

      {/* ── Header strip ── */}
      <div style={{
        background: accent,
        padding: '0.5rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff',
          textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          ⚡ Arena Ad
        </span>
        {ad?.category && (
          <span style={{ fontSize: '0.65rem', fontWeight: 600,
            background: 'rgba(255,255,255,0.2)', color: '#fff',
            padding: '0.15rem 0.5rem', borderRadius: 999 }}>
            {ad.category}
          </span>
        )}
      </div>

      {/* ── Ad content ── */}
      <div style={{ padding: '1.25rem 1.25rem 0' }}>
        {ad ? (
          <>
            <h2 style={{
              fontSize: '1.1rem', fontWeight: 800,
              margin: '0 0 0.5rem', lineHeight: 1.3, color: '#111',
            }}>
              {ad.title}
            </h2>
            <p style={{
              fontSize: '0.875rem', color: '#4b5563',
              margin: '0 0 1rem', lineHeight: 1.6,
            }}>
              {ad.description}
            </p>
            <a href={ad.url} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
                fontSize: '0.8rem', fontWeight: 700, color: accent,
                textDecoration: 'none', marginBottom: '1rem',
              }}>
              View Ad →
            </a>
          </>
        ) : (
          <div style={{ marginBottom: '1rem' }}>
            <a href={arenaUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '0.875rem', fontWeight: 700, color: accent, textDecoration: 'none' }}>
              View on Arena →
            </a>
          </div>
        )}
      </div>

      {/* ── Share section ── */}
      <div style={{
        borderTop: '1px solid #f3f4f6',
        padding: '1rem 1.25rem',
        background: '#fafafa',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', marginBottom: '0.75rem',
        }}>
          <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#6b7280',
            textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Share this ad
          </span>
          <button onClick={() => setExpanded(e => !e)} style={{
            fontSize: '0.7rem', color: accent, fontWeight: 700,
            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          }}>
            {expanded ? 'Less ↑' : 'More platforms ↓'}
          </button>
        </div>

        {/* URL + copy */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          marginBottom: '0.75rem',
        }}>
          <span style={{
            flex: 1, fontSize: '0.72rem', color: '#9ca3af',
            fontFamily: 'monospace', overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {shareUrl}
          </span>
          <button onClick={copy} style={{
            fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
            background: copied ? accent : 'transparent',
            color: copied ? '#fff' : accent,
            border: `1px solid ${accent}`,
            padding: '0.25rem 0.65rem', borderRadius: 6,
            cursor: 'pointer',
          }}>
            {copied ? '✓' : 'Copy'}
          </button>
        </div>

        {/* Platform buttons — top 4 always visible */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
          {(expanded ? PLATFORMS : PLATFORMS.slice(0, 4)).map(p => (
            <a
              key={p.label}
              href={p.fn(shareUrl, shareText)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackShare(p.label, handle)}
              style={{
                fontSize: '0.72rem', fontWeight: 700,
                padding: '0.3rem 0.75rem', borderRadius: 999,
                border: `1px solid ${p.color}44`,
                color: p.color,
                textDecoration: 'none',
                background: `${p.color}0a`,
              }}
            >
              {p.icon} {p.label}
            </a>
          ))}
        </div>
      </div>

      {/* ── Owner edit strip ── */}
      {isOwner && (
        <div style={{
          borderTop: '1px solid #f3f4f6',
          padding: '0.6rem 1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
            Your Arena ad · {handle}
          </span>
          <a href={brandSlug
            ? `https://antcpu-ads.vercel.app/arena/${brandSlug}`
            : '/create-ad'}
            target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '0.72rem', fontWeight: 700, color: accent, textDecoration: 'none' }}>
            {brandSlug ? 'View in Arena →' : 'Create Ad →'}
          </a>
        </div>
      )}
    </div>
  );
}
