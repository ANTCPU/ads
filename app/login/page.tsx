'use client';

import { useState, useEffect }              from 'react';
import { createClient }                     from '@supabase/supabase-js';
import { getLocation }                      from '../lib/location';
import { getBrandConfig }                   from '../lib/brandConfig';
import { tokens }                           from '../lib/shopAdStyles';
import { sanitizeText }                     from '../lib/sanitize';
import { detectAndStoreLocale, setStoredLocale } from '../lib/locale';
import VaultModal                           from '../components/VaultModal';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Constants ────────────────────────────────────────────────────────────────

const AD_CATEGORIES = [
  'Brand Awareness', 'Product Launch', 'Content Promotion',
  'Service Offering', 'Event', 'Other',
];

const LANGUAGES = [
  { code: 'en', label: 'EN' }, { code: 'ar', label: 'AR' },
  { code: 'zh', label: 'ZH' }, { code: 'es', label: 'ES' },
  { code: 'hi', label: 'HI' }, { code: 'pt', label: 'PT' },
  { code: 'fr', label: 'FR' }, { code: 'it', label: 'IT' },
  { code: 'id', label: 'ID' }, { code: 'vi', label: 'VI' },
  { code: 'tr', label: 'TR' }, { code: 'ko', label: 'KO' },
];

const { bg, card, border, white, muted, muted2 } = tokens;

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionUser = {
  email:       string;
  name:        string;
  brand:       string;
  trialStatus: string;
  role:        string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTrialExpiry(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ─── fireWelcomeEmail ─────────────────────────────────────────────────────────
// Gate in /api/send-welcome owns quota check + stamp + 7-day age rule.
// Discord new-signup ping fires here always — independent of email gate.

function fireWelcomeEmail(
  name:        string,
  email:       string,
  brand:       string,
  trialStatus: string,
  locale = 'en',
) {
  fetch('/api/discord-notify', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      content: `🆕 New signup · **${name || email}** · ${brand} · ${trialStatus} · ${locale}`,
      event:   'general',
    }),
  }).catch(() => {});

  fetch('/api/send-welcome', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ name, email, brand, trialStatus, preferred_locale: locale }),
  }).catch(() => {});
}

// ─── persistSession ───────────────────────────────────────────────────────────
// Single source of truth for all login paths.
// Calls /api/session/set → syncBadges → enriched data → localStorage.
// Fires doorbell with full identity after session resolves.

