'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ── Brand configs keyed by promo_code slug ─────────────────
const BRAND_CONFIG: Record<string, {
  name: string; tagline: string; primary: string; accent: string;
  bg: string; url: string; youtube?: string; logo?: string;
  stats?: { label: string; value: string }[];
}> = {
  mapofpi: {
    name:    'Map of Pi',
    tagline: 'The future of Pi eCommerce 🗺️',
    primary: '#2D6A4F',
    accent:  '#D4AF37',
    bg:      '#050f08',
    url:     'https://mapofpi.com',
    youtube: 'https://youtube.com/@mapofpi',
    logo:    'https://antcpu.com/drive/stock/logo/amandaphotographylogo.png',
    stats: [
      { label: 'Registered Users', value: '2.1M+' },
      { label: 'Sellers',          value: '148K'  },
      { label: 'Transactions',     value: '173K+' },
      { label: 'Pi Price',         value: '$0.17' },
    ],
  },
  antcpu: {
    name:    'ANTCPU',
    tagline: 'Automated Marketing Network ⚡',
    primary: '#0070f3',
    accent:  '#003580',
    bg:      '#020810',
    url:     'https://antcpu.com',
    stats: [
      { label: 'Ad Network',  value: 'Live'  },
      { label: 'Tiers',       value: '4'     },
      { label: 'Antbots',     value: '10'    },
      { label: 'Arena Pages', value: '23'    },
    ],
  },
  test: {
    name:    'ANTCPU TEST',
    tagline: 'Arena Copilot — Test Environment 🧪',
    primary: '#f0883e',
    accent:  '#ff6600',
    bg:      '#0a0a0a',
    url:     'https://antcpu-ads.vercel.app',
  },
};

type Ad = {
  id: string; brand: string; title: string; url: string;
  description: string; category: string; status: string;
  tier: string; pinned: boolean; email: string; logo?: string;
  points?: number; click_count?: number;
};

const TIER_CONFIG: Record<string, { color: string; label: string }> = {
  entry:    { color: '#0070f3', label: 'Entry'    },
  rising:   { color: '#7928ca', label: 'Rising'   },
  featured: { color: '#ff0080', label: 'Featured' },
  toptier:  { color: '#f0883e', label: 'Top Tier' },
};

