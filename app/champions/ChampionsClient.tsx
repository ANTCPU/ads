'use client';
// app/champions/ChampionsClient.tsx
// v2 (Sep 2026) — Sep 10
// v3 (Sep 2026):
//   — FeaturedPartnerCard compact added above hero
//   — Season 1 countdown banner added below nav
//   — Hero copy broadened — all brands, not just Map of Pi
//   — Bottom CTA — Season 1 button added
//   — Open countries copy — Season 1 context added
//   — isSuper removed — declared but never used

import { useState, useEffect }        from 'react';
import { useRouter }                   from 'next/navigation';
import { createClient }                from '@supabase/supabase-js';
import ArenaNav                        from '../components/ArenaNav';
import ArenaFooter                     from '../components/ArenaFooter';
import FeaturedPartnerCard             from '../components/FeaturedPartnerCard';
import { PLATFORMS, getShareAction,
         ShareContext }                from '../lib/socialShare';
import { trackClick, recordShare,
         SOURCE }                      from '../lib/tracking';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Ad = {
  id: string; brand: string; title: string; url: string;
  description: string; category: string; tier: string;
  pinned: boolean; email: string; points: number;
  click_count: number; share_count: number; like_count: number;
  boost_count: number; reaction_count: number; rank_position?: number;
  image_url: string | null; is_country_champion?: boolean; country?: string;
};

type SessionUser = {
  name: string; email: string; brand: string;
  trialStatus: string; role?: string;
};

type Toast = { id: string; msg: string };

const BRAND_COLORS: Record<string, string> = {
  'Map of Pi':          '#D4AF37',
  'ANTCPU ADS':         '#f0883e',
  'ANTCPU':             '#f0883e',
  'Amanda Photography': '#e91e8c',
  'PiPioneersX':        '#7928ca',
};

const bg     = '#0a0a0a';
const card   = '#111';
const border = '#1a1a1a';
const muted  = '#555';
const white  = '#fff';
const gold   = '#D4AF37';
const orange = '#f0883e';
const piBlue = '#6B46C1';

function getBrandColor(brand: string): string {
  return BRAND_COLORS[brand] || '#888';
}

function countryFlag(country: string): string {
  const flags: Record<string, string> = {
    'Nigeria': '🇳🇬', 'Ghana': '🇬🇭', 'Kenya': '🇰🇪', 'South Africa': '🇿🇦',
    'Ethiopia': '🇪🇹', 'Tanzania': '🇹🇿', 'Uganda': '🇺🇬', 'Cameroon': '🇨🇲',
    'Senegal': '🇸🇳', 'Ivory Coast': '🇨🇮', 'Zimbabwe': '🇿🇼', 'Zambia': '🇿🇲',
    'Rwanda': '🇷🇼', 'Morocco': '🇲🇦', 'Algeria': '🇩🇿', 'Tunisia': '🇹🇳',
    'Egypt': '🇪🇬', 'Mozambique': '🇲🇿', 'DR Congo': '🇨🇩', 'Togo': '🇹🇬',
    'Benin': '🇧🇯', 'Sierra Leone': '🇸🇱', 'Liberia': '🇱🇷',
    'Saudi Arabia': '🇸🇦', 'UAE': '🇦🇪', 'Israel': '🇮🇱',
    'India': '🇮🇳', 'Pakistan': '🇵🇰', 'Bangladesh': '🇧🇩', 'Sri Lanka': '🇱🇰',
    'Nepal': '🇳🇵', 'China': '🇨🇳', 'Japan': '🇯🇵', 'South Korea': '🇰🇷',
    'Hong Kong': '🇭🇰', 'Taiwan': '🇹🇼', 'Singapore': '🇸🇬', 'Malaysia': '🇲🇾',
    'Indonesia': '🇮🇩', 'Philippines': '🇵🇭', 'Vietnam': '🇻🇳', 'Thailand': '🇹🇭',
    'Myanmar': '🇲🇲', 'Cambodia': '🇰🇭', 'Laos': '🇱🇦',
    'Australia': '🇦🇺', 'New Zealand': '🇳🇿',
    'United Kingdom': '🇬🇧', 'Germany': '🇩🇪', 'France': '🇫🇷', 'Spain': '🇪🇸',
    'Italy': '🇮🇹', 'Netherlands': '🇳🇱', 'Portugal': '🇵🇹', 'Greece': '🇬🇷',
    'Sweden': '🇸🇪', 'Norway': '🇳🇴', 'Denmark': '🇩🇰', 'Finland': '🇫🇮',
    'Switzerland': '🇨🇭', 'Austria': '🇦🇹', 'Belgium': '🇧🇪', 'Poland': '🇵🇱',
    'Czech Republic': '🇨🇿', 'Hungary': '🇭🇺', 'Romania': '🇷🇴', 'Bulgaria': '🇧🇬',
    'Serbia': '🇷🇸', 'Croatia': '🇭🇷', 'Slovakia': '🇸🇰', 'Turkey': '🇹🇷',
    'United States': '🇺🇸', 'Canada': '🇨🇦', 'Mexico': '🇲🇽', 'Brazil': '🇧🇷',
    'Argentina': '🇦🇷', 'Colombia': '🇨🇴', 'Venezuela': '🇻🇪', 'Peru': '🇵🇪',
    'Chile': '🇨🇱', 'Ecuador': '🇪🇨', 'Bolivia': '🇧🇴', 'Honduras': '🇭🇳',
    'Guatemala': '🇬🇹', 'El Salvador': '🇸🇻',
  };
  return flags[country] || '🌍';
}

