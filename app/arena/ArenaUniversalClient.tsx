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

const BRAND_COLORS: Record<string, string> = {
  'Map of Pi': '#7B2FBE',
  'ANTCPU ADS': '#f0883e',
  'ANTCPU': '#f0883e',
  'ANTCPU EDU': '#0070f3',
  'ANTCPU CLOUD': '#00ffcc',
  'Amanda Photography': '#e91e8c',
  'PiPioneersX': '#FFD700',
  'Mr ben': '#22c55e',
};

function getBrandColor(brand: string): string {
  return BRAND_COLORS[brand] || '#888';
}

export default function ArenaUniversalClient() {
  const router = useRouter();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ name: '', email: '', brand: '', trialStatus: 'trial' });
  const [toast, setToast] = useState<{ id: string; msg: string } | null>(null);
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

  const bg = '#0a0a0a';
  const card = '#111';
  const border = '#1a1a1a';
  const muted = '#555';
  const white = '#fff';
  const orange = '#f0883e';

  return (
    <div style={{ background: bg, color: white, fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>

      {/* ── PREVIEW MODAL ── */}
      {preview && (
        <>
          {/* Overlay */}
          <div
            onClick={() => setPreview(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
              zIndex: 999, backdropFilter: 'blur(4px)',
            }}
          />
          {/* Modal */}
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            maxHeight: '88vh', overflowY: 'auto',
            background: '#0f0f0f',
            borderRadius: '20px 20px 0 0',
            zIndex: 1000,
            padding: '1.5rem 1.5rem 2.5rem',
            boxShadow: `0 -8px 40px ${getBrandColor(preview.brand)}33`,
            borderTop: `2px solid ${getBrandColor(preview.brand)}`,
          }}>
            {/* Handle + close */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ width: '40px', height: '4px', background: '#333', borderRadius: '999px' }} />
              <button
                onClick={() => setPreview(null)}
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1 }}>
                ✕
              </button>
            </div>

            {/* Brand + tier */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <span style={{
                background: `${getBrandColor(preview.brand)}22`,
                color: getBrandColor(preview.brand),
                border: `1px solid ${getBrandColor(preview.brand)}44`,
                borderRadius: '999px', padding: '0.2rem 0.75rem',
                fontSize: '0.72rem', fontWeight: 700,
              }}>{preview.brand}</span>
              {preview.pinned && (
                <span style={{ background: '#f0883e22', color: '#f0883e', border: '1px solid #f0883e44', borderRadius: '999px', padding: '0.2rem 0.75rem', fontSize: '0.72rem', fontWeight: 700 }}>
                  ⭐ FEATURED
                </span>
              )}
              <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {preview.tier} · {preview.category}
              </span>
            </div>

            {/* Image */}
            {preview.image_url && (
              <img
                src={preview.image_url}
                alt={preview.title}
                style={{ width: '100%', borderRadius: '12px', marginBottom: '1rem', maxHeight: '240px', objectFit: 'cover' }}
              />
            )}

            {/* Title */}
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: white, marginBottom: '0.75rem', lineHeight: 1.3 }}>
              {preview.title}
            </div>

            {/* Description */}
            <div style={{ color: '#aaa', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>
              {preview.description}
            </div>

            {/* URL preview */}
            <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1.25rem', wordBreak: 'break-all' }}>
              🔗 {preview.url}
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'pts', val: preview.points || 0 },
                { label: 'clicks', val: preview.click_count || 0 },
                { label: 'shares', val: preview.share_count || 0 },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: getBrandColor(preview.brand) }}>{s.val}</div>
                  <div style={{ fontSize: '0.65rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => handleClick(preview)}
                style={{
                  flex: 2, background: getBrandColor(preview.brand), border: 'none',
                  borderRadius: '10px', color: '#000', fontWeight: 800,
                  fontSize: '1rem', padding: '0.9rem', cursor: 'pointer',
                }}>
                Visit {preview.brand} →
              </button>
              <button
                onClick={() => handleShare(preview)}
                style={{
                  flex: 1, background: 'transparent',
                  border: `1px solid ${border}`,
                  borderRadius: '10px', color: toast?.id === preview.id && toast?.msg === 'Link copied!' ? '#00ff88' : muted,
                  fontWeight: 600, fontSize: '0.9rem', padding: '0.9rem', cursor: 'pointer',
                }}>
                {toast?.id === preview.id && toast?.msg === 'Link copied!' ? '✓ Copied' : '🔗 Share'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── HERO ── */}
      <div style={{ textAlign: 'center', padding: '3rem 1.25rem 1.5rem' }}>
        <div style={{ display: 'inline-block', background: '#0f0', color: '#000', borderRadius: '999px', padding: '0.2rem 0.75rem', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', marginBottom: '1rem' }}>
          LIVE
        </div>
        <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4rem)', fontWeight: 800, margin: '0 0 0.5rem', letterSpacing: '-0.02em' }}>
          The Arena.
        </h1>
        <p style={{ color: muted, fontSize: '1rem', margin: 0 }}>
          {ads.length} live ads · {totalBrands} brands · {totalPoints} total points
        </p>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', padding: '1rem 1.25rem 2rem', flexWrap: 'wrap' }}>
        {[
          { val: ads.length, label: 'Live Ads' },
          { val: totalBrands, label: 'Brands' },
          { val: totalPoints, label: 'Total Points' },
          { val: ads.filter(a => a.pinned).length, label: 'Featured' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: '1.5rem', color: white }}>{s.val}</div>
            <div style={{ fontSize: '0.68rem', color: muted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── AD FEED ── */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '0 1.25rem 4rem' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', color: muted }}>Loading the Arena...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
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
                    border: `1px solid ${isPinned ? color + '44' : border}`,
                    borderLeft: `3px solid ${color}`,
                    borderRadius: '12px',
                    padding: '1rem',
                    cursor: 'pointer',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                    boxShadow: isPinned ? `0 0 32px ${color}22` : 'none',
                  }}
                  onClick={() => setPreview(ad)}
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
                    <div style={{ fontSize: '0.65rem', color: orange, fontWeight: 700, letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                      ⭐ FEATURED
                    </div>
                  )}

                  {/* Brand pill */}
                  <div style={{ marginBottom: '0.5rem' }}>
                    <span style={{
                      background: `${color}22`, color,
                      border: `1px solid ${color}44`,
                      borderRadius: '999px', padding: '0.15rem 0.6rem',
                      fontSize: '0.68rem', fontWeight: 700,
                    }}>{ad.brand}</span>
                  </div>

                  {/* Image — show on all ads that have one */}
                  {ad.image_url && (
                    <img
                      src={ad.image_url}
                      alt={ad.title}
                      style={{ width: '100%', borderRadius: '8px', marginBottom: '0.75rem', maxHeight: '180px', objectFit: 'cover' }}
                    />
                  )}

                  {/* Title */}
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: white, marginBottom: '0.35rem', lineHeight: 1.3 }}>
                    {ad.title}
                  </div>

                  {/* Description */}
                  {ad.description && (
                    <div style={{ color: '#888', fontSize: '0.8rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>
                      {ad.description}
                    </div>
                  )}

                  {/* Stats row */}
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem', color: muted, marginBottom: '0.75rem' }}>
                    <span>{ad.points || 0} pts</span>
                    <span>{ad.click_count || 0} clicks</span>
                    <span>{ad.share_count || 0} shares</span>
                  </div>

                  {/* Action buttons */}
                  <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleClick(ad)}
                      style={{
                        flex: 1, background: color, border: 'none',
                        borderRadius: '8px', color: '#000', fontWeight: 700,
                        fontSize: '0.8rem', padding: '0.6rem 0', cursor: 'pointer',
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
                        background: 'transparent', border: `1px solid ${border}`,
                        borderRadius: '8px',
                        color: isToast && toast?.msg === 'Link copied!' ? '#00ff88' : muted,
                        fontWeight: 600, fontSize: '0.8rem',
                        padding: '0.6rem 0.9rem', cursor: 'pointer',
                        transition: 'color 0.15s, border-color 0.15s',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { (e.currentTarget.style.color = white); (e.currentTarget.style.borderColor = '#333'); }}
                      onMouseLeave={e => { (e.currentTarget.style.color = isToast && toast?.msg === 'Link copied!' ? '#00ff88' : muted; (e.currentTarget.style.borderColor = border); }}
                    >
                      {isToast && toast?.msg === 'Link copied!' ? '✓ Copied' : '🔗 Share'}
                    </button>
                    <button
                      onClick={() => setPreview(ad)}
                      style={{
                        background: 'transparent', border: `1px solid ${border}`,
                        borderRadius: '8px', color: muted,
                        fontWeight: 600, fontSize: '0.8rem',
                        padding: '0.6rem 0.9rem', cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                      onMouseEnter={e => { (e.currentTarget.style.color = white); (e.currentTarget.style.borderColor = '#333'); }}
                      onMouseLeave={e => { (e.currentTarget.style.color = muted); (e.currentTarget.style.borderColor = border); }}
                    >
                      👁 Preview
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
