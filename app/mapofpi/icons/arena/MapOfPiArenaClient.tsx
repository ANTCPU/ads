'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { MAPOFPI_VIDEOS, MAPOFPI_PHASES } from '../../../clients/mapofpi/assets';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Brand tokens ─────────────────────────────────────────────
const green  = '#2E7D32';
const gold   = '#D4AF37';
const bg     = '#0a0a0a';
const card   = '#111';
const border = '#1a1a1a';
const white  = '#fff';
const muted  = '#888';
const muted2 = '#444';

type Ad = {
  id: string;
  brand: string;
  title: string;
  description: string;
  category: string;
  status: string;
  tier: string;
  pinned: boolean;
  points?: number;
  click_count?: number;
  share_count?: number;
  email?: string;
};

type CountryCount = { country_code: string; count: number };

// Featured videos — anthem first, then how-tos
const FEATURED_VIDEOS = MAPOFPI_VIDEOS.filter(v => v.featured);
const HOW_TO_VIDEOS   = MAPOFPI_VIDEOS.filter(v => v.type === 'howto');
const TEAM_VIDEOS     = MAPOFPI_VIDEOS.filter(v => v.type === 'team');

export default function MapOfPiArenaClient() {
  const router = useRouter();
  const [ads,          setAds]          = useState<Ad[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [piPrice,      setPiPrice]      = useState('...');
  const [champCount,   setChampCount]   = useState(0);
  const [toast,        setToast]        = useState<{ id: string; msg: string } | null>(null);
  const [activeVideo,  setActiveVideo]  = useState(MAPOFPI_VIDEOS[0].id);
  const [videoTab,     setVideoTab]     = useState<'anthem' | 'howto' | 'team'>('anthem');
  const [phaseCount,   setPhaseCount]   = useState(0);

  useEffect(() => {
    fetchAds();
    fetchPiPrice();
    fetchChampCount();
  }, []);

  async function fetchAds() {
    setLoading(true);
    const { data } = await supabase
      .from('ads')
      .select('*')
      .eq('status', 'active')
      .eq('brand', 'Map of Pi')
      .order('pinned', { ascending: false })
      .order('points', { ascending: false });
    setAds(data || []);
    setPhaseCount(data?.length || 0);
    setLoading(false);
  }

  async function fetchPiPrice() {
    try {
      const res  = await fetch('/pi-price');
      const data = await res.json();
      const pi   = data['pi-network']?.usd;
      if (pi) setPiPrice(`$${pi.toFixed(4)}`);
    } catch {}
  }

  async function fetchChampCount() {
    try {
      const { count } = await supabase
        .from('ads')
        .select('*', { count: 'exact', head: true })
        .eq('brand', 'Map of Pi')
        .eq('status', 'active');
      setChampCount(count || 0);
    } catch {}
  }

  function showToast(id: string, msg: string) {
    setToast({ id, msg });
    setTimeout(() => setToast(null), 2000);
  }

  async function handleClick(ad: Ad) {
    showToast(ad.id, 'Clicked!');
    await supabase.from('ads').update({ click_count: (ad.click_count || 0) + 1 }).eq('id', ad.id);
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, click_count: (a.click_count || 0) + 1 } : a));
  }

  async function handleShare(ad: Ad) {
    const link = `https://antcpu-ads.vercel.app/s/${ad.id.slice(0, 8)}`;
    try { await navigator.clipboard.writeText(link); } catch {}
    showToast(ad.id, 'Link copied!');
    await supabase.from('ads').update({ share_count: (ad.share_count || 0) + 1 }).eq('id', ad.id);
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, share_count: (a.share_count || 0) + 1 } : a));
  }

  // Derive current phase from champion count
  const currentPhase = MAPOFPI_PHASES.reduce((acc, p) => phaseCount >= p.unlockAt ? p : acc, MAPOFPI_PHASES[0]);
  const nextPhase    = MAPOFPI_PHASES.find(p => !p.unlocked && phaseCount < p.unlockAt);
  const progress     = nextPhase ? Math.min((phaseCount / nextPhase.unlockAt) * 100, 100) : 100;

  // Video tabs
  const videosByTab = {
    anthem: MAPOFPI_VIDEOS.filter(v => v.type === 'anthem' || v.type === 'community'),
    howto:  HOW_TO_VIDEOS,
    team:   TEAM_VIDEOS,
  };

  return (
    <div style={{ background: bg, color: white, fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>

      {/* ── NAV ── */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 1.5rem', borderBottom: `1px solid ${border}`, position: 'sticky', top: 0, zIndex: 50, background: bg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '0.95rem' }}>
          <span style={{ color: '#0070f3' }}>⚡</span>
          <span>AD NETWORK</span>
          <span style={{ color: muted2, fontWeight: 400 }}>×</span>
          <span style={{ color: green }}>🗺️ Map of Pi</span>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: gold, fontWeight: 700 }}>π {piPrice}</div>
          <a href="/mapofpi/create-shop-ad" style={{ background: gold, color: '#0a0a0a', padding: '0.5rem 1rem', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem', textDecoration: 'none' }}>
            + Add Your Shop
          </a>
          <a href="/mapofpi" style={{ fontSize: '0.8rem', color: muted, textDecoration: 'none' }}>← Back</a>
        </div>
      </nav>

      {/* ── HERO HEADER ── */}
      <div style={{ background: `linear-gradient(180deg, #0d1a0d 0%, ${bg} 100%)`, padding: '3rem 1.5rem 2rem', textAlign: 'center', borderBottom: `1px solid ${green}20` }}>
        <div style={{ display: 'inline-block', background: '#1a2a1a', border: `1px solid ${green}40`, borderRadius: '999px', padding: '0.3rem 1rem', fontSize: '0.72rem', color: gold, marginBottom: '1rem', letterSpacing: '0.06em' }}>
          🏆 Country Champions Arena
        </div>
        <h1 style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '0.75rem', background: `linear-gradient(135deg, ${white} 40%, ${gold})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Map of Pi.<br />Every Country.
        </h1>
        <p style={{ color: muted, fontSize: '1rem', maxWidth: '480px', margin: '0 auto 2rem', lineHeight: 1.6 }}>
          Real sellers. Real Pi commerce. Powered by 10 antbots per champion.
        </p>

        {/* Stats row */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2.5rem', flexWrap: 'wrap' }}>
          {[
            { v: champCount.toString(), l: 'Active Champions' },
            { v: '2.1M+',              l: 'Map of Pi Users' },
            { v: '148K',               l: 'Sellers on Map' },
            { v: piPrice,              l: 'Pi Price' },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: gold }}>{s.v}</div>
              <div style={{ fontSize: '0.65rem', color: muted2, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '3px' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── PHASE UNLOCK STRIP ── */}
      <div style={{ background: '#0d1a0d', borderBottom: `1px solid ${green}20`, padding: '1rem 1.5rem' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.72rem', color: green, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {currentPhase.label}
            </div>
            {nextPhase && (
              <div style={{ fontSize: '0.68rem', color: muted }}>
                {nextPhase.unlockAt - phaseCount} more champions to unlock: <span style={{ color: gold }}>{nextPhase.label}</span>
              </div>
            )}
          </div>
          {/* Progress bar */}
          <div style={{ height: '4px', background: muted2, borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ height: '100%', background: `linear-gradient(90deg, ${green}, ${gold})`, width: `${progress}%`, transition: 'width 0.6s ease', borderRadius: '999px' }} />
          </div>
          {/* Phase pills */}
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {MAPOFPI_PHASES.map(p => (
              <div key={p.id} style={{ flexShrink: 0, background: phaseCount >= p.unlockAt ? `${green}20` : card, border: `1px solid ${phaseCount >= p.unlockAt ? green + '50' : border}`, borderRadius: '999px', padding: '0.25rem 0.75rem', fontSize: '0.65rem', color: phaseCount >= p.unlockAt ? green : muted2, whiteSpace: 'nowrap' }}>
                {p.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* ── ANTHEM + VIDEO PANEL ── */}
        <div style={{ marginBottom: '2.5rem', background: '#0d1a0d', border: `1px solid ${green}25`, borderRadius: '20px', overflow: 'hidden' }}>
          {/* Main embed */}
          <div style={{ position: 'relative', paddingBottom: '40%', background: '#000' }}>
            <iframe
              src={`https://www.youtube.com/embed/${activeVideo}?autoplay=0&rel=0&modestbranding=1`}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Video tabs + thumbnails */}
          <div style={{ padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {(['anthem', 'howto', 'team'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => { setVideoTab(tab); setActiveVideo(videosByTab[tab][0]?.id || activeVideo); }}
                  style={{ background: videoTab === tab ? `${green}30` : 'transparent', border: `1px solid ${videoTab === tab ? green : border}`, borderRadius: '999px', padding: '0.3rem 0.85rem', fontSize: '0.72rem', color: videoTab === tab ? green : muted, cursor: 'pointer', fontWeight: videoTab === tab ? 700 : 400, transition: 'all 0.15s' }}
                >
                  {tab === 'anthem' ? '🎵 Anthem' : tab === 'howto' ? '📖 How-To' : '👥 Team'}
                </button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
              {videosByTab[videoTab].map(v => (
                <button
                  key={v.id}
                  onClick={() => setActiveVideo(v.id)}
                  style={{ flexShrink: 0, background: activeVideo === v.id ? `${green}20` : card, border: `1px solid ${activeVideo === v.id ? green : border}`, borderRadius: '10px', padding: '0.5rem 0.75rem', cursor: 'pointer', textAlign: 'left', maxWidth: '160px' }}
                >
                  <img
                    src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`}
                    alt={v.title}
                    style={{ width: '100%', borderRadius: '6px', marginBottom: '0.35rem', display: 'block' }}
                  />
                  <div style={{ fontSize: '0.65rem', color: activeVideo === v.id ? green : muted, lineHeight: 1.3, fontWeight: activeVideo === v.id ? 700 : 400 }}>{v.title}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── AD GRID ── */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h2 style={{ fontWeight: 800, fontSize: '1.2rem', margin: 0 }}>
              🗺️ Active Champions <span style={{ color: green, fontSize: '0.9rem', marginLeft: '0.5rem' }}>{ads.length}</span>
            </h2>
            <a href="/mapofpi/create-shop-ad" style={{ fontSize: '0.8rem', color: gold, border: `1px solid ${gold}40`, borderRadius: '8px', padding: '0.4rem 0.85rem', textDecoration: 'none', fontWeight: 600 }}>
              + Claim your country
            </a>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: muted }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>🗺️</div>
              <div>Loading champions...</div>
            </div>
          ) : ads.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', background: '#0d1a0d', border: `1px solid ${green}20`, borderRadius: '16px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🏴</div>
              <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.5rem' }}>No champions yet</div>
              <div style={{ color: muted, fontSize: '0.85rem', marginBottom: '1.5rem' }}>Be the first to represent your country.</div>
              <a href="/mapofpi/create-shop-ad" style={{ background: gold, color: '#0a0a0a', padding: '0.75rem 1.75rem', borderRadius: '10px', fontWeight: 800, textDecoration: 'none', fontSize: '0.9rem' }}>
                Claim Your Country →
              </a>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
              {ads.map(ad => {
                const isToast = toast?.id === ad.id;
                // Parse flag + country from title format "emoji shopname — flag country"
                const titleParts = ad.title || '';
                return (
                  <div
                    key={ad.id}
                    style={{ background: card, border: `1px solid ${ad.pinned ? green + '60' : border}`, borderRadius: '16px', padding: '1.25rem', transition: 'border-color 0.2s', position: 'relative' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = green + '60')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = ad.pinned ? green + '60' : border)}
                  >
                    {ad.pinned && (
                      <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: `${gold}22`, color: gold, border: `1px solid ${gold}44`, borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.62rem', fontWeight: 700 }}>
                        ⭐ FEATURED
                      </div>
                    )}

                    {/* Brand badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem' }}>
                      <span style={{ background: `${green}22`, color: green, border: `1px solid ${green}44`, borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.68rem', fontWeight: 700 }}>
                        🗺️ Map of Pi
                      </span>
                      <span style={{ fontSize: '0.65rem', color: muted, marginLeft: 'auto' }}>{ad.category}</span>
                    </div>

                    {/* Title */}
                    <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.4rem', color: white, lineHeight: 1.3 }}>{titleParts}</div>
                    <div style={{ fontSize: '0.82rem', color: muted, lineHeight: 1.5, marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } as React.CSSProperties}>
                      {ad.description}
                    </div>

                    {/* Stats */}
                    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.85rem' }}>
                      <span style={{ fontSize: '0.7rem', color: muted2 }}>👁 {ad.click_count || 0}</span>
                      <span style={{ fontSize: '0.7rem', color: muted2 }}>🔗 {ad.share_count || 0}</span>
                      <span style={{ fontSize: '0.7rem', color: muted2 }}>⭐ {ad.points || 0} pts</span>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleClick(ad)}
                        style={{ flex: 1, background: green, border: 'none', borderRadius: '8px', color: white, fontWeight: 700, fontSize: '0.8rem', padding: '0.6rem 0', cursor: 'pointer', transition: 'opacity 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                      >
                        {isToast && toast?.msg === 'Clicked!' ? '✓ Clicked!' : 'Visit Shop →'}
                      </button>
                      <button
                        onClick={() => handleShare(ad)}
                        style={{ background: 'transparent', border: `1px solid ${border}`, borderRadius: '8px', color: isToast && toast?.msg === 'Link copied!' ? '#00ff88' : muted, fontWeight: 600, fontSize: '0.8rem', padding: '0.6rem 0.75rem', cursor: 'pointer', transition: 'color 0.15s', whiteSpace: 'nowrap' }}
                        onMouseEnter={e => { e.currentTarget.style.color = white; e.currentTarget.style.borderColor = '#333'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = isToast && toast?.msg === 'Link copied!' ? '#00ff88' : muted; e.currentTarget.style.borderColor = border; }}
                      >
                        {isToast && toast?.msg === 'Link copied!' ? '✓' : '🔗'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── BOTTOM CTA ── */}
        <div style={{ textAlign: 'center', padding: '2.5rem 1.5rem', background: '#0d1a0d', border: `1px solid ${green}25`, borderRadius: '20px', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.65rem', color: green, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Your country is waiting
          </div>
          <h2 style={{ fontWeight: 800, fontSize: 'clamp(1.4rem, 3vw, 2rem)', marginBottom: '0.5rem' }}>
            Become a Country Champion.
          </h2>
          <p style={{ color: muted, fontSize: '0.9rem', marginBottom: '1.75rem', maxWidth: '400px', margin: '0 auto 1.75rem', lineHeight: 1.6 }}>
            90 days free · 10 antbots · Your shop on the global Map of Pi network.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/mapofpi/create-shop-ad" style={{ background: gold, color: '#0a0a0a', padding: '1rem 2.5rem', borderRadius: '10px', fontWeight: 800, textDecoration: 'none', fontSize: '1rem' }}>
              Claim Your Country →
            </a>
            <a href="/mapofpi" style={{ background: 'transparent', color: muted, padding: '1rem 1.5rem', borderRadius: '10px', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem', border: `1px solid ${border}` }}>
              Learn More
            </a>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ textAlign: 'center', padding: '1.5rem', color: muted2, fontSize: '0.75rem', borderTop: `1px solid ${border}` }}>
          © {new Date().getFullYear()} AD NETWORK ·{' '}
          <span style={{ color: '#0070f3' }}>⚡ ANTCPU</span> × <span style={{ color: green }}>🗺️ Map of Pi</span>
          {' · '}
          <a href="/arena" style={{ color: muted2, textDecoration: 'none' }}>Full Arena</a>
          {' · '}
          <a href="https://mapofpi.com" target="_blank" rel="noreferrer" style={{ color: muted2, textDecoration: 'none' }}>mapofpi.com</a>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
