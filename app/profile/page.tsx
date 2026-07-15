'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ArenaNav from '../components/ArenaNav';
import ArenaFooter from '../components/ArenaFooter';
import { clearSessionCookie } from '../lib/session';
import { notifyDiscord } from '../lib/discord';
import { tokens, inp as baseInp } from '../lib/shopAdStyles';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionUser = {
  email: string; name: string; brand: string;
  trialStatus: string; role: string;
};

type ProfileForm = {
  bio: string; contact: string; website: string; facebook: string;
  twitter: string; tiktok: string; youtube: string; instagram: string;
  linkedin: string; discord: string; telegram: string;
  antcoin_wallet: string; preferred_locale: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

// Google favicon API — replaces all SVG blocks, auto-updated by platform
const SOCIAL_DOMAINS: Record<string, string> = {
  website: '', twitter: 'x.com', instagram: 'instagram.com',
  facebook: 'facebook.com', tiktok: 'tiktok.com', youtube: 'youtube.com',
  linkedin: 'linkedin.com', discord: 'discord.com', telegram: 'telegram.org',
  antcoin_wallet: 'antcpu-ads.vercel.app',
};

const SOCIALS: { key: keyof ProfileForm; label: string; placeholder: string }[] = [
  { key: 'website',        label: 'Website',        placeholder: 'https://yoursite.com' },
  { key: 'twitter',        label: 'Twitter / X',    placeholder: 'https://twitter.com/yourhandle' },
  { key: 'instagram',      label: 'Instagram',      placeholder: 'https://instagram.com/yourhandle' },
  { key: 'facebook',       label: 'Facebook',       placeholder: 'https://facebook.com/yourpage' },
  { key: 'tiktok',         label: 'TikTok',         placeholder: 'https://tiktok.com/@yourhandle' },
  { key: 'youtube',        label: 'YouTube',        placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'linkedin',       label: 'LinkedIn',       placeholder: 'https://linkedin.com/in/yourprofile' },
  { key: 'discord',        label: 'Discord',        placeholder: 'https://discord.gg/yourserver' },
  { key: 'telegram',       label: 'Telegram',       placeholder: 'https://t.me/yourhandle' },
  { key: 'antcoin_wallet', label: 'Antcoin Wallet', placeholder: 'your@wallet.com' },
];

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ar', label: 'AR', name: 'العربية' },
  { code: 'zh', label: 'ZH', name: '中文' },
  { code: 'es', label: 'ES', name: 'Español' },
  { code: 'hi', label: 'HI', name: 'हिन्दी' },
  { code: 'pt', label: 'PT', name: 'Português' },
  { code: 'fr', label: 'FR', name: 'Français' },
  { code: 'it', label: 'IT', name: 'Italiano' },
];

