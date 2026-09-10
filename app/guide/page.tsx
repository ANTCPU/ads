'use client';
// app/guide/page.tsx
// ─── Arena Guide — single page, anchor sections per feature ──────────────────
// Pills on /profile/[slug] link here with #anchor when feature is locked.
// Each section tells the user: what it is, what unlocks it, what to do next.
// Future: anchors become pin IDs on a map — URL structure stays identical.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { useRouter }                  from 'next/navigation';
import ArenaNav                       from '../components/ArenaNav';
import ArenaFooter                    from '../components/ArenaFooter';

// ─── Types ────────────────────────────────────────────────────────────────────

type Viewer = {
  email: string; name: string; brand: string;
  trialStatus: string; role: string;
};

// ─── Tokens ───────────────────────────────────────────────────────────────────

const bg     = '#0a0a0a';
const card   = '#111';
const border = '#1a1a1a';
const muted  = '#555';
const white  = '#fff';

// ─── Tier ladder — mirrors membership.ts ─────────────────────────────────────

const TIERS = [
  { key: 'trial',      label: 'Trial',          icon: '🌱', color: '#555',    pts: 0,   badge: null              },
  { key: 'member',     label: 'Member',          icon: '⚡', color: '#0070f3', pts: 0,   badge: 'any action badge' },
  { key: 'rising',     label: 'Rising Member',   icon: '🚀', color: '#7928ca', pts: 100, badge: null              },
  { key: 'veteran',    label: 'Arena Veteran',   icon: '🏅', color: '#ff0080', pts: 300, badge: 'Loyal Member'    },
  { key: 'champion',   label: 'Arena Champion',  icon: '🏆', color: '#D4AF37', pts: 750, badge: 'Country Champion' },
  { key: 'subscriber', label: 'Subscriber',      icon: '💎', color: '#f0883e', pts: 0,   badge: null              },
];

// ─── Guide sections — one per pill anchor ────────────────────────────────────

const SECTIONS = [
  {
    id:       'arena',
    icon:     '🏟',
    label:    'Arena',
    minTier:  'trial',
    color:    '#0070f3',
    what:     'The Arena is the live feed of every active ad on the network. Browse brands, click ads, share what you like, and earn points for every action.',
    unlocks:  'Available to everyone — no tier required.',
    howTo:    null,
    cta:      { label: 'Open the Arena', href: '/arena' },
  },
  {
    id:       'create-ad',
    icon:     '📢',
    label:    'Create Ad',
    minTier:  'trial',
    color:    '#0070f3',
    what:     'Build and submit your ad to the Arena. Title, description, URL, category — Aria reviews it and you go live same day.',
    unlocks:  'Available to everyone — no tier required.',
    howTo:    null,
    cta:      { label: 'Create Your Ad', href: '/create-ad' },
  },
  {
    id:       'campaign-hub',
    icon:     '🗺️',
    label:    'Campaign Hub',
    minTier:  'rising',
    color:    '#7928ca',
    what:     'Campaign Hub groups your active ads by tier, shows performance across all campaigns, and lets you manage everything from one place.',
    unlocks:  'Unlocks at Rising Member — 100 points.',
    howTo: [
      'Share your ad once to earn 10 points',
      'Get a click on your ad for 5 points',
      'Leave a reaction on another ad for 2 points',
      'Reach 100 points total → Rising Member tier unlocks automatically',
    ],
    cta:      { label: 'Go to Arena — Start Earning', href: '/arena' },
  },
  {
    id:       'posts',
    icon:     '📝',
    label:    'Posts',
    minTier:  'veteran',
    color:    '#ff0080',
    what:     'Posts lets you publish brand updates, announcements, and content directly to your Arena profile. Followers see your posts in their feed.',
    unlocks:  'Unlocks at Arena Veteran — 300 points + Loyal Member badge.',
    howTo: [
      'Reach 300 points through shares, clicks, and reactions',
      'Earn the Loyal Member badge — restart your trial through Arena activity',
      'Both conditions met → Arena Veteran tier unlocks automatically',
      'Posts module appears on your profile',
    ],
    cta:      { label: 'Go to Arena — Start Earning', href: '/arena' },
  },
  {
    id:       'aria-chat',
    icon:     '💬',
    label:    'Aria Chat',
    minTier:  'veteran',
    color:    '#ff0080',
    what:     'A direct line to Aria — the Arena\'s AI agent. Ask her to write ad copy, analyse your performance, suggest improvements, or answer any Arena question.',
    unlocks:  'Unlocks at Arena Veteran — 300 points + Loyal Member badge.',
    howTo: [
      'Reach 300 points through shares, clicks, and reactions',
      'Earn the Loyal Member badge — restart your trial through Arena activity',
      'Both conditions met → Arena Veteran tier unlocks automatically',
      'Aria Chat appears on your profile',
    ],
    cta:      { label: 'Go to Arena — Start Earning', href: '/arena' },
  },
  {
    id:       'video-feed',
    icon:     '🎥',
    label:    'Video Feed',
    minTier:  'subscriber',
    color:    '#f0883e',
    what:     'Video Feed lets you run media ads — short video clips, YouTube embeds, and live streams — directly in the Arena feed. Maximum visibility.',
    unlocks:  'Unlocks at Subscriber tier — paid plan.',
    howTo: [
      'Subscriber tier is a paid plan — $9.99/mo',
      'Currently in Phase 4 development — not yet live',
      'Join the Arena now to be first in line when it launches',
    ],
    cta:      { label: 'Join the Arena', href: '/arena' },
  },
];

