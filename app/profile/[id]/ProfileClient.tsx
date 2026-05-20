'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1495909060170616884/5RthXmjPurDkhjpXkM_iQGa11-Gl-WnjGeRp-gq79piX5od5frIPqT1L-tGb-t-W06e7';

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

export default function ProfileClient() {
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
        setIsOwn(u.email === id || u.brand?.toLowerCase().replace(/\s+/g, '-') === id);
      } catch {}
    }
    fetchProfile();
  }, [id]);

  async function shareProfile() {
    if (!profile) return;
    const url = `https://antcpu-ads.vercel.app/profile/${encodeURIComponent(profile.email)}`;
    const text = `Check out ${profile.brand} on ANTCPU ADS ⚡\n\n${profile.bio || ''}\n\n→ ${url}\n\n#antcpuads #marketing #ads`;

    // Fire Discord notification
    fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🔗 **Profile Shared** — ${profile.brand}\n**Profile:** ${url}\n**Email:** ${profile.email}`,
      }),
    }).catch(() => {});

    // Native share on mobile, clipboard fallback on desktop
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `${profile.brand} — ANTCPU ADS`, text, url });
        setProfileCopied(true);
        setTimeout(() => setProfileCopied(false), 2500);
        return;
      } catch {}
    }
    // Clipboard fallback
    navigator.clipboard.writeText(text).then(() => {
      setProfileCopied(true);
      setTimeout(() => setProfileCopied(false), 2500);
    });
  }

  async function fetchProfile() {
    setLoading(true);
    let { data: prof } = await supabase
      .from('ad_profiles').select('*').eq('email', id).single();
    if (!prof) {
      const { data: all } = await supabase.from('ad_profiles').select('*');
      prof = all?.find((p: any) => p.brand?.toLowerCase().replace(/\s+/g, '-') === id) || null;
    }
    if (prof) {
      setProfile(prof);
      const { data: userAds } = await supabase
        .from('ads').select('*').eq('email', prof.email)
        .order('created_at', { ascending: false });
      const loaded = userAds || [];
      setAds(loaded);
      if (loaded.length > 0) setPreviewAd(loaded[0]);
    }
    setLoading(false);
  }

  if (loading) return (
    <div style={{ background: '#fff', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ color: '#888', fontSize: '0.9rem' }}>Loading profile...</div>
    </div>
  );

  if (!profile) return (
    <div style={{ background: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', gap: '1rem' }}>
      <div style={{ fontSize: '2rem' }}>👤</div>
      <div style={{ fontWeight: 700, color: '#0a0a0a' }}>Profile not found</div>
      <div style={{ color: '#888', fontSize: '0.85rem' }}>This advertiser hasn't set up their profile yet.</div>
      <button onClick={() => router.push('/dashboard/user')} style={{ background: 'none', border: '1px solid #333', color: '#888', borderRadius: '8px', padding: '0.6rem 1.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
        ← Back to Arena
      </button>
    </div>
  );

  const topTier = ads.length > 0 ? (TIER_CONFIG[ads[0].tier] || TIER_CONFIG.entry) : TIER_CONFIG.entry;
  const tier = previewAd ? (TIER_CONFIG[previewAd.tier] || TIER_CONFIG.entry) : topTier;

  return (
    <div style={{ background: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #f0f0f0' }}>
        <span onClick={() => router.push('/')} style={{ fontWeight: 800, fontSize: '1rem', color: '#f0883e', cursor: 'pointer', letterSpacing: '0.05em' }}>⚡ ANTCPU ADS</span>
        {isOwn && (
          <button onClick={() => router.push('/profile')} style={{ background: 'none', border: '1px solid #e5e5e5', color: '#555', borderRadius: '8px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.8rem' }}>
            Edit Profile
          </button>
        )}
      </nav>

      {/* Side by side layout */}
      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.25rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

        {/* LEFT — Ad Preview Panel */}
        <div>
          <div style={{ fontSize: '0.7rem', color: '#aaa', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Ad Preview</div>

          <div
            onClick={() => window.location.href = '/dashboard/user'}
            style={{ background: '#111', border: `1px solid ${tier.color}33`, borderRadius: '14px', padding: '1.5rem', position: 'relative', minHeight: '200px', cursor: 'pointer' }}
          >
            {previewAd ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: tier.color }}>{profile.brand}</span>
                  <span style={{ fontSize: '0.62rem', background: `${tier.color}20`, color: tier.color, borderRadius: '999px', padding: '0.15rem 0.5rem', fontWeight: 700 }}>{tier.label.toUpperCase()}</span>
                </div>
                <div style={{ fontWeight: 700, color: '#fff', fontSize: '1rem', marginBottom: '0.5rem' }}>{previewAd.title}</div>
                <div style={{ color: '#888', fontSize: '0.82rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>{previewAd.description}</div>
                <a href={previewAd.url} onClick={e => e.stopPropagation()} style={{ fontSize: '0.78rem', color: tier.color, textDecoration: 'none', fontWeight: 600 }}>{previewAd.url} →</a>
                <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: '#555' }}>by {profile.brand} →</div>
              </>
            ) : (
              <div style={{ color: '#555', fontSize: '0.85rem' }}>No ads yet.</div>
            )}
          </div>

          {/* Brand identity below preview */}
          <div style={{ marginTop: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0a0a0a' }}>{profile.brand || profile.name}</div>
            <button
              onClick={shareProfile}
              style={{ background: profileCopied ? '#22c55e' : topTier.color, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, transition: 'background 0.2s' }}
            >
              {profileCopied ? '✓ Shared' : '↗ Share'}
            </button>
          </div>
          <div style={{ fontSize: '0.82rem', color: '#888', marginTop: '0.25rem' }}>{profile.name}</div>
          <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: '0.1rem' }}>
            {topTier.label.toUpperCase()} · {ads.length} AD{ads.length !== 1 ? 'S' : ''}
          </div>
        </div>

        {/* RIGHT — Tab Navigation Panel */}
        <div>
          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{ background: activeTab === tab ? topTier.color : '#111', border: activeTab === tab ? 'none' : '1px solid #1a1a1a', color: activeTab === tab ? '#fff' : '#555', borderRadius: '8px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* About */}
          {activeTab === 'About' && (
            <div>
              <div style={{ fontSize: '0.75rem', color: '#aaa', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>About</div>
              {profile.bio
                ? <div style={{ color: '#0a0a0a', fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>{profile.bio}</div>
                : <div style={{ color: '#aaa', fontSize: '0.85rem', marginBottom: '1rem' }}>No bio yet.</div>
              }
              {profile.website && (
                <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" style={{ display: 'block', color: topTier.color, fontSize: '0.85rem', marginBottom: '0.5rem', textDecoration: 'none' }}>
                  🌐 {profile.website.replace(/https?:\/\//, '')}
                </a>
              )}
              {profile.contact && <div style={{ fontSize: '0.82rem', color: '#555' }}>📬 {profile.contact}</div>}
            </div>
          )}

          {/* Ads */}
          {activeTab === 'Ads' && (
            <div>
              <div style={{ fontSize: '0.75rem', color: '#aaa', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>{ads.length} Ad{ads.length !== 1 ? 's' : ''} in the Arena</div>
              {ads.length === 0
                ? <div style={{ color: '#aaa', fontSize: '0.85rem' }}>No ads yet.</div>
                : ads.map(ad => {
                    const t = TIER_CONFIG[ad.tier] || TIER_CONFIG.entry;
                    return (
                      <div
                        key={ad.id}
                        onClick={() => setPreviewAd(ad)}
                        style={{ background: previewAd?.id === ad.id ? '#1a1a1a' : '#f9f9f9', border: `1px solid ${previewAd?.id === ad.id ? t.color + '55' : '#e5e5e5'}`, borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '0.75rem', cursor: 'pointer' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.88rem', color: previewAd?.id === ad.id ? '#fff' : '#0a0a0a' }}>{ad.title}</span>
                          <span style={{ fontSize: '0.62rem', background: `${t.color}20`, color: t.color, borderRadius: '999px', padding: '0.15rem 0.5rem', fontWeight: 700 }}>{t.label.toUpperCase()}</span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#888' }}>{ad.category} · {ad.status === 'active' ? '🟢 Live' : '🟡 Review'}</div>
                      </div>
                    );
                  })
              }
            </div>
          )}

          {/* Performance */}
          {activeTab === 'Performance' && (
            <div>
              <div style={{ fontSize: '0.75rem', color: '#aaa', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Performance</div>
              <div style={{ color: '#888', fontSize: '0.85rem' }}>Click tracking coming soon — antcoin rewards will appear here.</div>
            </div>
          )}

          {/* Upgrade */}
          {activeTab === 'Upgrade' && (
            <div>
              <div style={{ fontSize: '0.75rem', color: '#aaa', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Upgrade Path</div>
              {[
                { tier: 'Entry',    desc: 'Text ad · standard rotation',      color: '#0070f3', active: true },
                { tier: 'Rising',   desc: 'Custom image · Photography API',    color: '#7928ca', active: false },
                { tier: 'Featured', desc: 'Video ad · ANTCPU AI',              color: '#ff0080', active: false },
                { tier: 'Top Tier', desc: '🔒 Payment required · full campaign', color: '#f0883e', active: false },
              ].map(t => (
                <div key={t.tier} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f9f9f9', border: `1px solid #e5e5e5`, borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '0.5rem' }}>
                  <div>
                    <span style={{ fontWeight: 700, color: t.color, fontSize: '0.88rem' }}>{t.tier}</span>
                    <span style={{ color: '#888', fontSize: '0.8rem', marginLeft: '0.5rem' }}>{t.desc}</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: t.active ? '#22c55e' : '#aaa' }}>{t.active ? 'ACTIVE' : 'soon'}</span>
                </div>
              ))}
            </div>
          )}

          {/* Connect */}
          {activeTab === 'Connect' && (
            <div>
              <div style={{ fontSize: '0.75rem', color: '#aaa', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Connect</div>
              {[
                { key: 'facebook', icon: '📘', label: 'Facebook',   color: '#4267B2' },
                { key: 'twitter',  icon: '🐦', label: 'X / Twitter', color: '#1DA1F2' },
                { key: 'tiktok',   icon: '🎵', label: 'TikTok',     color: '#ff0050' },
                { key: 'youtube',  icon: '▶️', label: 'YouTube',    color: '#FF0000' },
                { key: 'website',  icon: '🌐', label: 'Website',    color: '#0070f3' },
              ].map(({ key, icon, label, color }) => (
                (profile as any)[key]
                  ? <a key={key} href={(profile as any)[key]} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color, fontSize: '0.85rem', marginBottom: '0.5rem', textDecoration: 'none', fontWeight: 600 }}>{icon} {label} →</a>
                  : <div key={key} style={{ fontSize: '0.82rem', color: '#ccc', marginBottom: '0.4rem' }}>{icon} {label} — not linked</div>
              ))}

              {profile.antcoin_wallet && (
                <div
                  onClick={() => navigator.clipboard.writeText(profile.antcoin_wallet!)}
                  style={{ fontSize: '0.82rem', color: '#D4AF37', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}
                  title="Click to copy"
                >
                  ⚡ {profile.antcoin_wallet.slice(0,6)}...{profile.antcoin_wallet.slice(-4)} copy
                </div>
              )}

              <a href="https://discord.gg/antcpu" target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: '1rem', color: '#5865F2', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
                💬 Join the Discord →
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
