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
  email: string;
  name: string;
  brand: string;
  trialStatus: string;
  role: string;
};

// PIN modal target — tracks who is being authenticated and in what mode
type PinTarget = {
  email: string;
  redirect: string | null;
  mode: 'super' | 'user';
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

// Build session cookie + localStorage — single source of truth for all login paths
async function persistSession(session: SessionUser, redirect: string | null) {
  // Set HttpOnly cookie server-side — not readable by JS, survives mobile Safari
  await fetch('/api/session/set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  });
  // Keep localStorage as UI cache only — for instant name/brand display
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Page() {
  const [hydrated, setHydrated]   = useState(false);
  const [promo, setPromo]         = useState('');
  const [step, setStep]           = useState(0);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [loading, setLoading]     = useState(false);
  const [email, setEmail]         = useState('');
  const [form, setForm]           = useState({
    name: '', email: '', brand_name: '', ad_category: '', message: '',
  });

  // ── PIN modal state ──────────────────────────────────────────────────────
  const [pinTarget, setPinTarget]   = useState<PinTarget | null>(null);
  const [pinInput, setPinInput]     = useState('');
  const [pinError, setPinError]     = useState('');
  const [pinLoading, setPinLoading] = useState(false);
  const [showPin, setShowPin]       = useState(false);

  useEffect(() => {
    fetch('/api/doorbell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        page: '/login',
        ref: document.referrer || 'direct',
        ts: new Date().toISOString(),
        ua: navigator.userAgent,
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

  // ─── Auth flow ─────────────────────────────────────────────────────────────
  // Determines whether to show PIN modal or proceed directly.
  // No hardcoded names, no prompt() — all identity resolved from DB.

  async function handleLoginOrSignup(emailInput: string, redirect: string | null) {
    const norm = emailInput.trim().toLowerCase();
    if (!norm) return;

    const SUPER_EMAIL = process.env.NEXT_PUBLIC_SUPER_EMAIL || '';

    // — super admin: show PIN modal, profile fetched from DB after verify
    if (SUPER_EMAIL && norm === SUPER_EMAIL) {
      setPinTarget({ email: norm, redirect, mode: 'super' });
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
      // PIN exists — show PIN modal
      setPinTarget({ email: norm, redirect, mode: 'user' });
      return;
    }

    // — no PIN — look up profile from ad_signups directly
    const { data: userData } = await supabase
      .from('ad_signups')
      .select('name, brand_name, status, role')
      .eq('email', norm)
      .maybeSingle();

    persistSession(
      {
        email: norm,
        name: userData?.name || '',
        brand: userData?.brand_name || '',
        trialStatus: userData?.status || 'trial',
        role: userData?.role || 'user',
      },
      redirect
    );
  }

  // ─── PIN submit ────────────────────────────────────────────────────────────
  // Super: verify PIN server-side → fetch profile from DB (zero hardcoding).
  // User: verify PIN server-side → use returned user object.

  async function submitPin() {
    if (!pinTarget || !pinInput.trim()) return;
    setPinLoading(true);
    setPinError('');

    try {
      if (pinTarget.mode === 'super') {
        const res = await fetch('/api/user-auth', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: pinTarget.email, pin: pinInput }),
});
if (!res.ok) {
  setPinError('Invalid PIN. Access denied.');
  setPinLoading(false);
  return;
}
const { data: profile } = await supabase
  .from('ad_signups')
  .select('name, brand_name, status')
  .eq('email', pinTarget.email)
  .maybeSingle();

await persistSession(
  {
    email: pinTarget.email,
    name: profile?.name || '',
    brand: profile?.brand_name || '',
    trialStatus: profile?.status || 'team',
    role: 'super',
  },
  pinTarget.redirect
);


      } else {
        const res = await fetch('/api/user-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: pinTarget.email, pin: pinInput }),
        });
        if (!res.ok) {
          setPinError('Invalid PIN. Access denied.');
          setPinLoading(false);
          return;
        }
        const { user } = await res.json();
        const role = user.role || await fetchRole(pinTarget.email);
        persistSession(
          { email: user.email, name: user.name, brand: user.brand, trialStatus: user.trialStatus, role },
          pinTarget.redirect
        );
      }
    } catch {
      setPinError('Connection error. Please try again.');
    }
    setPinLoading(false);
  }

  function closePinModal() {
    setPinTarget(null);
    setPinInput('');
    setPinError('');
    setShowPin(false);
  }

  // ─── Brand CTA (team signup via promo code) ────────────────────────────────

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
        email: norm,
        name: '',
        brand_name: brand.name,
        status: 'team',
        role: 'user',
        trial_days: brand.trialDays,
        trial_expiry: getTrialExpiry(brand.trialDays),
        promo_code: promo,
        country: loc.country,
        city: loc.city,
        region: loc.region,
        ip: loc.ip,
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

  // ─── Standard free trial signup ────────────────────────────────────────────

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
        email: emailNorm,
        status: 'trial',
        role: 'user',
        trial_days: 3,
        trial_expiry: getTrialExpiry(3),
        country: loc.country,
        city: loc.city,
        region: loc.region,
        ip: loc.ip,
      }]);
      fireWelcomeEmail(form.name, emailNorm, form.brand_name, 'trial');
    }
    const role = await fetchRole(emailNorm);
    persistSession(
      { email: emailNorm, name: form.name, brand: form.brand_name, trialStatus: 'trial', role },
      '/dashboard/user'
    );
    setLoading(false);
  }

  // ─── Styles ────────────────────────────────────────────────────────────────

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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: '100vh', background: bg, color: white, fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #111' }}>
        <span style={{ fontWeight: 800, fontSize: '1rem', letterSpacing: '0.05em' }}>⚡ ANTCPU ADS</span>
        <button
          onClick={() => setVaultOpen(true)}
          style={{ background: 'transparent', border: '1px solid #222', color: '#aaa', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}
        >
          🔒 Login
        </button>
      </nav>

      {/* Hero + form */}
      <div style={{ maxWidth: '480px', margin: '0 auto', padding: '3rem 1.25rem 6rem' }}>

        {/* Badge */}
        <div style={{ display: 'inline-block', background: '#111', border: '1px solid #222', borderRadius: '999px', padding: '0.35rem 1rem', fontSize: '0.72rem', color: muted, fontWeight: 700, letterSpacing: '0.08em', marginBottom: '1.5rem' }}>
          {brand.badgeText}
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: 'clamp(2rem, 6vw, 2.8rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '0.75rem' }}>
          {brand.headline} <span style={{ color: accent }}>{brand.headlineSub}</span>
        </h1>
        <p style={{ color: muted, fontSize: '1rem', marginBottom: '2rem', lineHeight: 1.6 }}>{brand.subText}</p>

        {/* Form card */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '16px', padding: '1.75rem' }}>

          {isBrand ? (
            /* ── Brand CTA flow ── */
            <>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{brand.ctaLabel}</div>
              <div style={{ fontSize: '0.78rem', color: muted, marginBottom: '1.5rem' }}>{brand.trialLabel}</div>
              <label style={lbl}>Your Email</label>
              <input
                style={inp}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBrandCTA()}
                autoFocus
              />
              <button onClick={handleBrandCTA} disabled={loading || !email.trim()} style={btn(!loading && !!email.trim())}>
                {loading ? 'Setting up...' : brand.ctaLabel}
              </button>
              <div style={{ fontSize: '0.72rem', color: muted, textAlign: 'center', marginTop: '0.75rem' }}>{brand.trialLabel}</div>
            </>
          ) : (
            /* ── Free trial multi-step flow ── */
            <>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem' }}>Start Free</div>

              {/* Step progress */}
              <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.5rem' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ flex: 1, height: '3px', background: step >= i ? accent : '#222', borderRadius: '2px', transition: 'background 0.2s' }} />
                ))}
              </div>

              {step === 0 && (
                <>
                  <label style={lbl}>Your Name</label>
                  <input style={inp} type="text" autoComplete="name" value={form.name} onChange={e => set('name', e.target.value)} />
                  <label style={lbl}>Email Address</label>
                  <input style={inp} type="email" inputMode="email" autoComplete="email" value={form.email} onChange={e => set('email', e.target.value)} />
                  <label style={lbl}>Brand Name</label>
                  <input style={inp} type="text" value={form.brand_name} onChange={e => set('brand_name', sanitizeText(e.target.value))} />
                  <button onClick={() => form.name && form.email && form.brand_name && setStep(1)} disabled={!form.name || !form.email || !form.brand_name} style={btn(!!(form.name && form.email && form.brand_name))}>
                    Next →
                  </button>
                </>
              )}

              {step === 1 && (
                <>
                  <button onClick={() => setStep(0)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem', padding: 0 }}>← Back</button>
                  <label style={lbl}>Ad Category</label>
                  <select style={{ ...inp, marginBottom: '1.5rem' }} value={form.ad_category} onChange={e => set('ad_category', e.target.value)}>
                    <option value="">Select category</option>
                    {AD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                  <button onClick={() => form.ad_category && setStep(2)} disabled={!form.ad_category} style={btn(!!form.ad_category)}>Next →</button>
                </>
              )}

              {step === 2 && (
                <>
                  <button onClick={() => setStep(1)} style={{ background: 'none', border: 'none', color: muted, cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem', padding: 0 }}>← Back</button>
                  <label style={lbl}>Message (optional)</label>
                  <textarea
                    style={{ ...inp, minHeight: '80px', resize: 'vertical' }}
                    value={form.message}
                    onChange={e => set('message', e.target.value)}
                    placeholder="Anything you'd like us to know..."
                  />
                  <button onClick={handleSubmit} disabled={loading} style={btn(!loading)}>
                    {loading ? 'Launching...' : 'Launch Free Trial →'}
                  </button>
                </>
              )}
            </>
          )}
        </div>

        {/* Returning user link */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={() => setVaultOpen(true)}
            style={{ background: 'none', border: 'none', color: muted, fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Already have an account? Login →
          </button>
        </div>
      </div>

      {/* ── Vault Modal (returning users) ── */}
      <VaultModal
        open={vaultOpen}
        onClose={() => setVaultOpen(false)}
        onSuccess={() => {}}
        redirectTo={new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('redirect') || undefined}
      />

      {/* ── PIN Modal (super admin + PIN users) ── */}
      {pinTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '1rem',
        }}>
          <div style={{
            background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '20px',
            padding: '2rem', width: '100%', maxWidth: '360px', boxSizing: 'border-box',
            boxShadow: '0 0 60px rgba(0,0,0,0.8)',
          }}>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔐</div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: white }}>Enter PIN</div>
              <div style={{ fontSize: '0.78rem', color: '#555', marginTop: '0.25rem' }}>{pinTarget.email}</div>
            </div>

            {/* PIN input */}
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <input
                type={showPin ? 'text' : 'password'}
                inputMode="numeric"
                autoFocus
                value={pinInput}
                onChange={e => setPinInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && submitPin()}
                placeholder="••••••"
                style={{
                  width: '100%', background: '#111', border: `1px solid ${pinError ? '#ef4444' : '#222'}`,
                  borderRadius: '10px', padding: '0.9rem 3rem 0.9rem 1rem', color: white,
                  fontSize: '1.4rem', letterSpacing: '0.3em', textAlign: 'center',
                  boxSizing: 'border-box', outline: 'none',
                }}
              />
              <button
                onClick={() => setShowPin(v => !v)}
                tabIndex={-1}
                style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#444', fontSize: '1rem', padding: '0.25rem', lineHeight: 1 }}
              >
                {showPin ? '🙈' : '👁️'}
              </button>
            </div>

            {/* Error */}
            {pinError && (
              <div style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: '0.75rem', textAlign: 'center' }}>
                {pinError}
              </div>
            )}

            {/* Confirm */}
            <button
              onClick={submitPin}
              disabled={pinLoading || !pinInput.trim()}
              style={{
                width: '100%', background: pinLoading || !pinInput.trim() ? muted2 : accent,
                border: 'none', color: pinLoading || !pinInput.trim() ? muted : '#000',
                borderRadius: '10px', padding: '0.9rem', fontWeight: 700,
                fontSize: '1rem', cursor: pinLoading || !pinInput.trim() ? 'not-allowed' : 'pointer',
                marginBottom: '0.5rem', transition: 'background 0.2s',
              }}
            >
              {pinLoading ? 'Verifying...' : 'Confirm'}
            </button>

            {/* Cancel */}
            <button
              onClick={closePinModal}
              style={{ width: '100%', background: 'transparent', border: 'none', color: '#555', fontSize: '0.82rem', cursor: 'pointer', padding: '0.5rem' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
