'use client';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
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

const BRAND_COLORS: Record<string, string> = {
  'Map of Pi':        '#7B2FBE',
  'ANTCPU ADS':       '#f0883e',
  'ANTCPU':           '#f0883e',
  'ANTCPU EDU':       '#0070f3',
  'ANTCPU CLOUD':     '#00ffcc',
  'Amanda Photography': '#e91e8c',
  'PiPioneersX':      '#FFD700',
};

function getBrandColor(brand: string): string {
  return BRAND_COLORS[brand] || '#888';
}

export default function ArenaUniversalClient() {
  const router = useRouter();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>({ name: '', email: '', brand: '', trialStatus: 'trial' });
  const [toast, setToast] = useState<{ id: string; msg: string } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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
  }

  async function handleShare(ad: Ad) {
    const link = `https://antcpu-ads.vercel.app/arena#ad-${ad.id}`;
    try { await navigator.clipboard.writeText(link); } catch {}
    showToast(ad.id, 'Link copied!');
    await supabase.from('ads').update({ share_count: (ad.share_count || 0) + 1 }).eq('id', ad.id);
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, share_count: (a.share_count || 0) + 1 } : a));
  }

  const isAdmin = user.email === 'antcpu@gmail.com';
  const isTeam = user.trialStatus === 'team';
  const totalBrands = new Set(ads.map(a => a.brand)).size;
  const totalPoints = ads.reduce((sum, a) => sum + (a.points || 0), 0);

  // styles
  const bg = '#0a0a0a';
  const card = '#111';
  const border = '#1a1a1a';
  const muted = '#555';
  const white = '#fff';
  const orange = '#f0883e';

  return (
    <div style={{ background: bg, minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav
        role={isAdmin ? 'admin' : isTeam ? 'team' : 'user'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus}
      />

      {/* ── HERO ── */}
      <section style={{ padding: 'clamp(60px, 8vw, 100px) 1.25rem 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(240,136,62,0.10) 0%, transparent 70%)', pointerEvents: 'none' }} />
        
        {/* LIVE badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '100px', padding: '6px 16px', marginBottom: '1.5rem' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff88', display: 'inline-block', boxShadow: '0 0 8px #00ff88', animation: mounted ? 'pulse 2s infinite' : 'none' }} />
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00ff88', letterSpacing: '1.5px' }}>LIVE</span>
        </div>

        <h1 style={{
          fontSize: 'clamp(48px, 8vw, 96px)',
          fontWeight: 900,
          margin: '0 0 1rem',
          background: 'linear-gradient(135deg, #fff 0%, #f0883e 50%, #7B2FBE 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          lineHeight: 1.05,
        }}>
          The Arena.
        </h1>

        <p style={{ color: '#888', fontSize: 'clamp(15px, 2vw, 18px)', maxWidth: '480px', margin: '0 auto 2.5rem', lineHeight: 1.6 }}>
          {ads.length} live ads · {totalBrands} brands · {totalPoints} total points
        </p>

        {/* Stats bar */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 'clamp(1.5rem, 4vw, 3rem)', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {[
            { val: ads.length, label: 'Live Ads' },
            { val: totalBrands, label: 'Brands' },
            { val: totalPoints, label: 'Total Points' },
            { val: ads.filter(a => a.pinned).length, label: 'Featured' },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: white }}>{s.val}</div>
              <div style={{ fontSize: '0.75rem', color: muted, letterSpacing: '1px', textTransform: 'uppercase' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── AD FEED ── */}
      <section style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 1.25rem 4rem' }}>

        {loading ? (
          <div style={{ color: muted, textAlign: 'center', padding: '4rem' }}>Loading the Arena...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.25rem' }}>
            {ads.map(ad => {
              const color = getBrandColor(ad.brand);
              const isPinned = ad.pinned;
              const isToast = toast?.id === ad.id;

              return (
                <div
                  key={ad.id}
                  id={`ad-${ad.id}`}
                  style={{
                    background: card,
                    border: `1px solid ${isPinned ? color + '55' : border}`,
                    borderRadius: '14px',
                    padding: '1.25rem',
                    position: 'relative',
                    boxShadow: isPinned ? `0 0 32px ${color}22` : 'none',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    gridColumn: isPinned ? 'span 1' : 'span 1',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${color}33`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLDivElement).style.boxShadow = isPinned ? `0 0 32px ${color}22` : 'none';
                  }}
                >
                  {/* Pinned badge */}
                  {isPinned && (
                    <div style={{ position: 'absolute', top: '12px', right: '12px', fontSize: '0.7rem', fontWeight: 700, color, background: color + '22', border: `1px solid ${color}44`, borderRadius: '6px', padding: '2px 8px', letterSpacing: '0.5px' }}>
                      ⭐ FEATURED
                    </div>
                  )}

                  {/* Brand pill */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '0.75rem' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color, letterSpacing: '0.5px', textTransform: 'uppercase' }}>{ad.brand}</span>
                  </div>

                  {/* Image */}
                  {ad.image_url && (ad.pinned || ad.tier !== 'entry') && (
                    <div style={{ margin: '0 -1.25rem', marginTop: '-0.25rem', marginBottom: '0.75rem', overflow: 'hidden', borderRadius: '0 0 0 0', height: '160px' }}>
                      <img src={ad.image_url} alt={ad.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  )}

                  {/* Title */}
                  <div style={{ fontWeight: 700, color: white, fontSize: '0.95rem', lineHeight: 1.4, marginBottom: '0.5rem', paddingRight: isPinned ? '80px' : '0' }}>
                    {ad.title}
                  </div>

                  {/* Description */}
                  {ad.description && (
                    <div style={{ fontSize: '0.8rem', color: '#666', lineHeight: 1.5, marginBottom: '1rem' }}>
                      {ad.description}
                    </div>
                  )}

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.72rem', color: muted }}>{ad.points || 0} pts</span>
                    <span style={{ fontSize: '0.72rem', color: muted }}>{ad.click_count || 0} clicks</span>
                    <span style={{ fontSize: '0.72rem', color: muted }}>{ad.share_count || 0} shares</span>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleClick(ad)}
                      style={{
                        flex: 1,
                        background: color,
                        border: 'none',
                        borderRadius: '8px',
                        color: '#000',
                        fontWeight: 700,
                        fontSize: '0.8rem',
                        padding: '0.6rem 0',
                        cursor: 'pointer',
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      {isToast && toast?.msg === 'Clicked!' ? '✓ Clicked!' : 'Visit →'}
                    </button>
                    <button
                      onClick={() => handleShare(ad)}
                      style={{
                        background: 'transparent',
                        border: `1px solid ${border}`,
                        borderRadius: '8px',
                        color: isToast && toast?.msg === 'Link copied!' ? '#00ff88' : muted,
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        padding: '0.6rem 0.9rem',
                        cursor: 'pointer',
                        transition: 'color 0.15s, border-color 0.15s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { (e.currentTarget.style.color = white); (e.currentTarget.style.borderColor = '#333'); }}
                      onMouseLeave={e => { (e.currentTarget.style.color = isToast && toast?.msg === 'Link copied!' ? '#00ff88' : muted); (e.currentTarget.style.borderColor = border); }}
                    >
                      {isToast && toast?.msg === 'Link copied!' ? '✓ Copied' : '🔗 Share'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── BOTTOM CTA ── */}
        {!loading && (
          <div style={{ textAlign: 'center', marginTop: '4rem', padding: '3rem 1rem', border: `1px solid ${border}`, borderRadius: '16px', background: '#0d0d0d' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: orange, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1rem' }}>Join the Network</div>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', fontWeight: 800, color: white, margin: '0 0 0.75rem' }}>Get your brand in the Arena.</h2>
            <p style={{ color: muted, fontSize: '15px', marginBottom: '2rem' }}>3-day free trial · $9.99/mo · No contracts</p>
            <button
              onClick={() => router.push('/login')}
              style={{ background: orange, border: 'none', borderRadius: '10px', color: '#000', fontWeight: 800, fontSize: '1rem', padding: '0.9rem 2.5rem', cursor: 'pointer' }}
            >
              Start Free Trial →
            </button>
          </div>
        )}
      </section>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.3); }
        }
      `}</style>

      <ArenaFooter brand="ANTCPU ADS" accent={orange} />
    </div>
  );
}
