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
  facebook?: string; antcoin_wallet?: string;
};

type Ad = {
  id: string; title: string; url: string;
  description: string; category: string;
  status: string; tier: string; pinned: boolean; created_at: string;
};

const TABS = ['About', 'Ads', 'Performance', 'Upgrade', 'Connect'];

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams();
  const id = decodeURIComponent(params.id as string);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileCopied, setProfileCopied] = useState(false);
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwn, setIsOwn] = useState(false);
  const [activeTab, setActiveTab] = useState('About');
  const [previewAd, setPreviewAd] = useState<Ad | null>(null);

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

  function shareProfile() {
    if (!profile) return;
    const url = `https://antcpu-ads.vercel.app/profile/${encodeURIComponent(profile.email)}`;
    const text = `Check out ${profile.brand} on ANTCPU ADS ⚡\n\n${profile.bio || ''}\n\n→ ${url}\n\n#antcpuads #marketing #ads`;
    navigator.clipboard.writeText(text).then(() => {
      setProfileCopied(true);
      setTimeout(() => setProfileCopied(false), 2500);
    });
  }

  async function fetchProfile() {
    setLoading(true);
    let { data: prof } = await supabase.from('ad_profiles').select('*').eq('email', id).single();
    if (!prof) {
      const { data: all } = await supabase.from('ad_profiles').select('*');
      prof = all?.find(p => p.brand?.toLowerCase().replace(/\s+/g, '-') === id) || null;
    }
    if (prof) {
      setProfile(prof);
      const { data: userAds } = await supabase.from('ads').select('*').eq('email', prof.email).order('created_at', { ascending: false });
      const loaded = userAds || [];
      setAds(loaded);
      if (loaded.length > 0) setPreviewAd(loaded[0]);
    }
    setLoading(false);
  }

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
      <button onClick={() => router.push('/dashboard/user')} style={{ background: 'none', border: '1px solid #333', color: '#888', borderRadius: '8px', padding: '0.6rem 1.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
        ← Back to Arena
      </button>
    </div>
  );

  const topTier = ads.length > 0 ? (TIER_CONFIG[ads[0].tier] || TIER_CONFIG.entry) : TIER_CONFIG.entry;
  const tier = previewAd ? (TIER_CONFIG[previewAd.tier] || TIER_CONFIG.entry) : topTier;

  return (
    <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2rem', borderBottom: '1px solid #1a1a1a' }}>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em', cursor: 'pointer' }} onClick={() => router.push('/dashboard/user')}>⚡ ANTCPU ADS</span>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {isOwn && (
            <button onClick={() => router.push('/create-ad')} style={{ background: topTier.color, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.5rem 1.2rem', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600 }}>
              + New Ad
            </button>
          )}
          <button onClick={() => router.push('/dashboard/user')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.85rem' }}>
            ← Arena
          </button>
        </div>
      </nav>

      {/* Side by side layout */}
      <div style={{ display: 'flex', gap: '2rem', padding: '2rem', maxWidth: '1100px', margin: '0 auto', alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* LEFT — Ad Preview Panel */}
        <div style={{ width: '320px', flexShrink: 0 }}>
          <div style={{ fontSize: '0.65rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Ad Preview</div>
          <div onClick={() => window.location.href='/dashboard/user'} style={{ background: '#111', border: `1px solid ${tier.color}33`, borderRadius: '14px', padding: '1.5rem', position: 'relative', minHeight: '200px', cursor: 'pointer' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '2px', background: tier.color, borderRadius: '14px 14px 0 0' }} />
            {previewAd ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{profile.brand}</div>
                  <span style={{ fontSize: '0.6rem', fontWeight: 700, color: tier.color, background: `${tier.color}15`, border: `1px solid ${tier.color}30`, borderRadius: '999px', padding: '0.2rem 0.5rem' }}>{tier.label.toUpperCase()}</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.5rem' }}>{previewAd.title}</div>
                <div style={{ color: '#666', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: '0.75rem' }}>{previewAd.description}</div>
                <a href={previewAd.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: '0.78rem', color: tier.color, textDecoration: 'none', fontWeight: 600 }}>{previewAd.url} →</a>
                <div style={{ position: 'absolute', bottom: '0.75rem', right: '1rem', fontSize: '0.6rem', color: '#2a2a2a' }}>by {profile.brand} →</div>
              </>
            ) : (
              <div style={{ color: '#333', fontSize: '0.85rem', paddingTop: '1rem' }}>No ads yet.</div>
            )}
          </div>

          {/* Brand identity below preview */}
          <div style={{ marginTop: '1.25rem', background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{profile.brand || profile.name}</div>
              <button onClick={shareProfile} style={{ background: profileCopied ? '#3fb95022' : '#1a1a1a', border: profileCopied ? '1px solid #3fb95044' : '1px solid #222', color: profileCopied ? '#3fb950' : '#555', borderRadius: '6px', padding: '0.25rem 0.65rem', fontSize: '0.68rem', cursor: 'pointer', fontWeight: 600 }}>
                {profileCopied ? '✓ Copied' : '↗ Share'}
              </button>
            </div>
            <div style={{ color: '#555', fontSize: '0.78rem', marginBottom: '0.75rem' }}>{profile.name}</div>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: topTier.color, background: `${topTier.color}15`, border: `1px solid ${topTier.color}30`, borderRadius: '999px', padding: '0.25rem 0.75rem', display: 'inline-block' }}>{topTier.label.toUpperCase()} · {ads.length} AD{ads.length !== 1 ? 'S' : ''}</div>
          </div>
        </div>

        {/* RIGHT — Tab Navigation Panel */}
        <div style={{ flex: 1, minWidth: '280px' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' as const }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ background: activeTab === tab ? topTier.color : '#111', border: activeTab === tab ? 'none' : '1px solid #1a1a1a', color: activeTab === tab ? '#fff' : '#555', borderRadius: '8px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                {tab}
              </button>
            ))}
          </div>

          {/* About */}
          {activeTab === 'About' && (
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.65rem', color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '1rem' }}>About</div>
              {profile.bio
                ? <p style={{ color: '#888', fontSize: '0.9rem', lineHeight: 1.7, borderLeft: `2px solid ${topTier.color}44`, paddingLeft: '1rem', marginBottom: '1.25rem' }}>{profile.bio}</p>
                : <p style={{ color: '#333', fontSize: '0.85rem', marginBottom: '1.25rem' }}>No bio yet.</p>
              }
              {profile.website && (
                <a href={profile.website.startsWith('http') ? profile.website : 'https://' + profile.website} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', color: topTier.color, textDecoration: 'none', fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                  🌐 {profile.website.replace(/https?:\/\//, '')}
                </a>
              )}
              {profile.contact && <div style={{ fontSize: '0.82rem', color: '#555' }}>📬 {profile.contact}</div>}
            </div>
          )}

          {/* Ads */}
          {activeTab === 'Ads' && (
            <div>
              <div style={{ fontSize: '0.65rem', color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '1rem' }}>{ads.length} Ad{ads.length !== 1 ? 's' : ''} in the Arena</div>
              {ads.length === 0
                ? <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '2rem', textAlign: 'center' as const, color: '#333' }}>No ads yet.</div>
                : ads.map(ad => {
                    const t = TIER_CONFIG[ad.tier] || TIER_CONFIG.entry;
                    return (
                      <div key={ad.id} onClick={() => setPreviewAd(ad)} style={{ background: previewAd?.id === ad.id ? '#1a1a1a' : '#111', border: `1px solid ${previewAd?.id === ad.id ? t.color + '55' : '#1a1a1a'}`, borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '0.75rem', cursor: 'pointer', position: 'relative' as const }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{ad.title}</div>
                          <span style={{ fontSize: '0.6rem', color: t.color, background: `${t.color}15`, border: `1px solid ${t.color}30`, borderRadius: '999px', padding: '0.15rem 0.5rem' }}>{t.label.toUpperCase()}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#555' }}>{ad.category} · {ad.status === 'active' ? '🟢 Live' : '🟡 Review'}</div>
                      </div>
                    );
                  })
              }
            </div>
          )}

          {/* Performance — placeholder */}
          {activeTab === 'Performance' && (
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.65rem', color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '1rem' }}>Performance</div>
              <div style={{ color: '#333', fontSize: '0.85rem' }}>Click tracking coming soon — antcoin rewards will appear here.</div>
            </div>
          )}

          {/* Upgrade — placeholder */}
          {activeTab === 'Upgrade' && (
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.65rem', color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '1rem' }}>Upgrade Path</div>
              {[
                { tier: 'Entry',    desc: 'Text ad · standard rotation',           color: '#0070f3', active: true },
                { tier: 'Rising',   desc: 'Custom image · Photography API',         color: '#7928ca', active: false },
                { tier: 'Featured', desc: 'Video ad · ANTCPU AI',                   color: '#ff0080', active: false },
                { tier: 'Top Tier', desc: '🔒 Payment required · full campaign',    color: '#f0883e', active: false },
              ].map(t => (
                <div key={t.tier} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid #1a1a1a', opacity: t.active ? 1 : 0.4 }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.8rem', color: t.color }}>{t.tier}</span>
                    <span style={{ fontSize: '0.72rem', color: '#555', marginLeft: '0.5rem' }}>{t.desc}</span>
                  </div>
                  {t.active ? <span style={{ fontSize: '0.65rem', color: t.color, fontWeight: 700 }}>ACTIVE</span> : <span style={{ fontSize: '0.65rem', color: '#333' }}>soon</span>}
                </div>
              ))}
            </div>
          )}

          {/* Connect */}
          {activeTab === 'Connect' && (
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.5rem' }}>
              <div style={{ fontSize: '0.65rem', color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '1.25rem' }}>Connect</div>

              {/* Social links */}
              {[
                { key: 'facebook',  icon: '📘', label: 'Facebook', color: '#4267B2' },
                { key: 'twitter',   icon: '🐦', label: 'X / Twitter', color: '#1DA1F2' },
                { key: 'tiktok',    icon: '🎵', label: 'TikTok', color: '#ff0050' },
                { key: 'youtube',   icon: '▶️', label: 'YouTube', color: '#FF0000' },
                { key: 'website',   icon: '🌐', label: 'Website', color: '#0070f3' },
              ].map(({ key, icon, label, color }) => (
                (profile as any)[key]
                  ? <a key={key} href={(profile as any)[key]} target="_blank" rel="noreferrer"
                      style={{ fontSize: '0.85rem', color, textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      {icon} {label} →
                    </a>
                  : <div key={key} style={{ color: '#2a2a2a', fontSize: '0.82rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {icon} {label} — not linked
                    </div>
              ))}

              {/* Antcoin wallet */}
              <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #1a1a1a' }}>
                {profile.antcoin_wallet
                  ? <div
                      onClick={() => navigator.clipboard.writeText(profile.antcoin_wallet)}
                      style={{ fontSize: '0.82rem', color: '#D4AF37', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      title="Click to copy">
                      ⚡ {profile.antcoin_wallet.slice(0,6)}...{profile.antcoin_wallet.slice(-4)} <span style={{ fontSize: '0.65rem', color: '#555' }}>copy</span>
                    </div>
                  : <div style={{ color: '#2a2a2a', fontSize: '0.82rem' }}>⚡ antcoin wallet — not linked</div>
                }
              </div>

              {/* Discord */}
              <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #1a1a1a' }}>
                <a href="https://discord.gg/antcpu" target="_blank" rel="noreferrer"
                  style={{ fontSize: '0.82rem', color: '#5865F2', textDecoration: 'none', fontWeight: 600 }}>
                  💬 Join the Discord →
                </a>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
