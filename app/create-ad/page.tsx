'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../components/ArenaNav';
import { createClient } from '@supabase/supabase-js';
import { notifyDiscord } from '../lib/discord';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const AD_CATEGORIES = [
  'Brand Awareness', 'Product Launch', 'Content Promotion',
  'Service Offering', 'Event', 'Photography', 'Pi Commerce', 'Other',
];

const SEED_PHRASES = ['coming in hot', 'antcpu ad network', 'antcpu-ads.vercel.app'];

const MULTI_BRAND: Record<string, { label: string; icon: string; brand: string }[]> = {
  'andri.postkast@gmail.com': [
    { label: 'Map of Pi', icon: '🗺️', brand: 'Map of Pi' },
    { label: 'PiPioneersX', icon: '⚡', brand: 'PiPioneersX' },
  ],
};

function ariaCheck(title: string, url: string, description: string): {
  ok: boolean; message: string; field: 'title' | 'url' | 'description' | 'seed' | null;
} {
  const combined = `${title} ${description}`.toLowerCase();
  if (SEED_PHRASES.some(p => combined.includes(p)))
    return { ok: false, field: 'seed', message: '⚠️ Looks like the example ad is still in there — write about your own brand instead.' };
  if (!title || title.trim().length < 8)
    return { ok: false, field: 'title', message: '🦋 A stronger headline gets more clicks. Try to be specific about what you offer.' };
  if (!url || url.trim().length < 6)
    return { ok: false, field: 'url', message: '🦋 Add a destination URL so people know where to go.' };
  if (url.trim().length > 5 && !url.startsWith('http'))
    return { ok: false, field: 'url', message: '🦋 Make sure your URL starts with https:// so it links correctly.' };
  if (!description || description.trim().length < 20)
    return { ok: false, field: 'description', message: '🦋 Tell people what makes your brand worth clicking. One strong sentence is enough.' };
  return { ok: true, field: null, message: '🦋 Looks great — your ad is ready to submit.' };
}

function getPostingWindow(): { label: string; tip: string } {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 9)   return { label: 'morning window',  tip: 'Morning is peak scroll time — post now for maximum reach.' };
  if (hour >= 9 && hour < 12)  return { label: 'mid-morning',     tip: 'Mid-morning works well for Pi Network and crypto audiences in Asia.' };
  if (hour >= 12 && hour < 14) return { label: 'lunch window',    tip: 'Lunch break is a high-engagement window — share your ad now.' };
  if (hour >= 17 && hour < 20) return { label: 'evening peak',    tip: 'Evening is the #1 posting window — highest engagement across all platforms.' };
  if (hour >= 20 && hour < 23) return { label: 'night window',    tip: 'Night posting reaches Pi Network users in Southeast Asia and the Middle East.' };
  return { label: 'off-peak', tip: 'Off-peak hours — schedule a post for 7am or 6pm for better reach.' };
}

function ariaSuggest(ad: any, rank?: number | null): string {
  const daysSince = Math.floor((Date.now() - new Date(ad.created_at).getTime()) / 86400000);
  const clicks = ad.click_count || 0;
  const shares = ad.share_count || 0;
  const points = ad.points || 0;
  const window = getPostingWindow();
  if (ad.status === 'pending_review')
    return `🦋 Your ad is in the review queue — usually approved within a few hours. While you wait, ${window.tip.toLowerCase()}`;
  if (clicks === 0 && shares === 0 && daysSince >= 7)
    return `🦋 Your ad has been live ${daysSince} days with no activity. Try replacing it with a stronger headline. ${window.tip}`;
  if (clicks === 0 && daysSince >= 3)
    return `🦋 ${daysSince} days live, no clicks yet. What's the one thing someone gets by clicking your link? Edit it and repost. ${window.tip}`;
  if (shares > clicks && clicks === 0)
    return `🦋 People are sharing your ad but not clicking through — double-check your URL opens correctly.`;
  if (clicks > 0 && shares === 0)
    return `🦋 ${clicks} click${clicks > 1 ? 's' : ''} — solid start. Add a call to action like "Share this with your Pi Network" to turn viewers into promoters. ${window.tip}`;
  if (clicks === 0 && shares === 0 && daysSince < 1)
    return `🦋 Your ad just went live. ${window.tip} Post it now to get the first clicks rolling.`;
  if (clicks === 0 && shares === 0 && daysSince < 3)
    return `🦋 Your ad is ${daysSince === 1 ? '1 day' : daysSince + ' days'} old. ${window.tip} Share it yourself first — your own network is your fastest path to points.`;
  if (rank && rank <= 3 && points > 0)
    return `🦋 You're #${rank} in the Arena — top 3! Keep sharing daily to hold your position. ${window.tip}`;
  if (rank && points > 0)
    return `🦋 You're #${rank} in the Arena with ${points} pts. ${window.tip} Every share earns 5 points.`;
  if (clicks >= 10)
    return `🦋 ${clicks} clicks — your ad is working. ${window.tip} Share it again today.`;
  if (clicks >= 5)
    return `🦋 ${clicks} clicks and counting. ${window.tip} One share a day keeps your rank climbing.`;
  return `🦋 Your ad is live. ${window.tip} Share it to earn points and move up the leaderboard.`;
}

