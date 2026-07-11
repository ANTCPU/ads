'use client';
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { getLocation } from '../lib/location';
import { getBrandConfig } from '../lib/brandConfig';
import { tokens } from '../lib/shopAdStyles';
import { sanitizeText } from '../lib/sanitize';
import VaultModal from '../components/VaultModal';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Constants ────────────────────────────────────────────────────────────────

const AD_CATEGORIES = [
  'Brand Awareness',
  'Product Launch',
  'Content Promotion',
  'Service Offering',
  'Event',
  'Other',
];

const { bg, card, border, white, muted, muted2 } = tokens;

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionUser = {
  email:        string;
  name:         string;
  brand:        string;
  trialStatus:  string;
  role:         string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTrialExpiry(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// Fire welcome email + update sent_at — fire and forget, never blocks login
function fireWelcomeEmail(name: string, email: string, brand: string, trialStatus: string) {
  fetch('/api/send-welcome', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, brand, trialStatus }),
  }).catch(() => {});
  supabase
    .from('ad_signups')
    .update({ welcome_email_sent_at: new Date().toISOString() })
    .eq('email', email)
    .then(() => {});
}

// Build session cookie + localStorage from a SessionUser object
function persistSession(session: SessionUser, redirect: string | null) {
  const encoded = encodeURIComponent(JSON.stringify(session));
  document.cookie = `arena_session=${encoded}; path=/; expires=${new Date(Date.now() + 90 * 864e5).toUTCString()}; SameSite=Lax`;
  localStorage.setItem('arena_user', JSON.stringify(session));
  window.location.href = redirect || (
    session.role === 'super' ? '/dashboard/admin' :
    session.role === 'admin' ? '/dashboard/users' :
    '/dashboard/user'
  );
}

// Fetch role from ad_signups — defaults to 'user' if not found
async function fetchRole(email: string): Promise<string> {
  const { data } = await supabase
    .from('ad_signups')
    .select('role')
    .eq('email', email)
    .maybeSingle();
  return data?.role || 'user';
}

// ─── Auth flow ────────────────────────────────────────────────────────────────

