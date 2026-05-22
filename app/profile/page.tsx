'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../components/ArenaNav';
import { clearSessionCookie } from '../lib/session';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1495909060170616884/5RthXmjPurDkhjpXkM_iQGa11-Gl-WnjGeRp-gq79piX5od5frIPqT1L-tGb-t-W06e7';

const SOCIALS = [
  { key: 'website',       label: 'Website',       icon: '🌐', placeholder: 'https://yoursite.com' },
  { key: 'twitter',       label: 'Twitter/X',     icon: '𝕏',  placeholder: 'https://twitter.com/yourhandle' },
  { key: 'instagram',     label: 'Instagram',     icon: '📸', placeholder: 'https://instagram.com/yourhandle' },
  { key: 'facebook',      label: 'Facebook',      icon: '👥', placeholder: 'https://facebook.com/yourpage' },
  { key: 'tiktok',        label: 'TikTok',        icon: '🎵', placeholder: 'https://tiktok.com/@yourhandle' },
  { key: 'youtube',       label: 'YouTube',       icon: '▶️', placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'linkedin',      label: 'LinkedIn',      icon: '💼', placeholder: 'https://linkedin.com/in/yourprofile' },
  { key: 'discord',       label: 'Discord',       icon: '💬', placeholder: 'https://discord.gg/yourserver' },
  { key: 'telegram',      label: 'Telegram',      icon: '✈️', placeholder: 'https://t.me/yourhandle' },
  { key: 'antcoin_wallet',label: 'Antcoin Wallet',icon: '🪙', placeholder: 'your@wallet.com' },
];

const LANGUAGES = [
  { code: 'en', label: 'EN', name: 'English'    },
  { code: 'ar', label: 'AR', name: 'العربية'    },
  { code: 'zh', label: 'ZH', name: '中文'        },
  { code: 'es', label: 'ES', name: 'Español'    },
  { code: 'hi', label: 'HI', name: 'हिन्दी'     },
  { code: 'pt', label: 'PT', name: 'Português'  },
  { code: 'fr', label: 'FR', name: 'Français'   },
  { code: 'it', label: 'IT', name: 'Italiano'   },
];

