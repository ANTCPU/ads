'use client';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ArenaNav from '../../components/ArenaNav';
import ArenaFooter from '../../components/ArenaFooter';
import ModuleSlots from '../../components/ModuleSlots';
import { notifyDiscord } from '../../lib/discord';
import { PLATFORMS, getShareAction, ShareContext } from '../../lib/socialShare';

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

type BrandConfig = {
  name: string;
  primary: string;
  logo?: string;
  site?: string;
};

// ─── Brand Registry ───────────────────────────────────────────────────────────
// Single source of truth — slug → brand display name + accent color
// Add new brands here only

const BRANDS: Record<string, BrandConfig> = {
  antcpu:      { name: 'ANTCPU ADS',         primary: '#f0883e', logo: '/brands/antcpu/adsnetwork.jpg',       site: 'https://antcpu.com' },
  mapofpi:     { name: 'Map of Pi',           primary: '#D4AF37', logo: '/brands/mapofpi/map-of-pi-logo.png', site: 'https://mapofpi.com' },
  pipioneers:  { name: 'PiPioneersX',         primary: '#7928ca',                                             site: 'https://x.com/PiPioneersX' },
  photography: { name: 'Amanda Photography',  primary: '#ff0080',                                             site: 'https://antcpu.com/manda/' },
};

// Slug aliases — any variant → canonical brand key
const SLUG_ALIAS: Record<string, string> = {
  'ads-network':  'antcpu',
  'antcpuads':    'antcpu',
  'adsnetwork':   'antcpu',
  'amanda':       'photography',
  'amandaphoto':  'photography',
  'pipioneersx':  'pipioneers',
};

