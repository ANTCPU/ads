'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const TIER_CONFIG: Record<string, { color: string; label: string; icon: string }> = {
  entry:    { color: '#0070f3', label: 'Entry',    icon: '📝' },
  rising:   { color: '#7928ca', label: 'Rising',   icon: '🖼' },
  featured: { color: '#ff0080', label: 'Featured', icon: '🎬' },
  toptier:  { color: '#f0883e', label: 'Top Tier', icon: '☁️' },
};

type Profile = {
  email: string; name: string; brand: string;
  bio: string; website: string; contact: string;
};

type Ad = {
  id: string; title: string; url: string;
  description: string; category: string;
  status: string; tier: string; pinned: boolean; created_at: string;
};

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const id = decodeURIComponent(params.id as string);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwn, setIsOwn] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setIsOwn(u.email === id || u.brand?.toLowerCase().replace(/\s+/g,'-') === id);
      } catch {}
    }
    fetchProfile();
  }, [id]);

  async function fetchProfile() {
    setLoading(true);
    // try by email first, then by brand slug
    let { data: prof } = await supabase
      .from('ad_profiles')
      .select('*')
      .eq('email', id)
      .single();

    if (!prof) {
      const { data: all } = await supabase.from('ad_profiles').select('*');
      prof = all?.find(p =>
        p.brand?.toLowerCase().replace(/\s+/g, '-') === id
      ) || null;
    }

    if (prof) {
      setProfile(prof);
      const { data: userAds } = await supabase
        .from('ads')
        .select('*')
        .eq('email', prof.email)
        .order('created_at', { ascending: false });
      setAds(userAds || []);
    }
    setLoading(false);
  }

  const btnColor = '#0070f3';

  if (loading) return (
    <div style={{ background: '#0a0a0a', color: '#333', fontFamily: 'system-ui', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      Loading profile...
    </div>
  );

  if (!profile) return (
    <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <div style={{ fontSize: '2rem' }}>👤</div>
      <div style={{ fontWeight: 700 }}>Profile not found</div>
      <div style={{ color: '#555', fontSize: '0.85rem' }}>This advertiser hasn't set up their profile yet.</div>
      <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: '1px solid #333', color: '#888', borderRadius: '8px', padding: '0.6rem 1.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
        ← Back to Arena
      </button>
    </div>
  );

  const topTier = ads.length > 0
    ? (TIER_CONFIG[ads[0].tier] || TIER_CONFIG.entry)
    : TIER_CONFIG.entry;

  return (
    <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2rem', borderBottom: '1px solid #1a1a1a' }}>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em', cursor: 'pointer' }} onClick={() => router.push('/dashboard')}>⚡ ANTCPU ADS</span>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isOwn && (
            <button onClick={() => router.push('/create-ad')} style={{ background: btnColor, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.5rem 1.2rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
              + New Ad
            </button>
          )}
          <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.85rem' }}>
            ← Arena
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '3rem 2rem' }}>

        {/* Profile card */}
        <div style={{ background: '#111', border: `1px solid ${topTier.color}33`, borderRadius: '16px', overflow: 'hidden', marginBottom: '2rem' }}>
          <div style={{ height: '3px', background: `linear-gradient(90deg, ${topTier.color}, ${topTier.color}44)` }} />
          <div style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: `${topTier.color}20`, border: `2px solid ${topTier.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
                  {topTier.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '1.3rem' }}>{profile.brand || profile.name}</div>
                  <div style={{ color: '#555', fontSize: '0.82rem', marginTop: '0.2rem' }}>{profile.name}</div>
                </div>
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: topTier.color, background: `${topTier.color}15`, border: `1px solid ${topTier.color}30`, borderRadius: '999px', padding: '0.3rem 0.85rem' }}>
                {topTier.label.toUpperCase()}
              </div>
            </div>

            {profile.bio && (
              <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1.25rem', borderLeft: `2px solid ${topTier.color}44`, paddingLeft: '1rem' }}>
                {profile.bio}
              </p>
            )}

            <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' as const }}>
              {profile.website && (
                <a href={profile.website.startsWith('http') ? profile.website : 'https://' + profile.website}
                  target="_blank" rel="noreferrer"
                  style={{ fontSize: '0.82rem', color: topTier.color, textDecoration: 'none', fontWeight: 600 }}>
                  🌐 {profile.website.replace(/https?:\/\//, '')}
                </a>
              )}
              {profile.contact && (
                <span style={{ fontSize: '0.82rem', color: '#555' }}>
                  📬 {profile.contact}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Ads */}
        <div style={{ fontSize: '0.7rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: '1rem' }}>
          {ads.length} Ad{ads.length !== 1 ? 's' : ''} in the Arena
        </div>

        {ads.length === 0 ? (
          <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '2rem', textAlign: 'center' as const, color: '#333' }}>
            {isOwn ? (
              <>
                <div style={{ marginBottom: '0.75rem' }}>No ads yet.</div>
                <button onClick={() => router.push('/create-ad')}
                  style={{ background: btnColor, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.65rem 1.5rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
                  Create Your First Ad →
                </button>
              </>
            ) : (
              <div>No ads yet from this advertiser.</div>
            )}
          </div>
        ) : (
          ads.map(ad => {
            const tier = TIER_CONFIG[ad.tier] || TIER_CONFIG.entry;
            return (
              <div key={ad.id} style={{ background: '#111', border: `1px solid ${tier.color}22`, borderRadius: '14px', padding: '1.5rem', marginBottom: '1rem', position: 'relative' as const }}>
                <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: '2px', background: tier.color, borderRadius: '14px 14px 0 0' }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 800, fontSize: '1rem', flex: 1, paddingRight: '1rem' }}>{ad.title}</div>
                  <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: tier.color, background: `${tier.color}15`, border: `1px solid ${tier.color}30`, borderRadius: '999px', padding: '0.2rem 0.6rem' }}>
                      {tier.label.toUpperCase()}
                    </span>
                    <span style={{ fontSize: '0.65rem', fontWeight: 700, color: ad.status === 'active' ? '#3fb950' : '#d29922', letterSpacing: '0.08em' }}>
                      {ad.status === 'active' ? '🟢 LIVE' : '🟡 REVIEW'}
                    </span>
                  </div>
                </div>

                <div style={{ color: '#666', fontSize: '0.83rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>{ad.description}</div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <a href={ad.url} target="_blank" rel="noreferrer"
                    style={{ fontSize: '0.78rem', color: tier.color, textDecoration: 'none', fontWeight: 600 }}>
                    {ad.url} →
                  </a>
                  <span style={{ fontSize: '0.7rem', color: '#333' }}>
                    {new Date(ad.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* Upgrade path */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.5rem', marginTop: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '1rem' }}>Upgrade Path</div>
          {[
            { tier: 'Entry',    desc: 'Text ad · standard rotation',          color: '#0070f3', active: true },
            { tier: 'Rising',   desc: 'Custom image · powered by Photography API', color: '#7928ca', active: false },
            { tier: 'Featured', desc: 'Video ad · powered by ANTCPU AI',      color: '#ff0080', active: false },
            { tier: 'Top Tier', desc: 'antcpu.com/cloud · full campaign',      color: '#f0883e', active: false },
          ].map(t => (
            <div key={t.tier} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid #1a1a1a', opacity: t.active ? 1 : 0.4 }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.color, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontWeight: 700, fontSize: '0.8rem', color: t.color }}>{t.tier}</span>
                <span style={{ fontSize: '0.72rem', color: '#555', marginLeft: '0.5rem' }}>{t.desc}</span>
              </div>
              {t.active
                ? <span style={{ fontSize: '0.65rem', color: t.color, fontWeight: 700 }}>ACTIVE</span>
                : <span style={{ fontSize: '0.65rem', color: '#333' }}>soon</span>
              }
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
