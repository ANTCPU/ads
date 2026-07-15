'use client';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ArenaNav from '../../components/ArenaNav';
import ArenaFooter from '../../components/ArenaFooter';
import ModuleSlots from '../../components/ModuleSlots';
import { PLATFORMS, getShareAction, ShareContext } from '../../lib/socialShare';
import { trackClick, recordShare, recordLike, recordBoost, SOURCE } from '../../lib/tracking';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Env ──────────────────────────────────────────────────────────────────────

const APP_URL     = process.env.NEXT_PUBLIC_APP_URL  || 'https://antcpu-ads.vercel.app';
const SUPER_EMAIL = process.env.NEXT_PUBLIC_SUPER_EMAIL || '';

// ─── Types ────────────────────────────────────────────────────────────────────

type Ad = {
  id: string;
  brand: string;
  title: string;
  url: string;
  description: string;
  category: string;
  status: string;
  tier: string;
  pinned: boolean;
  email: string;
  points: number;
  click_count: number;
  share_count: number;
  like_count: number;
  boost_count: number;
  reaction_count: number;
  rank_position?: number;
  image_url: string | null;
  is_country_champion?: boolean;
  country?: string;
};

type SessionUser = {
  name: string;
  email: string;
  brand: string;
  trialStatus: string;
  role?: string;
};

type BrandConfig = {
  name: string;
  primary: string;
  logo?: string;
  site?: string;
};

type ReactionType = 'hot' | 'watching' | 'interesting';
type Toast = { id: string; msg: string };

// ─── Brand Registry ───────────────────────────────────────────────────────────

const BRANDS: Record<string, BrandConfig> = {
  antcpu:      { name: 'ANTCPU ADS',        primary: '#f0883e', logo: '/brands/antcpu/adsnetwork.jpg',       site: 'https://antcpu.com'         },
  mapofpi:     { name: 'Map of Pi',          primary: '#D4AF37', logo: '/brands/mapofpi/map-of-pi-logo.png', site: 'https://mapofpi.com'        },
  pipioneers:  { name: 'PiPioneersX',        primary: '#7928ca',                                              site: 'https://x.com/PiPioneersX'  },
  photography: { name: 'Amanda Photography', primary: '#ff0080',                                              site: 'https://antcpu.com/manda/'  },
};

const SLUG_ALIAS: Record<string, string> = {
  'ads-network':   'antcpu',
  'antcpuads':     'antcpu',
  'adsnetwork':    'antcpu',
  'amanda':        'photography',
  'amandaphoto':   'photography',
  'pipioneersx':   'pipioneers',
};

const TIER_COLOR: Record<string, string> = {
  toptier:  '#f0883e',
  featured: '#ff0080',
  rising:   '#7928ca',
  entry:    '#0070f3',
};

const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'hot',         emoji: '🔥', label: 'Hot'         },
  { type: 'watching',    emoji: '👀', label: 'Watching'    },
  { type: 'interesting', emoji: '💡', label: 'Interesting' },
];

const DEFAULT_SLOTS: (string | null)[] = ['region-map', null, null];

// ─── Tokens ───────────────────────────────────────────────────────────────────

const bg     = '#0a0a0a';
const card   = '#111';
const border = '#1a1a1a';
const muted  = '#555';
const white  = '#fff';
const gold   = '#D4AF37';

// ─── Session ID ───────────────────────────────────────────────────────────────

