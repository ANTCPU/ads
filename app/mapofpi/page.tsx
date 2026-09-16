'use client';
// app/mapofpi/page.tsx
// ─── Map of Pi — Public Landing + Membership Entry Point ─────────────────────
// Public — no auth required. This is the country champion referral link.
//
// v2 (Sep 2026):
//   — Two CTAs: "Claim Your Country" + "Join the Arena" (VaultModal signup)
//   — Membership ladder — Trial → Member → Champion
//   — Live champion count from /api/brand/mapofpi
//   — VaultModal defaultMode prop — "Join Arena" opens signup tab directly
//   — Referral link copies /mapofpi (was /mapofpi/create-shop-ad)
//   — /mapofpi/icons/arena link → /arena/mapofpi (redirect already live)
//   — Pi price shows '—' on fail
//   — Social proof section — live active countries from DB
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { MAPOFPI_KB }     from '../clients/mapofpi/kb';
import { MAPOFPI_VIDEOS } from '../clients/mapofpi/assets';
import VaultModal         from '../components/VaultModal';

// ─── Design tokens ────────────────────────────────────────────────────────────

const green  = '#2E7D32';
const gold   = '#D4AF37';
const bg     = '#0a0a0a';
const card   = '#111';
const border = '#1a1a1a';
const white  = '#fff';
const muted  = '#888';
const muted2 = '#555';

