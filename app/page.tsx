'use client';
import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const TRIAL_MODE: boolean | null = null;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1495909060170616884/5RthXmjPurDkhjpXkM_iQGa11-Gl-WnjGeRp-gq79piX5od5frIPqT1L-tGb-t-W06e7';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const AD_CATEGORIES = ['Brand Awareness','Product Launch','Content Promotion','Service Offering','Event','Other'];
const AD_SERVICES = ['Google Ads','Meta (Facebook/Instagram)','TikTok Ads','Twitter/X Ads','YouTube Ads','Reddit Ads','LinkedIn Ads','Programmatic / DSP','Other','None — this is my first'];

function resolveStatus(data: { website_url: string; has_used_ad_service: boolean; promo_code: string }): 'trial' | 'pending' {
  if (TRIAL_MODE === true) return 'trial';
  if (TRIAL_MODE === false) return 'pending';
  let score = 0;
  if (data.promo_code.trim().length > 0) score += 3;
  if (data.has_used_ad_service) score += 2;
  if (data.website_url.trim().length > 0) score += 1;
  return score >= 3 ? 'trial' : 'pending';
}

async function notifyDiscord(name: string, email: string, brand: string, status: 'trial' | 'pending') {
  const emoji = status === 'trial' ? '🟢' : '🟡';
  await fetch(DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: `${emoji} **New Ad Signup**\n**Name:** ${name}\n**Email:** ${email}\n**Brand:** ${brand}\n**Status:** ${status.toUpperCase()}`,
    }),
  });
}

