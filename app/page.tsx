'use client';

import VaultModal                  from './components/VaultModal';
import FeaturedPartnerCard         from './components/FeaturedPartnerCard';
import { useState, useEffect }     from 'react';
import { Locale, t, isRTL }        from './lib/i18n/index';
import LanguageSwitcher            from './components/LanguageSwitcher';
import { getStoredLocale }         from './lib/locale';

// ─── Tokens ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#0a0a0a', card: '#111', border: '#1a1a1a', border2: '#222',
  blue: '#0070f3', orange: '#f0883e', purple: '#7928ca',
  gold: '#D4AF37', teal: '#00ffcc', white: '#fff', muted: '#888', muted2: '#555',
  green: '#22c55e',
};

// Map of Pi stats — static partner data, not from API
const MAP_STATS = [
  { v: '2.1M+', l: 'Users'        },
  { v: '148K',  l: 'Sellers'      },
  { v: '173K+', l: 'Transactions' },
  { v: '88',    l: 'Countries'    },
];

// ─── Season 1 arenas ──────────────────────────────────────────────────────────
const SEASONS = [
  { n: '0', label: 'Arena 0',   icon: '⚡', color: '#f0883e', desc: 'The original. Always open.',          status: 'live',    href: '/arena'          },
  { n: '1', label: 'Season 1',  icon: '🍂', color: '#D4AF37', desc: 'The Foundation. Sep 22 → Dec 21.',   status: 'soon',    href: '/arena/season1'  },
  { n: '2', label: 'Season 2',  icon: '❄️', color: '#0070f3', desc: 'The Rise. Dec 21 → Mar 20.',         status: 'coming',  href: '#'               },
  { n: '3', label: 'Season 3',  icon: '🌸', color: '#ff0080', desc: 'The Bloom. Mar 20 → Jun 21.',        status: 'coming',  href: '#'               },
  { n: '4', label: 'Season 4',  icon: '☀️', color: '#22c55e', desc: 'The Peak. Jun 21 → Sep 22.',         status: 'coming',  href: '#'               },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function SplashPage({ locale = 'en' }: { locale?: Locale }) {

  const [scrolled,      setScrolled]      = useState(false);
  const [vaultOpen,     setVaultOpen]     = useState(false);
  const [piPrice,       setPiPrice]       = useState('...');
  const [activeLocale,  setActiveLocale]  = useState<Locale>(locale);

  // ── Live stats ────────────────────────────────────────────────────────────
  const [liveAds,       setLiveAds]       = useState<number | null>(null);
  const [liveBrands,    setLiveBrands]    = useState<number | null>(null);
  const [liveCountries, setLiveCountries] = useState<number | null>(null);
  const [livePoints,    setLivePoints]    = useState<number | null>(null);
  const [liveReactions, setLiveReactions] = useState<number | null>(null);
  const [liveShares,    setLiveShares]    = useState<number | null>(null);

  // ── Countdown to Sep 22 ───────────────────────────────────────────────────
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0 });

  useEffect(() => {
    if (locale === 'en') {
      const stored = getStoredLocale();
      if (stored !== 'en') setActiveLocale(stored);
    }

    fetch('/pi-price')
      .then(r => r.json())
      .then(d => {
        const pi = d['pi-network']?.usd;
        if (pi) setPiPrice(`$${pi.toFixed(4)}`);
      }).catch(() => {});

    fetch('/api/stats', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        setLiveAds(d.liveAds             ?? null);
        setLiveBrands(d.liveBrands       ?? null);
        setLiveCountries(d.liveCountries ?? null);
        setLivePoints(d.livePoints       ?? null);
        setLiveReactions(d.totalReactions ?? null);
        setLiveShares(d.totalShares       ?? null);
      }).catch(() => {});

    // Countdown to Sep 22 2026 00:00 UTC
    function tick() {
      const target = new Date('2026-09-22T00:00:00Z').getTime();
      const diff   = target - Date.now();
      if (diff <= 0) { setCountdown({ days: 0, hours: 0, mins: 0 }); return; }
      setCountdown({
        days:  Math.floor(diff / 86_400_000),
        hours: Math.floor((diff % 86_400_000) / 3_600_000),
        mins:  Math.floor((diff % 3_600_000)  / 60_000),
      });
    }
    tick();
    const timer = setInterval(tick, 60_000);

    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      clearInterval(timer);
    };
  }, [locale]);

  const isSeason1Live = countdown.days === 0 && countdown.hours === 0 && countdown.mins === 0;

  // ── Locale-aware arrays ───────────────────────────────────────────────────
  const STEPS = [
    { n: '01', title: t(activeLocale, 'step_01_title'), desc: t(activeLocale, 'step_01_desc') },
    { n: '02', title: t(activeLocale, 'step_02_title'), desc: t(activeLocale, 'step_02_desc') },
    { n: '03', title: t(activeLocale, 'step_03_title'), desc: t(activeLocale, 'step_03_desc') },
    { n: '04', title: t(activeLocale, 'step_04_title'), desc: t(activeLocale, 'step_04_desc') },
  ];

  const LADDER = [
    { tier: 'Entry',    color: C.teal,   pts: t(activeLocale, 'ladder_entry_pts'),    desc: t(activeLocale, 'ladder_entry_desc')    },
    { tier: 'Rising',   color: C.blue,   pts: t(activeLocale, 'ladder_rising_pts'),   desc: t(activeLocale, 'ladder_rising_desc')   },
    { tier: 'Featured', color: C.orange, pts: t(activeLocale, 'ladder_featured_pts'), desc: t(activeLocale, 'ladder_featured_desc') },
    { tier: 'Top Tier', color: C.gold,   pts: t(activeLocale, 'ladder_top_pts'),      desc: t(activeLocale, 'ladder_top_desc')      },
  ];

  const PLANS = [
    {
      name: t(activeLocale, 'plan_trial_name'),   price: t(activeLocale, 'plan_trial_price'),
      period: t(activeLocale, 'plan_trial_period'), color: C.teal,
      badge: '', badgeColor: '',
      features: [
        t(activeLocale, 'plan_trial_f1'), t(activeLocale, 'plan_trial_f2'),
        t(activeLocale, 'plan_trial_f3'), t(activeLocale, 'plan_trial_f4'),
      ],
      cta: t(activeLocale, 'plan_trial_cta'), disabled: false,
    },
    {
      name: t(activeLocale, 'plan_arena_name'),   price: t(activeLocale, 'plan_arena_price'),
      period: t(activeLocale, 'plan_arena_period'), color: C.orange,
      badge: t(activeLocale, 'plan_arena_badge'), badgeColor: C.orange,
      features: [
        t(activeLocale, 'plan_arena_f1'), t(activeLocale, 'plan_arena_f2'),
        t(activeLocale, 'plan_arena_f3'), t(activeLocale, 'plan_arena_f4'),
        t(activeLocale, 'plan_arena_f5'),
      ],
      cta: t(activeLocale, 'plan_arena_cta'), disabled: false,
    },
    {
      name: t(activeLocale, 'plan_pro_name'),     price: t(activeLocale, 'plan_pro_price'),
      period: t(activeLocale, 'plan_pro_period'), color: C.purple,
      badge: t(activeLocale, 'plan_pro_badge'),   badgeColor: C.purple,
      features: [
        t(activeLocale, 'plan_pro_f1'), t(activeLocale, 'plan_pro_f2'),
        t(activeLocale, 'plan_pro_f3'), t(activeLocale, 'plan_pro_f4'),
        t(activeLocale, 'plan_pro_f5'),
      ],
      cta: t(activeLocale, 'plan_pro_cta'), disabled: true,
    },
    {
      name: t(activeLocale, 'plan_deluxe_name'),  price: t(activeLocale, 'plan_deluxe_price'),
      period: t(activeLocale, 'plan_deluxe_period'), color: C.gold,
      badge: t(activeLocale, 'plan_deluxe_badge'), badgeColor: C.gold,
      features: [
        t(activeLocale, 'plan_deluxe_f1'), t(activeLocale, 'plan_deluxe_f2'),
        t(activeLocale, 'plan_deluxe_f3'), t(activeLocale, 'plan_deluxe_f4'),
        t(activeLocale, 'plan_deluxe_f5'),
      ],
      cta: t(activeLocale, 'plan_deluxe_cta'), disabled: true,
    },
  ];

  // ── Style helpers ─────────────────────────────────────────────────────────
  const rtl      = isRTL(activeLocale);
  const sec      = { maxWidth: '1100px', margin: '0 auto', padding: '0 clamp(16px,5vw,48px)' };
  const pad      = { padding: 'clamp(60px,8vw,100px) 0' };
  const tag      = { fontSize: '11px', fontWeight: 700, letterSpacing: '3px',
                     textTransform: 'uppercase' as const, color: C.muted2, marginBottom: '14px' };
  const h2       = { fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800,
                     letterSpacing: '-1px', color: C.white, lineHeight: 1.1, marginBottom: '14px' };
  const pill     = (color: string) => ({
    background: `${color}15`, border: `1px solid ${color}40`, color,
    borderRadius: '999px', padding: '4px 14px', fontSize: '12px', fontWeight: 700,
  });
  const btn      = (bg: string, color = '#000') => ({
    background: bg, color, border: 'none', borderRadius: '10px',
    padding: '13px 28px', fontWeight: 800, fontSize: '15px',
    textDecoration: 'none', cursor: 'pointer', display: 'inline-block',
    transition: 'opacity 0.2s, transform 0.2s',
  });
  const ghostBtn = {
    background: 'transparent', border: `1px solid ${C.border2}`, color: C.white,
    borderRadius: '10px', padding: '13px 28px', fontWeight: 700, fontSize: '15px',
    textDecoration: 'none', display: 'inline-block', transition: 'background 0.2s',
  };

  const css = `
    @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.4} }
    @keyframes ember  { 0%,100%{opacity:0.6;transform:translateY(0)} 50%{opacity:1;transform:translateY(-4px)} }
    .hero-in { animation: fadeUp 0.7s ease forwards; }
    a.cta:hover, button.cta:hover { opacity:0.85; transform:translateY(-1px); }
    a.ghost:hover { background:#ffffff10 !important; }
    .card-hover:hover { border-color:#333 !important; transform:translateY(-3px); }
    .row-hover:hover  { background:#161616 !important; }
    .nav-a:hover      { color:#ccc !important; }
    .season-card:hover { transform:translateY(-2px); border-color:#333 !important; }
  `;

  const heroBadge = liveAds !== null
    ? `${liveAds} ads live · ${liveBrands} brands · ${liveCountries} countries`
    : t(activeLocale, 'hero_badge');

  const finalSub = liveAds !== null
    ? `${liveAds} ads live. ${liveBrands} brands competing.${liveReactions ? ` ${liveReactions.toLocaleString()} reactions.` : ''} Join them.`
    : t(activeLocale, 'final_sub');

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      style={{ background: C.bg, color: C.white,
        fontFamily: 'system-ui,sans-serif', overflowX: 'hidden' }}
    >
      <style>{css}</style>

      {/* ── NAV ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 60,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(16px,5vw,48px)',
        background: scrolled ? 'rgba(10,10,10,0.92)' : C.bg,
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: `1px solid ${C.border}`,
        transition: 'background 0.3s',
      }}>
        <span style={{ fontWeight: 900, fontSize: '15px', color: C.orange }}>
          ⚡ ANTCPU ADS
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <LanguageSwitcher />
          <a href="/arena" className="nav-a"
            style={{ fontSize: '13px', color: C.muted2,
              textDecoration: 'none', transition: 'color 0.2s' }}>
            The Arena
          </a>
          <button onClick={() => setVaultOpen(true)} className="nav-a"
            style={{ background: 'none', border: 'none', color: C.muted2,
              cursor: 'pointer', fontSize: '13px', transition: 'color 0.2s' }}>
            {t(activeLocale, 'nav_signin')}
          </button>
          <a href="/login?ref=homepage" className="cta"
            style={{ ...btn(C.orange), padding: '8px 18px', fontSize: '13px' }}>
            {t(activeLocale, 'nav_start')}
          </a>
        </div>
      </nav>

      <div style={{ paddingTop: 60 }}>

        {/* ── SEASON 1 ANNOUNCEMENT BANNER ── */}
        {!isSeason1Live ? (
          <div style={{
            background:    `linear-gradient(90deg, ${C.gold}15, ${C.orange}10, transparent)`,
            borderBottom:  `1px solid ${C.gold}30`,
            padding:       '10px clamp(16px,5vw,48px)',
            display:       'flex',
            alignItems:    'center',
            justifyContent:'space-between',
            flexWrap:      'wrap',
            gap:           '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1rem' }}>🍂</span>
              <span style={{ fontSize: '13px', fontWeight: 700, color: C.gold }}>
                Season 1 · The Foundation
              </span>
              <span style={{ fontSize: '12px', color: C.muted2 }}>
                Opens September 22 · Four arenas · Fresh start
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Countdown */}
              <div style={{ display: 'flex', gap: '6px', fontSize: '11px' }}>
                {[
                  { v: countdown.days,  l: 'd' },
                  { v: countdown.hours, l: 'h' },
                  { v: countdown.mins,  l: 'm' },
                ].map(c => (
                  <span key={c.l} style={{
                    background:   `${C.gold}15`,
                    border:       `1px solid ${C.gold}30`,
                    borderRadius: '6px',
                    padding:      '2px 7px',
                    color:        C.gold,
                    fontWeight:   800,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {String(c.v).padStart(2, '0')}{c.l}
                  </span>
                ))}
              </div>
              <a href="/arena/season1"
                style={{ ...btn(C.gold), padding: '5px 14px', fontSize: '12px' }}>
                Join Season 1 →
              </a>
            </div>
          </div>
        ) : (
          <div style={{
            background:    `linear-gradient(90deg, ${C.gold}20, ${C.orange}15, transparent)`,
            borderBottom:  `1px solid ${C.gold}40`,
            padding:       '10px clamp(16px,5vw,48px)',
            display:       'flex', alignItems: 'center',
            justifyContent:'space-between', gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%',
                background: C.gold, animation: 'pulse 2s infinite',
                display: 'inline-block' }} />
              <span style={{ fontSize: '13px', fontWeight: 700, color: C.gold }}>
                🍂 Season 1 is live — The Foundation has begun
              </span>
            </div>
            <a href="/arena/season1"
              style={{ ...btn(C.gold), padding: '5px 14px', fontSize: '12px' }}>
              Enter Season 1 →
            </a>
          </div>
        )}

        {/* ── HERO ── */}
        <section style={{ position: 'relative', minHeight: '90vh',
          display: 'flex', alignItems: 'center', overflow: 'hidden' }}>

          {[15,30,50,70,85].map((p,i) => (
            <div key={i} style={{ position: 'absolute', top: 0, bottom: 0,
              left: `${p}%`, width: 1,
              background: 'linear-gradient(to bottom,transparent,#ffffff06,transparent)' }} />
          ))}

          <div style={{ position: 'absolute', top: '30%', left: '50%',
            transform: 'translate(-50%,-50%)', width: 700, height: 700,
            pointerEvents: 'none',
            background: `radial-gradient(circle,${C.blue}10 0%,transparent 70%)` }} />

          <div className="hero-in" style={{ ...sec, width: '100%' }}>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8,
              background: `${C.teal}10`, border: `1px solid ${C.teal}25`,
              borderRadius: 999, padding: '6px 16px', fontSize: 12,
              color: C.teal, fontWeight: 600, marginBottom: 28 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%',
                background: C.teal, animation: 'pulse 2s infinite',
                display: 'inline-block' }} />
              {heroBadge}
            </div>

            <h1 style={{ fontSize: 'clamp(38px,6.5vw,76px)', fontWeight: 900,
              letterSpacing: '-2px', lineHeight: 1.05, marginBottom: 24,
              maxWidth: 820 }}>
              Your Brand.<br />
              <span style={{ color: C.orange }}>Live Today.</span>{' '}
              <span style={{ color: C.teal }}>Free.</span>
            </h1>

            <p style={{ fontSize: 'clamp(15px,1.8vw,19px)', color: C.muted,
              maxWidth: 520, lineHeight: 1.7, marginBottom: 32 }}>
              {t(activeLocale, 'hero_sub')}
              {liveBrands && (
                <strong style={{ color: C.white }}>
                  {' '}Already working for {liveBrands}+ brands.
                </strong>
              )}
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16 }}>
              <a href="/login?ref=homepage" className="cta" style={btn(C.orange)}>
                {t(activeLocale, 'hero_cta_primary')}
              </a>
              <a href="/arena" className="ghost" style={ghostBtn}>
                {t(activeLocale, 'hero_cta_secondary')}
              </a>
            </div>

            <p style={{ fontSize: 12, color: C.muted2 }}>
              {t(activeLocale, 'hero_trial')}
            </p>

          </div>
        </section>

        {/* ── PROOF BAR ── */}
        <section style={{ borderTop: `1px solid ${C.border}`,
          borderBottom: `1px solid ${C.border}`, background: '#0d0d0d' }}>
          <div style={{ ...sec, display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(110px,1fr))', gap: 1 }}>
            {[
              { v: liveAds        !== null ? String(liveAds)                 : '…', l: 'Live Ads',   c: C.blue   },
              { v: liveBrands     !== null ? String(liveBrands)              : '…', l: 'Brands',     c: C.orange },
              { v: liveCountries  !== null ? String(liveCountries)           : '…', l: 'Countries',  c: C.gold   },
              { v: livePoints     !== null ? livePoints.toLocaleString()     : '…', l: 'Points',     c: C.teal   },
              { v: liveReactions  !== null ? liveReactions.toLocaleString()  : '…', l: 'Reactions',  c: C.purple },
              { v: liveShares     !== null ? liveShares.toLocaleString()     : '…', l: 'Shares',     c: C.green  },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center', padding: '28px 16px',
                borderRight: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900,
                  color: s.c, letterSpacing: '-1px' }}>{s.v}</div>
                <div style={{ fontSize: 11, color: C.muted2, marginTop: 4,
                  letterSpacing: '0.06em' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ── */}
        <section style={{ ...pad, borderBottom: `1px solid ${C.border}` }}>
          <div style={sec}>
            <div style={tag}>{t(activeLocale, 'how_section_label')}</div>
            <h2 style={h2}>{t(activeLocale, 'how_title')}</h2>
            <div style={{ display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16 }}>
              {STEPS.map((s, i) => (
                <div key={i} className="card-hover"
                  style={{ background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 14, padding: '24px 20px', transition: 'all 0.2s' }}>
                  <div style={{ fontSize: 11, color: C.muted2, fontWeight: 700,
                    letterSpacing: '0.1em', marginBottom: 12 }}>{s.n}</div>
                  <div style={{ fontWeight: 700, fontSize: 15,
                    color: C.white, marginBottom: 8 }}>{s.title}</div>
                  <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>
                    {s.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── THE LADDER ── */}
        <section style={{ ...pad, background: '#0d0d0d',
          borderBottom: `1px solid ${C.border}` }}>
          <div style={sec}>
            <div style={tag}>{t(activeLocale, 'ladder_section_label')}</div>
            <h2 style={h2}>{t(activeLocale, 'ladder_title')}</h2>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 32,
              maxWidth: 480, lineHeight: 1.65 }}>
              {t(activeLocale, 'ladder_sub')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {LADDER.map((row, i) => (
                <div key={i} className="row-hover"
                  style={{ display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
                    background: C.card, border: `1px solid ${C.border}`,
                    borderLeft: `3px solid ${row.color}`, borderRadius: 12,
                    padding: '18px 22px', transition: 'background 0.2s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontWeight: 800, fontSize: 15,
                      color: row.color, minWidth: 76 }}>{row.tier}</span>
                    <span style={{ fontSize: 13, color: C.muted }}>{row.desc}</span>
                  </div>
                  <span style={pill(row.color)}>{row.pts}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── PRICING ── */}
        <section style={{ ...pad, borderBottom: `1px solid ${C.border}` }}>
          <div style={sec}>
            <div style={tag}>{t(activeLocale, 'pricing_section_label')}</div>
            <h2 style={h2}>{t(activeLocale, 'pricing_title')}</h2>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 40 }}>
              {t(activeLocale, 'pricing_sub')}
            </p>
            <div style={{ display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 16 }}>
              {PLANS.map((plan, i) => (
                <div key={i} className="card-hover"
                  style={{ background: C.card, border: `1px solid ${C.border}`,
                    borderRadius: 16, padding: '26px 22px', position: 'relative',
                    transition: 'all 0.25s', display: 'flex', flexDirection: 'column' }}>
                  {plan.badge && (
                    <div style={{ position: 'absolute', top: -11, left: 20,
                      background: plan.badgeColor, color: '#000',
                      borderRadius: 999, padding: '2px 12px',
                      fontSize: 10, fontWeight: 800 }}>
                      {plan.badge}
                    </div>
                  )}
                  <div style={{ fontSize: 12, color: C.muted2,
                    fontWeight: 700, marginBottom: 8 }}>{plan.name}</div>
                  <div style={{ display: 'flex', alignItems: 'baseline',
                    gap: 4, marginBottom: 18 }}>
                    <span style={{ fontSize: 34, fontWeight: 900,
                      color: plan.color, letterSpacing: '-1px' }}>{plan.price}</span>
                    <span style={{ fontSize: 13, color: C.muted2 }}>{plan.period}</span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px',
                    flex: 1, display: 'flex', flexDirection: 'column', gap: 9 }}>
                    {plan.features.map((f, j) => (
                      <li key={j} style={{ display: 'flex', gap: 8,
                        fontSize: 13, color: C.muted, alignItems: 'flex-start' }}>
                        <span style={{ color: plan.color, fontWeight: 700,
                          flexShrink: 0 }}>✓</span>{f}
                      </li>
                    ))}
                  </ul>
                  {plan.disabled ? (
                    <div style={{ background: C.border, color: C.muted2,
                      borderRadius: 10, padding: '11px', textAlign: 'center',
                      fontSize: 13, fontWeight: 600 }}>
                      {plan.cta}
                    </div>
                  ) : (
                    <a href="/login?ref=pricing" className="cta"
                      style={{ ...btn(plan.color), textAlign: 'center',
                        padding: '11px', fontSize: 14, display: 'block' }}>
                      {plan.cta}
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── THE ARENAS — SEASON MAP ── */}
        <section style={{ ...pad, background: '#0d0d0d',
          borderBottom: `1px solid ${C.border}` }}>
          <div style={sec}>
            <div style={tag}>The Arena Network</div>
            <h2 style={h2}>Five arenas. One network.</h2>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 32,
              maxWidth: 520, lineHeight: 1.65 }}>
              Arena 0 never resets — it's the original, always running.
              Seasonal arenas open every 90 days. Fresh start. New champion crowned at the close.
              Every brand can earn their own sub-arena through shares.
            </p>
            <div style={{ display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12 }}>
              {SEASONS.map((s) => {
                const isLive   = s.status === 'live';
                const isSoon   = s.status === 'soon';
                const isActive = s.href !== '#';
                return (
                  <a key={s.n}
                    href={isActive ? s.href : undefined}
                    className="season-card"
                    style={{
                      background:    C.card,
                      border:        `1px solid ${isLive || isSoon ? s.color + '40' : C.border}`,
                      borderLeft:    `3px solid ${s.color}`,
                      borderRadius:  12,
                      padding:       '20px 18px',
                      textDecoration:'none',
                      display:       'block',
                      transition:    'all 0.2s',
                      cursor:        isActive ? 'pointer' : 'default',
                      opacity:       s.status === 'coming' ? 0.55 : 1,
                      position:      'relative',
                      overflow:      'hidden',
                    }}>
                    {/* Live pulse */}
                    {isLive && (
                      <div style={{ position: 'absolute', top: 12, right: 12,
                        width: 7, height: 7, borderRadius: '50%',
                        background: s.color, animation: 'pulse 2s infinite' }} />
                    )}
                    {/* Soon badge */}
                    {isSoon && (
                      <div style={{ position: 'absolute', top: 10, right: 10,
                        background: `${s.color}20`, border: `1px solid ${s.color}40`,
                        borderRadius: '999px', padding: '1px 8px',
                        fontSize: 9, fontWeight: 800, color: s.color,
                        letterSpacing: '0.08em' }}>
                        SEP 22
                      </div>
                    )}
                    <div style={{ fontSize: '1.4rem', marginBottom: 8 }}>{s.icon}</div>
                    <div style={{ fontWeight: 800, fontSize: 14,
                      color: s.color, marginBottom: 4 }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5 }}>
                      {s.desc}
                    </div>
                    {s.status === 'coming' && (
                      <div style={{ fontSize: 10, color: C.muted2,
                        marginTop: 8, fontWeight: 600 }}>
                        Coming soon
                      </div>
                    )}
                  </a>
                );
              })}
            </div>
            <p style={{ fontSize: 12, color: C.muted2, marginTop: 16 }}>
              Every brand earns their own arena. Share your ad to build your audience. →{' '}
              <a href="/arena" style={{ color: C.orange, textDecoration: 'none' }}>
                See all sub-arenas
              </a>
            </p>
          </div>
        </section>

        {/* ── FEATURED PARTNER ── */}
        <section style={{ ...pad, borderBottom: `1px solid ${C.border}` }}>
          <div style={sec}>
            <div style={tag}>{t(activeLocale, 'partner_section_label')}</div>

            {/* Live featured partner — rotates weekly via badge */}
            <FeaturedPartnerCard season="Season 1" />

            {/* ── Permanent Map of Pi partner block ── */}
            <div style={{ background: C.card, border: `1px solid ${C.gold}30`,
              borderRadius: 20, padding: 'clamp(28px,4vw,48px)',
              position: 'relative', overflow: 'hidden', marginTop: '1.5rem' }}>

              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2,
                background: `linear-gradient(to right,transparent,${C.gold},transparent)` }} />
              <div style={{ position: 'absolute', top: -60, right: -60,
                width: 200, height: 200, borderRadius: '50%', pointerEvents: 'none',
                background: `radial-gradient(circle,${C.gold}18 0%,transparent 70%)` }} />

              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                <span style={{ fontSize: '2.2rem' }}>🗺️</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 20, color: C.white }}>Map of Pi</div>
                  <div style={{ fontSize: 12, color: C.gold }}>
                    Founding Partner · 🏆 2024 Pi Commerce Hackathon Winner
                  </div>
                </div>
              </div>

              <p style={{ color: C.muted, fontSize: 14, lineHeight: 1.7,
                maxWidth: 600, marginBottom: 28 }}>
                The world&apos;s largest Pi commerce platform — connecting buyers and sellers
                across 88 countries using Pi Network. Every Map of Pi user in the Arena
                is a Country Champion representing their nation.
              </p>

              <div style={{ display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit,minmax(90px,1fr))',
                gap: 12, marginBottom: 28 }}>
                {[...MAP_STATS, { v: piPrice, l: t(activeLocale, 'partner_price_label') }].map((st, i) => (
                  <div key={i} style={{ background: '#0a0a0a',
                    border: `1px solid ${C.border}`, borderRadius: 10,
                    padding: '14px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.gold }}>{st.v}</div>
                    <div style={{ fontSize: 10, color: C.muted2, marginTop: 3 }}>{st.l}</div>
                  </div>
                ))}
              </div>

              <div style={{ background: `${C.gold}08`, border: `1px solid ${C.gold}20`,
                borderRadius: 12, padding: '18px 22px', marginBottom: 24 }}>
                <div style={{ fontWeight: 700, color: C.gold, marginBottom: 6, fontSize: 14 }}>
                  🏆 Country Champion Program
                </div>
                <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.65, margin: 0 }}>
                  90 days free · 10 AI antbots deployed · Represent your country.
                  Every Map of Pi pioneer is automatically a Country Champion.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <a href="/champions"
                  style={{ ...btn(C.gold), padding: '9px 18px', fontSize: 13 }}>
                  🏆 View Champions →
                </a>
                <a href="/mapofpi"
                  style={{ background: 'transparent', border: `1px solid ${C.gold}40`,
                    color: C.gold, borderRadius: 8, padding: '9px 18px',
                    fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                  🗺️ Claim Your Country →
                </a>
                <a href="https://youtube.com/@mapofpi" target="_blank" rel="noopener noreferrer"
                  style={{ background: 'transparent', border: `1px solid ${C.border2}`,
                    color: C.muted, borderRadius: 8, padding: '9px 18px',
                    fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                  ▶ YouTube
                </a>
              </div>

            </div>
          </div>
        </section>

        {/* ── FINAL CTA ── */}
        <section style={{ ...pad }}>
          <div style={{ ...sec, textAlign: 'center' }}>
            <div style={tag}>{t(activeLocale, 'final_section_label')}</div>
            <h2 style={{ ...h2, textAlign: 'center', fontSize: 'clamp(28px,5vw,52px)' }}>
              Season 1 opens September 22.<br />
              <span style={{ color: C.orange }}>Your brand belongs here.</span>
            </h2>
            <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.7,
              maxWidth: 460, margin: '0 auto 36px' }}>
              {finalSub}
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap',
              justifyContent: 'center', marginBottom: 20 }}>
              <a href="/login?ref=final-cta" className="cta"
                style={{ ...btn(C.orange), fontSize: 16, padding: '14px 36px' }}>
                {t(activeLocale, 'final_cta')}
              </a>
              <a href="/arena/season1" className="cta"
                style={{ ...btn(C.gold), fontSize: 16, padding: '14px 36px' }}>
                🍂 Join Season 1 →
              </a>
            </div>
            <button onClick={() => setVaultOpen(true)}
              style={{ background: 'none', border: 'none', color: C.muted2,
                cursor: 'pointer', fontSize: 13, marginTop: 4 }}>
              {t(activeLocale, 'final_signin')}
            </button>
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer style={{ borderTop: `1px solid ${C.border}`,
          padding: '28px clamp(16px,5vw,48px)',
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: C.orange }}>
            ⚡ ANTCPU ADS
          </span>
          <div style={{ display: 'flex', gap: 24 }}>
            {[
              ['Arena',     '/arena'         ],
              ['Season 1',  '/arena/season1' ],
              ['Champions', '/champions'     ],
              ['Guide',     '/guide'         ],
              ['About',     '/about'         ],
            ].map(([l, h]) => (
              <a key={l} href={h} className="nav-a"
                style={{ fontSize: 13, color: C.muted2,
                  textDecoration: 'none', transition: 'color 0.2s' }}>
                {l}
              </a>
            ))}
          </div>
          <span style={{ fontSize: 12, color: C.muted2 }}>
            {t(activeLocale, 'footer_copy')}
          </span>
        </footer>

      </div>

      <VaultModal open={vaultOpen} onClose={() => setVaultOpen(false)} onSuccess={() => {}} />

    </div>
  );
}