async function persistSession(session: SessionUser, redirect: string | null) {
  const res  = await fetch('/api/session/set', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(session),
  });
  const sync = await res.json().catch(() => ({}));

  localStorage.setItem('arena_user', JSON.stringify({
    email:          session.email,
    name:           session.name,
    brand:          session.brand,
    role:           session.role,
    trialStatus:    sync.trialStatus    || session.trialStatus,
    membershipTier: sync.membershipTier || 'trial',
    streakDays:     sync.streakDays     || 0,
    lastActiveDate: sync.lastActiveDate || null,
  }));

  if (sync.preferredLocale) setStoredLocale(sync.preferredLocale);

  // Presence ping — identity now known
  fetch('/api/doorbell', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({
      page:        '/login',
      ref:         'session',
      ts:          new Date().toISOString(),
      ua:          navigator.userAgent,
      email:       session.email,
      trialStatus: sync.trialStatus || session.trialStatus,
      name:        session.name,
      role:        session.role,
    }),
  }).catch(() => {});

  window.location.href = redirect || (
    session.role === 'super' ? '/dashboard/antcpu' :
    session.role === 'admin' ? '/dashboard/users'  :
    '/dashboard/user'
  );
}

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
  const [hydrated,  setHydrated]  = useState(false);
  const [promo,     setPromo]     = useState('');
  const [step,      setStep]      = useState(0);
  const [vaultOpen, setVaultOpen] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [email,     setEmail]     = useState('');
  const [form,      setForm]      = useState({
    name: '', email: '', brand_name: '', ad_category: '', message: '',
    preferred_locale: 'en',
  });

  useEffect(() => {
    // Anonymous doorbell — identity unknown at page load
    fetch('/api/doorbell', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        page:        '/login',
        ref:         document.referrer || 'direct',
        ts:          new Date().toISOString(),
        ua:          navigator.userAgent,
        email:       '',
        trialStatus: 'unknown',
      }),
    }).catch(() => {});

    const params = new URLSearchParams(window.location.search);
    setPromo((params.get('promo') || params.get('ref') || '').toUpperCase());

    getLocation().then(loc => {
      if (loc.country) {
        const detected = detectAndStoreLocale(loc.country);
        setForm(f => ({ ...f, preferred_locale: detected }));
      }
    });

    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  const brand   = getBrandConfig(promo);
  const accent  = brand.accentColor;
  const isBrand = promo !== '' && promo !== 'FREETRIAL';
  const set     = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  // ─── Brand CTA ────────────────────────────────────────────────────────────

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
        email:            norm,
        name:             '',
        brand_name:       brand.name,
        status:           'team',
        role:             'user',
        trial_days:       brand.trialDays,
        trial_expiry:     getTrialExpiry(brand.trialDays),
        promo_code:       promo,
        country:          loc.country,
        city:             loc.city,
        region:           loc.region,
        ip:               loc.ip,
        preferred_locale: form.preferred_locale,
      }]);
      fireWelcomeEmail('', norm, brand.name, 'team', form.preferred_locale);
    }
    const role = await fetchRole(norm);
    persistSession(
      { email: norm, name: '', brand: brand.name, trialStatus: 'team', role },
      brand.ctaHref
    );
    setLoading(false);
  }

  // ─── Standard signup ──────────────────────────────────────────────────────

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
      setStoredLocale(form.preferred_locale as any);
      fireWelcomeEmail(form.name, emailNorm, form.brand_name, 'trial', form.preferred_locale);
    }
    const role = await fetchRole(emailNorm);
    persistSession(
      { email: emailNorm, name: form.name, brand: form.brand_name, trialStatus: 'trial', role },
      '/dashboard/user'
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

        <div style={{ display: 'inline-block', background: '#111', border: '1px solid #222', borderRadius: '999px', padding: '0.35rem 1rem', fontSize: '0.72rem', color: muted, fontWeight: 700, letterSpacing: '0.08em', marginBottom: '1.5rem' }}>
          {brand.badgeText}
        </div>

        <h1 style={{ fontSize: 'clamp(2rem, 6vw, 2.8rem)', fontWeight: 900, lineHeight: 1.1, marginBottom: '0.75rem' }}>
          {brand.headline} <span style={{ color: accent }}>{brand.headlineSub}</span>
        </h1>
        <p style={{ color: muted, fontSize: '1rem', marginBottom: '2rem', lineHeight: 1.6 }}>{brand.subText}</p>

        {/* Pi Login */}
        {!isBrand && (
          <div style={{ marginBottom: '1.5rem' }}>
            <button
              onClick={async () => {
                try {
                  setLoading(true);
                  const { piAuthenticate } = await import('../lib/pi/sdk');
                  const auth = await piAuthenticate();
                  const res  = await fetch('/api/pi/auth', {
                    method:  'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body:    JSON.stringify(auth),
                  });
                  if (!res.ok) throw new Error('Pi auth failed');
                  const { user: piUser } = await res.json();
                  localStorage.setItem('arena_user', JSON.stringify(piUser));
                  window.location.href =
                    piUser.role === 'super' ? '/dashboard/antcpu' :
                    piUser.role === 'admin' ? '/dashboard/users'  :
                    '/dashboard/user';
                } catch (err: any) {
                  console.error('[Pi Login]', err);
                  setLoading(false);
                  if (err?.message?.includes('timeout') || err?.message?.includes('Pi Browser')) {
                    alert('Open this page in Pi Browser to sign in with Pi.');
                  }
                }
              }}
              disabled={loading}
              style={{
                width: '100%', background: loading ? '#1a1a1a' : '#7928ca20',
                border: '1px solid #7928ca60', color: loading ? muted : '#b388ff',
                borderRadius: '8px', padding: '1rem', fontWeight: 700,
                fontSize: '1rem', cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>π</span>
              {loading ? 'Connecting...' : 'Sign in with Pi'}
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: '1.25rem 0' }}>
              <div style={{ flex: 1, height: '1px', background: '#222' }} />
              <span style={{ fontSize: '0.72rem', color: muted, letterSpacing: '0.1em' }}>OR</span>
              <div style={{ flex: 1, height: '1px', background: '#222' }} />
            </div>
          </div>
        )}

        {/* Form card */}
        <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '16px', padding: '1.75rem' }}>
          {isBrand ? (
            <>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{brand.ctaLabel}</div>
              <div style={{ fontSize: '0.78rem', color: muted, marginBottom: '1.5rem' }}>{brand.trialLabel}</div>
              <label style={lbl}>Your Email</label>
              <input
                style={inp} type="email" inputMode="email" autoComplete="email"
                value={email} onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleBrandCTA()} autoFocus
              />
              <button onClick={handleBrandCTA} disabled={loading || !email.trim()} style={btn(!loading && !!email.trim())}>
                {loading ? 'Setting up...' : brand.ctaLabel}
              </button>
              <div style={{ fontSize: '0.72rem', color: muted, textAlign: 'center', marginTop: '0.75rem' }}>{brand.trialLabel}</div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem' }}>Start Free</div>
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
                  <label style={lbl}>Language</label>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.2rem' }}>
                    {LANGUAGES.map(l => (
                      <button key={l.code} type="button"
                        onClick={() => set('preferred_locale', l.code)}
                        style={{
                          background:   form.preferred_locale === l.code ? accent : 'transparent',
                          border:       `1px solid ${form.preferred_locale === l.code ? accent : '#333'}`,
                          color:        form.preferred_locale === l.code ? '#000' : muted,
                          borderRadius: '8px', padding: '0.35rem 0.75rem',
                          fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                        }}>
                        {l.label}
                      </button>
                    ))}
                  </div>
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
                    value={form.message} onChange={e => set('message', e.target.value)}
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

        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={() => setVaultOpen(true)}
            style={{ background: 'none', border: 'none', color: muted, fontSize: '0.82rem', cursor: 'pointer', textDecoration: 'underline' }}
          >
            Already have an account? Login →
          </button>
        </div>
      </div>

      {/* VaultModal handles all returning user login + PIN */}
      <VaultModal
        open={vaultOpen}
        onClose={() => setVaultOpen(false)}
        onSuccess={() => {}}
        redirectTo={new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('redirect') || undefined}
      />

    </div>
  );
}
