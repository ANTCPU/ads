'use client';

import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// ── TRIAL CONFIG ─────────────────────────────────────────────
const TEAM_CODE  = 'MAPOFPI';
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
  hero:        { textAlign: 'center', padding: '5rem 2rem 3rem' },
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
  section:     { maxWidth: '900px', margin: '0 auto', padding: '4rem 2rem' },
  h2:          { fontSize: '2rem', fontWeight: 700, marginBottom: '2.5rem', textAlign: 'center' as const },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' },
  card:        { background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.5rem' },
  num:         { fontSize: '2rem', fontWeight: 800, color: '#0070f3', marginBottom: '0.5rem' },
  ladder:      { display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  lrow:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '1rem 1.5rem' },
  formWrap:    { maxWidth: '560px', margin: '0 auto', padding: '4rem 2rem' },
  formCard:    { background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '2.5rem' },
  formTitle:   { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' },
  formSub:     { color: '#666', fontSize: '0.9rem', marginBottom: '2rem' },
  trialBanner: { background: '#0070f310', border: '1px solid #0070f330', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#0070f3', lineHeight: 1.6 },
  teamBanner:  { background: '#7928ca10', border: '1px solid #7928ca30', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: '#b388ff', lineHeight: 1.6 },
  label:       { display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
  input:       { width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' as const, marginBottom: '1.2rem' },
  select:      { width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' as const, marginBottom: '1.2rem' },
  textarea:    { width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' as const, marginBottom: '1.2rem', minHeight: '100px', resize: 'vertical' as const },
  stepBtn:     { width: '100%', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.85rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' },
  stepBtnTeam: { width: '100%', background: '#7928ca', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.85rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' },
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
              <a href="/profile" style={{ ...s.dropItem, textDecoration: 'none' }}>👤 Profile</a>
              <a href="/create-ad" style={{ ...s.dropItem, textDecoration: 'none' }}>📢 My Ads</a>
              <button style={{ ...s.dropItem, color: '#ff4444' }} onClick={onLogout}>← Log Out</button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}

// ── Onboarding Tracker ────────────────────────────────────────
function OnboardingTracker({ name, brand, trialStatus }: {
  name: string;
  brand: string;
  trialStatus: 'team' | 'trial' | 'pending';
}) {
  const isActive = trialStatus === 'team' || trialStatus === 'trial';
  const expiry   = getTrialExpiry(trialStatus);
  const days     = getTrialDays(trialStatus);

  const steps = [
    {
      icon: '✅',
      label: "You're in the Arena",
      desc: `Signed up as ${name} · ${brand}`,
      status: 'done',
      unlocked: true,
    },
    {
      icon: '👤',
      label: 'Complete Your Profile',
      desc: 'Add your logo, bio, and contact details',
      status: 'next',
      unlocked: true,
    },
    {
      icon: '📢',
      label: 'Create Your First Ad',
      desc: isActive
        ? 'Your trial is active — build your first ad now'
        : "Coming soon — we'll notify you when ready",
      status: isActive ? 'next' : 'locked',
      unlocked: isActive,
    },
  ];

  const badgeStyle = (status: string): React.CSSProperties => ({
    ...s.trackBadge,
    background: status === 'done'
      ? '#0070f320'
      : status === 'next'
      ? trialStatus === 'team' ? '#7928ca' : '#0070f3'
      : '#1a1a1a',
    color: status === 'done' ? '#0070f3' : status === 'next' ? '#fff' : '#444',
  });

  const rowStyle = (unlocked: boolean): React.CSSProperties => ({
    ...s.trackRow,
    opacity: unlocked ? 1 : 0.4,
    borderColor: unlocked ? '#1a1a1a' : '#111',
  });

  const bc = trialStatus === 'team'
    ? { bg: '#7928ca20', border: '#7928ca40', color: '#b388ff' }
    : { bg: '#0070f320', border: '#0070f340', color: '#0070f3' };

  return (
    <div style={s.onboard}>
      <div style={s.onboardH}>Welcome to the Arena ⚡</div>
      {isActive && (
        <div style={{ ...s.onboardBadge, background: bc.bg, border: `1px solid ${bc.border}`, color: bc.color }}>
          {trialStatus === 'team'
            ? `🔵 Team Member · ${days}-day trial · expires ${expiry}`
            : `🟢 Free Trial · ${days} days · expires ${expiry}`}
        </div>
      )}
      <div style={s.onboardSub}>Complete these steps to launch your first ad.</div>
      <div style={s.track}>
        {steps.map((step, i) => (
          <div key={i} style={rowStyle(step.unlocked)}>
            <div style={s.trackIcon}>{step.icon}</div>
            <div style={{ flex: 1 }}>
              <div style={s.trackLabel}>{step.label}</div>
              <div style={s.trackDesc}>{step.desc}</div>
            </div>
            {step.status === 'done' ? (
              <div style={badgeStyle(step.status)}>Complete</div>
            ) : step.status === 'next' ? (
              <a
                href={i === 1 ? '/profile' : '/create-ad'}
                style={{ ...badgeStyle(step.status), textDecoration: 'none', cursor: 'pointer' }}
              >Start →</a>
            ) : (
              <div style={badgeStyle(step.status)}>🔒 Locked</div>
            )}
          </div>
        ))}
      </div>
      <div style={{ marginTop: '2rem', color: '#333', fontSize: '0.8rem', textAlign: 'center' }}>
        Questions? <a href="mailto:antcpu@gmail.com" style={{ color: '#0070f3' }}>antcpu@gmail.com</a>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function Page() {
  const [hydrated,     setHydrated]     = useState(false);
  const [step,         setStep]         = useState(0);
  const [submitted,    setSubmitted]    = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [trialStatus,  setTrialStatus]  = useState<'team' | 'trial' | 'pending'>('trial');
  const [form, setForm] = useState({
    name: '', email: '', brand_name: '', website_url: '',
    ad_category: '', has_used_ad_service: false, previous_ad_service: '',
    promo_code: '', message: '',
  });

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('ref') === 'mapofpi') {
      setForm(f => ({ ...f, promo_code: TEAM_CODE }));
    }
    const stored = localStorage.getItem('arena_user');
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setForm(f => ({ ...f, name: user.name, email: user.email, brand_name: user.brand }));
        setTrialStatus(user.trialStatus || 'trial');
        setSubmitted(true);
      } catch {}
    }
    setHydrated(true);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('arena_user');
    setSubmitted(false);
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
    await supabase.from('ad_signups').insert([{
      ...form,
      status,
      trial_days:   getTrialDays(status),
      trial_expiry: getTrialExpiry(status),
    }]);
    await notifyDiscord(form.name, form.email, form.brand_name, status);
    localStorage.setItem('arena_user', JSON.stringify({
      name: form.name, email: form.email, brand: form.brand_name, trialStatus: status,
    }));
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={s.page}>
        <HamburgerNav userName={form.email} trialStatus={trialStatus} onLogout={handleLogout} />
        <OnboardingTracker name={form.name} brand={form.brand_name} trialStatus={trialStatus} />
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
          <a href="#start" style={s.ctaSecond}>Team member? Use code MAPOFPI</a>
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

      {/* ── MAP OF PI PARTNER SECTION ── */}
      <div style={s.mapSection}>
        <div style={s.mapBadge}>🗺️ Featured Partner</div>
        <div style={s.mapGrid}>
          <div style={s.mapLeft}>
            <img
              src="https://static.wixstatic.com/media/de4f1f_433bdb1882914f1b959b5053bedc2dbb~mv2.png"
              alt="Map of Pi world map"
              style={s.mapImg}
            />
          </div>
          <div style={s.mapRight}>
            <div style={s.mapLabel}>🏆 2024 Pi Commerce Hackathon Winner</div>
            <h2 style={s.mapTitle}>Map of Pi</h2>
            <p style={s.mapDesc}>
              The world's most used crypto global marketplace. Find trusted Pi merchants, buy and sell everyday goods, and connect with 2.1M+ pioneers worldwide — all inside the Pi Browser.
            </p>
            <div style={s.mapStats}>
              {[
                { val: '2.1M+', lbl: 'Registered Users' },
                { val: '148K',  lbl: 'Sellers' },
                { val: '173K',  lbl: 'Transactions' },
              ].map(({ val, lbl }) => (
                <div key={lbl} style={s.mapStat}>
                  <div style={s.mapStatVal}>{val}</div>
                  <div style={s.mapStatLbl}>{lbl}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' as const, marginTop: '1.5rem' }}>
              <a href="https://mapofpi.com" target="_blank" rel="noreferrer" style={s.mapBtn}>
                Visit mapofpi.com →
              </a>
              <a href="https://youtube.com/@mapofpi" target="_blank" rel="noreferrer" style={s.mapBtnSecond}>
                ▶ YouTube Channel
              </a>
            </div>
          </div>
        </div>
        <div style={s.mapComingSoon}>
          <span style={s.mapComingSoonLabel}>📹 Coming Soon</span>
          <span style={s.mapComingSoonText}>Map of Pi Video Ad Creator — build and launch your own Pi commerce ad in minutes</span>
        </div>
      </div>

      {/* ── MAP OF PI VIDEOS SECTION ── */}
      <MapOfPiVideos />

      <div style={s.section}>
        <h2 style={s.h2}>How It Works</h2>
        <div style={s.grid}>
          {[
            { n: '01', title: 'Sign Up Free',     body: 'Get 3 days of full access. No credit card required.' },
            { n: '02', title: 'Submit Your Ad',    body: 'Title, URL, description. 2 minutes to set up.' },
            { n: '03', title: 'Go Live',           body: 'Your ad enters the network immediately.' },
            { n: '04', title: 'Climb the Ladder',  body: 'Engagement earns you higher placement automatically.' },
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
            { level: 'Rising',   pts: '100 pts',    desc: 'Higher priority + increased impressions',         color: '#0070f3' },
            { level: 'Featured', pts: '300 pts',    desc: 'Featured placement + cross-channel distribution', color: '#7928ca' },
            { level: 'Top Tier', pts: '750 pts',    desc: 'Full network + creator channel integrations',     color: '#ff0080' },
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
              <label style={s.label}>Business / Brand Name</label>
              <input style={s.input} placeholder="Your Brand" value={form.brand_name} onChange={e => set('brand_name', e.target.value)} />
              <label style={s.label}>Website URL</label>
              <input style={s.input} placeholder="https://yourbrand.com" value={form.website_url} onChange={e => set('website_url', e.target.value)} />
              <button style={s.stepBtn} onClick={() => setStep(1)} disabled={!form.name || !form.email}>Next →</button>
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

      <footer style={s.footer}>
        © {new Date().getFullYear()} ANTCPU ·{' '}
        <a href="mailto:antcpu@gmail.com" style={{ color: '#333' }}>antcpu@gmail.com</a>
        {' · '}
        <a href="https://mapofpi.com" target="_blank" rel="noreferrer" style={{ color: '#333' }}>mapofpi.com</a>
      </footer>

    </div>
  );
}
