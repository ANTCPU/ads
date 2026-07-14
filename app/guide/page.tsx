'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArenaFooter from '../components/ArenaFooter';

// ─── Doorbell tracking ────────────────────────────────────────────────────────
function ping(path: string) {
  fetch('/api/doorbell', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      page: `/guide${path}`,
      ref:  typeof document !== 'undefined' ? document.referrer || 'direct' : 'direct',
      ts:   new Date().toISOString(),
      ua:   typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    }),
  }).catch(() => {});
}

type PathId = 'create' | 'share' | 'find' | null;

// ─── Path definitions ─────────────────────────────────────────────────────────
const PATHS = [
  {
    id:     'create' as PathId,
    emoji:  '📢',
    title:  'Create an Ad',
    sub:    'Your brand. Live today. Free trial.',
    accent: '#0070f3',
    steps: [
      { n: '01', title: 'Sign up free',      desc: 'Name, email, brand. No credit card. 3-day trial starts immediately.' },
      { n: '02', title: 'Build your ad',     desc: 'Title, description, link. Aria reviews it live — usually under a minute.' },
      { n: '03', title: 'Go live same day',  desc: 'Your ad enters the Arena and starts competing for points immediately.' },
      { n: '04', title: 'Share to climb',    desc: 'Every share earns 5 pts. Every click earns 3 pts. Pinned ads earn 50 pts.' },
    ],
    cta:    '⚡ Create an Ad →',
    href:   '/create-ad',
  },
  {
    id:     'share' as PathId,
    emoji:  '↗',
    title:  'Join the Sharing. Watch Your Ad Perform.',
    sub:    'Share ads. Earn points. Climb the leaderboard.',
    accent: '#f0883e',
    steps: [
      { n: '01', title: 'Browse the Arena',       desc: '39 live ads from 8 brands competing right now. All public, no login needed.' },
      { n: '02', title: 'Hit ↗ Share on any ad',  desc: 'WhatsApp, X, Telegram, clipboard — your choice. One tap.' },
      { n: '03', title: 'The brand earns points',  desc: '5 pts per share. 3 pts per click. Top ads get pinned for 50 bonus pts.' },
      { n: '04', title: 'Watch the board move',    desc: 'Rankings update live. See who\'s rising, who\'s falling, who just got pinned.' },
    ],
    cta:    '🏟 Browse the Arena →',
    href:   '/arena',
  },
  {
    id:     'find' as PathId,
    emoji:  '👤',
    title:  'Who else is in the Arena?',
    sub:    'Find brands, explore profiles, make connections.',
    accent: '#7928ca',
    steps: [
      { n: '01', title: 'Go to the Arena',       desc: '8 brands. 39 live ads. Real businesses competing for real reach.' },
      { n: '02', title: 'Click any brand name',  desc: 'Every brand name is a link. Opens their full public profile instantly.' },
      { n: '03', title: 'See their full story',  desc: 'Bio, website, all their ads, social links, performance stats.' },
      { n: '04', title: 'Share or connect',      desc: 'Share their profile with one tap. Or reach out directly via their links.' },
    ],
    cta:    '👤 Explore Profiles →',
    href:   '/arena',
  },
];

