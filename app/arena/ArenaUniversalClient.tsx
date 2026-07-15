'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ArenaNav    from '../components/ArenaNav';
import ArenaFooter from '../components/ArenaFooter';
import { PLATFORMS, getShareAction, ShareContext } from '../lib/socialShare';
import { trackClick, recordShare, SOURCE } from '../lib/tracking';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Env ──────────────────────────────────────────────────────────────────────

const SUPER_EMAIL = process.env.NEXT_PUBLIC_SUPER_EMAIL || '';

// ─── Types ────────────────────────────────────────────────────────────────────

type Ad = {
  id:                   string;
  brand:                string;
  title:                string;
  url:                  string;
  description:          string;
  category:             string;
  status:               string;
  tier:                 string;
  pinned:               boolean;
  email:                string;
  points:               number;
  click_count:          number;
  share_count:          number;
  rank_position?:       number;
  image_url:            string | null;
  is_country_champion?: boolean;
  country?:             string;
};

type SessionUser = {
  name:        string;
  email:       string;
  brand:       string;
  trialStatus: string;
  role?:       string;
};

type Toast = {
  id:  string;
  msg: string;
};

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

const bg     = '#0a0a0a';
const card   = '#111';
const border = '#1a1a1a';
const muted  = '#555';
const white  = '#fff';
const orange = '#f0883e';

