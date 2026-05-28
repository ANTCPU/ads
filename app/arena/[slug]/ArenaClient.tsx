'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import ArenaFooter from '../../components/ArenaFooter';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const BRAND_CONFIG: Record<string, any> = {
  mapofpi: {
    name: 'Map of Pi',
    tagline: 'The future of Pi eCommerce 🗺️',
    primary: '#2D6A4F',
    accent: '#D4AF37',
    bg: '#f0faf4',
    url: 'https://mapofpi.com',
    youtube: 'https://youtube.com/@mapofpi',
    logo: '/brands/mapofpi/map-of-pi-logo.png',
    hero: '/brands/mapofpi/Mapofpiv2.jpg',
    stats: [
      { label: 'Registered Users', value: '2.1M+' },
      { label: 'Sellers', value: '148K' },
      { label: 'Transactions', value: '173K+' },
      { label: 'Pi Price', value: '$0.17' },
    ],
    posts: [
      { slot: 'morning', text: 'Good morning ☀️\n\nPi Network is growing — and Map of Pi is where commerce happens.\n\n2.1M+ registered users. 148K sellers. 173K+ completed transactions.\n\nFind Pi sellers near you today 🗺️\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #picoin #picommerce #crypto' },
      { slot: 'noon',    text: 'The Pi economy is real 💛\n\nReal sellers. Real buyers. Real transactions happening right now on Map of Pi.\n\nLeave a review. Build trust. Grow the Pi community.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #picommerce #blockchain #crypto' },
      { slot: 'evening', text: 'Pi Network is going mainstream 🌙\n\nMap of Pi is the largest Pi commerce platform in the world.\n\nJoin 2.1M+ users already building the Pi economy.\n\n→ mapofpi.com\n\n#mapofpi #pinetwork #picoin #crypto #picommerce' },
    ],
  },
  antcpu: {
    name: 'ANTCPU',
    tagline: 'Automated Marketing Network ⚡',
    primary: '#0070f3',
    accent: '#003580',
    bg: '#020810',
    url: 'https://antcpu.com',
    stats: [
      { label: 'Ad Network', value: 'Live' },
      { label: 'Tiers', value: '4' },
      { label: 'Antbots', value: '10' },
      { label: 'Arena Pages', value: '23' },
    ],
  },
  pipioneers: {
    name: 'PiPioneersX',
    tagline: 'Join Pi Network — Mine crypto on your smartphone 🚀',
    primary: '#7928ca',
    accent: '#ff0080',
    bg: '#0a0a0a',
    url: 'https://minepi.com/Ajataju',
    stats: [
      { label: 'Network',  value: 'Pi' },
      { label: 'Mining',   value: '📱' },
      { label: 'Referral', value: 'Ajataju' },
      { label: 'Status',   value: 'Active' },
    ],
  },
  photography: {
    name: 'Amanda Photography',
    tagline: "Mother. Grandmother. Storyteller with a lens. 📸",
    primary: '#c9a96e',
    accent: '#8b6914',
    bg: '#0d0a07',
    url: 'https://antcpu.com/manda/',
    logo: null,
    hero: '/livead.jpeg',
    cta: 'Book a Session →',
    stats: [
      { label: 'Style', value: 'Portrait' },
      { label: 'Location', value: 'NC' },
      { label: 'Experience', value: '20+ yrs' },
      { label: 'Status', value: '📅 Booking' },
    ],
    posts: [
      { slot: 'morning', text: 'Good morning ☀️\n\nEvery family has a story worth capturing.\n\nAmanda Photography — 20+ years of portraits, events, and real moments in Thomasville, NC.\n\nNow booking for summer sessions 📸\n\n→ antcpu.com/manda\n\n#photography #familyportraits #nc #portraits #memories' },
      { slot: 'noon',    text: 'The best photos aren\'t posed — they\'re felt. 💛\n\nAmanda Photography captures the real moments. The laughs, the tears, the in-between.\n\nBook your session today.\n\n→ antcpu.com/manda\n\n#photographer #portraitphotography #ncphotographer #familyphotos' },
      { slot: 'evening', text: 'Every picture tells a story 🌙\n\nAs a mother and grandmother, Amanda knows what moments matter most.\n\nLet her capture yours.\n\n→ antcpu.com/manda\n\n#photography #memories #portraits #storytelling #nc' },
    ],
  },
  'ads-network': {
    name: 'ANTCPU ADS',
    tagline: 'The Arena — Automated Marketing Network ⚡',
    primary: '#0070f3',
    accent: '#003580',
    bg: '#020810',
    url: 'https://antcpu.com/cloud/',
    videos: ['/Video2.mp4', '/antcpuads.mp4'],
    stats: [
      { label: 'Active Ads', value: '10+' },
      { label: 'Tiers', value: '4' },
      { label: 'Antbots', value: '10' },
      { label: 'Languages', value: '8' },
    ],
  },
  test: {
    name: 'ANTCPU TEST',
    tagline: 'Arena Copilot — Test Environment 🧪',
    primary: '#f0883e',
    accent: '#ff6600',
    bg: '#0a0a0a',
    url: 'https://antcpu-ads.vercel.app',
  },
};

