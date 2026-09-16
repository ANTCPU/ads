'use client';
// app/dashboard/mapofpi/page.tsx
// ─── Map of Pi — Team Command Centre ─────────────────────────────────────────
// Access-gated to ALLOWED emails — team + admin only.
// Tabs: Overview · Champions · Posts · Coverage
//
// v2 (Sep 2026):
//   — fetchAds: ilike brand → eq campaign 'mapofpi' (correct query)
//   — countryFlag: imported from assets.ts (was duplicated inline)
//   — MAPOFPI_COUNTRIES: imported from assets.ts (was hardcoded inline)
//   — MAPOFPI_PHASES: imported — phase progress bar added
//   — isAdmin routes to /dashboard/antcpu (was /dashboard/admin)
//   — Tabs replace single long scroll
//   — Refresh button on report card
//   — Reaction count added to stats
//   — Post builder links to /dashboard/mapofpi/post-builder
//   — Pi price shows '—' on fail (was '...' forever)
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter }          from 'next/navigation';
import { createClient }       from '@supabase/supabase-js';
import ArenaNav               from '../../components/ArenaNav';
import ArenaFooter            from '../../components/ArenaFooter';
import { clearSessionCookie } from '../../lib/session';
import { MAPOFPI_COUNTRIES, MAPOFPI_PHASES } from '../../clients/mapofpi/assets';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Access control ───────────────────────────────────────────────────────────
// ALLOWED kept as hardcode — small fixed team, no DB lookup needed.

const ALLOWED = [
  'antcpu@gmail.com',
  'joosdup.pj@gmail.com',
  'melshoshani@gmail.com',
  'andri.postkast@gmail.com',
  'officialbenuches@gmail.com',
];

