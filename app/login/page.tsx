'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { setSessionCookie, clearSessionCookie } from '../lib/session';
import { checkBrand, getVerificationToken } from '../lib/brandCheck';
import { getLocation } from '../lib/location';
import { MAPOFPI_KB } from '../clients/mapofpi/kb';
import VaultModal from '../components/VaultModal';



// ── TRIAL CONFIG ─────────────────────────────────────────────

type AdProfile = {
  name: string;
  email: string;
  brand: string;
};

type AdSignup = {
  email: string;
  brand_name: string;
  status: 'team' | 'trial' | 'pending' | 'student' | 'arena';
};

const TEAM_CODE  = 'MAPOFPI';
const FREE_CODE  = 'FREETRIAL';
const TEAM_DAYS  = 90;
const TRIAL_DAYS = 3;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1495909060170616884/5RthXmjPurDkhjpXkM_iQGa11-Gl-WnjGeRp-gq79piX5od5frIPqT1L-tGb-t-W06e7';

const AD_CATEGORIES = ['Brand Awareness', 'Product Launch', 'Content Promotion', 'Service Offering', 'Event', 'Other'];
const AD_SERVICES = ['Google Ads', 'Meta (Facebook/Instagram)', 'TikTok Ads', 'Twitter/X Ads', 'YouTube Ads', 'Reddit Ads', 'LinkedIn Ads', 'Programmatic / DSP', 'Other', 'None — this is my first'];

