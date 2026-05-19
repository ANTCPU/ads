'use client';
import { setSessionCookie, clearSessionCookie } from '../lib/session';
import { getLocation } from '../lib/location';

import React, { useState } from 'react';
import { MAPOFPI_KB } from '../clients/mapofpi/kb';
import { createClient } from '@supabase/supabase-js';



// ── TRIAL CONFIG ─────────────────────────────────────────────

type AdProfile = {
  name: string;
  email: string;
  brand: string;
};

type AdSignup = {
  email: string;
  brand_name: string;
  status: 'team' | 'trial' | 'pending';
};

const TEAM_CODE  = 'MAPOFPI';
const FREE_CODE  = 'FREETRIAL';
const TEAM_DAYS  = 90;
const TRIAL_DAYS = 3;

const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const DISCORD_WEBHOOK   = 'https://discord.com/api/webhooks/1495909060170616884/5RthXmjPurDkhjpXkM_iQGa11-Gl-WnjGeRp-gq79piX5od5frIPqT1L-tGb-t-W06e7';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AD_CATEGORIES = ['Brand Awareness','Product Launch','Content Promotion','Service Offering','Event','Other'];
const AD_SERVICES   = ['Google Ads','Meta (Facebook/Instagram)','TikTok Ads','Twitter/X Ads','YouTube Ads','Reddit Ads','LinkedIn Ads','Programmatic / DSP','Other','None — this is my first'];

// ── HELPERS ──────────────────────────────────────────────────
function resolveStatus(promo: string): 'team' | 'trial' | 'pending' {
  const code = promo.trim().toUpperCase();
  if (code === TEAM_CODE) return 'team';
  if (code === FREE_CODE || code === '') return 'trial';
  return 'trial';
}

function getTrialDays(status: 'team' | 'trial' | 'pending'): number {
  if (status === 'team')  return TEAM_DAYS;
  if (status === 'trial') return TRIAL_DAYS;
  return 0;
}

function getTrialExpiry(status: 'team' | 'trial' | 'pending'): string {
  const days = getTrialDays(status);
  if (!days) return '';
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

async function notifyDiscord(name: string, email: string, brand: string, status: 'team' | 'trial' | 'pending') {
  const emoji = status === 'team' ? '🔵' : status === 'trial' ? '🟢' : '🟡';
  const days  = getTrialDays(status);
  const label = status === 'team'
    ? `TEAM — ${TEAM_DAYS}-day trial (volunteer)`
    : `TRIAL — ${TRIAL_DAYS}-day free access`;
  await fetch(DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `${emoji} **New Arena Signup**\n**Name:** ${name}\n**Email:** ${email}\n**Brand:** ${brand}\n**Status:** ${label}${days ? `\n**Expires:** ${getTrialExpiry(status)}` : ''}`,
    }),
  });
}

