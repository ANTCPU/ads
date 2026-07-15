'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { notifyDiscord } from '../../lib/discord';
import { tokens } from '../../lib/shopAdStyles';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Profile = {
  email: string; name: string; brand: string;
  bio: string; website: string; contact: string;
  twitter?: string; instagram?: string; facebook?: string;
  tiktok?: string; youtube?: string; linkedin?: string;
  discord?: string; telegram?: string; antcoin_wallet?: string;
};

type Ad = {
  id: string; title: string; url: string; description: string;
  category: string; status: string; tier: string;
  pinned: boolean; created_at: string;
  click_count?: number; share_count?: number; points?: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<string, { color: string; label: string }> = {
  entry:    { color: '#0070f3', label: 'Entry' },
  rising:   { color: '#7928ca', label: 'Rising' },
  featured: { color: '#ff0080', label: 'Featured' },
  toptier:  { color: '#f0883e', label: 'Top Tier' },
};

const TABS = ['About', 'Ads', 'Performance', 'Upgrade', 'Connect'] as const;
type Tab = typeof TABS[number];

const SOCIAL_DOMAINS: Record<string, string> = {
  website: '', twitter: 'x.com', instagram: 'instagram.com',
  facebook: 'facebook.com', tiktok: 'tiktok.com', youtube: 'youtube.com',
  linkedin: 'linkedin.com', discord: 'discord.com', telegram: 'telegram.org',
  antcoin_wallet: 'antcpu-ads.vercel.app',
};

const CONNECT_SOCIALS: { key: keyof Profile; label: string }[] = [
  { key: 'website',   label: 'Website' },
  { key: 'twitter',   label: 'Twitter / X' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook',  label: 'Facebook' },
  { key: 'tiktok',    label: 'TikTok' },
  { key: 'youtube',   label: 'YouTube' },
  { key: 'linkedin',  label: 'LinkedIn' },
  { key: 'discord',   label: 'Discord' },
  { key: 'telegram',  label: 'Telegram' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FavIcon({ url, socialKey }: { url: string; socialKey: string }) {
  const domain = socialKey === 'website'
    ? (() => { try { return new URL(url).hostname; } catch { return 'globe'; } })()
    : SOCIAL_DOMAINS[socialKey];
  return <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} width={16} height={16} style={{ borderRadius: 3 }} alt="" />;
}

const ARENA_FALLBACK_VIDEO = 'PNoY1ffzciI';

function getYouTubeEmbedUrl(url: string): string {
  if (url) {
    const watchId = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/)?.[1];
    if (watchId) return `https://www.youtube.com/embed/${watchId}?autoplay=0&rel=0`;
    const handle = url.match(/@([\w-]+)/)?.[1];
    if (handle) return `https://www.youtube.com/embed?listType=user_uploads&list=${handle}&autoplay=0`;
    const channelId = url.match(/channel\/([\w-]+)/)?.[1];
    if (channelId) return `https://www.youtube.com/embed?listType=user_uploads&list=${channelId}&autoplay=0`;
  }
  return `https://www.youtube.com/embed/${ARENA_FALLBACK_VIDEO}?autoplay=0&rel=0`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileClient() {
  const router  = useRouter();
  const params  = useParams();
  const id      = decodeURIComponent(params.id as string);

  const [profile,       setProfile]       = useState<Profile | null>(null);
  const [profileCopied, setProfileCopied] = useState(false);
  const [ads,           setAds]           = useState<Ad[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [isOwn,         setIsOwn]         = useState(false);
  const [activeTab,     setActiveTab]     = useState<Tab>('About');
  const [previewAd,     setPreviewAd]     = useState<Ad | null>(null);

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

  async function fetchProfile() {
    setLoading(true);
    let { data: prof } = await supabase.from('ad_profiles').select('*').eq('email', id).single();
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

  async function shareProfile() {
    if (!profile) return;
    const url  = `https://antcpu-ads.vercel.app/profile/${encodeURIComponent(profile.email)}`;
    const text = `Check out ${profile.brand} on ANTCPU ADS ⚡\n\n${profile.bio || ''}\n\n→ ${url}\n\n#antcpuads #marketing #ads`;
    notifyDiscord(`🔗 **Profile Shared** — ${profile.brand}\n**Profile:** ${url}\n**Email:** ${profile.email}`);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ title: `${profile.brand} — ANTCPU ADS`, text, url }); setProfileCopied(true); setTimeout(() => setProfileCopied(false), 2500); return; } catch {}
    }
    navigator.clipboard.writeText(text).then(() => { setProfileCopied(true); setTimeout(() => setProfileCopied(false), 2500); });
  }

  // ─── Loading / not found ──────────────────────────────────────────────────

  if (loading) return (
    <div style={{ background: tokens.bg, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#555', fontSize: '0.85rem' }}>Loading profile...</div>
    </div>
  );

  if (!profile) return (
    <div style={{ background: tokens.bg, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
      <div style={{ fontSize: '2rem' }}>👤</div>
      <div style={{ fontWeight: 700, color: '#fff' }}>Profile not found</div>
      <div style={{ fontSize: '0.82rem', color: '#555' }}>This advertiser hasn't set up their profile yet.</div>
      <button onClick={() => router.push('/dashboard/user')} style={{ background: 'none', border: '1px solid #333', color: '#888', borderRadius: '8px', padding: '0.6rem 1.4rem', cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.5rem' }}>
        ← Back to Arena
      </button>
    </div>
  );

  // ─── Derived ──────────────────────────────────────────────────────────────

  const topTier = TIER_CONFIG[ads[0]?.tier] || TIER_CONFIG.entry;
  const tier    = previewAd ? (TIER_CONFIG[previewAd.tier] || TIER_CONFIG.entry) : topTier;

  // ─── Styles ───────────────────────────────────────────────────────────────

  const card: React.CSSProperties = { background: tokens.card, border: `1px solid ${tokens.border}`, borderRadius: '12px', padding: '1.25rem', marginBottom: '0.75rem' };
  const lbl:  React.CSSProperties = { fontSize: '0.65rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' };
  const pill  = (color: string): React.CSSProperties => ({ background: `${color}15`, border: `1px solid ${color}40`, color, borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.68rem', fontWeight: 700 });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: tokens.bg, color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: `1px solid ${tokens.border}` }}>
        <span style={{ fontWeight: 800, fontSize: '1rem' }}>⚡ ANTCPU ADS</span>
        <button onClick={() => router.push('/arena')} style={{ background: 'none', border: `1px solid #222`, color: '#555', borderRadius: '8px', padding: '0.4rem 0.9rem', fontSize: '0.78rem', cursor: 'pointer' }}>
          🏟 Arena
        </button>
      </div>

      {/* Two-column layout */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem 1rem', display: 'grid', gridTemplateColumns: 'minmax(240px,320px) 1fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── LEFT ── */}
        <div>
          <div style={lbl}>Ad Preview</div>

          {/* Ad card */}
          <div
            onClick={() => previewAd && window.open(previewAd.url, '_blank')}
            style={{ background: tokens.card, border: `1px solid ${tier.color}33`, borderRadius: '14px', padding: '1.5rem', minHeight: '180px', cursor: previewAd ? 'pointer' : 'default', marginBottom: '1rem' }}
          >
            {previewAd ? (
              <>
                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.82rem', color: tier.color }}>{profile.brand}</span>
                  <span style={pill(tier.color)}>{tier.label.toUpperCase()}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.4rem' }}>{previewAd.title}</div>
                <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '0.75rem' }}>{previewAd.description}</div>
                <div style={{ fontSize: '0.72rem', color: '#555' }}>{previewAd.url} →</div>
              </>
            ) : (
              <div style={{ color: '#555', fontSize: '0.85rem' }}>No ads yet.</div>
            )}
          </div>

          {/* Brand identity */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
              <div style={{ fontWeight: 800, fontSize: '1rem' }}>{profile.brand || profile.name}</div>
              <button onClick={shareProfile} style={{ background: 'none', border: `1px solid ${topTier.color}40`, color: topTier.color, borderRadius: '8px', padding: '0.3rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                {profileCopied ? '✓ Shared' : '↗ Share'}
              </button>
            </div>
            <div style={{ fontSize: '0.78rem', color: '#555', marginBottom: '0.4rem' }}>{profile.name}</div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={pill(topTier.color)}>{topTier.label.toUpperCase()}</span>
              <span style={{ fontSize: '0.72rem', color: '#555', alignSelf: 'center' }}>{ads.length} AD{ads.length !== 1 ? 'S' : ''}</span>
            </div>
            {isOwn && (
              <button onClick={() => router.push('/profile')} style={{ width: '100%', marginTop: '0.75rem', background: topTier.color, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.5rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                ✏️ Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* ── RIGHT ── */}
        <div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{
                background: activeTab === tab ? topTier.color : tokens.card,
                border: activeTab === tab ? 'none' : `1px solid ${tokens.border}`,
                color: activeTab === tab ? '#fff' : '#555',
                borderRadius: '8px', padding: '0.4rem 1rem',
                cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
              }}>
                {tab}
              </button>
            ))}
          </div>

          {/* ── About ── */}
          {activeTab === 'About' && (
            <div style={card}>
              <div style={lbl}>About</div>
              <div style={{ fontSize: '0.85rem', color: '#aaa', marginBottom: '1rem', lineHeight: 1.6 }}>
                {profile.bio || <span style={{ color: '#555' }}>No bio yet.</span>}
              </div>
              {profile.website && (
                <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#aaa', fontSize: '0.82rem', textDecoration: 'none', marginBottom: '0.5rem' }}>
                  <FavIcon url={profile.website} socialKey="website" />
                  {profile.website.replace(/https?:\/\//, '')}
                </a>
              )}
              {profile.contact && (
                <div style={{ fontSize: '0.82rem', color: '#555' }}>📬 {profile.contact}</div>
              )}

              {/* YouTube — always shows, falls back to arena video */}
              <div style={{ marginTop: '1.25rem' }}>
                <div style={lbl}>▶ {profile.youtube ? 'YouTube' : 'Arena Video'}</div>
                <iframe
                  src={getYouTubeEmbedUrl(profile.youtube || '')}
                  width="100%"
                  height="200"
                  style={{ borderRadius: '10px', border: 'none' }}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                  allowFullScreen
                />
              </div>
            </div>
          )}

          {/* ── Ads ── */}
          {activeTab === 'Ads' && (
            <div>
              {ads.length === 0 ? (
                <div style={{ ...card, color: '#555', fontSize: '0.85rem' }}>No ads yet.</div>
              ) : ads.map(ad => {
                const t = TIER_CONFIG[ad.tier] || TIER_CONFIG.entry;
                return (
                  <div key={ad.id} onClick={() => setPreviewAd(ad)} style={{ ...card, cursor: 'pointer', borderLeft: `3px solid ${t.color}`, marginBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                      <span style={pill(t.color)}>{t.label}</span>
                      {ad.pinned && <span style={pill('#f0883e')}>📌 PINNED</span>}
                      {ad.points && ad.points > 0 && <span style={{ fontSize: '0.72rem', color: '#f0883e' }}>⚡ {ad.points} pts</span>}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.25rem' }}>{ad.title}</div>
                    <div style={{ fontSize: '0.78rem', color: '#555' }}>{ad.description}</div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Performance ── */}
          {activeTab === 'Performance' && (
            <div style={card}>
              <div style={lbl}>Performance</div>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Total Ads',    value: ads.length },
                  { label: 'Total Points', value: ads.reduce((s, a) => s + (a.points || 0), 0) },
                  { label: 'Total Clicks', value: ads.reduce((s, a) => s + (a.click_count || 0), 0) },
                  { label: 'Total Shares', value: ads.reduce((s, a) => s + (a.share_count || 0), 0) },
                ].map(s => (
                  <div key={s.label} style={{ background: tokens.bg, border: `1px solid ${tokens.border}`, borderRadius: '10px', padding: '0.75rem 1rem', minWidth: '80px' }}>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', color: topTier.color }}>{s.value}</div>
                    <div style={{ fontSize: '0.65rem', color: '#555', marginTop: '0.2rem' }}>{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Upgrade ── */}
          {activeTab === 'Upgrade' && (
            <div style={card}>
              <div style={lbl}>Upgrade</div>
              {[
                { tier: 'Entry',    pts: 0,   color: '#0070f3', desc: 'You are here' },
                { tier: 'Rising',   pts: 100, color: '#7928ca', desc: '100 pts to unlock' },
                { tier: 'Featured', pts: 300, color: '#ff0080', desc: '300 pts to unlock' },
                { tier: 'Top Tier', pts: 750, color: '#f0883e', desc: '750 pts to unlock' },
              ].map(t => (
                <div key={t.tier} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: `1px solid ${tokens.border}` }}>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={pill(t.color)}>{t.tier}</span>
                    <span style={{ fontSize: '0.75rem', color: '#555' }}>{t.desc}</span>
                  </div>
                  <span style={{ fontSize: '0.72rem', color: t.color, fontWeight: 700 }}>⚡ {t.pts}</span>
                </div>
              ))}
            </div>
          )}

          {/* ── Connect ── */}
          {activeTab === 'Connect' && (
            <div style={card}>
              <div style={lbl}>Connect</div>
              {CONNECT_SOCIALS.map(s => {
                const val = profile[s.key] as string | undefined;
                if (!val) return null;
                return (
                  <a key={s.key} href={val.startsWith('http') ? val : `https://${val}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.5rem 0', borderBottom: `1px solid ${tokens.border}`, color: '#aaa', textDecoration: 'none', fontSize: '0.82rem' }}>
                    <FavIcon url={val} socialKey={s.key} />
                    <span style={{ fontWeight: 600 }}>{s.label}</span>
                    <span style={{ color: '#555', fontSize: '0.72rem', marginLeft: 'auto' }}>→</span>
                  </a>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {/* ── Arena Guide card — hidden for own profile ── */}
      {!isOwn && (
        <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 1rem 2rem' }}>
          <div style={{
            background: '#111318',
            border: '1px solid #2a2d35',
            borderLeft: '3px solid #0070f3',
            boxShadow: '0 0 20px rgba(0,112,243,0.08)',
            borderRadius: '12px',
            padding: '1.25rem 1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem',
          }}>
            <div>
              <div style={{ fontSize: '0.65rem', color: '#0070f3', fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
                ◈ &nbsp; Arena Guide
              </div>
              <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#e0e0e0', marginBottom: '0.3rem', lineHeight: 1.3 }}>
                Easy guide to place ads, share them<br />
                and find others like {profile.brand || profile.name}.
              </div>
              <div style={{ fontSize: '0.75rem', color: '#555' }}>
                The Arena is open. Your brand could be here.
              </div>
            </div>
            <button
              onClick={() => router.push('/guide?ref=profile')}
              style={{
                background: '#0070f3', border: 'none', color: '#fff',
                borderRadius: '9px', padding: '0.7rem 1.25rem',
                fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer',
                whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,112,243,0.25)',
              }}
            >
              ⚡ Arena Guide →
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
