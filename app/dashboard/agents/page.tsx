'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Ad = {
  id: string;
  brand: string;
  email: string;
  title: string;
  status: string;
  tier: string;
  created_at: string;
  category?: string;
};

type BrandStats = {
  id: string;
  name: string;
  icon: string;
  color: string;
  desc: string;
  path: string;
  total: number;
  active: number;
  pending: number;
  rejected: number;
  lastAd: string;
};

export default function AgentsPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [brands, setBrands] = useState<BrandStats[]>([]);
  const [recentAds, setRecentAds] = useState<Ad[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      if (u.email !== 'antcpu@gmail.com') { router.push('/dashboard/user'); return; }
    } catch { router.push('/'); return; }
    setHydrated(true);
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    const [{ data: ads }, { data: signups }] = await Promise.all([
      supabase.from('ads').select('*').order('created_at', { ascending: false }),
      supabase.from('ad_signups').select('email, brand_name, promo_code, created_at'),
    ]);

    const allAds: Ad[] = ads || [];
    const allSignups = signups || [];
    setTotalUsers(allSignups.length);
    setRecentAds(allAds.slice(0, 8));

    // Build brand stats
    const BRAND_DEFS = [
      { id: 'antcpu', name: 'ANTCPU', icon: '⚡', color: '#f0883e', desc: 'Automated marketing · Ad network · Agent pipeline', path: '/dashboard/antcpu', emails: ['antcpu@gmail.com'] },
      { id: 'mapofpi', name: 'Map of Pi', icon: '🗺️', color: '#D4AF37', desc: 'Pi Network marketplace · 2.1M users · Real commerce', path: '/dashboard/mapofpi', emails: allSignups.filter((s: any) => s.promo_code === 'MAPOFPI').map((s: any) => s.email) },
    ];

    const brandStats: BrandStats[] = BRAND_DEFS.map(b => {
      const brandAds = allAds.filter(a => b.emails.includes(a.email) || a.brand?.toLowerCase().includes(b.id === 'mapofpi' ? 'map' : 'antcpu'));
      return {
        ...b,
        total: brandAds.length,
        active: brandAds.filter(a => a.status === 'active').length,
        pending: brandAds.filter(a => a.status === 'pending_review').length,
        rejected: brandAds.filter(a => a.status === 'rejected').length,
        lastAd: brandAds[0]?.created_at ? new Date(brandAds[0].created_at).toLocaleDateString() : '—',
      };
    });

    setBrands(brandStats);
    setLoading(false);
  }

  if (!hydrated) return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#333', fontSize: '0.85rem' }}>loading...</div>
    </div>
  );

  return (
    <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <ArenaNav role="admin" userName="Antony Ciccone" userEmail="antcpu@gmail.com" userBrand="ANTCPU" trialStatus="team" />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2.5rem 2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.3rem' }}>🤖 Agent Pipeline</h1>
            <p style={{ color: '#444', fontSize: '0.88rem' }}>Brand identity builds · Worker runs · Live data</p>
          </div>
          <div style={{ textAlign: 'right' as const }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f0883e' }}>{totalUsers}</div>
            <div style={{ fontSize: '0.65rem', color: '#444', letterSpacing: '0.1em' }}>TOTAL USERS</div>
          </div>
        </div>

        {/* Brand Pipeline Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(400px,100%), 1fr))', gap: '1.25rem', marginBottom: '3rem' }}>
          {loading ? (
            [0,1].map(i => (
              <div key={i} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '1.5rem', height: '160px' }} />
            ))
          ) : brands.map(b => (
            <div key={b.id} style={{ background: '#111', border: `1px solid ${b.color}22`, borderRadius: '16px', padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '0.25rem' }}>{b.icon} {b.name}</div>
                  <div style={{ fontSize: '0.75rem', color: '#555' }}>{b.desc}</div>
                </div>
                <span style={{ fontSize: '0.65rem', background: '#1a3a1a', border: '1px solid #2a5a2a', color: '#4caf50', borderRadius: '999px', padding: '0.2rem 0.6rem', whiteSpace: 'nowrap' as const }}>
                  KB active
                </span>
              </div>

              <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.25rem' }}>
                <div>
                  <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>TOTAL ADS</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#fff' }}>{b.total}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>LIVE</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#4caf50' }}>{b.active}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>REVIEW</div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f0c040' }}>{b.pending}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>LAST AD</div>
                  <div style={{ fontSize: '0.82rem', color: '#888' }}>{b.lastAd}</div>
                </div>
              </div>

              <button
                onClick={() => router.push(b.path)}
                style={{ width: '100%', background: `${b.color}15`, border: `1px solid ${b.color}33`, color: b.color, borderRadius: '10px', padding: '0.65rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}
              >
                Open {b.name} Pipeline →
              </button>
            </div>
          ))}
        </div>

        {/* Recent Ads Feed */}
        <div>
          <div style={{ fontSize: '0.7rem', color: '#444', letterSpacing: '0.1em', marginBottom: '1rem' }}>RECENT AD ACTIVITY</div>
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.6rem' }}>
            {loading ? (
              <div style={{ color: '#333', fontSize: '0.82rem' }}>loading...</div>
            ) : recentAds.map(ad => (
              <div key={ad.id} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '0.85rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' as const }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fff' }}>{ad.brand}</span>
                  <span style={{ fontSize: '0.7rem', color: '#555' }}>{ad.title}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.65rem', color: ad.status === 'active' ? '#4caf50' : ad.status === 'pending_review' ? '#f0c040' : '#ff4444', fontWeight: 700, letterSpacing: '0.08em' }}>
                    {ad.status === 'active' ? '🟢 LIVE' : ad.status === 'pending_review' ? '🟡 REVIEW' : '🔴 REJECTED'}
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#333' }}>{new Date(ad.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
