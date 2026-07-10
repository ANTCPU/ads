'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ArenaNav from '../components/ArenaNav';
import ArenaFooter from '../components/ArenaFooter';
import { notifyDiscord } from '../lib/discord';
import { PLATFORMS, getShareAction, ShareContext } from '../lib/socialShare';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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

type Toast = {
  id: string;
  msg: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND_COLORS: Record<string, string> = {
  'Map of Pi':          '#2E7D32',
  'ANTCPU ADS':         '#f0883e',
  'ANTCPU':             '#f0883e',
  'ANTCPU EDU':         '#0070f3',
  'ANTCPU CLOUD':       '#00ffcc',
  'Amanda Photography': '#e91e8c',
  'PiPioneersX':        '#FFD700',
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

  // — state
  const [ads, setAds]           = useState<Ad[]>([]);
  const [loading, setLoading]   = useState(true);
  const [user, setUser]         = useState<SessionUser>({ name: '', email: '', brand: '', trialStatus: 'trial' });
  const [toast, setToast]       = useState<Toast | null>(null);
  const [preview, setPreview]   = useState<Ad | null>(null);
  const [shareAd, setShareAd]   = useState<Ad | null>(null);

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
      .order('pinned', { ascending: false })
      .order('points', { ascending: false });
    setAds(data || []);
    setLoading(false);
  }

  // — toast helper
  function showToast(id: string, msg: string) {
    setToast({ id, msg });
    setTimeout(() => setToast(null), 2000);
  }

  // — track click + update local state + discord milestone
  async function handleClick(ad: Ad) {
    window.open(ad.url, '_blank', 'noopener,noreferrer');
    showToast(ad.id, 'Clicked!');
    const newCount = (ad.click_count || 0) + 1;
    await supabase.from('ads').update({ click_count: newCount }).eq('id', ad.id);
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, click_count: newCount } : a));
    if (preview?.id === ad.id) setPreview({ ...ad, click_count: newCount });
    if (newCount % 10 === 0) {
      notifyDiscord(`👆 **Click Milestone** — ${ad.brand} hit **${newCount} clicks**\n**Ad:** "${ad.title}"`);
    }
    // recalculate score
    fetch('/api/scout/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_id: ad.id }),
    }).catch(() => {});
  }

  // — open social share modal
  function openShare(ad: Ad) {
    setShareAd(ad);
    setPreview(null);
  }

  // — execute share for a platform
  async function executePlatformShare(ad: Ad, platformKey: string) {
    const platform = PLATFORMS.find(p => p.key === platformKey);
    if (!platform) return;

    const ctx: ShareContext = {
      brand:      ad.brand,
      title:      ad.title,
      description: ad.description,
      url:        ad.url,
      profileUrl: `https://antcpu-ads.vercel.app/profile/${encodeURIComponent(ad.email)}`,
      category:   ad.category,
      country:    ad.country,
      isChampion: ad.is_country_champion,
    };

    const { url: intentUrl, text } = getShareAction(platform, ctx);

    if (intentUrl) {
      window.open(intentUrl, '_blank', 'noopener,noreferrer');
    } else {
      // no intent URL — copy to clipboard
      try { await navigator.clipboard.writeText(text); } catch {}
      showToast(ad.id, 'Copied!');
    }

    // update share count + score
    const newShares = (ad.share_count || 0) + 1;
    await supabase.from('ads').update({ share_count: newShares }).eq('id', ad.id);
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, share_count: newShares } : a));
    fetch('/api/scout/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_id: ad.id }),
    }).catch(() => {});
    notifyDiscord(`↗ **Ad Shared** — ${ad.brand} via ${platform.label}\n**Title:** "${ad.title}"\n**By:** ${user.email || 'visitor'}`);
    setShareAd(null);
  }

  // — derived stats
  const totalBrands = new Set(ads.map(a => a.brand)).size;
  const totalPoints = ads.reduce((sum, a) => sum + (a.points || 0), 0);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: white }}>

      {/* Nav */}
      <ArenaNav
        role={user.role === 'super' || user.email === 'antcpu@gmail.com' ? 'admin' : user.role === 'admin' ? 'admin' : user.trialStatus === 'team' ? 'team' : 'user'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'}
        onLogout={() => { localStorage.removeItem('arena_user'); router.push('/'); }}
      />

      {/* ── Preview modal ── */}
      {preview && (() => {
        const color = getBrandColor(preview.brand);
        const isToast = toast?.id === preview.id;
        return (
          <>
            <div onClick={() => setPreview(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, backdropFilter: 'blur(4px)' }} />
            <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, background: card, borderTop: `1px solid ${border}`, borderRadius: '20px 20px 0 0', padding: '1.5rem', maxWidth: '540px', margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color }}>{preview.brand}</span>
                  {preview.is_country_champion && preview.country && (
                    <span style={{ fontSize: '0.68rem', fontWeight: 700, color: '#D4AF37', background: '#D4AF3715', border: '1px solid #D4AF3730', borderRadius: '999px', padding: '0.1rem 0.5rem' }}>
                      🏆 {preview.country} Champion
                    </span>
                  )}
                  {preview.pinned && <span style={{ fontSize: '0.65rem', color: orange, fontWeight: 700 }}>⭐ FEATURED</span>}
                </div>
                <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '1.4rem' }}>✕</button>
              </div>
              <div style={{ fontSize: '0.72rem', color: muted, marginBottom: '0.75rem' }}>{preview.tier} · {preview.category}</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>{preview.title}</div>
              <div style={{ fontSize: '0.88rem', color: '#aaa', marginBottom: '1rem', lineHeight: 1.5 }}>{preview.description}</div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: muted, marginBottom: '1rem' }}>
                <span>👁 {preview.click_count || 0} clicks</span>
                <span>🔗 {preview.share_count || 0} shares</span>
                <span>⭐ {preview.points || 0} pts</span>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => handleClick(preview)} style={{ flex: 1, background: color, border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, fontSize: '0.85rem', padding: '0.7rem', cursor: 'pointer' }}>
                  {isToast && toast?.msg === 'Clicked!' ? '✓ Clicked!' : 'Visit →'}
                </button>
                <button onClick={() => openShare(preview)} style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: white, fontWeight: 600, fontSize: '0.85rem', padding: '0.7rem 1rem', cursor: 'pointer' }}>
                  ↗ Share
                </button>
                <button
                  onClick={() => router.push(`/profile/${encodeURIComponent(preview.email)}`)}
                  style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: muted, fontWeight: 600, fontSize: '0.85rem', padding: '0.7rem 1rem', cursor: 'pointer' }}
                >
                  👤
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── Social share modal ── */}
      {shareAd && (
        <>
          <div onClick={() => setShareAd(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1001, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1002, background: card, borderTop: `1px solid ${border}`, borderRadius: '20px 20px 0 0', padding: '1.5rem', maxWidth: '540px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Share {shareAd.brand}</div>
              <button onClick={() => setShareAd(null)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '1.4rem' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
              {PLATFORMS.map(platform => (
                <button
                  key={platform.key}
                  onClick={() => executePlatformShare(shareAd, platform.key)}
                  style={{
                    background: `${platform.color}15`,
                    border: `1px solid ${platform.color}30`,
                    borderRadius: '10px',
                    padding: '0.75rem 0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <span style={{ fontSize: '1.4rem' }}>{platform.icon}</span>
                  <span style={{ fontSize: '0.68rem', color: white, fontWeight: 600 }}>{platform.label}</span>
                  {!platform.supportsIntent && (
                    <span style={{ fontSize: '0.6rem', color: muted }}>copy</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Header stats ── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.25rem 0' }}>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '2rem', alignItems: 'center' }}>
          <div>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: orange }}>{ads.length}</span>
            <span style={{ fontSize: '0.78rem', color: muted, marginLeft: '0.4rem' }}>Live Ads</span>
          </div>
          <div>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: white }}>{totalBrands}</span>
            <span style={{ fontSize: '0.78rem', color: muted, marginLeft: '0.4rem' }}>Brands</span>
          </div>
          <div>
            <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#D4AF37' }}>{totalPoints.toLocaleString()}</span>
            <span style={{ fontSize: '0.78rem', color: muted, marginLeft: '0.4rem' }}>Total Points</span>
          </div>
          <a href="/mapofpi/icons/arena" style={{ marginLeft: 'auto', fontSize: '0.78rem', color: '#D4AF37', textDecoration: 'none', border: '1px solid #D4AF3730', borderRadius: '999px', padding: '0.3rem 0.75rem' }}>
            🏆 Map of Pi Champions →
          </a>
        </div>

        {/* ── Ad grid ── */}
        {loading ? (
          <div style={{ color: muted, padding: '3rem 0', textAlign: 'center' }}>Loading the Arena...</div>
        ) : ads.length === 0 ? (
          <div style={{ color: muted, padding: '3rem 0', textAlign: 'center' }}>No active ads yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem', marginBottom: '3rem' }}>
            {ads.map(ad => {
              const color = getBrandColor(ad.brand);
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
                    <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', fontSize: '0.6rem', fontWeight: 700, color: orange, background: `${orange}15`, border: `1px solid ${orange}30`, borderRadius: '999px', padding: '0.1rem 0.4rem' }}>
                      ⭐ FEATURED
                    </div>
                  )}

                  {/* Brand + champion */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <span
                      onClick={e => { e.stopPropagation(); router.push(`/profile/${encodeURIComponent(ad.email)}`); }}
                      style={{ fontWeight: 700, fontSize: '0.82rem', color, cursor: 'pointer', textDecoration: 'underline', textDecorationColor: `${color}50` }}
                    >
                      {ad.brand}
                    </span>
                    {ad.is_country_champion && ad.country && (
                      <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#D4AF37', background: '#D4AF3715', border: '1px solid #D4AF3730', borderRadius: '999px', padding: '0.1rem 0.4rem' }}>
                        🏆 {ad.country}
                      </span>
                    )}
                    <span style={{ fontSize: '0.65rem', color: muted }}>{ad.tier}</span>
                  </div>

                  {/* Title + description */}
                  <div style={{ fontWeight: 700, fontSize: '0.92rem', marginBottom: '0.4rem', lineHeight: 1.3 }}>{ad.title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '1rem', lineHeight: 1.5 }}>
                    {ad.description.length > 100 ? ad.description.slice(0, 100) + '…' : ad.description}
                  </div>

                  {/* Action row */}
                  <div style={{ display: 'flex', gap: '0.4rem' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleClick(ad)}
                      style={{ flex: 1, background: color, border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, fontSize: '0.78rem', padding: '0.55rem 0', cursor: 'pointer' }}
                    >
                      {isToast && toast?.msg === 'Clicked!' ? '✓' : 'Visit →'}
                    </button>
                    <button
                      onClick={() => openShare(ad)}
                      style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: isToast && toast?.msg === 'Copied!' ? '#00ff88' : muted, fontWeight: 600, fontSize: '0.78rem', padding: '0.55rem 0.75rem', cursor: 'pointer' }}
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

        {/* ── Bottom CTA ── */}
        {!loading && (
          <div style={{ textAlign: 'center', padding: '3rem 0', borderTop: `1px solid ${border}` }}>
            <div style={{ fontSize: '0.72rem', color: muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Join the Network</div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>Get your brand in the Arena.</div>
            <div style={{ fontSize: '0.88rem', color: muted, marginBottom: '1.5rem' }}>3-day free trial · $9.99/mo · No contracts</div>
            <button
              onClick={() => router.push('/login')}
              style={{ background: orange, border: 'none', borderRadius: '10px', color: '#000', fontWeight: 800, fontSize: '1rem', padding: '0.9rem 2.5rem', cursor: 'pointer' }}
            >
              Start Free Trial →
            </button>
          </div>
        )}
      </div>

      <ArenaFooter />
    </div>
  );
}