// ── STYLES ───────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  page:        { background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' },
  nav:         { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2rem', borderBottom: '1px solid #1a1a1a', position: 'relative' as const },
  logo:        { fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' },
  hero:        { textAlign: 'center', padding: '3rem 1.25rem 2rem' },
  badge:       { display: 'inline-block', background: '#111', border: '1px solid #222', borderRadius: '999px', padding: '0.3rem 1rem', fontSize: '0.75rem', color: '#0070f3', marginBottom: '1.5rem' },
  trialBadge:  { display: 'inline-block', background: '#0070f315', border: '1px solid #0070f340', borderRadius: '999px', padding: '0.25rem 0.85rem', fontSize: '0.72rem', color: '#0070f3' },
  teamBadge:   { display: 'inline-block', background: '#7928ca15', border: '1px solid #7928ca40', borderRadius: '999px', padding: '0.25rem 0.85rem', fontSize: '0.72rem', color: '#b388ff' },
  h1:          { fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.2rem' },
  sub:         { color: '#888', fontSize: '1.1rem', maxWidth: '520px', margin: '0 auto 2rem' },
  ctaBtn:      { display: 'inline-block', background: '#0070f3', color: '#fff', padding: '0.85rem 2rem', borderRadius: '8px', fontWeight: 600, textDecoration: 'none', fontSize: '1rem', border: 'none', cursor: 'pointer' },
  ctaSecond:   { display: 'inline-block', background: 'transparent', color: '#666', padding: '0.85rem 2rem', borderRadius: '8px', fontWeight: 500, textDecoration: 'none', fontSize: '0.9rem', border: '1px solid #333', cursor: 'pointer' },
  statsBar:    { display: 'flex', justifyContent: 'center', gap: '3rem', padding: '2rem', borderTop: '1px solid #111', borderBottom: '1px solid #111', flexWrap: 'wrap' as const },
  statVal:     { fontSize: '2rem', fontWeight: 800, color: '#0070f3' },
  statLbl:     { fontSize: '0.75rem', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '0.1em' },
  section:     { maxWidth: '900px', margin: '0 auto', padding: '2.5rem 1.25rem' },
  h2:          { fontSize: '2rem', fontWeight: 700, marginBottom: '2.5rem', textAlign: 'center' as const },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' },
  card:        { background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.5rem' },
  num:         { fontSize: '2rem', fontWeight: 800, color: '#0070f3', marginBottom: '0.5rem' },
  ladder:      { display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  lrow:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '1rem 1.5rem' },
  formWrap:    { maxWidth: '560px', margin: '0 auto', padding: '2rem 1.25rem' },
  formCard:    { background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '2.5rem' },
  formTitle:   { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' },
  formSub:     { color: '#666', fontSize: '0.9rem', marginBottom: '2rem' },
  trialBanner: { background: '#0070f310', border: '1px solid #0070f330', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#0070f3', lineHeight: 1.6 },
  teamBanner:  { background: '#7928ca10', border: '1px solid #7928ca30', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#b388ff', lineHeight: 1.6 },
  label:       { display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
  input:       { width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.9rem 1rem', color: '#fff', fontSize: '1rem', boxSizing: 'border-box' as const, marginBottom: '1.2rem' },
  select:      { width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.9rem 1rem', color: '#fff', fontSize: '1rem', boxSizing: 'border-box' as const, marginBottom: '1.2rem' },
  textarea:    { width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' as const, marginBottom: '1.2rem', minHeight: '100px', resize: 'vertical' as const },
  stepBtn:     { width: '100%', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '8px', padding: '1rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' },
  stepBtnTeam: { width: '100%', background: '#7928ca', color: '#fff', border: 'none', borderRadius: '8px', padding: '1rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' },
  backBtn:     { background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem', padding: 0 },
  steps:       { display: 'flex', gap: '0.5rem', marginBottom: '2rem' },
  footer:      { textAlign: 'center' as const, padding: '2rem', color: '#333', fontSize: '0.8rem', borderTop: '1px solid #111' },
  onboard:     { maxWidth: '600px', margin: '0 auto', padding: '4rem 2rem' },
  onboardH:    { fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' },
  onboardSub:  { color: '#555', fontSize: '0.95rem', marginBottom: '1rem' },
  onboardBadge:{ display: 'inline-block', borderRadius: '999px', padding: '0.3rem 1rem', fontSize: '0.8rem', fontWeight: 700, marginBottom: '2rem' },
  track:       { display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  trackRow:    { display: 'flex', alignItems: 'center', gap: '1.2rem', background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.2rem 1.5rem' },
  trackIcon:   { fontSize: '1.4rem', minWidth: '2rem', textAlign: 'center' as const },
  trackLabel:  { fontWeight: 600, fontSize: '1rem' },
  trackDesc:   { color: '#555', fontSize: '0.85rem', marginTop: '0.2rem' },
  trackBadge:  { marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, padding: '0.25rem 0.75rem', borderRadius: '999px' },
  burger:      { background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column' as const, gap: '5px', padding: '4px' },
  burgerLine:  { width: '22px', height: '2px', background: '#fff', borderRadius: '2px' },
  dropdown:    { position: 'absolute' as const, top: '100%', right: '2rem', background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '0.5rem', minWidth: '180px', zIndex: 100 },
  dropItem:    { display: 'block', padding: '0.7rem 1rem', color: '#fff', textDecoration: 'none', fontSize: '0.9rem', borderRadius: '8px', cursor: 'pointer', background: 'none', border: 'none', width: '100%', textAlign: 'left' as const },
};

// ── Hamburger Nav ─────────────────────────────────────────────
function HamburgerNav({ userName, trialStatus, onLogout }: {
  userName: string;
  trialStatus: 'team' | 'trial' | 'pending';
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <nav style={s.nav}>
      <span style={s.logo}>⚡ ANTCPU ADS</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {trialStatus === 'team' && (
          <span style={s.teamBadge}>🔵 Team · {TEAM_DAYS}-day trial</span>
        )}
        {trialStatus === 'trial' && (
          <span style={s.trialBadge}>🟢 Free trial · {TRIAL_DAYS} days</span>
        )}
        <div style={{ position: 'relative' }}>
          <button style={s.burger} onClick={() => setOpen(o => !o)} aria-label="Menu">
            <div style={s.burgerLine} />
            <div style={s.burgerLine} />
            <div style={s.burgerLine} />
          </button>
          {open && (
            <div style={s.dropdown}>
              <div style={{ padding: '0.7rem 1rem', color: '#555', fontSize: '0.8rem', borderBottom: '1px solid #1a1a1a', marginBottom: '0.3rem' }}>
                {userName}
              </div>
              <a href="/dashboard/user" style={{ ...s.dropItem, textDecoration: 'none' }}>⚡ My Dashboard</a>
              <a href="/profile" style={{ ...s.dropItem, textDecoration: 'none' }}>👤 Profile</a>
              <a href="/create-ad" style={{ ...s.dropItem, textDecoration: 'none' }}>📢 My Ads</a>
              <div style={{ borderTop: '1px solid #1a1a1a', margin: '0.3rem 0' }} />
              <button style={{ ...s.dropItem, color: '#ff4444' }} onClick={onLogout}>← Log Out</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}


// ── Sign In Box ───────────────────────────────────────────────
function SignInBox() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignIn = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;
    setLoading(true);
    setError('');
    const { data: profileRaw } = await supabase.from('ad_profiles').select('name, email, brand').eq('email', trimmed).maybeSingle();
    const { data: signupRaw } = await supabase.from('ad_signups').select('email, brand_name, status').eq('email', trimmed).maybeSingle();
    const profile = profileRaw as AdProfile | null;
    const signup  = signupRaw  as AdSignup | null;
    if (!signup) {
      setError('No account found for ' + trimmed + '. Please sign up above.');
      setLoading(false);
      return;
    }
    const user = {
      name: profile?.name || trimmed,
      email: trimmed,
      brand: profile?.brand || signup?.brand_name || '',
      trialStatus: (signup?.status as 'team' | 'trial' | 'pending') || 'trial',
    };
    localStorage.setItem('arena_user', JSON.stringify(user));
    setSessionCookie(user);
    const p1 = new URLSearchParams(window.location.search);
    await handlePinAndRedirect(user.email, p1.get('redirect'));
  };

  return (
    <>
      <input
        type="email"
        placeholder="your@email.com"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSignIn()}
        style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' as const, marginBottom: '1rem' }}
      />
      {error && <div style={{ color: '#ff4444', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</div>}
      <button
        style={{ width: '100%', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.75rem', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}
        onClick={handleSignIn}
        disabled={loading || !email.trim()}
      >
        {loading ? 'Signing in...' : 'Sign In →'}
      </button>
    </>
  );
}

async function handlePinAndRedirect(email: string, redirect: string | null) {
  const normalizedEmail = email.trim().toLowerCase();

  // ADMIN
  if (normalizedEmail === 'antcpu@gmail.com') {
    const pin = prompt('Enter admin PIN:');
    if (pin !== process.env.NEXT_PUBLIC_ADMIN_PIN) {
      alert('Invalid PIN. Access denied.');
      return;
    }
    window.location.href = redirect || '/dashboard/antcpu';
    return;
  }

  // TEST ACCOUNT
  if (normalizedEmail === 'test@antcpu.com') {
    const pin = prompt('Enter test PIN:');
    if (pin !== '1234') {
      alert('Invalid PIN.');
      return;
    }
    window.location.href = redirect || '/dashboard/user';
    return;
  }

  // REGULAR USER — check ad_signups for saved PIN
  const { data: userData } = await supabase
    .from('ad_signups')
    .select('pin')
    .eq('email', normalizedEmail)
    .single();

  if (userData?.pin) {
    const pin = prompt('Enter your PIN:');
    if (pin !== userData.pin) {
      alert('Invalid PIN.');
      return;
    }
  }

  // No PIN set — log in normally
  window.location.href = redirect || '/dashboard/user';
}

export default function Page() {
  
  const [hydrated,     setHydrated]     = useState(false);
  const [step,         setStep]         = useState(0);
  
  const [loading,      setLoading]      = useState(false);
  const [showShare,    setShowShare]    = useState(false);
  const [trialStatus,  setTrialStatus]  = useState<'team' | 'trial' | 'pending'>('trial');
  const [form, setForm] = useState({
    name: '', email: '', brand_name: '', website_url: '',
    ad_category: '', has_used_ad_service: false, previous_ad_service: '',
    promo_code: '', message: '',
  });

  React.useEffect(() => {
    // Doorbell — track visitor
    fetch('/api/doorbell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ page: '/', ref: document.referrer || 'direct', ts: new Date().toISOString(), ua: navigator.userAgent }),
    }).catch(() => {});

    const params = new URLSearchParams(window.location.search);
    if (params.get('ref') === 'mapofpi') {
      setForm(f => ({ ...f, promo_code: TEAM_CODE }));
    } else if (params.get('ref') === 'freetrial') {
      setForm(f => ({ ...f, promo_code: FREE_CODE }));
    } else if (params.get('ref')) {
      // Any referral code — pre-fill promo_code field
      setForm(f => ({ ...f, promo_code: params.get('ref')!.toUpperCase() }));
    }
    const stored = localStorage.getItem('arena_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setForm(f => ({ ...f, name: user.name, email: user.email, brand_name: user.brand }));
        setTrialStatus(user.trialStatus || 'trial');
        setSessionCookie(user);
        const p2 = new URLSearchParams(window.location.search);
        handlePinAndRedirect(user.email, p2.get('redirect'));
      } catch {}
    }
    setHydrated(true);
  }, []);

  const handleLogout = async () => {
    
    localStorage.removeItem('arena_user');
  clearSessionCookie();
    
    setStep(0);
    setTrialStatus('trial');
    setForm({ name: '', email: '', brand_name: '', website_url: '', ad_category: '', has_used_ad_service: false, previous_ad_service: '', promo_code: '', message: '' });
  };

  if (!hydrated) return null;

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const stepDot = (active: boolean, done: boolean): React.CSSProperties => ({
    flex: 1, height: '3px', borderRadius: '2px',
    background: done ? '#0070f3' : active ? '#0070f380' : '#222',
    transition: 'background 0.3s',
  });

  const liveStatus = resolveStatus(form.promo_code);

  const handleSubmit = async () => {
    setLoading(true);
    const status = resolveStatus(form.promo_code);
    setTrialStatus(status);
    const loc = await getLocation();
    // Check if email already exists
    const { data: existing } = await supabase
      .from('ad_signups')
      .select('email, status')
      .eq('email', form.email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      // Returning user — update location + name only, preserve status
      await supabase.from('ad_signups').update({
        name:    form.name,
        country: loc.country,
        city:    loc.city,
        region:  loc.region,
        ip:      loc.ip,
      }).eq('email', form.email.trim().toLowerCase());
    } else {
      // New user — resolve referrer from promo_code
      let referredBy: string | null = null;
      const promoUpper = form.promo_code.trim().toUpperCase();
      if (promoUpper && promoUpper !== 'MAPOFPI' && promoUpper !== 'FREETRIAL') {
        const { data: referrer } = await supabase
          .from('ad_signups')
          .select('email, points')
          .eq('promo_code', promoUpper)
          .maybeSingle();
        if (referrer) {
          referredBy = referrer.email;
          // Award 10pts to referrer for trial signup
          await supabase.from('ad_signups')
            .update({ points: (referrer.points || 0) + 10 })
            .eq('email', referrer.email);
        }
      }

      // Full insert
      await supabase.from('ad_signups').insert([{
        ...form,
        email:        form.email.trim().toLowerCase(),
        status,
        trial_days:   getTrialDays(status),
        trial_expiry: getTrialExpiry(status),
        country:      loc.country,
        city:         loc.city,
        region:       loc.region,
        ip:           loc.ip,
        referred_by:  referredBy,
      }]);
      await notifyDiscord(form.name, form.email, form.brand_name, status);
    }
    const newUser = { name: form.name, email: form.email, brand: form.brand_name, trialStatus: status };
    localStorage.setItem('arena_user', JSON.stringify(newUser));
    setSessionCookie(newUser);
    // Send welcome email via Resend
    await fetch('/api/send-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: form.name, email: form.email, brand: form.brand_name, trialStatus: status }),
    });
    setLoading(false);
    setShowShare(true);
  };

  if (showShare) {
    const shareText = `I just joined ANTCPU ADS — the automated marketing network powered by AI antbots.\n\nFree 3-day trial. No credit card. Go live in minutes.\n\n→ https://antcpu-ads.vercel.app\n\n#antcpu #ads #marketing #buildinpublic`;
    return (
      <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '480px', width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>You're in the Arena.</h1>
          <p style={{ color: '#555', fontSize: '0.95rem', marginBottom: '2rem' }}>Welcome, {form.name.split(' ')[0]}. Your ad network is ready.</p>
          <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.5rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <div style={{ fontSize: '0.65rem', color: '#555', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Share the Arena</div>
            <div style={{ fontSize: '0.85rem', color: '#888', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: '1rem' }}>{shareText}</div>
            <button onClick={() => navigator.clipboard.writeText(shareText).then(() => alert('✅ Copied — ready to post'))}
              style={{ width: '100%', background: '#0070f322', border: '1px solid #0070f344', color: '#0070f3', borderRadius: '8px', padding: '0.6rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', marginBottom: '0.5rem' }}>
              📋 Copy Post Text
            </button>
          </div>
          <button onClick={async () => { const p3 = new URLSearchParams(window.location.search); await handlePinAndRedirect(form.email, p3.get('redirect')); }}
            style={{ width: '100%', background: '#0070f3', border: 'none', color: '#fff', borderRadius: '8px', padding: '0.85rem', fontSize: '1rem', fontWeight: 700, cursor: 'pointer' }}>
            Enter the Arena →
          </button>
          <p style={{ color: '#333', fontSize: '0.75rem', marginTop: '1rem' }}>or skip and go straight in</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>

      <nav style={s.nav}>
        <span style={s.logo}>⚡ ANTCPU ADS</span>
        <a href="#start" style={{ color: '#0070f3', fontSize: '0.9rem', textDecoration: 'none' }}>
          Start Free Trial →
        </a>
      </nav>

      <div style={s.hero}>
        <div style={s.badge}>⚡ Deployment Status: Active</div>
        <h1 style={s.h1}>Welcome to<br />The Arena.</h1>
        <p style={s.sub}>
          The central hub for automated marketing systems. Try free for <strong>3 days</strong> — then $9.99/month. No contracts.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' as const }}>
          <a href="#start" style={s.ctaBtn}>Start Free Trial →</a>
          <a href="#start" style={s.ctaSecond}>Team member? Use code MAPOFPI · Free trial? Use FREETRIAL</a>
        </div>
      </div>

      <div style={s.statsBar}>
        {[
          { value: 'Free',  label: '3-Day Trial' },
          { value: '$9.99', label: 'Per Month After' },
          { value: '4',     label: 'Ladder Levels' },
          { value: '∞',     label: 'Reach Potential' },
        ].map(({ value, label }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={s.statVal}>{value}</div>
            <div style={s.statLbl}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── FEATURED PARTNER — MAP OF PI ── */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 2rem 4rem' }}>
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '2rem', position: 'relative' as const, overflow: 'hidden' as const }}>
          {/* top accent line */}
          <div style={{ position: 'absolute' as const, top: 0, left: 0, right: 0, height: '3px', background: 'linear-gradient(90deg, #7928ca, #0070f3)' }} />
          {/* badge row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' as const }}>
            <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', letterSpacing: '0.1em', color: '#555', textTransform: 'uppercase' as const }}>🗺️ Featured Partner</span>
            <span style={{ fontSize: '0.7rem', background: '#7928ca15', border: '1px solid #7928ca40', borderRadius: '999px', padding: '0.2rem 0.75rem', color: '#b388ff' }}>🏆 {MAPOFPI_KB.awards[0]}</span>
            <span style={{ fontSize: '0.7rem', background: '#0070f315', border: '1px solid #0070f340', borderRadius: '999px', padding: '0.2rem 0.75rem', color: '#0070f3' }}>v{MAPOFPI_KB.version}</span>
          </div>
          {/* name + tagline */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.3rem' }}>{MAPOFPI_KB.name}</div>
            <div style={{ color: '#666', fontSize: '0.9rem', maxWidth: '560px' }}>{MAPOFPI_KB.messaging.core}</div>
          </div>
          {/* stats row */}
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' as const, marginBottom: '1.5rem', padding: '1rem', background: '#0a0a0a', borderRadius: '10px', border: '1px solid #1a1a1a' }}>
            {[
              { val: MAPOFPI_KB.stats.users,        lbl: 'Registered Users' },
              { val: MAPOFPI_KB.stats.sellers,       lbl: 'Sellers' },
              { val: MAPOFPI_KB.stats.transactions,  lbl: 'Transactions' },
              { val: MAPOFPI_KB.stats.piPrice,       lbl: 'Pi Price' },
            ].map(({ val, lbl }) => (
              <div key={lbl} style={{ textAlign: 'center' as const, flex: 1, minWidth: '80px' }}>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#0070f3' }}>{val}</div>
                <div style={{ fontSize: '0.65rem', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginTop: '0.2rem' }}>{lbl}</div>
              </div>
            ))}
          </div>
          {/* affiliation note */}
          <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '1.25rem', padding: '0.75rem 1rem', background: '#7928ca08', border: '1px solid #7928ca20', borderRadius: '8px' }}>
            🤝 {MAPOFPI_KB.antcpuAffiliation.offer} — {MAPOFPI_KB.antcpuAffiliation.goal}
          </div>
          {/* cta buttons */}
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' as const }}>
            <a href={MAPOFPI_KB.url} target="_blank" rel="noreferrer" style={{ background: '#0070f3', color: '#fff', padding: '0.65rem 1.5rem', borderRadius: '8px', fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
              Visit {MAPOFPI_KB.name} →
            </a>
            <a href="https://youtube.com/@mapofpi" target="_blank" rel="noreferrer" style={{ background: 'transparent', color: '#666', padding: '0.65rem 1.5rem', borderRadius: '8px', fontWeight: 500, textDecoration: 'none', fontSize: '0.9rem', border: '1px solid #333' }}>
              ▶ YouTube
            </a>
            <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem', color: '#444', fontFamily: 'monospace' }}>
              📹 Video Ad Creator — coming soon
            </span>
            <button onClick={() => {
              const text = `Map of Pi is the world's most used crypto global marketplace on your smartphone.\n\n✓ 2.1M+ registered users\n✓ 148,000 sellers\n✓ 173,000+ completed transactions\n\nFree to use. International. No bank account required.\n\nSearch, Buy & Sell on Map of Pi today → mapofpi.com\n\n#mapofpi #pinetwork #picommerce`;
              navigator.clipboard.writeText(text);
            }} style={{ background: '#2E7D3222', border: '1px solid #D4AF3744', color: '#D4AF37', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
              ↗ Share Map of Pi
            </button>
          </div>
        </div>
      </div>

      {/* ── MAP OF PI VIDEOS SECTION — TODO: build MapOfPiVideos component ── */}

      <div style={s.section}>
        <h2 style={s.h2}>How It Works</h2>
        <div style={s.grid}>
          {[
            { n: '01', title: 'Sign Up Free',     body: 'Get 3 days of full access. No credit card required.' },
            { n: '02', title: 'Submit Your Ad',    body: 'Title, URL, description. 2 minutes to set up.' },
            { n: '03', title: 'Go Live',           body: 'Your ad enters the network immediately.' },
            { n: '04', title: 'Promote Your Ad',   body: 'Share, refer, and engage. Points track your promotion activity.' },
          ].map(({ n, title, body }) => (
            <div key={n} style={s.card}>
              <div style={s.num}>{n}</div>
              <h3 style={{ marginBottom: '0.5rem' }}>{title}</h3>
              <p style={{ color: '#666', fontSize: '0.9rem', margin: 0 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={s.section}>
        <h2 style={s.h2}>The Promotion Ladder</h2>
        <div style={s.ladder}>
          {[
            { level: 'Entry',    pts: 'Start here', desc: 'Standard rotation across the network',           color: '#333' },
            { level: 'Rising',   pts: '🔒 Paid',    desc: 'Higher priority + increased impressions',         color: '#0070f3' },
            { level: 'Featured', pts: '🔒 Paid',    desc: 'Featured placement + cross-channel distribution', color: '#7928ca' },
            { level: 'Top Tier', pts: '🔒 Paid',    desc: 'Full network + creator channel integrations',     color: '#ff0080' },
          ].map(({ level, pts, desc, color }) => (
            <div key={level} style={{ ...s.lrow, borderLeft: `3px solid ${color}` }}>
              <div>
                <strong>{level}</strong>
                <div style={{ color: '#666', fontSize: '0.85rem' }}>{desc}</div>
              </div>
              <div style={{ color, fontWeight: 700, fontSize: '0.9rem' }}>{pts}</div>
            </div>
          ))}
        </div>
      </div>


      {/* ── PRICING TIERS ── */}
      <div style={s.section}>
        <h2 style={s.h2}>Choose Your Plan</h2>
        <p style={{ textAlign: 'center' as const, color: '#555', fontSize: '0.9rem', marginBottom: '2rem', marginTop: '-1rem' }}>
          Start free · upgrade anytime · agents unlock as you grow
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', maxWidth: '900px', margin: '0 auto' }}>

          {/* FREE */}
          <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.5rem', position: 'relative' as const }}>
            <div style={{ fontSize: '0.65rem', color: '#555', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: '0.75rem' }}>Trial</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem' }}>Free</div>
            <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '1.25rem' }}>3 days · no card required</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.5rem', marginBottom: '1.5rem' }}>
              {['Text ad in Arena', 'Aria reviews your ad 🦋', 'Basic agent previews', 'Entry tier placement'].map(f => (
                <div key={f} style={{ fontSize: '0.8rem', color: '#666', display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: '#0070f3' }}>✓</span> {f}
                </div>
              ))}
            </div>
            <a href="#start" style={{ display: 'block', textAlign: 'center' as const, background: '#0070f3', color: '#fff', padding: '0.65rem', borderRadius: '8px', fontWeight: 600, textDecoration: 'none', fontSize: '0.85rem' }}>
              Start Free →
            </a>
          </div>

          {/* $9.99 ARENA */}
          <div style={{ background: '#111', border: '2px solid #0070f3', borderRadius: '14px', padding: '1.5rem', position: 'relative' as const }}>
            <div style={{ position: 'absolute' as const, top: '-1px', left: '50%', transform: 'translateX(-50%)', background: '#0070f3', color: '#fff', fontSize: '0.6rem', fontWeight: 700, padding: '0.2rem 0.75rem', borderRadius: '0 0 6px 6px', letterSpacing: '0.1em', textTransform: 'uppercase' as const }}>Most Popular</div>
            <div style={{ fontSize: '0.65rem', color: '#0070f3', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: '0.75rem' }}>Arena</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem' }}>$9.99<span style={{ fontSize: '0.9rem', color: '#555', fontWeight: 400 }}>/mo</span></div>
            <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '1.25rem' }}>after free trial</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.5rem', marginBottom: '1.5rem' }}>
              {['Everything in Free', 'Entry tier · earn points by promoting', 'Aria + Herald messages', 'Scout basic stats 🔍', 'Earn 1-use agent actions', 'Forge ad review ⚙️'].map(f => (
                <div key={f} style={{ fontSize: '0.8rem', color: '#666', display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: '#0070f3' }}>✓</span> {f}
                </div>
              ))}
            </div>
            <a href="#start" style={{ display: 'block', textAlign: 'center' as const, background: '#0070f3', color: '#fff', padding: '0.65rem', borderRadius: '8px', fontWeight: 600, textDecoration: 'none', fontSize: '0.85rem' }}>
              Start Free Trial →
            </a>
          </div>

          {/* $27 PRO */}
          <div style={{ background: '#111', border: '1px solid #7928ca30', borderRadius: '14px', padding: '1.5rem', position: 'relative' as const, opacity: 0.8 }}>
            <div style={{ position: 'absolute' as const, top: '1rem', right: '1rem', fontSize: '0.6rem', background: '#7928ca20', color: '#b388ff', border: '1px solid #7928ca40', borderRadius: '999px', padding: '0.2rem 0.6rem', fontWeight: 700 }}>Coming Soon</div>
            <div style={{ fontSize: '0.65rem', color: '#7928ca', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: '0.75rem' }}>Pro</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem' }}>$27<span style={{ fontSize: '0.9rem', color: '#555', fontWeight: 400 }}>/mo</span></div>
            <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '1.25rem' }}>full agent suite</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.5rem', marginBottom: '1.5rem' }}>
              {['Everything in Arena', '🔒 Rising tier — payment required', 'Full agent suite unlocked', 'Herald email digest 📣', 'Scout analytics dashboard', 'Ledger billing panel 💰'].map(f => (
                <div key={f} style={{ fontSize: '0.8rem', color: '#555', display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: '#7928ca' }}>✓</span> {f}
                </div>
              ))}
            </div>
            <div style={{ display: 'block', textAlign: 'center' as const, background: '#7928ca20', color: '#b388ff', padding: '0.65rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', border: '1px solid #7928ca40' }}>
              Coming Soon
            </div>
          </div>

          {/* $79 DELUXE */}
          <div style={{ background: '#111', border: '1px solid #ff008030', borderRadius: '14px', padding: '1.5rem', position: 'relative' as const, opacity: 0.8 }}>
            <div style={{ position: 'absolute' as const, top: '1rem', right: '1rem', fontSize: '0.6rem', background: '#ff008020', color: '#ff0080', border: '1px solid #ff008040', borderRadius: '999px', padding: '0.2rem 0.6rem', fontWeight: 700 }}>Coming Soon</div>
            <div style={{ fontSize: '0.65rem', color: '#ff0080', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: '0.75rem' }}>Deluxe</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.25rem' }}>$79<span style={{ fontSize: '0.9rem', color: '#555', fontWeight: 400 }}>/mo</span></div>
            <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '1.25rem' }}>full antbot campaign</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.5rem', marginBottom: '1.5rem' }}>
              {['Everything in Pro', '🔒 Featured tier — payment required', '10-antbot campaign', 'Custom agent brand voice', 'Vault account protection 🔒', 'Weekly performance reports'].map(f => (
                <div key={f} style={{ fontSize: '0.8rem', color: '#555', display: 'flex', gap: '0.5rem' }}>
                  <span style={{ color: '#ff0080' }}>✓</span> {f}
                </div>
              ))}
            </div>
            <div style={{ display: 'block', textAlign: 'center' as const, background: '#ff008020', color: '#ff0080', padding: '0.65rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.85rem', border: '1px solid #ff008040' }}>
              Coming Soon
            </div>
          </div>

        </div>
      </div>

      <div id="start" style={s.formWrap}>
        <div style={s.formCard}>
          <div style={s.formTitle}>Start Free</div>
          <div style={s.formSub}>3 days free · then $9.99/month · cancel anytime</div>

          <div style={s.steps}>
            {[0,1,2].map(i => (
              <div key={i} style={stepDot(step === i, step > i)} />
            ))}
          </div>

          {step === 0 && (
            <div>
              <label style={s.label}>Your Name</label>
              <input style={s.input} placeholder="Antony Ciccone" value={form.name} onChange={e => set('name', e.target.value)} />
              <label style={s.label}>Email Address</label>
              <input style={s.input} type="email" placeholder="you@yourbrand.com" value={form.email} onChange={e => set('email', e.target.value)} />
              <label style={s.label}>Brand / Business Name</label>
              <input style={s.input} placeholder="Your Brand" value={form.brand_name} onChange={e => set('brand_name', e.target.value)} />
              {(!form.name || !form.email || !form.brand_name) && (
                <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: '0.75rem' }}>Fill in all fields to continue</div>
              )}
              <button style={s.stepBtn} onClick={() => setStep(1)} disabled={!form.name || !form.email || !form.brand_name}>Next →</button>
            </div>
          )}

          {step === 1 && (
            <div>
              <button style={s.backBtn} onClick={() => setStep(0)}>← Back</button>
              <label style={s.label}>Ad Category</label>
              <select style={s.select} value={form.ad_category} onChange={e => set('ad_category', e.target.value)}>
                <option value="">Select a category</option>
                {AD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <label style={s.label}>Have you run ads before?</label>
              <select style={s.select} value={form.has_used_ad_service ? 'yes' : 'no'} onChange={e => set('has_used_ad_service', e.target.value === 'yes')}>
                <option value="no">No — this is my first time</option>
                <option value="yes">Yes — I've run ads before</option>
              </select>
              {form.has_used_ad_service && (
                <>
                  <label style={s.label}>Which platform?</label>
                  <select style={s.select} value={form.previous_ad_service} onChange={e => set('previous_ad_service', e.target.value)}>
                    <option value="">Select a platform</option>
                    {AD_SERVICES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </>
              )}
              <button style={s.stepBtn} onClick={() => setStep(2)} disabled={!form.ad_category}>Next →</button>
            </div>
          )}

          {step === 2 && (
            <div>
              <button style={s.backBtn} onClick={() => setStep(1)}>← Back</button>

              {liveStatus === 'team' ? (
                <div style={s.teamBanner}>
                  🔵 <strong>Team access detected.</strong> Code MAPOFPI gives you {TEAM_DAYS} days of full access — no payment needed. Thank you for volunteering.
                </div>
              ) : (
                <div style={s.trialBanner}>
                  🟢 <strong>3-day free trial included.</strong> All features unlocked. No credit card required. Trial expires {getTrialExpiry('trial')}.
                </div>
              )}

              <label style={s.label}>
                Promo Code{' '}
                <span style={{ color: liveStatus === 'team' ? '#b388ff' : '#555' }}>
                  {liveStatus === 'team' ? '✓ Team code applied' : '(optional — team members use MAPOFPI)'}
                </span>
              </label>
              <input
                style={{
                  ...s.input,
                  borderColor: liveStatus === 'team' ? '#7928ca' : '#222',
                }}
                placeholder="MAPOFPI"
                value={form.promo_code}
                onChange={e => set('promo_code', e.target.value.toUpperCase())}
              />

              <label style={s.label}>Tell us what you want to promote</label>
              <textarea
                style={s.textarea}
                placeholder="Brief description of your ad, product, or campaign goal..."
                value={form.message}
                onChange={e => set('message', e.target.value)}
              />

              <button
                style={liveStatus === 'team' ? s.stepBtnTeam : s.stepBtn}
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading
                  ? 'Setting up your account...'
                  : liveStatus === 'team'
                  ? 'Enter the Arena — Team Access →'
                  : 'Start My Free Trial →'}
              </button>

              <p style={{ textAlign: 'center' as const, color: '#444', fontSize: '0.75rem', marginTop: '1rem' }}>
                {liveStatus === 'team'
                  ? `${TEAM_DAYS}-day team trial · full access · no payment required`
                  : `${TRIAL_DAYS}-day free trial · then $9.99/month · cancel anytime`}
              </p>
            </div>
          )}

        </div>
      </div>

      {/* ── SIGN IN SECTION ── */}
      <div id="signin" style={{ maxWidth: '480px', margin: '0 auto', padding: '2rem 2rem 4rem' }}>
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '2rem' }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.4rem' }}>Already in the Arena?</div>
          <div style={{ color: '#666', fontSize: '0.85rem', marginBottom: '1.5rem' }}>Enter your email to pick up where you left off.</div>
          <SignInBox />
        </div>
      </div>

      <footer style={s.footer}>
        © {new Date().getFullYear()} ANTCPU ·{' '}
        <a href="mailto:antcpu@gmail.com" style={{ color: '#333' }}>antcpu@gmail.com</a>
        {' · '}
        <a href="https://mapofpi.com" target="_blank" rel="noreferrer" style={{ color: '#333' }}>mapofpi.com</a>
      </footer>

    </div>
  );
}