function getSessionId(): string {
  if (typeof window === 'undefined') return 'ssr';
  let sid = localStorage.getItem('arena_session_id');
  if (!sid) {
    sid = `sid_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('arena_session_id', sid);
  }
  return sid;
}

// ─── Flag lookup ──────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArenaClient() {
  const router = useRouter();
  const params = useParams();
  const slug     = (params?.slug as string || '').toLowerCase();
  const brandKey = SLUG_ALIAS[slug] || slug;
  const config   = BRANDS[brandKey] || { name: slug, primary: '#f0883e' };
  const isMapOfPi = brandKey === 'mapofpi';

  // — state
  const [ads,     setAds]     = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [user,    setUser]    = useState<SessionUser>({ name: '', email: '', brand: '', trialStatus: 'trial' });
  const [slots,   setSlots]   = useState<(string | null)[]>(DEFAULT_SLOTS);
  const [shareAd, setShareAd] = useState<Ad | null>(null);
  const [toast,   setToast]   = useState<Toast | null>(null);

  // — interaction state keyed by ad id
  const [liked,   setLiked]   = useState<Record<string, boolean>>({});
  const [boosted, setBoosted] = useState<Record<string, boolean>>({});
  const [reacted, setReacted] = useState<Record<string, ReactionType | null>>({});

  // — derived
  const isSuper      = user.role === 'super' || (!!SUPER_EMAIL && user.email === SUPER_EMAIL);
  const dashboardHref = isSuper ? '/dashboard/admin' : user.role === 'admin' ? '/dashboard/users' : '/dashboard/user';
  const maxPoints    = ads.reduce((m, a) => Math.max(m, a.points || 0), 1);
  const totalPoints  = ads.reduce((s, a) => s + (a.points || 0), 0);
  const totalClicks  = ads.reduce((s, a) => s + (a.click_count || 0), 0);
  const totalShares  = ads.reduce((s, a) => s + (a.share_count || 0), 0);

  // — country grouping for Map of Pi
  const champAds   = isMapOfPi ? ads.filter(a => a.is_country_champion && a.country) : [];
  const networkAds = isMapOfPi ? ads.filter(a => !a.is_country_champion || !a.country) : ads;
  const countryGroups: Record<string, Ad[]> = {};
  champAds.forEach(ad => {
    const key = ad.country!;
    if (!countryGroups[key]) countryGroups[key] = [];
    countryGroups[key].push(ad);
  });
  const sortedCountries = Object.keys(countryGroups).sort((a, b) => {
    const apts = countryGroups[a].reduce((s, x) => s + (x.points || 0), 0);
    const bpts = countryGroups[b].reduce((s, x) => s + (x.points || 0), 0);
    return bpts - apts;
  });

  // — load user + interaction state
  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }

    const likedMap:   Record<string, boolean>            = {};
    const boostedMap: Record<string, boolean>            = {};
    const reactedMap: Record<string, ReactionType | null> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      if (key.startsWith('liked_'))   likedMap[key.replace('liked_', '')]     = true;
      if (key.startsWith('boosted_')) boostedMap[key.replace('boosted_', '')] = true;
      if (key.startsWith('reacted_')) reactedMap[key.replace('reacted_', '')] = localStorage.getItem(key) as ReactionType;
    }
    setLiked(likedMap);
    setBoosted(boostedMap);
    setReacted(reactedMap);

    fetchAds();
  }, [slug]);

  // — load saved module slots
  useEffect(() => {
    if (!user.email || !slug) return;
    supabase
      .from('arena_modules')
      .select('slots')
      .eq('slug', slug)
      .eq('email', user.email)
      .single()
      .then(({ data }) => { if (data?.slots) setSlots(data.slots); });
  }, [user.email, slug]);

  async function fetchAds() {
    setLoading(true);
    const { data } = await supabase
      .from('ads')
      .select('*')
      .ilike('brand', `%${config.name}%`)
      .eq('status', 'active')
      .order('pinned',  { ascending: false })
      .order('points',  { ascending: false });
    setAds(data || []);
    setLoading(false);
  }

  async function saveModules(newSlots: (string | null)[]) {
    setSlots(newSlots);
    if (!user.email) return;
    await supabase.from('arena_modules').upsert(
      { slug, email: user.email, slots: newSlots, updated_at: new Date().toISOString() },
      { onConflict: 'slug,email' }
    );
  }

  function showToast(id: string, msg: string) {
    setToast({ id, msg });
    setTimeout(() => setToast(null), 2000);
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  async function handleClick(ad: Ad) {
    if (!ad.url || ad.url.trim() === '') return;
    window.open(ad.url, '_blank', 'noopener,noreferrer');
    showToast(ad.id, 'Clicked!');
    const newCount = await trackClick(
      { id: ad.id, brand: ad.brand, title: ad.title, email: ad.email, click_count: ad.click_count },
      user.email || 'visitor',
      SOURCE.BRAND_ARENA,
      supabase
    );
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, click_count: newCount } : a));
  }

  async function handleLike(ad: Ad, e: React.MouseEvent) {
    e.stopPropagation();
    if (liked[ad.id]) return;
    const sid = getSessionId();
    localStorage.setItem(`liked_${ad.id}`, '1');
    setLiked(prev => ({ ...prev, [ad.id]: true }));
    showToast(ad.id, 'Liked!');
    const newCount = await recordLike(
      { id: ad.id, brand: ad.brand, title: ad.title, email: ad.email, like_count: ad.like_count },
      sid, SOURCE.BRAND_ARENA, supabase
    );
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, like_count: newCount } : a));
  }

  async function handleBoost(ad: Ad, e: React.MouseEvent) {
    e.stopPropagation();
    if (boosted[ad.id]) return;
    const sid = getSessionId();
    localStorage.setItem(`boosted_${ad.id}`, '1');
    setBoosted(prev => ({ ...prev, [ad.id]: true }));
    showToast(ad.id, 'Boosted!');
    const newCount = await recordBoost(
      { id: ad.id, brand: ad.brand, title: ad.title, email: ad.email, boost_count: ad.boost_count },
      sid, SOURCE.BRAND_ARENA, supabase
    );
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, boost_count: newCount } : a));
  }

  async function handleReaction(ad: Ad, type: ReactionType, e: React.MouseEvent) {
    e.stopPropagation();
    if (reacted[ad.id]) return;
    const sid = getSessionId();
    localStorage.setItem(`reacted_${ad.id}`, type);
    setReacted(prev => ({ ...prev, [ad.id]: type }));
    const emoji = REACTIONS.find(r => r.type === type)?.emoji || '👍';
    showToast(ad.id, emoji);
    const newCount = (ad.reaction_count || 0) + 1;
    await Promise.all([
      supabase.from('ad_reactions').insert([{ ad_id: ad.id, reaction_type: type, session_id: sid }]),
      supabase.from('ads').update({ reaction_count: newCount }).eq('id', ad.id),
    ]);
    fetch('/api/scout/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_id: ad.id }),
    }).catch(() => {});
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, reaction_count: newCount } : a));
  }

  async function executePlatformShare(ad: Ad, platformKey: string) {
    const platform = PLATFORMS.find(p => p.key === platformKey);
    if (!platform) return;
    const ctx: ShareContext = {
      brand: ad.brand, title: ad.title, description: ad.description, url: ad.url,
      profileUrl: `${APP_URL}/profile/${encodeURIComponent(ad.email)}`,
      category: ad.category, country: ad.country, isChampion: ad.is_country_champion,
    };
    const { url: intentUrl, text } = getShareAction(platform, ctx);
    if (intentUrl) {
      window.open(intentUrl, '_blank', 'noopener,noreferrer');
    } else {
      try { await navigator.clipboard.writeText(text); } catch {}
      showToast(ad.id, 'Copied!');
    }
    const newShares = await recordShare(
      { id: ad.id, brand: ad.brand, title: ad.title, email: ad.email, share_count: ad.share_count },
      user.email || 'visitor', platform.label, SOURCE.BRAND_ARENA, supabase
    );
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, share_count: newShares } : a));
    setShareAd(null);
  }

  // ─── Ad Card ──────────────────────────────────────────────────────────────

  function AdCard({ ad }: { ad: Ad }) {
    const heat       = Math.round(((ad.points || 0) / maxPoints) * 100);
    const hasLiked   = !!liked[ad.id];
    const hasBoosted = !!boosted[ad.id];
    const hasReacted = !!reacted[ad.id];
    const isToast    = toast?.id === ad.id;
    const tierColor  = TIER_COLOR[ad.tier] || muted;

    return (
      <div style={{ background: card, border: `1px solid ${ad.pinned ? config.primary + '60' : border}`, borderRadius: '14px', padding: '1.25rem', position: 'relative', overflow: 'hidden', marginBottom: '0.75rem' }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = config.primary + '80')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = ad.pinned ? config.primary + '60' : border)}
      >
        {/* Pinned accent */}
        {ad.pinned && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${config.primary}, transparent)` }} />}

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.4rem', gap: '0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => router.push(`/profile/${encodeURIComponent(ad.email)}`)}
              style={{ background: 'none', border: 'none', color: config.primary, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', padding: 0, textDecoration: 'underline', textDecorationColor: `${config.primary}50` }}>
              {ad.brand}
            </button>
            {ad.is_country_champion && ad.country && (
              <span style={{ background: `${gold}15`, border: `1px solid ${gold}40`, color: gold, borderRadius: '999px', padding: '0.1rem 0.45rem', fontSize: '0.62rem', fontWeight: 700 }}>
                🏆 {ad.country}
              </span>
            )}
            {ad.pinned && <span style={{ background: `${config.primary}20`, border: `1px solid ${config.primary}40`, color: config.primary, borderRadius: '999px', padding: '0.1rem 0.45rem', fontSize: '0.62rem', fontWeight: 700 }}>⭐ FEATURED</span>}
            <span style={{ color: tierColor, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>{ad.tier}</span>
            <span style={{ color: '#2a2a2a', fontSize: '0.65rem' }}>·</span>
            <span style={{ color: '#2a2a2a', fontSize: '0.65rem' }}>{ad.category}</span>
          </div>
          {/* Rank badge */}
          {ad.rank_position && ad.rank_position >= 1 && ad.rank_position <= 3 && (
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>
              {ad.rank_position === 1 ? '🥇' : ad.rank_position === 2 ? '🥈' : '🥉'}
            </span>
          )}
          {ad.rank_position && ad.rank_position > 3 && (
            <span style={{ fontSize: '0.72rem', color: muted, flexShrink: 0 }}>#{ad.rank_position}</span>
          )}
        </div>

        {/* Image — pinned or non-entry only */}
        {ad.image_url && (ad.pinned || ad.tier !== 'entry') && (
          <img src={ad.image_url} alt={ad.title} style={{ width: '100%', borderRadius: '10px', marginBottom: '0.75rem', maxHeight: '200px', objectFit: 'cover' }} />
        )}

        {/* Title + description */}
        <div style={{ fontWeight: 700, fontSize: '0.92rem', color: white, marginBottom: '0.2rem' }}>{ad.title}</div>
        <div style={{ fontSize: '0.8rem', color: muted, lineHeight: 1.5, marginBottom: '0.5rem' }}>{ad.description}</div>

        {/* Hot meter */}
        <div style={{ height: '2px', background: '#1a1a1a', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.6rem' }}>
          <div style={{ height: '100%', width: `${heat}%`, background: `linear-gradient(90deg, ${config.primary}, ${config.primary}44)`, borderRadius: '999px', transition: 'width 0.4s ease' }} />
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.72rem', color: muted, marginBottom: '0.6rem', flexWrap: 'wrap' }}>
          {(ad.click_count    || 0) > 0 && <span>👆 {ad.click_count}</span>}
          {(ad.share_count    || 0) > 0 && <span>↗ {ad.share_count}</span>}
          {(ad.like_count     || 0) > 0 && <span>😊 {ad.like_count}</span>}
          {(ad.boost_count    || 0) > 0 && <span style={{ color: gold }}>⚡ ×{ad.boost_count}</span>}
          {(ad.reaction_count || 0) > 0 && <span>🔥 {ad.reaction_count}</span>}
          {(ad.points         || 0) > 0 && <span style={{ color: config.primary }}>⚡ {ad.points} pts</span>}
        </div>

        {/* Reaction strip */}
        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.65rem' }} onClick={e => e.stopPropagation()}>
          {REACTIONS.map(r => {
            const active = reacted[ad.id] === r.type;
            const done   = hasReacted;
            return (
              <button key={r.type} onClick={e => handleReaction(ad, r.type, e)} style={{
                background: active ? `${config.primary}20` : 'transparent',
                border: `1px solid ${active ? config.primary : '#222'}`,
                borderRadius: '999px', padding: '0.2rem 0.55rem',
                fontSize: '0.68rem', color: active ? config.primary : '#333',
                cursor: done ? 'default' : 'pointer',
                fontWeight: active ? 700 : 400,
                opacity: done && !active ? 0.35 : 1,
                transition: 'all 0.15s',
              }}>
                {r.emoji}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
          <button onClick={() => handleClick(ad)}
            style={{ flex: 1, background: config.primary, border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, fontSize: '0.78rem', padding: '0.55rem 0', cursor: 'pointer' }}>
            {isToast && toast?.msg === 'Clicked!' ? '✓' : 'Visit →'}
          </button>
          <button onClick={e => handleLike(ad, e)}
            title={hasLiked ? 'Liked' : 'Like'}
            style={{ background: hasLiked ? `${config.primary}20` : 'transparent', border: `1px solid ${hasLiked ? config.primary : border}`, borderRadius: '8px', color: hasLiked ? config.primary : muted, fontWeight: 600, fontSize: '0.78rem', padding: '0.55rem 0.65rem', cursor: hasLiked ? 'default' : 'pointer', transition: 'all 0.15s' }}>
            😊
          </button>
          <button onClick={e => handleBoost(ad, e)}
            title={hasBoosted ? 'Boosted' : 'Boost'}
            style={{ background: hasBoosted ? `${gold}15` : 'transparent', border: `1px solid ${hasBoosted ? gold : border}`, borderRadius: '8px', color: hasBoosted ? gold : muted, fontWeight: 600, fontSize: '0.78rem', padding: '0.55rem 0.65rem', cursor: hasBoosted ? 'default' : 'pointer', transition: 'all 0.15s' }}>
            ⚡
          </button>
          <button onClick={() => setShareAd(ad)}
            style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: muted, fontWeight: 600, fontSize: '0.78rem', padding: '0.55rem 0.65rem', cursor: 'pointer' }}>
            ↗
          </button>
          <button onClick={() => router.push(`/profile/${encodeURIComponent(ad.email)}`)}
            style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: muted, fontWeight: 600, fontSize: '0.78rem', padding: '0.55rem 0.65rem', cursor: 'pointer' }}>
            👤
          </button>
        </div>
      </div>
    );
  }
    // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: bg, minHeight: '100vh', color: white, fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <ArenaNav
        role={(user.role as 'admin' | 'team' | 'user' | 'mod') || 'user'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={(user.trialStatus as 'team' | 'trial' | 'pending') || 'trial'}
        onLogout={() => { localStorage.removeItem('arena_user'); router.push('/'); }}
      />

      {/* Share modal */}
      {shareAd && (
        <>
          <div onClick={() => setShareAd(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1001, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#111', border: `1px solid ${border}`, borderRadius: '16px', padding: '1.5rem', width: '90%', maxWidth: '420px', zIndex: 1002 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: white }}>Share {shareAd.brand}</div>
                <div style={{ fontSize: '0.78rem', color: muted, marginTop: '0.2rem' }}>{shareAd.title}</div>
              </div>
              <button onClick={() => setShareAd(null)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '1.4rem' }}>✕</button>
            </div>
            {toast?.id === shareAd.id && (
              <div style={{ background: '#22c55e20', border: '1px solid #22c55e40', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#22c55e' }}>{toast.msg}</div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {PLATFORMS.map(platform => (
                <button key={platform.key} onClick={() => executePlatformShare(shareAd, platform.key)}
                  style={{ background: `${platform.color}15`, border: `1px solid ${platform.color}30`, borderRadius: '10px', padding: '0.75rem 0.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                  <span style={{ fontSize: '1.2rem' }}>{platform.icon}</span>
                  <span style={{ fontSize: '0.65rem', color: white, fontWeight: 600 }}>{platform.label}</span>
                  {!platform.supportsIntent && <span style={{ fontSize: '0.6rem', color: muted }}>copy</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem' }}>

        {/* Back */}
        <button onClick={() => router.push('/arena')}
          style={{ fontSize: '0.78rem', color: muted, background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1.5rem', padding: 0 }}>
          ← All Brands
        </button>

        {/* Brand header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          {config.logo && (
            <img src={config.logo} alt={config.name}
              style={{ width: '52px', height: '52px', borderRadius: '12px', objectFit: 'cover', border: `1px solid ${border}` }} />
          )}
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: white }}>{config.name}</div>
            <div style={{ fontSize: '0.78rem', color: muted }}>
              Arena · {ads.length} active ads{isSuper ? ' · ⚡ Admin' : ''}
            </div>
          </div>
          {config.site && (
            <a href={config.site} target="_blank" rel="noopener noreferrer"
              style={{ marginLeft: 'auto', background: `${config.primary}15`, border: `1px solid ${config.primary}40`, color: config.primary, borderRadius: '8px', padding: '0.45rem 0.9rem', fontSize: '0.78rem', fontWeight: 700, textDecoration: 'none' }}>
              Visit Site →
            </a>
          )}
        </div>

        {/* Stats bar */}
        {!loading && ads.length > 0 && (
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Ads',    value: ads.length,                   color: config.primary },
              { label: 'Clicks', value: totalClicks,                  color: '#0070f3'      },
              { label: 'Shares', value: totalShares,                  color: '#7928ca'      },
              { label: 'Points', value: totalPoints.toLocaleString(), color: gold           },
            ].map(s => (
              <div key={s.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: '10px', padding: '0.6rem 1rem', textAlign: 'center', flex: 1, minWidth: '70px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.62rem', color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Map of Pi — Champions strip */}
        {isMapOfPi && !loading && sortedCountries.length > 0 && (
          <div style={{ background: `${gold}08`, border: `1px solid ${gold}25`, borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ fontWeight: 800, fontSize: '0.88rem', color: gold }}>🏆 Country Champions</div>
              <a href="/champions" style={{ fontSize: '0.72rem', color: gold, textDecoration: 'none', fontWeight: 700 }}>View All →</a>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {sortedCountries.map(country => {
                const group = countryGroups[country];
                const pts   = group.reduce((s, a) => s + (a.points || 0), 0);
                return (
                  <div key={country} style={{ background: `${gold}12`, border: `1px solid ${gold}30`, borderRadius: '999px', padding: '0.3rem 0.75rem', fontSize: '0.75rem', color: white, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                    <span>{countryFlag(country)}</span>
                    <span style={{ fontWeight: 700 }}>{country}</span>
                    <span style={{ color: gold, fontSize: '0.68rem' }}>⚡{pts}</span>
                    <span style={{ color: muted, fontSize: '0.65rem' }}>{group.length} ad{group.length !== 1 ? 's' : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Module slots */}
        <ModuleSlots
  slots={slots}
  onSave={saveModules}
  context={{
    slug,
    user: {
      email:       user.email,
      name:        user.name,
      brand:       user.brand,
      trialStatus: user.trialStatus,
    },
    ads,
    supabase,
    isSuper,
  }}
/>


        {/* Ads */}
        {loading ? (
          <div style={{ textAlign: 'center', color: muted, padding: '3rem 0' }}>Loading ads...</div>
        ) : ads.length === 0 ? (
          <div style={{ textAlign: 'center', color: muted, padding: '3rem 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
            <div style={{ marginBottom: '1rem' }}>No active ads yet</div>
            <div style={{ fontSize: '0.82rem' }}>Be the first to advertise in the {config.name} Arena.</div>
          </div>
        ) : isMapOfPi ? (
          <>
            {/* ── Country sections ── */}
            {sortedCountries.length > 0 && (
              <div style={{ marginBottom: '2rem' }}>
                <div style={{ fontSize: '0.68rem', color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1.25rem' }}>
                  🌍 Champions by Country
                </div>
                {sortedCountries.map(country => {
                  const group   = countryGroups[country];
                  const flag    = countryFlag(country);
                  const groupPts = group.reduce((s, a) => s + (a.points || 0), 0);
                  return (
                    <div key={country} style={{ marginBottom: '2rem' }}>
                      {/* Country header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: `1px solid ${gold}20` }}>
                        <span style={{ fontSize: '1.4rem' }}>{flag}</span>
                        <span style={{ fontWeight: 800, fontSize: '0.95rem', color: white }}>{country}</span>
                        <span style={{ background: `${gold}20`, border: `1px solid ${gold}50`, color: gold, borderRadius: '999px', padding: '0.1rem 0.45rem', fontSize: '0.62rem', fontWeight: 700 }}>🏆 CHAMPION</span>
                        <span style={{ color: muted, fontSize: '0.7rem', marginLeft: 'auto' }}>
                          {group.length} ad{group.length !== 1 ? 's' : ''} · ⚡ {groupPts} pts
                        </span>
                      </div>
                      {group.map(ad => <AdCard key={ad.id} ad={ad} />)}
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Network ads ── */}
            {networkAds.length > 0 && (
              <div>
                <div style={{ fontSize: '0.68rem', color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
                  🗺️ Map of Pi — Network Ads
                </div>
                {networkAds.map(ad => <AdCard key={ad.id} ad={ad} />)}
              </div>
            )}
          </>
        ) : (
          // ── All other brands — flat list ──
          <div>
            {ads.map(ad => <AdCard key={ad.id} ad={ad} />)}
          </div>
        )}

        {/* Back to dashboard */}
        <button onClick={() => router.push(dashboardHref)}
          style={{ marginTop: '2rem', background: 'none', border: 'none', color: config.primary, cursor: 'pointer', fontSize: '0.82rem', padding: 0, display: 'block', margin: '2rem auto 0' }}>
          ← Back to Dashboard
        </button>

      </div>

      <ArenaFooter />

    </div>
  );
}
