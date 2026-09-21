'use client';
// app/tv/page.tsx
// ─── ANTCPU TV — Room Browser ─────────────────────────────────────────────────
//
// Public landing page for ANTCPU TV.
// Shows all active studios + lets brands create their own.
//
// Sections:
//   — Hero: ANTCPU TV branding + tagline
//   — Create Studio: brand creates their room (one per brand)
//   — Studio Browser: all studios, watch link per card
//
// No auth required to browse — create requires brand name.
// Studio creation → POST /api/tv/rooms → redirects to studio_url
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react';
import { useRouter }           from 'next/navigation';
import ArenaNav                from '../components/ArenaNav';
import ArenaFooter             from '../components/ArenaFooter';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:      '#0a0a0a',
  card:    '#111',
  card2:   '#0d0d0d',
  border:  '#1a1a1a',
  border2: '#222',
  orange:  '#f0883e',
  gold:    '#D4AF37',
  green:   '#22c55e',
  red:     '#ef4444',
  muted:   '#555',
  dim:     '#333',
  text:    '#e0e0e0',
  sub:     '#888',
};

// ─── Types ────────────────────────────────────────────────────────────────────

type Studio = {
  id:         string;
  brand_name: string;
  room_id:    string;
  emoji:      string;
  studio_url: string;
  watch_url:  string;
  created_at: string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function TVPage() {
  const router = useRouter();

  const [studios,   setStudios]   = useState<Studio[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [brand,     setBrand]     = useState('');
  const [creating,  setCreating]  = useState(false);
  const [error,     setError]     = useState('');

  // Pre-fill brand from localStorage if logged in
  useEffect(() => {
    try {
      const stored = localStorage.getItem('arena_user');
      if (stored) {
        const u = JSON.parse(stored);
        if (u.brand) setBrand(u.brand);
      }
    } catch {}
  }, []);

  // Load all studios
  useEffect(() => {
    fetch('/api/tv/rooms')
      .then(r => r.json())
      .then(data => {
        setStudios(data.studios || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Create studio → go to broadcast page
  async function createStudio() {
    if (!brand.trim() || creating) return;
    setCreating(true);
    setError('');

    try {
      const res  = await fetch('/api/tv/rooms', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ brand_name: brand.trim() }),
      });
      const data = await res.json();

      if (data.studio?.studio_url) {
        // Navigate to broadcast page
        const roomId = data.studio.room_id;
        router.push(`/tv/${roomId}?mode=broadcast`);
      } else {
        setError(data.error || 'Failed to create studio');
        setCreating(false);
      }
    } catch {
      setError('Connection error — try again');
      setCreating(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav />

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* ── Hero ── */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📡</div>
          <h1 style={{
            fontSize:     '1.75rem',
            fontWeight:   800,
            color:        C.text,
            margin:       '0 0 0.5rem',
            letterSpacing: '-0.02em',
          }}>
            ANTCPU TV
          </h1>
          <p style={{ fontSize: '0.92rem', color: C.sub, margin: '0 0 1.5rem', lineHeight: 1.6 }}>
            Stream live. Share anything. Your studio, your audience.
          </p>

          {/* Live indicator */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: C.red, display: 'inline-block',
              boxShadow: `0 0 6px ${C.red}`,
              animation: 'pulse 2s infinite',
            }} />
            <span style={{ fontSize: '0.75rem', color: C.muted, fontWeight: 700, letterSpacing: '0.08em' }}>
              {studios.length > 0 ? `${studios.length} STUDIO${studios.length !== 1 ? 'S' : ''} REGISTERED` : 'BE THE FIRST TO GO LIVE'}
            </span>
          </div>
        </div>

        {/* ── Create Studio ── */}
        <div style={{
          background:   C.card,
          border:       `1px solid ${C.orange}30`,
          borderLeft:   `3px solid ${C.orange}`,
          borderRadius: '12px',
          padding:      '1.5rem',
          marginBottom: '2rem',
        }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: C.text, marginBottom: '0.3rem' }}>
            📡 Launch Your Studio
          </div>
          <div style={{ fontSize: '0.78rem', color: C.sub, marginBottom: '1.25rem', lineHeight: 1.6 }}>
            One studio per brand. Go live with screen share, camera, or mic — no installs needed.
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              value={brand}
              onChange={e => setBrand(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createStudio()}
              placeholder="Your brand name..."
              style={{
                flex:         1,
                background:   C.card2,
                border:       `1px solid ${C.border2}`,
                color:        C.text,
                borderRadius: '8px',
                padding:      '0.7rem 1rem',
                fontSize:     '0.88rem',
                outline:      'none',
              }}
            />
            <button
              onClick={createStudio}
              disabled={!brand.trim() || creating}
              style={{
                background:   brand.trim() && !creating ? C.orange : C.border,
                border:       'none',
                color:        brand.trim() && !creating ? '#000' : C.muted,
                borderRadius: '8px',
                padding:      '0.7rem 1.25rem',
                fontSize:     '0.88rem',
                fontWeight:   700,
                cursor:       brand.trim() && !creating ? 'pointer' : 'not-allowed',
                whiteSpace:   'nowrap',
                transition:   'all 0.15s',
              }}
            >
              {creating ? '⚡ Creating...' : '🚀 Go Live'}
            </button>
          </div>

          {error && (
            <div style={{ fontSize: '0.75rem', color: C.red, marginTop: '0.5rem' }}>
              {error}
            </div>
          )}

          {/* Feature pills */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '1rem' }}>
            {[
              '🖥️ Screen Share',
              '📷 Camera + Mic',
              '👥 Live Audience',
              '❤️ Reactions',
              '↗ Share',
            ].map(f => (
              <span key={f} style={{
                fontSize:     '0.65rem',
                color:        C.muted,
                background:   C.bg,
                border:       `1px solid ${C.border}`,
                borderRadius: '999px',
                padding:      '0.2rem 0.6rem',
              }}>
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* ── Studio Browser ── */}
        <div>
          <div style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            marginBottom:   '1rem',
          }}>
            <div style={{
              fontSize:      '0.68rem',
              color:         C.muted,
              fontWeight:    700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
            }}>
              Studios
            </div>
            {studios.length > 0 && (
              <span style={{
                fontSize:     '0.65rem',
                color:        C.muted,
                background:   C.bg,
                border:       `1px solid ${C.border}`,
                borderRadius: '999px',
                padding:      '0.1rem 0.45rem',
              }}>
                {studios.length}
              </span>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ color: C.muted, fontSize: '0.85rem', padding: '1rem 0' }}>
              Loading studios...
            </div>
          )}

          {/* Empty */}
          {!loading && studios.length === 0 && (
            <div style={{
              background:   C.card,
              border:       `1px solid ${C.border}`,
              borderRadius: '12px',
              padding:      '2.5rem',
              textAlign:    'center',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📡</div>
              <div style={{ fontSize: '0.88rem', color: C.sub, marginBottom: '0.4rem', fontWeight: 600 }}>
                No studios yet
              </div>
              <div style={{ fontSize: '0.75rem', color: C.muted }}>
                Be the first brand to go live on ANTCPU TV.
              </div>
            </div>
          )}

          {/* Studio cards */}
          {!loading && studios.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {studios.map((studio, i) => (
                <div
                  key={studio.id}
                  style={{
                    background:   C.card,
                    border:       `1px solid ${C.border}`,
                    borderRadius: '12px',
                    padding:      '1rem 1.25rem',
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '1rem',
                  }}
                >
                  {/* Emoji + rank */}
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: '1.75rem', lineHeight: 1 }}>{studio.emoji || '⚡'}</div>
                    <div style={{ fontSize: '0.6rem', color: C.dim, marginTop: '0.2rem' }}>
                      #{i + 1}
                    </div>
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontWeight:   700,
                      fontSize:     '0.92rem',
                      color:        C.text,
                      marginBottom: '0.2rem',
                      overflow:     'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace:   'nowrap',
                    }}>
                      {studio.brand_name}
                    </div>
                    <div style={{ fontSize: '0.65rem', color: C.dim, fontFamily: 'monospace' }}>
                      {studio.room_id}
                    </div>
                    <div style={{ fontSize: '0.62rem', color: C.dim, marginTop: '0.15rem' }}>
                      Created {new Date(studio.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flexShrink: 0 }}>
                    <a
                      href={studio.watch_url}
                      style={{
                        display:        'block',
                        textAlign:      'center',
                        background:     C.red,
                        color:          '#fff',
                        borderRadius:   '7px',
                        padding:        '0.4rem 0.85rem',
                        fontSize:       '0.75rem',
                        fontWeight:     700,
                        textDecoration: 'none',
                        whiteSpace:     'nowrap',
                      }}
                    >
                      ● Watch
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(studio.watch_url).catch(() => {});
                      }}
                      style={{
                        background:   'transparent',
                        border:       `1px solid ${C.border2}`,
                        color:        C.muted,
                        borderRadius: '7px',
                        padding:      '0.35rem 0.85rem',
                        fontSize:     '0.72rem',
                        cursor:       'pointer',
                        whiteSpace:   'nowrap',
                      }}
                    >
                      ↗ Share
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Footer note ── */}
        <div style={{
          marginTop:  '2.5rem',
          textAlign:  'center',
          fontSize:   '0.7rem',
          color:      C.dim,
          lineHeight: 1.6,
        }}>
          ANTCPU TV · No installs · No plugins · Browser native streaming<br />
          <a href="/arena" style={{ color: C.orange, textDecoration: 'none' }}>← Back to Arena</a>
        </div>

      </div>

      {/* CSS */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      <ArenaFooter />
    </div>
  );
}
