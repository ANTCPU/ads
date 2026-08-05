// app/arena/ArenaUniversalClient.tsx
// ─────────────────────────────────────────────────────────────────────────────
// Arena 1 — universal client
// Phase 1: text ads + country champion flags + brand icons (when image_url set)
// Phase 2: images via Amanda Photography partnership (admin-controlled)
// Phase 3: video streaming (future paid — behind the scenes)
// ─────────────────────────────────────────────────────────────────────────────
'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ArenaNav from '../components/ArenaNav';
import ArenaFooter from '../components/ArenaFooter';
import { PLATFORMS, getShareAction, ShareContext } from '../lib/socialShare';
import { trackClick, recordShare, recordLike, recordBoost, SOURCE } from '../lib/tracking';
import ShareModule from '../modules/share';
import ArchiveModule from '../modules/archive'; 
import { clearSessionCookie } from '../lib/session';


// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Env ──────────────────────────────────────────────────────────────────────
const SUPER_EMAIL    = process.env.NEXT_PUBLIC_SUPER_EMAIL || '';
const SOCIAL_PACK_API = 'https://amandaland.vercel.app/api/social-pack';

// ─── Mobile share platforms — top 3 only ─────────────────────────────────────
const MOBILE_PLATFORMS = ['whatsapp', 'facebook', 'telegram'];

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
  id: string; brand: string; title: string; url: string;
  description: string; category: string; status: string;
  tier: string; pinned: boolean; email: string; points: number;
  click_count: number; share_count: number; like_count: number;
  boost_count: number; reaction_count: number; rank_position?: number;
  image_url: string | null; is_country_champion?: boolean; country?: string;
};
type Toast        = { id: string; msg: string };
type ReactionType = 'hot' | 'watching' | 'interesting';
type BrandCfg     = { image_url: string | null; color: string | null };

// ─── Brand colours ────────────────────────────────────────────────────────────
const BRAND_COLORS: Record<string, string> = {
  'Map of Pi': '#D4AF37', 'ANTCPU ADS': '#f0883e', 'ANTCPU': '#f0883e',
  'Amanda Photography': '#e91e8c', 'PiPioneersX': '#7928ca',
};
const getBrandColor = (brand: string) => BRAND_COLORS[brand] || '#888';

// ─── Country flags ────────────────────────────────────────────────────────────
const COUNTRY_FLAGS: Record<string, string> = {
  'Afghanistan':'🇦🇫','Albania':'🇦🇱','Algeria':'🇩🇿','Angola':'🇦🇴',
  'Argentina':'🇦🇷','Australia':'🇦🇺','Austria':'🇦🇹','Bangladesh':'🇧🇩',
  'Belgium':'🇧🇪','Bolivia':'🇧🇴','Brazil':'🇧🇷','Cambodia':'🇰🇭',
  'Cameroon':'🇨🇲','Canada':'🇨🇦','Chile':'🇨🇱','China':'🇨🇳',
  'Colombia':'🇨🇴','Congo':'🇨🇩','Croatia':'🇭🇷','Czech Republic':'🇨🇿',
  'Denmark':'🇩🇰','Ecuador':'🇪🇨','Egypt':'🇪🇬','Ethiopia':'🇪🇹',
  'Finland':'🇫🇮','France':'🇫🇷','Germany':'🇩🇪','Ghana':'🇬🇭',
  'Greece':'🇬🇷','Guatemala':'🇬🇹','Honduras':'🇭🇳','Hungary':'🇭🇺',
  'India':'🇮🇳','Indonesia':'🇮🇩','Iran':'🇮🇷','Iraq':'🇮🇶',
  'Israel':'🇮🇱','Italy':'🇮🇹','Japan':'🇯🇵','Jordan':'🇯🇴',
  'Kazakhstan':'🇰🇿','Kenya':'🇰🇪','South Korea':'🇰🇷','Kuwait':'🇰🇼',
  'Lebanon':'🇱🇧','Libya':'🇱🇾','Malaysia':'🇲🇾','Mexico':'🇲🇽',
  'Morocco':'🇲🇦','Mozambique':'🇲🇿','Myanmar':'🇲🇲','Nepal':'🇳🇵',
  'Netherlands':'🇳🇱','New Zealand':'🇳🇿','Nicaragua':'🇳🇮','Nigeria':'🇳🇬',
  'Norway':'🇳🇴','Pakistan':'🇵🇰','Panama':'🇵🇦','Paraguay':'🇵🇾',
  'Peru':'🇵🇪','Philippines':'🇵🇭','Poland':'🇵🇱','Portugal':'🇵🇹',
  'Romania':'🇷🇴','Russia':'🇷🇺','Saudi Arabia':'🇸🇦','Senegal':'🇸🇳',
  'Serbia':'🇷🇸','Singapore':'🇸🇬','South Africa':'🇿🇦','Spain':'🇪🇸',
  'Sri Lanka':'🇱🇰','Sudan':'🇸🇩','Sweden':'🇸🇪','Switzerland':'🇨🇭',
  'Syria':'🇸🇾','Taiwan':'🇹🇼','Tanzania':'🇹🇿','Thailand':'🇹🇭',
  'Tunisia':'🇹🇳','Turkey':'🇹🇷','Uganda':'🇺🇬','Ukraine':'🇺🇦',
  'United Arab Emirates':'🇦🇪','United Kingdom':'🇬🇧','United States':'🇺🇸',
  'Uruguay':'🇺🇾','Uzbekistan':'🇺🇿','Venezuela':'🇻🇪','Vietnam':'🇻🇳',
  'Yemen':'🇾🇪','Zambia':'🇿🇲','Zimbabwe':'🇿🇼',
};
const getFlag = (country?: string) =>
  country ? (COUNTRY_FLAGS[country] || '🌍') : '';

