'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../components/ArenaNav';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1495909060170616884/5RthXmjPurDkhjpXkM_iQGa11-Gl-WnjGeRp-gq79piX5od5frIPqT1L-tGb-t-W06e7';

const AD_CATEGORIES = [
  'Brand Awareness', 'Product Launch', 'Content Promotion',
  'Service Offering', 'Event', 'Photography', 'Pi Commerce', 'Other',
];

const SEED_PHRASES = ['coming in hot', 'antcpu ad network', 'antcpu-ads.vercel.app'];

// ── Aria live validation ──────────────────────────────────────
function ariaCheck(title: string, url: string, description: string): {
  ok: boolean;
  message: string;
  field: 'title' | 'url' | 'description' | 'seed' | null;
} {
  const combined = `${title} ${description}`.toLowerCase();
  if (SEED_PHRASES.some(p => combined.includes(p))) {
    return { ok: false, field: 'seed', message: "⚠️ Looks like the example ad is still in there — write about your own brand instead." };
  }
  if (!title || title.trim().length < 8) {
    return { ok: false, field: 'title', message: "🦋 A stronger headline gets more clicks. Try to be specific about what you offer." };
  }
  if (!url || url.trim().length < 6) {
    return { ok: false, field: 'url', message: "🦋 Add a destination URL so people know where to go." };
  }
  if (url.trim().length > 5 && !url.startsWith('http')) {
    return { ok: false, field: 'url', message: "🦋 Make sure your URL starts with https:// so it links correctly." };
  }
  if (!description || description.trim().length < 20) {
    return { ok: false, field: 'description', message: "🦋 Tell people what makes your brand worth clicking. One strong sentence is enough." };
  }
  return { ok: true, field: null, message: "🦋 Looks great — your ad is ready to submit." };
}