// ─── Points actions table ─────────────────────────────────────────────────────

const POINT_ACTIONS = [
  { action: 'Share an ad',          pts: '+10', color: '#7928ca' },
  { action: 'Click an ad',          pts: '+5',  color: '#0070f3' },
  { action: 'React to an ad',       pts: '+2',  color: '#f0883e' },
  { action: 'Like an ad',           pts: '+2',  color: '#22c55e' },
  { action: 'Boost an ad',          pts: '+5',  color: '#D4AF37' },
  { action: 'Your ad gets clicked', pts: '+3',  color: '#0070f3' },
  { action: 'Your ad gets shared',  pts: '+8',  color: '#7928ca' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function GuidePage() {
  const router  = useRouter();
  const [viewer, setViewer] = useState<Viewer | null>(null);

  useEffect(() => {
    // Read viewer — guide is public but nav needs session if present
    const stored = localStorage.getItem('arena_user');
    if (stored) { try { setViewer(JSON.parse(stored)); } catch {} }

    // Scroll to anchor if present in URL
    const hash = window.location.hash;
    if (hash) {
      setTimeout(() => {
        const el = document.querySelector(hash);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, []);

  const accent = viewer?.role === 'super' ? '#f0883e'
    : viewer?.trialStatus === 'team' ? '#7928ca'
    : '#0070f3';

  // ── Styles ──────────────────────────────────────────────────────────────────

  const cardStyle: React.CSSProperties = {
    background: card, border: `1px solid ${border}`,
    borderRadius: '12px', padding: '1.5rem', marginBottom: '1.25rem',
    scrollMarginTop: '2rem',
  };
  const lbl: React.CSSProperties = {
    fontSize: '0.65rem', color: muted, fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem',
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={{ background: bg, minHeight: '100vh', color: white, fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav
        role={(viewer?.role as any) || 'user'}
        userName={viewer?.name || ''}
        userEmail={viewer?.email || ''}
        userBrand={viewer?.brand || ''}
        trialStatus={(viewer?.trialStatus as any) || 'trial'}
      />

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2rem 1.25rem 4rem' }}>

        {/* ── Back ── */}
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '0.78rem', padding: 0, marginBottom: '1.5rem' }}>
          ← Back
        </button>

        {/* ── Header ── */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.4rem' }}>
            ⚡ Arena Guide
          </h1>
          <p style={{ fontSize: '0.85rem', color: muted, margin: 0 }}>
            How the Arena works, what each feature does, and exactly how to unlock it.
          </p>
        </div>

        {/* ── TIER LADDER ── */}
        <div style={{ ...cardStyle, marginBottom: '2rem' }}>
          <div style={lbl}>Tier Ladder</div>
          <p style={{ fontSize: '0.82rem', color: '#888', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            Every action in the Arena earns points. Points unlock tiers. Tiers unlock features.
            You never lose a tier — progress only goes up.
          </p>

          {/* Tier rows */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {TIERS.map((t, i) => (
              <div key={t.key} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                background: bg, border: `1px solid ${t.color}25`,
                borderLeft: `3px solid ${t.color}`,
                borderRadius: '8px', padding: '0.65rem 0.85rem',
              }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>{t.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: t.color }}>{t.label}</div>
                  <div style={{ fontSize: '0.7rem', color: muted, marginTop: '0.1rem' }}>
                    {t.key === 'trial'      && 'Start here — 3 days free'}
                    {t.key === 'member'     && 'Earn any action badge — share, click, react, like, or boost'}
                    {t.key === 'rising'     && '100 points'}
                    {t.key === 'veteran'    && '300 points + Loyal Member badge'}
                    {t.key === 'champion'   && '750 points + Country Champion or Top Brand badge'}
                    {t.key === 'subscriber' && 'Paid plan — $9.99/mo · Phase 4'}
                  </div>
                </div>
                {i < TIERS.length - 1 && (
                  <span style={{ fontSize: '0.65rem', color: muted, flexShrink: 0 }}>
                    {t.pts > 0 ? `${t.pts} pts` : t.key === 'subscriber' ? '$9.99' : 'action'}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Points table */}
          <div style={lbl}>How to Earn Points</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            {POINT_ACTIONS.map(a => (
              <div key={a.action} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.4rem 0', borderBottom: `1px solid ${border}`,
              }}>
                <span style={{ fontSize: '0.8rem', color: '#aaa' }}>{a.action}</span>
                <span style={{ fontSize: '0.8rem', fontWeight: 800, color: a.color }}>{a.pts}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── FEATURE SECTIONS ── */}
        {SECTIONS.map(s => {
          const tierDef = TIERS.find(t => t.key === s.minTier)!;
          return (
            <div key={s.id} id={s.id} style={{ ...cardStyle, border: `1px solid ${s.color}25`, position: 'relative', overflow: 'hidden' }}>

              {/* Accent bar */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${s.color}, transparent)` }} />

              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.85rem' }}>
                <span style={{ fontSize: '1.4rem' }}>{s.icon}</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1rem', color: white }}>{s.label}</div>
                  <span style={{
                    fontSize: '0.62rem', fontWeight: 700,
                    color: tierDef.color,
                    background: `${tierDef.color}15`,
                    border: `1px solid ${tierDef.color}35`,
                    borderRadius: '999px', padding: '0.1rem 0.5rem',
                  }}>
                    {tierDef.icon} {tierDef.label}+
                  </span>
                </div>
              </div>

              {/* What it is */}
              <p style={{ fontSize: '0.85rem', color: '#aaa', lineHeight: 1.65, marginBottom: '1rem' }}>
                {s.what}
              </p>

              {/* Unlock condition */}
              <div style={{
                background: `${s.color}08`, border: `1px solid ${s.color}25`,
                borderRadius: '8px', padding: '0.65rem 0.85rem', marginBottom: s.howTo ? '1rem' : '1.25rem',
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: s.color, marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Unlock condition
                </div>
                <div style={{ fontSize: '0.82rem', color: '#aaa' }}>{s.unlocks}</div>
              </div>

              {/* How to unlock steps */}
              {s.howTo && (
                <div style={{ marginBottom: '1.25rem' }}>
                  <div style={lbl}>How to get there</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    {s.howTo.map((step, i) => (
                      <div key={i} style={{ display: 'flex', gap: '0.65rem', alignItems: 'flex-start' }}>
                        <span style={{
                          flexShrink: 0, width: '18px', height: '18px',
                          background: `${s.color}20`, border: `1px solid ${s.color}40`,
                          borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.6rem', fontWeight: 800, color: s.color, marginTop: '0.1rem',
                        }}>
                          {i + 1}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#aaa', lineHeight: 1.5 }}>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <button
                onClick={() => router.push(s.cta.href)}
                style={{
                  background: `${s.color}15`, border: `1px solid ${s.color}40`,
                  borderRadius: '8px', color: s.color,
                  fontSize: '0.82rem', fontWeight: 700,
                  padding: '0.6rem 1.1rem', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                {s.cta.label} →
              </button>
            </div>
          );
        })}

        {/* ── BOTTOM CTA ── */}
        <div style={{ ...cardStyle, textAlign: 'center', border: `1px solid ${accent}25` }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚡</div>
          <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.4rem' }}>
            Ready to climb?
          </div>
          <div style={{ fontSize: '0.82rem', color: muted, marginBottom: '1.25rem' }}>
            Every share earns 10 points. One share a day gets you to Rising in 10 days.
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/arena')} style={{
              background: accent, border: 'none', color: '#fff',
              borderRadius: '8px', padding: '0.65rem 1.25rem',
              fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
            }}>
              🏟 Open Arena
            </button>
            <button onClick={() => router.push('/create-ad')} style={{
              background: 'transparent', border: `1px solid ${accent}`,
              color: accent, borderRadius: '8px', padding: '0.65rem 1.1rem',
              fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
            }}>
              📢 Create Ad
            </button>
            {viewer && (
              <button onClick={() => router.push(`/profile/${encodeURIComponent(viewer.email)}`)} style={{
                background: 'transparent', border: `1px solid ${border}`,
                color: muted, borderRadius: '8px', padding: '0.65rem 1.1rem',
                fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer',
              }}>
                👤 My Profile
              </button>
            )}
          </div>
        </div>

      </div>

      <ArenaFooter />
    </div>
  );
}
