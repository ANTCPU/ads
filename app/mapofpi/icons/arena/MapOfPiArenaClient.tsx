'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { MAPOFPI_VIDEOS, MAPOFPI_PHASES } from '../../../clients/mapofpi/assets';
import PhaseUnlockStrip from '../../../components/PhaseUnlockStrip';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const green  = '#2E7D32';
const gold   = '#D4AF37';
const bg     = '#0a0a0a';
const card   = '#111';
const border = '#1a1a1a';
const white  = '#fff';
const muted  = '#888';
const muted2 = '#444';

type Ad = {
  id: string; brand: string; title: string; description: string;
  category: string; status: string; tier: string; pinned: boolean;
  points?: number; click_count?: number; share_count?: number; email?: string;
};

const HOW_TO_VIDEOS = MAPOFPI_VIDEOS.filter(v => v.type === 'howto');
const TEAM_VIDEOS   = MAPOFPI_VIDEOS.filter(v => v.type === 'team');

const videosByTab = {
  anthem: MAPOFPI_VIDEOS.filter(v => v.type === 'anthem' || v.type === 'community'),
  howto:  HOW_TO_VIDEOS,
  team:   TEAM_VIDEOS,
};

export default function MapOfPiArenaClient() {
  const [ads,        setAds]        = useState<Ad[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [piPrice,    setPiPrice]    = useState('...');
  const [champCount, setChampCount] = useState(0);
  const [toast,      setToast]      = useState<{ id: string; msg: string } | null>(null);
  const [activeVideo,setActiveVideo]= useState(MAPOFPI_VIDEOS[0].id);
  const [videoTab,   setVideoTab]   = useState<'anthem' | 'howto' | 'team'>('team');
  const [phaseCount, setPhaseCount] = useState(0);

  useEffect(() => { fetchAds(); fetchPiPrice(); fetchChampCount(); }, []);

  async function fetchAds() {
    setLoading(true);
    const { data } = await supabase.from('ads').select('*')
      .eq('status', 'active').eq('brand', 'Map of Pi')
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
      const { count } = await supabase.from('ads')
        .select('*', { count: 'exact', head: true })
        .eq('brand', 'Map of Pi').eq('status', 'active');
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

  const tabVideos = videosByTab[videoTab];

  return (
    <div style={{ background: bg, color: white, fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 1.5rem', borderBottom: `1px solid ${border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '0.95rem' }}>
          <span style={{ color: '#0070f3' }}>⚡</span><span>AD NETWORK</span>
          <span style={{ color: muted2, fontWeight: 400 }}>×</span>
          <span style={{ color: green }}>🗺️ Map of Pi</span>
        </div>
        <a href="/mapofpi" style={{ fontSize: '0.8rem', color: muted, textDecoration: 'none' }}>← Back</a>
      </nav>

      {/* HERO */}
      <div style={{ textAlign: 'center', padding: '3rem 1.25rem 1.5rem' }}>
        <div style={{ fontSize: '0.65rem', color: gold, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          🏆 Country Champions Arena
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.2rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '0.75rem', background: `linear-gradient(135deg, ${white} 40%, ${gold})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Map of Pi. &nbsp;Every Country.
        </h1>
        <p style={{ color: muted, fontSize: '1rem', marginBottom: '1.5rem' }}>
          Real sellers. Real Pi commerce. Powered by 10 antbots per champion.
        </p>

        {/* Stats */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          {[
            { v: champCount.toString(), l: 'Active Champions' },
            { v: '2.1M+',              l: 'Map of Pi Users'  },
            { v: '148K',               l: 'Sellers on Map'   },
            { v: piPrice,              l: 'Pi Price'         },
          ].map(s => (
            <div key={s.l} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: gold }}>{s.v}</div>
              <div style={{ fontSize: '0.65rem', color: muted2, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* PHASE STRIP */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.25rem 1.5rem' }}>
        <PhaseUnlockStrip phases={MAPOFPI_PHASES} currentCount={phaseCount} accentColor={green} goldColor={gold} />
      </div>

      {/* ANTHEM + VIDEO PANEL */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.25rem 2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>

        {/* Main embed */}
        <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: '14px', overflow: 'hidden', border: `1px solid ${green}40` }}>
          <iframe
            src={`https://www.youtube.com/embed/${activeVideo}?autoplay=0&rel=0&modestbranding=1`}
            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>

        {/* Video picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
            {(['anthem', 'howto', 'team'] as const).map(t => (
              <button key={t} onClick={() => setVideoTab(t)} style={{
                background: videoTab === t ? `${green}22` : card,
                border: `1px solid ${videoTab === t ? green : border}`,
                borderRadius: '999px', padding: '0.3rem 0.75rem',
                fontSize: '0.7rem', color: videoTab === t ? green : muted,
                fontWeight: videoTab === t ? 700 : 400, cursor: 'pointer',
              }}>
                {t === 'anthem' ? '🎵 Anthem' : t === 'howto' ? '📖 How-To' : '👥 Team'}
              </button>
            ))}
          </div>
          {/* Thumbnails */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', overflowY: 'auto', maxHeight: '280px' }}>
            {tabVideos.map(v => (
              <button key={v.id} onClick={() => setActiveVideo(v.id)} style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                background: activeVideo === v.id ? `${green}15` : card,
                border: `1px solid ${activeVideo === v.id ? green : border}`,
                borderRadius: '10px', padding: '0.5rem', cursor: 'pointer', textAlign: 'left',
              }}>
                <img src={`https://img.youtube.com/vi/${v.id}/default.jpg`} alt={v.title} style={{ width: '64px', borderRadius: '6px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '0.75rem', color: white, fontWeight: 600, lineHeight: 1.3 }}>{v.title}</div>
                  {v.featured && <div style={{ fontSize: '0.6rem', color: gold, marginTop: '0.2rem' }}>★ Featured</div>}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ADS GRID */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1.25rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontWeight: 800, fontSize: '1.2rem', margin: 0 }}>
            🗺️ Active Champions <span style={{ color: green, fontSize: '1rem' }}>{champCount}</span>
          </h2>
          <a href="/mapofpi/create-shop-ad" style={{ background: green, color: white, padding: '0.6rem 1.25rem', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', fontSize: '0.85rem' }}>
            + Claim your country
          </a>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', color: muted, padding: '3rem' }}>Loading champions...</div>
        ) : ads.length === 0 ? (
          <div style={{ textAlign: 'center', color: muted, padding: '3rem' }}>No champions yet — be the first!</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ads.map(ad => (
              <div key={ad.id} style={{ background: ad.pinned ? '#0d1a0d' : card, border: `1px solid ${ad.pinned ? green + '40' : border}`, borderRadius: '14px', padding: '1.25rem', position: 'relative' }}>
                {ad.pinned && <div style={{ position: 'absolute', top: '0.75rem', right: '0.75rem', background: gold, color: '#0a0a0a', fontSize: '0.6rem', fontWeight: 800, padding: '0.2rem 0.5rem', borderRadius: '999px' }}>⭐ FEATURED</div>}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.7rem', color: green, fontWeight: 700 }}>🗺️ {ad.brand}</span>
                  <span style={{ fontSize: '0.65rem', color: muted2, background: card, border: `1px solid ${border}`, borderRadius: '999px', padding: '0.1rem 0.5rem' }}>{ad.category}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.4rem', color: white }}>{ad.title}</div>
                <div style={{ fontSize: '0.85rem', color: muted, lineHeight: 1.5, marginBottom: '0.75rem' }}>{ad.description}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <span style={{ fontSize: '0.72rem', color: muted2 }}>👁 {ad.click_count || 0}</span>
                  <span style={{ fontSize: '0.72rem', color: muted2 }}>🔗 {ad.share_count || 0}</span>
                  <span style={{ fontSize: '0.72rem', color: gold }}>⭐ {ad.points || 0} pts</span>
                  <button onClick={() => handleClick(ad)} style={{ marginLeft: 'auto', background: green, color: white, border: 'none', borderRadius: '8px', padding: '0.4rem 1rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
                    Visit Shop →
                  </button>
                  <button onClick={() => handleShare(ad)} style={{ background: card, color: muted, border: `1px solid ${border}`, borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                    🔗
                  </button>
                </div>
                {toast?.id === ad.id && (
                  <div style={{ position: 'absolute', bottom: '0.75rem', left: '50%', transform: 'translateX(-50%)', background: green, color: white, fontSize: '0.72rem', padding: '0.3rem 0.75rem', borderRadius: '999px', fontWeight: 600 }}>
                    {toast.msg}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER CTA */}
      <div style={{ textAlign: 'center', padding: '3rem 1.25rem', borderTop: `1px solid ${border}` }}>
        <div style={{ fontSize: '0.65rem', color: muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Your country is waiting</div>
        <h2 style={{ fontWeight: 800, fontSize: '1.8rem', marginBottom: '0.75rem' }}>Become a Country Champion.</h2>
        <p style={{ color: muted, marginBottom: '1.5rem', fontSize: '0.9rem' }}>90 days free · 10 antbots · Your shop on the global Map of Pi network.</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/mapofpi/create-shop-ad" style={{ background: green, color: white, padding: '1rem 2rem', borderRadius: '10px', fontWeight: 800, textDecoration: 'none', fontSize: '1rem' }}>Claim Your Country →</a>
          <a href="/mapofpi" style={{ background: card, color: muted, padding: '1rem 1.5rem', borderRadius: '10px', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem', border: `1px solid ${border}` }}>Learn More</a>
        </div>
      </div>

      <footer style={{ textAlign: 'center', padding: '1.5rem', color: muted2, fontSize: '0.75rem', borderTop: `1px solid ${border}` }}>
        © {new Date().getFullYear()} AD NETWORK · <span style={{ color: '#0070f3' }}>⚡ ANTCPU</span> × <span style={{ color: gold }}>🗺️ Map of Pi</span> · <a href="/arena" style={{ color: muted2 }}>Full Arena</a> · <a href="https://mapofpi.com/" style={{ color: muted2 }}>mapofpi.com</a>
      </footer>
    </div>
  );
}