export default function BrandArena() {
  const router = useRouter();
  const params = useParams();
  const slug = (params?.slug as string || '').toLowerCase();
  const brand = BRAND_CONFIG[slug];

  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ name: '', email: '', brand: '', trialStatus: 'trial' });
  const [sharedId, setSharedId] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
    fetchAds();
  }, [slug]);

  async function fetchAds() {
    setLoading(true);
    // Match by promo_code → get email → get ads
    const { data: signup } = await supabase
      .from('ad_signups')
      .select('email')
      .eq('promo_code', slug.toUpperCase())
      .maybeSingle();

    if (signup?.email) {
      const { data } = await supabase
        .from('ads')
        .select('*')
        .eq('email', signup.email)
        .eq('status', 'active')
        .order('pinned', { ascending: false })
        .order('points', { ascending: false });
      setAds(data || []);
    }
    setLoading(false);
  }

  function shareAd(ad: Ad) {
    const text = `Check out ${ad.brand} on ANTCPU ADS ⚡\n\n"${ad.title}"\n\n→ ${ad.url}\n\n#antcpuads`;
    navigator.clipboard.writeText(text);
    setSharedId(ad.id);
    setTimeout(() => setSharedId(''), 2000);
  }

  if (!brand) {
    return (
      <div style={{ background: '#f5f5f5', color: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
          <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Brand Arena not found</div>
          <div style={{ color: '#555', fontSize: '0.85rem', marginBottom: '1.5rem' }}>No arena configured for "{slug}"</div>
          <button onClick={() => router.push('/dashboard/user')} style={{ background: '#f0883e', border: 'none', color: '#fff', borderRadius: '8px', padding: '0.7rem 1.5rem', cursor: 'pointer', fontWeight: 600 }}>← Back to Arena</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: brand.bg, color: '#0a0a0a', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <ArenaNav
        role={user.email === 'antcpu@gmail.com' ? 'admin' : user.trialStatus === 'team' ? 'team' : 'user'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'}
      />

      {/* Brand Hero */}
      <div style={{ borderBottom: `1px solid ${brand.primary}30`, background: `${brand.primary}12`, padding: '2.5rem 1.5rem 2rem' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <button onClick={() => router.push('/')} style={{ fontSize: '0.75rem', color: '#444', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1.5rem', padding: 0 }}>← Back to The Arena</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
            {brand.logo && <img src={brand.logo} alt={brand.name} style={{ width: '56px', height: '56px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${brand.primary}` }} />}
            {(brand as any).hero && <img src={(brand as any).hero} alt={brand.name + ' hero'} style={{ width: '100%', maxWidth: '600px', borderRadius: '14px', margin: '1rem auto 0', display: 'block', objectFit: 'cover', maxHeight: '220px', border: `1px solid ${brand.primary}30` }} />}
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.5rem', color: brand.primary }}>{brand.name}</div>
              <div style={{ fontSize: '0.82rem', color: brand.accent }}>{brand.tagline}</div>
            </div>
          </div>

          {/* Stats */}
          {brand.stats && (
            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
              {brand.stats.map(s => (
                <div key={s.label}>
                  <div style={{ fontWeight: 800, fontSize: '1.1rem', color: brand.accent }}>{s.value}</div>
                  <div style={{ fontSize: '0.65rem', color: '#444', letterSpacing: '0.08em' }}>{s.label.toUpperCase()}</div>
                </div>
              ))}
            </div>
          )}

          {/* Links */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href={brand.url} target="_blank" rel="noreferrer"
              style={{ fontSize: '0.82rem', color: brand.primary, background: `${brand.primary}15`, border: `1px solid ${brand.primary}30`, borderRadius: '8px', padding: '0.4rem 1rem', textDecoration: 'none', fontWeight: 600 }}>
              🌐 Visit {brand.name} →
            </a>
            {brand.youtube && (
              <a href={brand.youtube} target="_blank" rel="noreferrer"
                style={{ fontSize: '0.82rem', color: '#FF0000', background: '#FF000015', border: '1px solid #FF000030', borderRadius: '8px', padding: '0.4rem 1rem', textDecoration: 'none', fontWeight: 600 }}>
                ▶ YouTube →
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Ads */}
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <div style={{ fontSize: '0.65rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1.25rem' }}>
          {brand.name} Ads — {ads.length} active
        </div>

        {loading ? (
          <div style={{ color: '#333', fontSize: '0.85rem' }}>Loading...</div>
        ) : ads.length === 0 ? (
          <div style={{ background: '#fff', border: `1px dashed ${brand.primary}44`, borderRadius: '14px', padding: '2rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📢</div>
            <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>No active ads yet</div>
            <div style={{ color: '#555', fontSize: '0.85rem' }}>Check back soon — {brand.name} is building their campaign.</div>
          </div>
        ) : (
          ads.map(ad => {
            const tier = TIER_CONFIG[ad.tier] || TIER_CONFIG.entry;
            return (
              <div key={ad.id} style={{
                background: '#fff',
                border: `1px solid ${brand.primary}33`,
                borderLeft: `3px solid ${brand.primary}`,
                borderRadius: '14px',
                padding: '1.25rem 1.5rem',
                marginBottom: '0.75rem',
                position: 'relative',
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: `linear-gradient(90deg, ${brand.primary}, ${brand.accent})`, borderRadius: '14px 14px 0 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', flex: 1, paddingRight: '1rem' }}>{ad.title}</div>
                  <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: tier.color, background: `${tier.color}15`, border: `1px solid ${tier.color}30`, borderRadius: '999px', padding: '0.2rem 0.6rem' }}>{tier.label.toUpperCase()}</span>
                    {(ad.points || 0) > 0 && <span style={{ fontSize: '0.65rem', color: brand.accent, fontWeight: 700 }}>⚡ {ad.points}pts</span>}
                    {(ad.click_count || 0) > 0 && <span style={{ fontSize: '0.65rem', color: '#555' }}>👆 {ad.click_count}</span>}
                  </div>
                </div>
                <div style={{ color: '#666', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: '0.75rem' }}>{ad.description}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <a href={ad.url} target="_blank" rel="noreferrer"
                    style={{ fontSize: '0.78rem', color: brand.primary, textDecoration: 'none', fontWeight: 600 }}>{ad.url} →</a>
                  <button onClick={() => shareAd(ad)}
                    style={{ background: sharedId === ad.id ? `${brand.primary}20` : '#f5f5f5', border: `1px solid ${sharedId === ad.id ? brand.primary + '60' : '#e5e5e5'}`, color: sharedId === ad.id ? brand.primary : '#555', borderRadius: '6px', padding: '0.25rem 0.65rem', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 600 }}>
                    {sharedId === ad.id ? '✓ Copied' : '↗ Share'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '2rem', borderTop: '1px solid #111', fontSize: '0.72rem', color: '#333' }}>
        <button onClick={() => router.push('/dashboard/user')} style={{ background: 'none', border: 'none', color: brand.primary, cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}>← Back to The Arena</button>
        <div style={{ marginTop: '0.5rem' }}>⚡ ANTCPU ADS · Brand Arena · {brand.name}</div>
      </div>
    </div>
  );
}
