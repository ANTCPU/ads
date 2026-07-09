'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getLocation } from '../lib/location';
import { getBrandConfig } from '../lib/brandConfig';
import { tokens } from '../lib/shopAdStyles';
import { sanitizeText } from '../lib/sanitize';
import VaultModal from '../components/VaultModal';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const AD_CATEGORIES = ['Brand Awareness', 'Product Launch', 'Content Promotion', 'Service Offering', 'Event', 'Other'];
const { bg, card, border, white, muted, muted2 } = tokens;

const inp: React.CSSProperties = {
  width: '100%', background: bg, border: '1px solid #222',
  borderRadius: '8px', padding: '0.9rem 1rem', color: white,
  fontSize: '1rem', boxSizing: 'border-box', marginBottom: '1.2rem',
};

function getTrialExpiry(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

async function handlePinAndRedirect(email: string, redirect: string | null) {
  const norm = email.trim().toLowerCase();
  if (norm === 'antcpu@gmail.com') {
    const pin = prompt('Enter admin PIN:');
    if (!pin) return;
    const res = await fetch('/api/admin-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
    if (!res.ok) return alert('Invalid PIN. Access denied.');
    const session = { email: norm, name: 'Antony Ciccone', brand: 'ANTCPU', trialStatus: 'team' };
    const encoded = encodeURIComponent(JSON.stringify(session));
    document.cookie = `arena_session=${encoded}; path=/; expires=${new Date(Date.now() + 90 * 864e5).toUTCString()}; SameSite=Lax`;
    localStorage.setItem('arena_user', JSON.stringify(session));
    window.location.href = redirect || '/dashboard/admin';
    return;
  }
  const pinCheck = await fetch('/api/user-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: norm, pin: '__check__' }) });
  const pinData = await pinCheck.json();
  if (pinData.error !== 'No PIN set') {
    const pin = prompt('Enter your PIN:');
    if (!pin) return;
    const verify = await fetch('/api/user-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: norm, pin }) });
    if (!verify.ok) return alert('Invalid PIN. Access denied.');
    const { user } = await verify.json();
    const session = { email: user.email, name: user.name, brand: user.brand, trialStatus: user.trialStatus };
    const encoded = encodeURIComponent(JSON.stringify(session));
    document.cookie = `arena_session=${encoded}; path=/; expires=${new Date(Date.now() + 90 * 864e5).toUTCString()}; SameSite=Lax`;
    localStorage.setItem('arena_user', JSON.stringify(session));
    window.location.href = redirect || '/dashboard/user';
    return;
  }
  const { data: userData } = await supabase.from('ad_signups').select('name, brand_name, status').eq('email', norm).maybeSingle();
  const session = { email: norm, name: userData?.name || '', brand: userData?.brand_name || '', trialStatus: userData?.status || 'trial' };
  const encoded = encodeURIComponent(JSON.stringify(session));
  document.cookie = `arena_session=${encoded}; path=/; expires=${new Date(Date.now() + 90 * 864e5).toUTCString()}; SameSite=Lax`;
  localStorage.setItem('arena_user', JSON.stringify(session));
  window.location.href = redirect || '/dashboard/user';
}

export default function Page() {
  const [hydrated,  setHydrated]  = useState(false);
  const [promo,     setPromo]     = useState('');
  const [step,      setStep]      = useState(0);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [email,     setEmail]     = useState('');
  const [form,      setForm]      = useState({ name: '', email: '', brand_name: '', ad_category: '', message: '' });

  useEffect(() => {
    fetch('/api/doorbell', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: '/login', ref: document.referrer || 'direct', ts: new Date().toISOString(), ua: navigator.userAgent }) }).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    setPromo((params.get('promo') || params.get('ref') || '').toUpperCase());
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  const brand  = getBrandConfig(promo);
  const accent = brand.accentColor;
  const gold   = brand.goldColor;
  const isBrand = promo !== '' && promo !== 'FREETRIAL';
  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleBrandCTA() {
    if (!email.trim()) return;
    setLoading(true);
    const norm = email.trim().toLowerCase();
    const loc  = await getLocation();
    const { data: existing } = await supabase.from('ad_signups').select('email').eq('email', norm).maybeSingle();
    if (!existing) {
      await supabase.from('ad_signups').insert([{
        email: norm, name: '', brand_name: brand.name,
        status: 'team', trial_days: brand.trialDays,
        trial_expiry: getTrialExpiry(brand.trialDays),
        promo_code: promo, country: loc.country, city: loc.city,
        region: loc.region, ip: loc.ip,
      }]);
    }
    localStorage.setItem('arena_user', JSON.stringify({ name: '', email: norm, brand: brand.name, trialStatus: 'team' }));
    setLoading(false);
    window.location.href = brand.ctaHref;
  }

  async function handleSubmit() {
    setLoading(true);
    const loc       = await getLocation();
    const emailNorm = form.email.trim().toLowerCase();
    const { data: existing } = await supabase.from('ad_signups').select('email').eq('email', emailNorm).maybeSingle();
    if (existing) {
      await supabase.from('ad_signups').update({ name: form.name, country: loc.country, city: loc.city, region: loc.region, ip: loc.ip }).eq('email', emailNorm);
    } else {
      await supabase.from('ad_signups').insert([{ ...form, email: emailNorm, status: 'trial', trial_days: 3, trial_expiry: getTrialExpiry(3), country: loc.country, city: loc.city, region: loc.region, ip: loc.ip }]);
    }
    localStorage.setItem('arena_user', JSON.stringify({ name: form.name, email: emailNorm, brand: form.brand_name, trialStatus: 'trial' }));
    setLoading(false);
    window.location.href = '/arena';
  }

  const btn = (on: boolean): React.CSSProperties => ({
    width: '100%', background: on ? accent : muted2, color: on ? white : muted,
    border: 'none', borderRadius: '8px', padding: '1rem', fontWeight: 700,
    fontSize: '1rem', cursor: on ? 'pointer' : 'not-allowed', marginTop: '0.5rem',
    transition: 'background 0.2s',
  });

  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', color: muted,
    marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em',
  };

  return (
    <div style={{ background: bg, color: white, fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2rem', borderBottom: `1px solid ${border}` }}>
        <span style={{ fontWeight: 800, fontSize: '1rem' }}>
          <span style={{ color: accent }}>{brand.logoEmoji}</span> {brand.name}
        </span>
        <button onClick={() => setVaultOpen(true)} style={{ background: 'none', border: '1px solid #333', color: muted, borderRadius: '8px', padding: '0.5rem 1.1rem', cursor: 'pointer', fontSize: '0.85rem' }}>
          Sign In →
        </button>
      </nav>

      {/* HERO */}
      <div style={{ textAlign: 'center', padding: '3.5rem 1.25rem 2rem' }}>
        <div style={{ display: 'inline-block', background: '#111', border: `1px solid ${accent}30`, borderRadius: '999px', padding: '0.3rem 1rem', fontSize: '0.75rem', color: gold, marginBottom: '1.5rem' }}>
          {brand.badgeText}
        </div>
        <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.2rem', background: `linear-gradient(135deg, ${white} 40%, ${gold})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          {brand.headline}<br />{brand.headlineSub}
        </h1>
        <p style={{ color: muted, fontSize: '1.1rem', maxWidth: '520px', margin: '0 auto', lineHeight: 1.6 }}>
          {brand.subText}
        </p>
      </div>

      {/* ANTHEM — brand only */}
      {isBrand && brand.youtubeId && (
        <div style={{ maxWidth: '560px', margin: '0 auto 2rem', padding: '0 1.25rem' }}>
          <div style={{ position: 'relative', paddingBottom: '56.25%', borderRadius: '14px', overflow: 'hidden', border: `1px solid ${accent}30` }}>
            <iframe src={`https://www.youtube.com/embed/${brand.youtubeId}?autoplay=0&rel=0`} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 'none' }} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
          </div>
        </div>
      )}

      {/* FORM */}
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '0 1.25rem 2rem' }}>
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '16px', padding: '2rem', marginBottom: '1rem' }}>
          {isBrand ? (
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: '0.5rem' }}>{brand.ctaLabel}</div>
              <div style={{ color: muted, fontSize: '0.85rem', marginBottom: '1.5rem' }}>{brand.trialLabel}</div>
              <label style={lbl}>Your Email</label>
              <input style={inp} type="email" placeholder="you@email.com" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
              <button style={btn(!!email.trim())} onClick={handleBrandCTA} disabled={!email.trim() || loading}>
                {loading ? 'Setting up...' : brand.ctaLabel}
              </button>
              <div style={{ fontSize: '0.72rem', color: muted2, textAlign: 'center', marginTop: '0.75rem' }}>{brand.trialLabel}</div>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.3rem', marginBottom: '1rem' }}>Start Free</div>
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                {[0, 1, 2].map(i => <div key={i} style={{ flex: 1, height: '3px', background: step >= i ? accent : '#222', borderRadius: '2px' }} />)}
              </div>
              {step === 0 && (
                <div>
                  <label style={lbl}>Your Name</label>
                  <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} />
                  <label style={lbl}>Email Address</label>
                  <input style={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                  <label style={lbl}>Brand Name</label>
                  <input style={inp} value={form.brand_name} onChange={e => set('brand_name', sanitizeText(e.target.value))} />
                  <button style={btn(!!(form.name && form.email && form.brand_name))} onClick={() => form.name && form.email && form.brand_name && setStep(1)}>Next →</button>
                </div>
              )}
              {step === 1 && (
                <div>
                  <button onClick={() => setStep(0)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem', padding: 0 }}>← Back</button>
                  <label style={lbl}>Ad Category</label>
                  <select style={{ ...inp }} value={form.ad_category} onChange={e => set('ad_category', e.target.value)}>
                    <option value="">Select category</option>
                    {AD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button style={btn(!!form.ad_category)} onClick={() => form.ad_category && setStep(2)}>Next →</button>
                </div>
              )}
              {step === 2 && (
                <div>
                  <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem', padding: 0 }}>← Back</button>
                  <label style={lbl}>Message</label>
                  <textarea style={{ ...inp, minHeight: '100px', resize: 'vertical' } as React.CSSProperties} value={form.message} onChange={e => set('message', e.target.value)} />
                  <button style={btn(true)} onClick={handleSubmit}>{loading ? 'Configuring...' : 'Start Free Trial →'}</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SIGN IN */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '16px', padding: '2rem' }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.4rem' }}>Already in the Arena?</div>
          <p style={{ color: muted, fontSize: '0.85rem', marginBottom: '1.25rem' }}>Sign in to resume your session.</p>
          <button style={{ ...btn(true), background: '#1a1a1a', border: `1px solid ${border}` }} onClick={() => setVaultOpen(true)}>
            🔒 Sign In with Vault →
          </button>
        </div>
      </div>

      <footer style={{ textAlign: 'center', padding: '2rem', color: '#333', fontSize: '0.8rem', borderTop: `1px solid ${border}` }}>
        © {new Date().getFullYear()} ANTCPU · {brand.trialLabel}
      </footer>

      <VaultModal open={vaultOpen} onClose={() => setVaultOpen(false)} onSuccess={() => {}} />
    </div>
  );
}
