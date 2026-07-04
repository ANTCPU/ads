'use client';

import React, { useState, useEffect } from 'react';
import { MAPOFPI_KB } from '../clients/mapofpi/kb';
import VaultModal from '../components/VaultModal';

const green = '#2E7D32';
const gold = '#D4AF37';
const bg = '#0a0a0a';
const card = '#111';
const border = '#1a1a1a';
const white = '#fff';
const muted = '#888';
const muted2 = '#555';

const s: Record<string, React.CSSProperties> = {
  page: { background: bg, color: white, fontFamily: 'system-ui, sans-serif', minHeight: '100vh' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2rem', borderBottom: `1px solid ${border}` },
  logo: { fontWeight: 800, fontSize: '1rem', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '10px' },
  badge: { display: 'inline-block', background: '#1a2a1a', border: `1px solid ${green}40`, borderRadius: '999px', padding: '0.3rem 1rem', fontSize: '0.75rem', color: gold, marginBottom: '1.5rem' },
  hero: { textAlign: 'center', padding: '4rem 1.25rem 2.5rem' },
  h1: { fontSize: 'clamp(2.2rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.05, marginBottom: '1.2rem', background: `linear-gradient(135deg, ${white} 40%, ${gold})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' },
  sub: { color: muted, fontSize: '1.1rem', maxWidth: '540px', margin: '0 auto 2rem', lineHeight: 1.6 },
  ctaBtn: { display: 'inline-block', background: gold, color: '#0a0a0a', padding: '1rem 2.5rem', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', fontSize: '1rem', border: 'none', cursor: 'pointer', letterSpacing: '0.02em' },
  ctaSecond: { display: 'inline-block', background: 'transparent', color: muted, padding: '0.85rem 1.5rem', borderRadius: '8px', fontWeight: 500, textDecoration: 'none', fontSize: '0.9rem', border: `1px solid #333`, cursor: 'pointer' },
  statsBar: { display: 'flex', justifyContent: 'center', gap: '3rem', padding: '2rem', borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, flexWrap: 'wrap' },
  statVal: { fontSize: '2rem', fontWeight: 800, color: gold },
  statLbl: { fontSize: '0.72rem', color: muted2, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '4px' },
  section: { maxWidth: '900px', margin: '0 auto', padding: '3.5rem 1.25rem' },
  h2: { fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, marginBottom: '0.75rem', color: white },
  h2sub: { color: muted, fontSize: '1rem', marginBottom: '2.5rem', lineHeight: 1.6 },
  card: { background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.75rem' },
  partnerCard: { background: '#0d1a0d', border: `1px solid ${green}30`, borderRadius: '16px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' },
  pill: { display: 'inline-block', background: '#1a2a1a', border: `1px solid ${green}40`, borderRadius: '999px', padding: '0.2rem 0.75rem', fontSize: '0.72rem', color: green, marginRight: '6px', marginBottom: '6px' },
  footer: { textAlign: 'center', padding: '2rem', color: '#333', fontSize: '0.8rem', borderTop: `1px solid ${border}` },
};

const STATS_STATIC = [
  { v: '2.1M+', l: 'Registered Users' },
  { v: '148K', l: 'Sellers' },
  { v: '173K+', l: 'Transactions' },
];

const CHAMPION_PERKS = [
  { icon: '🏴', text: 'Represent your country in the Arena' },
  { icon: '🤖', text: '10 antbots run your campaign automatically' },
  { icon: '📣', text: 'Your ads reach the full AD network' },
  { icon: '🏆', text: 'Climb the leaderboard — top champion per country wins' },
  { icon: '🌐', text: 'Your brand goes global from day one' },
];

const HOW_IT_WORKS = [
  { n: '01', title: 'Claim Your Country', desc: 'Sign up free — 90 days included. No credit card.' },
  { n: '02', title: 'Submit Your Ad', desc: 'Title, URL, description. 2 minutes to set up.' },
  { n: '03', title: 'Antbots Go to Work', desc: 'Automated promotion starts immediately across the network.' },
];

export default function MapOfPiSplash() {
  const [vaultOpen, setVaultOpen] = useState(false);
  const [piPrice, setPiPrice] = useState<string>('...');

  useEffect(() => {
    fetch('/pi-price')
      .then((res) => res.json())
      .then((data) => {
        const price = data['pi-network']?.usd;
        if (price) setPiPrice(`$${price.toFixed(4)}`);
      });
  }, []);

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
        <button onClick={() => setVaultOpen(true)} style={{ background: 'none', border: `1px solid #333`, color: muted, borderRadius: '8px', padding: '0.5rem 1.1rem', cursor: 'pointer', fontSize: '0.85rem' }}>
          Sign In →
        </button>
      </nav>

      {/* ── HERO ── */}
      <div style={s.hero}>
        <div style={s.badge}>🏆 Featured Partner · 2024 Pi Commerce Hackathon Winner</div>
        <h1 style={s.h1}>Your Country.<br />Your Arena.</h1>
        <p style={s.sub}>
          {MAPOFPI_KB.messaging.core}<br />
          <span style={{ color: gold }}>90 days free </span> for Map of Pi team members &amp; Country Champions.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/login?promo=MAPOFPI" style={s.ctaBtn}>Claim Your Country →</a>
          <button onClick={() => setVaultOpen(true)} style={s.ctaSecond}>Already in the Arena?</button>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div style={s.statsBar}>
        {STATS_STATIC.map(x => (
          <div key={x.l} style={{ textAlign: 'center' }}>
            <div style={s.statVal}>{x.v}</div>
            <div style={s.statLbl}>{x.l}</div>
          </div>
        ))}
        <div style={{ textAlign: 'center' }}>
          <div style={s.statVal}>{piPrice}</div>
          <div style={s.statLbl}>Pi Price</div>
        </div>
      </div>

      {/* ── COUNTRY CHAMPION ── */}
      <div style={s.section}>
        <h2 style={s.h2}>What is a Country Champion?</h2>
        <p style={s.h2sub}>
          Any newcomer. Any country. Any brand. You show up — the Arena does the rest.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {CHAMPION_PERKS.map(p => (
            <div key={p.text} style={s.card}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.6rem' }}>{p.icon}</div>
              <div style={{ fontSize: '0.95rem', color: '#ccc', lineHeight: 1.5 }}>{p.text}</div>
            </div>
          ))}
        </div>
        <p style={{ color: muted2, fontSize: '0.9rem', marginTop: '1.5rem', textAlign: 'center' }}>
          No experience needed. Just show up.
        </p>
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

      {/* ── MAP OF PI PARTNER BLOCK ── */}
      <div style={s.section}>
        <div style={s.partnerCard}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <img src={MAPOFPI_KB.brand.logoUrl} alt="Map of Pi" width={48} height={48} style={{ borderRadius: '10px' }} />
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{MAPOFPI_KB.name}</div>
              <div style={{ color: muted, fontSize: '0.85rem' }}>{MAPOFPI_KB.tagline}</div>
            </div>
          </div>
          <div>
            {MAPOFPI_KB.awards.map(a => (
              <span key={a} style={s.pill}>{a}</span>
            ))}
          </div>
          <p style={{ color: muted, fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
            {MAPOFPI_KB.messaging.utility}
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a href={MAPOFPI_KB.url} target="_blank" rel="noreferrer" style={{ ...s.ctaBtn, padding: '0.7rem 1.5rem', fontSize: '0.9rem' }}>
              Visit Map of Pi →
            </a>
            <a href="https://youtube.com/@mapofpi" target="_blank" rel="noreferrer" style={{ ...s.ctaSecond, padding: '0.7rem 1.5rem', fontSize: '0.9rem' }}>
              ▶ YouTube
            </a>
          </div>
        </div>
      </div>

      {/* ── FINAL CTA ── */}
      <div style={{ ...s.section, textAlign: 'center', borderTop: `1px solid ${border}` }}>
        <h2 style={{ ...s.h2, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)' }}>
          Your country is waiting.
        </h2>
        <p style={{ color: muted, marginBottom: '2rem', fontSize: '0.95rem' }}>
          90 days free · No credit card · Cancel anytime
        </p>
        <a href="/login?promo=MAPOFPI" style={{ ...s.ctaBtn, padding: '1.1rem 3rem', fontSize: '1.1rem' }}>
          Claim Your Country →
        </a>
        <button onClick={() => {
          navigator.clipboard.writeText('https://antcpu-ads.vercel.app/mapofpi?promo=MAPOFPI');
        }} style={{
          display: 'inline-block',
          background: 'transparent',
          color: gold,
          padding: '0.75rem 1.5rem',
          borderRadius: '8px',
          fontWeight: 600,
          fontSize: '0.85rem',
          border: `1px solid ${gold}40`,
          cursor: 'pointer',
          marginTop: '0.75rem',
        }}>
          📋 Copy Referral Link
        </button>
        <div style={{ marginTop: '1.25rem' }}>
          <button onClick={() => setVaultOpen(true)} style={{ background: 'none', border: 'none', color: muted2, cursor: 'pointer', fontSize: '0.85rem' }}>
            Already in the Arena? Sign In →
          </button>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer style={s.footer}>
        © {new Date().getFullYear()} AD NETWORK · {' '}
        <span style={{ color: '#0070f3' }}>⚡ ANTCPU</span> × <span style={{ color: gold }}>🗺️ Map of Pi</span>
      </footer>

      <VaultModal open={vaultOpen} onClose={() => setVaultOpen(false)} onSuccess={() => {}} />

    </div>
  );
}
