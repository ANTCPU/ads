'use client';
import React, { useState, useEffect } from 'react';
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

function ariaCheck(title: string, url: string, description: string) {
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

function getPostingTip(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 9) return 'Morning is peak scroll time — post now for maximum reach.';
  if (hour >= 17 && hour < 20) return 'Evening is the #1 posting window — highest engagement across all platforms.';
  if (hour >= 20 && hour < 23) return 'Night posting reaches Pi Network users in Southeast Asia and the Middle East.';
  return 'Off-peak hours — schedule a post for 7am or 6pm for better reach.';
}

type ExistingAd = {
  id: string; title: string; url: string; description: string;
  category: string; status: string; click_count: number;
  share_count: number; points: number; created_at: string; brand: string;
};

type User = { name: string; email: string; brand: string; trialStatus: string };

type Props = {
  open: boolean;
  onClose: () => void;
  user: User;
  onSuccess?: () => void;
};

export default function CreateAdDrawer({ open, onClose, user, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ title: '', url: '', description: '', category: 'Brand Awareness' });
  const [submitted, setSubmitted] = useState(false);
  const [existingAd, setExistingAd] = useState<ExistingAd | null>(null);
  const [tab, setTab] = useState<'my-ad' | 'new-ad'>('my-ad');
  const [editMode, setEditMode] = useState<'edit' | 'replace'>('edit');
  const [selectedBrand, setSelectedBrand] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [targetBrand, setTargetBrand] = useState('');

  const isAdmin = user.email === 'antcpu@gmail.com';
  const isTeam = user.trialStatus === 'team';
  const accent = isAdmin ? '#f0883e' : isTeam ? '#7928ca' : '#0070f3';
  const brands = MULTI_BRAND[user.email] || null;
  const aria = ariaCheck(form.title, form.url, form.description);

  const resolvedEmail = isAdmin && targetEmail.trim() ? targetEmail.trim() : user.email;
  const resolvedBrand = isAdmin && targetBrand.trim() ? targetBrand.trim() : selectedBrand || user.brand;

  useEffect(() => {
    if (!open) return;
    setSubmitted(false);
    setForm({ title: '', url: '', description: '', category: 'Brand Awareness' });
    setSelectedBrand(user.brand || '');
    setTargetEmail('');
    setTargetBrand('');
    setTab('my-ad');
    checkExisting(user.email);
  }, [open]);

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
    } else {
      setExistingAd(null);
      setTab('new-ad');
    }
  }

  function startEdit(ad: ExistingAd) {
    setForm({ title: ad.title, url: ad.url, description: ad.description, category: ad.category });
    setSelectedBrand(ad.brand);
    setEditMode('edit');
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  async function handleEdit() {
    if (!aria.ok || !existingAd) return;
    setLoading(true);
    await supabase.from('ads').update({
      title: form.title.trim(), url: form.url.trim(),
      description: form.description.trim(), category: form.category, brand: resolvedBrand,
    }).eq('id', existingAd.id);
    fetch('/api/scout/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ad_id: existingAd.id }) }).catch(() => {});
    notifyDiscord(`✏️ **Ad Edited**\n**Brand:** ${resolvedBrand}\n**Title:** "${form.title.trim()}"\n**Email:** ${resolvedEmail}`);
    setLoading(false);
    setSubmitted(true);
  }

  async function handleReplace() {
    if (!aria.ok || !existingAd) return;
    setLoading(true);
    await supabase.from('ads').update({ status: 'archived' }).eq('id', existingAd.id);
    const { error } = await supabase.from('ads').insert([{
      email: resolvedEmail, name: user.name, brand: resolvedBrand,
      title: form.title.trim(), url: form.url.trim(),
      description: form.description.trim(), category: form.category,
      status: 'pending_review', trial_status: user.trialStatus, tier: 'entry',
    }]);
    if (!error) {
      notifyDiscord(`🔄 **Ad Replaced**\n**Brand:** ${resolvedBrand}\n**Title:** "${form.title.trim()}"\n**Email:** ${resolvedEmail}`);
      setSubmitted(true);
    }
    setLoading(false);
  }

  async function handleSubmit() {
    if (!aria.ok) return;
    setLoading(true);
    const { error } = await supabase.from('ads').insert([{
      email: resolvedEmail, name: user.name, brand: resolvedBrand,
      title: form.title.trim(), url: form.url.trim(),
      description: form.description.trim(), category: form.category,
      status: isAdmin ? 'active' : 'pending_review',
      trial_status: user.trialStatus, tier: 'entry',
    }]);
    if (!error) {
      notifyDiscord(`🆕 **New Ad Submitted**\n**Brand:** ${resolvedBrand}\n**Title:** "${form.title.trim()}"\n**Email:** ${resolvedEmail}\n**Status:** ${isAdmin ? 'active' : 'pending_review'}`);
      setSubmitted(true);
    }
    setLoading(false);
  }

  const inp: React.CSSProperties = {
    width: '100%', background: '#111', border: '1px solid #222',
    borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff',
    fontSize: '0.95rem', boxSizing: 'border-box', marginBottom: '0.5rem',
    outline: 'none', fontFamily: 'inherit',
  };

  const tabBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '0.65rem', border: 'none', cursor: 'pointer',
    fontWeight: 700, fontSize: '0.85rem', borderRadius: '8px',
    background: active ? accent : '#1a1a1a',
    color: active ? '#fff' : '#555',
    transition: 'all 0.15s',
  });

  if (!open) return null;

  return (
    <>
      {/* OVERLAY */}
      <div onClick={onClose} style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        zIndex: 999, backdropFilter: 'blur(2px)',
      }} />

      {/* DRAWER */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        maxHeight: '92vh', overflowY: 'auto',
        background: '#0a0a0a', borderRadius: '20px 20px 0 0',
        zIndex: 1000, padding: '1.25rem 1.5rem 2.5rem',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.5)',
      }}>

        {/* HANDLE + CLOSE */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ width: '40px', height: '4px', background: '#333', borderRadius: '999px' }} />
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#888' }}>📢 Ad Builder</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1 }}>✕</button>
        </div>

        {/* SUBMITTED */}
        {submitted ? (
          <div style={{ textAlign: 'center', padding: '2rem 0' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🦋</div>
            <div style={{ fontWeight: 800, fontSize: '1.3rem', color: '#fff', marginBottom: '0.5rem' }}>
              {editMode === 'edit' ? 'Ad updated.' : isAdmin ? 'Ad is live.' : 'Aria has your ad.'}
            </div>
            <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
              {editMode === 'edit' ? 'Your changes are live.' : isAdmin ? 'Ad published directly to the Arena.' : 'Usually live within a few hours.'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#555', marginBottom: '1.5rem' }}>{getPostingTip()}</div>
            <button onClick={() => { setSubmitted(false); onClose(); if (onSuccess) onSuccess(); }}
              style={{ background: accent, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.85rem 2rem', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', width: '100%' }}>
              Back to the Arena →
            </button>
          </div>
        ) : (
          <>
            {/* TABS */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <button style={tabBtn(tab === 'my-ad')} onClick={() => setTab('my-ad')}>
                ✏️ My Ad {existingAd ? '· Active' : '· None'}
              </button>
              <button style={tabBtn(tab === 'new-ad')} onClick={() => { setTab('new-ad'); setForm({ title: '', url: '', description: '', category: 'Brand Awareness' }); }}>
                ➕ New Ad {isAdmin ? '· Any Brand' : ''}
              </button>
            </div>

            {/* ── TAB: MY AD ── */}
            {tab === 'my-ad' && (
              <>
                {!existingAd ? (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: '#555' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📭</div>
                    <div style={{ fontSize: '0.9rem' }}>No active ad yet.</div>
                    <button onClick={() => setTab('new-ad')}
                      style={{ marginTop: '1rem', background: accent, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.75rem 1.5rem', fontWeight: 700, cursor: 'pointer' }}>
                      Create Your First Ad →
                    </button>
                  </div>
                ) : editMode === 'edit' && form.title === '' ? (
                  /* VIEW EXISTING */
                  <div>
                    <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.5rem' }}>🦋 Aria — Your Active Ad</div>
                    <div style={{ background: '#111', border: '1px solid #222', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                      <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{existingAd.title}</div>
                      <div style={{ color: '#888', fontSize: '0.82rem', marginBottom: '0.5rem' }}>{existingAd.description}</div>
                      <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: '0.75rem' }}>{existingAd.url}</div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>
                        👆 {existingAd.click_count || 0} clicks · ↗ {existingAd.share_count || 0} shares · ⚡ {existingAd.points || 0} pts
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button onClick={() => startEdit(existingAd)}
                        style={{ flex: 1, background: accent, border: 'none', color: '#fff', borderRadius: '8px', padding: '0.85rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                        ✏️ Edit
                      </button>
                      <button onClick={() => { setEditMode('replace'); setForm({ title: '', url: '', description: '', category: 'Brand Awareness' }); }}
                        style={{ flex: 1, background: 'none', border: '1px solid #333', color: '#aaa', borderRadius: '8px', padding: '0.85rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                        🔄 Replace
                      </button>
                    </div>
                  </div>
                ) : (
                  /* EDIT / REPLACE FORM */
                  <div>
                    <div style={{ fontSize: '0.72rem', color: accent, fontWeight: 700, marginBottom: '0.75rem' }}>
                      {editMode === 'edit' ? '✏️ Editing your active ad — changes go live immediately' : '🔄 Replace — current ad archived · new ad goes to review'}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: aria.ok ? '#22c55e' : '#f0883e', padding: '0.5rem 0.75rem', background: aria.ok ? '#052e16' : '#1a0a00', borderRadius: '8px', marginBottom: '1rem' }}>
                      {aria.message}
                    </div>
                    <input value={form.title} onChange={e => set('title', e.target.value)}
                      placeholder="Ad headline..."
                      style={{ ...inp, borderColor: aria.field === 'title' ? '#f0883e60' : '#222' }} />
                    <input value={form.url} onChange={e => set('url', e.target.value)}
                      placeholder="https://yourbrand.com"
                      style={{ ...inp, borderColor: aria.field === 'url' ? '#f0883e60' : '#222' }} />
                    <textarea value={form.description} onChange={e => set('description', e.target.value)}
                      placeholder="One sentence about your brand..."
                      rows={3}
                      style={{ ...inp, resize: 'vertical', borderColor: aria.field === 'description' ? '#f0883e60' : '#222' }} />
                    <select value={form.category} onChange={e => set('category', e.target.value)}
                      style={{ ...inp, marginBottom: '1.25rem' }}>
                      {AD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                      <button onClick={() => { setEditMode('edit'); setForm({ title: '', url: '', description: '', category: 'Brand Awareness' }); }}
                        style={{ flex: 1, background: 'none', border: '1px solid #333', color: '#aaa', borderRadius: '8px', padding: '0.85rem', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer' }}>
                        ← Back
                      </button>
                      <button onClick={editMode === 'edit' ? handleEdit : handleReplace} disabled={!aria.ok || loading}
                        style={{ flex: 2, background: aria.ok ? accent : '#222', border: 'none', color: aria.ok ? '#fff' : '#555', borderRadius: '8px', padding: '0.85rem', fontWeight: 800, fontSize: '0.95rem', cursor: aria.ok ? 'pointer' : 'not-allowed' }}>
                        {loading ? 'Saving...' : editMode === 'edit' ? '✏️ Save Changes' : '🔄 Submit New Ad'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── TAB: NEW AD ── */}
            {tab === 'new-ad' && (
              <div>
                {/* ADMIN OVERRIDE */}
                {isAdmin && (
                  <div style={{ background: '#1a0f00', border: '1px solid #f0883e40', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.65rem', color: '#f0883e', fontWeight: 700, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>⚡ Admin — Place Ad For User</div>
                    <input value={targetEmail} onChange={e => setTargetEmail(e.target.value)}
                      placeholder="User email (leave blank to use your own)"
                      style={{ ...inp, marginBottom: '0.5rem', border: '1px solid #f0883e40' }} />
                    <input value={targetBrand} onChange={e => setTargetBrand(e.target.value)}
                      placeholder="Brand name (e.g. Mr Ben)"
                      style={{ ...inp, marginBottom: 0, border: '1px solid #f0883e40' }} />
                    {targetEmail && <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.4rem' }}>⚡ Ad will be assigned to {targetEmail}</div>}
                  </div>
                )}

                {/* MULTI BRAND */}
                {brands && (
                  <div style={{ marginBottom: '1rem' }}>
                    <div style={{ fontSize: '0.72rem', color: '#888', marginBottom: '0.5rem' }}>Which brand is this ad for?</div>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      {brands.map(b => (
                        <button key={b.brand} onClick={() => setSelectedBrand(b.brand)} style={{
                          flex: 1, padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 700, fontSize: '0.88rem',
                          background: selectedBrand === b.brand ? accent : '#111',
                          border: `1px solid ${selectedBrand === b.brand ? accent : '#333'}`,
                          color: selectedBrand === b.brand ? '#fff' : '#666',
                        }}>{b.icon} {b.label}</button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ARIA */}
                <div style={{ fontSize: '0.82rem', color: aria.ok ? '#22c55e' : '#f0883e', padding: '0.5rem 0.75rem', background: aria.ok ? '#052e16' : '#1a0a00', borderRadius: '8px', marginBottom: '1rem' }}>
                  {aria.message}
                </div>

                <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: '0.75rem' }}>
                  {isAdmin ? '⚡ Admin — publishes directly to Arena' : '2 minutes to go live · Entry tier · free'}
                </div>

                <input value={form.title} onChange={e => set('title', e.target.value)}
                  placeholder={`What does ${resolvedBrand || 'your brand'} offer?`}
                  style={{ ...inp, borderColor: aria.field === 'title' || aria.field === 'seed' ? '#f0883e60' : '#222' }} />
                <input value={form.url} onChange={e => set('url', e.target.value)}
                  placeholder="https://yourbrand.com"
                  style={{ ...inp, borderColor: aria.field === 'url' ? '#f0883e60' : '#222' }} />
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  placeholder="One sentence about what makes your brand worth clicking..."
                  rows={3}
                  style={{ ...inp, resize: 'vertical', borderColor: aria.field === 'description' ? '#f0883e60' : '#222' }} />
                <select value={form.category} onChange={e => set('category', e.target.value)}
                  style={{ ...inp, marginBottom: '1.25rem' }}>
                  {AD_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>

                <button onClick={handleSubmit} disabled={!aria.ok || loading}
                  style={{
                    width: '100%', padding: '1rem', borderRadius: '10px', border: 'none',
                    background: aria.ok ? accent : '#222', color: aria.ok ? '#fff' : '#555',
                    fontWeight: 800, fontSize: '1rem', cursor: aria.ok ? 'pointer' : 'not-allowed',
                  }}>
                  {loading ? 'Submitting...' : isAdmin ? '⚡ Publish Now' : '🚀 Submit to Arena'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