function getBrandColor(brand: string): string {
  return BRAND_COLORS[brand] || '#888';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArenaUniversalClient() {
  const router = useRouter();

  const [ads, setAds]         = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser]       = useState<SessionUser>({ name: '', email: '', brand: '', trialStatus: 'trial' });
  const [toast, setToast]     = useState<Toast | null>(null);
  const [preview, setPreview] = useState<Ad | null>(null);
  const [shareAd, setShareAd] = useState<Ad | null>(null);

  // — derived
  const isSuper       = user.role === 'super' || (!!SUPER_EMAIL && user.email === SUPER_EMAIL);
  const dashboardHref = isSuper ? '/dashboard/admin' : user.role === 'admin' ? '/dashboard/users' : '/dashboard/user';
  const totalBrands   = new Set(ads.map(a => a.brand)).size;
  const totalPoints   = ads.reduce((sum, a) => sum + (a.points || 0), 0);

  // — load user + ads
  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
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

  // — track click via tracking framework
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

  // — execute platform share via tracking framework
  async function executePlatformShare(ad: Ad, platformKey: string) {
    const platform = PLATFORMS.find(p => p.key === platformKey);
    if (!platform) return;

    const ctx: ShareContext = {
      brand:       ad.brand,
      title:       ad.title,
      description: ad.description,
      url:         ad.url,
      profileUrl:  `https://antcpu-ads.vercel.app/profile/${encodeURIComponent(ad.email)}`,
      category:    ad.category,
      country:     ad.country,
      isChampion:  ad.is_country_champion,
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
      user.email || 'visitor',
      platform.label,
      SOURCE.ARENA_FEED,
      supabase
    );
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, share_count: newShares } : a));
    setShareAd(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: bg, color: white, fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <ArenaNav
        role={isSuper ? 'admin' : user.role === 'admin' ? 'admin' : 'user'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'}
        onLogout={() => { localStorage.removeItem('arena_user'); router.push('/'); }}
      />

      {/* Preview modal */}
      {preview && (() => {
        const color   = getBrandColor(preview.brand);
        const isToast = toast?.id === preview.id;
        return (
          <>
            <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, backdropFilter: 'blur(4px)' }} />
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, background: card, border: `1px solid ${border}`, borderRadius: '20px 20px 0 0', padding: '1.5rem', maxWidth: '480px', margin: '0 auto' }}>

              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', color }}>{preview.brand}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                    {preview.is_country_champion && preview.country && (
                      <span style={{ fontSize: '0.65rem', color: '#D4AF37', background: '#D4AF3715', border: '1px solid #D4AF3730', borderRadius: '999px', padding: '0.1rem 0.5rem', fontWeight: 700 }}>
                        🏆 {preview.country} Champion
                      </span>
                    )}
                    {preview.pinned && <span style={{ fontSize: '0.65rem', color: orange, fontWeight: 700 }}>⭐ FEATURED</span>}
                    <span style={{ fontSize: '0.65rem', color: TIER_COLOR[preview.tier] || muted, fontWeight: 700, textTransform: 'uppercase' }}>{preview.tier}</span>
                    <span style={{ fontSize: '0.65rem', color: muted }}>· {preview.category}</span>
                  </div>
                </div>
                <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '1.4rem' }}>✕</button>
              </div>

              {/* Title + description */}
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.4rem' }}>{preview.title}</div>
              <div style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.6, marginBottom: '0.75rem' }}>{preview.description}</div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.68rem', color: muted, marginBottom: '0.75rem' }}>
                <span>👆 {preview.click_count || 0} clicks</span>
                <span>↗ {preview.share_count || 0} shares</span>
                <span>⚡ {preview.points || 0} pts</span>
                {preview.rank_position && <span>#{preview.rank_position}</span>}
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleClick(preview)} style={{ flex: 1, background: color, border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, fontSize: '0.85rem', padding: '0.7rem', cursor: 'pointer' }}>
                  {isToast && toast?.msg === 'Clicked!' ? '✓ Clicked!' : 'Visit →'}
                </button>
                <button onClick={() => { setShareAd(preview); setPreview(null); }} style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: white, fontWeight: 600, fontSize: '0.85rem', padding: '0.7rem 1rem', cursor: 'pointer' }}>
                  ↗ Share
                </button>
                <button onClick={() => router.push(`/profile/${encodeURIComponent(preview.email)}`)} style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: muted, fontWeight: 600, fontSize: '0.85rem', padding: '0.7rem 1rem', cursor: 'pointer' }}>
                  👤
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* Share modal */}
      {shareAd && (
        <>
          <div onClick={() => setShareAd(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1001, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1002, background: card, border: `1px solid ${border}`, borderRadius: '20px 20px 0 0', padding: '1.5rem', maxWidth: '480px', margin: '0 auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Share {shareAd.brand}</div>
                <div style={{ fontSize: '0.72rem', color: muted, marginTop: '0.15rem' }}>{shareAd.title}</div>
              </div>
              <button onClick={() => setShareAd(null)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '1.4rem' }}>✕</button>
            </div>

            {/* Toast */}
            {toast?.id === shareAd.id && (
              <div style={{ background: '#22c55e15', border: '1px solid #22c55e30', borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '0.78rem', color: '#22c55e', marginBottom: '0.75rem', textAlign: 'center' }}>
                {toast.msg}
              </div>
            )}

            {/* Platform grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {PLATFORMS.map(platform => (
                <button
                  key={platform.key}
                  onClick={() => executePlatformShare(shareAd, platform.key)}
                  style={{ background: `${platform.color}15`, border: `1px solid ${platform.color}30`, borderRadius: '10px', padding: '0.75rem 0.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span style={{ fontSize: '1.3rem' }}>{platform.icon}</span>
                  <span style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 600 }}>{platform.label}</span>
                  {!platform.supportsIntent && <span style={{ fontSize: '0.58rem', color: '#333' }}>copy</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>

        {/* Header stats */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Live Ads',     value: ads.length,                  color: orange },
            { label: 'Brands',       value: totalBrands,                 color: '#0070f3' },
            { label: 'Total Points', value: totalPoints.toLocaleString(), color: '#D4AF37' },
          ].map(s => (
            <div key={s.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: '10px', padding: '0.6rem 1rem', flex: 1, minWidth: '80px' }}>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.62rem', color: muted, marginTop: '0.1rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Super admin badge */}
        {isSuper && (
          <div style={{ background: '#f0883e10', border: '1px solid #f0883e30', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: orange, fontWeight: 700, marginBottom: '1rem' }}>
            ⚡ Super Admin — Full Arena View
          </div>
        )}

        {/* Ad grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: muted }}>Loading the Arena...</div>
        ) : ads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: muted }}>No active ads yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {ads.map(ad => {
              const color   = getBrandColor(ad.brand);
              const isToast = toast?.id === ad.id;
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
                    <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: `${color}20`, border: `1px solid ${color}40`, borderRadius: '999px', padding: '0.15rem 0.5rem', fontSize: '0.6rem', color, fontWeight: 700 }}>
                      ⭐ FEATURED
                    </div>
                  )}

                  {/* Rank badge */}
                  {ad.rank_position && ad.rank_position <= 3 && (
                    <div style={{ position: 'absolute', top: '0.75rem', left: '0.75rem', fontSize: '1rem' }}>
                      {ad.rank_position === 1 ? '🥇' : ad.rank_position === 2 ? '🥈' : '🥉'}
                    </div>
                  )}

                  {/* Brand + champion */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem', flexWrap: 'wrap', paddingTop: ad.rank_position && ad.rank_position <= 3 ? '1.5rem' : '0' }}>
                    <span
                      onClick={e => { e.stopPropagation(); router.push(`/profile/${encodeURIComponent(ad.email)}`); }}
                      style={{ fontWeight: 700, fontSize: '0.82rem', color, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: `${color}50` }}
                    >
                      {ad.brand}
                    </span>
                    {ad.is_country_champion && ad.country && (
                      <span style={{ fontSize: '0.6rem', color: '#D4AF37', background: '#D4AF3715', border: '1px solid #D4AF3730', borderRadius: '999px', padding: '0.1rem 0.4rem', fontWeight: 700 }}>
                        🏆 {ad.country}
                      </span>
                    )}
                    <span style={{ fontSize: '0.62rem', color: TIER_COLOR[ad.tier] || muted, fontWeight: 700, textTransform: 'uppercase' }}>{ad.tier}</span>
                  </div>

                  {/* Title + description */}
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.3rem', color: white }}>{ad.title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                    {ad.description.length > 100 ? ad.description.slice(0, 100) + '…' : ad.description}
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: '0.6rem', fontSize: '0.65rem', color: muted, marginBottom: '0.75rem' }}>
                    {(ad.click_count || 0) > 0 && <span>👆 {ad.click_count}</span>}
                    {(ad.share_count || 0) > 0 && <span>↗ {ad.share_count}</span>}
                    {(ad.points     || 0) > 0 && <span>⚡ {ad.points}</span>}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.4rem' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleClick(ad)}
                      style={{ flex: 1, background: color, border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, fontSize: '0.78rem', padding: '0.55rem 0', cursor: 'pointer' }}
                    >
                      {isToast && toast?.msg === 'Clicked!' ? '✓' : 'Visit →'}
                    </button>
                    <button
                      onClick={() => setShareAd(ad)}
                      style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: isToast && toast?.msg === 'Copied!' ? '#22c55e' : muted, fontWeight: 600, fontSize: '0.78rem', padding: '0.55rem 0.75rem', cursor: 'pointer' }}
                    >
                      {isToast && toast?.msg === 'Copied!' ? '✓' : '↗'}
                    </button>
                    <button
                      onClick={() => setPreview(ad)}
                      style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: muted, fontWeight: 600, fontSize: '0.78rem', padding: '0.55rem 0.75rem', cursor: 'pointer' }}
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
          <div style={{ marginTop: '3rem', textAlign: 'center', padding: '2rem', background: card, border: `1px solid ${border}`, borderRadius: '16px' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.4rem' }}>Join the Network</div>
            <div style={{ fontSize: '0.82rem', color: muted, marginBottom: '0.5rem' }}>Get your brand in the Arena.</div>
            <div style={{ fontSize: '0.72rem', color: '#333', marginBottom: '1.25rem' }}>3-day free trial · $9.99/mo · No contracts</div>
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
          onClick={() => router.push(dashboardHref)}
          style={{ marginTop: '2rem', background: 'none', border: 'none', color: orange, cursor: 'pointer', fontSize: '0.82rem', padding: 0, display: 'block', margin: '2rem auto 0' }}
        >
          ← Back to Dashboard
        </button>

      </div>

      <ArenaFooter />
    </div>
  );
}
