'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const AD_CATEGORIES = ['Brand Awareness','Product Launch','Content Promotion','Service Offering','Event','Other'];

const SEED_AD = {
  title: 'ANTCPU Ad Network is coming in hot 🔥',
  url: 'https://antcpu-ads.vercel.app',
  description: 'antcpu ad network is coming in hot before the summer #antcpu #ads #summer #hot',
  category: 'Brand Awareness',
};

export default function CreateAdPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState({ name: '', email: '', brand: '', trialStatus: 'trial' });
  const [form, setForm] = useState(SEED_AD);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const isTeam = user.trialStatus === 'team';
  const btnColor = isTeam ? '#7928ca' : '#0070f3';

  const handleSubmit = async () => {
    setLoading(true);
    const payload = {
      email: user.email,
      name: user.name,
      brand: user.brand,
      title: form.title,
      url: form.url,
      description: form.description,
      category: form.category,
      status: 'pending_review',
      trial_status: user.trialStatus,
      tier: 'entry',
    };
    console.log('[CREATE-AD] submitting:', payload);
    const { data, error } = await supabase.from('ads').insert([payload]);
    console.log('[CREATE-AD] result:', { data, error });
    alert(error ? '❌ Error: ' + error.message : '✅ Ad submitted!');
    setLoading(false);
    router.push('/dashboard');
  };

  return (
    <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2rem', borderBottom: '1px solid #1a1a1a' }}>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>⚡ ANTCPU ADS</span>
        <button onClick={() => router.push('/profile')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.85rem' }}>← Back to Profile</button>
      </nav>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>

        {/* LEFT — Form */}
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
            {[0,1,2].map(i => (
              <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i <= 1 ? btnColor : `${btnColor}80` }} />
            ))}
          </div>

          <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '2.5rem' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📢</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.4rem' }}>Create Your First Ad</h1>
            <p style={{ color: '#555', fontSize: '0.88rem', marginBottom: '0.75rem' }}>Step 3 of 3 — 2 minutes to go live.</p>
            <p style={{ color: '#333', fontSize: '0.78rem', marginBottom: '2rem', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '0.6rem 0.9rem' }}>
              💡 We pre-filled an example ad — edit it or clear it and write your own.
            </p>

            {user.name && (
              <div style={{ background: isTeam ? '#7928ca10' : '#0070f310', border: `1px solid ${isTeam ? '#7928ca30' : '#0070f330'}`, borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: isTeam ? '#b388ff' : '#0070f3' }}>
                {isTeam ? '🔵' : '🟢'} {isTeam ? 'Team member' : 'Free trial active'} · {user.brand}
              </div>
            )}

            <label style={{ display: 'block', fontSize: '0.78rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ad Title</label>
            <input value={form.title} onChange={e => set('title', e.target.value)}
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '1.2rem' }} />

            <label style={{ display: 'block', fontSize: '0.78rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Destination URL</label>
            <input value={form.url} onChange={e => set('url', e.target.value)}
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '1.2rem' }} />

            <label style={{ display: 'block', fontSize: '0.78rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Description</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '1.2rem', minHeight: '90px', resize: 'vertical' }} />

            <label style={{ display: 'block', fontSize: '0.78rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Category</label>
            <select value={form.category} onChange={e => set('category', e.target.value)}
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '1.5rem' }}>
              {AD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>

            <button onClick={handleSubmit} disabled={loading || !form.title || !form.url || !form.description || !form.category}
              style={{ width: '100%', background: btnColor, color: '#fff', border: 'none', borderRadius: '8px', padding: '0.85rem', fontWeight: 600, fontSize: '1rem', cursor: loading ? 'default' : 'pointer', opacity: (!form.title || !form.url || !form.description || !form.category) ? 0.5 : 1 }}>
              {loading ? 'Submitting...' : 'Submit Ad & Enter Dashboard →'}
            </button>
          </div>
        </div>

        {/* RIGHT — Live Preview */}
        <div style={{ position: 'sticky', top: '2rem', alignSelf: 'start' }}>
          <div style={{ fontSize: '0.7rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>Live Preview</div>
          <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', overflow: 'hidden' }}>
            {/* Tier bar */}
            <div style={{ height: '3px', background: 'linear-gradient(90deg, #0070f3, #7928ca)' }} />
            <div style={{ padding: '1.5rem' }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#0070f320', border: '1px solid #0070f340', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>⚡</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user.brand || 'Your Brand'}</div>
                    <div style={{ fontSize: '0.7rem', color: '#555' }}>{form.category || 'Category'}</div>
                  </div>
                </div>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, background: '#0070f320', color: '#0070f3', border: '1px solid #0070f340', borderRadius: '999px', padding: '0.2rem 0.6rem' }}>ENTRY</div>
              </div>
              {/* Title */}
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.6rem', lineHeight: 1.3 }}>
                {form.title || 'Your ad title will appear here'}
              </div>
              {/* Description */}
              <div style={{ color: '#888', fontSize: '0.85rem', lineHeight: 1.6, marginBottom: '1rem' }}>
                {form.description || 'Your description will appear here...'}
              </div>
              {/* URL CTA */}
              <a href={form.url || '#'} target="_blank" rel="noreferrer"
                style={{ display: 'inline-block', background: '#0070f3', color: '#fff', padding: '0.5rem 1.2rem', borderRadius: '8px', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'none' }}>
                {form.url ? new URL(form.url.startsWith('http') ? form.url : 'https://' + form.url).hostname : 'yourdomain.com'} →
              </a>
            </div>
            {/* Footer */}
            <div style={{ borderTop: '1px solid #1a1a1a', padding: '0.75rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.7rem', color: '#333' }}>⚡ ANTCPU ADS Network</div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.7rem', color: '#333' }}>
                <span>👁 impressions</span>
                <span>🖱 clicks</span>
              </div>
            </div>
          </div>
          {/* Tier roadmap teaser */}
          <div style={{ marginTop: '1.5rem', background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.2rem' }}>
            <div style={{ fontSize: '0.7rem', color: '#333', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Upgrade Path</div>
            {[
              { tier: 'Entry', desc: 'Text ad · standard rotation', color: '#0070f3', active: true },
              { tier: 'Rising', desc: 'Custom image · more reach', color: '#7928ca', active: false },
              { tier: 'Featured', desc: 'Video ad · top placement', color: '#ff0080', active: false },
              { tier: 'Top Tier', desc: 'antcpu.com/cloud · full campaign', color: '#f0883e', active: false },
            ].map(t => (
              <div key={t.tier} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0', borderBottom: '1px solid #1a1a1a', opacity: t.active ? 1 : 0.4 }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.78rem', color: t.color }}>{t.tier}</span>
                  <span style={{ fontSize: '0.72rem', color: '#555', marginLeft: '0.5rem' }}>{t.desc}</span>
                </div>
                {!t.active && <span style={{ fontSize: '0.65rem', color: '#333' }}>soon</span>}
                {t.active && <span style={{ fontSize: '0.65rem', color: '#0070f3', fontWeight: 700 }}>YOU ARE HERE</span>}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
