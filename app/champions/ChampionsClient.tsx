'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ArenaNav from '../components/ArenaNav';
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
  id: string;
  brand: string;
  title: string;
  url: string;
  description: string;
  category: string;
  tier: string;
  pinned: boolean;
  email: string;
  points: number;
  click_count: number;
  share_count: number;
  rank_position?: number;
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

type Toast = { id: string; msg: string };

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND_COLORS: Record<string, string> = {
  'Map of Pi': '#D4AF37',
  'ANTCPU ADS': '#f0883e',
  'ANTCPU': '#f0883e',
  'Amanda Photography': '#e91e8c',
  'PiPioneersX': '#7928ca',
};

const bg = '#0a0a0a';
const card = '#111';
const border = '#1a1a1a';
const muted = '#555';
const white = '#fff';
const gold = '#D4AF37';
const orange = '#f0883e';

function getBrandColor(brand: string): string {
  return BRAND_COLORS[brand] || '#888';
}

// Country → flag emoji
function countryFlag(country: string): string {
  const flags: Record<string, string> = {
    // ── Africa ──────────────────────────────────────────
    'Nigeria': '🇳🇬',
    'Ghana': '🇬🇭',
    'Kenya': '🇰🇪',
    'South Africa': '🇿🇦',
    'Ethiopia': '🇪🇹',
    'Tanzania': '🇹🇿',
    'Uganda': '🇺🇬',
    'Cameroon': '🇨🇲',
    'Senegal': '🇸🇳',
    'Ivory Coast': '🇨🇮',
    'Zimbabwe': '🇿🇼',
    'Zambia': '🇿🇲',
    'Rwanda': '🇷🇼',
    'Morocco': '🇲🇦',
    'Algeria': '🇩🇿',
    'Tunisia': '🇹🇳',
    'Egypt': '🇪🇬',
    'Mozambique': '🇲🇿',
    'DR Congo': '🇨🇩',
    'Togo': '🇹🇬',
    'Benin': '🇧🇯',
    'Sierra Leone': '🇸🇱',
    'Liberia': '🇱🇷',
    // ── Middle East ─────────────────────────────────────
    'Saudi Arabia': '🇸🇦',
    'UAE': '🇦🇪',
    'Israel': '🇮🇱',
    // ── Asia ────────────────────────────────────────────
    'India': '🇮🇳',
    'Pakistan': '🇵🇰',
    'Bangladesh': '🇧🇩',
    'Sri Lanka': '🇱🇰',
    'Nepal': '🇳🇵',
    'China': '🇨🇳',
    'Japan': '🇯🇵',
    'South Korea': '🇰🇷',
    'Hong Kong': '🇭🇰',
    'Taiwan': '🇹🇼',
    'Singapore': '🇸🇬',
    'Malaysia': '🇲🇾',
    'Indonesia': '🇮🇩',
    'Philippines': '🇵🇭',
    'Vietnam': '🇻🇳',
    'Thailand': '🇹🇭',
    'Myanmar': '🇲🇲',
    'Cambodia': '🇰🇭',
    'Laos': '🇱🇦',
    // ── Oceania ─────────────────────────────────────────
    'Australia': '🇦🇺',
    'New Zealand': '🇳🇿',
    // ── Europe ──────────────────────────────────────────
    'United Kingdom': '🇬🇧',
    'Germany': '🇩🇪',
    'France': '🇫🇷',
    'Spain': '🇪🇸',
    'Italy': '🇮🇹',
    'Netherlands': '🇳🇱',
    'Portugal': '🇵🇹',
    'Greece': '🇬🇷',
    'Sweden': '🇸🇪',
    'Norway': '🇳🇴',
    'Denmark': '🇩🇰',
    'Finland': '🇫🇮',
    'Switzerland': '🇨🇭',
    'Austria': '🇦🇹',
    'Belgium': '🇧🇪',
    'Poland': '🇵🇱',
    'Czech Republic': '🇨🇿',
    'Hungary': '🇭🇺',
    'Romania': '🇷🇴',
    'Bulgaria': '🇧🇬',
    'Serbia': '🇷🇸',
    'Croatia': '🇭🇷',
    'Slovakia': '🇸🇰',
    'Turkey': '🇹🇷',
    // ── Americas ────────────────────────────────────────
    'United States': '🇺🇸',
    'Canada': '🇨🇦',
    'Mexico': '🇲🇽',
    'Brazil': '🇧🇷',
    'Argentina': '🇦🇷',
    'Colombia': '🇨🇴',
    'Venezuela': '🇻🇪',
    'Peru': '🇵🇪',
    'Chile': '🇨🇱',
    'Ecuador': '🇪🇨',
    'Bolivia': '🇧🇴',
    'Honduras': '🇭🇳',
    'Guatemala': '🇬🇹',
    'El Salvador': '🇸🇻',
  };
  return flags[country] || '🌍';
}


