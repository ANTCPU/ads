'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState({ name: '', email: '', brand: '', trialStatus: 'trial' });
  const [form, setForm] = useState({ bio: '', contact: '', website: '' });

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
    const profile = localStorage.getItem('arena_profile');
    if (profile) {
      try { setForm(JSON.parse(profile)); } catch {}
    }
  }, []);

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setLoading(true);
    const payload = {
      email: user.email,
      name: user.name,
      brand: user.brand,
      bio: form.bio,
      contact: form.contact,
      website: form.website,
    };
    console.log('[PROFILE] submitting:', payload);
    const { data, error } = await supabase.from('ad_profiles').upsert([payload], { onConflict: 'email' });
    console.log('[PROFILE] result:', { data, error });
    alert(error ? '❌ Error: ' + error.message : '✅ Profile saved to Supabase!');
    localStorage.setItem('arena_profile', JSON.stringify(form));
    setLoading(false);
    setSaved(true);
    setTimeout(() => router.push('/create-ad'), 1500);
  };

  const isTeam = user.trialStatus === 'team';
  const btnColor = isTeam ? '#7928ca' : '#0070f3';

  return (
    <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2rem', borderBottom: '1px solid #1a1a1a' }}>
        <span style={{ fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>⚡ ANTCPU ADS</span>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '0.85rem' }}>← Back to Arena</button>
      </nav>
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '3rem 2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ flex: 1, height: '3px', borderRadius: '2px', background: i === 0 ? btnColor : i === 1 ? `${btnColor}80` : '#222' }} />
          ))}
        </div>
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '2.5rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>👤</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.4rem' }}>Complete Your Profile</h1>
          <p style={{ color: '#555', fontSize: '0.88rem', marginBottom: '2rem' }}>Step 2 of 3 — Help the network know who you are.</p>
          {user.name && (
            <div style={{ background: isTeam ? '#7928ca10' : '#0070f310', border: `1px solid ${isTeam ? '#7928ca30' : '#0070f330'}`, borderRadius: '10px', padding: '0.75rem 1rem', marginBottom: '1.5rem', fontSize: '0.82rem', color: isTeam ? '#b388ff' : '#0070f3' }}>
              {isTeam ? '🔵' : '🟢'} Signed in as <strong>{user.name}</strong> · {user.brand}
            </div>
          )}
          <label style={{ display: 'block', fontSize: '0.78rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Bio / What you promote</label>
          <textarea value={form.bio} onChange={e => set('bio', e.target.value)} placeholder="e.g. We help Pi Network sellers reach more buyers..." style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '1.2rem', minHeight: '90px', resize: 'vertical' }} />
          <label style={{ display: 'block', fontSize: '0.78rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Website</label>
          <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://yourbrand.com" style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '1.2rem' }} />
          <label style={{ display: 'block', fontSize: '0.78rem', color: '#888', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Contact (email or social)</label>
          <input value={form.contact} onChange={e => set('contact', e.target.value)} placeholder="contact@yourbrand.com or @handle" style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '1.5rem' }} />
          <button onClick={handleSave} disabled={loading || saved || !form.bio} style={{ width: '100%', background: saved ? '#1a1a1a' : btnColor, color: saved ? '#0070f3' : '#fff', border: 'none', borderRadius: '8px', padding: '0.85rem', fontWeight: 600, fontSize: '1rem', cursor: loading || saved ? 'default' : 'pointer' }}>
            {saved ? '✓ Saved — heading to your ad...' : loading ? 'Saving...' : 'Save & Continue →'}
          </button>
        </div>
      </div>
    </div>
  );
}
