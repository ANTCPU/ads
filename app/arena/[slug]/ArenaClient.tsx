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

// Single source of truth — slug → brand display name + accent color
// ── BRAND REGISTRY — one entry per real brand ──────────────────
const BRANDS: Record<string, { name: string; primary: string; logo?: string; site?: string }> = {
  antcpu:      { name: 'ANTCPU ADS',        primary: '#f0883e', logo: '/brands/antcpu/adsnetwork.jpg',        site: 'https://antcpu.com' },
  mapofpi:     { name: 'Map of Pi',          primary: '#D4AF37', logo: '/brands/mapofpi/map-of-pi-logo.png',   site: 'https://mapofpi.com' },
  pipioneers:  { name: 'PiPioneersX',        primary: '#7928ca',                                               site: 'https://x.com/PiPioneersX' },
  amanda:      { name: 'Amanda Photography', primary: '#ff0080',                                               site: 'https://antcpu.com/manda/' },
};

// ── SLUG ALIASES — any slug variant → canonical brand key ──────
const SLUG_ALIAS: Record<string, string> = {
  adsnetwork:   'antcpu',
  antcpuads:    'antcpu',
  'ads-network':'antcpu',
  pipioneers:   'pipioneers',
  pipioneersx:  'pipioneers',
  mapofpi:      'mapofpi',
  amanda:       'amanda',
  amandaphoto:  'amanda',
};
const DEFAULT_SLOTS: (string | null)[] = ['region-map', null, null];

export default function ArenaClient() {
  const router = useRouter();
  const params = useParams();
  const slug = (params?.slug as string || '').toLowerCase();
  const brandKey = SLUG_ALIAS[slug] || slug;
const config = BRANDS[brandKey] || { name: slug, primary: '#f0883e' };


  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState({ name: '', email: '', brand: '', trialStatus: 'trial' });
  const [slots, setSlots] = useState<(string | null)[]>(DEFAULT_SLOTS);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
    fetchAds();
  }, [slug]);

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

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '1.5rem 1.25rem' }}>

        <button onClick={() => router.push('/')} style={{ fontSize: '0.75rem', color: '#444', background: 'none', border: 'none', cursor: 'pointer', marginBottom: '1rem' }}>Home</button>

        {config.logo && (
          <img src={config.logo} alt={config.name} style={{ height: '40px', marginBottom: '0.75rem', display: 'block' }} />
        )}

        <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '1.5rem', color: config.primary }}>
          {config.name} Arena
        </h1>

        {/* Ads */}
        {loading ? (
          <div style={{ color: '#333', fontSize: '0.85rem', padding: '2rem 0' }}>Loading ads...</div>
        ) : ads.length === 0 ? (
          <div style={{ color: '#333', fontSize: '0.85rem', padding: '2rem 0', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>📭</div>
            No active ads yet — be the first to advertise in the {config.name} Arena.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
            {ads.map(ad => (
              <div key={ad.id} style={{
                background: '#111',
                border: `1px solid ${ad.pinned ? config.primary + '44' : '#1a1a1a'}`,
                borderLeft: `3px solid ${config.primary}`,
                borderRadius: '12px',
                padding: '1.25rem',
              }}>
                {ad.image_url && (ad.pinned || ad.tier !== 'entry') && (
                  <img src={ad.image_url} alt={ad.title} style={{ width: '100%', borderRadius: '8px', marginBottom: '0.75rem', maxHeight: '180px', objectFit: 'cover' }} />
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ad.title}</div>
                  {ad.pinned && <span style={{ fontSize: '0.65rem', color: config.primary }}>📌 PINNED</span>}
                </div>
                <div style={{ color: '#666', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>{ad.description}</div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <a href={ad.url} target="_blank" rel="noreferrer" style={{ color: config.primary, fontSize: '0.8rem', fontWeight: 600, textDecoration: 'none' }}>
                    View →
                  </a>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: '#444' }}>
                    {(ad.click_count || 0) > 0 && <span>👆 {ad.click_count}</span>}
                    {(ad.points || 0) > 0 && <span>⚡ {ad.points} pts</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Module Slots */}
        <ModuleSlots slots={slots} onSave={saveModules} context={{ slug, user, ads, supabase }} />

        <button onClick={() => router.push('/dashboard/user')} style={{ marginTop: '2rem', background: 'none', border: 'none', color: config.primary, cursor: 'pointer', fontSize: '0.8rem' }}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}
