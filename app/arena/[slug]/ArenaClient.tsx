'use client';
import { useRouter, useParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import ArenaNav from '../../components/ArenaNav';
import ArenaFooter from '../../components/ArenaFooter';
import ModuleSlots from '../../components/ModuleSlots';

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
  email: string;
  points?: number;
  click_count?: number;
  share_count?: number;
  image_url?: string;
};

const BRAND_CONFIG: Record<string, any> = {
  mapofpi: {
    name: 'Map of Pi',
    primary: '#7B2FBE',
    bg: '#0a0a0a',
    logo: '/brands/mapofpi/map-of-pi-logo.png',
    site: 'https://mapofpi.com',
  },
  antcpu: {
    name: 'ANTCPU ADS',
    primary: '#f0883e',
    bg: '#0a0a0a',
    logo: '/brands/antcpu/adsnetwork.jpg',
    site: 'https://antcpu.com',
  },
};

export default function ArenaClient() {
  const router = useRouter();
  const params = useParams();
  const slug = (params?.slug as string || '').toLowerCase();
  const brand = BRAND_CONFIG[slug];

  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>({ name: '', email: '', brand: '', trialStatus: 'trial' });

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
      .eq('brand', brand.name)
      .eq('status', 'active')
      .order('pinned', { ascending: false })
      .order('points', { ascending: false });
    setAds(data || []);
    setLoading(false);
  }

  const isAdmin = user.email === 'antcpu@gmail.com';
  const isTeam = user.trialStatus === 'team';

  if (!brand) {
    return (
      <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
        <div style={{ fontSize: '2rem' }}>\U0001F50D</div>
        <div style={{ fontWeight: 700, color: '#fff' }}>Brand Arena not found</div>
        <div style={{ color: '#555', fontSize: '0.85rem' }}>No arena configured for &quot;{slug}&quot;</div>
        <button onClick={() => router.push('/dashboard/user')} style={{ background: '#f0883e', border: 'none', color: '#fff', borderRadius: '8px', padding: '0.7rem 1.5rem', cursor: 'pointer', fontWeight: 600 }}>Back</button>
      </div>
    );
  }

  return (
    <div style={{ background: brand.bg || '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav role={isAdmin ? 'admin' : isTeam ? 'team' : 'user'} userName={user.name} userEmail={user.email} userBrand={user.brand} trialStatus={user.trialStatus} />
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        <div style={{ marginBottom: '2rem' }}>
          <button onClick={() => router.push('/')} style={{ fontSize: '0.75rem', color: '#444', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem' }}>Home</button>
          {brand.logo && <img src={brand.logo} alt={brand.name} style={{ height: '72px', marginBottom: '1rem', display: 'block', borderRadius: '10px' }} />}
          <h1 style={{ color: brand.primary, fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>{brand.name} Arena</h1>
        </div>

        {loading ? (
          <div style={{ color: '#555', textAlign: 'center', padding: '3rem' }}>Loading ads...</div>
        ) : ads.length === 0 ? (
          <div style={{ color: '#555', textAlign: 'center', padding: '3rem' }}>No active ads yet.</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {ads.map(ad => (
              <div key={ad.id} style={{ background: '#111', border: '1px solid #222', borderRadius: '12px', padding: '1rem' }}>
                {ad.image_url && <img src={ad.image_url} alt={ad.title} style={{ width: '100%', borderRadius: '8px', marginBottom: '0.75rem' }} />}
                <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{ad.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '0.75rem' }}>{ad.description}</div>
                <a href={ad.url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: brand.primary, color: '#fff', borderRadius: '6px', padding: '0.4rem 0.9rem', fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>View</a>
              </div>
            ))}
          </div>
        )}

        <ModuleSlots slug={slug} />

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button onClick={() => router.push('/dashboard/user')} style={{ background: 'none', border: 'none', color: brand.primary, cursor: 'pointer', fontSize: '0.8rem' }}>Back to Dashboard</button>
        </div>

      </div>
      <ArenaFooter brand={brand.name} accent={brand.primary} />
    </div>
  );
}
