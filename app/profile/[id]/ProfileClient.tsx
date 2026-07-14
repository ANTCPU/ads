'use client';
import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { notifyDiscord } from '../../lib/discord';
import { tokens } from '../../lib/shopAdStyles';

// ─── Supabase ─────────────────────────────────────────────────────────────────

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

// All 10 socials — same source of truth as profile/page.tsx
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
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      width={15} height={15} alt=""
      style={{ borderRadius: '3px', display: 'block', flexShrink: 0 }}
    />
  );
}

function getYouTubeEmbedUrl(url: string): string | null {
  if (!url) return null;
  const handle = url.match(/@([\w-]+)/)?.[1];
  if (handle) return `https://www.youtube.com/embed/live_stream?channel=${handle}&autoplay=0`;
  const channelId = url.match(/channel\/([\w-]+)/)?.[1];
  if (channelId) return `https://www.youtube.com/embed/live_stream?channel=${channelId}&autoplay=0`;
  return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfileClient() {
  const router   = useRouter();
  const params   = useParams();
  const id       = decodeURIComponent(params.id as string);

  const [profile, setProfile]           = useState<Profile | null>(null);
  const [profileCopied, setProfileCopied] = useState(false);
  const [ads, setAds]                   = useState<Ad[]>([]);
  const [loading, setLoading]           = useState(true);
  const [isOwn, setIsOwn]               = useState(false);
  const [activeTab, setActiveTab]       = useState<Tab>('About');
  const [previewAd, setPreviewAd]       = useState<Ad | null>(null);

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

  // ─── Loading / not found states ───────────────────────────────────────────

  if (loading) return (
    <div style={{ minHeight: '100vh', background: tokens.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555', fontSize: '0.88rem' }}>
      Loading profile...
    </div>
  );

  if (!profile) return (
    <div style={{ minHeight: '100vh', background: tokens.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
      <div style={{ fontSize: '2.5rem' }}>👤</div>
      <div style={{ fontWeight: 700, color: tokens.white }}>Profile not found</div>
      <div style={{ fontSize: '0.82rem', color: '#555' }}>This advertiser hasn't set up their profile yet.</div>
      <button onClick={() => router.push('/dashboard/user')} style={{ background: 'none', border: '1px solid #333', color: '#888', borderRadius: '8px', padding: '0.6rem 1.4rem', cursor: 'pointer', fontSize: '0.85rem', marginTop: '0.5rem' }}>
        ← Back to Arena
      </button>
    </div>
  );

  // ─── Derived ──────────────────────────────────────────────────────────────

  const topTier  = TIER_CONFIG[ads[0]?.tier] || TIER_CONFIG.entry;
  const tier     = previewAd ? (TIER_CONFIG[previewAd.tier] || TIER_CONFIG.entry) : topTier;
  const ytEmbed  = getYouTubeEmbedUrl(profile.youtube || '');

  // shared styles
  const card: React.CSSProperties = { background: tokens.card, border: `1px solid ${tokens.border}`, borderRadius: '12px', padding: '1.25rem', marginBottom: '0.75rem' };
  const lbl: React.CSSProperties  = { fontSize: '0.65rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' };
  const pill = (color: string): React.CSSProperties => ({ background: `${color}15`, border: `1px solid ${color}40`, color, borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.68rem', fontWeight: 700 });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: tokens.bg, color: tokens.white, fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav placeholder — no auth required for public profile */}
      <div style={{ height: '60px', borderBottom: `1px solid ${tokens.border}`, display: 'flex', alignItems: 'center', padding: '0 1.5rem', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 800, fontSize: '1rem' }}>⚡ ANTCPU ADS</span>
        <button onClick={() => router.push('/arena')} style={{ background: 'none', border: `1px solid #222`, color: '#555', borderRadius: '8px', padding: '0.4rem 0.9rem', fontSize: '0.78rem', cursor: 'pointer' }}>
          🏟 Arena
        </button>
      </div>

      <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '2rem 1.25rem 6rem' }}>

        {/* ── Two-column layout — stacks on mobile ── */}
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

          {/* ── LEFT — Ad preview + brand identity ── */}
          <div style={{ flex: '0 0 280px', minWidth: '240px' }}>

            <div style={lbl}>Ad Preview</div>

            {/* Ad card */}
            <div
              onClick={() => previewAd && window.open(previewAd.url, '_blank')}
              style={{ background: tokens.card, border: `1px solid ${tier.color}33`, borderRadius: '14px', padding: '1.5rem', minHeight: '180px', cursor: previewAd ? 'pointer' : 'default', marginBottom: '1rem' }}
            >
              {previewAd ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: tier.color }}>{profile.brand}</span>
                    <span style={pill(tier.color)}>{tier.label.toUpperCase()}</span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem' }}>{previewAd.title}</div>
                  <div style={{ fontSize: '0.78rem', color: '#888', lineHeight: 1.5, marginBottom: '0.75rem' }}>{previewAd.description}</div>
                  <div style={{ fontSize: '0.72rem', color: tier.color, fontWeight: 600 }}>{previewAd.url} →</div>
                </>
              ) : (
                <div style={{ color: '#555', fontSize: '0.82rem', textAlign: 'center', paddingTop: '2rem' }}>No ads yet.</div>
              )}
            </div>

            {/* Brand identity */}
            <div style={card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{profile.brand || profile.name}</div>
                <button onClick={shareProfile} style={{ background: profileCopied ? '#22c55e' : 'transparent', border: `1px solid ${profileCopied ? '#22c55e' : '#333'}`, color: profileCopied ? '#fff' : '#555', borderRadius: '8px', padding: '0.3rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}>
                  {profileCopied ? '✓ Shared' : '↗ Share'}
                </button>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#555' }}>{profile.name}</div>
              <div style={{ fontSize: '0.72rem', color: '#444', marginTop: '0.25rem' }}>
                <span style={pill(topTier.color)}>{topTier.label.toUpperCase()}</span>
                {' '}{ads.length} AD{ads.length !== 1 ? 'S' : ''}
              </div>
              {isOwn && (
                <button onClick={() => router.push('/profile')} style={{ width: '100%', marginTop: '0.75rem', background: topTier.color, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.5rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                  ✏️ Edit Profile
                </button>
              )}
            </div>
          </div>

          {/* ── RIGHT — Tab panel ── */}
          <div style={{ flex: 1, minWidth: '280px' }}>

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
                <div style={{ fontSize: '0.88rem', color: '#aaa', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                  {profile.bio || <span style={{ color: '#555' }}>No bio yet.</span>}
                </div>
                {profile.website && (
                  <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.82rem', color: '#0070f3', textDecoration: 'none', marginBottom: '0.4rem' }}>
                    <FavIcon url={profile.website} socialKey="website" />
                    {profile.website.replace(/https?:\/\//, '')}
                  </a>
                )}
                {profile.contact && <div style={{ fontSize: '0.78rem', color: '#555' }}>📬 {profile.contact}</div>}

                {/* YouTube live embed in About tab */}
                {ytEmbed && (
                  <div style={{ marginTop: '1rem', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ ...lbl, marginBottom: '0.5rem' }}>▶ YouTube Live</div>
                    <iframe src={ytEmbed} width="100%" height="200" style={{ display: 'block', border: 'none', borderRadius: '8px' }}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                  </div>
                )}
              </div>
            )}

            {/* ── Ads ── */}
            {activeTab === 'Ads' && (
              <div style={card}>
                <div style={lbl}>{ads.length} Ad{ads.length !== 1 ? 's' : ''} in the Arena</div>
                {ads.length === 0
                  ? <div style={{ fontSize: '0.82rem', color: '#555' }}>No ads yet.</div>
                  : ads.map(ad => {
                    const t = TIER_CONFIG[ad.tier] || TIER_CONFIG.entry;
                    return (
                      <div key={ad.id} onClick={() => setPreviewAd(ad)} style={{
                        background: previewAd?.id === ad.id ? '#1a1a1a' : tokens.bg,
                        border: `1px solid ${previewAd?.id === ad.id ? t.color + '55' : tokens.border}`,
                        borderRadius: '10px', padding: '0.85rem 1rem',
                        marginBottom: '0.5rem', cursor: 'pointer',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{ad.title}</span>
                          <span style={pill(t.color)}>{t.label.toUpperCase()}</span>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#555' }}>
                          {ad.category} · {ad.status === 'active' ? '🟢 Live' : '🟡 Review'}
                          {(ad.click_count || 0) > 0 && ` · 👆 ${ad.click_count}`}
                          {(ad.points || 0) > 0 && ` · ⚡ ${ad.points} pts`}
                        </div>
                      </div>
                    );
                  })
                }
              </div>
            )}

            {/* ── Performance ── */}
            {activeTab === 'Performance' && (
              <div style={card}>
                <div style={lbl}>Performance</div>
                <div style={{ fontSize: '0.82rem', color: '#555' }}>Click tracking coming soon — antcoin rewards will appear here.</div>
              </div>
            )}

            {/* ── Upgrade ── */}
            {activeTab === 'Upgrade' && (
              <div style={card}>
                <div style={lbl}>Upgrade Path</div>
                {[
                  { tier: 'Entry',    desc: 'Text ad · standard rotation',      color: '#0070f3', active: true },
                  { tier: 'Rising',   desc: 'Custom image · Photography API',   color: '#7928ca', active: false },
                  { tier: 'Featured', desc: 'Video ad · ANTCPU AI',             color: '#ff0080', active: false },
                  { tier: 'Top Tier', desc: '🔒 Payment required · full campaign', color: '#f0883e', active: false },
                ].map(t => (
                  <div key={t.tier} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', background: tokens.bg, border: `1px solid ${tokens.border}`, borderRadius: '8px', marginBottom: '0.5rem' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: '0.85rem', color: t.color }}>{t.tier}</span>
                      <span style={{ fontSize: '0.75rem', color: '#555', marginLeft: '0.5rem' }}>{t.desc}</span>
                    </div>
                    <span style={pill(t.active ? t.color : '#555')}>{t.active ? 'ACTIVE' : 'soon'}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Connect ── */}
            {activeTab === 'Connect' && (
              <div style={card}>
                <div style={lbl}>Connect</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {CONNECT_SOCIALS.map(({ key, label }) => {
                    const val = profile[key] as string | undefined;
                    return val ? (
                      <a key={key} href={val} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.85rem', background: tokens.bg, border: `1px solid ${tokens.border}`, borderRadius: '8px', textDecoration: 'none', color: tokens.white, fontSize: '0.85rem', fontWeight: 600 }}>
                        <FavIcon url={val} socialKey={key} />
                        <span style={{ flex: 1 }}>{label}</span>
                        <span style={{ fontSize: '0.72rem', color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                          {val.replace(/https?:\/\//, '')}
                        </span>
                      </a>
                    ) : (
                      <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.85rem', background: tokens.bg, border: `1px solid ${tokens.border}`, borderRadius: '8px', opacity: 0.35 }}>
                        <FavIcon url={`https://${SOCIAL_DOMAINS[key]}`} socialKey={key} />
                        <span style={{ fontSize: '0.82rem', color: '#555' }}>{label} — not linked</span>
                      </div>
                    );
                  })}

                  {/* Antcoin wallet */}
                  {profile.antcoin_wallet && (
                    <div onClick={() => navigator.clipboard.writeText(profile.antcoin_wallet!)}
                      style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.85rem', background: tokens.bg, border: '1px solid #D4AF3740', borderRadius: '8px', cursor: 'pointer' }}>
                      <FavIcon url="https://antcpu-ads.vercel.app" socialKey="antcoin_wallet" />
                      <span style={{ fontSize: '0.82rem', color: '#D4AF37', fontWeight: 600, flex: 1 }}>
                        ⚡ {profile.antcoin_wallet.slice(0, 6)}...{profile.antcoin_wallet.slice(-4)}
                      </span>
                      <span style={{ fontSize: '0.68rem', color: '#555' }}>copy</span>
                    </div>
                  )}

                  <a href="https://discord.gg/antcpu" target="_blank" rel="noopener noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.85rem', background: '#5865F215', border: '1px solid #5865F240', borderRadius: '8px', textDecoration: 'none', color: '#5865F2', fontSize: '0.85rem', fontWeight: 600 }}>
                    <FavIcon url="https://discord.com" socialKey="discord" />
                    💬 Join the Discord →
                  </a>
                </div>
              </div>
            )}

          </div>
        </div>
        {/* ── Arena Guide card ── */}
<div style={{
  maxWidth: '680px',
  margin: '2rem auto 0',
  padding: '0 1rem 2rem',
}}>
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
        background: '#0070f3',
        border: 'none',
        color: '#fff',
        borderRadius: '9px',
        padding: '0.7rem 1.25rem',
        fontWeight: 800,
        fontSize: '0.85rem',
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 16px rgba(0,112,243,0.25)',
      }}
    >
      ⚡ Arena Guide →
    </button>
  </div>
</div>

      </div>
    </div>
  );
}
