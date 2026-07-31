'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const COUNTRIES = [
  'United States','United Kingdom','Canada','Australia','India',
  'Nigeria','Brazil','Germany','France','Philippines','South Africa',
  'Mexico','Indonesia','Pakistan','Bangladesh','Kenya','Ghana',
  'Egypt','China','Japan','South Korea','Italy','Spain','Iran',
  'Senegal','Other',
];

const S = {
  page:        { maxWidth: 520, margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'system-ui,sans-serif' } as React.CSSProperties,
  input:       { width: '100%', padding: '0.8rem 1rem', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '1rem', boxSizing: 'border-box' as const, outline: 'none' },
  label:       { display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' } as React.CSSProperties,
  error:       { background: '#fef2f2', color: '#dc2626', padding: '0.75rem 1rem', borderRadius: 8, fontSize: '0.875rem', marginBottom: '1rem' } as React.CSSProperties,
  btnSecondary:{ background: '#f3f4f6', color: '#374151', border: 'none', padding: '0.9rem 1.5rem', borderRadius: 8, fontWeight: 600, fontSize: '1rem', cursor: 'pointer' } as React.CSSProperties,
};

function btnPrimary(disabled: boolean): React.CSSProperties {
  return { width: '100%', background: disabled ? '#d1d5db' : '#2563eb', color: disabled ? '#9ca3af' : '#fff', border: 'none', padding: '0.9rem', borderRadius: 8, fontWeight: 700, fontSize: '1rem', cursor: disabled ? 'not-allowed' : 'pointer', transition: 'background 0.15s' };
}

function ProgressBar({ step }: { step: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginBottom: '2rem' }}>
      {[1, 2, 3].map(n => (
        <div key={n} style={{ height: 4, flex: 1, borderRadius: 2, background: n <= step ? '#2563eb' : '#e5e7eb', transition: 'background 0.2s' }} />
      ))}
    </div>
  );
}

export default function JoinForm() {
  const params   = useSearchParams();
  const router   = useRouter();
  const preTrack = params.get('track') ?? '';

  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [form,    setForm]    = useState({ name: '', email: '', country: '', track: '' });

  useEffect(() => {
    if (preTrack === 'dev' || preTrack === 'marketing') {
      setForm(f => ({ ...f, track: preTrack }));
    }
  }, [preTrack]);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const step1Valid = !!(form.name.trim() && form.email.trim() && form.country);
  const step2Valid = form.track === 'dev' || form.track === 'marketing';

  async function submit() {
    setLoading(true);
    setError('');
    try {
      const res  = await fetch('/api/internship/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Registration failed');
      router.push(`/internship/success?name=${encodeURIComponent(form.name)}&track=${form.track}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  // ── Step 1 ─────────────────────────────────────────────────
  if (step === 1) return (
    <div style={S.page}>
      <ProgressBar step={1} />
      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Step 1 of 3</div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.4rem' }}>Who are you?</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.95rem' }}>No CV. No experience required. Just show up.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <label style={S.label}>Your name</label>
          <input style={S.input} placeholder="First and last name" value={form.name}
            onChange={e => set('name', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && step1Valid && setStep(2)} autoFocus />
        </div>
        <div>
          <label style={S.label}>Email address</label>
          <input style={S.input} placeholder="you@example.com" type="email" value={form.email}
            onChange={e => set('email', e.target.value)}
            onKeyDown={e => e.key === 'Enter' && step1Valid && setStep(2)} />
        </div>
        <div>
          <label style={S.label}>Country</label>
          <select style={S.input} value={form.country} onChange={e => set('country', e.target.value)}>
            <option value="">Select your country</option>
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <button style={{ ...btnPrimary(!step1Valid), marginTop: '1.75rem' }}
        disabled={!step1Valid} onClick={() => setStep(2)}>Continue →</button>
      <p style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: '0.8rem', color: '#9ca3af' }}>
        Already registered?{' '}
        <a href="https://antcpu-ads.vercel.app/login" style={{ color: '#2563eb' }}>Sign in →</a>
      </p>
    </div>
  );

  // ── Step 2 ─────────────────────────────────────────────────
  if (step === 2) return (
    <div style={S.page}>
      <ProgressBar step={2} />
      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Step 2 of 3</div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.4rem' }}>Pick your track.</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.95rem' }}>
        You are a brand. Your skills are your service.<br />One track only.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {[
          { track: 'dev',       icon: '💻', label: 'Developer', desc: 'Build tools, automate workflows, write code. Ship real features to the Arena.' },
          { track: 'marketing', icon: '📣', label: 'Marketer',  desc: 'Run campaigns, build community, drive real reach. Represent brands in the Arena.' },
        ].map(t => (
          <button key={t.track} onClick={() => set('track', t.track)} style={{
            padding: '1.25rem 1.5rem', borderRadius: 12, cursor: 'pointer', textAlign: 'left',
            border: `2px solid ${form.track === t.track ? '#2563eb' : '#e5e7eb'}`,
            background: form.track === t.track ? '#eff6ff' : '#fff',
            transition: 'all 0.15s',
          }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>{t.icon}</div>
            <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: '0.25rem' }}>{t.label}</div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem', lineHeight: 1.5 }}>{t.desc}</div>
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.75rem' }}>
        <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => setStep(1)}>← Back</button>
        <button style={{ ...btnPrimary(!step2Valid), flex: 2 }} disabled={!step2Valid} onClick={() => setStep(3)}>Continue →</button>
      </div>
    </div>
  );

  // ── Step 3 ─────────────────────────────────────────────────
  const trackLabel = form.track === 'dev' ? '💻 Developer' : '📣 Marketer';
  return (
    <div style={S.page}>
      <ProgressBar step={3} />
      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.4rem' }}>Step 3 of 3</div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.4rem' }}>You're almost in.</h1>
      <p style={{ color: '#6b7280', marginBottom: '1.75rem', fontSize: '0.95rem' }}>
        Review your details. Your intro ad goes live in the Arena immediately.
      </p>
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Your Challenger Profile</div>
        <div style={{ fontWeight: 700, fontSize: '1.05rem' }}>{form.name}</div>
        <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>{form.email}</div>
        <div style={{ color: '#6b7280', fontSize: '0.9rem' }}>{form.country}</div>
        <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ background: '#eff6ff', color: '#2563eb', padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700 }}>{trackLabel}</span>
          <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 700 }}>⭐ Founding Member</span>
          <span style={{ background: '#fafafa', color: '#6b7280', padding: '0.25rem 0.75rem', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600 }}>Week 1 · Explorer</span>
        </div>
      </div>
      <p style={{ fontSize: '0.8rem', color: '#9ca3af', marginBottom: '1.5rem', lineHeight: 1.6 }}>
        By registering you agree to the{' '}
        <a href="https://antcpu.io/terms/" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Terms of Participation</a>{' '}
        and <a href="https://antcpu.io/community-guidelines/" target="_blank" rel="noopener noreferrer" style={{ color: '#2563eb' }}>Community Guidelines</a>.
        Free, unpaid challenge — ~5 hours/week, fully remote.
      </p>
      {error && <div style={S.error}>{error}</div>}
      <div style={{ display: 'flex', gap: '0.75rem' }}>
        <button style={{ ...S.btnSecondary, flex: 1 }} onClick={() => setStep(2)} disabled={loading}>← Back</button>
        <button style={{ ...btnPrimary(loading), flex: 2 }} onClick={submit} disabled={loading}>
          {loading ? 'Registering...' : 'Enter the Arena →'}
        </button>
      </div>
    </div>
  );
}