// ── SHARED STYLES ───────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page: { background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2rem', borderBottom: '1px solid #1a1a1a', position: 'relative' },
  logo: { fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' },
  hero: { textAlign: 'center', padding: '3rem 1.25rem 2rem' },
  badge: { display: 'inline-block', background: '#111', border: '1px solid #222', borderRadius: '999px', padding: '0.3rem 1rem', fontSize: '0.75rem', color: '#0070f3', marginBottom: '1.5rem' },
  trialBadge: { display: 'inline-block', background: '#0070f315', border: '1px solid #0070f340', borderRadius: '999px', padding: '0.25rem 0.85rem', fontSize: '0.72rem', color: '#0070f3' },
  teamBadge: { display: 'inline-block', background: '#7928ca15', border: '1px solid #7928ca40', borderRadius: '999px', padding: '0.25rem 0.85rem', fontSize: '0.72rem', color: '#b388ff' },
  h1: { fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.2rem' },
  sub: { color: '#888', fontSize: '1.1rem', maxWidth: '520px', margin: '0 auto 2rem' },
  ctaBtn: { display: 'inline-block', background: '#0070f3', color: '#fff', padding: '0.85rem 2rem', borderRadius: '8px', fontWeight: 600, textDecoration: 'none', fontSize: '1rem', border: 'none', cursor: 'pointer' },
  ctaSecond: { display: 'inline-block', background: 'transparent', color: '#666', padding: '0.85rem 2rem', borderRadius: '8px', fontWeight: 500, textDecoration: 'none', fontSize: '0.9rem', border: '1px solid #333', cursor: 'pointer' },
  statsBar: { display: 'flex', justifyContent: 'center', gap: '3rem', padding: '2rem', borderTop: '1px solid #111', borderBottom: '1px solid #111', flexWrap: 'wrap' },
  statVal: { fontSize: '2rem', fontWeight: 800, color: '#0070f3' },
  statLbl: { fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: '0.1em' },
  section: { maxWidth: '900px', margin: '0 auto', padding: '2.5rem 1.25rem' },
  h2: { fontSize: '2rem', fontWeight: 700, marginBottom: '2.5rem', textAlign: 'center' },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' },
  card: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.5rem' },
  num: { fontSize: '2rem', fontWeight: 800, color: '#0070f3', marginBottom: '0.5rem' },
  ladder: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  lrow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '1rem 1.5rem' },
  formWrap: { maxWidth: '560px', margin: '0 auto', padding: '2rem 1.25rem' },
  formCard: { background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '2.5rem' },
  formTitle: { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' },
  formSub: { color: '#666', fontSize: '0.9rem', marginBottom: '2rem' },
  trialBanner: { background: '#0070f310', border: '1px solid #0070f330', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#0070f3', lineHeight: 1.6 },
  teamBanner: { background: '#7928ca10', border: '1px solid #7928ca30', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#b388ff', lineHeight: 1.6 },
  label: { display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' },
  input: { width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.9rem 1rem', color: '#fff', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '1.2rem' },
  select: { width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.9rem 1rem', color: '#fff', fontSize: '1rem', boxSizing: 'border-box', marginBottom: '1.2rem' },
  textarea: { width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '1.2rem', minHeight: '100px', resize: 'vertical' },
  stepBtn: { width: '100%', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '8px', padding: '1rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' },
  stepBtnTeam: { width: '100%', background: '#7928ca', color: '#fff', border: 'none', borderRadius: '8px', padding: '1rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' },
  backBtn: { background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem', padding: 0 },
  steps: { display: 'flex', gap: '0.5rem', marginBottom: '2rem' },
  footer: { textAlign: 'center', padding: '2rem', color: '#333', fontSize: '0.8rem', borderTop: '1px solid #111' },
  burger: { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '5px', padding: '4px' },
  burgerLine: { width: '22px', height: '2px', background: '#fff', borderRadius: '2px' },
  dropdown: { position: 'absolute', top: '100%', right: '2rem', background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '0.5rem', minWidth: '180px', zIndex: 100 },
  dropItem: { display: 'block', padding: '0.7rem 1rem', color: '#fff', textDecoration: 'none', fontSize: '0.9rem', borderRadius: '8px', cursor: 'pointer', background: 'none', border: 'none', width: '100%', textAlign: 'left' }
};

// ── UTILITIES  ────────────────────────────────────────────────────────
function resolveStatus(promo: string): 'team' | 'trial' | 'pending' {
  return promo.trim().toUpperCase() === TEAM_CODE ? 'team' : 'trial';
}

function getTrialDays(status: 'team' | 'trial' | 'pending'): number {
  return status === 'team' ? TEAM_DAYS : TRIAL_DAYS;
}

function getTrialExpiry(status: 'team' | 'trial' | 'pending'): string {
  const d = new Date();
  d.setDate(d.getDate() + getTrialDays(status));
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

async function handlePinAndRedirect(email: string, redirect: string | null) {
  const norm = email.trim().toLowerCase();

  if (norm === 'antcpu@gmail.com') {
    const pin = prompt('Enter admin PIN:');
    if (!pin) return;
    const res = await fetch('/api/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) return alert('Invalid PIN. Access denied.');
    const session = { email: norm, name: 'Antony Ciccone', brand: 'ANTCPU', trialStatus: 'team' };
    const encoded = encodeURIComponent(JSON.stringify(session));
    document.cookie = `arena_session=${encoded}; path=/; expires=${new Date(Date.now() + 90 * 864e5).toUTCString()}; SameSite=Lax`;
    localStorage.setItem('arena_user', JSON.stringify(session));
    window.location.href = redirect || '/dashboard/admin';
    return;
  }

  if (norm === 'test@antcpu.com') {
    const p = new URLSearchParams(window.location.search);
    if (p.get('token') !== 'antcpu-test-2026') {
      if (prompt('Enter test PIN:') !== '1234') return alert('Invalid PIN.');
    }
    const stored = localStorage.getItem('arena_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        u.trialStatus = 'team';
        localStorage.setItem('arena_user', JSON.stringify(u));
        document.cookie = `arena_preview=test; path=/; expires=${new Date(Date.now() + 90 * 864e5).toUTCString()}; SameSite=Lax`;
      } catch {}
    }
    window.location.href = redirect || '/dashboard/user';
    return;
  }

  // Check if user has a PIN set — verify server-side
  const pinCheck = await fetch('/api/user-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: norm, pin: '__check__' }),
  });
  const pinData = await pinCheck.json();

  if (pinData.error !== 'No PIN set') {
    // User has a PIN — prompt and verify
    const pin = prompt('Enter your PIN:');
    if (!pin) return;
    const verify = await fetch('/api/user-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: norm, pin }),
    });
    if (!verify.ok) return alert('Invalid PIN. Access denied.');
    const { user } = await verify.json();
    const session = { email: user.email, name: user.name, brand: user.brand, trialStatus: user.trialStatus };
    const encoded = encodeURIComponent(JSON.stringify(session));
    document.cookie = `arena_session=${encoded}; path=/; expires=${new Date(Date.now() + 90 * 864e5).toUTCString()}; SameSite=Lax`;
    localStorage.setItem('arena_user', JSON.stringify(session));
    window.location.href = redirect || '/dashboard/user';
    return;
  }

  // No PIN set — pass through, set session from Supabase data
  const { data: userData } = await supabase.from('ad_signups').select('name, brand_name, status').eq('email', norm).maybeSingle();
  const session = { email: norm, name: userData?.name || '', brand: userData?.brand_name || '', trialStatus: userData?.status || 'trial' };
  const encoded = encodeURIComponent(JSON.stringify(session));
  document.cookie = `arena_session=${encoded}; path=/; expires=${new Date(Date.now() + 90 * 864e5).toUTCString()}; SameSite=Lax`;
  localStorage.setItem('arena_user', JSON.stringify(session));
  window.location.href = redirect || '/dashboard/user';
}

// ── COMPONENTS ───────────────────────────────────────────────────────
function SignInBox() {
  const [vaultOpen, setVaultOpen] = useState(false);
  const redirect = typeof window !== 'undefined'
    ? new URLSearchParams(window.location.search).get('redirect')
    : null;

  return (
    <>
      <button style={s.stepBtn} onClick={() => setVaultOpen(true)}>
        🔒 Sign In with Vault →
      </button>
      <VaultModal
        open={vaultOpen}
        onClose={() => setVaultOpen(false)}
        onSuccess={() => {}}
        redirectTo={redirect || undefined}
      />
    </>
  );
}

export default function Page() {
  // Break redirect loops — clear stale session cookie if redirected here
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    if (params.get('redirect')) {
      document.cookie = 'arena_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    }
  }
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [brandCheckLoading, setBrandCheckLoading] = useState(false);
  const [brandBlocked, setBrandBlocked] = useState('');
  const [brandProtected, setBrandProtected] = useState<any>(null);
  const [trialStatus, setTrialStatus] = useState<'team' | 'trial' | 'pending'>('trial');
  const [form, setForm] = useState({ name: '', email: '', brand_name: '', website_url: '', ad_category: '', has_used_ad_service: false, previous_ad_service: '', promo_code: '', message: '' });

  useEffect(() => {
    fetch('/api/doorbell', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: '/', ref: document.referrer || 'direct', ts: new Date().toISOString(), ua: navigator.userAgent }) }).catch(() => {});
    
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref === 'mapofpi') setForm(f => ({ ...f, promo_code: TEAM_CODE }));
    else if (ref === 'freetrial') setForm(f => ({ ...f, promo_code: FREE_CODE }));
    else if (ref) setForm(f => ({ ...f, promo_code: ref.toUpperCase() }));

    const stored = localStorage.getItem('arena_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        window.location.href = user.email.toLowerCase() === 'antcpu@gmail.com' ? '/dashboard/admin' : '/dashboard/user';
        return;
      } catch {}
    }
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  const set = (k: string, v: any) => setForm(f => ({ ...f, [k]: v }));
  const liveStatus = resolveStatus(form.promo_code);

  const handleSubmit = async () => {
    setLoading(true);
    const status = resolveStatus(form.promo_code);
    const loc = await getLocation();
    const emailNorm = form.email.trim().toLowerCase();

    const { data: existing } = await supabase.from('ad_signups').select('email').eq('email', emailNorm).maybeSingle();
    if (existing) {
      await supabase.from('ad_signups').update({ name: form.name, country: loc.country, city: loc.city, region: loc.region, ip: loc.ip }).eq('email', emailNorm);
    } else {
      await supabase.from('ad_signups').insert([{ ...form, email: emailNorm, status, trial_days: getTrialDays(status), trial_expiry: getTrialExpiry(status), country: loc.country, city: loc.city, region: loc.region, ip: loc.ip }]);
      
      await fetch(DISCORD_WEBHOOK, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: `🟢 **New Signup**: ${form.name} | ${emailNorm} | Brand: ${form.brand_name}` })
      }).catch(() => {});
    }

    const newUser = { name: form.name, email: emailNorm, brand: form.brand_name, trialStatus: status };
    localStorage.setItem('arena_user', JSON.stringify(newUser));
    setSessionCookie(newUser);
    setShowShare(true);
    setLoading(false);
  };

  if (showShare) {
    return (
      <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <h1 style={s.h1}>You're in the Arena.</h1>
          <button onClick={async () => handlePinAndRedirect(form.email, new URLSearchParams(window.location.search).get('redirect'))} style={s.ctaBtn}>Enter the Arena →</button>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      <nav style={s.nav}><span style={s.logo}>⚡ ANTCPU ADS</span></nav>
      <div style={s.hero}>
        <div style={s.badge}>⚡ Deployment Status: Active</div>
        <h1 style={s.h1}>Welcome to<br />The Arena.</h1>
        <p style={s.sub}>Automated marketing infrastructure. 3 days free, then $9.99/mo.</p>
      </div>

      <div style={s.statsBar}>
        {[{ v: 'Free', l: '3-Day Trial' }, { v: '$9.99', l: 'Per Month' }, { v: '4', l: 'Ladder Levels' }].map(x => (
          <div key={x.l} style={{ textAlign: 'center' }}><div style={s.statVal}>{x.v}</div><div style={s.statLbl}>{x.l}</div></div>
        ))}
      </div>

      {/* Featured Partner: Map of Pi */}
      <div style={s.section}>
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '2rem' }}>
          <h3>{MAPOFPI_KB.name}</h3>
          <p style={{ color: '#666' }}>{MAPOFPI_KB.messaging.core}</p>
          <a href={MAPOFPI_KB.url} target="_blank" rel="noreferrer" style={s.ctaBtn}>Visit Partner Platform →</a>
        </div>
      </div>

      {/* Multi-Step Onboarding Form */}
      <div id="start" style={s.formWrap}>
        <div style={s.formCard}>
          <div style={s.formTitle}>Start Free</div>
          <div style={s.steps}>{[0, 1, 2].map(i => <div key={i} style={{ flex: 1, height: '3px', background: step >= i ? '#0070f3' : '#222' }} />)}</div>
          
          {step === 0 && (
            <div>
              <label style={s.label}>Your Name</label>
              <input style={s.input} value={form.name} onChange={e => set('name', e.target.value)} />
              <label style={s.label}>Email Address</label>
              <input style={s.input} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
              <label style={s.label}>Brand Name</label>
              <input style={s.input} value={form.brand_name} onChange={e => set('brand_name', e.target.value)} />
              <button style={s.stepBtn} onClick={() => setStep(1)} disabled={!form.name || !form.email || !form.brand_name}>Next →</button>
            </div>
          )}

          {step === 1 && (
            <div>
              <button style={s.backBtn} onClick={() => setStep(0)}>← Back</button>
              <label style={s.label}>Ad Category</label>
              <select style={s.select} value={form.ad_category} onChange={e => set('ad_category', e.target.value)}>
                <option value="">Select category</option>
                {AD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button style={s.stepBtn} onClick={() => setStep(2)} disabled={!form.ad_category}>Next →</button>
            </div>
          )}

          {step === 2 && (
            <div>
              <button style={s.backBtn} onClick={() => setStep(1)}>← Back</button>
              <label style={s.label}>Tell us what you want to promote</label>
              <textarea style={s.textarea} value={form.message} onChange={e => set('message', e.target.value)} />
              <button style={liveStatus === 'team' ? s.stepBtnTeam : s.stepBtn} onClick={handleSubmit}>{loading ? 'Configuring network...' : 'Start Free Trial →'}</button>
            </div>
          )}
        </div>
      </div>

      {/* Unified Sign In Section */}
      <div id="signin" style={s.formWrap}>
        <div style={s.formCard}>
          <div style={s.formTitle}>Already in the Arena?</div>
          <p style={s.formSub}>Enter your email to resume your session dashboard configuration.</p>
          <SignInBox />
        </div>
      </div>

      <footer style={s.footer}>© {new Date().getFullYear()} ANTCPU · antcpu@gmail.com</footer>
    </div>
  );
}
