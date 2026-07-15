'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ArenaNav from '../components/ArenaNav';
import ArenaFooter from '../components/ArenaFooter';
import { clearSessionCookie } from '../lib/session';
import { notifyDiscord } from '../lib/discord';
import { tokens, inp as baseInp } from '../lib/shopAdStyles';

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

const SOCIAL_DOMAINS: Record<string, string> = {
  website: '', twitter: 'x.com', instagram: 'instagram.com',
  facebook: 'facebook.com', tiktok: 'tiktok.com', youtube: 'youtube.com',
  linkedin: 'linkedin.com', discord: 'discord.com', telegram: 'telegram.org',
  antcoin_wallet: 'antcpu-ads.vercel.app',
};

const SOCIALS: { key: keyof ProfileForm; label: string; placeholder: string }[] = [
  { key: 'website',       label: 'Website',       placeholder: 'https://yoursite.com' },
  { key: 'twitter',       label: 'Twitter / X',   placeholder: 'https://twitter.com/yourhandle' },
  { key: 'instagram',     label: 'Instagram',     placeholder: 'https://instagram.com/yourhandle' },
  { key: 'facebook',      label: 'Facebook',      placeholder: 'https://facebook.com/yourpage' },
  { key: 'tiktok',        label: 'TikTok',        placeholder: 'https://tiktok.com/@yourhandle' },
  { key: 'youtube',       label: 'YouTube',       placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'linkedin',      label: 'LinkedIn',      placeholder: 'https://linkedin.com/in/yourprofile' },
  { key: 'discord',       label: 'Discord',       placeholder: 'https://discord.gg/yourserver' },
  { key: 'telegram',      label: 'Telegram',      placeholder: 'https://t.me/yourhandle' },
  { key: 'antcoin_wallet',label: 'Antcoin Wallet',placeholder: 'your@wallet.com' },
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();

  const [user,       setUser]       = useState<SessionUser | null>(null);
  const [form,       setForm]       = useState<ProfileForm>(EMPTY_FORM);
  const [origForm,   setOrigForm]   = useState<ProfileForm>(EMPTY_FORM);
  const [loading,    setLoading]    = useState(false);
  const [saved,      setSaved]      = useState(false);
  const [editing,    setEditing]    = useState(false);
  const [hydrated,   setHydrated]   = useState(false);
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

  const set      = (k: keyof ProfileForm, v: string) => setForm(f => ({ ...f, [k]: v }));
  const isDirty  = JSON.stringify(form) !== JSON.stringify(origForm);

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

  // ─── Derived ──────────────────────────────────────────────────────────────
  const isAdmin  = user.role === 'super' || user.role === 'admin';
  const isTeam   = user.trialStatus === 'team';
  const accent   = isAdmin ? '#f0883e' : isTeam ? '#7928ca' : '#0070f3';
  const langName = LANGUAGES.find(l => l.code === form.preferred_locale)?.name || 'English';

  // ─── Styles ───────────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: tokens.card, border: `1px solid ${tokens.border}`, borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' };
  const lbl:  React.CSSProperties = { fontSize: '0.68rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' };
  const inp:  React.CSSProperties = { ...baseInp, background: tokens.bg, marginBottom: '0.75rem' };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background: tokens.bg, color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

      <ArenaNav
        role={isAdmin ? 'admin' : isTeam ? 'team' : 'user'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'}
        onLogout={async () => { await clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.25rem' }}>👤 Profile</div>
          <div style={{ fontSize: '0.78rem', color: '#555', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>{user.name} · {user.brand}</span>
            {form.preferred_locale !== 'en' && (
              <span style={{ background: `${accent}20`, border: `1px solid ${accent}40`, color: accent, borderRadius: '999px', padding: '0.1rem 0.5rem', fontSize: '0.65rem', fontWeight: 700 }}>
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
              <div style={{ fontSize: '0.88rem', color: '#aaa', lineHeight: 1.6, marginBottom: '0.75rem' }}>
                {form.bio || '—'}
              </div>
              {form.contact && <div style={{ fontSize: '0.82rem', color: '#555' }}>📧 {form.contact}</div>}
              {form.preferred_locale !== 'en' && (
                <div style={{ fontSize: '0.78rem', color: '#555', marginTop: '0.5rem' }}>
                  🤖 Agent language: <strong style={{ color: accent }}>{langName}</strong>
                </div>
              )}
            </div>

            {/* YouTube */}
            <div style={card}>
              <div style={lbl}>▶ {form.youtube ? 'YouTube' : 'Arena Video'}</div>
              <iframe
                src={getYouTubeEmbedUrl(form.youtube || '')}
                width="100%"
                height="200"
                style={{ borderRadius: '10px', border: 'none' }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                allowFullScreen
              />
            </div>

            {/* Socials view */}
            <div style={card}>
              <div style={lbl}>Links</div>
              {SOCIALS.filter(s => form[s.key]).map(s => (
                <a key={s.key}
                  href={(form[s.key] as string).startsWith('http') ? form[s.key] as string : `https://${form[s.key]}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0', borderBottom: `1px solid ${tokens.border}`, color: '#aaa', textDecoration: 'none', fontSize: '0.82rem' }}
                >
                  <FavIcon url={form[s.key] as string} socialKey={s.key} />
                  <span style={{ fontWeight: 600 }}>{s.label}</span>
                  <span style={{ color: '#555', fontSize: '0.72rem', marginLeft: 'auto' }}>→</span>
                </a>
              ))}
              {!SOCIALS.some(s => form[s.key]) && (
                <div style={{ fontSize: '0.82rem', color: '#555' }}>No links added yet.</div>
              )}
            </div>

            {/* Edit button */}
            <button
              onClick={() => setEditing(true)}
              style={{ width: '100%', background: accent, border: 'none', color: '#fff', borderRadius: '10px', padding: '0.85rem', fontWeight: 800, fontSize: '0.9rem', cursor: 'pointer', marginBottom: '1rem' }}
            >
              ✏️ Edit Profile
            </button>
          </>
        )}

        {/* ── EDIT MODE ── */}
        {editing && (
          <>
            <div style={card}>
              <div style={lbl}>Bio</div>
              <textarea
                value={form.bio}
                onChange={e => set('bio', e.target.value)}
                placeholder="Tell the Arena who you are..."
                rows={4}
                style={{ ...inp, resize: 'vertical', width: '100%', boxSizing: 'border-box' }}
              />
              <div style={lbl}>Contact Email</div>
              <input value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="hello@yourbrand.com" style={{ ...inp, width: '100%', boxSizing: 'border-box' }} />
            </div>

            {/* Agent language */}
            <div style={card}>
              <div style={lbl}>🤖 Agent Language</div>
              <div style={{ fontSize: '0.78rem', color: '#555', marginBottom: '0.75rem' }}>
                Aria and your antbots will write in this language.
              </div>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => set('preferred_locale', l.code)} style={{
                    background: form.preferred_locale === l.code ? accent : 'transparent',
                    border: `1px solid ${form.preferred_locale === l.code ? accent : '#333'}`,
                    color: form.preferred_locale === l.code ? '#fff' : '#555',
                    borderRadius: '8px', padding: '0.35rem 0.75rem',
                    fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                  }}>
                    {l.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Social links */}
            <div style={card}>
              <div style={lbl}>Links & Socials</div>
              {SOCIALS.map(s => (
                <div key={s.key}>
                  <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {form[s.key] && <FavIcon url={form[s.key] as string} socialKey={s.key} />}
                    {s.label}
                  </div>
                  <input
                    value={form[s.key] as string}
                    onChange={e => set(s.key, e.target.value)}
                    placeholder={s.placeholder}
                    style={{ ...inp, width: '100%', boxSizing: 'border-box' }}
                  />
                </div>
              ))}
            </div>

            {/* Save / Cancel */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <button
                onClick={handleSave}
                disabled={loading}
                style={{ flex: 1, background: saved ? '#22c55e' : accent, border: 'none', color: '#fff', borderRadius: '10px', padding: '0.85rem', fontWeight: 800, fontSize: '0.9rem', cursor: loading ? 'not-allowed' : 'pointer' }}
              >
                {loading ? 'Saving...' : saved ? '✅ Saved' : 'Save Profile'}
              </button>
              {hasProfile && (
                <button
                  onClick={() => setEditing(false)}
                  style={{ background: 'transparent', border: '1px solid #333', color: '#555', borderRadius: '10px', padding: '0.85rem 1.25rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              )}
            </div>
          </>
        )}

        {/* Public profile link */}
        <div style={{ ...card, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={lbl}>Your Public Profile</div>
            <div style={{ fontSize: '0.78rem', color: '#555' }}>
              antcpu-ads.vercel.app/profile/{encodeURIComponent(user.email)}
            </div>
          </div>
          <button
            onClick={() => router.push(`/profile/${encodeURIComponent(user.email)}`)}
            style={{ background: 'transparent', border: `1px solid ${accent}`, color: accent, borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}
          >
            View →
          </button>
        </div>

      </div>

      <ArenaFooter />
    </div>
  );
}
