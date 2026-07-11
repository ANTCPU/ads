'use client';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ArenaNav    from '../../components/ArenaNav';
import ArenaFooter from '../../components/ArenaFooter';
import ModuleSlots from '../../components/ModuleSlots';
import { PLATFORMS, getShareAction, ShareContext } from '../../lib/socialShare';
import { trackClick, recordShare, SOURCE } from '../../lib/tracking';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Env ──────────────────────────────────────────────────────────────────────

const APP_URL    = process.env.NEXT_PUBLIC_APP_URL    || 'https://antcpu-ads.vercel.app';
const SUPER_EMAIL = process.env.NEXT_PUBLIC_SUPER_EMAIL || '';

// ─── Types ────────────────────────────────────────────────────────────────────

type Ad = {
  id:                  string;
  brand:               string;
  title:               string;
  url:                 string;
  description:         string;
  category:            string;
  status:              string;
  tier:                string;
  pinned:              boolean;
  email:               string;
  points:              number;
  click_count:         number;
  share_count:         number;
  rank_position?:      number;
  image_url:           string | null;
  is_country_champion?: boolean;
  country?:            string;
};

type SessionUser = {
  name:        string;
  email:       string;
  brand:       string;
  trialStatus: string;
  role?:       string;
};

type BrandConfig = {
  name:     string;
  primary:  string;
  logo?:    string;
  site?:    string;
};

// ─── Brand Registry ───────────────────────────────────────────────────────────

const BRANDS: Record<string, BrandConfig> = {
  antcpu:      { name: 'ANTCPU ADS',         primary: '#f0883e', logo: '/brands/antcpu/adsnetwork.jpg',        site: 'https://antcpu.com' },
  mapofpi:     { name: 'Map of Pi',           primary: '#D4AF37', logo: '/brands/mapofpi/map-of-pi-logo.png',  site: 'https://mapofpi.com' },
  pipioneers:  { name: 'PiPioneersX',         primary: '#7928ca',                                              site: 'https://x.com/PiPioneersX' },
  photography: { name: 'Amanda Photography',  primary: '#ff0080',                                              site: 'https://antcpu.com/manda/' },
};

const SLUG_ALIAS: Record<string, string> = {
  'ads-network':  'antcpu',
  'antcpuads':    'antcpu',
  'adsnetwork':   'antcpu',
  'amanda':       'photography',
  'amandaphoto':  'photography',
  'pipioneersx':  'pipioneers',
};

const TIER_COLOR: Record<string, string> = {
  toptier:  '#f0883e',
  featured: '#ff0080',
  rising:   '#7928ca',
  entry:    '#0070f3',
};

