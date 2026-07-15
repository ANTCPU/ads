'use client';
import VaultModal from './components/VaultModal';
import React, { useState, useEffect } from 'react';
import { t, isRTL, Locale } from './lib/i18n/index';
import LanguageSwitcher from './components/LanguageSwitcher';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SplashPage({ locale = 'en' }: { locale?: Locale }) {
  const [scrolled,   setScrolled]   = useState(false);
  const [mounted,    setMounted]    = useState(false);
  const [vaultOpen,  setVaultOpen]  = useState(false);
  const [piPrice,    setPiPrice]    = useState('...');
  const [liveAds,    setLiveAds]    = useState<number | null>(null);
  const [liveBrands, setLiveBrands] = useState<number | null>(null);
  const [liveCountries, setLiveCountries] = useState<number | null>(null);
  const [livePoints, setLivePoints] = useState<number | null>(null);
  const rtl = isRTL(locale);

  useEffect(() => {
    setMounted(true);

    // Pi price
    fetch('/pi-price')
      .then(r => r.json())
      .then(d => {
        const pi = d['pi-network']?.usd;
        if (pi) setPiPrice(`$${pi.toFixed(4)}`);
      })
      .catch(() => {});

    // Live Arena stats
    supabase
      .from('ads')
      .select('brand, country, points')
      .eq('status', 'active')
      .then(({ data }) => {
        if (!data) return;
        setLiveAds(data.length);
        setLiveBrands(new Set(data.map((a: any) => a.brand)).size);
        setLiveCountries(new Set(data.map((a: any) => a.country).filter(Boolean)).size);
        setLivePoints(data.reduce((s: number, a: any) => s + (a.points || 0), 0));
      });

    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // ── TOKENS ────────────────────────────────────────────────────
  const bg      = '#0a0a0a';
  const card    = '#111';
  const border  = '#1a1a1a';
  const border2 = '#222';
  const blue    = '#0070f3';
  const orange  = '#f0883e';
  const purple  = '#7928ca';
  const gold    = '#D4AF37';
  const teal    = '#00ffcc';
  const white   = '#fff';
  const muted   = '#888';
  const muted2  = '#555';

  // ── STYLES ────────────────────────────────────────────────────
  const navStyle: React.CSSProperties = {
    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 clamp(16px, 5vw, 48px)', height: '60px',
    background: scrolled ? 'rgba(10,10,10,0.92)' : bg,
    backdropFilter: scrolled ? 'blur(12px)' : 'none',
    borderBottom: `1px solid ${border}`,
    transition: 'background 0.3s, backdrop-filter 0.3s',
  };

  const sectionStyle: React.CSSProperties = {
    maxWidth: '1100px', margin: '0 auto',
    padding: '0 clamp(16px, 5vw, 48px)',
  };

  const sectionHeadStyle: React.CSSProperties = {
    fontSize: 'clamp(11px, 1.2vw, 12px)', fontWeight: 700,
    letterSpacing: '3px', textTransform: 'uppercase' as const,
    color: muted2, marginBottom: '16px',
  };

  const h2Style: React.CSSProperties = {
    fontSize: 'clamp(28px, 4vw, 42px)', fontWeight: 800,
    letterSpacing: '-1px', color: white,
    marginBottom: '16px', lineHeight: 1.1,
  };

  const gridLine: React.CSSProperties = {
    position: 'absolute',
    background: 'linear-gradient(to bottom, transparent, #ffffff08, transparent)',
    top: 0, bottom: 0, width: '1px',
  };

  // ── KEYFRAMES ─────────────────────────────────────────────────
  const keyframes = `
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.5; }
    }
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(0,112,243,0.3); }
      50%       { box-shadow: 0 0 40px rgba(0,112,243,0.6); }
    }
    .cta-btn:hover        { opacity: 0.85; transform: translateY(-1px); }
    .cta-ghost:hover      { background: #ffffff10 !important; }
    .sign-in-link:hover   { color: #ccc !important; }
    .ladder-row:hover     { background: #161616 !important; }
    .pricing-card:hover   { border-color: #333 !important; transform: translateY(-4px); }
    .nav-link:hover       { color: #ccc !important; }
    .proof-stat:hover     { border-color: #333 !important; }
  `;

  // ── DATA ──────────────────────────────────────────────────────
  const steps = [
    { num: '01', title: 'Sign Up Free',    desc: 'Name, email, brand. 60 seconds. No card required.' },
    { num: '02', title: 'Submit Your Ad',  desc: 'Title, URL, description. Your ad is ready in 2 minutes.' },
    { num: '03', title: 'Go Live',         desc: 'Aria reviews it. You go live same day.' },
    { num: '04', title: 'Earn Points',     desc: 'Share, get clicks, likes, boosts. Points drive your rank.' },
  ];

  const ladder = [
    { tier: 'Entry',    color: teal,   pts: 'Start here — free', desc: 'Standard rotation across the network' },
    { tier: 'Rising',   color: blue,   pts: 'Earn 100 pts',      desc: 'Higher priority + increased impressions' },
    { tier: 'Featured', color: orange, pts: 'Earn 300 pts',      desc: 'Featured placement + cross-channel distribution' },
    { tier: 'Top Tier', color: gold,   pts: 'Earn 750 pts',      desc: 'Full network + creator channel integrations' },
  ];

  const plans = [
    {
      name: 'Trial', price: 'Free', period: '3 days',
      badge: '', badgeColor: '', color: teal,
      features: [
        'Text ad in Arena',
        'Aria reviews your ad 🦋',
        'Basic agent previews',
        'Entry tier placement',
      ],
      cta: 'Start Free →', disabled: false,
    },
    {
      name: 'Arena', price: '$9.99', period: '/mo',
      badge: 'Most Popular', badgeColor: orange, color: orange,
      features: [
        'Everything in Free',
        'Entry tier · promote to earn points',
        'Aria + Herald messages',
        'Scout basic stats 🔍',
        'Earn 1-use agent actions',
        'Forge ad review ⚙️',
      ],
      cta: 'Start Free Trial →', disabled: false,
    },
    {
      name: 'Pro', price: '$27', period: '/mo',
      badge: 'Coming Soon', badgeColor: purple, color: purple,
      features: [
        'Everything in Arena',
        '🔒 Rising tier — coming soon',
        'Full agent suite unlocked',
        'Herald email digest 📣',
        'Scout analytics dashboard',
        'Ledger billing panel 💰',
      ],
      cta: 'Coming Soon', disabled: true,
    },
    {
      name: 'Deluxe', price: '$79', period: '/mo',
      badge: 'Coming Soon', badgeColor: gold, color: gold,
      features: [
        'Everything in Pro',
        '🔒 Featured tier — coming soon',
        '10-antbot campaign',
        'Custom agent brand voice',
        'Vault account protection 🔒',
        'Weekly performance reports',
      ],
      cta: 'Coming Soon', disabled: true,
    },
  ];

  // ── RENDER ────────────────────────────────────────────────────
  return (
    <div style={{ background: bg, color: white, fontFamily: 'system-ui, sans-serif', direction: rtl ? 'rtl' : 'ltr' }}>
      <style>{keyframes}</style>

      {/* ── NAV ─────────────────────────────────────────────── */}
      <nav style={navStyle}>
        <a href="/" style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.5px', color: white, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          ⚡ ANTCPU ADS
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LanguageSwitcher locale={locale} />
          <a href="/arena"      className="nav-link" style={{ color: muted2, textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '8px 12px' }}>Arena</a>
          <a href="/guide"      className="nav-link" style={{ color: muted2, textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '8px 12px' }}>Guide</a>
          <a href="/champions"  className="nav-link" style={{ color: muted2, textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '8px 12px' }}>Champions</a>
          <a href="/login"      className="sign-in-link" style={{ color: muted, textDecoration: 'none', fontSize: '14px', fontWeight: 500, padding: '8px 14px', borderRadius: '8px' }}>Sign In</a>
          <a href="/login"      className="cta-btn" style={{ background: blue, color: white, border: 'none', borderRadius: '8px', padding: '9px 18px', fontSize: '14px', fontWeight: 700, cursor: 'pointer', textDecoration: 'none', letterSpacing: '-0.2px', transition: 'opacity 0.2s, transform 0.15s', display: 'inline-block' }}>
            Start Free →
          </a>
        </div>
      </nav>

      {/* ── PAGE WRAPPER ─────────────────────────────────────── */}
      <div style={{ paddingTop: '60px' }}>

        {/* ── HERO ─────────────────────────────────────────── */}
        <section style={{ position: 'relative', overflow: 'hidden', padding: 'clamp(80px, 12vw, 140px) 0 clamp(60px, 8vw, 100px)' }}>
          {/* Grid lines */}
          {[15, 30, 50, 70, 85].map((pct, i) => (
            <div key={i} style={{ ...gridLine, left: `${pct}%` }} />
          ))}
          {/* Radial glow */}
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '600px', height: '600px', background: 'radial-gradient(circle, rgba(0,112,243,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ ...sectionStyle, textAlign: 'center', position: 'relative', zIndex: 1 }}>
            {/* Badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#ffffff08', border: `1px solid ${border2}`, borderRadius: '999px', padding: '6px 14px', fontSize: '13px', color: muted, marginBottom: '28px', animation: 'fadeUp 0.6s ease both' }}>
              <span>⚡</span>
              <span>{t(locale, 'hero_badge')}</span>
            </div>

            {/* Headline */}
            <h1 style={{ fontSize: 'clamp(40px, 7vw, 80px)', fontWeight: 800, letterSpacing: '-2px', lineHeight: 1.05, color: white, margin: '0 0 20px', animation: 'fadeUp 0.6s ease 0.1s both' }}>
              Your Brand.<br />
              <span style={{ color: blue }}>Live Today.</span> Free.
            </h1>

            {/* Sub */}
            <p style={{ fontSize: 'clamp(16px, 2vw, 20px)', color: muted, maxWidth: '520px', margin: '0 auto 12px', lineHeight: 1.6, animation: 'fadeUp 0.6s ease 0.2s both' }}>
              The ad network that rewards you for promoting. Real brands. Real engagement. Real results.
            </p>

            {/* Flow hint */}
            <p style={{ fontSize: '13px', color: muted2, marginBottom: '36px', animation: 'fadeUp 0.6s ease 0.25s both' }}>
              Name · Brand · Email · You're live.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp 0.6s ease 0.3s both' }}>
              <a href="/login" className="cta-btn" style={{ background: blue, color: white, borderRadius: '10px', padding: '14px 32px', fontSize: '16px', fontWeight: 800, textDecoration: 'none', display: 'inline-block', letterSpacing: '-0.3px', transition: 'opacity 0.2s, transform 0.15s' }}>
                Start Free Trial →
              </a>
              <a href="/arena" className="cta-ghost" style={{ background: '#ffffff08', border: `1px solid ${border2}`, color: white, borderRadius: '10px', padding: '14px 32px', fontSize: '16px', fontWeight: 700, textDecoration: 'none', display: 'inline-block', transition: 'background 0.2s' }}>
                Browse the Arena →
              </a>
            </div>

            {/* Trust line */}
            <p style={{ fontSize: '12px', color: muted2, marginTop: '16px', animation: 'fadeUp 0.6s ease 0.35s both' }}>
              Free 3-day trial · $9.99/mo after · No contract · Cancel anytime
            </p>
          </div>
        </section>

        {/* ── LIVE PROOF BAR ───────────────────────────────── */}
        <section style={{ borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, padding: '28px 0' }}>
          <div style={{ ...sectionStyle, display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {[
              { value: liveAds    !== null ? String(liveAds)    : '…', label: 'Live Ads',      color: blue   },
              { value: liveBrands !== null ? String(liveBrands) : '…', label: 'Brands',        color: orange },
              { value: liveCountries !== null ? String(liveCountries) : '…', label: 'Countries', color: gold },
              { value: livePoints !== null ? livePoints.toLocaleString() : '…', label: 'Total Points', color: teal },
            ].map(s => (
              <div key={s.label} className="proof-stat" style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '0.85rem 1.75rem', textAlign: 'center', minWidth: '110px', transition: 'border-color 0.2s' }}>
                <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, letterSpacing: '-1px' }}>{s.value}</div>
                <div style={{ fontSize: '0.68rem', color: muted2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ─────────────────────────────────── */}
        <section style={{ padding: 'clamp(60px, 8vw, 100px) 0' }}>
          <div style={sectionStyle}>
            <div style={sectionHeadStyle}>How it works</div>
            <h2 style={h2Style}>Up and running in minutes.</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px', marginTop: '40px' }}>
              {steps.map((s, i) => (
                <div key={i} style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.5rem' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: 800, color: blue, letterSpacing: '2px', marginBottom: '0.75rem' }}>{s.num}</div>
                  <div style={{ fontWeight: 700, fontSize: '1rem', color: white, marginBottom: '0.4rem' }}>{s.title}</div>
                  <div style={{ fontSize: '0.82rem', color: muted, lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── THE LADDER ───────────────────────────────────── */}
        <section style={{ padding: 'clamp(60px, 8vw, 100px) 0', borderTop: `1px solid ${border}` }}>
          <div style={sectionStyle}>
            <div style={sectionHeadStyle}>Promotion System</div>
            <h2 style={h2Style}>The Ladder.</h2>
            <p style={{ color: muted, fontSize: '0.95rem', marginBottom: '32px', maxWidth: '480px' }}>
              Earn points through clicks, shares, likes, boosts and reactions. Points drive your rank. Higher rank means more reach.
            </p>
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', overflow: 'hidden' }}>
              {ladder.map((row, i) => (
                <div key={i} className="ladder-row" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.5rem', borderBottom: i < ladder.length - 1 ? `1px solid ${border}` : 'none', transition: 'background 0.15s' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: row.color, flexShrink: 0 }} />
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', color: white, minWidth: '90px' }}>{row.tier}</div>
                  <div style={{ fontSize: '0.82rem', color: muted, flex: 1 }}>{row.desc}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: row.color, whiteSpace: 'nowrap' }}>{row.pts}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
                {/* ── PRICING ──────────────────────────────────────── */}
        <section style={{ padding: 'clamp(60px, 8vw, 100px) 0', borderTop: `1px solid ${border}` }}>
          <div style={sectionStyle}>
            <div style={sectionHeadStyle}>Pricing</div>
            <h2 style={h2Style}>Simple, transparent pricing.</h2>
            <p style={{ color: muted, fontSize: '0.95rem', marginBottom: '40px' }}>
              Start free. No credit card. Cancel anytime.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {plans.map((plan, i) => (
                <div key={i} className="pricing-card" style={{ background: card, border: `1px solid ${plan.badge === 'Most Popular' ? plan.color + '60' : border}`, borderRadius: '16px', padding: '1.75rem', position: 'relative', transition: 'border-color 0.2s, transform 0.2s', display: 'flex', flexDirection: 'column' }}>
                  {plan.badge && (
                    <div style={{ position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)', background: plan.badgeColor, color: '#000', borderRadius: '999px', padding: '3px 12px', fontSize: '11px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {plan.badge}
                    </div>
                  )}
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: plan.color, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '0.5rem' }}>{plan.name}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                      <span style={{ fontSize: '2rem', fontWeight: 800, color: white, letterSpacing: '-1px' }}>{plan.price}</span>
                      <span style={{ fontSize: '0.85rem', color: muted }}>{plan.period}</span>
                    </div>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', flex: 1 }}>
                    {plan.features.map((f, j) => (
                      <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '0.82rem', color: muted, marginBottom: '0.6rem', lineHeight: 1.5 }}>
                        <span style={{ color: plan.color, fontWeight: 700, flexShrink: 0 }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  {plan.disabled ? (
                    <div style={{ background: border, color: muted2, borderRadius: '8px', padding: '0.75rem', fontSize: '0.85rem', fontWeight: 700, textAlign: 'center' }}>
                      Coming Soon
                    </div>
                  ) : (
                    <a href="/login" className="cta-btn" style={{ background: plan.color, color: plan.color === teal ? '#000' : '#000', borderRadius: '8px', padding: '0.75rem', fontSize: '0.88rem', fontWeight: 800, textDecoration: 'none', textAlign: 'center', display: 'block', transition: 'opacity 0.2s, transform 0.15s' }}>
                      {plan.cta}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── FEATURED PARTNER PANEL ───────────────────────── */}
        <section style={{ padding: 'clamp(60px, 8vw, 100px) 0', borderTop: `1px solid ${border}` }}>
          <div style={sectionStyle}>
            <div style={sectionHeadStyle}>Featured Partner</div>
            <div style={{ background: card, border: `1px solid ${gold}30`, borderRadius: '20px', padding: 'clamp(1.5rem, 4vw, 2.5rem)', position: 'relative', overflow: 'hidden' }}>

              {/* Gold corner glow */}
              <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '300px', background: `radial-gradient(circle at top right, ${gold}12, transparent 70%)`, pointerEvents: 'none' }} />
              {/* Gold top accent line */}
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${gold}, transparent)` }} />

              {/* Header row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '2.2rem' }}>🗺️</div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', color: white }}>Map of Pi</div>
                  <div style={{ fontSize: '0.72rem', color: gold, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Featured Partner · 🏆 2024 Pi Commerce Hackathon Winner</div>
                </div>
              </div>

              {/* Description */}
              <p style={{ fontSize: '0.88rem', color: muted, lineHeight: 1.7, maxWidth: '600px', marginBottom: '1.5rem' }}>
                The world's largest Pi commerce platform. Map of Pi connects buyers and sellers across 88 countries using Pi Network cryptocurrency. Every Map of Pi user in the Arena is a Country Champion representing their nation.
              </p>

              {/* Stats grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {[
                  { v: '2.1M+',   l: 'Registered Users' },
                  { v: '148K',    l: 'Sellers'           },
                  { v: '173K+',   l: 'Transactions'      },
                  { v: piPrice,   l: 'Pi Price'          },
                  { v: '88',      l: 'Countries'         },
                  { v: '8',       l: 'Languages'         },
                ].map((st, i) => (
                  <div key={i} style={{ background: `${gold}08`, border: `1px solid ${gold}20`, borderRadius: '10px', padding: '0.75rem', textAlign: 'center' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: gold }}>{st.v}</div>
                    <div style={{ fontSize: '0.65rem', color: muted2, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>{st.l}</div>
                  </div>
                ))}
              </div>

              {/* Country Champion program */}
              <div style={{ background: `${gold}08`, border: `1px solid ${gold}25`, borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.88rem', color: gold, marginBottom: '0.3rem' }}>
                  🏆 Country Champion Program
                </div>
                <div style={{ fontSize: '0.8rem', color: muted, lineHeight: 1.6 }}>
                  90 days free · 10 AI antbots deployed · Represent your country in the Arena.
                  Every Map of Pi pioneer is automatically a Country Champion for their nation.
                  Share their ads. Help them climb the ladder.
                </div>
              </div>

              {/* CTA links */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <a href="/champions" style={{ background: gold, color: '#000', borderRadius: '8px', padding: '0.65rem 1.25rem', fontSize: '0.85rem', fontWeight: 800, textDecoration: 'none', display: 'inline-block' }}>
                  🏆 View Champions →
                </a>
                <a href="/mapofpi" style={{ background: `${gold}15`, border: `1px solid ${gold}40`, color: gold, borderRadius: '8px', padding: '0.65rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
                  🗺️ Claim Your Country →
                </a>
                <a href="https://youtube.com/@mapofpi" target="_blank" rel="noopener noreferrer" style={{ background: '#ff000015', border: '1px solid #ff000030', color: '#ff4444', borderRadius: '8px', padding: '0.65rem 1.25rem', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
                  ▶ YouTube
                </a>
              </div>

            </div>
          </div>
        </section>

        {/* ── FINAL CTA ─────────────────────────────────────── */}
        <section style={{ padding: 'clamp(80px, 10vw, 120px) 0', borderTop: `1px solid ${border}` }}>
          <div style={{ ...sectionStyle, textAlign: 'center' }}>
            <div style={sectionHeadStyle}>{t(locale, 'final_section_label')}</div>
            <h2 style={{ ...h2Style, fontSize: 'clamp(32px, 5vw, 56px)' }}>
              {t(locale, 'final_title')}
            </h2>
            <p style={{ color: muted, fontSize: '0.95rem', marginBottom: '12px' }}>
              {t(locale, 'final_sub')}
            </p>
            <p style={{ color: muted2, fontSize: '0.8rem', marginBottom: '36px' }}>
              Name · Brand · Email · You're live.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/login" className="cta-btn" style={{ background: blue, color: white, borderRadius: '10px', padding: '14px 36px', fontSize: '16px', fontWeight: 800, textDecoration: 'none', display: 'inline-block', transition: 'opacity 0.2s, transform 0.15s' }}>
                {t(locale, 'final_cta')}
              </a>
              <a href="/arena" className="cta-ghost" style={{ background: '#ffffff08', border: `1px solid ${border2}`, color: white, borderRadius: '10px', padding: '14px 36px', fontSize: '16px', fontWeight: 700, textDecoration: 'none', display: 'inline-block', transition: 'background 0.2s' }}>
                Browse the Arena →
              </a>
            </div>
            <p style={{ marginTop: '16px', fontSize: '12px', color: muted2 }}>
              Free 3-day trial · $9.99/mo after · No contract · Cancel anytime
            </p>
            <button
              onClick={() => setVaultOpen(true)}
              className="sign-in-link"
              style={{ marginTop: '12px', fontSize: '13px', color: muted2, background: 'none', border: 'none', cursor: 'pointer' }}
            >
              {t(locale, 'final_signin')}
            </button>
          </div>
        </section>

        {/* ── FOOTER ───────────────────────────────────────── */}
        <footer style={{ borderTop: `1px solid ${border}`, padding: '2rem 0' }}>
          <div style={{ ...sectionStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ fontSize: '14px', fontWeight: 800, color: muted2 }}>⚡ ANTCPU ADS</div>
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
              {[
                { label: 'Arena',     href: '/arena'     },
                { label: 'Guide',     href: '/guide'     },
                { label: 'Champions', href: '/champions' },
                { label: 'Map of Pi', href: '/mapofpi'   },
                { label: 'Privacy',   href: '/privacy'   },
                { label: 'Terms',     href: '/tos'       },
              ].map(l => (
                <a key={l.label} href={l.href} style={{ fontSize: '13px', color: muted2, textDecoration: 'none' }}
                  className="nav-link">{l.label}</a>
              ))}
            </div>
            <div style={{ fontSize: '12px', color: muted2 }}>
              © {new Date().getFullYear()} ANTCPU ADS · Thomasville, NC
            </div>
          </div>
        </footer>

      </div>

      <VaultModal isOpen={vaultOpen} onClose={() => setVaultOpen(false)} onSuccess={() => {}} />

    </div>
  );
}