export default function ChampionsClient() {
  const router = useRouter();

  const [champions,     setChampions]     = useState<Ad[]>([]);
  const [openCountries, setOpenCountries] = useState<string[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [user,          setUser]          = useState<SessionUser>({
    name: '', email: '', brand: '', trialStatus: 'trial',
  });
  const [toast,     setToast]     = useState<Toast | null>(null);
  const [shareAd,   setShareAd]   = useState<Ad | null>(null);
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, mins: 0 });

  const totalPoints     = champions.reduce((sum, a) => sum + (a.points || 0), 0);
  const countryAds      = champions.filter(a => !!a.country);
  const globalAds       = champions.filter(a => !a.country);
  const activeCountries = [...new Set(countryAds.map(a => a.country))].length;
  const totalMarketers  = new Set(champions.map(a => a.email)).size;

  const countryGroups: Record<string, Ad[]> = {};
  countryAds.forEach(ad => {
    const key = ad.country!;
    if (!countryGroups[key]) countryGroups[key] = [];
    countryGroups[key].push(ad);
  });
  const sortedCountries = Object.keys(countryGroups).sort((a, b) => {
    const apts = countryGroups[a].reduce((s, x) => s + (x.points || 0), 0);
    const bpts = countryGroups[b].reduce((s, x) => s + (x.points || 0), 0);
    return bpts - apts;
  });

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
    fetchData();

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
    return () => clearInterval(timer);
  }, []);

  const isSeason1Live = countdown.days === 0 && countdown.hours === 0 && countdown.mins === 0;

  async function fetchData() {
    setLoading(true);
    const { data: champs } = await supabase
      .from('ads').select('*')
      .eq('status', 'active')
      .eq('is_country_champion', true)
      .order('points', { ascending: false });

    const { data: allCountryAds } = await supabase
      .from('ads').select('country')
      .eq('status', 'active')
      .not('country', 'is', null);

    const champCountries = new Set(
      (champs || []).map((c: Ad) => c.country).filter(Boolean)
    );
    const allCountries = [
      ...new Set((allCountryAds || []).map((a: any) => a.country).filter(Boolean)),
    ];
    const open = allCountries.filter(c => !champCountries.has(c)).sort();

    setChampions(champs || []);
    setOpenCountries(open);
    setLoading(false);
  }

  function showToast(id: string, msg: string) {
    setToast({ id, msg });
    setTimeout(() => setToast(null), 2000);
  }

  async function handleClick(ad: Ad) {
    if (!ad.url || ad.url.trim() === '') {
      router.push('/guide?ref=champion-ad'); return;
    }
    window.open(ad.url, '_blank', 'noopener,noreferrer');
    showToast(ad.id, 'Clicked!');
    const newCount = await trackClick(
      { id: ad.id, brand: ad.brand, title: ad.title,
        email: ad.email, click_count: ad.click_count },
      user.email || 'visitor', SOURCE.ARENA_FEED, supabase
    );
    setChampions(prev => prev.map(a =>
      a.id === ad.id ? { ...a, click_count: newCount } : a
    ));
  }

  function buildShareCtx(ad: Ad): ShareContext {
    return {
      brand: ad.brand, title: ad.title, description: ad.description,
      url: ad.url,
      profileUrl: `https://antcpu-ads.vercel.app/profile/${encodeURIComponent(ad.email)}`,
      category: ad.category, country: ad.country,
      isChampion: ad.is_country_champion,
      pointsLabel: ad.points > 0 ? `⚡ ${ad.points} pts` : undefined,
    };
  }

  async function executePlatformShare(ad: Ad, platformKey: string) {
    const platform = PLATFORMS.find(p => p.key === platformKey);
    if (!platform) return;
    const { url: intentUrl, text } = getShareAction(platform, buildShareCtx(ad));
    if (platformKey === 'facebook') {
      try { await navigator.clipboard.writeText(text); } catch {}
      showToast(ad.id, '📋 Caption copied — paste it in Facebook');
      setTimeout(() => window.open(intentUrl!, '_blank', 'noopener,noreferrer'), 800);
    } else if (intentUrl) {
      window.open(intentUrl, '_blank', 'noopener,noreferrer');
    } else {
      try { await navigator.clipboard.writeText(text); } catch {}
      showToast(ad.id, 'Copied!');
    }
    const newShares = await recordShare(
      { id: ad.id, brand: ad.brand, title: ad.title,
        email: ad.email, share_count: ad.share_count },
      user.email || 'visitor', platform.label, SOURCE.ARENA_FEED, supabase
    );
    setChampions(prev => prev.map(a =>
      a.id === ad.id ? { ...a, share_count: newShares } : a
    ));
    setShareAd(null);
  }

  function AdCard({ ad }: { ad: Ad }) {
    const color   = getBrandColor(ad.brand);
    const isToast = toast?.id === ad.id;
    const preview = ad.description.length > 120
      ? ad.description.slice(0, ad.description.lastIndexOf(' ', 120)) + '…'
      : ad.description;
    return (
      <div style={{ background: card, border: `1px solid ${gold}30`,
        borderRadius: '14px', padding: '1.1rem 1.25rem',
        position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0,
          height: '2px', background: `linear-gradient(90deg, ${gold}, transparent)` }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem',
          marginBottom: '0.35rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => router.push(`/profile/${encodeURIComponent(ad.email)}`)}
            style={{ background: 'none', border: 'none', color, fontWeight: 700,
              fontSize: '0.82rem', cursor: 'pointer',
              textDecoration: 'underline', textDecorationColor: `${color}50`, padding: 0 }}
          >
            {ad.brand}
          </button>
          <span style={{ color: '#2a2a2a', background: '#1a1a1a', borderRadius: '4px',
            padding: '0.1rem 0.4rem', fontSize: '0.62rem',
            fontWeight: 700, textTransform: 'uppercase' }}>{ad.tier}</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: white,
          marginBottom: '0.2rem' }}>{ad.title}</div>
        <div style={{ fontSize: '0.78rem', color: muted, lineHeight: 1.5,
          marginBottom: '0.65rem' }}>{preview}</div>
        <div style={{ display: 'flex', gap: '0.65rem', fontSize: '0.72rem',
          color: muted, marginBottom: '0.65rem', flexWrap: 'wrap' }}>
          {(ad.click_count    || 0) > 0 && <span>👆 {ad.click_count}</span>}
          {(ad.share_count    || 0) > 0 && <span>↗ {ad.share_count}</span>}
          {(ad.like_count     || 0) > 0 && <span>😊 {ad.like_count}</span>}
          {(ad.boost_count    || 0) > 0 && <span style={{ color: gold }}>⚡ ×{ad.boost_count}</span>}
          {(ad.reaction_count || 0) > 0 && <span>🔥 {ad.reaction_count}</span>}
          {(ad.points         || 0) > 0 && <span style={{ color: gold }}>⚡ {ad.points} pts</span>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
          <button onClick={() => handleClick(ad)}
            style={{ flex: 1, background: color, border: 'none', borderRadius: '8px',
              color: '#000', fontWeight: 700, fontSize: '0.78rem',
              padding: '0.55rem 0', cursor: 'pointer' }}>
            {isToast && toast?.msg === 'Clicked!' ? '✓' : 'Visit →'}
          </button>
          <button onClick={() => setShareAd(ad)}
            style={{ background: 'transparent', border: `1px solid ${border}`,
              borderRadius: '8px',
              color: isToast && toast?.msg === 'Copied!' ? '#22c55e' : muted,
              fontWeight: 600, fontSize: '0.78rem',
              padding: '0.55rem 0.75rem', cursor: 'pointer' }}>
            {isToast && toast?.msg === 'Copied!' ? '✓' : '↗ Share'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: bg, minHeight: '100vh', color: white,
      fontFamily: 'system-ui, sans-serif' }}>

      <ArenaNav
        role={(user.role as 'admin' | 'team' | 'user' | 'mod') || 'user'}
        userName={user.name} userEmail={user.email} userBrand={user.brand}
        trialStatus={(user.trialStatus as 'team' | 'trial' | 'pending') || 'trial'}
        onLogout={() => { localStorage.removeItem('arena_user'); router.push('/'); }}
      />

      {/* ── Season 1 banner ── */}
      {!isSeason1Live ? (
        <div style={{
          background:     `linear-gradient(90deg, ${gold}15, ${orange}10, transparent)`,
          borderBottom:   `1px solid ${gold}30`,
          padding:        '8px 1.5rem',
          display:        'flex', alignItems: 'center',
          justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🍂</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: gold }}>
              Season 1 · The Foundation
            </span>
            <span style={{ fontSize: '11px', color: muted }}>
              Opens Sep 22 · Fresh cycle · New champions crowned
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '4px', fontSize: '11px' }}>
              {[
                { v: countdown.days,  l: 'd' },
                { v: countdown.hours, l: 'h' },
                { v: countdown.mins,  l: 'm' },
              ].map(c => (
                <span key={c.l} style={{
                  background: `${gold}15`, border: `1px solid ${gold}30`,
                  borderRadius: '5px', padding: '2px 6px',
                  color: gold, fontWeight: 800,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {String(c.v).padStart(2, '0')}{c.l}
                </span>
              ))}
            </div>
            <a href="/arena/season1" style={{
              background: gold, borderRadius: '6px', color: '#000',
              fontWeight: 800, fontSize: '11px', padding: '4px 12px',
              textDecoration: 'none',
            }}>
              Join →
            </a>
          </div>
        </div>
      ) : (
        <div style={{
          background: `${gold}15`, borderBottom: `1px solid ${gold}30`,
          padding: '8px 1.5rem', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%',
            background: gold, display: 'inline-block' }} />
          <span style={{ fontSize: '12px', fontWeight: 700, color: gold }}>
            🍂 Season 1 is live — The Foundation has begun
          </span>
          <a href="/arena/season1" style={{
            marginLeft: 'auto', background: gold, borderRadius: '6px',
            color: '#000', fontWeight: 800, fontSize: '11px',
            padding: '4px 12px', textDecoration: 'none',
          }}>
            Enter →
          </a>
        </div>
      )}

      {/* Share modal */}
      {shareAd && (
        <>
          <div onClick={() => setShareAd(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
              zIndex: 1001, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)', background: '#111',
            border: `1px solid ${border}`, borderRadius: '16px',
            padding: '1.5rem', width: '90%', maxWidth: '420px', zIndex: 1002 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: white }}>
                  Share {shareAd.brand}
                </div>
                <div style={{ fontSize: '0.78rem', color: muted, marginTop: '0.2rem' }}>
                  {shareAd.title}
                </div>
              </div>
              <button onClick={() => setShareAd(null)}
                style={{ background: 'none', border: 'none', color: muted,
                  cursor: 'pointer', fontSize: '1.4rem' }}>✕</button>
            </div>
            {toast?.id === shareAd.id && (
              <div style={{ background: '#22c55e20', border: '1px solid #22c55e40',
                borderRadius: '8px', padding: '0.5rem 0.75rem',
                marginBottom: '0.75rem', fontSize: '0.8rem', color: '#22c55e' }}>
                {toast.msg}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {PLATFORMS.map(platform => (
                <button key={platform.key}
                  onClick={() => executePlatformShare(shareAd, platform.key)}
                  style={{ background: `${platform.color}15`,
                    border: `1px solid ${platform.color}30`, borderRadius: '10px',
                    padding: '0.75rem 0.5rem', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{platform.icon}</span>
                  <span style={{ fontSize: '0.65rem', color: white, fontWeight: 600 }}>
                    {platform.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Main */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem' }}>

        {/* ── Featured Partner ── */}
        <FeaturedPartnerCard season="Season 1" compact />

        {/* Hero header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2.2rem', marginBottom: '0.5rem' }}>🏆</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: gold,
            margin: '0 0 0.4rem' }}>
            Country Champions
          </h1>
          <p style={{ color: muted, fontSize: '0.88rem', margin: '0 0 0.75rem' }}>
            Arena champions representing their countries. Season 1 opens September 22.
          </p>
          <p style={{ color: '#333', fontSize: '0.78rem', margin: 0 }}>
            Every Map of Pi user is a country champion by default.
            Share their ads. Help them climb. Earn your own spot in Season 1.
          </p>
        </div>

        {/* Map of Pi campaign strip */}
        <div style={{ background: `${gold}08`, border: `1px solid ${gold}25`,
          borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '2rem',
          display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '1.8rem' }}>🗺️</div>
          <div style={{ flex: 1, minWidth: '200px' }}>
            <div style={{ fontWeight: 800, fontSize: '0.92rem', color: gold,
              marginBottom: '0.2rem' }}>Map of Pi Campaign</div>
            <div style={{ fontSize: '0.78rem', color: muted, lineHeight: 1.5 }}>
              2.1M+ users · 148K sellers · 173K+ transactions · 8 languages · Growing daily.
              Each pioneer below is a real seller or marketer building Pi commerce in their country.
            </div>
          </div>
          <button
            onClick={() => window.open('https://mapofpi.com', '_blank', 'noopener,noreferrer')}
            style={{ background: gold, border: 'none', borderRadius: '8px',
              color: '#000', fontWeight: 700, fontSize: '0.78rem',
              padding: '0.55rem 1.1rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Visit Map of Pi →
          </button>
        </div>

        {/* Stats bar */}
        {!loading && (
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center',
            marginBottom: '2rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Active Countries', value: activeCountries,              color: gold   },
              { label: 'Pi Marketers',     value: totalMarketers,               color: piBlue },
              { label: 'Total Points',     value: totalPoints.toLocaleString(), color: orange },
            ].map(s => (
              <div key={s.label} style={{ background: card, border: `1px solid ${border}`,
                borderRadius: '12px', padding: '0.75rem 1.5rem',
                textAlign: 'center', minWidth: '100px' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '0.68rem', color: muted, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', color: muted, padding: '3rem 0' }}>
            Loading champions...
          </div>
        ) : champions.length === 0 ? (
          <div style={{ textAlign: 'center', color: muted, padding: '3rem 0' }}>
            No champions yet. Season 1 opens September 22 — be the first.
          </div>
        ) : (
          <>
            {/* ── Country sections ── */}
            {sortedCountries.length > 0 && (
              <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: muted, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  marginBottom: '1.25rem' }}>
                  🌍 Champions by Country
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                  {sortedCountries.map(country => {
                    const group    = countryGroups[country];
                    const flag     = countryFlag(country);
                    const groupPts = group.reduce((s, a) => s + (a.points || 0), 0);
                    return (
                      <div key={country}>
                        <div style={{ display: 'flex', alignItems: 'center',
                          gap: '0.6rem', marginBottom: '0.75rem',
                          paddingBottom: '0.6rem', borderBottom: `1px solid ${gold}20` }}>
                          <span style={{ fontSize: '1.5rem' }}>{flag}</span>
                          <span style={{ fontWeight: 800, fontSize: '1rem',
                            color: white }}>{country}</span>
                          <span style={{ background: `${gold}20`,
                            border: `1px solid ${gold}50`, color: gold,
                            borderRadius: '999px', padding: '0.1rem 0.5rem',
                            fontSize: '0.62rem', fontWeight: 700 }}>
                            🏆 CHAMPION
                          </span>
                          <span style={{ color: muted, fontSize: '0.7rem',
                            marginLeft: 'auto' }}>
                            {group.length} ad{group.length !== 1 ? 's' : ''} · ⚡ {groupPts} pts
                          </span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column',
                          gap: '0.75rem' }}>
                          {group.map(ad => <AdCard key={ad.id} ad={ad} />)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Global / brand-level Map of Pi ads ── */}
            {globalAds.length > 0 && (
              <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ fontSize: '0.7rem', color: muted, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  marginBottom: '1.25rem' }}>
                  🗺️ Map of Pi — Network Ads
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {globalAds.map(ad => <AdCard key={ad.id} ad={ad} />)}
                </div>
              </div>
            )}
          </>
        )}

        {/* Open countries */}
        {!loading && openCountries.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '0.7rem', color: muted, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              marginBottom: '0.75rem' }}>
              🌍 Open Countries — No Champion Yet
            </div>
            <div style={{ fontSize: '0.78rem', color: '#2a2a2a', marginBottom: '0.75rem' }}>
              These countries have active ads but no champion assigned.
              First to earn the most points in Season 1 wins the seat.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {openCountries.map(country => (
                <div key={country} style={{
                  background: '#111', border: '1px solid #1e1e1e',
                  borderRadius: '999px', padding: '0.3rem 0.75rem',
                  fontSize: '0.75rem', color: muted,
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                }}>
                  <span>{countryFlag(country)}</span>
                  <span>{country}</span>
                  <span style={{ color: '#2a2a2a', fontWeight: 700 }}>+</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── CTA ── */}
        <div style={{ background: `${gold}08`, border: `1px solid ${gold}25`,
          borderRadius: '16px', padding: '2rem', textAlign: 'center',
          marginBottom: '1rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
            background: `linear-gradient(90deg, transparent, ${gold}, transparent)` }} />
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: white,
            marginBottom: '0.4rem' }}>
            Claim Your Country
          </div>
          <div style={{ fontSize: '0.85rem', color: muted, marginBottom: '0.5rem' }}>
            Get your brand in the Arena. Earn points. Become the champion of your nation.
          </div>
          <div style={{ fontSize: '0.75rem', color: '#2a2a2a', marginBottom: '1.25rem' }}>
            90 days free · No credit card · No contracts
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center',
            flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/mapofpi/create-shop-ad')}
              style={{ background: gold, border: 'none', borderRadius: '10px',
                color: '#000', fontWeight: 800, fontSize: '0.95rem',
                padding: '0.85rem 2rem', cursor: 'pointer' }}>
              Claim Your Country →
            </button>
            <a href="/arena/season1"
              style={{ background: 'transparent', border: `1px solid ${gold}50`,
                borderRadius: '10px', color: gold, fontWeight: 700,
                fontSize: '0.95rem', padding: '0.85rem 2rem',
                textDecoration: 'none', display: 'inline-block' }}>
              🍂 Join Season 1 →
            </a>
            <button
              onClick={() => window.open('https://mapofpi.com', '_blank', 'noopener,noreferrer')}
              style={{ background: 'transparent', border: `1px solid #333`,
                borderRadius: '10px', color: muted, fontWeight: 700,
                fontSize: '0.95rem', padding: '0.85rem 2rem', cursor: 'pointer' }}>
              Join Map of Pi →
            </button>
          </div>
        </div>

        {/* Back */}
        <button
          onClick={() => router.push('/arena')}
          style={{ background: 'none', border: 'none', color: orange,
            cursor: 'pointer', fontSize: '0.82rem', padding: 0,
            display: 'block', margin: '1.5rem auto 0' }}>
          ← Back to Arena
        </button>

      </div>

      <ArenaFooter />

    </div>
  );
}

