'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ArenaNav from '../components/ArenaNav';
import ArenaFooter from '../components/ArenaFooter';
import { PLATFORMS, getShareAction, ShareContext } from '../lib/socialShare';
import { trackClick, recordShare, recordLike, recordBoost, SOURCE } from '../lib/tracking';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Env ──────────────────────────────────────────────────────────────────────

const SUPER_EMAIL = process.env.NEXT_PUBLIC_SUPER_EMAIL || '';

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

type Toast = { id: string; msg: string };
type ReactionType = 'hot' | 'watching' | 'interesting';

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND_COLORS: Record<string, string> = {
  'Map of Pi':          '#D4AF37',
  'ANTCPU ADS':         '#f0883e',
  'ANTCPU':             '#f0883e',
  'Amanda Photography': '#e91e8c',
  'PiPioneersX':        '#7928ca',
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

const bg     = '#0a0a0a';
const card   = '#111';
const border = '#1a1a1a';
const muted  = '#555';
const white  = '#fff';
const orange = '#f0883e';
const gold   = '#D4AF37';

function getBrandColor(brand: string): string {
  return BRAND_COLORS[brand] || '#888';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArenaUniversalClient() {
  const router = useRouter();

  const [ads,     setAds]     = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [user,    setUser]    = useState<SessionUser>({ name: '', email: '', brand: '', trialStatus: 'trial' });
  const [toast,   setToast]   = useState<Toast | null>(null);
  const [preview, setPreview] = useState<Ad | null>(null);
  const [shareAd, setShareAd] = useState<Ad | null>(null);

  // — interaction state keyed by ad id
  const [liked,   setLiked]   = useState<Record<string, boolean>>({});
  const [boosted, setBoosted] = useState<Record<string, boolean>>({});
  const [reacted, setReacted] = useState<Record<string, ReactionType | null>>({});

  // — derived
  const maxPoints   = ads.reduce((m, a) => Math.max(m, a.points || 0), 1);
  const isSuper     = user.role === 'super' || (!!SUPER_EMAIL && user.email === SUPER_EMAIL);
  const totalBrands = new Set(ads.map(a => a.brand)).size;
  const totalPoints = ads.reduce((sum, a) => sum + (a.points || 0), 0);

  // — load user + ads + localStorage interaction state
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
  }, []);

  async function fetchAds() {
    setLoading(true);
    const { data } = await supabase
      .from('ads')
      .select('*')
      .eq('status', 'active')
      .order('pinned',  { ascending: false })
      .order('points',  { ascending: false });
    setAds(data || []);
    setLoading(false);
  }

  function showToast(id: string, msg: string) {
    setToast({ id, msg });
    setTimeout(() => setToast(null), 2000);
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────

  async function handleClick(ad: Ad) {
    if (!ad.url || ad.url.trim() === '') {
      router.push('/guide?ref=champion-ad');
      return;
    }
    window.open(ad.url, '_blank', 'noopener,noreferrer');
    showToast(ad.id, 'Clicked!');
    const newCount = await trackClick(
      { id: ad.id, brand: ad.brand, title: ad.title, email: ad.email, click_count: ad.click_count },
      user.email || 'visitor',
      SOURCE.ARENA_FEED,
      supabase
    );
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, click_count: newCount } : a));
    if (preview?.id === ad.id) setPreview(p => p ? { ...p, click_count: newCount } : p);
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
      sid,
      SOURCE.ARENA_FEED,
      supabase
    );
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, like_count: newCount } : a));
    if (preview?.id === ad.id) setPreview(p => p ? { ...p, like_count: newCount } : p);
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
      sid,
      SOURCE.ARENA_FEED,
      supabase
    );
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, boost_count: newCount } : a));
    if (preview?.id === ad.id) setPreview(p => p ? { ...p, boost_count: newCount } : p);
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
    if (preview?.id === ad.id) setPreview(p => p ? { ...p, reaction_count: newCount } : p);
  }

  async function executePlatformShare(ad: Ad, platformKey: string) {
    const platform = PLATFORMS.find(p => p.key === platformKey);
    if (!platform) return;
    const ctx: ShareContext = {
      brand: ad.brand, title: ad.title, description: ad.description,
      url: ad.url,
      profileUrl: `https://antcpu-ads.vercel.app/profile/${encodeURIComponent(ad.email)}`,
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
      user.email || 'visitor', platform.label, SOURCE.ARENA_FEED, supabase
    );
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, share_count: newShares } : a));
    setShareAd(null);
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

      {/* Preview modal */}
      {preview && (() => {
        const color   = getBrandColor(preview.brand);
        const isToast = toast?.id === preview.id;
        const heat    = Math.round(((preview.points || 0) / maxPoints) * 100);
        return (
          <>
            <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, backdropFilter: 'blur(4px)' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: card, border: `1px solid ${border}`, borderRadius: '16px', padding: '1.5rem', width: '90%', maxWidth: '480px', zIndex: 1000, maxHeight: '90vh', overflowY: 'auto' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color }}>{preview.brand}</div>
                  {preview.is_country_champion && preview.country && (
                    <div style={{ fontSize: '0.72rem', color: gold, marginTop: '0.15rem' }}>🏆 {preview.country} Champion</div>
                  )}
                  <div style={{ fontSize: '0.72rem', color: muted, marginTop: '0.15rem' }}>
                    <span style={{ color: TIER_COLOR[preview.tier] || muted }}>{preview.tier}</span>{' · '}{preview.category}
                  </div>
                </div>
                <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '1.4rem' }}>✕</button>
              </div>

              {/* Hot meter */}
              <div style={{ height: '3px', background: '#1a1a1a', borderRadius: '999px', overflow: 'hidden', marginBottom: '1rem' }}>
                <div style={{ height: '100%', width: `${heat}%`, background: `linear-gradient(90deg, ${color}, ${color}66)`, borderRadius: '999px', transition: 'width 0.4s ease' }} />
              </div>

              {/* Title + description */}
              <div style={{ marginBottom: '0.85rem' }}>
                <div style={{ fontWeight: 700, fontSize: '1.05rem', color: white, marginBottom: '0.35rem' }}>{preview.title}</div>
                <div style={{ fontSize: '0.85rem', color: muted, lineHeight: 1.6 }}>{preview.description}</div>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.78rem', color: muted, marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                <span>👆 {preview.click_count || 0}</span>
                <span>↗ {preview.share_count || 0}</span>
                {(preview.like_count     || 0) > 0 && <span>😊 {preview.like_count}</span>}
                {(preview.boost_count    || 0) > 0 && <span style={{ color: gold }}>⚡ ×{preview.boost_count}</span>}
                {(preview.reaction_count || 0) > 0 && <span>🔥 {preview.reaction_count}</span>}
                <span style={{ color: orange }}>⚡ {preview.points || 0} pts</span>
                {preview.rank_position && <span style={{ color: gold }}>#{preview.rank_position}</span>}
              </div>

              {/* Reactions strip */}
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
                {REACTIONS.map(r => {
                  const active = reacted[preview.id] === r.type;
                  const done   = !!reacted[preview.id];
                  return (
                    <button key={r.type} onClick={e => handleReaction(preview, r.type, e)} style={{ background: active ? `${color}25` : '#0a0a0a', border: `1px solid ${active ? color : '#222'}`, borderRadius: '999px', padding: '0.3rem 0.75rem', fontSize: '0.75rem', color: active ? color : muted, cursor: done ? 'default' : 'pointer', fontWeight: active ? 700 : 400, opacity: done && !active ? 0.4 : 1, transition: 'all 0.15s' }}>
                      {r.emoji} {r.label}
                    </button>
                  );
                })}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleClick(preview)} style={{ flex: 1, background: color, border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, fontSize: '0.85rem', padding: '0.7rem', cursor: 'pointer' }}>
                  {isToast && toast?.msg === 'Clicked!' ? '✓ Clicked!' : 'Visit →'}
                </button>
                <button onClick={e => handleLike(preview, e)} style={{ background: liked[preview.id] ? `${color}25` : 'transparent', border: `1px solid ${liked[preview.id] ? color : border}`, borderRadius: '8px', color: liked[preview.id] ? color : muted, fontWeight: 600, fontSize: '0.85rem', padding: '0.7rem 1rem', cursor: liked[preview.id] ? 'default' : 'pointer' }}>
                  😊
                </button>
                <button onClick={e => handleBoost(preview, e)} style={{ background: boosted[preview.id] ? `${gold}20` : 'transparent', border: `1px solid ${boosted[preview.id] ? gold : border}`, borderRadius: '8px', color: boosted[preview.id] ? gold : muted, fontWeight: 600, fontSize: '0.85rem', padding: '0.7rem 1rem', cursor: boosted[preview.id] ? 'default' : 'pointer' }}>
                  ⚡
                </button>
                <button onClick={() => { setShareAd(preview); setPreview(null); }} style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: white, fontWeight: 600, fontSize: '0.85rem', padding: '0.7rem 1rem', cursor: 'pointer' }}>↗</button>
                <button onClick={() => router.push(`/profile/${encodeURIComponent(preview.email)}`)} style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: muted, fontWeight: 600, fontSize: '0.85rem', padding: '0.7rem 1rem', cursor: 'pointer' }}>👤</button>
              </div>

            </div>
          </>
        );
      })()}

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
                <button key={platform.key} onClick={() => executePlatformShare(shareAd, platform.key)} style={{ background: `${platform.color}15`, border: `1px solid ${platform.color}30`, borderRadius: '10px', padding: '0.75rem 0.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
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

        {/* Header stats */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Live Ads',     value: ads.length,                   color: orange },
            { label: 'Brands',       value: totalBrands,                  color: '#0070f3' },
            { label: 'Total Points', value: totalPoints.toLocaleString(), color: gold },
          ].map(s => (
            <div key={s.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '0.75rem 1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Super admin badge */}
        {isSuper && (
          <div style={{ background: '#f0883e15', border: '1px solid #f0883e30', borderRadius: '8px', padding: '0.5rem 1rem', marginBottom: '1rem', fontSize: '0.78rem', color: orange, textAlign: 'center' }}>
            ⚡ Super Admin — Full Arena View
          </div>
        )}

        {/* Ad grid */}
        {loading ? (
          <div style={{ textAlign: 'center', color: muted, padding: '3rem 0' }}>Loading the Arena...</div>
        ) : ads.length === 0 ? (
          <div style={{ textAlign: 'center', color: muted, padding: '3rem 0' }}>No active ads yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ads.map(ad => {
              const color      = getBrandColor(ad.brand);
              const isToast    = toast?.id === ad.id;
              const heat       = Math.round(((ad.points || 0) / maxPoints) * 100);
              const hasLiked   = !!liked[ad.id];
              const hasBoosted = !!boosted[ad.id];
              const hasReacted = !!reacted[ad.id];

              return (
                <div
                  key={ad.id}
                  onClick={() => setPreview(ad)}
                  style={{ background: card, border: `1px solid ${ad.pinned ? color + '60' : border}`, borderRadius: '14px', padding: '1.25rem', cursor: 'pointer', transition: 'border-color 0.15s', position: 'relative', overflow: 'hidden' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = color + '80')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = ad.pinned ? color + '60' : border)}
                >
                  {/* Pinned badge */}
                  {ad.pinned && (
                    <div style={{ position: 'absolute', top: '0.6rem', right: '0.6rem' }}>
                      <span style={{ background: `${color}20`, border: `1px solid ${color}40`, color, borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.62rem', fontWeight: 700 }}>⭐ FEATURED</span>
                    </div>
                  )}

                  {/* Rank badge */}
                  {ad.rank_position && ad.rank_position <= 3 && (
                    <div style={{ position: 'absolute', top: '0.6rem', left: '0.6rem', fontSize: '1.1rem' }}>
                      {ad.rank_position === 1 ? '🥇' : ad.rank_position === 2 ? '🥈' : '🥉'}
                    </div>
                  )}

                  {/* Brand + champion */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
                    <button
                      onClick={e => { e.stopPropagation(); router.push(`/profile/${encodeURIComponent(ad.email)}`); }}
                      style={{ fontWeight: 700, fontSize: '0.82rem', color, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: `${color}50`, background: 'none', border: 'none', padding: 0 }}
                    >
                      {ad.brand}
                    </button>
                    {ad.is_country_champion && ad.country && (
                      <span style={{ background: `${gold}15`, border: `1px solid ${gold}40`, color: gold, borderRadius: '999px', padding: '0.1rem 0.45rem', fontSize: '0.62rem', fontWeight: 700 }}>🏆 {ad.country}</span>
                    )}
                    <span style={{ color: TIER_COLOR[ad.tier] || muted, fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase' }}>{ad.tier}</span>
                  </div>

                  {/* Title + description */}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.92rem', color: white, marginBottom: '0.2rem' }}>{ad.title}</div>
                    <div style={{ fontSize: '0.8rem', color: muted, lineHeight: 1.5 }}>
                      {ad.description.length > 100 ? ad.description.slice(0, 100) + '…' : ad.description}
                    </div>
                  </div>

                  {/* Hot meter */}
                  <div style={{ height: '2px', background: '#1a1a1a', borderRadius: '999px', overflow: 'hidden', marginBottom: '0.6rem' }}>
                    <div style={{ height: '100%', width: `${heat}%`, background: `linear-gradient(90deg, ${color}, ${color}44)`, borderRadius: '999px', transition: 'width 0.4s ease' }} />
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.72rem', color: muted, marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                    {(ad.click_count    || 0) > 0 && <span>👆 {ad.click_count}</span>}
                    {(ad.share_count    || 0) > 0 && <span>↗ {ad.share_count}</span>}
                    {(ad.like_count     || 0) > 0 && <span>😊 {ad.like_count}</span>}
                    {(ad.boost_count    || 0) > 0 && <span style={{ color: gold }}>⚡ ×{ad.boost_count}</span>}
                    {(ad.reaction_count || 0) > 0 && <span>🔥 {ad.reaction_count}</span>}
                    {(ad.points        || 0) > 0 && <span style={{ color: orange }}>⚡ {ad.points}</span>}
                  </div>

                  {/* Reaction strip */}
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.65rem' }} onClick={e => e.stopPropagation()}>
                    {REACTIONS.map(r => {
                      const active = reacted[ad.id] === r.type;
                      const done   = hasReacted;
                      return (
                        <button
                          key={r.type}
                          onClick={e => handleReaction(ad, r.type, e)}
                          style={{
                            background: active ? `${color}20` : 'transparent',
                            border: `1px solid ${active ? color : '#222'}`,
                            borderRadius: '999px',
                            padding: '0.2rem 0.55rem',
                            fontSize: '0.68rem',
                            color: active ? color : '#333',
                            cursor: done ? 'default' : 'pointer',
                            fontWeight: active ? 700 : 400,
                            opacity: done && !active ? 0.35 : 1,
                            transition: 'all 0.15s',
                          }}
                        >
                          {r.emoji}
                        </button>
                      );
                    })}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleClick(ad)}
                      style={{ flex: 1, background: color, border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, fontSize: '0.78rem', padding: '0.55rem 0', cursor: 'pointer' }}
                    >
                      {isToast && toast?.msg === 'Clicked!' ? '✓' : 'Visit →'}
                    </button>
                    <button
                      onClick={e => handleLike(ad, e)}
                      title={hasLiked ? 'Liked' : 'Like this ad'}
                      style={{
                        background: hasLiked ? `${color}20` : 'transparent',
                        border: `1px solid ${hasLiked ? color : border}`,
                        borderRadius: '8px',
                        color: hasLiked ? color : muted,
                        fontWeight: 600, fontSize: '0.78rem',
                        padding: '0.55rem 0.65rem',
                        cursor: hasLiked ? 'default' : 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      😊
                    </button>
                    <button
                      onClick={e => handleBoost(ad, e)}
                      title={hasBoosted ? 'Boosted' : 'Boost this ad'}
                      style={{
                        background: hasBoosted ? `${gold}15` : 'transparent',
                        border: `1px solid ${hasBoosted ? gold : border}`,
                        borderRadius: '8px',
                        color: hasBoosted ? gold : muted,
                        fontWeight: 600, fontSize: '0.78rem',
                        padding: '0.55rem 0.65rem',
                        cursor: hasBoosted ? 'default' : 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      ⚡
                    </button>
                    <button
                      onClick={() => setShareAd(ad)}
                      style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: isToast && toast?.msg === 'Copied!' ? '#22c55e' : muted, fontWeight: 600, fontSize: '0.78rem', padding: '0.55rem 0.65rem', cursor: 'pointer' }}
                    >
                      {isToast && toast?.msg === 'Copied!' ? '✓' : '↗'}
                    </button>
                    <button
                      onClick={() => setPreview(ad)}
                      style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: muted, fontWeight: 600, fontSize: '0.78rem', padding: '0.55rem 0.65rem', cursor: 'pointer' }}
                    >
                      👁
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Bottom CTA */}
        {!loading && (
          <div style={{ background: '#f0883e08', border: '1px solid #f0883e20', borderRadius: '16px', padding: '2rem', textAlign: 'center', marginTop: '2.5rem' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: white, marginBottom: '0.4rem' }}>Join the Network</div>
            <div style={{ fontSize: '0.85rem', color: muted, marginBottom: '1.25rem' }}>Get your brand in the Arena.</div>
            <div style={{ fontSize: '0.75rem', color: muted, marginBottom: '1.25rem' }}>3-day free trial · $9.99/mo · No contracts</div>
            <button
              onClick={() => router.push('/login')}
              style={{ background: orange, border: 'none', borderRadius: '10px', color: '#000', fontWeight: 800, fontSize: '1rem', padding: '0.9rem 2.5rem', cursor: 'pointer' }}
            >
              Start Free Trial →
            </button>
          </div>
        )}

        {/* Back to dashboard */}
        <button
          onClick={() => router.push('/dashboard/user')}
          style={{ marginTop: '2rem', background: 'none', border: 'none', color: orange, cursor: 'pointer', fontSize: '0.82rem', padding: 0, display: 'block', margin: '2rem auto 0' }}
        >
          ← Back to Dashboard
        </button>

      </div>

      <ArenaFooter />

    </div>
  );
}

