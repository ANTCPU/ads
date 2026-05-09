'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const AD_CATEGORIES = ['Brand Awareness','Product Launch','Content Promotion','Service Offering','Event','Other'];

export default function CreateAdPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState({ name: '', email: '', brand: '', trialStatus: 'trial' });
  const [form, setForm] = useState({ title: '', url: '', description: '', category: '' });

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setUser(u);
        setForm(f => ({ ...f, category: u.ad_category || '' }));
      } catch {}
    }
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const isTeam = user.trialStatus === 'team';
  const btnColor = isTeam ? '#7928ca' : '#0070f3';

  const handleSubmit = async () => {
    setLoading(true);
    await supabase.from('ads').insert([{
      email: user.email,
      name: user.name,
      brand: user.brand,
      title: form.title,
      url: form.url,
      description: form.description,
      category: form.category,
      status: 'pending_review',
      trial_status: user.trialStatus,
    }]);
    setLoading(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '2rem' }}>
        <div style={{ fontSize: '3rem' }}>🚀</div>
        <h1 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Ad Submitted!</h1>
        <p style={{ color: '#555', fontSize: '0.95rem', textAlign: 'center', maxWidth: '400px' }}>Your ad is under review. Once approved it enters the Arena network automatically.</p>
        <div style={{ background: '#111', border: `1px solid ${isTeam ? '#7928ca30' : '#0070f330'}`, borderRadius: '12px', padding: '1.2rem 2rem', textAlign: 'center' }}>
          <div style={{ color: isTeam ? '#b388ff' : '#0070f3', fontSize: '0.85rem', fontWeight: 600 }}>{isTeam ? '🔵 Team submission' : '🟢 Trial submission'}</div>
          <div style={{ color: '#555', fontSize: '0.8rem', marginTop: '0.3rem' }}>We'll notify you at {user.email}</div>
        </div>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: '1px solid #333', color: '#888', borderRadius: '8px', padding: '0.6rem 1.4rem', cursor: 'pointer', fontSize: '0.85rem' }}>
          ← Explore the Arena
        </button>
      </div>
    );
  }

  return (
    <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2rem', borderBottom: '1px solid #1a1a1a' }}>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>⚡ ANTCPU ADS</span>
        <button onClick={() => router.push('/profile')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.85rem' }}>← Back to Profile</button>
      </nav>

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '3rem 2rem' }}>
        {/* Step indicator */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= 1 ? btnColor : `${btnColor}80` }} />
          ))}
        </div>

        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '2.5rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📢</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.4rem' }}>Create Your First Ad</h1>
          <p style={{ color: '#555', fontSize: '0.88rem', marginBottom: '2rem' }}>Step 3 of 3 — 2 minutes to go live.</p>

          {user.name && (
            <div style={{ background: isTeam ? '#7928ca10' : '#0070f310', border: `1px solid ${isTeam ? '#7928ca30' : '#0070f330'}`, borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: isTeam ? '#b388ff' : '#0070f3' }}>
              {isTeam ? '🔵' : '🟢'} {isTeam ? 'Team member' : 'Free trial active'} · {user.brand}
            </div>
          )}

          <label style={{ display: 'block', fontSize: '0.78rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ad Title</label>
          <input
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="e.g. Discover Map of Pi — Real Pi Commerce"
            style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '1.2rem' }}
          />

          <label style={{ display: 'block', fontSize: '0.78rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Destination URL</label>
          <input
            value={form.url}
            onChange={e => set('url', e.target.value)}
            placeholder="https://yourbrand.com/landing"
            style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '1.2rem' }}
          />

          <label style={{ display: 'block', fontSize: '0.78rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Short description of what you're promoting..."
            style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '1.2rem', minHeight: '90px', resize: 'vertical' }}
          />

          <label style={{ display: 'block', fontSize: '0.78rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Category</label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: form.category ? '#fff' : '#555', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '1.5rem' }}
          >
            <option value="">Select a category</option>
            {AD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button
            onClick={handleSubmit}
            disabled={loading || !form.title || !form.url || !form.description || !form.category}
            style={{ width: '100%', background: btnColor, color: '#fff', border: 'none', borderRadius: '8px', padding: '0.85rem', fontWeight: 600, fontSize: '1rem', cursor: loading ? 'default' : 'pointer', opacity: (!form.title || !form.url || !form.description || !form.category) ? 0.5 : 1 }}
          >
            {loading ? 'Submitting...' : 'Submit Ad →'}
          </button>
        </div>
      </div>
    </div>
  );
}