// ─── Reactions ────────────────────────────────────────────────────────────────
const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: 'hot',         emoji: '🔥', label: 'Hot'         },
  { type: 'watching',    emoji: '👀', label: 'Watching'    },
  { type: 'interesting', emoji: '💡', label: 'Interesting' },
];

// ─── Design tokens ────────────────────────────────────────────────────────────
const card   = '#111';
const border = '#1a1a1a';
const muted  = '#555';
const orange = '#f0883e';
const gold   = '#D4AF37';

// ─── Btn helper — keeps inline styles DRY ────────────────────────────────────
const iconBtn = (active: boolean, activeColor: string): React.CSSProperties => ({
  background:   active ? `${activeColor}20` : 'transparent',
  border:       `1px solid ${active ? activeColor : border}`,
  borderRadius: '8px',
  color:        active ? activeColor : muted,
  fontWeight:   600,
  fontSize:     '0.78rem',
  padding:      '0.55rem 0.65rem',
  cursor:       active ? 'default' : 'pointer',
  transition:   'all 0.15s',
});

// ─── Component ────────────────────────────────────────────────────────────────
export default function ArenaUniversalClient() {
  const router = useRouter();

  const [ads,        setAds]        = useState<Ad[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [user,       setUser]       = useState({ name: '', email: '', brand: '', trialStatus: 'trial', role: '' });
  const [toast,      setToast]      = useState<Toast | null>(null);
  const [preview,    setPreview]    = useState<Ad | null>(null);
  const [shareAd,    setShareAd]    = useState<Ad | null>(null);
  const [brandConfig,setBrandConfig]= useState<Record<string, BrandCfg>>({});

  // ─── Interaction state ───────────────────────────────────────────────────
  const [liked,      setLiked]      = useState<Record<string, boolean>>({});
  const [boosted,    setBoosted]    = useState<Record<string, boolean>>({});
  const [reacted,    setReacted]    = useState<Record<string, ReactionType>>({});
  const [bookmarked, setBookmarked] = useState<Record<string, boolean>>({});

  // ─── Derived ─────────────────────────────────────────────────────────────
  const maxPoints   = ads.reduce((m, a) => Math.max(m, a.points || 0), 1);
  const isSuper     = user.role === 'super' || (!!SUPER_EMAIL && user.email === SUPER_EMAIL);
  const totalBrands = new Set(ads.map(a => a.brand)).size;
  const totalPoints = ads.reduce((sum, a) => sum + (a.points || 0), 0);

  // ─── Boot ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }

    const likedMap:      Record<string, boolean>      = {};
    const boostedMap:    Record<string, boolean>      = {};
    const reactedMap:    Record<string, ReactionType> = {};
    const bookmarkedMap: Record<string, boolean>      = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) || '';
      if (key.startsWith('liked_'))      likedMap[key.replace('liked_', '')]           = true;
      if (key.startsWith('boosted_'))    boostedMap[key.replace('boosted_', '')]       = true;
      if (key.startsWith('reacted_'))    reactedMap[key.replace('reacted_', '')]       = localStorage.getItem(key) as ReactionType;
      if (key.startsWith('bookmarked_')) bookmarkedMap[key.replace('bookmarked_', '')] = true;
    }

    setLiked(likedMap);
    setBoosted(boostedMap);
    setReacted(reactedMap);
    setBookmarked(bookmarkedMap);
    fetchAds();
  }, []);

  // ─── Data ─────────────────────────────────────────────────────────────────
  async function fetchAds() {
    setLoading(true);
    const [{ data: adsData }, { data: brandsData }] = await Promise.all([
      supabase.from('ads').select('*').eq('status', 'active')
        .order('pinned',  { ascending: false })
        .order('points',  { ascending: false }),
      supabase.from('brand_config').select('brand_name, image_url, color'),
    ]);
    setAds(adsData || []);
    const map: Record<string, BrandCfg> = {};
    for (const b of (brandsData || []))
      map[b.brand_name] = { image_url: b.image_url, color: b.color };
    setBrandConfig(map);
    setLoading(false);
  }

  const getBrandImage = (ad: Ad): string | null =>
    ad.image_url || brandConfig[ad.brand]?.image_url || null;

  function showToast(id: string, msg: string) {
    setToast({ id, msg });
    setTimeout(() => setToast(null), 2000);
  }

  // ─── Handlers ─────────────────────────────────────────────────────────────
  async function handleClick(ad: Ad) {
    if (!ad.url || ad.url.trim() === '') { router.push('/guide?ref=champion-ad'); return; }
    window.open(ad.url, '_blank', 'noopener,noreferrer');
    showToast(ad.id, 'Clicked!');
    const n = await trackClick(
      { id: ad.id, brand: ad.brand, title: ad.title, email: ad.email, click_count: ad.click_count },
      user.email || 'visitor', SOURCE.ARENA_FEED, supabase
    );
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, click_count: n } : a));
    if (preview?.id === ad.id) setPreview(p => p ? { ...p, click_count: n } : p);
  }

  async function handleLike(ad: Ad, e: React.MouseEvent) {
    e.stopPropagation();
    if (liked[ad.id]) return;
    localStorage.setItem(`liked_${ad.id}`, '1');
    setLiked(prev => ({ ...prev, [ad.id]: true }));
    showToast(ad.id, 'Liked!');
    const n = await recordLike(
      { id: ad.id, brand: ad.brand, title: ad.title, email: ad.email, like_count: ad.like_count },
      getSessionId(), SOURCE.ARENA_FEED, supabase
    );
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, like_count: n } : a));
    if (preview?.id === ad.id) setPreview(p => p ? { ...p, like_count: n } : p);
  }

  async function handleBoost(ad: Ad, e: React.MouseEvent) {
    e.stopPropagation();
    if (boosted[ad.id]) return;
    localStorage.setItem(`boosted_${ad.id}`, '1');
    setBoosted(prev => ({ ...prev, [ad.id]: true }));
    showToast(ad.id, 'Boosted!');
    const n = await recordBoost(
      { id: ad.id, brand: ad.brand, title: ad.title, email: ad.email, boost_count: ad.boost_count },
      getSessionId(), SOURCE.ARENA_FEED, supabase
    );
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, boost_count: n } : a));
    if (preview?.id === ad.id) setPreview(p => p ? { ...p, boost_count: n } : p);
  }

  async function handleReaction(ad: Ad, type: ReactionType, e: React.MouseEvent) {
    e.stopPropagation();
    if (reacted[ad.id]) return;
    const sid = getSessionId();
    localStorage.setItem(`reacted_${ad.id}`, type);
    setReacted(prev => ({ ...prev, [ad.id]: type }));
    showToast(ad.id, REACTIONS.find(r => r.type === type)?.emoji || '👍');
    const newCount = (ad.reaction_count || 0) + 1;
    await Promise.all([
      supabase.from('ad_reactions').insert([{ ad_id: ad.id, reaction_type: type, session_id: sid }]),
      supabase.from('ads').update({ reaction_count: newCount }).eq('id', ad.id),
    ]);
    fetch('/api/scout/score', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_id: ad.id }),
    }).catch(() => {});
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, reaction_count: newCount } : a));
    if (preview?.id === ad.id) setPreview(p => p ? { ...p, reaction_count: newCount } : p);
  }

  function handleBookmark(ad: Ad, e: React.MouseEvent) {
    e.stopPropagation();
    if (bookmarked[ad.id]) {
      localStorage.removeItem(`bookmarked_${ad.id}`);
      setBookmarked(prev => { const n = { ...prev }; delete n[ad.id]; return n; });
      showToast(ad.id, 'Removed');
    } else {
      localStorage.setItem(`bookmarked_${ad.id}`, '1');
      setBookmarked(prev => ({ ...prev, [ad.id]: true }));
      showToast(ad.id, '🔖 Saved');
    }
  }

  // ─── Share ────────────────────────────────────────────────────────────────
  async function recordAdShare(ad: Ad, label: string) {
    const n = await recordShare(
      { id: ad.id, brand: ad.brand, title: ad.title, email: ad.email, share_count: ad.share_count },
      user.email || 'visitor', label, SOURCE.ARENA_FEED, supabase
    );
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, share_count: n } : a));
  }

  async function handleNativeShare(ad: Ad) {
    try {
      await navigator.share({
        title: ad.title,
        text:  `${ad.brand} — ${ad.title}\n\n${ad.description}`,
        url:   ad.url,
      });
      await recordAdShare(ad, 'Native Share');
      setShareAd(null);
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
    } catch {}
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

    // Facebook: copy caption first — sharer ignores pre-filled text by design
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

    await recordAdShare(ad, platform.label);
    setShareAd(null);
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }


  async function handleMegaCopy(ad: Ad) {
    try {
      let megaText = `${ad.title}\n\n${ad.description}\n\n→ ${ad.url}`;
      if (ad.image_url) {
        const uploadIdx = ad.image_url.indexOf('/upload/');
        if (uploadIdx !== -1) {
          const afterUpload = ad.image_url.slice(uploadIdx + 8);
          const parts       = afterUpload.split('/');
          const publicId    = parts[0].includes(',') ? parts.slice(1).join('/') : afterUpload;
          const res = await fetch(
            `${SOCIAL_PACK_API}?id=${encodeURIComponent(publicId)}&brand=${encodeURIComponent(ad.brand)}&url=${encodeURIComponent(ad.url)}`
          );
          if (res.ok) {
            const pack = await res.json();
            megaText = pack.megaCopy?.text || megaText;
          }
        }
      }
      await navigator.clipboard.writeText(megaText);
      showToast(ad.id, '📋 Mega Copy!');
    } catch {
      showToast(ad.id, 'Copy failed');
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      <ArenaNav
        role={isSuper ? 'admin' : user.trialStatus === 'team' ? 'team' : 'user'}
        userName={user.name} userEmail={user.email} userBrand={user.brand}
        trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'}
        { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }
      />

      {/* ── Preview modal ── */}
      {preview && (() => {
        const color   = getBrandColor(preview.brand);
        const heat    = Math.round(((preview.points || 0) / maxPoints) * 100);
        const flag    = getFlag(preview.country);
        return (
          <>
            <div onClick={() => setPreview(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, backdropFilter: 'blur(4px)' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              width: '92vw', maxWidth: 480, background: '#111', border: `1px solid ${color}40`,
              borderRadius: '16px', padding: '1.5rem', zIndex: 1000, maxHeight: '85vh', overflowY: 'auto' }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1rem', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
                  {getBrandImage(preview) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={getBrandImage(preview)!} alt={preview.brand}
                      style={{ width: 48, height: 48, borderRadius: '10px', objectFit: 'cover', border: `1px solid ${color}40`, flexShrink: 0 }} />
                  )}
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem', color }}>{preview.brand}</div>
                    {preview.is_country_champion && preview.country && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.2rem' }}>
                        <span style={{ fontSize: '1rem' }}>{flag}</span>
                        <span style={{ fontSize: '0.72rem', color: gold, fontWeight: 700 }}>🏆 {preview.country} Champion</span>
                      </div>
                    )}
                    <div style={{ fontSize: '0.7rem', color: muted, marginTop: '0.2rem' }}>
                      {preview.tier}{' · '}{preview.category}
                    </div>
                  </div>
                </div>
                <button onClick={() => setPreview(null)}
                  style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '1.4rem', flexShrink: 0 }}>✕</button>
              </div>

              {/* Heat bar */}
              <div style={{ height: 3, background: '#1a1a1a', borderRadius: 2, marginBottom: '1rem', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${heat}%`, background: color, borderRadius: 2, transition: 'width 0.4s' }} />
              </div>

              {/* Title + description */}
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>{preview.title}</div>
                <div style={{ fontSize: '0.85rem', color: '#aaa', lineHeight: 1.6 }}>{preview.description}</div>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.75rem', color: muted, marginBottom: '1rem' }}>
                <span>👆 {preview.click_count || 0}</span>
                <span>↗ {preview.share_count || 0}</span>
                {(preview.like_count     || 0) > 0 && <span>😊 {preview.like_count}</span>}
                {(preview.boost_count    || 0) > 0 && <span>⚡ ×{preview.boost_count}</span>}
                {(preview.reaction_count || 0) > 0 && <span>🔥 {preview.reaction_count}</span>}
                <span style={{ color }}>⚡ {preview.points || 0} pts</span>
                {preview.rank_position && <span style={{ color: gold }}>#{preview.rank_position}</span>}
              </div>

              {/* Reactions */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {REACTIONS.map(r => {
                  const active = reacted[preview.id] === r.type;
                  const done   = !!reacted[preview.id];
                  return (
                    <button key={r.type} onClick={e => handleReaction(preview, r.type, e)}
                      style={{ background: active ? `${color}25` : '#0a0a0a', border: `1px solid ${active ? color : '#222'}`,
                        borderRadius: '999px', padding: '0.3rem 0.75rem', fontSize: '0.75rem',
                        color: active ? color : muted, cursor: done ? 'default' : 'pointer',
                        fontWeight: active ? 700 : 400, opacity: done && !active ? 0.4 : 1, transition: 'all 0.15s' }}>
                      {r.emoji} {r.label}
                    </button>
                  );
                })}
              </div>

              {/* Preview actions */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {/* Share — primary */}
                <button onClick={() => { setShareAd(preview); setPreview(null); }}
                  style={{ flex: 2, background: `${color}20`, border: `1px solid ${color}60`,
                    borderRadius: '8px', color, fontWeight: 700, fontSize: '0.85rem',
                    padding: '0.7rem', cursor: 'pointer' }}>
                  ↗ Share
                </button>
                <button onClick={() => handleClick(preview)}
                  style={{ flex: 1, background: color, border: 'none', borderRadius: '8px',
                    color: '#000', fontWeight: 700, fontSize: '0.85rem', padding: '0.7rem', cursor: 'pointer' }}>
                  🔗
                </button>
                <button onClick={e => handleBookmark(preview, e)}
                  style={iconBtn(!!bookmarked[preview.id], gold)}>🔖</button>
                <button onClick={e => handleLike(preview, e)}
                  style={iconBtn(!!liked[preview.id], color)}>😊</button>
                <button onClick={e => handleBoost(preview, e)}
                  style={iconBtn(!!boosted[preview.id], gold)}>⚡</button>
                <button onClick={() => router.push(`/profile/${encodeURIComponent(preview.email)}`)}
                  style={iconBtn(false, muted)}>👤</button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Share modal ── */}
      {shareAd && (() => {
        const brandColor = getBrandColor(shareAd.brand);
        return (
          <>
            <div onClick={() => setShareAd(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1001, backdropFilter: 'blur(4px)' }} />
            <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              width: '92vw', maxWidth: 400, background: '#111', border: `1px solid ${brandColor}40`,
              borderRadius: '16px', padding: '1.5rem', zIndex: 1002, maxHeight: '85vh', overflowY: 'auto' }}>

              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: brandColor }}>Share {shareAd.brand}</div>
                  <div style={{ fontSize: '0.78rem', color: muted, marginTop: '0.2rem' }}>{shareAd.title}</div>
                </div>
                <button onClick={() => setShareAd(null)}
                  style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '1.4rem' }}>✕</button>
              </div>

                            {/* Toast */}
              {toast?.id === shareAd.id && (
                <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px',
                  padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.82rem',
                  color: '#22c55e', textAlign: 'center' }}>
                  {toast.msg}
                </div>
              )}

              {/* Native share — one tap, mobile only */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <button
                  onClick={() => handleNativeShare(shareAd)}
                  style={{ width: '100%', padding: '0.9rem', background: '#2563eb',
                    border: 'none', borderRadius: '10px', color: '#fff', fontWeight: 800,
                    fontSize: '0.95rem', cursor: 'pointer', marginBottom: '12px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  📱 Share Now
                </button>
              )}

              {/* Top 3 platforms */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginBottom: '0.75rem' }}>
                {PLATFORMS
                  .filter(p => MOBILE_PLATFORMS.includes(p.key))
                  .map(platform => (
                    <button key={platform.key}
                      onClick={() => executePlatformShare(shareAd, platform.key)}
                      style={{ background: `${platform.color}15`, border: `1px solid ${platform.color}30`,
                        borderRadius: '10px', padding: '0.75rem 0.5rem', cursor: 'pointer',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ fontSize: '1.2rem' }}>{platform.icon}</span>
                      <span style={{ fontSize: '0.68rem', color: '#aaa' }}>{platform.label}</span>
                    </button>
                  ))}
              </div>

              {/* More platforms — collapsed */}
              <details style={{ marginBottom: '0.75rem' }}>
                <summary style={{ fontSize: '0.72rem', color: muted, cursor: 'pointer',
                  padding: '0.4rem 0', listStyle: 'none', textAlign: 'center' }}>
                  ··· More platforms
                </summary>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.5rem' }}>
                  {PLATFORMS
                    .filter(p => !MOBILE_PLATFORMS.includes(p.key))
                    .map(platform => (
                      <button key={platform.key}
                        onClick={() => executePlatformShare(shareAd, platform.key)}
                        style={{ background: `${platform.color}15`, border: `1px solid ${platform.color}30`,
                          borderRadius: '10px', padding: '0.75rem 0.5rem', cursor: 'pointer',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontSize: '1.2rem' }}>{platform.icon}</span>
                        <span style={{ fontSize: '0.68rem', color: '#aaa' }}>{platform.label}</span>
                        {!platform.supportsIntent && <span style={{ fontSize: '0.6rem', color: muted }}>copy</span>}
                      </button>
                    ))}
                </div>
              </details>

              {/* Mega Copy */}
              <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '0.75rem' }}>
                <button
                  onClick={() => handleMegaCopy(shareAd)}
                  style={{ width: '100%', background: `${brandColor}15`, border: `1px solid ${brandColor}40`,
                    borderRadius: '10px', padding: '0.75rem', cursor: 'pointer', color: '#fff',
                    fontWeight: 700, fontSize: '0.85rem', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  📋 Mega Copy — full share package
                </button>
                <div style={{ fontSize: '0.7rem', color: '#333', textAlign: 'center', marginTop: '0.4rem' }}>
                  Copies caption + hashtags + link{shareAd.image_url ? ' + image' : ''}
                </div>
              </div>

            </div>
          </>
        );
      })()}

      {/* ── Main content ── */}
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '1.5rem 1rem' }}>

        {/* Header stats */}
        <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
           { label: 'Brands', value: totalBrands,                    color: '#0070f3' },
           { label: 'Ads',    value: ads.length,                     color: orange    },
           { label: 'Points', value: totalPoints.toLocaleString(),   color: gold      },
          ].map(s => (
            <div key={s.label}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.68rem', color: muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Super admin badge */}
        {isSuper && (
          <div style={{ background: `${orange}15`, border: `1px solid ${orange}30`, borderRadius: '8px',
            padding: '0.5rem 0.75rem', marginBottom: '1rem', fontSize: '0.78rem', color: orange, fontWeight: 700 }}>
            ⚡ Super Admin — Full Arena View
          </div>
        )}

        {/* Ad grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: muted }}>Loading the Arena...</div>
        ) : ads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: muted }}>No active ads yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {ads.map(ad => {
              const color      = getBrandColor(ad.brand);
              const heat       = Math.round(((ad.points || 0) / maxPoints) * 100);
              const hasLiked      = !!liked[ad.id];
              const hasBoosted    = !!boosted[ad.id];
              const hasReacted    = !!reacted[ad.id];
              const hasBookmarked = !!bookmarked[ad.id];
              const flag       = getFlag(ad.country);

              return (
                <div key={ad.id}>
                  <div
                    onClick={() => setPreview(ad)}
                    style={{ background: card, border: `1px solid ${ad.pinned ? color + '60' : border}`,
                      borderRadius: '14px', padding: '1.25rem', cursor: 'pointer',
                      transition: 'border-color 0.15s', position: 'relative', overflow: 'hidden' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = color + '80')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = ad.pinned ? color + '60' : border)}
                  >
                    {/* Pinned badge */}
                    {ad.pinned && (
                      <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem',
                        background: `${color}20`, border: `1px solid ${color}40`, borderRadius: '999px',
                        padding: '0.15rem 0.5rem', fontSize: '0.62rem', color, fontWeight: 700 }}>
                        ⭐ FEATURED
                      </div>
                    )}

                    {/* Rank badge */}
                    {ad.rank_position && ad.rank_position >= 1 && ad.rank_position <= 3 && (
                      <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', fontSize: '1.1rem' }}>
                        {ad.rank_position === 1 ? '🥇' : ad.rank_position === 2 ? '🥈' : '🥉'}
                      </div>
                    )}

                    {/* Brand row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem', minHeight: 36 }}>
                      {getBrandImage(ad) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={getBrandImage(ad)!} alt={ad.brand}
                          style={{ width: 32, height: 32, borderRadius: '6px', objectFit: 'cover',
                            border: `1px solid ${color}30`, flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.3rem' }}>
                        <button
                          onClick={e => { e.stopPropagation(); router.push(`/profile/${encodeURIComponent(ad.email)}`); }}
                          style={{ fontWeight: 700, fontSize: '0.82rem', color, cursor: 'pointer',
                            textDecoration: 'underline', textDecorationColor: `${color}50`,
                            background: 'none', border: 'none', padding: 0, flexShrink: 0 }}>
                          {ad.brand}
                        </button>
                        {ad.is_country_champion && ad.country && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem',
                            background: `${gold}15`, border: `1px solid ${gold}30`, borderRadius: '999px',
                            padding: '0.1rem 0.45rem', fontSize: '0.65rem', color: gold, fontWeight: 700,
                            maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {flag} {ad.country}
                          </span>
                        )}
                        <span style={{ fontSize: '0.65rem', color: muted, background: '#1a1a1a',
                          borderRadius: '999px', padding: '0.1rem 0.45rem', flexShrink: 0 }}>
                          {ad.tier}
                        </span>
                      </div>
                    </div>

                    {/* Title + description */}
                    <div style={{ marginBottom: '0.75rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.3rem' }}>{ad.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#888', lineHeight: 1.5 }}>
                        {ad.description.length > 100 ? ad.description.slice(0, 100) + '…' : ad.description}
                      </div>
                    </div>

                    {/* Heat bar */}
                    <div style={{ height: 2, background: '#1a1a1a', borderRadius: 1, marginBottom: '0.75rem', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${heat}%`, background: color, borderRadius: 1, transition: 'width 0.4s' }} />
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', fontSize: '0.7rem', color: muted, marginBottom: '0.6rem' }}>
                      {(ad.click_count    || 0) > 0 && <span>👆 {ad.click_count}</span>}
                      {(ad.share_count    || 0) > 0 && <span>↗ {ad.share_count}</span>}
                      {(ad.like_count     || 0) > 0 && <span>😊 {ad.like_count}</span>}
                      {(ad.boost_count    || 0) > 0 && <span>⚡ ×{ad.boost_count}</span>}
                      {(ad.reaction_count || 0) > 0 && <span>🔥 {ad.reaction_count}</span>}
                      {(ad.points         || 0) > 0 && <span style={{ color }}>⚡ {ad.points}</span>}
                    </div>

                    {/* Reaction strip */}
                    <div style={{ marginBottom: '0.6rem' }} onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                        {REACTIONS.map(r => {
                          const active = reacted[ad.id] === r.type;
                          return (
                            <button key={r.type}
                              onClick={e => handleReaction(ad, r.type, e)}
                              style={{ background: active ? `${color}20` : 'transparent',
                                border: `1px solid ${active ? color : '#222'}`, borderRadius: '999px',
                                padding: '0.2rem 0.55rem', fontSize: '0.68rem',
                                color: active ? color : '#333', cursor: hasReacted ? 'default' : 'pointer',
                                fontWeight: active ? 700 : 400, opacity: hasReacted && !active ? 0.35 : 1,
                                transition: 'all 0.15s' }}>
                              {r.emoji}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Actions */}
                    <div onClick={e => e.stopPropagation()}>
                      <div style={{ display: 'flex', gap: '6px' }}>

                        {/* Share — primary */}
                        <button
                          onClick={e => { e.stopPropagation(); setShareAd(ad); }}
                          style={{ flex: 2, background: `${color}20`, border: `1px solid ${color}60`,
                            borderRadius: '8px', color, fontWeight: 700, fontSize: '0.78rem',
                            padding: '0.55rem 0', cursor: 'pointer', transition: 'all 0.15s' }}>
                          ↗ Share
                        </button>

                        {/* Bookmark */}
                        <button
                          onClick={e => handleBookmark(ad, e)}
                          title={hasBookmarked ? 'Saved' : 'Save'}
                          style={iconBtn(hasBookmarked, gold)}>
                          🔖
                        </button>

                        {/* Like */}
                        <button
                          onClick={e => handleLike(ad, e)}
                          title={hasLiked ? 'Liked' : 'Like'}
                          style={iconBtn(hasLiked, color)}>
                          😊
                        </button>

                        {/* Boost */}
                        <button
                          onClick={e => handleBoost(ad, e)}
                          title={hasBoosted ? 'Boosted' : 'Boost'}
                          style={iconBtn(hasBoosted, gold)}>
                          ⚡
                        </button>

                        {/* Visit — icon only */}
                        <button
                          onClick={e => { e.stopPropagation(); handleClick(ad); }}
                          title="Visit"
                          style={iconBtn(false, muted)}>
                          🔗
                        </button>

                      </div>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* ── Module Zone ── */}
{!loading && (
  <div style={{
    marginTop: '2.5rem',
    borderTop: '1px solid #1a1a1a',
    paddingTop: '2rem',
  }}>
    
    {/* ── Module Zone ── */}
{!loading && (
  <div style={{
    marginTop: '2.5rem',
    borderTop: '1px solid #1a1a1a',
    paddingTop: '2rem',
  }}>
    <ShareModule
      slug="arena"
      user={{ email: user.email, name: user.name, brand: user.brand, trialStatus: user.trialStatus }}
      ads={ads}
      supabase={supabase}
      isSuper={isSuper}
    />
    <ArchiveModule
      slug="arena"
      user={{ email: user.email, name: user.name, brand: user.brand, trialStatus: user.trialStatus }}
      ads={ads}
      supabase={supabase}
      isSuper={isSuper}
    />
  </div>
)}

  </div>
)}

        {/* Bottom CTA */}
        {!loading && (
          <div style={{ marginTop: '2.5rem', background: '#111', border: '1px solid #1a1a1a',
            borderRadius: '14px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Join the Network</div>
            <div style={{ fontSize: '0.85rem', color: muted, marginBottom: '0.35rem' }}>Get your brand in the Arena.</div>
            <div style={{ fontSize: '0.75rem', color: '#333', marginBottom: '1.25rem' }}>Free to join · No contracts</div>
            <button
              onClick={() => router.push('/login')}
              style={{ background: orange, border: 'none', borderRadius: '10px', color: '#000',
                fontWeight: 800, fontSize: '1rem', padding: '0.9rem 2.5rem', cursor: 'pointer' }}>
              Join the Arena →
            </button>
          </div>
        )}

        {/* Back to dashboard */}
        <button
          onClick={() => router.push('/dashboard/user')}
          style={{ marginTop: '2rem', background: 'none', border: 'none', color: orange,
            cursor: 'pointer', fontSize: '0.82rem', padding: 0, display: 'block', margin: '2rem auto 0' }}>
          ← Back to Dashboard
        </button>

      </div>
      <ArenaFooter />
    </div>
  );
}