const DEFAULT_SLOTS: (string | null)[] = ['region-map', null, null];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ArenaClient() {
  const router   = useRouter();
  const params   = useParams();
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

  // — derived
  const isSuper = user.role === 'super' || (!!SUPER_EMAIL && user.email === SUPER_EMAIL);

  // — role-aware dashboard link
  const dashboardHref = isSuper
    ? '/dashboard/admin'
    : user.role === 'admin'
    ? '/dashboard/users'
    : '/dashboard/user';

  // — load user from session
  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
    fetchAds();
  }, [slug]);

  // — load saved module slots
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
      .order('pinned',  { ascending: false })
      .order('points',  { ascending: false });
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

  // — track click via tracking framework
  async function handleClick(ad: Ad) {
    window.open(ad.url, '_blank', 'noopener,noreferrer');
    const newCount = await trackClick(
      { id: ad.id, brand: ad.brand, title: ad.title, email: ad.email, click_count: ad.click_count },
      user.email || 'visitor',
      SOURCE.BRAND_ARENA,
      supabase
    );
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, click_count: newCount } : a));
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
      profileUrl:  `${APP_URL}/profile/${encodeURIComponent(ad.email)}`,
      category:    ad.category,
      country:     ad.country,
      isChampion:  ad.is_country_champion,
    };

    const { url: intentUrl, text } = getShareAction(platform, ctx);

    // — open intent or copy to clipboard
    if (intentUrl) {
      window.open(intentUrl, '_blank', 'noopener,noreferrer');
    } else {
      try { await navigator.clipboard.writeText(text); } catch {}
      setToast('Copied!');
      setTimeout(() => setToast(null), 2000);
    }

    // — record share via tracking framework
    const newShares = await recordShare(
      { id: ad.id, brand: ad.brand, title: ad.title, email: ad.email, share_count: ad.share_count },
      user.email || 'visitor',
      platform.label,
      SOURCE.BRAND_ARENA,
      supabase
    );
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, share_count: newShares } : a));
    setShareAd(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
     <ArenaNav
  role={isSuper ? 'admin' : user.role === 'admin' ? 'admin' : 'user'}
  userName={user.name}
  userEmail={user.email}
  userBrand={user.brand}
  trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'}
  onLogout={() => { localStorage.removeItem('arena_user'); router.push('/'); }}
/>


      {/* Share modal */}
      {shareAd && (
        <>
          <div onClick={() => setShareAd(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1001, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1002, background: '#111', border: '1px solid #222', borderRadius: '20px 20px 0 0', padding: '1.5rem', maxWidth: '480px', margin: '0 auto' }}>

            {/* Modal header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Share {shareAd.brand}</div>
                <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '0.15rem' }}>{shareAd.title}</div>
              </div>
              <button onClick={() => setShareAd(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1.4rem' }}>✕</button>
            </div>

            {/* Toast */}
            {toast && (
              <div style={{ background: '#22c55e15', border: '1px solid #22c55e30', borderRadius: '8px', padding: '0.4rem 0.75rem', fontSize: '0.78rem', color: '#22c55e', marginBottom: '0.75rem', textAlign: 'center' }}>
                {toast}
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
                  {!platform.supportsIntent && (
                    <span style={{ fontSize: '0.58rem', color: '#333' }}>copy</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Main content */}
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1rem 4rem' }}>

        {/* Back */}
        <button onClick={() => router.push('/arena')} style={{ fontSize: '0.78rem', color: '#555', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1.5rem', padding: 0 }}>
          ← All Brands
        </button>

        {/* Brand header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
          {config.logo && (
            <img src={config.logo} alt={config.name} style={{ width: '48px', height: '48px', borderRadius: '12px', objectFit: 'cover', border: `1px solid ${config.primary}30` }} />
          )}
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: config.primary }}>{config.name}</div>
            <div style={{ fontSize: '0.72rem', color: '#555' }}>Arena · {ads.length} active ads{isSuper ? ' · ⚡ Admin' : ''}</div>
          </div>
        </div>

        {/* Module slots */}
        <ModuleSlots
          slots={slots}
          onSave={saveModules}
          context={{
            slug,
            user:     { email: user.email, name: user.name, brand: user.brand, trialStatus: user.trialStatus },
            ads,
            supabase,
            isSuper,
          }}
        />

        {/* Ads */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem 0', color: '#555' }}>Loading ads...</div>
        ) : ads.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '3rem 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
            <div style={{ fontWeight: 700, color: '#aaa', marginBottom: '0.25rem' }}>No active ads yet</div>
            <div style={{ fontSize: '0.82rem', color: '#555' }}>Be the first to advertise in the {config.name} Arena.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {ads.map(ad => (
              <div key={ad.id} style={{ background: '#111', border: `1px solid ${ad.pinned ? config.primary + '40' : '#1a1a1a'}`, borderRadius: '14px', padding: '1.25rem', position: 'relative' }}>

                {/* Ad header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.5rem', gap: '0.5rem' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>{ad.brand}</span>
                      {ad.is_country_champion && ad.country && (
                        <span style={{ fontSize: '0.65rem', color: '#D4AF37', background: '#D4AF3715', border: '1px solid #D4AF3730', borderRadius: '999px', padding: '0.1rem 0.5rem', fontWeight: 700 }}>
                          🏆 {ad.country} Champion
                        </span>
                      )}
                      {ad.pinned && (
                        <span style={{ fontSize: '0.65rem', color: config.primary, fontWeight: 700 }}>📌 PINNED</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.65rem', color: TIER_COLOR[ad.tier] || '#555', fontWeight: 700, textTransform: 'uppercase' }}>{ad.tier}</span>
                      <span style={{ fontSize: '0.65rem', color: '#333' }}>·</span>
                      <span style={{ fontSize: '0.65rem', color: '#555' }}>{ad.category}</span>
                    </div>
                  </div>
                  {/* Rank badge */}
                  {ad.rank_position && (
                    <div style={{ flexShrink: 0, background: ad.rank_position <= 3 ? '#D4AF3715' : '#1a1a1a', border: `1px solid ${ad.rank_position <= 3 ? '#D4AF3730' : '#222'}`, borderRadius: '8px', padding: '0.25rem 0.5rem', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.65rem', color: ad.rank_position <= 3 ? '#D4AF37' : '#555', fontWeight: 700 }}>
                        {ad.rank_position === 1 ? '🥇' : ad.rank_position === 2 ? '🥈' : ad.rank_position === 3 ? '🥉' : `#${ad.rank_position}`}
                      </div>
                    </div>
                  )}
                </div>

                {/* Ad image */}
                {ad.image_url && (ad.pinned || ad.tier !== 'entry') && (
                  <img src={ad.image_url} alt={ad.title} style={{ width: '100%', borderRadius: '10px', marginBottom: '0.75rem', maxHeight: '200px', objectFit: 'cover' }} />
                )}

                {/* Title + description */}
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.4rem', color: '#fff' }}>{ad.title}</div>
                <div style={{ fontSize: '0.82rem', color: '#888', lineHeight: 1.6, marginBottom: '0.75rem' }}>{ad.description}</div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.68rem', color: '#555', marginBottom: '0.75rem' }}>
                  {(ad.click_count || 0) > 0 && <span>👆 {ad.click_count} clicks</span>}
                  {(ad.share_count || 0) > 0 && <span>↗ {ad.share_count} shares</span>}
                  {(ad.points     || 0) > 0 && <span>⚡ {ad.points} pts</span>}
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
          onClick={() => router.push(dashboardHref)}
          style={{ marginTop: '2rem', background: 'none', border: 'none', color: config.primary, cursor: 'pointer', fontSize: '0.82rem', padding: 0 }}
        >
          ← Back to Dashboard
        </button>

      </div>

      <ArenaFooter />
    </div>
  );
}