// ─── Component ────────────────────────────────────────────────────────────────

export default function ChampionsClient() {
  const router = useRouter();

  const [champions, setChampions] = useState<Ad[]>([]);
  const [openCountries, setOpenCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser>({ name: '', email: '', brand: '', trialStatus: 'trial' });
  const [toast, setToast] = useState<Toast | null>(null);
  const [shareAd, setShareAd] = useState<Ad | null>(null);

  // — derived
  const isSuper = user.role === 'super' || (!!SUPER_EMAIL && user.email === SUPER_EMAIL);
  const dashboardHref = isSuper ? '/dashboard/admin' : user.role === 'admin' ? '/dashboard/users' : '/dashboard/user';
  const totalPoints = champions.reduce((sum, a) => sum + (a.points || 0), 0);

  // — load
  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);

    // Champions — active ads with is_country_champion = true
    const { data: champs } = await supabase
      .from('ads')
      .select('*')
      .eq('status', 'active')
      .eq('is_country_champion', true)
      .order('points', { ascending: false });

    // All active countries
    const { data: allCountryAds } = await supabase
      .from('ads')
      .select('country')
      .eq('status', 'active')
      .not('country', 'is', null);

    const champCountries = new Set((champs || []).map((c: Ad) => c.country));
    const allCountries = [...new Set((allCountryAds || []).map((a: any) => a.country).filter(Boolean))];
    const open = allCountries.filter(c => !champCountries.has(c)).sort();

    setChampions(champs || []);
    setOpenCountries(open);
    setLoading(false);
  }

  function showToast(id: string, msg: string) {
    setToast({ id, msg });
    setTimeout(() => setToast(null), 2000);
  }

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
    setChampions(prev => prev.map(a => a.id === ad.id ? { ...a, click_count: newCount } : a));
  }

  async function executePlatformShare(ad: Ad, platformKey: string) {
    const platform = PLATFORMS.find(p => p.key === platformKey);
    if (!platform) return;

    const ctx: ShareContext = {
      brand: ad.brand,
      title: ad.title,
      description: ad.description,
      url: ad.url,
      profileUrl: `https://antcpu-ads.vercel.app/profile/${encodeURIComponent(ad.email)}`,
      category: ad.category,
      country: ad.country,
      isChampion: ad.is_country_champion,
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
    setChampions(prev => prev.map(a => a.id === ad.id ? { ...a, share_count: newShares } : a));
    setShareAd(null);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: bg, minHeight: '100vh', color: white, fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <ArenaNav
  role={(user.role as 'admin' | 'team' | 'user' | 'mod') || 'user'}
  userName={user.name}
  userEmail={user.email}
  userBrand={user.brand}
  trialStatus={(user.trialStatus as 'team' | 'trial' | 'pending') || 'trial'}
  onLogout={() => { localStorage.removeItem('arena_user'); router.push('/'); }}
/>


      {/* Share modal */}
      {shareAd && (
        <>
          <div onClick={() => setShareAd(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1001, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#111', border: `1px solid ${border}`, borderRadius: '16px', padding: '1.5rem', width: '90%', maxWidth: '420px', zIndex: 1002 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: gold }}>Share {shareAd.brand}</div>
                <div style={{ fontSize: '0.78rem', color: muted, marginTop: '0.2rem' }}>{shareAd.title}</div>
              </div>
              <button onClick={() => setShareAd(null)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '1.4rem' }}>✕</button>
            </div>
            {toast?.id === shareAd.id && (
              <div style={{ background: '#22c55e20', border: '1px solid #22c55e40', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.8rem', color: '#22c55e' }}>
                {toast.msg}
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              {PLATFORMS.map(platform => (
                <button
                  key={platform.key}
                  onClick={() => executePlatformShare(shareAd, platform.key)}
                  style={{ background: `${platform.color}15`, border: `1px solid ${platform.color}30`, borderRadius: '10px', padding: '0.75rem 0.5rem', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span style={{ fontSize: '1.2rem' }}>{platform.icon}</span>
                  <span style={{ fontSize: '0.65rem', color: white, fontWeight: 600 }}>{platform.label}</span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Main */}
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1rem' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏆</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: gold, margin: '0 0 0.5rem' }}>
            Country Champions
          </h1>
          <p style={{ color: muted, fontSize: '0.9rem', margin: 0 }}>
            One brand leads every nation. This is the board.
          </p>
        </div>

        {/* Stats bar */}
        {!loading && (
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '2rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Countries', value: champions.length, color: gold },
              { label: 'Champions', value: new Set(champions.map(c => c.brand)).size, color: orange },
              { label: 'Total Points', value: totalPoints.toLocaleString(), color: '#0070f3' },
            ].map(s => (
              <div key={s.label} style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px', padding: '0.75rem 1.5rem', textAlign: 'center', minWidth: '100px' }}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.7rem', color: muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Champion cards */}
        {loading ? (
          <div style={{ textAlign: 'center', color: muted, padding: '3rem 0' }}>Loading champions...</div>
        ) : champions.length === 0 ? (
          <div style={{ textAlign: 'center', color: muted, padding: '3rem 0' }}>No champions yet. Be the first.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
            {champions.map(ad => {
              const color = getBrandColor(ad.brand);
              const isToast = toast?.id === ad.id;
              const flag = countryFlag(ad.country || '');
              return (
                <div
                  key={ad.id}
                  style={{ background: card, border: `1px solid ${gold}40`, borderRadius: '14px', padding: '1.25rem', position: 'relative', overflow: 'hidden' }}
                >
                  {/* Gold top accent line */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${gold}, transparent)` }} />

                  {/* Country + brand row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '1.5rem' }}>{flag}</span>
                      <span style={{ fontWeight: 800, fontSize: '1rem', color: white }}>{ad.country}</span>
                      <span style={{ background: `${gold}20`, border: `1px solid ${gold}50`, color: gold, borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.65rem', fontWeight: 700 }}>🏆 CHAMPION</span>
                    </div>
                    <button
                      onClick={() => router.push(`/profile/${encodeURIComponent(ad.email)}`)}
                      style={{ background: 'none', border: 'none', color, fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: `${color}50` }}
                    >
                      {ad.brand}
                    </button>
                  </div>

                  {/* Title + description */}
                  <div style={{ marginBottom: '0.75rem' }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: white, marginBottom: '0.3rem' }}>{ad.title}</div>
                    <div style={{ fontSize: '0.82rem', color: muted, lineHeight: 1.5 }}>
                      {ad.description.length > 120 ? ad.description.slice(0, 120) + '…' : ad.description}
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.75rem', color: muted, marginBottom: '0.85rem', flexWrap: 'wrap' }}>
                    {(ad.click_count || 0) > 0 && <span>👆 {ad.click_count}</span>}
                    {(ad.share_count || 0) > 0 && <span>↗ {ad.share_count}</span>}
                    {(ad.points || 0) > 0 && <span style={{ color: gold }}>⚡ {ad.points} pts</span>}
                    {ad.tier && <span style={{ color: '#444', textTransform: 'uppercase', fontSize: '0.65rem', fontWeight: 700 }}>{ad.tier}</span>}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem' }} onClick={e => e.stopPropagation()}>
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
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Open countries */}
        {!loading && openCountries.length > 0 && (
          <div style={{ marginBottom: '2.5rem' }}>
            <div style={{ fontSize: '0.7rem', color: muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
              🌍 Open Countries — No Champion Yet
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {openCountries.map(country => (
                <div
                  key={country}
                  style={{ background: '#111', border: `1px solid #222`, borderRadius: '999px', padding: '0.3rem 0.75rem', fontSize: '0.75rem', color: muted, display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <span>{countryFlag(country)}</span>
                  <span>{country}</span>
                  <span style={{ color: '#333', fontWeight: 700 }}>+</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CTA */}
        <div style={{ background: `${gold}08`, border: `1px solid ${gold}25`, borderRadius: '16px', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 800, color: white, marginBottom: '0.4rem' }}>
            Claim Your Country
          </div>
          <div style={{ fontSize: '0.85rem', color: muted, marginBottom: '1.25rem' }}>
            Get your brand in the Arena. Earn points. Become the champion of your nation.
          </div>
          <button
            onClick={() => router.push('/login')}
            style={{ background: gold, border: 'none', borderRadius: '10px', color: '#000', fontWeight: 800, fontSize: '1rem', padding: '0.9rem 2.5rem', cursor: 'pointer' }}
          >
            Claim Your Country →
          </button>
        </div>

        {/* Back */}
        <button
          onClick={() => router.push('/arena')}
          style={{ marginTop: '2rem', background: 'none', border: 'none', color: orange, cursor: 'pointer', fontSize: '0.82rem', padding: 0, display: 'block', margin: '2rem auto 0' }}
        >
          ← Back to Arena
        </button>

      </div>

      <ArenaFooter />
    </div>
  );
}
