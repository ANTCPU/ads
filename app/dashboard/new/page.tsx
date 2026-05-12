'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const s: Record<string, React.CSSProperties> = {
  page:    { background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: '600px', margin: '0 auto' },
  back:    { fontSize: '0.75rem', color: '#444', cursor: 'pointer', marginBottom: '2rem', display: 'inline-block' },
  logo:    { fontWeight: 800, fontSize: '1.1rem', color: '#f0883e', marginBottom: '0.25rem' },
  sub:     { fontSize: '0.75rem', color: '#444', letterSpacing: '0.1em', marginBottom: '2.5rem' },
  heading: { fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' },
  desc:    { fontSize: '0.8rem', color: '#555', marginBottom: '2rem', lineHeight: 1.6 },
  label:   { fontSize: '0.7rem', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '0.4rem' },
  input:   { width: '100%', background: '#111', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.9rem', outline: 'none', marginBottom: '1.25rem', boxSizing: 'border-box' as const },
  textarea:{ width: '100%', background: '#111', border: '1px solid #222', borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.85rem', outline: 'none', marginBottom: '1.25rem', boxSizing: 'border-box' as const, resize: 'vertical' as const, minHeight: '100px' },
  btn:     { width: '100%', background: '#f0883e', border: 'none', borderRadius: '10px', padding: '0.9rem', color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', marginTop: '0.5rem' },
  note:    { fontSize: '0.7rem', color: '#333', textAlign: 'center' as const, marginTop: '1rem' },
};

export default function NewClient() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', url: '', handle: '', brief: '' });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      if (u.email !== 'antcpu@gmail.com') { router.push('/dashboard/user'); }
    } catch { router.push('/'); }
  }, []);

  function update(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  async function submit() {
    if (!form.name.trim() || saving) return;
    setSaving(true);

    // Generate promo code from name — e.g. "Map of Pi" → "MAPOFPI"
    const code = form.name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);
    const email = `${code.toLowerCase()}@antcpu.com`;

    const payload = {
      name:       form.name,
      email,
      brand_name: form.name,
      website_url: form.url ? (form.url.startsWith('http') ? form.url : `https://${form.url}`) : '',
      message:    form.brief,
      status:     'team',
      promo_code: code,
      trial_days: 90,
    };

    const { error } = await supabase.from('ad_signups').upsert([payload], { onConflict: 'email' });

    if (error) {
      console.error('New client error:', error);
      alert('❌ Save failed — check console');
      setSaving(false);
      return;
    }

    // Fire Discord notification
    try {
      await fetch('/api/discord-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `⚡ **New Client Added**
**${form.name}** · ${form.url}
Handle: ${form.handle}
Promo: \`${code}\`
Brief: ${form.brief || '—'}`,
        }),
      });
    } catch {}

    setDone(true);
    setSaving(false);
    setTimeout(() => router.push('/dashboard'), 1800);
  }

  return (
    <div style={s.page}>
      <div style={s.back} onClick={() => router.push('/dashboard')}>← Back to Dashboard</div>
      <div style={s.logo}>⚡ ANTCPU ADS</div>
      <div style={s.sub}>NEW CLIENT</div>

      <div style={s.heading}>Add a New Client</div>
      <div style={s.desc}>Fill in the basics. The ADS agent will build the knowledge base and spin up 10 antbots automatically.</div>

      <div style={s.label}>Client Name</div>
      <input style={s.input} placeholder="e.g. Map of Pi" value={form.name} onChange={e => update('name', e.target.value)} />

      <div style={s.label}>Website URL</div>
      <input style={s.input} placeholder="e.g. mapofpi.com" value={form.url} onChange={e => update('url', e.target.value)} />

      <div style={s.label}>Social Handle</div>
      <input style={s.input} placeholder="e.g. @mapofpi" value={form.handle} onChange={e => update('handle', e.target.value)} />

      <div style={s.label}>Client Brief</div>
      <textarea style={s.textarea} placeholder="What does this client do? Who are they targeting? Any key stats or angles?" value={form.brief} onChange={e => update('brief', e.target.value)} />

      <button style={{ ...s.btn, background: done ? '#1a1a1a' : saving ? '#333' : '#f0883e', cursor: saving || done ? 'default' : 'pointer' }} onClick={submit} disabled={saving || done}>
        {done ? '✓ Client saved — returning to dashboard...' : saving ? 'Saving...' : '+ Create Client'}
      </button>
      <div style={s.note}>Saved to Supabase · promo code auto-generated · Discord notified</div>
    </div>
  );
}
