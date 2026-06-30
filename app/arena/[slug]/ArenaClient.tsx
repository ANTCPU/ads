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
  id: string; brand: string; title: string; url: string;
  description: string; category: string; status: string;
  tier: string; pinned: boolean; email: string;
  points?: number; click_count?: number; share_count?: number; image_url?: string;
};

const BRAND_CONFIG: Record<string, { name: string; primary: string; bg: string; logo: string | null; site: string }> = {
  mapofpi: { name: 'Map of Pi', primary: '#7B2FBE', bg: '#0a0a0a', logo: '/brands/mapofpi/map-of-pi-logo.png', site: 'https://mapofpi.com' },
  antcpu:  { name: 'ANTCPU ADS', primary: '#f0883e', bg: '#0a0a0a', logo: '/brands/antcpu/adsnetwork.jpg', site: 'https://antcpu.com' },
};

const DEFAULT_SLOTS: (string | null)[] = ['region-map', null, null];

export default function ArenaClient() {
  const router = useRouter();
  const params = useParams();
  const slug = (params?.slug as string || '').toLowerCase();
  const brand = slug ? { name: slug, primary: slug === 'adsnetwork' ? '#e91e8c' : '#f0883e', bg: '#0a0a0a', logo: null, site: '#' } : null;

  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ name: '', email: '', brand: '', trialStatus: 'trial' });
  const [slots, setSlots] = useState<(string | null)[]>(DEFAULT_SLOTS);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
    if (brand) fetchAds();
    else setLoading(false);
  }, [slug]);

  // Load saved module slots from Supabase once user is known
  useEffect(() => {
    if (!user.email || !slug) return;
    async function loadModules() {
      const { data } = await supabase
        .from('arena_modules')
        .select('slots')
        .eq('slug', slug)
        .eq('email', user.email)
        .single();
      if (data?.slots) setSlots(data.slots);
    }
    loadModules();
  }, [user.email, slug]);

  async function saveModules(newSlots: (string | null)[]) {
    setSlots(newSlots);
    if (!user.email) return;
    await supabase.from('arena_modules').upsert(
      { slug, email: user.email, slots: newSlots, updated_at: new Date().toISOString() },
      { onConflict: 'slug,email' }
    );
  }

  async function fetchAds() {
    setLoading(true);
    const queryBrand = slug === 'adsnetwork' || slug === 'antcpuads' ? 'ANTCPU ADS' : slug;
    const { data } = await supabase
      .from('ads')
      .select('*')
      .ilike('brand', queryBrand)
      .eq('status', 'active')
      .order('pinned', { ascending: false })
      .order('points', { ascending: false });
    if (data && data.length > 0 && brand) brand.name = data[0].brand;
    setAds(data || []);
    setLoading(false);
  }

  if (!brand) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔍</div>
        <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Brand Arena not found</div>
        <div style={{ color: '#555', fontSize: '0.85rem', marginBottom: '1.5rem' }}>No arena configured for "{slug}"</div>
        <button onClick={() => router.push('/dashboard/user')} style={{ background: '#f0883e', border: 'none', color: '#fff', borderRadius: '8px', padding: '0.7rem 1.5rem', cursor: 'pointer', fontWeight: 600 }}>Back</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: brand.bg, color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav role={user.email === 'antcpu@gmail.com' ? 'admin' : user.trialStatus === 'team' ? 'team' : 'user'} userName={user.name} userEmail={user.email} userBrand={user.brand} trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'} />
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '2rem 1.5rem' }}>
        <button onClick={() => router.push('/')} style={{ fontSize: '0.75rem', color: '#444', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem' }}>Home</button>
        {brand.logo && <img src={brand.logo} alt={brand.name} style={{ width: '48px', height: '48px', borderRadius: '10px', marginBottom: '1rem', display: 'block' }} />}

        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.5rem' }}>{brand.name} Arena</h1>

        {/* Ads */}
        {loading ? (
          <div style={{ color: '#333', fontSize: '0.85rem', padding: '1rem 0' }}>Loading ads...</div>
        ) : ads.length === 0 ? (
          <div style={{ color: '#333', fontSize: '0.85rem', padding: '1rem 0' }}>No active ads yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {ads.map(ad => (
              <div key={ad.id} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
                {ad.image_url && (ad.pinned || ad.tier !== 'entry') && <img src={ad.image_url} alt={ad.title} style={{ width: '100%', borderRadius: '8px', marginBottom: '0.75rem' }} />}
                <div style={{ fontWeight: 700, marginBottom: '0.3rem' }}>{ad.title}</div>
                <div style={{ color: '#666', fontSize: '0.83rem', marginBottom: '0.75rem' }}>{ad.description}</div>
                <a href={ad.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.8rem', color: brand.primary, fontWeight: 600 }}>View →</a>
              </div>
            ))}
          </div>
        )}

        {/* Module Slots — live, persisted, driven by registry */}
        <ModuleSlots
          slots={slots}
          onSave={saveModules}
          context={{ slug, user, ads, supabase }}
        />

        <button onClick={() => router.push('/dashboard/user')} style={{ marginTop: '2rem', background: 'none', border: 'none', color: brand.primary, cursor: 'pointer', fontSize: '0.8rem' }}>
          Back to Dashboard
        </button>
      </div>
      <ArenaFooter />
    </div>
  );
}