export default function CreateAdPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>({ name: '', email: '', brand: '', trialStatus: 'trial' });
  const [form, setForm] = useState({ title: '', url: '', description: '', category: 'Brand Awareness' });
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    setHydrated(true);
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const isTeam = user.trialStatus === 'team';
  const isAdmin = user.email === 'antcpu@gmail.com';
  const accent = isAdmin ? '#f0883e' : isTeam ? '#7928ca' : '#0070f3';

  const aria = ariaCheck(form.title, form.url, form.description);

  const inp: React.CSSProperties = {
    width: '100%', background: '#0a0a0a', border: '1px solid #222',
    borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff',
    fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '0.5rem',
    outline: 'none', fontFamily: 'inherit',
  };

  const handleSubmit = async () => {
    if (!aria.ok) return;
    setLoading(true);
    setSubmitError('');

    // Check for existing pending or active ad
    const { data: existing } = await supabase
      .from('ads')
      .select('id, status')
      .eq('email', user.email)
      .in('status', ['pending_review', 'active'])
      .limit(1);

    if (existing && existing.length > 0) {
      setSubmitError(
        existing[0].status === 'pending_review'
          ? '🦋 Your ad is already pending review — Aria will get to it soon.'
          : '✅ You already have an active ad in the Arena.'
      );
      setLoading(false);
      return;
    }

    const payload = {
      email: user.email,
      name: user.name,
      brand: user.brand,
      title: form.title.trim(),
      url: form.url.trim(),
      description: form.description.trim(),
      category: form.category,
      status: 'pending_review',
      trial_status: user.trialStatus,
      tier: 'entry',
    };

    const { error } = await supabase.from('ads').insert([payload]);

    if (error) {
      setSubmitError(error.message);
      setLoading(false);
      return;
    }

    // Discord notification
    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `🆕 **New Ad Submitted**\n**Brand:** ${user.brand}\n**Title:** "${form.title.trim()}"\n**URL:** ${form.url.trim()}\n**Category:** ${form.category}\n**Email:** ${user.email}\n**Status:** pending_review`,
      }),
    }).catch(() => {});

    setLoading(false);
    setSubmitted(true);
  };

  // ── Success screen ────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '480px', width: '100%', padding: '2rem 1.25rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🦋</div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff', marginBottom: '0.5rem' }}>
            Aria has your ad.
          </div>
          <div style={{ color: '#555', fontSize: '0.95rem', marginBottom: '2rem', lineHeight: 1.6 }}>
            Your ad is in the review queue. Aria will check it for quality and clarity — usually within a few hours. You'll see it go live in your dashboard.
          </div>
          <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <div style={{ fontSize: '0.7rem', color: '#555', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>YOUR SUBMISSION</div>
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{form.title}</div>
            <div style={{ fontSize: '0.82rem', color: '#888', marginBottom: '0.25rem' }}>{form.description}</div>
            <div style={{ fontSize: '0.78rem', color: accent }}>{form.url}</div>
          </div>
          <button
            onClick={() => router.push('/dashboard/user')}
            style={{ background: accent, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.85rem 2rem', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', width: '100%' }}
          >
            Back to the Arena →
          </button>
        </div>
      </div>
    );
  }

  if (!hydrated) return null;

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav
        role={isAdmin ? 'admin' : isTeam ? 'team' : 'user'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus}
        onLogout={() => { localStorage.removeItem('arena_user'); router.push('/'); }}
      />

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '2.5rem 1.25rem' }}>

        {/* ── Aria intro card ── */}
        <div style={{ background: '#0f0f0f', border: '1px solid #f0883e30', borderLeft: '3px solid #f0883e', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🦋</span>
            <div>
              <div style={{ fontWeight: 700, color: '#fff', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                Hi, I'm Aria — I'll review your ad before it goes live.
              </div>
              <div style={{ color: '#666', fontSize: '0.82rem', lineHeight: 1.6 }}>
                A strong ad has a clear headline, a working URL, and one sentence that tells people exactly what you offer. Fill in the form below and I'll give you live feedback as you go.
              </div>
            </div>
          </div>
        </div>

        {/* ── User badge ── */}
        {user.name && (
          <div style={{ marginBottom: '1.5rem' }}>
            <span style={{ background: `${accent}15`, border: `1px solid ${accent}40`, color: accent, borderRadius: '999px', padding: '0.3rem 0.85rem', fontSize: '0.78rem', fontWeight: 600 }}>
              {isTeam ? '🔵' : '🟢'} {isTeam ? 'Team' : 'Free trial'} · {user.brand}
            </span>
          </div>
        )}

        {/* ── Form card ── */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '2rem' }}>
          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#fff', marginBottom: '0.25rem' }}>Create Your Ad</div>
          <div style={{ color: '#555', fontSize: '0.85rem', marginBottom: '1.75rem' }}>2 minutes to go live · Entry tier · free</div>

          {/* Title */}
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
            Ad Title
          </label>
          <input
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder={`What does ${user.brand || 'your brand'} offer?`}
            style={{ ...inp, borderColor: aria.field === 'title' || aria.field === 'seed' ? '#f0883e60' : '#222' }}
          />

          {/* URL */}
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem', marginTop: '0.75rem' }}>
            Destination URL
          </label>
          <input
            value={form.url}
            onChange={e => set('url', e.target.value)}
            placeholder="https://yourbrand.com"
            style={{ ...inp, borderColor: aria.field === 'url' ? '#f0883e60' : '#222' }}
          />

          {/* Description */}
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem', marginTop: '0.75rem' }}>
            Description
          </label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="One sentence about what makes your brand worth clicking..."
            rows={3}
            style={{ ...inp, resize: 'vertical', borderColor: aria.field === 'description' ? '#f0883e60' : '#222' }}
          />

          {/* Category */}
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#666', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem', marginTop: '0.75rem' }}>
            Category
          </label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            style={{ ...inp, marginBottom: '1.5rem' }}
          >
            {AD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* ── Aria live feedback ── */}
          <div style={{
            background: aria.ok ? '#0f2a1a' : '#1a0f00',
            border: `1px solid ${aria.ok ? '#22c55e40' : '#f0883e40'}`,
            borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '1.5rem',
            display: 'flex', alignItems: 'flex-start', gap: '0.5rem',
          }}>
            <div style={{ fontSize: '0.85rem', color: aria.ok ? '#22c55e' : '#f0883e', lineHeight: 1.5 }}>
              {aria.message}
            </div>
          </div>

          {/* Submit error */}
          {submitError && (
            <div style={{ background: '#1a0f00', border: '1px solid #f0883e40', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.85rem', color: '#f0883e' }}>
              {submitError}
            </div>
          )}

          {/* Submit button */}
          <button
            onClick={handleSubmit}
            disabled={!aria.ok || loading}
            style={{
              width: '100%', background: aria.ok ? accent : '#1a1a1a',
              border: 'none', color: aria.ok ? '#fff' : '#444',
              borderRadius: '8px', padding: '1rem', fontWeight: 700,
              fontSize: '1rem', cursor: aria.ok ? 'pointer' : 'not-allowed',
              transition: 'all 0.2s',
            }}
          >
            {loading ? 'Submitting...' : aria.ok ? 'Submit to Aria for Review →' : 'Complete your ad to continue'}
          </button>

          <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.78rem', color: '#444' }}>
            Aria reviews every ad before it goes live · usually within a few hours
          </div>
        </div>

        {/* Back link */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <button
            onClick={() => router.push('/dashboard/user')}
            style={{ background: 'none', border: 'none', color: '#444', cursor: 'pointer', fontSize: '0.85rem' }}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