const EMPTY_FORM = {
  bio: '', contact: '', website: '', facebook: '', twitter: '',
  tiktok: '', youtube: '', instagram: '', linkedin: '', discord: '',
  telegram: '', antcoin_wallet: '', preferred_locale: 'en',
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser]         = useState<any>(null);
  const [form, setForm]         = useState<any>(EMPTY_FORM);
  const [origForm, setOrigForm] = useState<any>(EMPTY_FORM);
  const [loading, setLoading]   = useState(false);
  const [saved, setSaved]       = useState(false);
  const [editing, setEditing]   = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      setUser(u);
      supabase.from('ad_profiles').select('*')
        .eq('email', u.email.trim().toLowerCase())
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            const loaded = {
              bio:              data.bio              || '',
              contact:          data.contact          || '',
              website:          data.website          || '',
              facebook:         data.facebook         || '',
              twitter:          data.twitter          || '',
              tiktok:           data.tiktok           || '',
              youtube:          data.youtube          || '',
              instagram:        data.instagram        || '',
              linkedin:         data.linkedin         || '',
              discord:          data.discord          || '',
              telegram:         data.telegram         || '',
              antcoin_wallet:   data.antcoin_wallet   || '',
              preferred_locale: data.preferred_locale || 'en',
            };
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

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));
  const isDirty = JSON.stringify(form) !== JSON.stringify(origForm);

  async function handleSave() {
    setLoading(true);
    const payload = { email: user.email, name: user.name, brand: user.brand, ...form };
    await supabase.from('ad_profiles').upsert([payload], { onConflict: 'email' });
    localStorage.setItem('arena_profile', JSON.stringify(form));
    if (isDirty) {
      fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `👤 **Profile Saved**\n**Name:** ${user.name}\n**Brand:** ${user.brand}\n**Email:** ${user.email}${form.bio ? `\n**Bio:** ${form.bio.slice(0, 80)}` : ''}${form.preferred_locale !== 'en' ? `\n**Agent Lang:** ${form.preferred_locale.toUpperCase()}` : ''}`,
        }),
      }).catch(() => {});
    }
    setOrigForm(form);
    setLoading(false);
    setSaved(true);
    setHasProfile(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!hydrated || !user) return null;

  const isAdmin    = user.email === 'antcpu@gmail.com';
  const isTeam     = user.trialStatus === 'team';
  const accent     = isAdmin ? '#f0883e' : isTeam ? '#7928ca' : '#0070f3';
  const langName   = LANGUAGES.find(l => l.code === form.preferred_locale)?.name || 'English';

  const inp: React.CSSProperties = {
    width: '100%', background: '#0a0a0a', border: '1px solid #222',
    borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.88rem',
    color: '#fff', outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem',
    fontFamily: 'inherit',
  };

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav
        role={isAdmin ? 'admin' : isTeam ? 'team' : 'user'}
        userName={user.name} userEmail={user.email} userBrand={user.brand}
        trialStatus={isTeam ? 'team' : 'trial'}
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '2rem 1.5rem' }}>

        {/* HEADER */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff' }}>👤 Profile</div>
          <div style={{ color: '#555', fontSize: '0.82rem', marginTop: '0.25rem' }}>
            {user.name} · {user.brand}
            {form.preferred_locale !== 'en' && (
              <span style={{ marginLeft: '0.5rem', background: accent + '20', color: accent, borderRadius: '999px', padding: '0.1rem 0.55rem', fontSize: '0.7rem', fontWeight: 700 }}>
                🤖 {form.preferred_locale.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* VIEW MODE */}
        {hasProfile && !editing && (
          <div>
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ color: '#fff', fontSize: '0.9rem', marginBottom: '0.5rem' }}>{form.bio || '—'}</div>
              {form.contact && <div style={{ color: '#555', fontSize: '0.78rem' }}>📧 {form.contact}</div>}
              {form.preferred_locale !== 'en' && (
                <div style={{ color: '#555', fontSize: '0.75rem', marginTop: '0.5rem' }}>
                  🤖 Agent language: <strong style={{ color: accent }}>{langName}</strong>
                </div>
              )}
            </div>

            {/* Socials view */}
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
              {SOCIALS.filter(s => form[s.key]).map(s => (
                <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem' }}>{s.icon}</span>
                  <span style={{ color: '#555', fontSize: '0.75rem', minWidth: '80px' }}>{s.label}</span>
                  <a href={form[s.key]} target="_blank" rel="noopener noreferrer"
                    style={{ color: accent, fontSize: '0.78rem', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {form[s.key]}
                  </a>
                </div>
              ))}
              {!SOCIALS.some(s => form[s.key]) && (
                <div style={{ color: '#333', fontSize: '0.8rem' }}>No social links added yet.</div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setEditing(true)}
                style={{ flex: 1, background: accent, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.75rem', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
                ✏️ Edit Profile
              </button>
              <button onClick={() => router.push('/dashboard/user')}
                style={{ flex: 1, background: 'transparent', border: '1px solid #222', color: '#555', borderRadius: '8px', padding: '0.75rem', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                ← Dashboard
              </button>
            </div>
          </div>
        )}

        {/* EDIT MODE */}
        {(!hasProfile || editing) && (
          <div>
            {/* Bio */}
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ color: '#fff', fontWeight: 700, marginBottom: '1rem' }}>About Your Brand</div>

              <label style={{ color: '#888', fontSize: '0.72rem', display: 'block', marginBottom: '0.3rem' }}>Bio / What you promote</label>
              <textarea value={form.bio} onChange={e => set('bio', e.target.value)}
                placeholder="One sentence about your brand and what you offer."
                maxLength={160} rows={3}
                style={{ ...inp, resize: 'vertical' }}
              />
              <div style={{ color: '#333', fontSize: '0.68rem', textAlign: 'right', marginTop: '-0.5rem', marginBottom: '0.75rem' }}>
                {form.bio.length}/160
              </div>

              <label style={{ color: '#888', fontSize: '0.72rem', display: 'block', marginBottom: '0.3rem' }}>Contact Email</label>
              <input value={form.contact} onChange={e => set('contact', e.target.value)}
                placeholder="contact@yourbrand.com" style={inp} />
            </div>

            {/* Agent Language */}
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ color: '#fff', fontWeight: 700, marginBottom: '0.25rem' }}>🤖 Agent Language</div>
              <div style={{ color: '#555', fontSize: '0.75rem', marginBottom: '0.85rem' }}>Aria and Scout will respond in this language</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {LANGUAGES.map(lang => (
                  <button key={lang.code} onClick={() => set('preferred_locale', lang.code)}
                    style={{
                      padding: '0.35rem 0.85rem', borderRadius: '999px', cursor: 'pointer',
                      fontWeight: 700, fontSize: '0.72rem',
                      background: form.preferred_locale === lang.code ? accent : '#0a0a0a',
                      border: `1px solid ${form.preferred_locale === lang.code ? accent : '#333'}`,
                      color: form.preferred_locale === lang.code ? '#fff' : '#555',
                      transition: 'all 0.15s',
                    }}>
                    {lang.label} {lang.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Socials */}
            <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ color: '#fff', fontWeight: 700, marginBottom: '1rem' }}>Social Links</div>
              {SOCIALS.map(s => (
                <div key={s.key}>
                  <label style={{ color: '#888', fontSize: '0.72rem', display: 'block', marginBottom: '0.3rem' }}>
                    {s.icon} {s.label}
                  </label>
                  <input value={form[s.key]} onChange={e => set(s.key, e.target.value)}
                    placeholder={s.placeholder} style={inp} />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <button onClick={handleSave} disabled={loading}
                style={{ flex: 1, background: accent, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.85rem', fontWeight: 700, fontSize: '0.95rem', cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? 'Saving...' : saved ? '✅ Saved' : 'Save Profile →'}
              </button>
              {hasProfile && (
                <button onClick={() => setEditing(false)}
                  style={{ background: 'transparent', border: '1px solid #222', color: '#555', borderRadius: '8px', padding: '0.85rem 1.25rem', fontWeight: 600, fontSize: '0.88rem', cursor: 'pointer' }}>
                  Cancel
                </button>
              )}
            </div>
            <button onClick={() => router.push('/dashboard/user')}
              style={{ background: 'none', border: 'none', color: '#333', fontSize: '0.78rem', cursor: 'pointer', padding: 0 }}>
              ← Back to Dashboard
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