const TEAM = [
  { name: 'Philip Jennings',    email: 'joosdup.pj@gmail.com',      role: 'Founder & Project Manager', icon: '🗺️' },
  { name: 'Mohamed Elshoshani', email: 'melshoshani@gmail.com',      role: 'Marketing',                 icon: '📣' },
  { name: 'Andri Nael',         email: 'andri.postkast@gmail.com',   role: 'Marketing',                 icon: '📣' },
  { name: 'Mr Ben',             email: 'officialbenuches@gmail.com', role: 'Early Adopter',             icon: '🌍' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionUser = {
  email: string; name: string; brand: string;
  trialStatus: string; role?: string;
};

type Ad = {
  id: string; brand: string; title: string; url: string;
  description: string; category: string; tier: string;
  email: string; points: number;
  click_count: number; share_count: number; like_count: number;
  boost_count: number; reaction_count: number;
  is_country_champion?: boolean; country?: string;
};

type Tab = 'overview' | 'champions' | 'posts' | 'coverage';

// ─── Design tokens ────────────────────────────────────────────────────────────

const bg     = '#0a0a0a';
const card   = '#111';
const border = '#1a1a1a';
const muted  = '#555';
const white  = '#fff';
const gold   = '#D4AF37';
const green  = '#2D6A4F';
const orange = '#f0883e';

// ─── countryFlag — imported via MAPOFPI_COUNTRIES ─────────────────────────────
// No more inline flag map — single source of truth in assets.ts

function countryFlag(country: string): string {
  return MAPOFPI_COUNTRIES.find(c => c.name === country)?.flag || '🌍';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MapOfPiDashboard() {
  const router = useRouter();

  const [hydrated,     setHydrated]     = useState(false);
  const [user,         setUser]         = useState<SessionUser | null>(null);
  const [tab,          setTab]          = useState<Tab>('overview');
  const [copiedId,     setCopiedId]     = useState<number | string | null>(null);
  const [custom,       setCustom]       = useState('');
  const [customCopied, setCustomCopied] = useState(false);
  const [piPrice,      setPiPrice]      = useState('...');
  const [champAds,     setChampAds]     = useState<Ad[]>([]);
  const [networkAds,   setNetworkAds]   = useState<Ad[]>([]);
  const [loadingAds,   setLoadingAds]   = useState(true);
  const [adStatuses,   setAdStatuses]   = useState<Record<string, boolean>>({});

  // ── Derived ───────────────────────────────────────────────────────────────
  const allAds          = [...champAds, ...networkAds];
  const totalPoints     = allAds.reduce((s, a) => s + (a.points         || 0), 0);
  const totalClicks     = allAds.reduce((s, a) => s + (a.click_count    || 0), 0);
  const totalShares     = allAds.reduce((s, a) => s + (a.share_count    || 0), 0);
  const totalReactions  = allAds.reduce((s, a) => s + (a.reaction_count || 0), 0);
  const activeCountries = [...new Set(champAds.map(a => a.country).filter(Boolean))].length;
  const totalMarketers  = allAds.length > 0 ? new Set(allAds.map(a => a.email)).size : 0;

  // ── Country grouping ──────────────────────────────────────────────────────
  const countryGroups: Record<string, Ad[]> = {};
  champAds.filter(a => a.country).forEach(ad => {
    const key = ad.country!;
    if (!countryGroups[key]) countryGroups[key] = [];
    countryGroups[key].push(ad);
  });
  const sortedCountries = Object.keys(countryGroups).sort((a, b) => {
    const apts = countryGroups[a].reduce((s, x) => s + (x.points || 0), 0);
    const bpts = countryGroups[b].reduce((s, x) => s + (x.points || 0), 0);
    return bpts - apts;
  });

  // ── Top performers ────────────────────────────────────────────────────────
  const topAd         = [...allAds].sort((a, b) => (b.points || 0) - (a.points || 0))[0];
  const topCountry    = sortedCountries[0];
  const topCountryPts = topCountry
    ? countryGroups[topCountry].reduce((s, a) => s + (a.points || 0), 0)
    : 0;

  // ── Phase progress — based on top ad points ───────────────────────────────
  const topPts         = topAd?.points || 0;
  const currentPhase   = [...MAPOFPI_PHASES].reverse().find(p => topPts >= p.unlockAt) || MAPOFPI_PHASES[0];
  const nextPhase      = MAPOFPI_PHASES.find(p => p.unlockAt > topPts);
  const phaseProgress  = nextPhase
    ? Math.min(((topPts - currentPhase.unlockAt) / (nextPhase.unlockAt - currentPhase.unlockAt)) * 100, 100)
    : 100;

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  // ── Data ──────────────────────────────────────────────────────────────────
  // FIX: was ilike brand '%Map of Pi%' — now eq campaign 'mapofpi'
  const fetchAds = useCallback(async () => {
    setLoadingAds(true);
    const { data } = await supabase
      .from('ads')
      .select('*')
      .eq('campaign', 'mapofpi')
      .eq('status',   'active')
      .order('points', { ascending: false });

    const all = data || [];
    setChampAds(all.filter((a: Ad) => a.is_country_champion && a.country));
    setNetworkAds(all.filter((a: Ad) => !a.is_country_champion || !a.country));

    const statusMap: Record<string, boolean> = {};
    for (const member of TEAM) {
      statusMap[member.email] = all.some((a: Ad) => a.email === member.email);
    }
    setAdStatuses(statusMap);
    setLoadingAds(false);
  }, []);

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      if (!ALLOWED.includes(u.email)) { router.push('/dashboard/user'); return; }
      setUser(u);
    } catch { router.push('/'); return; }
    setHydrated(true);

    // Pi price — shows '—' on fail, not '...' forever
    fetch('/pi-price')
      .then(r => r.json())
      .then(data => {
        const pi = data['pi-network']?.usd;
        setPiPrice(pi ? `$${pi.toFixed(4)}` : '—');
      })
      .catch(() => setPiPrice('—'));

    fetchAds();
  }, [fetchAds, router]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  function copy(text: string, id: number | string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  }

  function copyCustom() {
    if (!custom.trim()) return;
    navigator.clipboard.writeText(custom).then(() => {
      setCustomCopied(true);
      setTimeout(() => setCustomCopied(false), 2500);
    });
  }

  if (!hydrated || !user) return null;

  // FIX: was /dashboard/admin — now /dashboard/antcpu
  const isAdmin = user.email === 'antcpu@gmail.com';

  // ── Tab style ─────────────────────────────────────────────────────────────
  const tabStyle = (t: Tab): React.CSSProperties => ({
    background:   tab === t ? green : 'transparent',
    border:       `1px solid ${tab === t ? green : border}`,
    borderRadius: '8px',
    color:        tab === t ? white : muted,
    fontSize:     '0.78rem',
    fontWeight:   700,
    padding:      '0.4rem 0.9rem',
    cursor:       'pointer',
    transition:   'all 0.15s',
  });

  // ── Posts ─────────────────────────────────────────────────────────────────
  const POSTS = [
    { id: 1,  tag: '🌅 Morning',   text: `Good morning ☀️\n\nPi Network is growing — and Map of Pi is where commerce happens.\n\n2.1M+ registered users. 148K sellers. 173K+ completed transactions.\n\nFind Pi sellers near you today 🗺️\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #picoin #picommerce #crypto` },
    { id: 2,  tag: '☀️ Noon',      text: `The Pi economy is real 💛\n\nReal sellers. Real buyers. Real transactions happening right now on Map of Pi.\n\nLeave a review. Build trust. Grow the Pi community.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #picommerce #blockchain #crypto` },
    { id: 3,  tag: '🌙 Evening',   text: `Pi Network is going mainstream 🌙\n\nMap of Pi is the largest Pi commerce platform in the world.\n\nJoin 2.1M+ users already building the Pi economy.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #picoin #crypto #picommerce` },
    { id: 4,  tag: '🗺️ Discovery', text: `Did you know? 🗺️\n\nMap of Pi has 148K+ sellers listed worldwide.\n\nFind local Pi sellers, leave honest reviews, and help build a trusted Pi marketplace.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #picommerce #sellers #crypto` },
    { id: 5,  tag: '📈 Growth',    text: `173,000+ completed Pi transactions 📈\n\nMap of Pi is not a concept — it is a working Pi commerce platform with real activity every day.\n\nJoin the movement.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #picoin #picommerce #growthhacking` },
    { id: 6,  tag: '🏆 Hackathon', text: `🏆 2024 Pi Commerce Hackathon Winner\n\nMap of Pi won the official Pi Network hackathon — recognized as the best Pi commerce platform in the ecosystem.\n\nBuilt by the community. For the community.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #hackathon #picommerce #crypto` },
    { id: 7,  tag: '🚀 Pi Price',  text: `Pi is at ${piPrice} and climbing 🚀\n\nAs Pi value grows, so does the Map of Pi marketplace.\n\n148K sellers ready to transact. 2.1M+ users ready to buy.\n\nThe Pi economy is just getting started.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #picoin #crypto #picommerce` },
    { id: 8,  tag: '🌍 Global',    text: `Pi commerce is global 🌍\n\nMap of Pi connects Pi buyers and sellers across every continent.\n\nNo borders. No banks. Just Pi.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #globalcommerce #crypto #picommerce` },
    { id: 9,  tag: '⭐ Reviews',   text: `Trust is everything in Pi commerce ⭐\n\nMap of Pi lets buyers leave verified reviews — so the best sellers rise to the top.\n\nBuild your reputation. Grow your Pi business.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #reviews #picommerce #trust` },
    { id: 10, tag: '📱 Mobile',    text: `Pi commerce in your pocket 📱\n\nMap of Pi works on any device. Find sellers, complete transactions, and leave reviews — all from your phone.\n\nThe future of Pi commerce is mobile.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #mobile #picommerce #crypto` },
  ];

  // ── Champion posts — auto-generated from live data ────────────────────────
  const CHAMP_POSTS = sortedCountries.map(country => {
    const flag  = countryFlag(country);
    const group = countryGroups[country];
    const top   = group[0];
    return {
      id:   `champ_${country}`,
      tag:  `${flag} ${country}`,
      text: `${flag} ${country} is in the Arena! 🏆\n\nMap of Pi has a Country Champion representing ${country} on the ANTCPU ADS network.\n\n"${top?.title || 'Map of Pi Commerce'}"\n\n${top?.description?.slice(0, 120) || 'Real Pi commerce happening right now.'}\n\n→ antcpu-ads.vercel.app/champions\n→ mapofpi.com\n\n#mapofpi #pinetwork #${country.toLowerCase().replace(/\s/g, '')} #picommerce #countrychampion`,
    };
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: bg, minHeight: '100vh', color: white, fontFamily: 'system-ui, sans-serif' }}>

      <ArenaNav
        role={(user.role as 'admin' | 'team' | 'user' | 'mod') || 'user'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={(user.trialStatus as 'team' | 'trial' | 'pending') || 'trial'}
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem' }}>

        {/* ── ARENA REPORT CARD ── */}
        <div style={{ background: `${gold}08`, border: `1px solid ${gold}30`, borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${gold}, transparent)` }} />

          {/* Header row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: gold, marginBottom: '0.2rem' }}>🗺️ Map of Pi — Arena Report</div>
              <div style={{ fontSize: '0.72rem', color: muted }}>{today}</div>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button onClick={fetchAds} disabled={loadingAds}
                style={{ background: 'none', border: `1px solid ${border}`, borderRadius: '6px', color: muted, fontSize: '0.65rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
                {loadingAds ? '⏳' : '↻'}
              </button>
              <a href="/arena/mapofpi" style={{ background: `${gold}20`, border: `1px solid ${gold}40`, color: gold, borderRadius: '8px', padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}>Arena →</a>
              <a href="/champions"    style={{ background: `${gold}20`, border: `1px solid ${gold}40`, color: gold, borderRadius: '8px', padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}>Champions →</a>
            </div>
          </div>

          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: '0.65rem', marginBottom: '1rem' }}>
            {[
              { label: 'Countries',  value: loadingAds ? '…' : activeCountries,              color: gold        },
              { label: 'Marketers',  value: loadingAds ? '…' : totalMarketers,               color: '#0070f3'   },
              { label: 'Points',     value: loadingAds ? '…' : totalPoints.toLocaleString(), color: orange      },
              { label: 'Clicks',     value: loadingAds ? '…' : totalClicks,                  color: '#22c55e'   },
              { label: 'Shares',     value: loadingAds ? '…' : totalShares,                  color: '#7928ca'   },
              { label: 'Reactions',  value: loadingAds ? '…' : totalReactions,               color: '#ff0080'   },
              { label: 'Pi Price',   value: piPrice,                                          color: gold        },
            ].map(s => (
              <div key={s.label} style={{ background: `${s.color}10`, border: `1px solid ${s.color}25`, borderRadius: '10px', padding: '0.6rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.6rem', color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Top performer line */}
          {topCountry && (
            <div style={{ fontSize: '0.78rem', color: muted, lineHeight: 1.6, marginBottom: '0.75rem' }}>
              <span style={{ color: white, fontWeight: 700 }}>Top Country:</span>{' '}
              {countryFlag(topCountry)} {topCountry} ({topCountryPts} pts)
              {topAd && (
                <> · <span style={{ color: white, fontWeight: 700 }}>Top Ad:</span>{' '}
                "{topAd.title.slice(0, 50)}{topAd.title.length > 50 ? '…' : ''}" ({topAd.points} pts)</>
              )}
            </div>
          )}

          {/* Phase progress bar */}
          {topAd && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ fontSize: '0.68rem', color: gold, fontWeight: 700 }}>{currentPhase.label}</span>
                {nextPhase && (
                  <span style={{ fontSize: '0.65rem', color: muted }}>
                    {nextPhase.unlockAt - topPts} pts → {nextPhase.label}
                  </span>
                )}
              </div>
              <div style={{ height: '4px', background: '#1a1a1a', borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${phaseProgress}%`, background: `linear-gradient(90deg, ${green}, ${gold})`, borderRadius: '999px', transition: 'width 0.6s ease' }} />
              </div>
            </div>
          )}
        </div>

        {/* ── QUICK ACTIONS ── */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {[
            { label: '← Dashboard',  action: () => router.push('/dashboard/user'),    bg: bg,            color: muted,  border: `1px solid ${border}` },
            { label: '📢 Create Ad', action: () => router.push('/create-ad'),         bg: green,         color: white,  border: 'none'                },
            { label: '🏟 Arena',     action: () => router.push('/arena/mapofpi'),     bg: 'transparent', color: green,  border: `1px solid ${green}`  },
            { label: '🗺️ Map of Pi', action: () => router.push('/mapofpi'),           bg: 'transparent', color: gold,   border: `1px solid ${gold}`   },
            { label: copiedId === 'promo' ? '✅ Copied' : '🔗 Promo Link',
              action: () => copy('https://antcpu-ads.vercel.app/mapofpi', 'promo'),
              bg: 'transparent', color: copiedId === 'promo' ? '#22c55e' : gold,
              border: `1px solid ${copiedId === 'promo' ? '#22c55e' : gold}` },
            ...(isAdmin ? [{ label: '⚡ Admin', action: () => router.push('/dashboard/antcpu'), bg: orange, color: '#000', border: 'none' }] : []),
          ].map((btn, i) => (
            <button key={i} onClick={btn.action}
              style={{ background: btn.bg, color: btn.color, border: btn.border, borderRadius: '8px', padding: '0.55rem 1rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer' }}>
              {btn.label}
            </button>
          ))}
        </div>

        {/* ── TABS ── */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <button style={tabStyle('overview')}  onClick={() => setTab('overview')}>📊 Overview</button>
          <button style={tabStyle('champions')} onClick={() => setTab('champions')}>🏆 Champions {sortedCountries.length > 0 ? `(${sortedCountries.length})` : ''}</button>
          <button style={tabStyle('posts')}     onClick={() => setTab('posts')}>📣 Posts</button>
          <button style={tabStyle('coverage')}  onClick={() => setTab('coverage')}>🌍 Coverage</button>
        </div>

        {/* ══ OVERVIEW TAB ══ */}
        {tab === 'overview' && (
          <>
            {/* Team Status */}
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.68rem', color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>👥 Team Status</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {TEAM.map(m => {
                  const hasAd = adStatuses[m.email];
                  return (
                    <div key={m.email} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0.75rem', background: bg, border: `1px solid ${border}`, borderRadius: '10px' }}>
                      <span style={{ fontSize: '1.1rem' }}>{m.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', color: white }}>{m.name}</div>
                        <div style={{ fontSize: '0.72rem', color: muted }}>{m.role}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <span style={{ background: '#22c55e20', border: '1px solid #22c55e40', color: '#22c55e', borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.62rem', fontWeight: 700 }}>✅ Team</span>
                        <span style={{ background: hasAd ? '#22c55e20' : '#55555520', border: `1px solid ${hasAd ? '#22c55e40' : '#33333340'}`, color: hasAd ? '#22c55e' : muted, borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.62rem', fontWeight: 700 }}>
                          {hasAd ? '📢 Ad Live' : '⭕ No Ad'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Network Ads */}
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.68rem', color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>🗺️ Network Ads</div>
              {loadingAds ? (
                <div style={{ color: muted, fontSize: '0.82rem', padding: '0.5rem 0' }}>Loading...</div>
              ) : networkAds.length === 0 ? (
                <div style={{ color: muted, fontSize: '0.82rem', textAlign: 'center', padding: '1rem 0' }}>No network ads yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {networkAds.map(ad => (
                    <div key={ad.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '180px' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.82rem', color: white }}>{ad.title}</div>
                        <div style={{ fontSize: '0.68rem', color: muted, marginTop: '0.15rem' }}>
                          ⚡ {ad.points || 0} pts · 👆 {ad.click_count || 0} · ↗ {ad.share_count || 0} · 🔥 {ad.reaction_count || 0}
                        </div>
                      </div>
                      <button onClick={() => copy('https://antcpu-ads.vercel.app/arena/mapofpi', `net_${ad.id}`)}
                        style={{ background: `${green}15`, border: `1px solid ${green}30`, color: green, borderRadius: '6px', padding: '0.3rem 0.65rem', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                        {copiedId === `net_${ad.id}` ? '✅' : '↗ Share'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Phase Progress */}
            <div style={{ background: card, border: `1px solid ${gold}25`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.68rem', color: gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>🚀 Phase Progress</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {MAPOFPI_PHASES.map(phase => {
                  const isActive  = phase.id === currentPhase.id;
                  const isUnlocked = topPts >= phase.unlockAt;
                  const pct = phase.unlockAt === 0
                    ? 100
                    : Math.min((topPts / phase.unlockAt) * 100, 100);
                  return (
                    <div key={phase.id} style={{ background: isActive ? `${gold}10` : bg, border: `1px solid ${isActive ? gold + '40' : border}`, borderRadius: '10px', padding: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: isUnlocked ? gold : muted }}>{phase.label}</span>
                        <span style={{ fontSize: '0.65rem', color: muted }}>{phase.unlockAt === 0 ? 'Active' : `${phase.unlockAt} pts`}</span>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: muted, marginBottom: '0.4rem' }}>{phase.description}</div>
                      <div style={{ height: '3px', background: '#1a1a1a', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: isUnlocked ? `linear-gradient(90deg, ${green}, ${gold})` : '#333', borderRadius: '999px', transition: 'width 0.6s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* ══ CHAMPIONS TAB ══ */}
        {tab === 'champions' && (
          <>
            {/* Champions Board */}
            <div style={{ background: card, border: `1px solid ${gold}25`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.68rem', color: gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>🏆 Champions Board</div>
                <a href="/champions" style={{ fontSize: '0.72rem', color: gold, textDecoration: 'none', fontWeight: 700 }}>Full Page →</a>
              </div>
              {loadingAds ? (
                <div style={{ color: muted, fontSize: '0.82rem', textAlign: 'center', padding: '1rem 0' }}>Loading...</div>
              ) : sortedCountries.length === 0 ? (
                <div style={{ color: muted, fontSize: '0.82rem', textAlign: 'center', padding: '1rem 0' }}>No country champions yet.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  {sortedCountries.map(country => {
                    const group    = countryGroups[country];
                    const flag     = countryFlag(country);
                    const groupPts = group.reduce((s, a) => s + (a.points || 0), 0);
                    return (
                      <div key={country}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', paddingBottom: '0.4rem', borderBottom: `1px solid ${gold}15` }}>
                          <span style={{ fontSize: '1.2rem' }}>{flag}</span>
                          <span style={{ fontWeight: 800, fontSize: '0.88rem', color: white }}>{country}</span>
                          <span style={{ background: `${gold}20`, border: `1px solid ${gold}40`, color: gold, borderRadius: '999px', padding: '0.1rem 0.4rem', fontSize: '0.6rem', fontWeight: 700 }}>🏆</span>
                          <span style={{ color: muted, fontSize: '0.68rem', marginLeft: 'auto' }}>{group.length} ad{group.length !== 1 ? 's' : ''} · ⚡ {groupPts} pts</span>
                          <button onClick={() => copy('https://antcpu-ads.vercel.app/champions', `share_${country}`)}
                            style={{ background: `${gold}15`, border: `1px solid ${gold}30`, color: gold, borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}>
                            {copiedId === `share_${country}` ? '✅' : '↗ Share'}
                          </button>
                        </div>
                        {group.map(ad => (
                          <div key={ad.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '0.75rem', marginBottom: '0.5rem' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.82rem', color: white, marginBottom: '0.15rem' }}>{ad.title}</div>
                            <div style={{ fontSize: '0.72rem', color: muted, marginBottom: '0.4rem' }}>{ad.description.slice(0, 80)}{ad.description.length > 80 ? '…' : ''}</div>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.68rem', color: muted }}>👆 {ad.click_count || 0}</span>
                              <span style={{ fontSize: '0.68rem', color: muted }}>↗ {ad.share_count || 0}</span>
                              <span style={{ fontSize: '0.68rem', color: muted }}>🔥 {ad.reaction_count || 0}</span>
                              <span style={{ fontSize: '0.68rem', color: gold }}>⚡ {ad.points || 0} pts</span>
                              <button onClick={() => copy('https://antcpu-ads.vercel.app/arena/mapofpi', `ad_${ad.id}`)}
                                style={{ marginLeft: 'auto', background: `${green}20`, border: `1px solid ${green}40`, color: green, borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.62rem', fontWeight: 700, cursor: 'pointer' }}>
                                {copiedId === `ad_${ad.id}` ? '✅ Copied' : '↗ Copy Link'}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Champion Posts */}
            {CHAMP_POSTS.length > 0 && (
              <div style={{ background: card, border: `1px solid ${gold}25`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
                <div style={{ fontSize: '0.68rem', color: gold, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>🏆 Country Champion Posts</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {CHAMP_POSTS.map(p => (
                    <div key={p.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '0.85rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: gold }}>{p.tag}</span>
                        <button onClick={() => copy(p.text, p.id)}
                          style={{ background: copiedId === p.id ? '#22c55e20' : `${gold}15`, border: `1px solid ${copiedId === p.id ? '#22c55e40' : `${gold}30`}`, color: copiedId === p.id ? '#22c55e' : gold, borderRadius: '6px', padding: '0.25rem 0.65rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                          {copiedId === p.id ? '✅ Copied' : '📋 Copy'}
                        </button>
                      </div>
                      <pre style={{ fontSize: '0.75rem', color: muted, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'system-ui, sans-serif' }}>{p.text}</pre>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ══ POSTS TAB ══ */}
        {tab === 'posts' && (
          <>
            {/* Link to full post builder */}
            <div style={{ background: `${green}08`, border: `1px solid ${green}30`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.88rem', color: white, marginBottom: '0.2rem' }}>📣 Full Post Builder</div>
                <div style={{ fontSize: '0.75rem', color: muted }}>6 channels · 3 templates each · AI image generation · Quick copy mode</div>
              </div>
              <button onClick={() => router.push('/dashboard/mapofpi/post-builder')}
                style={{ background: green, border: 'none', borderRadius: '8px', color: white, fontWeight: 700, fontSize: '0.82rem', padding: '0.6rem 1.25rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Open Builder →
              </button>
            </div>

            {/* Quick posts */}
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.68rem', color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>⚡ Quick Posts</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {POSTS.map(p => (
                  <div key={p.id} style={{ background: bg, border: `1px solid ${border}`, borderRadius: '10px', padding: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: white }}>{p.tag}</span>
                      <button onClick={() => copy(p.text, p.id)}
                        style={{ background: copiedId === p.id ? '#22c55e20' : `${green}15`, border: `1px solid ${copiedId === p.id ? '#22c55e40' : `${green}30`}`, color: copiedId === p.id ? '#22c55e' : green, borderRadius: '6px', padding: '0.25rem 0.65rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}>
                        {copiedId === p.id ? '✅ Copied' : '📋 Copy'}
                      </button>
                    </div>
                    <pre style={{ fontSize: '0.75rem', color: muted, lineHeight: 1.6, whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'system-ui, sans-serif' }}>{p.text}</pre>
                  </div>
                ))}
              </div>
            </div>

            {/* Custom post */}
            <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ fontSize: '0.68rem', color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>✏️ Custom Post</div>
              <textarea
                value={custom}
                onChange={e => setCustom(e.target.value)}
                placeholder="Write your own post..."
                rows={5}
                style={{ width: '100%', background: bg, border: `1px solid ${border}`, borderRadius: '8px', padding: '0.75rem', color: white, fontSize: '0.82rem', lineHeight: 1.6, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'system-ui, sans-serif', marginBottom: '0.75rem' }}
              />
              <button onClick={copyCustom}
                style={{ background: customCopied ? '#22c55e' : green, border: 'none', borderRadius: '8px', color: white, fontWeight: 700, fontSize: '0.82rem', padding: '0.6rem 1.25rem', cursor: 'pointer' }}>
                {customCopied ? '✅ Copied!' : '📋 Copy Post'}
              </button>
            </div>
          </>
        )}

        {/* ══ COVERAGE TAB ══ */}
        {tab === 'coverage' && (
          <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '14px', padding: '1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.68rem', color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                🌍 Country Coverage
              </div>
              <div style={{ fontSize: '0.68rem', color: muted }}>
                <span style={{ color: '#22c55e', fontWeight: 700 }}>● {activeCountries} active</span>
                {' · '}
                <span style={{ color: '#333', fontWeight: 700 }}>{MAPOFPI_COUNTRIES.length - activeCountries} open</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {MAPOFPI_COUNTRIES.map(c => {
                const active = sortedCountries.includes(c.name);
                return (
                  <div key={c.code}
                    style={{ background: active ? '#22c55e15' : '#1a1a1a', border: `1px solid ${active ? '#22c55e40' : '#222'}`, borderRadius: '999px', padding: '0.2rem 0.6rem', fontSize: '0.68rem', color: active ? '#22c55e' : '#333', fontWeight: active ? 700 : 400, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── BACK ── */}
        <button onClick={() => router.push('/dashboard/user')}
          style={{ background: 'none', border: 'none', color: green, cursor: 'pointer', fontSize: '0.82rem', padding: 0, display: 'block', margin: '0 auto 2rem' }}>
          ← Back to Dashboard
        </button>

      </div>

      <ArenaFooter />
    </div>
  );
}