async function handlePinAndRedirect(email: string, redirect: string | null) {
  const norm = email.trim().toLowerCase();

  // — super admin path
  if (norm === 'antcpu@gmail.com') {
    const pin = prompt('Enter admin PIN:');
    if (!pin) return;
    const res = await fetch('/api/admin-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    });
    if (!res.ok) return alert('Invalid PIN. Access denied.');
    persistSession(
      { email: norm, name: 'Antony Ciccone', brand: 'ANTCPU', trialStatus: 'team', role: 'super' },
      redirect
    );
    return;
  }

  // — check if user has a PIN set
  const pinCheck = await fetch('/api/user-auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: norm, pin: '__check__' }),
  });
  const pinData = await pinCheck.json();

  if (pinData.error !== 'No PIN set') {
    // — PIN exists — verify it
    const pin = prompt('Enter your PIN:');
    if (!pin) return;
    const verify = await fetch('/api/user-auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: norm, pin }),
    });
    if (!verify.ok) return alert('Invalid PIN. Access denied.');
    const { user } = await verify.json();
    const role = await fetchRole(norm);
    persistSession(
      { email: user.email, name: user.name, brand: user.brand, trialStatus: user.trialStatus, role },
      redirect
    );
    return;
  }

  // — no PIN — look up from ad_signups directly
  const { data: userData } = await supabase
    .from('ad_signups')
    .select('name, brand_name, status, role')
    .eq('email', norm)
    .maybeSingle();

  persistSession(
    {
      email:       norm,
      name:        userData?.name        || '',
      brand:       userData?.brand_name  || '',
      trialStatus: userData?.status      || 'trial',
      role:        userData?.role        || 'user',
    },
    redirect
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const [hydrated, setHydrated] = useState(false);
  const [promo, setPromo]       = useState('');
  const [step, setStep]         = useState(0);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [email, setEmail]       = useState('');
  const [form, setForm]         = useState({
    name: '', email: '', brand_name: '', ad_category: '', message: '',
  });

  useEffect(() => {
    fetch('/api/doorbell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: '/login',
        ref:  document.referrer || 'direct',
        ts:   new Date().toISOString(),
        ua:   navigator.userAgent,
      }),
    }).catch(() => {});
    const params = new URLSearchParams(window.location.search);
    setPromo((params.get('promo') || params.get('ref') || '').toUpperCase());
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  const brand   = getBrandConfig(promo);
  const accent  = brand.accentColor;
  const isBrand = promo !== '' && promo !== 'FREETRIAL';
  const set     = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // — brand CTA (team signup via promo code)
  async function handleBrandCTA() {
    if (!email.trim()) return;
    setLoading(true);
    const norm = email.trim().toLowerCase();
    const loc  = await getLocation();
    const { data: existing } = await supabase
      .from('ad_signups')
      .select('email')
      .eq('email', norm)
      .maybeSingle();
    if (!existing) {
      await supabase.from('ad_signups').insert([{
        email:        norm,
        name:         '',
        brand_name:   brand.name,
        status:       'team',
        role:         'user',
        trial_days:   brand.trialDays,
        trial_expiry: getTrialExpiry(brand.trialDays),
        promo_code:   promo,
        country:      loc.country,
        city:         loc.city,
        region:       loc.region,
        ip:           loc.ip,
      }]);
      fireWelcomeEmail('', norm, brand.name, 'team');
    }
    const role = await fetchRole(norm);
    persistSession(
      { email: norm, name: '', brand: brand.name, trialStatus: 'team', role },
      brand.ctaHref
    );
    setLoading(false);
  }

  // — standard free trial signup
  async function handleSubmit() {
    setLoading(true);
    const loc       = await getLocation();
    const emailNorm = form.email.trim().toLowerCase();
    const { data: existing } = await supabase
      .from('ad_signups')
      .select('email')
      .eq('email', emailNorm)
      .maybeSingle();
    if (existing) {
      await supabase.from('ad_signups').update({
        name: form.name, country: loc.country, city: loc.city,
        region: loc.region, ip: loc.ip,
      }).eq('email', emailNorm);
    } else {
      await supabase.from('ad_signups').insert([{
        ...form,
        email:        emailNorm,
        status:       'trial',
        role:         'user',
        trial_days:   3,
        trial_expiry: getTrialExpiry(3),
        country:      loc.country,
        city:         loc.city,
        region:       loc.region,
        ip:           loc.ip,
      }]);
      fireWelcomeEmail(form.name, emailNorm, form.brand_name, 'trial');
    }
    const role = await fetchRole(emailNorm);
    persistSession(
      { email: emailNorm, name: form.name, brand: form.brand_name, trialStatus: 'trial', role },
      '/arena'
    );
    setLoading(false);
  }

  // ─── Styles ───────────────────────────────────────────────────────────────

  const inp: React.CSSProperties = {
    width: '100%', background: bg, border: '1px solid #222',
    borderRadius: '8px', padding: '0.9rem 1rem', color: white,
    fontSize: '1rem', boxSizing: 'border-box', marginBottom: '1.2rem',
  };

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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: bg, color: white, fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', borderBottom: `1px solid ${border}` }}>
        <span style={{ fontWeight: 800, fontSize: '1.1rem', color: accent }}>⚡ ANTCPU ADS</span>
        <button
          onClick={() => setVaultOpen(true)}
          style={{ background: 'none', border: `1px solid ${border}`, color: muted, borderRadius: '8px', padding: '0.4rem 1rem', cursor: 'pointer', fontSize: '0.85rem' }}
        >
          🔒 Sign In
        </button>
      </nav>

      {/* Hero + form */}
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '3rem 1.5rem 1rem' }}>

        {/* Badge */}
        <div style={{ display: 'inline-block', background: `${accent}15`, border: `1px solid ${accent}30`, color: accent, borderRadius: '999px', padding: '0.3rem 1rem', fontSize: '0.78rem', fontWeight: 700, marginBottom: '1.5rem' }}>
          {brand.badgeText}
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.4rem)', fontWeight: 800, lineHeight: 1.15, marginBottom: '0.75rem' }}>
          {brand.headline} <span style={{ color: accent }}>{brand.headlineSub}</span>
        </h1>
        <p style={{ color: muted, fontSize: '1rem', marginBottom: '2rem' }}>{brand.subText}</p>

        {/* Form card */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '16px', padding: '2rem' }}>

          {isBrand ? (
            /* ── Brand CTA flow ── */
            <>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{brand.ctaLabel}</div>
              <div style={{ color: muted, fontSize: '0.85rem', marginBottom: '1.5rem' }}>{brand.trialLabel}</div>
              <label style={lbl}>Your Email</label>
              <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} autoFocus />
              <button style={btn(!!email.trim())} onClick={handleBrandCTA} disabled={!email.trim() || loading}>
                {loading ? 'Setting up...' : brand.ctaLabel}
              </button>
              <div style={{ color: muted, fontSize: '0.78rem', textAlign: 'center', marginTop: '0.75rem' }}>{brand.trialLabel}</div>
            </>
          ) : (
            /* ── Free trial multi-step flow ── */
            <>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '1.5rem' }}>Start Free</div>

              {/* Step progress */}
              <div style={{ display: 'flex', gap: '6px', marginBottom: '1.5rem' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ flex: 1, height: '3px', background: step >= i ? accent : '#222', borderRadius: '2px' }} />
                ))}
              </div>

              {step === 0 && (
                <>
                  <label style={lbl}>Your Name</label>
                  <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} />
                  <label style={lbl}>Email Address</label>
                  <input style={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} />
                  <label style={lbl}>Brand Name</label>
                  <input style={inp} value={form.brand_name} onChange={e => set('brand_name', sanitizeText(e.target.value))} />
                  <button style={btn(!!(form.name && form.email && form.brand_name))} onClick={() => form.name && form.email && form.brand_name && setStep(1)}>
                    Next →
                  </button>
                </>
              )}

              {step === 1 && (
                <>
                  <button onClick={() => setStep(0)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem', padding: 0 }}>← Back</button>
                  <label style={lbl}>Ad Category</label>
                  <select style={{ ...inp, cursor: 'pointer' }} value={form.ad_category} onChange={e => set('ad_category', e.target.value)}>
                    <option value=''>Select category</option>
                    {AD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <button style={btn(!!form.ad_category)} onClick={() => form.ad_category && setStep(2)}>Next →</button>
                </>
              )}

              {step === 2 && (
                <>
                  <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem', padding: 0 }}>← Back</button>
                  <label style={lbl}>Message (optional)</label>
                  <textarea style={{ ...inp, minHeight: '80px', resize: 'vertical' }} value={form.message} onChange={e => set('message', e.target.value)} />
                  <button style={btn(true)} onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Launching...' : 'Launch My Ad →'}
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* Sign in link */}
        <p style={{ color: muted, fontSize: '0.78rem', textAlign: 'center', marginTop: '1.5rem' }}>
          Already in the Arena?{' '}
          <button
            onClick={() => setVaultOpen(true)}
            style={{ background: 'none', border: 'none', color: accent, cursor: 'pointer', fontSize: '0.78rem', padding: 0 }}
          >
            Sign in to resume your session.
          </button>
        </p>
      </div>

      {/* Vault modal */}
      <VaultModal open={vaultOpen} onClose={() => setVaultOpen(false)} onSuccess={() => {}} />
    </div>
  );
}