type ExistingAd = {
  id: string; title: string; url: string; description: string;
  category: string; status: string; click_count: number;
  share_count: number; points: number; created_at: string; brand: string;
};

export default function CreateAdPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState({ name: '', email: '', brand: '', trialStatus: 'trial' });
  const [form, setForm] = useState({ title: '', url: '', description: '', category: 'Brand Awareness' });
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [existingAd, setExistingAd] = useState<ExistingAd | null>(null);
  const [mode, setMode] = useState<'view' | 'edit' | 'replace' | 'new'>('new');
  const [selectedBrand, setSelectedBrand] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (stored) {
      try {
        const u = JSON.parse(stored);
        setUser(u);
        setSelectedBrand(u.brand || '');
        checkExisting(u.email);
      } catch {}
    }
    setHydrated(true);
  }, []);

  async function checkExisting(email: string) {
    const { data } = await supabase
      .from('ads')
      .select('id, title, url, description, category, status, click_count, share_count, points, created_at, brand')
      .eq('email', email)
      .in('status', ['active', 'pending_review'])
      .order('created_at', { ascending: false })
      .limit(1);
    if (data && data.length > 0) {
      setExistingAd(data[0]);
      setMode('view');
    }
  }

  function startEdit(ad: ExistingAd) {
    setForm({ title: ad.title, url: ad.url, description: ad.description, category: ad.category });
    setSelectedBrand(ad.brand);
    setMode('edit');
  }

  function startReplace() {
    setForm({ title: '', url: '', description: '', category: 'Brand Awareness' });
    setMode('replace');
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));
  const isTeam = user.trialStatus === 'team';
  const isAdmin = user.email === 'antcpu@gmail.com';
  const accent = isAdmin ? '#f0883e' : isTeam ? '#7928ca' : '#0070f3';
  const aria = ariaCheck(form.title, form.url, form.description);
  const brands = MULTI_BRAND[user.email] || null;

  const inp: React.CSSProperties = {
    width: '100%', background: '#0a0a0a', border: '1px solid #222',
    borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff',
    fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '0.5rem',
    outline: 'none', fontFamily: 'inherit',
  };

  async function handleEdit() {
    if (!aria.ok || !existingAd) return;
    setLoading(true);
    await supabase.from('ads').update({
      title: form.title.trim(),
      url: form.url.trim(),
      description: form.description.trim(),
      category: form.category,
      brand: selectedBrand,
    }).eq('id', existingAd.id);
    fetch('/api/scout/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_id: existingAd.id }),
    }).catch(() => {});
    notifyDiscord(`✏️ **Ad Edited**\n**Brand:** ${selectedBrand}\n**Title:** "${form.title.trim()}"\n**Email:** ${user.email}`);
    setLoading(false);
    setSubmitted(true);
  }

  async function handleReplace() {
    if (!aria.ok || !existingAd) return;
    setLoading(true);
    await supabase.from('ads').update({ status: 'archived' }).eq('id', existingAd.id);
    const { error } = await supabase.from('ads').insert([{
      email: user.email, name: user.name, brand: selectedBrand,
      title: form.title.trim(), url: form.url.trim(),
      description: form.description.trim(), category: form.category,
      status: 'pending_review', trial_status: user.trialStatus, tier: 'entry',
    }]);
    if (!error) {
      notifyDiscord(`🔄 **Ad Replaced**\n**Brand:** ${selectedBrand}\n**New Title:** "${form.title.trim()}"\n**Email:** ${user.email}\n**Status:** pending_review`);
      setSubmitted(true);
    }
    setLoading(false);
  }

  async function handleSubmit() {
    if (!aria.ok) return;
    setLoading(true);
    setSubmitError('');
    const { error } = await supabase.from('ads').insert([{
      email: user.email, name: user.name, brand: selectedBrand || user.brand,
      title: form.title.trim(), url: form.url.trim(),
      description: form.description.trim(), category: form.category,
      status: 'pending_review', trial_status: user.trialStatus, tier: 'entry',
    }]);
    if (error) { setSubmitError(error.message); setLoading(false); return; }
    notifyDiscord(`🆕 **New Ad Submitted**\n**Brand:** ${selectedBrand || user.brand}\n**Title:** "${form.title.trim()}"\n**URL:** ${form.url.trim()}\n**Email:** ${user.email}\n**Status:** pending_review`);
    setLoading(false);
    setSubmitted(true);
  }

  if (submitted) {
    const isEdit = mode === 'edit';
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🦋</div>
        <h2 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>{isEdit ? 'Ad updated.' : 'Aria has your ad.'}</h2>
        <p style={{ color: '#555', marginBottom: '2rem', textAlign: 'center' }}>
          {isEdit ? 'Your changes are live. Aria will keep an eye on performance.' : 'Your ad is in the review queue. Usually live within a few hours.'}
        </p>
        <button
          onClick={() => router.push('/dashboard/user')}
          style={{ background: accent, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.85rem 2rem', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', width: '100%', maxWidth: '360px' }}>
          Back to the Arena →
        </button>
      </div>
    );
  }

  if (!hydrated) return null;

  if (mode === 'view' && existingAd) {
    const suggestion = ariaSuggest(existingAd, null);
    const daysSince = Math.floor((Date.now() - new Date(existingAd.created_at).getTime()) / 86400000);
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
        <ArenaNav role={isAdmin ? 'admin' : isTeam ? 'team' : 'user'} userName={user.name} userEmail={user.email} userBrand={user.brand} trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'} onLogout={() => { localStorage.removeItem('arena_user'); router.push('/'); }} />
        <div style={{ maxWidth: '560px', margin: '0 auto', padding: '2rem 1.25rem' }}>
          <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🦋</div>
            <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>Aria — Your Active Ad</div>
            <div style={{ color: '#888', fontSize: '0.88rem', lineHeight: 1.6 }}>{suggestion}</div>
          </div>
          <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontWeight: 700, color: accent }}>{existingAd.brand}</span>
              <span style={{ fontSize: '0.75rem', color: '#555' }}>🟢 LIVE · {daysSince}d old</span>
            </div>
            <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>{existingAd.title}</div>
            <div style={{ color: '#666', fontSize: '0.85rem', marginBottom: '0.75rem' }}>{existingAd.description}</div>
            <div style={{ fontSize: '0.75rem', color: '#444', marginBottom: '1rem' }}>{existingAd.url}</div>
            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem', color: '#555' }}>
              <span>👆 {existingAd.click_count || 0} clicks</span>
              <span>↗ {existingAd.share_count || 0} shares</span>
              <span>⚡ {existingAd.points || 0} pts</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={() => startEdit(existingAd)} style={{ flex: 1, background: accent, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.85rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>✏️ Edit This Ad</button>
            <button onClick={startReplace} style={{ flex: 1, background: 'none', border: `1px solid ${accent}`, color: accent, borderRadius: '8px', padding: '0.85rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>🔄 Replace with New</button>
          </div>
        </div>
      </div>
    );
  }

  const formTitle = mode === 'edit' ? '✏️ Edit Your Ad' : mode === 'replace' ? '🔄 New Ad — Replace Current' : 'Create Your Ad';
  const formSub = mode === 'edit' ? 'Changes go live immediately — no re-review needed' : mode === 'replace' ? 'Current ad will be archived · new ad goes to review' : '2 minutes to go live · Entry tier · free';
  const handleAction = mode === 'edit' ? handleEdit : mode === 'replace' ? handleReplace : handleSubmit;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav role={isAdmin ? 'admin' : isTeam ? 'team' : 'user'} userName={user.name} userEmail={user.email} userBrand={user.brand} trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'} onLogout={() => { localStorage.removeItem('arena_user'); router.push('/'); }} />
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '2rem 1.25rem' }}>
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🦋</div>
          <div style={{ fontWeight: 700, marginBottom: '0.5rem' }}>
            {mode === 'edit' ? "Aria — Let's improve your ad" : "Hi, I'm Aria — I'll review your ad before it goes live."}
          </div>
          <div style={{ color: aria.ok ? '#3fb950' : '#f0883e', fontSize: '0.88rem', lineHeight: 1.6 }}>{aria.message}</div>
        </div>

        {brands && (
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: '0.75rem' }}>Which brand is this ad for?</div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {brands.map(b => (
                <button key={b.brand} onClick={() => setSelectedBrand(b.brand)} style={{
                  flex: 1, padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem',
                  background: selectedBrand === b.brand ? accent : '#0a0a0a',
                  border: `1px solid ${selectedBrand === b.brand ? accent : '#333'}`,
                  color: selectedBrand === b.brand ? '#fff' : '#666',
                }}>
                  {b.icon} {b.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '16px', padding: '1.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{formTitle}</div>
          <div style={{ color: '#555', fontSize: '0.8rem', marginBottom: '1.5rem' }}>{formSub}</div>

          <label style={{ display: 'block', fontSize: '0.75rem', color: '#555', marginBottom: '0.4rem' }}>Ad Title</label>
          <input value={form.title} onChange={e => set('title', e.target.value)}
            placeholder={`What does ${selectedBrand || user.brand || 'your brand'} offer?`}
            style={{ ...inp, borderColor: aria.field === 'title' || aria.field === 'seed' ? '#f0883e60' : '#222' }} />

          <label style={{ display: 'block', fontSize: '0.75rem', color: '#555', marginBottom: '0.4rem' }}>Destination URL</label>
          <input value={form.url} onChange={e => set('url', e.target.value)}
            placeholder="https://yourbrand.com"
            style={{ ...inp, borderColor: aria.field === 'url' ? '#f0883e60' : '#222' }} />

          <label style={{ display: 'block', fontSize: '0.75rem', color: '#555', marginBottom: '0.4rem' }}>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="One strong sentence about what makes your brand worth clicking."
            style={{ ...inp, minHeight: '100px', resize: 'vertical' as const, borderColor: aria.field === 'description' ? '#f0883e60' : '#222' }} />

          <label style={{ display: 'block', fontSize: '0.75rem', color: '#555', marginBottom: '0.4rem' }}>Category</label>
          <select value={form.category} onChange={e => set('category', e.target.value)} style={inp}>
            {AD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>

          {submitError && <div style={{ color: '#ff4444', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{submitError}</div>}

          <button onClick={handleAction} disabled={!aria.ok || loading} style={{
            width: '100%', background: aria.ok ? accent : '#1a1a1a', border: 'none',
            color: aria.ok ? '#fff' : '#333', borderRadius: '8px', padding: '1rem',
            fontWeight: 700, fontSize: '1rem', cursor: aria.ok ? 'pointer' : 'not-allowed',
            marginTop: '0.5rem',
          }}>
            {loading ? 'Submitting...' : mode === 'edit' ? 'Save Changes' : mode === 'replace' ? 'Replace Ad' : 'Submit to Arena'}
          </button>
        </div>
      </div>
    </div>
  );
}