const s: Record<string, React.CSSProperties> = {
  page:       { background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' },
  nav:        { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2rem', borderBottom: '1px solid #1a1a1a' },
  logo:       { fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' },
  hero:       { textAlign: 'center', padding: '5rem 2rem 3rem' },
  badge:      { display: 'inline-block', background: '#111', border: '1px solid #222', borderRadius: '999px', padding: '0.3rem 1rem', fontSize: '0.75rem', color: '#0070f3', marginBottom: '1.5rem' },
  h1:         { fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.2rem' },
  sub:        { color: '#888', fontSize: '1.1rem', maxWidth: '520px', margin: '0 auto 2rem' },
  ctaBtn:     { display: 'inline-block', background: '#0070f3', color: '#fff', padding: '0.85rem 2rem', borderRadius: '8px', fontWeight: 600, textDecoration: 'none', fontSize: '1rem' },
  statsBar:   { display: 'flex', justifyContent: 'center', gap: '3rem', padding: '2rem', borderTop: '1px solid #111', borderBottom: '1px solid #111', flexWrap: 'wrap' as const },
  statVal:    { fontSize: '2rem', fontWeight: 800, color: '#0070f3' },
  statLbl:    { fontSize: '0.75rem', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '0.1em' },
  section:    { maxWidth: '900px', margin: '0 auto', padding: '4rem 2rem' },
  h2:         { fontSize: '2rem', fontWeight: 700, marginBottom: '2.5rem', textAlign: 'center' as const },
  grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' },
  card:       { background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.5rem' },
  num:        { fontSize: '2rem', fontWeight: 800, color: '#0070f3', marginBottom: '0.5rem' },
  ladder:     { display: 'flex', flexDirection: 'column' as const, gap: '1rem' },
  lrow:       { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '1rem 1.5rem' },
  formWrap:   { maxWidth: '560px', margin: '0 auto', padding: '4rem 2rem' },
  formCard:   { background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '2.5rem' },
  formTitle:  { fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' },
  formSub:    { color: '#666', fontSize: '0.9rem', marginBottom: '2rem' },
  label:      { display: 'block', fontSize: '0.8rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase' as const, letterSpacing: '0.08em' },
  input:      { width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' as const, marginBottom: '1.2rem' },
  select:     { width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' as const, marginBottom: '1.2rem' },
  textarea:   { width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box' as const, marginBottom: '1.2rem', minHeight: '100px', resize: 'vertical' as const },
  stepBtn:    { width: '100%', background: '#0070f3', color: '#fff', border: 'none', borderRadius: '8px', padding: '0.85rem', fontWeight: 600, fontSize: '1rem', cursor: 'pointer', marginTop: '0.5rem' },
  backBtn:    { background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.85rem', marginBottom: '1rem', padding: 0 },
  steps:      { display: 'flex', gap: '0.5rem', marginBottom: '2rem' },
  footer:     { textAlign: 'center' as const, padding: '2rem', color: '#333', fontSize: '0.8rem', borderTop: '1px solid #111' },
  success:    { textAlign: 'center' as const, padding: '3rem 1rem' },
  successH:   { fontSize: '1.6rem', fontWeight: 700, marginBottom: '1rem' },
  successSub: { color: '#666', fontSize: '0.95rem', marginBottom: '2rem' },
};

export default function Page() {
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '', email: '', brand_name: '', website_url: '',
    ad_category: '', has_used_ad_service: false, previous_ad_service: '',
    promo_code: '', message: '',
  });

  const set = (k: string, v: string | boolean) => setForm(f => ({ ...f, [k]: v }));

  const stepDot = (active: boolean, done: boolean): React.CSSProperties => ({
    flex: 1, height: '3px', borderRadius: '2px',
    background: done ? '#0070f3' : active ? '#0070f380' : '#222',
    transition: 'background 0.3s',
  });

  const handleSubmit = async () => {
    setLoading(true);
    const status = resolveStatus({
      website_url: form.website_url,
      has_used_ad_service: form.has_used_ad_service,
      promo_code: form.promo_code,
    });
    await supabase.from('ad_signups').insert([{ ...form, status }]);
    await notifyDiscord(form.name, form.email, form.brand_name, status);
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={s.page}>
        <div style={s.formWrap}>
          <div style={{ ...s.formCard, ...s.success }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚡</div>
            <div style={s.successH}>Welcome to the place where ads work for you.</div>
            <div style={s.successSub}>Check your inbox — we'll be in touch within 24 hours.</div>
            <a href="https://antcpu-ads.vercel.app" style={s.ctaBtn}>Explore the Arena →</a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>

      <nav style={s.nav}>
        <span style={s.logo}>⚡ ANTCPU ADS</span>
        <a href="#start" style={{ color: '#0070f3', fontSize: '0.9rem', textDecoration: 'none' }}>Get Started</a>
      </nav>

      <div style={s.hero}>
        <div style={s.badge}>⚡ Deployment Status: Active</div>
        <h1 style={s.h1}>Welcome to<br />The Arena.</h1>
        <p style={s.sub}>The central hub for automated marketing systems. Launch 1 ad for <strong>$9.99/month</strong> — earn attention, climb the ladder, scale your reach.</p>
        <a href="#start" style={s.ctaBtn}>Enter the Arena →</a>
      </div>

      <div style={s.statsBar}>
        {[
          { value: '$9.99', label: 'Per Month' },
          { value: '1',     label: 'Ad to Start' },
          { value: '4',     label: 'Ladder Levels' },
          { value: '∞',     label: 'Reach Potential' },
        ].map(({ value, label }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={s.statVal}>{value}</div>
            <div style={s.statLbl}>{label}</div>
          </div>
        ))}
      </div>

      <div style={s.section}>
        <h2 style={s.h2}>How It Works</h2>
        <div style={s.grid}>
          {[
            { n: '01', title: 'Submit Your Ad',    body: 'Title, URL, description. 2 minutes to set up.' },
            { n: '02', title: 'Pay $9.99/mo',      body: 'Simple subscription. Cancel anytime.' },
            { n: '03', title: 'Go Live',            body: 'Your ad enters the network immediately.' },
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
          <div style={s.formTitle}>Get Started</div>
          <div style={s.formSub}>1 ad. $9.99/month. No contracts. Cancel anytime.</div>

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
              <label style={s.label}>Promo Code <span style={{ color: '#444' }}>(optional)</span></label>
              <input style={s.input} placeholder="ANTFREE1" value={form.promo_code} onChange={e => set('promo_code', e.target.value)} />
              <label style={s.label}>Tell us what you want to promote</label>
              <textarea style={s.textarea} placeholder="Brief description of your ad, product, or campaign goal..." value={form.message} onChange={e => set('message', e.target.value)} />
              <button style={s.stepBtn} onClick={handleSubmit} disabled={loading}>
                {loading ? 'Submitting...' : 'Enter the Arena →'}
              </button>
            </div>
          )}

        </div>
      </div>

      <footer style={s.footer}>
        © {new Date().getFullYear()} ANTCPU · <a href="mailto:antcpu@gmail.com" style={{ color: '#333' }}>antcpu@gmail.com</a>
      </footer>

    </div>
  );
}
