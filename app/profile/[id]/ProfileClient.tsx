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
  { key: 'website',  label: 'Website' },
  { key: 'twitter',  label: 'Twitter / X' },
  { key: 'instagram',label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok',   label: 'TikTok' },
  { key: 'youtube',  label: 'YouTube' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'discord',  label: 'Discord' },
  { key: 'telegram', label: 'Telegram' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function FavIcon({ url, socialKey }: { url: string; socialKey: string }) {
  const domain = socialKey === 'website'
    ? (() => { try { return new URL(url).hostname; } catch { return 'globe'; } })()
    : SOCIAL_DOMAINS[socialKey];
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`} alt="" width={16} height={16} style={{ borderRadius: 3 }} />;
}

const FALLBACK_VIDEO = 'PNoY1ffzciI';

function getYouTubeEmbedUrl(url?: string): string {
  if (url) {
    const watchId = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/)?.[1];
    if (watchId) return `https://www.youtube.com/embed/${watchId}?autoplay=0&rel=0`;
    const handle = url.match(/@([\w-]+)/)?.[1];
    if (handle) return `https://www.youtube.com/embed?listType=user_uploads&list=${handle}&autoplay=0`;
    const channelId = url.match(/channel\/([\w-]+)/)?.[1];
    if (channelId) return `https://www.youtube.com/embed?listType=user_uploads&list=${channelId}&autoplay=0`;
  }
  return `https://www.youtube.com/embed/${FALLBACK_VIDEO}?autoplay=0&rel=0`;
}

function buildShareText(profile: Profile): string {
  const url = `https://antcpu-ads.vercel.app/profile/${encodeURIComponent(profile.email)}`;
  const hashtags = profile.brand === 'Map of Pi'
    ? '#mapofpi #marketing #ads #profile'
    : '#antcpuads #marketing #ads #profile';
  return `Check out ${profile.brand} -> PROFILES\n${profile.bio || ''}\n→ ${url}\n${hashtags}`;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ProfileClient() {
  const router = useRouter();
  const params = useParams();
  const id = decodeURIComponent(params.id as string);

  const [profile,       setProfile]       = useState<Profile | null>(null);
  const [ads,           setAds]           = useState<Ad[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [isOwn,         setIsOwn]         = useState(false);
  const [activeTab,     setActiveTab]     = useState<Tab>('About');
  const [previewAd,     setPreviewAd]     = useState<Ad | null>(null);
  const [shareOpen,     setShareOpen]     = useState(false);
  const [shareText,     setShareText]     = useState('');
  const [copied,        setCopied]        = useState(false);

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
      prof = all?.find((p: Profile) => p.brand?.toLowerCase().replace(/\s+/g, '-') === id) || null;
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

  // ─── Loading / not found ──────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}>
      Loading profile...
    </div>
  );

  if (!profile) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#555', gap: '1rem' }}>
      <div style={{ fontSize: '2rem' }}>👤</div>
      <div style={{ fontWeight: 700 }}>Profile not found</div>
      <div style={{ fontSize: '0.82rem' }}>This advertiser hasn't set up their profile yet.</div>
      <button onClick={() => router.push('/arena')}
        style={{ background: 'none', border: '1px solid #333', color: '#888', borderRadius: '8px', padding: '0.6rem 1.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
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
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#e8eaf0', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '0 1.25rem', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', zIndex: 50 }}>
        <span style={{ fontWeight: 800, fontSize: '0.82rem', letterSpacing: '0.1em' }}>⚡ ANTCPU ADS</span>
        <button onClick={() => router.push('/arena')}
          style={{ background: 'none', border: '1px solid #222', color: '#555', borderRadius: '8px', padding: '0.4rem 0.9rem', fontSize: '0.78rem', cursor: 'pointer' }}>
          🏟 Arena
        </button>
      </div>

      {/* Two-column layout */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '1.5rem 1.25rem', display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,2fr)', gap: '1.25rem' }}>

        {/* ── LEFT ── */}
        <div>
          <div style={{ ...lbl }}>Ad Preview</div>

          {/* Ad card */}
          <div onClick={() => previewAd && window.open(previewAd.url, '_blank')}
            style={{ background: tokens.card, border: `1px solid ${tier.color}33`, borderRadius: '14px', padding: '1.5rem', minHeight: '180px', cursor: previewAd ? 'pointer' : 'default', marginBottom: '1rem' }}>
            {previewAd ? (
              <>
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  <span style={pill(tier.color)}>{profile.brand}</span>
                  <span style={pill('#555')}>{tier.label.toUpperCase()}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', lineHeight: 1.4 }}>{previewAd.title}</div>
                <div style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.6, marginBottom: '0.75rem' }}>{previewAd.description}</div>
                <div style={{ fontSize: '0.72rem', color: tier.color }}>{previewAd.url} →</div>
              </>
            ) : (
              <div style={{ color: '#555', fontSize: '0.85rem' }}>No ads yet.</div>
            )}
          </div>

          {/* Brand identity */}
          <div style={{ ...card }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem' }}>{profile.brand || profile.name}</span>
              <button onClick={openShare}
                style={{ background: topTier.color, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.35rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}>
                {copied ? '✓ Copied' : '↗ Share'}
              </button>
            </div>
            <div style={{ fontSize: '0.82rem', color: '#aaa', marginBottom: '0.4rem' }}>{profile.name}</div>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={pill(topTier.color)}>{topTier.label.toUpperCase()}</span>
              <span style={pill('#555')}>{ads.length} AD{ads.length !== 1 ? 'S' : ''}</span>
            </div>
            {isOwn && (
              <button onClick={() => router.push('/profile')}
                style={{ width: '100%', marginTop: '0.75rem', background: topTier.color, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.5rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
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
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{ background: activeTab === tab ? topTier.color : tokens.card, border: activeTab === tab ? 'none' : `1px solid ${tokens.border}`, color: activeTab === tab ? '#fff' : '#555', borderRadius: '8px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600 }}>
                {tab}
              </button>
            ))}
          </div>

          {/* ── About ── */}
          {activeTab === 'About' && (
            <div style={card}>
              <div style={lbl}>About</div>
              <p style={{ fontSize: '0.85rem', color: '#aaa', lineHeight: 1.7, margin: '0 0 1rem' }}>{profile.bio || 'No bio yet.'}</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                {profile.website && (
                  <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#aaa', textDecoration: 'none', fontSize: '0.82rem' }}>
                    <FavIcon url={profile.website} socialKey="website" />
                    {profile.website.replace(/https?:\/\//, '')}
                  </a>
                )}
                {profile.contact && (
                  <a href={profile.contact.startsWith('http') ? profile.contact : `https://${profile.contact}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#aaa', textDecoration: 'none', fontSize: '0.82rem' }}>
                    📬 {profile.contact}
                  </a>
                )}
              </div>
              {/* YouTube */}
              <div style={lbl}>▶ {profile.youtube ? 'YouTube' : 'Arena Video'}</div>
              <iframe
                src={getYouTubeEmbedUrl(profile.youtube)}
                style={{ width: '100%', aspectRatio: '16/9', border: 'none', borderRadius: '10px' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* ── Ads ── */}
          {activeTab === 'Ads' && (
            <div style={card}>
              <div style={lbl}>{ads.length} Ad{ads.length !== 1 ? 's' : ''}</div>
              {ads.length === 0 ? (
                <div style={{ color: '#555', fontSize: '0.85rem' }}>No ads yet.</div>
              ) : ads.map(ad => (
                <div key={ad.id} onClick={() => setPreviewAd(ad)}
                  style={{ padding: '0.75rem', borderRadius: '10px', border: `1px solid ${previewAd?.id === ad.id ? topTier.color + '60' : tokens.border}`, marginBottom: '0.5rem', cursor: 'pointer', background: previewAd?.id === ad.id ? `${topTier.color}08` : 'transparent' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.25rem' }}>{ad.title}</div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={pill(TIER_CONFIG[ad.tier]?.color || '#555')}>{ad.tier}</span>
                    <span style={pill('#555')}>{ad.category}</span>
                    {(ad.points || 0) > 0 && <span style={pill('#D4AF37')}>⚡ {ad.points} pts</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Performance ── */}
          {activeTab === 'Performance' && (
            <div style={card}>
              <div style={lbl}>Performance</div>
              {ads.length === 0 ? (
                <div style={{ color: '#555', fontSize: '0.85rem' }}>No data yet.</div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                  {[
                    { label: 'Total Points', value: ads.reduce((s, a) => s + (a.points || 0), 0), color: '#D4AF37' },
                    { label: 'Total Clicks',  value: ads.reduce((s, a) => s + (a.click_count || 0), 0), color: '#0070f3' },
                    { label: 'Total Shares',  value: ads.reduce((s, a) => s + (a.share_count || 0), 0), color: '#7928ca' },
                  ].map(s => (
                    <div key={s.label} style={{ background: '#0a0a0a', border: `1px solid #1a1a1a`, borderRadius: 10, padding: '1rem', textAlign: 'center' as const }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                      <div style={{ fontSize: '0.65rem', color: '#555', marginTop: 4 }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Upgrade ── */}
          {activeTab === 'Upgrade' && (
            <div style={card}>
              <div style={lbl}>Upgrade Your Tier</div>
              <p style={{ fontSize: '0.85rem', color: '#aaa', lineHeight: 1.7, margin: '0 0 1rem' }}>
                Move from Entry to Rising, Featured, or Top Tier. Higher tiers get more reach, more antbot deployments, and priority placement in the Arena.
              </p>
              <button onClick={() => router.push('/arena')}
                style={{ background: topTier.color, border: 'none', color: '#fff', borderRadius: '10px', padding: '0.75rem 1.5rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                ⚡ Arena Guide →
              </button>
            </div>
          )}

          {/* ── Connect ── */}
          {activeTab === 'Connect' && (
            <div style={card}>
              <div style={lbl}>Connect</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {CONNECT_SOCIALS.map(({ key, label }) => {
                  const val = profile[key] as string | undefined;
                  if (!val) return null;
                  return (
                    <a key={key}
                      href={val.startsWith('http') ? val : `https://${val}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: '#aaa', textDecoration: 'none', fontSize: '0.85rem', padding: '0.5rem', borderRadius: '8px', border: '1px solid #1a1a1a' }}>
                      <FavIcon url={val} socialKey={key} />
                      <span style={{ fontWeight: 600, color: '#e8eaf0' }}>{label}</span>
                      <span style={{ color: '#555', fontSize: '0.75rem', marginLeft: 'auto' }}>{val.replace(/https?:\/\//, '')}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Share modal ── */}
      {shareOpen && (
        <>
          <div onClick={() => setShareOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', zIndex: 1001, background: '#111', border: '1px solid #222', borderRadius: 16, padding: '1.5rem', width: 'min(520px, 92vw)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>✏️ Customize Share</div>
              <button onClick={() => setShareOpen(false)}
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <textarea
              value={shareText}
              onChange={e => setShareText(e.target.value)}
              rows={7}
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: 10, padding: '0.85rem', color: '#fff', fontSize: '0.85rem', lineHeight: 1.6, resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ fontSize: '0.68rem', color: '#555', marginTop: '0.4rem', marginBottom: '1rem' }}>
              {shareText.length} characters
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={executeShare}
                style={{ flex: 1, background: topTier.color, border: 'none', borderRadius: 10, color: '#fff', fontWeight: 700, fontSize: '0.9rem', padding: '0.75rem', cursor: 'pointer' }}>
                {copied ? '✓ Copied!' : '📋 Copy & Share'}
              </button>
              <button onClick={() => setShareOpen(false)}
                style={{ background: 'transparent', border: '1px solid #333', borderRadius: 10, color: '#555', fontWeight: 600, fontSize: '0.9rem', padding: '0.75rem 1.25rem', cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
