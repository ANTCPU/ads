'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
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
  points?: number; click_count?: number;
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

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
    if (brand) fetchAds();
    else setLoading(false);
  }, [slug]);

  async function fetchAds() {
    setLoading(true);
    const { data } = await supabase
      .from('ads')
      .select('*')
      .ilike('brand', brand.name)
      .eq('status', 'active')
      .order('pinned', { ascending: false })
      .order('points', { ascending: false });
    setAds(data || []);
    setLoading(false);
  }

  function shareAd(ad: Ad) {
    const text = `Check out ${ad.brand} on ANTCPU ADS ⚡\n\n"${ad.title}"\n\n→ ${ad.url}\n\n#antcpuads`;
    navigator.clipboard.writeText(text);
    setSharedId(ad.id);
    setTimeout(() => setSharedId(''), 2000);
  }

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
                  <button
                    onClick={() => shareAd(ad)}
                    style={{ background: sharedId === ad.id ? `${brand.primary}20` : '#f5f5f5', border: `1px solid ${sharedId === ad.id ? brand.primary + '60' : '#e5e5e5'}`, color: sharedId === ad.id ? brand.primary : '#555', borderRadius: '6px', padding: '0.25rem 0.65rem', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {sharedId === ad.id ? '✓ Copied' : '↗ Share'}
                  </button>
                </div>
              </div>
            );
          })
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e5e5' }}>
          <button onClick={() => router.push('/dashboard/user')} style={{ background: 'none', border: 'none', color: brand.primary, cursor: 'pointer', fontWeight: 600, fontSize: '0.78rem' }}>← Back to The Arena</button>
          <div style={{ color: '#ccc', fontSize: '0.72rem', marginTop: '0.5rem' }}>⚡ ANTCPU ADS · Brand Arena · {brand.name}</div>
        </div>
      </div>
    </div>
  );
}