const TIER_CONFIG: Record<string, { color: string; label: string }> = {
  entry:    { color: '#0070f3', label: 'Entry' },
  rising:   { color: '#7928ca', label: 'Rising' },
  featured: { color: '#ff0080', label: 'Featured' },
  toptier:  { color: '#f0883e', label: 'Top Tier' },
};

type Ad = {
  id: string; brand: string; title: string; url: string;
  description: string; category: string; status: string;
  tier: string; pinned: boolean; email: string;
  points?: number; click_count?: number; share_count?: number;
  image_url?: string;
};

export default function ArenaClient() {
  const router = useRouter();
  const params = useParams();
  const slug = (params?.slug as string || '').toLowerCase();
  const brand = BRAND_CONFIG[slug];

  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>({ name: '', email: '', brand: '', trialStatus: 'trial' });
  const [sharedId, setSharedId] = useState('');
  const [activeRegion, setActiveRegion] = useState('North America');
  const [activeTerr, setActiveTerr] = useState('');
  const [activeCountry, setActiveCountry] = useState('USA');
  const [shareModal, setShareModal] = useState<Ad | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
    if (brand) fetchAds();
    else setLoading(false);
  }, [slug]);

  async function fetchAds() {
    setLoading(true);
    const brandNames = slug === 'antcpu'
      ? ['ANTCPU', 'ANTCPU ADS']
      : [brand.name];
    const { data } = await supabase
      .from('ads')
      .select('*')
      .in('brand', brandNames)
      .eq('status', 'active')
      .order('pinned', { ascending: false })
      .order('points', { ascending: false });
    setAds(data || []);
    setLoading(false);
  }

  function openShare(ad: Ad) {
    // Mobile — native share sheet immediately
    if (typeof navigator !== 'undefined' && navigator.share) {
      const text = `Check out ${ad.brand} on ANTCPU ADS ⚡\n\n"${ad.title}"\n\n${ad.description}\n\n→ ${ad.url}\n\n#antcpuads #marketing`;
      navigator.share({ title: ad.title, text, url: ad.url })
        .then(() => recordShare(ad))
        .catch(() => setShareModal(ad)); // fallback to modal if share cancelled
      return;
    }
    // Desktop — open share modal
    setShareModal(ad);
  }

  function recordShare(ad: Ad) {
    setSharedId(ad.id);
    setTimeout(() => setSharedId(''), 2500);
    const newShares = (ad.share_count || 0) + 1;
    supabase.from('ads').update({ share_count: newShares }).eq('id', ad.id).then(() => {
      fetch('/api/scout/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad_id: ad.id }),
      }).catch(() => {});
    });
    fetch(process.env.NEXT_PUBLIC_DISCORD_WEBHOOK || '', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `↗ **Ad Shared** — ${ad.brand}\n**Title:** "${ad.title}"\n**Shares:** ${newShares}\n**Source:** arena/${slug}`,
      }),
    }).catch(() => {});
  }

  function shareToFacebook(ad: Ad) {
    const url = encodeURIComponent(ad.url);
    const quote = encodeURIComponent(`"${ad.title}" — ${ad.description}`);
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${quote}`, '_blank', 'width=600,height=500,scrollbars=yes');
    recordShare(ad);
    setShareModal(null);
  }

  function shareToTwitter(ad: Ad) {
    const text = encodeURIComponent(`Check out ${ad.brand} on ANTCPU ADS ⚡\n\n"${ad.title}"\n\n→ ${ad.url}\n\n#antcpuads #marketing`);
    window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank', 'width=600,height=500,scrollbars=yes');
    recordShare(ad);
    setShareModal(null);
  }

  function copyText(ad: Ad) {
    const text = `Check out ${ad.brand} on ANTCPU ADS ⚡\n\n"${ad.title}"\n\n${ad.description}\n\n→ ${ad.url}\n\n#antcpuads #marketing`;
    navigator.clipboard.writeText(text).catch(() => {});
    recordShare(ad);
    setShareModal(null);
  }

  // Brand image map — used in share modal
  // Brand-specific schedule posts
  const BRAND_POSTS: Record<string, {slot:string;text:string}[]> = {
    photography: (BRAND_CONFIG['photography'] as any).posts || [],
    mapofpi:     (BRAND_CONFIG['mapofpi'] as any).posts || [],
  };
  const brandPosts = BRAND_POSTS[slug] || [];

  const BRAND_VIDEOS: Record<string, string[]> = {
    'ads-network': ['/Video2.mp4', '/antcpuads.mp4'],
    antcpu:        ['/Video2.mp4'],
  };
  const brandVideos = BRAND_VIDEOS[slug] || [];
  const isWeekend = [0, 6].includes(new Date().getDay());

  const BRAND_IMAGES: Record<string, string> = {
    mapofpi:      '/brands/mapofpi/Mapofpiv2.jpg',
    antcpu:       '/adNetwork.jpeg',
    pipioneers:   '/JoinNow.jpeg',
    photography:  '/livead.jpeg',
    'ads-network':'/adsworldwide.jpeg',
    test:         '/adDashboard.jpeg',
  };
  const brandImage = BRAND_IMAGES[slug] || null;

  // System ad image rotation — 5 images across 10 ads
  const SYSTEM_AD_IMAGES: Record<string, string> = {
    'Your Brand. Live in Minutes. Free 3-Day Trial.':              '/JoinNow.jpeg',
    'The Arena is Live — 4 Tiers. Real Engagement. Real Results.': '/adNetwork.jpeg',
    'Your Ad Dashboard. Points. Rankings. Growth.':                '/adDashboard.jpeg',
    'Live Ads. Real Brands. Real People Watching.':                '/livead.jpeg',
    'Reach Pioneers Worldwide. 8 Languages. One Network.':         '/adsworldwide.jpeg',
    '$9.99/Month. No Contracts. Cancel Anytime.':                  '/JoinNow.jpeg',
    'AI Antbots Promote Your Brand 24/7.':                         '/adNetwork.jpeg',
    'Same-Day Setup. Your Ad Live Before Tonight.':                '/adDashboard.jpeg',
    'Compete. Share. Earn Points. Rise to the Top.':               '/livead.jpeg',
    'Veteran-Built. Developer-Powered. Arena-Tested.':             '/adsworldwide.jpeg',
  };

  const isAdmin = user.email === 'antcpu@gmail.com';
  const isTeam = user.trialStatus === 'team';

  if (!brand) {
    return (
      <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', gap: '1rem' }}>
        <div style={{ fontSize: '2rem' }}>🔍</div>
        <div style={{ fontWeight: 700, color: '#fff' }}>Brand Arena not found</div>
        <div style={{ color: '#555', fontSize: '0.85rem' }}>No arena configured for "{slug}"</div>
        <button onClick={() => router.push('/dashboard/user')} style={{ background: '#f0883e', border: 'none', color: '#fff', borderRadius: '8px', padding: '0.7rem 1.5rem', cursor: 'pointer', fontWeight: 600 }}>← Back to Arena</button>
      </div>
    );
  }

  return (
    <div style={{ background: brand.bg || '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav
        role={isAdmin ? 'admin' : isTeam ? 'team' : 'user'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus}
      />

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* Brand Hero */}
        <div style={{ marginBottom: '2rem' }}>
          <button onClick={() => router.push('/')} style={{ fontSize: '0.75rem', color: '#444', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1.5rem', padding: 0 }}>← Back to The Arena</button>

          {brand.logo && <img src={brand.logo} alt={brand.name} style={{ height: '48px', marginBottom: '1rem', display: 'block' }} />}
          {(brand as any).hero && <img src={(brand as any).hero} alt={brand.name} style={{ width: '100%', borderRadius: '12px', marginBottom: '1.5rem', maxHeight: '240px', objectFit: 'cover' }} />}

          <div style={{ fontSize: '2rem', fontWeight: 800, color: brand.primary, marginBottom: '0.25rem' }}>{brand.name}</div>
          <div style={{ color: '#666', fontSize: '1rem', marginBottom: '1.5rem' }}>{brand.tagline}</div>

          {/* Stats */}
          {brand.stats && (
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
              {brand.stats.map((s: any) => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: brand.primary }}>{s.value}</div>
                  <div style={{ fontSize: '0.65rem', color: '#888', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Links */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href={brand.url} target="_blank" rel="noopener noreferrer" style={{ background: brand.primary, color: '#fff', borderRadius: '8px', padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
              🌐 Visit {brand.name} →
            </a>
            {brand.youtube && (
              <a href={brand.youtube} target="_blank" rel="noopener noreferrer" style={{ background: '#FF000020', border: '1px solid #FF000040', color: '#FF0000', borderRadius: '8px', padding: '0.5rem 1.25rem', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
                ▶ YouTube →
              </a>
            )}
          </div>
        </div>

        {/* Ads */}
        <div style={{ fontSize: '0.75rem', color: '#888', letterSpacing: '0.1em', marginBottom: '1rem' }}>
          {brand.name} Ads — {ads.length} active
        </div>

        {loading ? (
          <div style={{ color: '#888', fontSize: '0.85rem' }}>Loading...</div>
        ) : ads.length === 0 ? (
          <div style={{ background: '#f9f9f9', border: '1px solid #e5e5e5', borderRadius: '12px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📢</div>
            <div style={{ fontWeight: 700, color: '#0a0a0a', marginBottom: '0.25rem' }}>No active ads yet</div>
            <div style={{ color: '#888', fontSize: '0.85rem' }}>Check back soon — {brand.name} is building their campaign.</div>
          </div>
        ) : (
          ads.map(ad => {
            const tier = TIER_CONFIG[ad.tier] || TIER_CONFIG.entry;
            // 1. Ensure the start of the map loop returns the container cleanly
        return (
          <div key={ad.id} style={{ background: '#fff', border: `1px solid #e5e5e5`, borderLeft: `3px solid ${tier.color}`, borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0a0a0a' }}>{ad.title}</span>
              <span style={{ fontSize: '0.62rem', background: `${tier.color}20`, color: tier.color, borderRadius: '999px', padding: '0.15rem 0.5rem', fontWeight: 700 }}>{tier.label.toUpperCase()}</span>
              {(ad.points || 0) > 0 && <span style={{ fontSize: '0.65rem', color: '#D4AF37' }}>⚡ {ad.points}pts</span>}
              {(ad.click_count || 0) > 0 && <span style={{ fontSize: '0.65rem', color: '#888' }}>👆 {ad.click_count}</span>}
            </div>
            <div style={{ color: '#555', fontSize: '0.85rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>{ad.description}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <a href={ad.url} target="_blank" rel="noopener noreferrer" style={{ color: brand.primary, fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' }}>{ad.url} →</a>
              <button onClick={() => openShare(ad)} style={{ background: sharedId === ad.id ? `${brand.primary}20` : '#f5f5f5', border: `1px solid ${sharedId === ad.id ? brand.primary + '60' : '#e5e5e5'}`, color: sharedId === ad.id ? brand.primary : '#555', borderRadius: '6px', padding: '0.25rem 0.65rem', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 600 }} >
                {sharedId === ad.id ? '✓ Copied' : '↗ Share'}
              </button>
            </div>
          </div>
        );
      })
    )}
        
      {/* ── SHARE MODAL ── */}
      {shareModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 300,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '1rem',
        }} onClick={() => setShareModal(null)}>
          <div style={{
            background: '#111', border: `1px solid ${brand.primary}40`,
            borderRadius: '16px', padding: '1.5rem',
            maxWidth: '420px', width: '100%',
          }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>↗ Share This Ad</div>
              <button onClick={() => setShareModal(null)}
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            {/* Brand image */}
            {brandImage && (
              <img src={brandImage} alt={brand.name}
                style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '10px', marginBottom: '1rem' }} />
            )}

            {/* Ad preview */}
            <div style={{ background: '#0a0a0a', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: brand.primary, marginBottom: '0.3rem' }}>{shareModal.brand}</div>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#fff', marginBottom: '0.3rem' }}>{shareModal.title}</div>
              <div style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.5 }}>{shareModal.description}</div>
            </div>

            {/* Share buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <button onClick={() => shareToFacebook(shareModal)}
                style={{ background: '#1877F2', border: 'none', color: '#fff', borderRadius: '10px', padding: '0.85rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                📘 Share on Facebook
              </button>
              <button onClick={() => shareToTwitter(shareModal)}
                style={{ background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '10px', padding: '0.85rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                𝕏 Share on X / Twitter
              </button>
              <button onClick={() => copyText(shareModal)}
                style={{ background: '#1a1a1a', border: '1px solid #333', color: '#aaa', borderRadius: '10px', padding: '0.85rem', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                📋 Copy Text
              </button>
            </div>

            <div style={{ textAlign: 'center', fontSize: '0.7rem', color: '#333', marginTop: '1rem' }}>
              Every share earns points · {brand.name} Arena
            </div>
          </div>
        </div>
      )}


      {/* ── PREMIUM VIDEO ADS — ads-network demo ── */}
      {brandVideos.length > 0 && (
        <div style={{ maxWidth: '860px', margin: '2rem auto 0', padding: '0 1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              🎬 Premium Video Ads
            </div>
            <div style={{ background: '#f0883e20', border: '1px solid #f0883e40', color: '#f0883e', borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.62rem', fontWeight: 700 }}>
              DELUXE & CLOUD TIER
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {brandVideos.map((vid, vi) => (
              <div key={vi} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #f0883e30', background: '#0a0a0a' }}>
                <video
                  src={vid}
                  controls
                  playsInline
                  style={{ width: '100%', display: 'block', maxHeight: '200px', objectFit: 'cover' }}
                />
                <div style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff', marginBottom: '0.2rem' }}>
                    {vi === 0 ? 'ANTCPU ADS — Network Demo' : 'ANTCPU ADS — Arena Promo'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#555' }}>
                    Video ad · Weekend premium slot · Deluxe plan
                  </div>
                </div>
                {/* Coming Soon tools overlay */}
                <div style={{ padding: '0.5rem 1rem', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '0.68rem', color: '#f0883e', fontWeight: 600 }}>🎬 Video Ad Creator</div>
                  <div style={{ fontSize: '0.62rem', background: '#1a1a1a', border: '1px solid #333', color: '#555', borderRadius: '6px', padding: '0.2rem 0.5rem' }}>Coming Soon</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.68rem', color: '#333', marginTop: '0.75rem' }}>
            Upload your own video ads with Deluxe plan · $79/month · <a href="https://antcpu.com/cloud/" style={{ color: '#f0883e', textDecoration: 'none' }}>Apply for Cloud Access →</a>
          </div>
        </div>
      )}

      {/* ── CAMPAIGN HUB ── */}
      {slug === 'mapofpi' && ((
        const REGIONS: Record<string,{flag:string;label:string;status:string;desc:string;color:string;territories:string[]}> = {
          'North America': {
            flag: '🌎', label: 'North America', status: 'active', color: '#2D6A4F',
            desc: 'USA · Canada · Mexico',
            countries: {
              'USA': {
                flag: '🇺🇸',
                territories: ['Alabama','Alaska','Arizona','Arkansas','California','Colorado','Connecticut','Delaware','Florida','Georgia','Hawaii','Idaho','Illinois','Indiana','Iowa','Kansas','Kentucky','Louisiana','Maine','Maryland','Massachusetts','Michigan','Minnesota','Mississippi','Missouri','Montana','Nebraska','Nevada','New Hampshire','New Jersey','New Mexico','New York','North Carolina','North Dakota','Ohio','Oklahoma','Oregon','Pennsylvania','Rhode Island','South Carolina','South Dakota','Tennessee','Texas','Utah','Vermont','Virginia','Washington','West Virginia','Wisconsin','Wyoming'],
              },
              'Canada': {
                flag: '🇨🇦',
                territories: ['Alberta','British Columbia','Manitoba','New Brunswick','Newfoundland and Labrador','Northwest Territories','Nova Scotia','Nunavut','Ontario','Prince Edward Island','Quebec','Saskatchewan','Yukon'],
              },
              'Mexico': {
                flag: '🇲🇽',
                territories: ['Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua','Coahuila','Colima','Durango','Guanajuato','Guerrero','Hidalgo','Jalisco','Mexico City','Mexico State','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro','Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala','Veracruz','Yucatán','Zacatecas'],
              },
            },
            territories: [],
          },
          'Africa': {
            flag: '🌍', label: 'Africa', status: 'next', color: '#D4AF37',
            desc: 'Nigeria · Ghana · Kenya · South Africa · Ethiopia + more',
            territories: ['Egypt','Nigeria','Ghana','Kenya','South Africa','Ethiopia','Tanzania','Uganda','Rwanda','Cameroon','Senegal','Ivory Coast','Zimbabwe','Zambia','Mozambique','Angola','Morocco','Tunisia','Algeria','Libya'],
          },
          'UK': {
            flag: '🇬🇧', label: 'UK', status: 'soon', color: '#003580',
            desc: 'England · Scotland · Wales · Northern Ireland',
            territories: ['England','Scotland','Wales','Northern Ireland'],
          },
          'India': {
            flag: '🇮🇳', label: 'India', status: 'soon', color: '#FF9933',
            desc: '28 states · 8 union territories',
            territories: ['Maharashtra','Delhi','Karnataka','Tamil Nadu','Telangana','Gujarat','Rajasthan','Uttar Pradesh','West Bengal','Kerala','Punjab','Haryana','Bihar','Madhya Pradesh','Andhra Pradesh'],
          },
          'China': {
            flag: '🇨🇳', label: 'China', status: 'soon', color: '#DE2910',
            desc: 'Major provinces + cities',
            territories: ['Beijing','Shanghai','Guangdong','Sichuan','Zhejiang','Jiangsu','Shandong','Henan','Hubei','Hunan'],
          },
          'South Korea': {
            flag: '🇰🇷', label: 'South Korea', status: 'soon', color: '#003478',
            desc: 'Seoul · Busan · Incheon + regions',
            territories: ['Seoul','Busan','Incheon','Daegu','Daejeon','Gwangju','Ulsan','Gyeonggi','Gangwon','Jeju'],
          },
          'Japan': {
            flag: '🇯🇵', label: 'Japan', status: 'soon', color: '#BC002D',
            desc: 'Tokyo · Osaka · Kyoto + prefectures',
            territories: ['Tokyo','Osaka','Kyoto','Hokkaido','Aichi','Fukuoka','Kanagawa','Saitama','Chiba','Hyogo'],
          },
          'Middle East': {
            flag: '🕌', label: 'Middle East', status: 'soon', color: '#C8A951',
            desc: 'UAE · Saudi Arabia · Qatar · Kuwait + more',
            territories: ['UAE','Saudi Arabia','Qatar','Kuwait','Bahrain','Oman','Jordan','Lebanon','Egypt','Iraq'],
          },
        };

        const STATUS_LABEL: Record<string,string> = { active: '🟢 Active', next: '🟡 Next', soon: '⚪ Soon' };

        const region = REGIONS[activeRegion];

        return (
          <div style={{ maxWidth: '860px', margin: '2rem auto 0', padding: '0 1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              🌍 Regional Campaigns
            </div>

            {/* TAB BAR */}
            <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '0.5rem', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
              {Object.values(REGIONS).map(r => {
                const isActive = r.label === activeRegion;
                return (
                  <button key={r.label} onClick={() => { setActiveRegion(r.label); setActiveTerr(''); }} style={{
                    flexShrink: 0,
                    background: isActive ? r.color : 'transparent',
                    color: isActive ? '#fff' : '#666',
                    border: '1px solid ' + (isActive ? r.color : '#e0e0e0'),
                    borderRadius: '999px',
                    padding: '0.4rem 0.9rem',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    cursor: r.status === 'active' || r.status === 'next' ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                    opacity: r.status === 'soon' ? 0.5 : 1,
                    transition: 'all 0.15s',
                  }}>
                    {r.flag} {r.label}
                  </button>
                );
              })}
            </div>

            {/* REGION CARD */}
            <div style={{ marginTop: '1rem', background: region.color + '08', border: '1px solid ' + region.color + '30', borderRadius: '14px', padding: '1.1rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ fontWeight: 800, fontSize: '0.9rem', color: region.color }}>{region.flag} {region.label} Campaign</div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, color: region.color, background: region.color + '15', border: '1px solid ' + region.color + '30', borderRadius: '999px', padding: '0.2rem 0.6rem' }}>{STATUS_LABEL[region.status]}</div>
              </div>
              <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: '1rem' }}>{region.desc}</div>

              {/* COUNTRY SUB-SELECTOR — North America only */}
              {(region as any).countries && (
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  {Object.entries((region as any).countries).map(([country, data]: any) => (
                    <button key={country} onClick={() => { setActiveCountry(country); setActiveTerr(''); }} style={{
                      background: activeCountry === country ? region.color : 'transparent',
                      color: activeCountry === country ? '#fff' : region.color,
                      border: '1px solid ' + region.color + '60',
                      borderRadius: '999px',
                      padding: '0.35rem 0.85rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                    }}>
                      {data.flag} {country}
                    </button>
                  ))}
                </div>
              )}

              {/* TERRITORY DROPDOWN */}
              <select
                value={activeTerr}
                onChange={e => setActiveTerr(e.target.value)}
                style={{ width: '100%', background: '#fff', border: '1px solid ' + region.color + '40', borderRadius: '8px', padding: '0.6rem 0.85rem', fontSize: '0.8rem', color: '#333', fontWeight: 600, outline: 'none', cursor: 'pointer', marginBottom: activeTerr ? '1rem' : '0' }}
              >
                <option value=''>— Select a territory —</option>
                {((region as any).countries
                  ? (region as any).countries[activeCountry]?.territories
                  : region.territories
                ).map((t: string) => <option key={t} value={t}>{t}</option>)}
              </select>

              {/* TERRITORY CARD */}
              {activeTerr && (
                <div style={{ background: '#fff', border: '1px solid ' + region.color + '30', borderRadius: '10px', padding: '1rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: region.color, marginBottom: '0.25rem' }}>{(region as any).countries ? (region as any).countries[activeCountry]?.flag : region.flag} {activeTerr}</div>
                  <div style={{ fontSize: '0.72rem', color: '#888', marginBottom: '0.75rem' }}>Map of Pi · {region.label} Campaign</div>
                  <div style={{ fontSize: '0.78rem', color: '#444', lineHeight: 1.6, marginBottom: '0.75rem', background: '#f9f9f9', borderRadius: '8px', padding: '0.75rem' }}>
                    📍 Pi Pioneers in <strong>{activeTerr}</strong> — your territory is live on Map of Pi!{'

'}Find your region on the map, take a screenshot, and post it on Pi Fireside + social media.{'

'}→ mapofpi.com{'

'}#mapofpi #pinetwork #{activeTerr.toLowerCase().replace(/ /g,'')} #picommerce
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button onClick={() => navigator.clipboard.writeText(`📍 Pi Pioneers in ${activeTerr} — your territory is live on Map of Pi!

Find your region on the map, take a screenshot, and post it on Pi Fireside + social media.

→ mapofpi.com

#mapofpi #pinetwork #${activeTerr.toLowerCase().replace(/ /g,'')} #picommerce`)}
                      style={{ background: region.color, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                      📋 Copy Post
                    </button>
                    <button onClick={() => { if(ads.length > 0) openShare(ads[0]); }}
                      style={{ background: 'transparent', border: '1px solid ' + region.color, color: region.color, borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                      ↗ Share Ad
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ))}

      {/* ── WEEKLY SCHEDULE PANEL ── */}
      <div style={{ maxWidth: '860px', margin: '2rem auto 0', padding: '0 1.25rem 3rem' }}>
        <div style={{ fontSize: '0.72rem', color: '#444', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          📅 Weekly Share Schedule
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day, di) => {
            const today = new Date().getDay();
            const dayMap: Record<string,number> = { Sun:0, Mon:1, Tue:2, Wed:3, Thu:4, Fri:5, Sat:6 };
            const isToday = dayMap[day] === today;
            return (
              <div key={day} style={{
                minWidth: '110px', background: isToday ? `${brand.primary}15` : '#111',
                border: `1px solid ${isToday ? brand.primary + '50' : '#1a1a1a'}`,
                borderRadius: '12px', padding: '0.75rem',
                flex: '0 0 auto',
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.78rem', color: isToday ? brand.primary : '#555', marginBottom: '0.6rem', textAlign: 'center' }}>
                  {day}{isToday && <span style={{ fontSize: '0.6rem', marginLeft: '0.3rem', color: brand.primary }}>TODAY</span>}
                </div>
                {/* Morning — video on weekends (premium), image on weekdays */}
                <div style={{ background: '#0a0a0a', borderRadius: '8px', marginBottom: '0.4rem', overflow: 'hidden', position: 'relative' }}>
                  {(di === 5 || di === 6) && brandVideos.length > 0 ? (
                    <>
                      <video
                        src={brandVideos[di === 6 ? 1 : 0] || brandVideos[0]}
                        muted playsInline
                        style={{ width: '100%', height: '52px', objectFit: 'cover', opacity: 0.5 }}
                      />
                      {/* Coming Soon overlay */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.6)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        gap: '2px',
                      }}>
                        <div style={{ fontSize: '0.55rem', fontWeight: 800, color: '#f0883e', letterSpacing: '0.08em' }}>▶ VIDEO AD</div>
                        <div style={{ fontSize: '0.5rem', background: '#f0883e', color: '#000', borderRadius: '3px', padding: '0.1rem 0.3rem', fontWeight: 700 }}>PREMIUM</div>
                      </div>
                    </>
                  ) : brandImage ? (
                    <img src={brandImage} alt="" style={{ width: '100%', height: '52px', objectFit: 'cover', opacity: 0.7 }} />
                  ) : (
                    <div style={{ height: '52px', background: `${brand.primary}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#444' }}>🖼 Image Post</div>
                  )}
                  <div style={{ padding: '0.3rem 0.4rem', fontSize: '0.6rem', color: (di === 5 || di === 6) ? '#f0883e' : '#555' }}>
                    {(di === 5 || di === 6) ? '🎬 Weekend Video' : '🌅 Morning'}
                  </div>
                </div>
                {/* Noon — text + share */}
                {(() => {
                  const noonPost = brandPosts.find(p => p.slot === 'noon');
                  return (
                    <div style={{ background: '#0a0a0a', borderRadius: '8px', padding: '0.4rem', marginBottom: '0.4rem', fontSize: '0.6rem', color: '#444', minHeight: '36px' }}>
                      <div style={{ color: noonPost ? '#888' : '#444', lineHeight: 1.4 }}>
                        {noonPost ? noonPost.text.split('\n')[0] : '☀️ Noon · text post'}
                      </div>
                      {isToday && (noonPost || ads.length > 0) && (
                        <button onClick={() => {
                          if (noonPost) {
                            navigator.clipboard.writeText(noonPost.text).catch(() => {});
                            if (ads.length > 0) openShare(ads[Math.floor(ads.length / 2)] || ads[0]);
                          } else if (ads.length > 0) openShare(ads[Math.floor(ads.length / 2)] || ads[0]);
                        }}
                          style={{ marginTop: '0.25rem', background: brand.primary, border: 'none', color: '#fff', borderRadius: '4px', padding: '0.15rem 0.4rem', fontSize: '0.55rem', cursor: 'pointer', fontWeight: 700 }}>
                          ↗ Share
                        </button>
                      )}
                    </div>
                  );
                })()}
                {/* Evening — text + share */}
                {(() => {
                  const eveningPost = brandPosts.find(p => p.slot === 'evening');
                  return (
                    <div style={{ background: '#0a0a0a', borderRadius: '8px', padding: '0.4rem', fontSize: '0.6rem', color: '#444', minHeight: '36px' }}>
                      <div style={{ color: eveningPost ? '#888' : '#444', lineHeight: 1.4 }}>
                        {eveningPost ? eveningPost.text.split('\n')[0] : '🌙 Evening · text post'}
                      </div>
                      {isToday && (eveningPost || ads.length > 0) && (
                        <button onClick={() => {
                          if (eveningPost) {
                            navigator.clipboard.writeText(eveningPost.text).catch(() => {});
                            if (ads.length > 0) openShare(ads[ads.length - 1] || ads[0]);
                          } else if (ads.length > 0) openShare(ads[ads.length - 1] || ads[0]);
                        }}
                          style={{ marginTop: '0.25rem', background: brand.primary, border: 'none', color: '#fff', borderRadius: '4px', padding: '0.15rem 0.4rem', fontSize: '0.55rem', cursor: 'pointer', fontWeight: 700 }}>
                          ↗ Share
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: '0.68rem', color: '#333', marginTop: '0.75rem' }}>
          Schedule customization coming soon · content per brand
        </div>
      </div>

      {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '1rem' }}>
          <button onClick={() => router.push('/dashboard/user')} style={{ background: 'none', border: 'none', color: brand.primary, cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}>← Back to The Arena</button>
        </div>
      </div>
      <ArenaFooter brand={brand.name} accent={brand.primary} />
    </div>
  );
}
