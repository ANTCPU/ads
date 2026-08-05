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

const TABS = ['About', 'Ads', 'Performance', 'Connect'] as const;
type Tab = typeof TABS[number];

const SOCIAL_DOMAINS: Record<string, string> = {
  website: '', twitter: 'x.com', instagram: 'instagram.com',
  facebook: 'facebook.com', tiktok: 'tiktok.com', youtube: 'youtube.com',
  linkedin: 'linkedin.com', discord: 'discord.com', telegram: 'telegram.org',
};

const CONNECT_SOCIALS: { key: keyof Profile; label: string; icon: string }[] = [
  { key: 'website',   label: 'Website',     icon: '🌐' },
  { key: 'twitter',   label: 'Twitter / X', icon: '𝕏' },
  { key: 'instagram', label: 'Instagram',   icon: '📸' },
  { key: 'facebook',  label: 'Facebook',    icon: '📘' },
  { key: 'tiktok',    label: 'TikTok',      icon: '🎵' },
  { key: 'youtube',   label: 'YouTube',     icon: '▶️' },
  { key: 'linkedin',  label: 'LinkedIn',    icon: '💼' },
  { key: 'discord',   label: 'Discord',     icon: '💬' },
  { key: 'telegram',  label: 'Telegram',    icon: '✈️' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getYouTubeEmbedUrl(url: string): string | null {
  const watchId = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/)?.[1];
  if (watchId) return `https://www.youtube.com/embed/${watchId}?autoplay=0&rel=0`;
  const handle = url.match(/@([\w-]+)/)?.[1];
  if (handle) return `https://www.youtube.com/embed?listType=user_uploads&list=${handle}&autoplay=0`;
  const channelId = url.match(/channel\/([\w-]+)/)?.[1];
  if (channelId) return `https://www.youtube.com/embed?listType=user_uploads&list=${channelId}&autoplay=0`;
  return null;
}

function buildShareText(profile: Profile): string {
  const url = `https://antcpu-ads.vercel.app/profile/${encodeURIComponent(profile.email)}`;
  const hashtags = profile.brand === 'Map of Pi'
    ? '#mapofpi #marketing #ads #profile'
    : '#antcpuads #marketing #ads #profile';
  return `Check out ${profile.brand} on ANTCPU ADS\n${profile.bio || ''}\n→ ${url}\n${hashtags}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileClient() {
  const router   = useRouter();
  const params   = useParams();
  const id       = decodeURIComponent(params.id as string);

  const [profile,   setProfile]   = useState<Profile | null>(null);
  const [ads,       setAds]       = useState<Ad[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [isOwn,     setIsOwn]     = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('About');
  const [previewAd, setPreviewAd] = useState<Ad | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareText, setShareText] = useState('');
  const [copied,    setCopied]    = useState(false);

  // ── Boot ──────────────────────────────────────────────────────────────────

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
    let { data: prof } = await supabase
      .from('ad_profiles').select('*').eq('email', id).single();
    if (!prof) {
      const { data: all } = await supabase.from('ad_profiles').select('*');
      prof = all?.find((p: Profile) =>
        p.brand?.toLowerCase().replace(/\s+/g, '-') === id
      ) || null;
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

  // ── Share ─────────────────────────────────────────────────────────────────

  function openShare() {
    if (!profile) return;
    setShareText(buildShareText(profile));
    setShareOpen(true);
  }

  async function executeShare() {
    if (!profile) return;
    const url = `https://antcpu-ads.vercel.app/profile/${encodeURIComponent(profile.email)}`;
    notifyDiscord(`🔗 **Profile Shared** — ${profile.brand}\n**Profile:** ${url}`);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: `${profile.brand} — ANTCPU ADS`, text: shareText, url });
        setCopied(true); setTimeout(() => setCopied(false), 2500);
        setShareOpen(false); return;
      } catch {}
    }
    navigator.clipboard.writeText(shareText).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2500);
      setShareOpen(false);
    });
  }

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
      Loading profile...
    </div>
  );

  if (!profile) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', color: '#555', gap: '1rem' }}>
      <div style={{ fontSize: '2.5rem' }}>👤</div>
      <div style={{ fontWeight: 700, color: '#fff' }}>Profile not found</div>
      <div style={{ fontSize: '0.82rem' }}>This advertiser hasn't set up their profile yet.</div>
      <button onClick={() => router.push('/arena')}
        style={{ background: 'none', border: '1px solid #333', color: '#888',
          borderRadius: '8px', padding: '0.6rem 1.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
        ← Back to Arena
      </button>
    </div>
  );

  // ── Derived ───────────────────────────────────────────────────────────────

  const topTier   = TIER_CONFIG[ads[0]?.tier] || TIER_CONFIG.entry;
  const tier      = previewAd ? (TIER_CONFIG[previewAd.tier] || TIER_CONFIG.entry) : topTier;
  const embedUrl  = profile.youtube ? getYouTubeEmbedUrl(profile.youtube) : null;
  const totalPts  = ads.reduce((s, a) => s + (a.points || 0), 0);
  const totalClks = ads.reduce((s, a) => s + (a.click_count || 0), 0);
  const totalShrs = ads.reduce((s, a) => s + (a.share_count || 0), 0);

  // ── Styles ────────────────────────────────────────────────────────────────

  const card: React.CSSProperties = {
    background: tokens.card, border: `1px solid ${tokens.border}`,
    borderRadius: '14px', padding: '1.25rem', marginBottom: '0.75rem',
  };
  const lbl: React.CSSProperties = {
    fontSize: '0.65rem', color: '#555', fontWeight: 700,
    textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.65rem',
    display: 'block',
  };
  const pill = (color: string): React.CSSProperties => ({
    background: `${color}15`, border: `1px solid ${color}40`, color,
    borderRadius: '999px', padding: '0.15rem 0.6rem',
    fontSize: '0.68rem', fontWeight: 700, whiteSpace: 'nowrap' as const,
  });
  const statBox = (color: string): React.CSSProperties => ({
    background: '#0a0a0a', border: `1px solid #1a1a1a`,
    borderRadius: '10px', padding: '1rem', textAlign: 'center' as const,
    borderTop: `2px solid ${color}`,
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a',
      color: '#e8eaf0', fontFamily: 'system-ui, sans-serif' }}>

      {/* ── NAV ── */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '0 1.25rem',
        height: 52, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', position: 'sticky', top: 0,
        background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <span style={{ fontWeight: 800, fontSize: '0.85rem', letterSpacing: '0.08em',
          color: '#f0883e', cursor: 'pointer' }}
          onClick={() => router.push('/')}>
          ⚡ ANTCPU ADS
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={() => router.push('/arena')}
            style={{ background: 'none', border: '1px solid #222', color: '#555',
              borderRadius: '8px', padding: '0.4rem 0.9rem', fontSize: '0.78rem', cursor: 'pointer' }}>
            🏟 Arena
          </button>
          {isOwn && (
            <button onClick={() => router.push('/profile')}
              style={{ background: topTier.color, border: 'none', color: '#fff',
                borderRadius: '8px', padding: '0.4rem 0.9rem', fontSize: '0.78rem',
                fontWeight: 700, cursor: 'pointer' }}>
              ✏️ Edit
            </button>
          )}
        </div>
      </div>

      {/* ── LAYOUT ── */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '1.5rem 1.25rem',
        display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)',
        gap: '1.25rem' }}>

        {/* ── LEFT COLUMN ── */}
        <div>

          {/* Ad preview card */}
          <div style={{ ...card, padding: 0, overflow: 'hidden', marginBottom: '0.75rem' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${tokens.border}` }}>
              <span style={lbl}>Live Ad Preview</span>
            </div>
            <div
              onClick={() => previewAd && window.open(previewAd.url, '_blank', 'noopener,noreferrer')}
              style={{ padding: '1.25rem', minHeight: '160px',
                cursor: previewAd ? 'pointer' : 'default',
                borderLeft: `3px solid ${tier.color}` }}>
              {previewAd ? (
                <>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.65rem' }}>
                    <span style={pill(tier.color)}>{profile.brand}</span>
                    <span style={pill('#555')}>{tier.label}</span>
                    {previewAd.pinned && <span style={pill('#f0883e')}>⭐ Featured</span>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem',
                    marginBottom: '0.5rem', lineHeight: 1.4, color: '#fff' }}>
                    {previewAd.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#888',
                    lineHeight: 1.6, marginBottom: '0.75rem' }}>
                    {previewAd.description.length > 100
                      ? previewAd.description.slice(0, 100) + '…'
                      : previewAd.description}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: tier.color, fontWeight: 600 }}>
                    Visit → {previewAd.url.replace(/https?:\/\//, '')}
                  </div>
                </>
              ) : (
                <div style={{ color: '#555', fontSize: '0.85rem', paddingTop: '1rem' }}>
                  No active ads yet.
                </div>
              )}
            </div>
          </div>

          {/* Brand card */}
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem',
                  color: '#fff', marginBottom: '0.2rem' }}>
                  {profile.brand || profile.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: '#666' }}>
                  {profile.name}
                </div>
              </div>
              <button onClick={openShare}
                style={{ background: topTier.color, border: 'none', color: '#fff',
                  borderRadius: '8px', padding: '0.35rem 0.85rem',
                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                  flexShrink: 0 }}>
                {copied ? '✓ Copied' : '↗ Share'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              <span style={pill(topTier.color)}>{topTier.label}</span>
              <span style={pill('#555')}>{ads.length} Ad{ads.length !== 1 ? 's' : ''}</span>
              {totalPts > 0 && <span style={pill('#D4AF37')}>⚡ {totalPts} pts</span>}
            </div>
          </div>

          {/* Quick stats card */}
          {(totalClks > 0 || totalShrs > 0) && (
            <div style={card}>
              <span style={lbl}>Stats</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div style={statBox('#0070f3')}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0070f3' }}>
                    {totalClks}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#555', marginTop: 2 }}>Clicks</div>
                </div>
                <div style={statBox('#7928ca')}>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#7928ca' }}>
                    {totalShrs}
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#555', marginTop: 2 }}>Shares</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {TABS.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? topTier.color : tokens.card,
                  border: activeTab === tab ? 'none' : `1px solid ${tokens.border}`,
                  color: activeTab === tab ? '#fff' : '#555',
                  borderRadius: '8px', padding: '0.4rem 1rem',
                  cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
                  transition: 'all 0.15s',
                }}>
                {tab}
              </button>
            ))}
          </div>

          {/* ── ABOUT ── */}
          {activeTab === 'About' && (
            <div>

              {/* Bio */}
              <div style={card}>
                <span style={lbl}>About {profile.brand}</span>
                <p style={{ fontSize: '0.88rem', color: '#ccc', lineHeight: 1.75,
                  margin: 0, whiteSpace: 'pre-wrap' }}>
                  {profile.bio || 'No bio yet.'}
                </p>
                {(profile.website || profile.contact) && (
                  <div style={{ display: 'flex', flexDirection: 'column',
                    gap: '0.4rem', marginTop: '1rem' }}>
                    {profile.website && (
                      <a href={profile.website.startsWith('http')
                          ? profile.website : `https://${profile.website}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center',
                          gap: '0.4rem', fontSize: '0.78rem',
                          color: topTier.color, textDecoration: 'none' }}>
                        🌐 {profile.website.replace(/https?:\/\//, '')}
                      </a>
                    )}
                    {profile.contact && (
                      <a href={profile.contact.startsWith('http')
                          ? profile.contact : `mailto:${profile.contact}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: 'inline-flex', alignItems: 'center',
                          gap: '0.4rem', fontSize: '0.78rem',
                          color: '#888', textDecoration: 'none' }}>
                        📬 {profile.contact}
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* YouTube — only if profile has it */}
              {embedUrl && (
                <div style={card}>
                  <span style={lbl}>▶ YouTube</span>
                  <iframe
                    src={embedUrl}
                    style={{ width: '100%', aspectRatio: '16/9',
                      border: 'none', borderRadius: '10px', display: 'block' }}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              )}

            </div>
          )}

          {/* ── ADS ── */}
          {activeTab === 'Ads' && (
            <div style={card}>
              <span style={lbl}>{ads.length} Ad{ads.length !== 1 ? 's' : ''}</span>
              {ads.length === 0 ? (
                <div style={{ color: '#555', fontSize: '0.85rem' }}>No ads yet.</div>
              ) : (
                ads.map(ad => (
                  <div key={ad.id} onClick={() => setPreviewAd(ad)}
                    style={{
                      padding: '0.85rem', borderRadius: '10px',
                      border: `1px solid ${previewAd?.id === ad.id
                        ? topTier.color + '60' : tokens.border}`,
                      marginBottom: '0.5rem', cursor: 'pointer',
                      background: previewAd?.id === ad.id
                        ? `${topTier.color}08` : 'transparent',
                      transition: 'all 0.15s',
                    }}>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem',
                      marginBottom: '0.35rem', color: '#fff' }}>
                      {ad.title}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#666',
                      marginBottom: '0.5rem', lineHeight: 1.4 }}>
                      {ad.description.length > 80
                        ? ad.description.slice(0, 80) + '…'
                        : ad.description}
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={pill(TIER_CONFIG[ad.tier]?.color || '#555')}>
                        {ad.tier}
                      </span>
                      <span style={pill('#555')}>{ad.status}</span>
                      {(ad.points || 0) > 0 && (
                        <span style={pill('#D4AF37')}>⚡ {ad.points} pts</span>
                      )}
                      {(ad.click_count || 0) > 0 && (
                        <span style={pill('#0070f3')}>👆 {ad.click_count}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── PERFORMANCE ── */}
          {activeTab === 'Performance' && (
            <div>
              <div style={card}>
                <span style={lbl}>Overall Performance</span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem' }}>
                  {[
                    { label: 'Total Points', value: totalPts,  color: '#D4AF37' },
                    { label: 'Total Clicks', value: totalClks, color: '#0070f3' },
                    { label: 'Total Shares', value: totalShrs, color: '#7928ca' },
                  ].map(s => (
                    <div key={s.label} style={statBox(s.color)}>
                      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color }}>
                        {s.value}
                      </div>
                      <div style={{ fontSize: '0.62rem', color: '#555', marginTop: 4 }}>
                        {s.label}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Per-ad breakdown */}
              {ads.length > 0 && (
                <div style={card}>
                  <span style={lbl}>Per Ad</span>
                  {ads.map(ad => (
                    <div key={ad.id} style={{ display: 'flex', alignItems: 'center',
                      gap: '0.75rem', padding: '0.65rem 0',
                      borderBottom: `1px solid ${tokens.border}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600,
                          color: '#fff', whiteSpace: 'nowrap',
                          overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {ad.title}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: '#555', marginTop: 2 }}>
                          {ad.tier} · {ad.status}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                        <span style={pill('#D4AF37')}>⚡ {ad.points || 0}</span>
                        <span style={pill('#0070f3')}>👆 {ad.click_count || 0}</span>
                        <span style={pill('#7928ca')}>↗ {ad.share_count || 0}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── CONNECT ── */}
          {activeTab === 'Connect' && (
            <div style={card}>
              <span style={lbl}>Connect with {profile.brand}</span>
              {CONNECT_SOCIALS.filter(({ key }) => !!profile[key]).length === 0 ? (
                <div style={{ color: '#555', fontSize: '0.85rem' }}>
                  No social links added yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {CONNECT_SOCIALS.map(({ key, label, icon }) => {
                    const val = profile[key] as string | undefined;
                    if (!val) return null;
                    return (
                      <a key={key}
                        href={val.startsWith('http') ? val : `https://${val}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.75rem',
                          color: '#aaa', textDecoration: 'none', fontSize: '0.85rem',
                          padding: '0.65rem 0.85rem', borderRadius: '10px',
                          border: `1px solid ${tokens.border}`,
                          transition: 'border-color 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = topTier.color + '60')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = tokens.border)}>
                        <span style={{ fontSize: '1rem', minWidth: '1.2rem' }}>{icon}</span>
                        <span style={{ fontWeight: 600, color: '#e8eaf0' }}>{label}</span>
                        <span style={{ color: '#555', fontSize: '0.72rem', marginLeft: 'auto',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          maxWidth: '160px' }}>
                          {val.replace(/https?:\/\//, '')}
                        </span>
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* ── SHARE MODAL ── */}
      {shareOpen && (
        <>
          <div onClick={() => setShareOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
              zIndex: 1000, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%',
            transform: 'translate(-50%,-50%)', zIndex: 1001,
            background: '#111', border: '1px solid #222', borderRadius: 16,
            padding: '1.5rem', width: 'min(520px, 92vw)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                ↗ Share {profile.brand}
              </div>
              <button onClick={() => setShareOpen(false)}
                style={{ background: 'none', border: 'none', color: '#555',
                  cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <textarea
              value={shareText}
              onChange={e => setShareText(e.target.value)}
              rows={7}
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222',
                borderRadius: 10, padding: '0.85rem', color: '#fff', fontSize: '0.85rem',
                lineHeight: 1.6, resize: 'vertical', outline: 'none',
                                boxSizing: 'border-box' as const }}
            />
            <div style={{ fontSize: '0.68rem', color: '#555',
              marginTop: '0.4rem', marginBottom: '1rem' }}>
              {shareText.length} characters
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={executeShare}
                style={{ flex: 1, background: topTier.color, border: 'none',
                  borderRadius: 10, color: '#fff', fontWeight: 700,
                  fontSize: '0.9rem', padding: '0.75rem', cursor: 'pointer' }}>
                {copied ? '✓ Copied!' : '📋 Copy & Share'}
              </button>
              <button onClick={() => setShareOpen(false)}
                style={{ background: 'transparent', border: '1px solid #333',
                  borderRadius: 10, color: '#555', fontWeight: 600,
                  fontSize: '0.9rem', padding: '0.75rem 1.25rem', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}

