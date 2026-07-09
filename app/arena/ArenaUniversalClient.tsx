'use client';

import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ArenaNav from '../components/ArenaNav';
import ArenaFooter from '../components/ArenaFooter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

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
  points?: number;
  click_count?: number;
  share_count?: number;
  image_url?: string;
};

// FIX: Map of Pi corrected from #7B2FBE → #2E7D32 (brand green)
const BRAND_COLORS: Record<string, string> = {
  'Map of Pi':           '#2E7D32',
  'ANTCPU ADS':          '#f0883e',
  'ANTCPU':              '#f0883e',
  'ANTCPU EDU':          '#0070f3',
  'ANTCPU CLOUD':        '#00ffcc',
  'Amanda Photography':  '#e91e8c',
  'PiPioneersX':         '#FFD700',
  'Mr ben':              '#22c55e',
};

function getBrandColor(brand: string): string {
  return BRAND_COLORS[brand] || '#888';
}

const bg     = '#0a0a0a';
const card   = '#111';
const border = '#1a1a1a';
const muted  = '#555';
const white  = '#fff';
const orange = '#f0883e';

export default function ArenaUniversalClient() {
  const router = useRouter();
  const [ads,     setAds]     = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [user,    setUser]    = useState({ name: '', email: '', brand: '', trialStatus: 'trial' });
  const [toast,   setToast]   = useState<{ id: string; msg: string } | null>(null);
  const [preview, setPreview] = useState<Ad | null>(null);

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

  function showToast(id: string, msg: string) {
    setToast({ id, msg });
    setTimeout(() => setToast(null), 2000);
  }

  async function handleClick(ad: Ad) {
    window.open(ad.url, '_blank', 'noopener,noreferrer');
    showToast(ad.id, 'Clicked!');
    await supabase.from('ads').update({ click_count: (ad.click_count || 0) + 1 }).eq('id', ad.id);
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, click_count: (a.click_count || 0) + 1 } : a));
    if (preview?.id === ad.id) setPreview({ ...ad, click_count: (ad.click_count || 0) + 1 });
  }

  async function handleShare(ad: Ad) {
    const shortId = ad.id.slice(0, 8);
    const link = `https://antcpu-ads.vercel.app/s/${shortId}`;
    try { await navigator.clipboard.writeText(link); } catch {}
    showToast(ad.id, 'Link copied!');
    await supabase.from('ads').update({ share_count: (ad.share_count || 0) + 1 }).eq('id', ad.id);
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, share_count: (a.share_count || 0) + 1 } : a));
    if (preview?.id === ad.id) setPreview({ ...ad, share_count: (ad.share_count || 0) + 1 });
  }

  const totalBrands = new Set(ads.map(a => a.brand)).size;
  const totalPoints = ads.reduce((sum, a) => sum + (a.points || 0), 0);

  return (
    <div style={{ background: bg, color: white, fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <ArenaNav
  role={user.trialStatus === 'team' ? 'team' : user.email === 'antcpu@gmail.com' ? 'admin' : 'user'}
  userName={user.name}
  userEmail={user.email}
  userBrand={user.brand}
  trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'}
/>


      {/* ── PREVIEW MODAL — FIX: all references use `preview` not undefined `ad`/`color`/`isToast` ── */}
      {preview && (() => {
        const color    = getBrandColor(preview.brand);
        const isToast  = toast?.id === preview.id;
        return (
          <>
            {/* Backdrop */}
            <div
              onClick={() => setPreview(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 999, backdropFilter: 'blur(4px)' }}
            />
            {/* Sheet */}
            <div style={{
              position: 'fixed', bottom: 0, left: 0, right: 0,
              maxHeight: '88vh', overflowY: 'auto',
              background: '#0f0f0f',
              borderRadius: '20px 20px 0 0',
              zIndex: 1000,
              padding: '1.5rem 1.5rem 2.5rem',
              boxShadow: `0 -8px 40px ${color}33`,
              borderTop: `2px solid ${color}`,
            }}>
              {/* Handle + close */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ width: '40px', height: '4px', background: '#333', borderRadius: '999px' }} />
                <button onClick={() => setPreview(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1 }}>✕</button>
              </div>

              {/* Brand pill + tier */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: '999px', padding: '0.2rem 0.75rem', fontSize: '0.72rem', fontWeight: 700 }}>
                  {preview.brand}
                </span>
                {preview.pinned && (
                  <span style={{ background: '#f0883e22', color: '#f0883e', border: '1px solid #f0883e44', borderRadius: '999px', padding: '0.2rem 0.75rem', fontSize: '0.72rem', fontWeight: 700 }}>
                    ⭐ FEATURED
                  </span>
                )}
                <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {preview.tier} · {preview.category}
                </span>
              </div>

              {/* Title + description */}
              <h3 style={{ fontWeight: 800, fontSize: '1.2rem', margin: '0 0 0.5rem', color: white }}>{preview.title}</h3>
              <p style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 1.25rem' }}>{preview.description}</p>

              {/* Stats row */}
              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '0.75rem', color: muted }}>👁 {preview.click_count || 0} clicks</span>
                <span style={{ fontSize: '0.75rem', color: muted }}>🔗 {preview.share_count || 0} shares</span>
                <span style={{ fontSize: '0.75rem', color: muted }}>⭐ {preview.points || 0} pts</span>
              </div>

              {/* Action buttons — FIX: use `preview` throughout, `color` and `isToast` in scope */}
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={() => handleClick(preview)}
                  style={{ flex: 1, background: color, border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, fontSize: '0.8rem', padding: '0.6rem 0', cursor: 'pointer', transition: 'opacity 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  {isToast && toast?.msg === 'Clicked!' ? '✓ Clicked!' : 'Visit →'}
                </button>
                <button
                  onClick={() => handleShare(preview)}
                  style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: isToast && toast?.msg === 'Link copied!' ? '#00ff88' : muted, fontWeight: 600, fontSize: '0.8rem', padding: '0.6rem 0.9rem', cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { e.currentTarget.style.color = white; e.currentTarget.style.borderColor = '#333'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = isToast && toast?.msg === 'Link copied!' ? '#00ff88' : muted; e.currentTarget.style.borderColor = border; }}
                >
                  {isToast && toast?.msg === 'Link copied!' ? '✓ Copied' : '🔗 Share'}
                </button>
                <button
                  onClick={() => setPreview(null)}
                  style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: muted, fontWeight: 600, fontSize: '0.8rem', padding: '0.6rem 0.9rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  onMouseEnter={e => { e.currentTarget.style.color = white; e.currentTarget.style.borderColor = '#333'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = muted; e.currentTarget.style.borderColor = border; }}
                >
                  ✕ Close
                </button>
              </div>
            </div>
          </>
        );
      })()}

      {/* ── HEADER STATS ── */}
      <div style={{ padding: '1.5rem 2rem', borderBottom: `1px solid ${border}`, display: 'flex', gap: '2rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: orange }}>{ads.length}</div>
            <div style={{ fontSize: '0.65rem', color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live Ads</div>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: orange }}>{totalBrands}</div>
            <div style={{ fontSize: '0.65rem', color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Brands</div>
          </div>
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: orange }}>{totalPoints.toLocaleString()}</div>
            <div style={{ fontSize: '0.65rem', color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Total Points</div>
          </div>
        </div>
        <a href="/mapofpi/icons/arena" style={{ fontSize: '0.8rem', color: '#2E7D32', border: '1px solid #2E7D3240', borderRadius: '8px', padding: '0.5rem 1rem', textDecoration: 'none', fontWeight: 600 }}>
          🗺️ Map of Pi Champions →
        </a>
      </div>

      {/* ── AD GRID ── */}
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.25rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: muted }}>Loading the Arena...</div>
        ) : ads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: muted }}>No active ads yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
            {ads.map(ad => {
              const color   = getBrandColor(ad.brand);
              const isToast = toast?.id === ad.id;
              return (
                <div
                  key={ad.id}
                  style={{ background: card, border: `1px solid ${ad.pinned ? color + '60' : border}`, borderRadius: '14px', padding: '1.25rem', cursor: 'pointer', transition: 'border-color 0.2s', position: 'relative' }}
                  onClick={() => setPreview(ad)}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = color + '80')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = ad.pinned ? color + '60' : border)}
                >
                  {/* Pinned badge */}
                  {ad.pinned && (
                    <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: '#f0883e22', color: '#f0883e', border: '1px solid #f0883e44', borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.65rem', fontWeight: 700 }}>
                      ⭐ FEATURED
                    </div>
                  )}

                  {/* Brand */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ background: `${color}22`, color, border: `1px solid ${color}44`, borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.68rem', fontWeight: 700 }}>
                      {ad.brand}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: muted, marginLeft: 'auto' }}>{ad.tier}</span>
                  </div>

                  {/* Title + description */}
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem', color: white, lineHeight: 1.3 }}>{ad.title}</div>
                  <div style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.5, marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {ad.description}
                  </div>

                  {/* Action row */}
                  <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleClick(ad)}
                      style={{ flex: 1, background: color, border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, fontSize: '0.8rem', padding: '0.6rem 0', cursor: 'pointer', transition: 'opacity 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      {isToast && toast?.msg === 'Clicked!' ? '✓ Clicked!' : 'Visit →'}
                    </button>
                    <button
                      onClick={() => handleShare(ad)}
                      style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: isToast && toast?.msg === 'Link copied!' ? '#00ff88' : muted, fontWeight: 600, fontSize: '0.8rem', padding: '0.6rem 0.9rem', cursor: 'pointer', transition: 'color 0.15s', whiteSpace: 'nowrap' }}
                      onMouseEnter={e => { e.currentTarget.style.color = white; e.currentTarget.style.borderColor = '#333'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = isToast && toast?.msg === 'Link copied!' ? '#00ff88' : muted; e.currentTarget.style.borderColor = border; }}
                    >
                      {isToast && toast?.msg === 'Link copied!' ? '✓ Copied' : '🔗'}
                    </button>
                    <button
                      onClick={() => setPreview(ad)}
                      style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: muted, fontWeight: 600, fontSize: '0.8rem', padding: '0.6rem 0.9rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
                      onMouseEnter={e => { e.currentTarget.style.color = white; e.currentTarget.style.borderColor = '#333'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = muted; e.currentTarget.style.borderColor = border; }}
                    >
                      👁
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── BOTTOM CTA ── */}
        {!loading && (
          <div style={{ textAlign: 'center', marginTop: '3rem', padding: '2rem', border: `1px solid ${border}`, borderRadius: '16px' }}>
            <div style={{ fontSize: '0.7rem', color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Join the Network</div>
            <h2 style={{ fontWeight: 800, fontSize: '1.5rem', margin: '0 0 0.5rem' }}>Get your brand in the Arena.</h2>
            <p style={{ color: muted, fontSize: '0.85rem', margin: '0 0 1.5rem' }}>3-day free trial · $9.99/mo · No contracts</p>
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
