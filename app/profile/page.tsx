'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../components/ArenaNav';
import Card from '../components/Card';
import SectionHeader from '../components/SectionHeader';
import Pill from '../components/Pill';
import { clearSessionCookie } from '../lib/session';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1495909060170616884/5RthXmjPurDkhjpXkM_iQGa11-Gl-WnjGeRp-gq79piX5od5frIPqT1L-tGb-t-W06e7';

const SOCIALS = [
  { key: 'website',       label: 'Website',   placeholder: 'https://yoursite.com' },
  { key: 'twitter',       label: 'Twitter/X', placeholder: 'https://twitter.com/yourhandle' },
  { key: 'instagram',     label: 'Instagram', placeholder: 'https://instagram.com/yourhandle' },
  { key: 'facebook',      label: 'Facebook',  placeholder: 'https://facebook.com/yourpage' },
  { key: 'tiktok',        label: 'TikTok',    placeholder: 'https://tiktok.com/@yourhandle' },
  { key: 'youtube',       label: 'YouTube',   placeholder: 'https://youtube.com/@yourchannel' },
  { key: 'linkedin',      label: 'LinkedIn',  placeholder: 'https://linkedin.com/in/yourprofile' },
  { key: 'discord',       label: 'Discord',   placeholder: 'https://discord.gg/yourserver' },
  { key: 'telegram',      label: 'Telegram',  placeholder: 'https://t.me/yourhandle' },
  { key: 'antcoin_wallet',label: 'Antcoin Wallet', placeholder: 'your@wallet.com' },
];

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [form, setForm] = useState<any>({ bio: '', contact: '', website: '', facebook: '', twitter: '', tiktok: '', youtube: '', instagram: '', linkedin: '', discord: '', telegram: '', antcoin_wallet: '' });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      setUser(u);
      supabase.from('ad_profiles').select('*').eq('email', u.email.trim().toLowerCase()).maybeSingle().then(({ data }) => {
        if (data) {
          setForm({
            bio: data.bio || '',
            contact: data.contact || '',
            website: data.website || '',
            facebook: data.facebook || '',
            twitter: data.twitter || '',
            tiktok: data.tiktok || '',
            youtube: data.youtube || '',
            instagram: data.instagram || '',
            linkedin: data.linkedin || '',
            discord: data.discord || '',
            telegram: data.telegram || '',
            antcoin_wallet: data.antcoin_wallet || '',
          });
          if (data.bio) setHasProfile(true);
        } else {
          setEditing(true);
        }
      });
    } catch { router.push('/'); return; }
    setHydrated(true);
  }, []);

  const set = (k: string, v: string) => setForm((f: any) => ({ ...f, [k]: v }));

  async function handleSave() {
    setLoading(true);
    const payload = { email: user.email, name: user.name, brand: user.brand, bio: form.bio, contact: form.contact, website: form.website, facebook: form.facebook, twitter: form.twitter, tiktok: form.tiktok, youtube: form.youtube, instagram: form.instagram, linkedin: form.linkedin, discord: form.discord, telegram: form.telegram, antcoin_wallet: form.antcoin_wallet };
    await supabase.from('ad_profiles').upsert([payload], { onConflict: 'email' });
    localStorage.setItem('arena_profile', JSON.stringify(form));
    // Discord notification
    fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `👤 **Profile Saved**\n**Name:** ${user.name}\n**Brand:** ${user.brand}\n**Email:** ${user.email}${form.bio ? `\n**Bio:** ${form.bio.slice(0, 80)}` : ''}${form.website ? `\n**Website:** ${form.website}` : ''}`,
      }),
    }).catch(() => {});
    setLoading(false);
    setSaved(true);
    setHasProfile(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!hydrated || !user) return null;

  const isAdmin = user.email === 'antcpu@gmail.com';
  const isTeam = user.trialStatus === 'team';
  const accentColor = isAdmin ? '#f0883e' : '#0070f3';
  const inp: React.CSSProperties = { width: '100%', background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.88rem', color: '#0a0a0a', outline: 'none', boxSizing: 'border-box', marginBottom: '0.75rem' };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav
        role={isAdmin ? 'admin' : isTeam ? 'team' : 'user'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus}
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0a0a0a' }}>👤 Profile</div>
          <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.3rem' }}>{user.name} · {user.brand}</div>
        </div>

        {/* VIEW MODE */}
        {hasProfile && !editing && (
          <>
            <Card>
              <SectionHeader title="About" />
              <div style={{ fontSize: '0.9rem', color: '#333', lineHeight: 1.7, marginBottom: '1rem' }}>{form.bio || '—'}</div>
              <div style={{ fontSize: '0.82rem', color: '#888' }}>Contact: {form.contact || '—'}</div>
            </Card>

            <Card>
              <SectionHeader title="🔗 Social Links" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {SOCIALS.map(s => form[s.key] ? (
                  <div key={s.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '8px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#555', minWidth: '110px' }}>{s.label}</span>
                    <a href={form[s.key]} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: accentColor, textDecoration: 'none', fontWeight: 600 }}>{form[s.key]}</a>
                  </div>
                ) : null)}
              </div>
            </Card>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <Pill label="✏️ Edit Profile" onClick={() => setEditing(true)} color={accentColor} />
              <Pill label="← Dashboard" onClick={() => router.push('/dashboard/user')} color="#555" outline />
            </div>
          </>
        )}

        {/* EDIT MODE */}
        {(!hasProfile || editing) && (
          <Card>
            <SectionHeader title={hasProfile ? '✏️ Edit Profile' : '👤 Complete Your Profile'} sub={hasProfile ? '' : 'Step 2 of 3 — Help the network know who you are'} />

            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Bio / What you promote</label>
            <textarea style={{ ...inp, minHeight: '90px', resize: 'vertical' }} value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="Tell the Arena what you do..." />

            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>Contact</label>
            <input style={inp} value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="email or phone" />

            <SectionHeader title="🔗 Social Links" sub="Add your handles — these show on your profile" />
            {SOCIALS.map(s => (
              <div key={s.key}>
                <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#555', display: 'block', marginBottom: '0.3rem' }}>{s.label}</label>
                <input style={inp} value={form[s.key]} onChange={e => set(s.key, e.target.value)} placeholder={s.placeholder} />
              </div>
            ))}

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Pill label={saved ? '✅ Saved!' : loading ? 'Saving...' : 'Save Profile'} onClick={handleSave} color={saved ? '#22c55e' : accentColor} />
              {hasProfile && <Pill label="Cancel" onClick={() => setEditing(false)} color="#555" outline />}
            </div>
          </Card>
        )}

        <div style={{ textAlign: 'center', padding: '2rem 0', color: '#aaa', fontSize: '0.78rem' }}>
          ⚡ ANTCPU ADS · <a href="mailto:antcpu@gmail.com" style={{ color: '#aaa' }}>antcpu@gmail.com</a>
        </div>

      </div>
    </div>
  );
}