// ─── Styles ───────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page:      { background: bg, color: white, fontFamily: 'system-ui, sans-serif', minHeight: '100vh' },
  nav:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2rem', borderBottom: `1px solid ${border}` },
  logo:      { fontWeight: 800, fontSize: '1rem', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '10px' },
  badge:     { display: 'inline-block', background: '#1a2a1a', border: `1px solid ${green}40`, borderRadius: '999px', padding: '0.3rem 1rem', fontSize: '0.75rem', color: gold, marginBottom: '1.5rem' },
  hero:      { textAlign: 'center', padding: '4rem 1.25rem 2.5rem' },
  h1:        { fontSize: 'clamp(2.2rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.05, marginBottom: '1.2rem', background: `linear-gradient(135deg, ${white} 40%, ${gold})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  sub:       { color: muted, fontSize: '1.1rem', maxWidth: '540px', margin: '0 auto 2rem', lineHeight: 1.6 },
  ctaPrimary:{ display: 'inline-block', background: gold, color: '#0a0a0a', padding: '1rem 2.5rem', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', fontSize: '1rem', border: 'none', cursor: 'pointer', letterSpacing: '0.02em' },
  ctaGreen:  { display: 'inline-block', background: green, color: white, padding: '1rem 2.5rem', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', fontSize: '1rem', border: 'none', cursor: 'pointer', letterSpacing: '0.02em' },
  ctaSecond: { display: 'inline-block', background: 'transparent', color: muted, padding: '0.85rem 1.5rem', borderRadius: '8px', fontWeight: 500, textDecoration: 'none', fontSize: '0.9rem', border: `1px solid #333`, cursor: 'pointer' },
  statsBar:  { display: 'flex', justifyContent: 'center', gap: '3rem', padding: '2rem', borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, flexWrap: 'wrap', alignItems: 'center' },
  statItem:  { textAlign: 'center' },
  statVal:   { fontSize: '2rem', fontWeight: 800, color: gold },
  statLbl:   { fontSize: '0.72rem', color: muted2, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' },
  section:   { maxWidth: '900px', margin: '0 auto', padding: '3.5rem 1.25rem' },
  h2:        { fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, marginBottom: '0.75rem', color: white },
  h2sub:     { color: muted, fontSize: '1rem', marginBottom: '2.5rem', lineHeight: 1.6 },
  card:      { background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.75rem' },
  partnerCard:{ background: '#0d1a0d', border: `1px solid ${green}30`, borderRadius: '16px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  pill:      { display: 'inline-block', background: '#1a2a1a', border: `1px solid ${green}40`, borderRadius: '999px', padding: '0.2rem 0.75rem', fontSize: '0.72rem', color: green, marginRight: '6px', marginBottom: '6px' },
  footer:    { textAlign: 'center', padding: '2rem', color: '#333', fontSize: '0.8rem', borderTop: `1px solid ${border}` },
};

// ─── Static content ───────────────────────────────────────────────────────────

const STATS_STATIC = [
  { v: '2.1M+', l: 'Registered Users' },
  { v: '148K',  l: 'Sellers'          },
  { v: '173K+', l: 'Transactions'     },
];

const CHAMPION_PERKS = [
  { icon: '🏴', text: 'Represent your country in the Arena'              },
  { icon: '🤖', text: '10 antbots run your campaign automatically'       },
  { icon: '📣', text: 'Your ads reach the full AD network'               },
  { icon: '🏆', text: 'Climb the leaderboard — top champion per country' },
  { icon: '🌐', text: 'Your brand goes global from day one'              },
];

const HOW_IT_WORKS = [
  { n: '01', title: 'Claim Your Country', desc: 'Sign up free — 90 days included. No credit card.'                  },
  { n: '02', title: 'Build Your Shop Ad', desc: 'Pick your icon, name your shop, choose your country. 2 minutes.'   },
  { n: '03', title: 'Antbots Go to Work', desc: 'Automated promotion starts immediately across the network.'         },
];

// ─── Membership ladder ────────────────────────────────────────────────────────
// Shows newcomers what they're joining and what's ahead.

const MEMBERSHIP_TIERS = [
  {
    tier:    'Trial',
    icon:    '🌱',
    color:   '#555',
    label:   '90 Days Free',
    perks:   ['Full arena access', '10 antbots assigned', 'Country Champion slot', 'Leaderboard ranking'],
    current: true,
  },
  {
    tier:  'Member',
    icon:  '⚡',
    color: '#0070f3',
    label: 'Active Member',
    perks: ['Priority placement', 'Increased impressions', 'Badge unlocks', 'Network distribution'],
    current: false,
  },
  {
    tier:  'Rising',
    icon:  '🚀',
    color: '#7928ca',
    label: 'Rising Tier',
    perks: ['Cross-channel distribution', 'Featured placement', 'Creator integrations'],
    current: false,
  },
  {
    tier:  'Champion',
    icon:  '🏆',
    color: '#D4AF37',
    label: 'Country Champion',
    perks: ['Top of country leaderboard', 'Full network reach', 'v2 online shopping access'],
    current: false,
  },
];

// ─── Video Carousel — unchanged ───────────────────────────────────────────────

function VideoCarousel() {
  const [tab, setTab] = useState<'anthem' | 'team' | 'howto' | 'community'>('team');
  const filtered = MAPOFPI_VIDEOS.filter(v => v.type === tab);

  const tabs: { key: typeof tab; label: string }[] = [
    { key: 'team',      label: '👥 Team'      },
    { key: 'howto',     label: '📖 How-To'    },
    { key: 'anthem',    label: '🎵 Anthem'    },
    { key: 'community', label: '🌍 Community' },
  ];

  return (
    <div style={{ borderTop: `1px solid ${border}`, padding: '3rem 1.25rem' }}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ fontSize: '0.65rem', color: green, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem', textAlign: 'center' }}>
          📺 Map of Pi Videos
        </div>
        <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, color: white, textAlign: 'center', marginBottom: '1.5rem' }}>
          Meet the team. Learn the platform.
        </h2>
        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              background:   tab === t.key ? `${green}22` : '#111',
              border:       `1px solid ${tab === t.key ? green : border}`,
              borderRadius: '999px', padding: '0.4rem 1rem',
              fontSize:     '0.78rem', color: tab === t.key ? green : muted,
              fontWeight:   tab === t.key ? 700 : 400, cursor: 'pointer',
              transition:   'all 0.15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '1rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {filtered.map(v => (
            <a key={v.id} href={`https://youtube.com/watch?v=${v.id}`} target="_blank" rel="noreferrer"
              style={{ flexShrink: 0, width: '220px', textDecoration: 'none' }}>
              <div style={{ position: 'relative', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${border}`, marginBottom: '0.5rem' }}>
                <img src={`https://img.youtube.com/vi/${v.id}/mqdefault.jpg`} alt={v.title} style={{ width: '100%', display: 'block' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: green, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>▶</div>
                </div>
              </div>
              <div style={{ fontSize: '0.78rem', color: white, fontWeight: 600, lineHeight: 1.3 }}>{v.title}</div>
              {v.featured && <div style={{ fontSize: '0.65rem', color: gold, marginTop: '0.2rem' }}>★ Featured</div>}
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MapOfPiSplash() {
  // vaultMode controls whether VaultModal opens in signin or signup tab
  const [vaultOpen,     setVaultOpen]     = useState(false);
  const [vaultMode,     setVaultMode]     = useState<'signin' | 'signup'>('signin');
  const [piPrice,       setPiPrice]       = useState('—');
  const [xlmPrice,      setXlmPrice]      = useState('—');
  const [activeCountries, setActiveCountries] = useState<number | null>(null);
  const [totalAds,      setTotalAds]      = useState<number | null>(null);
  const [referralCopied, setReferralCopied] = useState(false);

  useEffect(() => {
    // Pi + XLM price
    fetch('/pi-price')
      .then(r => r.json())
      .then(data => {
        const pi  = data['pi-network']?.usd;
        const xlm = data['stellar']?.usd;
        if (pi)  setPiPrice(`$${pi.toFixed(4)}`);
        if (xlm) setXlmPrice(`$${xlm.toFixed(4)}`);
      })
      .catch(() => {});

    // Live champion count from brands table
    // Replaces static "88 countries" — shows real active count
    fetch('/api/brand/mapofpi')
      .then(r => r.json())
      .then(data => {
        if (data.totalAds)    setTotalAds(data.totalAds);
        if (data.engagement)  {
          // Count unique countries from products breakdown
          const countries = (data.products || []).length;
          if (countries > 0) setActiveCountries(countries);
        }
      })
      .catch(() => {});
  }, []);

  function openVault(mode: 'signin' | 'signup') {
    setVaultMode(mode);
    setVaultOpen(true);
  }

  function copyReferral() {
    // FIX: was copying /mapofpi/create-shop-ad — now copies /mapofpi
    // The landing page itself is the referral link
    navigator.clipboard.writeText('https://antcpu-ads.vercel.app/mapofpi').then(() => {
      setReferralCopied(true);
      setTimeout(() => setReferralCopied(false), 2500);
    });
  }

  return (
    <div style={s.page}>

      {/* ── NAV ── */}
      <nav style={s.nav}>
        <div style={s.logo}>
          <span style={{ color: '#0070f3' }}>⚡</span>
          <span>AD NETWORK</span>
          <span style={{ color: muted2, fontWeight: 400 }}>×</span>
          <span>🗺️ Map of Pi</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button onClick={() => openVault('signup')}
            style={{ background: green, border: 'none', color: white, borderRadius: '8px', padding: '0.5rem 1.1rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700 }}>
            Join Arena →
          </button>
          <button onClick={() => openVault('signin')}
            style={{ background: 'none', border: `1px solid #333`, color: muted, borderRadius: '8px', padding: '0.5rem 1.1rem', cursor: 'pointer', fontSize: '0.85rem' }}>
            Sign In
          </button>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={s.hero}>
        <div style={s.badge}>🏆 Featured Partner · 2024 Pi Commerce Hackathon Winner</div>
        <h1 style={s.h1}>Your Country.<br />Your Arena.</h1>
        <p style={s.sub}>
          {MAPOFPI_KB.messaging.core}<br />
          <span style={{ color: gold }}>90 days free </span>
          for Map of Pi team members &amp; Country Champions.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {/* Primary — champion path */}
          <a href="/mapofpi/create-shop-ad" style={s.ctaPrimary}>
            Claim Your Country →
          </a>
          {/* Secondary — general membership path */}
          <button onClick={() => openVault('signup')} style={s.ctaGreen}>
            Join the Arena →
          </button>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <button onClick={() => openVault('signin')} style={{ background: 'none', border: 'none', color: muted2, cursor: 'pointer', fontSize: '0.85rem' }}>
            Already in the Arena? Sign In →
          </button>
        </div>
      </div>

      {/* ── STATS BAR — live where available ── */}
      <div style={s.statsBar}>
        {STATS_STATIC.map(x => (
          <div key={x.l} style={s.statItem}>
            <div style={s.statVal}>{x.v}</div>
            <div style={s.statLbl}>{x.l}</div>
          </div>
        ))}
        {activeCountries !== null && (
          <div style={s.statItem}>
            <div style={s.statVal}>{activeCountries}</div>
            <div style={s.statLbl}>Active Countries</div>
          </div>
        )}
        <div style={s.statItem}>
          <div style={s.statVal}>{piPrice}</div>
          <div style={s.statLbl}>Pi Price</div>
        </div>
        <div style={s.statItem}>
          <div style={s.statVal}>{xlmPrice}</div>
          <div style={s.statLbl}>XLM Price</div>
        </div>
      </div>

      {/* ── MEMBERSHIP LADDER ── */}
      <div style={s.section}>
        <div style={{ fontSize: '0.65rem', color: green, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          ⚡ Membership
        </div>
        <h2 style={s.h2}>Start free. Grow with the Arena.</h2>
        <p style={s.h2sub}>Every member starts on a 90-day free trial. No credit card. No commitment.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {MEMBERSHIP_TIERS.map((t, i) => (
            <div key={t.tier} style={{
              background:  i === 0 ? `${green}10` : card,
              border:      `1px solid ${i === 0 ? green + '40' : border}`,
              borderRadius: '14px', padding: '1.25rem',
              position:    'relative', overflow: 'hidden',
            }}>
              {i === 0 && (
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${green}, transparent)` }} />
              )}
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{t.icon}</div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: t.color, marginBottom: '0.2rem' }}>{t.tier}</div>
              <div style={{ fontSize: '0.7rem', color: muted2, marginBottom: '0.75rem', fontWeight: 600 }}>{t.label}</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {t.perks.map(p => (
                  <li key={p} style={{ fontSize: '0.78rem', color: muted, display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                    <span style={{ color: t.color, flexShrink: 0, marginTop: '1px' }}>✓</span>
                    {p}
                  </li>
                ))}
              </ul>
              {i === 0 && (
                <div style={{ marginTop: '1rem' }}>
                  <button onClick={() => openVault('signup')}
                    style={{ width: '100%', background: green, border: 'none', borderRadius: '8px', color: white, fontWeight: 700, fontSize: '0.82rem', padding: '0.6rem', cursor: 'pointer' }}>
                    Start Free →
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── COUNTRY CHAMPION ── */}
      <div style={{ ...s.section, borderTop: `1px solid ${border}` }}>
        <h2 style={s.h2}>What is a Country Champion?</h2>
        <p style={s.h2sub}>Any newcomer. Any country. Any brand. You show up — the Arena does the rest.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {CHAMPION_PERKS.map(p => (
            <div key={p.text} style={s.card}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.6rem' }}>{p.icon}</div>
              <div style={{ fontSize: '0.95rem', color: '#ccc', lineHeight: 1.5 }}>{p.text}</div>
            </div>
          ))}
        </div>
        <p style={{ color: muted2, fontSize: '0.9rem', marginTop: '1.5rem', textAlign: 'center' }}>No experience needed. Just show up.</p>
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{ ...s.section, borderTop: `1px solid ${border}` }}>
        <h2 style={{ ...s.h2, textAlign: 'center' }}>Up and running in minutes.</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
          {HOW_IT_WORKS.map(step => (
            <div key={step.n} style={s.card}>
              <div style={{ fontSize: '0.75rem', color: gold, fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.75rem' }}>{step.n}</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>{step.title}</div>
              <div style={{ color: muted, fontSize: '0.88rem', lineHeight: 1.5 }}>{step.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── SOCIAL PROOF ── */}
      {(activeCountries !== null || totalAds !== null) && (
        <div style={{ ...s.section, borderTop: `1px solid ${border}`, textAlign: 'center' }}>
          <div style={{ fontSize: '0.65rem', color: gold, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            🌍 Live in the Arena
          </div>
          <h2 style={{ ...s.h2, textAlign: 'center' }}>
            {activeCountries !== null ? `${activeCountries} countries` : ''}{activeCountries !== null && totalAds !== null ? ' · ' : ''}{totalAds !== null ? `${totalAds} active ads` : ''}
          </h2>
          <p style={{ color: muted, fontSize: '0.95rem', marginTop: '0.5rem' }}>
            Real champions. Real commerce. Running right now.
          </p>
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/arena/mapofpi" style={{ ...s.ctaSecond, color: gold, borderColor: `${gold}40` }}>
              🏆 View Champions →
            </a>
            <a href="/champions" style={{ ...s.ctaSecond }}>
              🌍 Country Board →
            </a>
          </div>
        </div>
      )}

      {/* ── MAP OF PI PARTNER BLOCK ── */}
      <div style={{ ...s.section, borderTop: `1px solid ${border}` }}>
        <div style={s.partnerCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MAPOFPI_KB.brand.logoUrl} alt="Map of Pi" width={48} height={48} style={{ borderRadius: '10px' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{MAPOFPI_KB.name}</div>
              <div style={{ color: muted, fontSize: '0.85rem' }}>{MAPOFPI_KB.tagline}</div>
            </div>
          </div>
          <div>{MAPOFPI_KB.awards.map(a => <span key={a} style={s.pill}>{a}</span>)}</div>
          <p style={{ color: muted, fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>{MAPOFPI_KB.messaging.utility}</p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a href={MAPOFPI_KB.url} target="_blank" rel="noreferrer"
              style={{ ...s.ctaPrimary, padding: '0.7rem 1.5rem', fontSize: '0.9rem' }}>
              Visit Map of Pi →
            </a>
            <a href="https://youtube.com/@mapofpi" target="_blank" rel="noreferrer"
              style={{ ...s.ctaSecond, padding: '0.7rem 1.5rem', fontSize: '0.9rem' }}>
              ▶ YouTube
            </a>
            {/* FIX: was /mapofpi/icons/arena — now /arena/mapofpi */}
            <a href="/arena/mapofpi"
              style={{ ...s.ctaSecond, padding: '0.7rem 1.5rem', fontSize: '0.9rem', color: gold, borderColor: `${gold}40` }}>
              🗺️ Country Champions →
            </a>
          </div>
        </div>
      </div>

      {/* ── ANTHEM ── */}
      <div style={{ ...s.section, borderTop: `1px solid ${border}`, textAlign: 'center' }}>
        <div style={{ fontSize: '0.65rem', color: green, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          🎵 Map of Pi Anthem
        </div>
        <h2 style={{ ...s.h2, textAlign: 'center', marginBottom: '1.5rem' }}>The sound of Pi commerce.</h2>
        <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: '16px', overflow: 'hidden', border: `1px solid ${green}40`, maxWidth: '680px', margin: '0 auto' }}>
          <iframe
            src="https://www.youtube.com/embed/PNoY1ffzciI?rel=0"
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>

      {/* ── VIDEO CAROUSEL ── */}
      <VideoCarousel />

      {/* ── FINAL CTA ── */}
      <div style={{ ...s.section, textAlign: 'center', borderTop: `1px solid ${border}` }}>
        <h2 style={{ ...s.h2, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>Your country is waiting.</h2>
        <p style={{ color: muted, marginBottom: '2rem', fontSize: '0.95rem' }}>
          90 days free · No credit card · Cancel anytime
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <a href="/mapofpi/create-shop-ad"
            style={{ ...s.ctaPrimary, padding: '1.1rem 3rem', fontSize: '1.1rem' }}>
            Claim Your Country →
          </a>
          <button onClick={() => openVault('signup')}
            style={{ ...s.ctaGreen, padding: '1.1rem 3rem', fontSize: '1.1rem' }}>
            Join the Arena →
          </button>
        </div>
        <div style={{ marginTop: '0.75rem' }}>
          <button onClick={copyReferral}
            style={{ display: 'inline-block', background: 'transparent', color: referralCopied ? '#22c55e' : gold, padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', border: `1px solid ${referralCopied ? '#22c55e40' : gold + '40'}`, cursor: 'pointer', transition: 'all 0.2s' }}>
            {referralCopied ? '✅ Copied!' : '📋 Copy Referral Link'}
          </button>
        </div>
        <div style={{ marginTop: '1.25rem' }}>
          <button onClick={() => openVault('signin')}
            style={{ background: 'none', border: 'none', color: muted2, cursor: 'pointer', fontSize: '0.85rem' }}>
            Already in the Arena? Sign In →
          </button>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer style={s.footer}>
        © {new Date().getFullYear()} AD NETWORK ·{' '}
        <span style={{ color: '#0070f3' }}>⚡ ANTCPU</span> × <span style={{ color: gold }}>🗺️ Map of Pi</span>
      </footer>

      <VaultModal
        open={vaultOpen}
        onClose={() => setVaultOpen(false)}
        onSuccess={() => {}}
        defaultMode={vaultMode}
      />
    </div>
  );
}