const EMPTY_FORM: ProfileForm = {
  bio: '', contact: '', website: '', facebook: '', twitter: '',
  tiktok: '', youtube: '', instagram: '', linkedin: '', discord: '',
  telegram: '', antcoin_wallet: '', preferred_locale: 'en',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Favicon icon — uses user's actual site favicon for website key
function FavIcon({ url, socialKey }: { url: string; socialKey: string }) {
  const domain = socialKey === 'website'
    ? (() => { try { return new URL(url).hostname; } catch { return 'globe'; } })()
    : SOCIAL_DOMAINS[socialKey];
  return (
    <img
      src={`https://www.google.com/s2/favicons?domain=${domain}&sz=32`}
      width={16} height={16} alt=""
      style={{ borderRadius: '3px', display: 'block', flexShrink: 0 }}
    />
  );
}

// YouTube channel URL → live embed URL
const ARENA_FALLBACK_VIDEO = 'PNoY1ffzciI';

function getYouTubeEmbedUrl(url: string): string {
  if (url) {
    // Direct video ID or watch URL
    const watchId = url.match(/(?:v=|youtu\.be\/|shorts\/)([\w-]{11})/)?.[1];
    if (watchId) return `https://www.youtube.com/embed/${watchId}?autoplay=0&rel=0`;
    // Channel @handle — embed latest uploads playlist
    const handle = url.match(/@([\w-]+)/)?.[1];
    if (handle) return `https://www.youtube.com/embed?listType=user_uploads&list=${handle}&autoplay=0`;
    // Channel ID
    const channelId = url.match(/channel\/([\w-]+)/)?.[1];
    if (channelId) return `https://www.youtube.com/embed?listType=user_uploads&list=${channelId}&autoplay=0`;
  }
  // No YouTube URL set — fall back to arena video
  return `https://www.youtube.com/embed/${ARENA_FALLBACK_VIDEO}?autoplay=0&rel=0`;
}


// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser]             = useState<SessionUser | null>(null);
  const [form, setForm]             = useState<ProfileForm>(EMPTY_FORM);
  const [origForm, setOrigForm]     = useState<ProfileForm>(EMPTY_FORM);
  const [loading, setLoading]       = useState(false);
  const [saved, setSaved]           = useState(false);
  const [editing, setEditing]       = useState(false);
  const [hydrated, setHydrated]     = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u: SessionUser = JSON.parse(stored);
      setUser(u);
      supabase.from('ad_profiles').select('*')
        .eq('email', u.email.trim().toLowerCase())
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            // compact load — map all keys from DB, fallback to ''
            const keys = Object.keys(EMPTY_FORM) as (keyof ProfileForm)[];
            const loaded = Object.fromEntries(
              keys.map(k => [k, data[k] || (k === 'preferred_locale' ? 'en' : '')])
            ) as ProfileForm;
            setForm(loaded);
            setOrigForm(loaded);
            if (data.bio) setHasProfile(true);
          } else {
            setEditing(true);
          }
        });
    } catch { router.push('/'); return; }
    setHydrated(true);
  }, []);

  const set = (k: keyof ProfileForm, v: string) => setForm(f => ({ ...f, [k]: v }));
  const isDirty = JSON.stringify(form) !== JSON.stringify(origForm);

  async function handleSave() {
    if (!user) return;
    setLoading(true);
    await supabase.from('ad_profiles').upsert(
      [{ email: user.email, name: user.name, brand: user.brand, ...form }],
      { onConflict: 'email' }
    );
    localStorage.setItem('arena_profile', JSON.stringify(form));
    if (isDirty) {
      notifyDiscord(
        `👤 **Profile Saved**\n**Name:** ${user.name}\n**Brand:** ${user.brand}\n**Email:** ${user.email}` +
        (form.bio ? `\n**Bio:** ${form.bio.slice(0, 80)}` : '') +
        (form.preferred_locale !== 'en' ? `\n**Agent Lang:** ${form.preferred_locale.toUpperCase()}` : '')
      );
    }
    setOrigForm(form);
    setLoading(false);
    setSaved(true);
    setHasProfile(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!hydrated || !user) return null;

  // role-based accent — no hardcoded email
  const isAdmin  = user.role === 'super' || user.role === 'admin';
  const isTeam   = user.trialStatus === 'team';
  const accent   = isAdmin ? '#f0883e' : isTeam ? '#7928ca' : '#0070f3';
  const langName = LANGUAGES.find(l => l.code === form.preferred_locale)?.name || 'English';
  {/* YouTube — always shows, falls back to arena video */}
<div>
  <div style={lbl}>▶ {profile.youtube ? 'YouTube' : '▶ Arena Video'}</div>
  <iframe
    src={getYouTubeEmbedUrl(profile.youtube || '')}
    width="100%"
    height="200"
    style={{ borderRadius: '10px', border: 'none', marginTop: '0.5rem' }}
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
    allowFullScreen
  />
</div>


  // shared style tokens from lib
  const card: React.CSSProperties = { background: tokens.card, border: `1px solid ${tokens.border}`, borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' };
  const lbl: React.CSSProperties  = { fontSize: '0.68rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' };
  const inp: React.CSSProperties  = { ...baseInp, background: tokens.bg, marginBottom: '0.75rem' };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: tokens.bg, color: tokens.white, fontFamily: 'system-ui, sans-serif' }}>

      <ArenaNav
        role={user.role as 'admin' | 'team' | 'user' | 'mod'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'}
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '600px', margin: '0 auto', padding: '5rem 1.25rem 6rem' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1.3rem' }}>👤 Profile</div>
          <div style={{ fontSize: '0.82rem', color: '#555', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <span>{user.name} · {user.brand}</span>
            {form.preferred_locale !== 'en' && (
              <span style={{ background: tokens.border, border: `1px solid #222`, borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.65rem', color: '#aaa' }}>
                🤖 {form.preferred_locale.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* ── VIEW MODE ── */}
        {hasProfile && !editing && (
          <>
            {/* Bio */}
            <div style={card}>
              <div style={lbl}>About</div>
              <div style={{ fontSize: '0.9rem', color: '#aaa', lineHeight: 1.6 }}>{form.bio || '—'}</div>
              {form.contact && <div style={{ fontSize: '0.82rem', color: '#555', marginTop: '0.75rem' }}>📧 {form.contact}</div>}
              {form.preferred_locale !== 'en' && (
                <div style={{ fontSize: '0.78rem', color: '#555', marginTop: '0.5rem' }}>
                  🤖 Agent language: <strong style={{ color: '#aaa' }}>{langName}</strong>
                </div>
              )}
            </div>

            {/* YouTube live embed */}
            {/* YouTube — always shows, falls back to arena video */}
<div>
  <div style={lbl}>▶ {profile.youtube ? 'YouTube' : '▶ Arena Video'}</div>
  <iframe
    src={getYouTubeEmbedUrl(profile.youtube || '')}
    width="100%"
    height="200"
    style={{ borderRadius: '10px', border: 'none', marginTop: '0.5rem' }}
    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
    allowFullScreen
  />
</div>


            {/* Social links */}
            <div style={card}>
              <div style={lbl}>Social Links</div>
              {SOCIALS.filter(s => form[s.key]).length === 0
                ? <div style={{ fontSize: '0.82rem', color: '#555' }}>No social links added yet.</div>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {SOCIALS.filter(s => form[s.key]).map(s => (
                      <a key={s.key} href={form[s.key]} target="_blank" rel="noopener noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.6rem 0.85rem', background: tokens.bg, border: `1px solid ${tokens.border}`, borderRadius: '8px', textDecoration: 'none', color: tokens.white, fontSize: '0.85rem', fontWeight: 600 }}
                      >
                        <FavIcon url={form[s.key]} socialKey={s.key} />
                        <span style={{ flex: 1 }}>{s.label}</span>
                        <span style={{ fontSize: '0.72rem', color: '#444', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                          {form[s.key].replace(/https?:\/\//, '')}
                        </span>
                      </a>
                    ))}
                  </div>
                )
              }
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setEditing(true)} style={{ flex: 1, background: accent, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.75rem', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                ✏️ Edit Profile
              </button>
              <button onClick={() => router.push('/dashboard/user')} style={{ flex: 1, background: 'transparent', border: `1px solid #222`, color: '#555', borderRadius: '8px', padding: '0.75rem', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                ← Dashboard
              </button>
            </div>
          </>
        )}

        {/* ── EDIT MODE ── */}
        {(!hasProfile || editing) && (
          <div style={card}>

            <div style={lbl}>About Your Brand</div>
            <textarea placeholder="Bio / What you promote" value={form.bio} onChange={e => set('bio', e.target.value)} maxLength={300}
              style={{ ...inp, minHeight: '80px', resize: 'vertical', marginBottom: '0.25rem' }} />
            <div style={{ fontSize: '0.68rem', color: '#555', textAlign: 'right', marginBottom: '0.75rem' }}>{form.bio.length}/300</div>

            <div style={lbl}>Contact Email</div>
            <input type="email" inputMode="email" placeholder="contact@yourbrand.com" value={form.contact} onChange={e => set('contact', e.target.value)} style={inp} />

            <div style={{ ...lbl, marginTop: '0.5rem' }}>Social Links</div>
            {SOCIALS.map(s => (
              <div key={s.key} style={{ position: 'relative', marginBottom: '0.65rem' }}>
                <span style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', pointerEvents: 'none', opacity: form[s.key] ? 1 : 0.3 }}>
                  <FavIcon url={form[s.key] || `https://${SOCIAL_DOMAINS[s.key]}`} socialKey={s.key} />
                </span>
                <input
                  type={s.key === 'antcoin_wallet' ? 'text' : 'url'}
                  inputMode={s.key === 'antcoin_wallet' ? 'text' : 'url'}
                  placeholder={s.placeholder}
                  value={form[s.key]}
                  onChange={e => set(s.key, e.target.value)}
                  style={{ ...inp, paddingLeft: '2.5rem', marginBottom: 0 }}
                />
              </div>
            ))}

            <div style={{ ...lbl, marginTop: '1rem' }}>Agent Language</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1.25rem' }}>
              {LANGUAGES.map(l => (
                <button key={l.code} onClick={() => set('preferred_locale', l.code)} style={{
                  background: form.preferred_locale === l.code ? accent : tokens.bg,
                  border: `1px solid ${form.preferred_locale === l.code ? accent : '#222'}`,
                  color: form.preferred_locale === l.code ? '#fff' : '#555',
                  borderRadius: '999px', padding: '0.25rem 0.75rem',
                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                }}>
                  {l.label} <span style={{ fontWeight: 400, fontSize: '0.68rem' }}>{l.name}</span>
                </button>
              ))}
            </div>

            <button onClick={handleSave} disabled={loading} style={{
              width: '100%', background: saved ? '#22c55e' : accent,
              border: 'none', color: '#fff', borderRadius: '8px',
              padding: '0.9rem', fontWeight: 700, fontSize: '0.95rem',
              cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.2s',
            }}>
              {loading ? 'Saving...' : saved ? '✅ Saved!' : 'Save Profile'}
            </button>

            {editing && (
              <button onClick={() => setEditing(false)} style={{ width: '100%', background: 'transparent', border: 'none', color: '#555', fontSize: '0.82rem', marginTop: '0.75rem', cursor: 'pointer', padding: '0.25rem' }}>
                Cancel
              </button>
            )}
          </div>
        )}

      </div>
      <ArenaFooter />
    </div>
  );
}