const DEFAULT_SLOTS: (string | null)[] = ['region-map', null, null];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArenaClient() {
  const router = useRouter();
  const params = useParams();
  const slug     = (params?.slug as string || '').toLowerCase();
  const brandKey = SLUG_ALIAS[slug] || slug;
  const config   = BRANDS[brandKey] || { name: slug, primary: '#f0883e' };

  // — state
  const [ads, setAds]         = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser]       = useState<SessionUser>({ name: '', email: '', brand: '', trialStatus: 'trial' });
  const [slots, setSlots]     = useState<(string | null)[]>(DEFAULT_SLOTS);
  const [shareAd, setShareAd] = useState<Ad | null>(null);
  const [toast, setToast]     = useState<string | null>(null);

  // — load user + ads
  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
    fetchAds();
  }, [slug]);

  // — load module slots for this user + slug
  useEffect(() => {
    if (!user.email || !slug) return;
    supabase
      .from('arena_modules')
      .select('slots')
      .eq('slug', slug)
      .eq('email', user.email)
      .single()
      .then(({ data }) => { if (data?.slots) setSlots(data.slots); });
  }, [user.email, slug]);

  // — fetch ads for this brand
  async function fetchAds() {
    setLoading(true);
    const { data } = await supabase
      .from('ads')
      .select('*')
      .ilike('brand', `%${config.name}%`)
      .eq('status', 'active')
      .order('pinned', { ascending: false })
      .order('points', { ascending: false });
    setAds(data || []);
    setLoading(false);
  }

  // — save module slots
  async function saveModules(newSlots: (string | null)[]) {
    setSlots(newSlots);
    if (!user.email) return;
    await supabase.from('arena_modules').upsert(
      { slug, email: user.email, slots: newSlots, updated_at: new Date().toISOString() },
      { onConflict: 'slug,email' }
    );
  }

  // — track click + discord milestone
  async function handleClick(ad: Ad) {
    window.open(ad.url, '_blank', 'noopener,noreferrer');
    const newCount = (ad.click_count || 0) + 1;
    await supabase.from('ads').update({ click_count: newCount }).eq('id', ad.id);
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, click_count: newCount } : a));
    fetch('/api/scout/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_id: ad.id }),
    }).catch(() => {});
    if (newCount % 10 === 0) {
      notifyDiscord(`👆 **Click Milestone** — ${ad.brand} hit **${newCount} clicks**\n**Ad:** "${ad.title}"\n**Arena:** /arena/${slug}`);
    }
  }

  // — execute platform share
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
      setToast('Copied!');
      setTimeout(() => setToast(null), 2000);
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
    notifyDiscord(`↗ **Ad Shared** — ${ad.brand} via ${platform.label}\n**Title:** "${ad.title}"\n**Arena:** /arena/${slug}`);
    setShareAd(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#fff' }}>

      {/* Nav */}
      <ArenaNav
        role={user.role === 'super' || user.email === 'antcpu@gmail.com' ? 'admin' : user.trialStatus === 'team' ? 'team' : 'user'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'}
        onLogout={() => { localStorage.removeItem('arena_user'); router.push('/'); }}
      />

      {/* ── Social share modal ── */}
      {shareAd && (
        <>
          <div onClick={() => setShareAd(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1001, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1002, background: '#111', borderTop: '1px solid #1a1a1a', borderRadius: '20px 20px 0 0', padding: '1.5rem', maxWidth: '540px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem' }}>Share {shareAd.brand}</div>
              <button onClick={() => setShareAd(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1.4rem' }}>✕</button>
            </div>
            {toast && <div style={{ fontSize: '0.82rem', color: '#22c55e', marginBottom: '0.75rem' }}>{toast}</div>}
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
                  <span style={{ fontSize: '0.68rem', color: '#fff', fontWeight: 600 }}>{platform.label}</span>
                  {!platform.supportsIntent && (
                    <span style={{ fontSize: '0.6rem', color: '#555' }}>copy</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* Back */}
        <button onClick={() => router.push('/arena')} style={{ fontSize: '0.78rem', color: '#555', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1.5rem', padding: 0 }}>
          ← All Brands
        </button>

        {/* Brand header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
          {config.logo && (
            <img src={config.logo} alt={config.name} style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }} />
          )}
          <div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: config.primary }}>{config.name}</div>
            <div style={{ fontSize: '0.78rem', color: '#555' }}>Arena · {ads.length} active ads</div>
          </div>
        </div>

        {/* Module slots */}
         <ModuleSlots
  slots={slots}
  onSave={saveModules}
  context={{ slug, user: { email: user.email, name: user.name, brand: user.brand, trialStatus: user.trialStatus }, ads, supabase }}
/>


        {/* Ads */}
        {loading ? (
          <div style={{ color: '#555', padding: '2rem 0' }}>Loading ads...</div>
        ) : ads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
            <div style={{ fontWeight: 700, marginBottom: '0.25rem' }}>No active ads yet</div>
            <div style={{ fontSize: '0.82rem', color: '#555' }}>Be the first to advertise in the {config.name} Arena.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ads.map(ad => (
              <div
                key={ad.id}
                style={{ background: '#111', border: `1px solid ${ad.pinned ? config.primary + '60' : '#1a1a1a'}`, borderLeft: `3px solid ${config.primary}`, borderRadius: '12px', padding: '1.25rem' }}
              >
                {/* Ad header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem', color: config.primary }}>{ad.brand}</span>
                  {ad.is_country_champion && ad.country && (
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#D4AF37', background: '#D4AF3715', border: '1px solid #D4AF3730', borderRadius: '999px', padding: '0.1rem 0.4rem' }}>
                      🏆 {ad.country} Champion
                    </span>
                  )}
                  {ad.pinned && <span style={{ fontSize: '0.65rem', color: '#f0883e', fontWeight: 700 }}>📌 PINNED</span>}
                  <span style={{ fontSize: '0.65rem', color: '#555' }}>{ad.tier} · {ad.category}</span>
                </div>

                {/* Ad image — only for pinned or non-entry tier */}
                {ad.image_url && (ad.pinned || ad.tier !== 'entry') && (
                  <img src={ad.image_url} alt={ad.title} style={{ width: '100%', borderRadius: '8px', marginBottom: '0.75rem', maxHeight: '200px', objectFit: 'cover' }} />
                )}

                {/* Title + description */}
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem' }}>{ad.title}</div>
                <div style={{ fontSize: '0.82rem', color: '#888', marginBottom: '0.75rem', lineHeight: 1.5 }}>{ad.description}</div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', color: '#555', marginBottom: '0.75rem' }}>
                  {(ad.click_count || 0) > 0 && <span>👆 {ad.click_count} clicks</span>}
                  {(ad.share_count || 0) > 0 && <span>↗ {ad.share_count} shares</span>}
                  {(ad.points || 0) > 0 && <span>⚡ {ad.points} pts</span>}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button
                    onClick={() => handleClick(ad)}
                    style={{ background: config.primary, border: 'none', color: '#000', borderRadius: '8px', padding: '0.5rem 1.25rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Visit →
                  </button>
                  <button
                    onClick={() => setShareAd(ad)}
                    style={{ background: 'transparent', border: '1px solid #222', color: '#aaa', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}
                  >
                    ↗ Share
                  </button>
                  <button
                    onClick={() => router.push(`/profile/${encodeURIComponent(ad.email)}`)}
                    style={{ background: 'transparent', border: '1px solid #222', color: '#555', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.82rem', cursor: 'pointer' }}
                  >
                    👤 Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Back to dashboard */}
        <button
          onClick={() => router.push('/dashboard/user')}
          style={{ marginTop: '2rem', background: 'none', border: 'none', color: config.primary, cursor: 'pointer', fontSize: '0.82rem', padding: 0 }}
        >
          ← Back to Dashboard
        </button>

      </div>

      <ArenaFooter />
    </div>
  );
}