// ─── Top 3 brand tiles ────────────────────────────────────────────────────────
const BRANDS = [
  { name: 'ANTCPU ADS',          emoji: '⚡', pts: 380, href: '/arena/antcpu',                          color: '#f0883e' },
  { name: 'Map of Pi',           emoji: '🗺️', pts: 115, href: '/arena/mapofpi',                         color: '#22c55e' },
  { name: 'Amanda Photography',  emoji: '📸', pts:  70, href: '/profile/mishoemanda%40gmail.com',        color: '#0070f3' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GuidePage() {
  const router = useRouter();
  const [active, setActive] = useState<PathId>(null);
  const [ref,    setRef]    = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const r = params.get('ref') || params.get('from') || 'direct';
    setRef(r);
    ping(`?ref=${r}`);
  }, []);

  function handleCTA(href: string, pathId: PathId) {
    ping(`/cta?path=${pathId}&ref=${ref}`);
    router.push(href);
  }

  function toggle(id: PathId) {
    setActive(prev => prev === id ? null : id);
  }

  return (
    <div style={{
      background: '#0d0f14',
      color: '#fff',
      minHeight: '100vh',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative',
      overflow: 'hidden',
    }}>

      {/* Radial glow behind hero */}
      <div style={{
        position: 'absolute',
        top: '-120px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        height: '400px',
        background: 'radial-gradient(ellipse at center, rgba(0,112,243,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
        zIndex: 0,
      }} />

      {/* ── Nav ── */}
      <div style={{
        position: 'relative', zIndex: 1,
        borderBottom: '1px solid #1e2130',
        padding: '1rem 1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <button
          onClick={() => router.push('/')}
          style={{ background: 'none', border: 'none', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', letterSpacing: '0.02em' }}
        >
          ⚡ ANTCPU ADS
        </button>
        <button
          onClick={() => { ping('/nav?to=arena'); router.push('/arena'); }}
          style={{ background: 'none', border: '1px solid #2a2d35', color: '#888', borderRadius: '8px', padding: '0.4rem 0.9rem', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
        >
          🏟 Live Arena →
        </button>
      </div>

      {/* ── Hero ── */}
      <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', padding: '3rem 1.5rem 2rem' }}>

        {/* Pulse symbol */}
        <div style={{
          fontSize: '1.1rem',
          color: '#0070f3',
          marginBottom: '1rem',
          letterSpacing: '0.15em',
          animation: 'pulse 3s ease-in-out infinite',
        }}>
          ◈ &nbsp; ARENA GUIDE
        </div>

        <h1 style={{
          fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
          fontWeight: 900,
          margin: '0 0 0.75rem',
          lineHeight: 1.15,
          letterSpacing: '-0.02em',
        }}>
          Get your brand in front<br />
          <span style={{ color: '#0070f3' }}>of real people.</span> Today.
        </h1>

        <p style={{ color: '#555', fontSize: '0.95rem', margin: '0 0 0.5rem', lineHeight: 1.6 }}>
          Three paths. Pick yours.
        </p>
        <p style={{ color: '#333', fontSize: '0.82rem', margin: 0 }}>
          You're 3 minutes from live.
        </p>
      </div>

      {/* ── Path cards ── */}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: '640px', margin: '0 auto', padding: '0 1.25rem 1.5rem' }}>

        <div style={{ fontSize: '0.62rem', color: '#333', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          Choose your path
        </div>

        {PATHS.map(path => {
          const isOpen = active === path.id;
          return (
            <div
              key={path.id}
              onClick={() => toggle(path.id)}
              style={{
                background: isOpen ? `${path.accent}06` : '#111318',
                border: `1px solid ${isOpen ? path.accent + '40' : '#2a2d35'}`,
                borderLeft: `3px solid ${path.accent}`,
                boxShadow: isOpen ? `0 0 20px ${path.accent}15` : 'none',
                borderRadius: '12px',
                padding: '1.1rem 1.25rem',
                marginBottom: '0.65rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {/* Header row */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', flex: 1 }}>
                  <span style={{ fontSize: '1.25rem', lineHeight: 1, marginTop: '0.1rem' }}>{path.emoji}</span>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: isOpen ? '#fff' : '#ccc', marginBottom: '0.2rem', lineHeight: 1.3 }}>
                      {path.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#444' }}>{path.sub}</div>
                  </div>
                </div>
                <span style={{ color: '#333', fontSize: '0.75rem', marginLeft: '0.75rem', flexShrink: 0, marginTop: '0.2rem' }}>
                  {isOpen ? '▲' : '▼'}
                </span>
              </div>

              {/* Expanded content */}
              {isOpen && (
                <div onClick={e => e.stopPropagation()}>
                  <div style={{ borderTop: '1px solid #1e2130', margin: '1rem 0', }} />

                  {path.steps.map(step => (
                    <div key={step.n} style={{ display: 'flex', gap: '0.85rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
                      <div style={{
                        background: `${path.accent}18`,
                        border: `1px solid ${path.accent}35`,
                        color: path.accent,
                        borderRadius: '6px',
                        padding: '0.2rem 0.5rem',
                        fontSize: '0.62rem',
                        fontWeight: 800,
                        letterSpacing: '0.08em',
                        flexShrink: 0,
                        marginTop: '0.15rem',
                        fontFamily: 'monospace',
                      }}>
                        {step.n}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#e0e0e0', marginBottom: '0.2rem' }}>
                          {step.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#555', lineHeight: 1.55 }}>
                          {step.desc}
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => handleCTA(path.href, path.id)}
                    style={{
                      width: '100%',
                      background: path.accent,
                      color: path.accent === '#f0883e' ? '#000' : '#fff',
                      border: 'none',
                      borderRadius: '10px',
                      padding: '0.9rem',
                      fontWeight: 800,
                      fontSize: '0.95rem',
                      cursor: 'pointer',
                      marginTop: '0.25rem',
                      letterSpacing: '0.01em',
                      boxShadow: `0 4px 20px ${path.accent}30`,
                      transition: 'opacity 0.15s',
                    }}
                  >
                    {path.cta}
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* ── Brand tiles ── */}
        <div style={{ marginTop: '1.75rem' }}>
          <div style={{ fontSize: '0.62rem', color: '#333', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Live in the Arena now
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.6rem' }}>
            {BRANDS.map(b => (
              <button
                key={b.name}
                onClick={() => { ping(`/brand?name=${b.name}&ref=${ref}`); router.push(b.href); }}
                style={{
                  background: '#111318',
                  border: `1px solid #2a2d35`,
                  borderTop: `2px solid ${b.color}`,
                  borderRadius: '10px',
                  padding: '0.85rem 0.75rem',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = `0 0 12px ${b.color}20`)}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ fontSize: '1.1rem', marginBottom: '0.35rem' }}>{b.emoji}</div>
                <div style={{ fontWeight: 700, fontSize: '0.75rem', color: '#ccc', marginBottom: '0.25rem', lineHeight: 1.3 }}>
                  {b.name}
                </div>
                <div style={{ fontSize: '0.68rem', color: b.color, fontWeight: 700 }}>
                  ⚡ {b.pts} pts
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Bottom fallback ── */}
        <div style={{
          marginTop: '1.75rem',
          background: '#111318',
          border: '1px solid #2a2d35',
          borderRadius: '12px',
          padding: '1.5rem',
          textAlign: 'center',
        }}>
          <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.4rem', color: '#ccc' }}>
            Not sure yet?
          </div>
          <div style={{ fontSize: '0.8rem', color: '#444', marginBottom: '1.1rem', lineHeight: 1.6 }}>
            Browse the Arena first — no signup needed.<br />
            See what's live. See who's winning.
          </div>
          <button
            onClick={() => { ping('/cta?path=browse&ref=bottom'); router.push('/arena'); }}
            style={{
              background: 'transparent',
              border: '1px solid #2a2d35',
              color: '#666',
              borderRadius: '8px',
              padding: '0.7rem 1.5rem',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            See What's Live →
          </button>
        </div>

      </div>

      {/* ── Pulse keyframe ── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

      <ArenaFooter />
    </div>
  );
}
