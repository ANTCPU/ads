'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ModuleContext, Ad } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  'Brand Awareness', 'Product Launch', 'Content Promotion',
  'Service Offering', 'Event', 'Other',
];

const TIERS = ['entry', 'rising', 'featured', 'toptier'];

const TIER_LABEL: Record<string, string> = {
  entry: 'Entry', rising: 'Rising', featured: 'Featured', toptier: 'Top Tier',
};

const TIER_COLOR: Record<string, string> = {
  entry: '#0070f3', rising: '#7928ca', featured: '#ff0080', toptier: '#f0883e',
};

type AdForm = {
  title:       string;
  description: string;
  url:         string;
  category:    string;
  tier:        string;
  brand:       string;
  email:       string;
};

const EMPTY: AdForm = {
  title: '', description: '', url: '',
  category: 'Brand Awareness', tier: 'entry',
  brand: '', email: '',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateAdModule({ slug, supabase, user, ads, isSuper }: ModuleContext) {
  const router                    = useRouter();
  const [form, setForm]           = useState<AdForm>({ ...EMPTY, brand: user.brand || '', email: user.email || '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm]   = useState(false);
  const [queue, setQueue]         = useState<Ad[]>(ads.filter(a => a.status === 'pending_review'));
  const [approving, setApproving] = useState<string | null>(null);

  const set = (k: keyof AdForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  // — submit new ad
  async function handleSubmit() {
    if (!form.title || !form.url) return;
    setSubmitting(true);

    const { data } = await supabase.from('ads').insert([{
      title:       form.title.trim(),
      description: form.description.trim(),
      url:         form.url.trim(),
      category:    form.category,
      tier:        isSuper ? form.tier : 'entry',
      brand:       form.brand || user.brand,
      email:       form.email || user.email,
      status:      isSuper ? 'active' : 'pending_review',
      pinned:      false,
    }]).select().single();

    if (data) {
      // fire score
      fetch('/api/scout/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ad_id: data.id }),
      }).catch(() => {});
    }

    setForm({ ...EMPTY, brand: user.brand || '', email: user.email || '' });
    setShowForm(false);
    setSubmitted(true);
    setSubmitting(false);
    setTimeout(() => setSubmitted(false), 4000);
  }

  // — super: approve ad
  async function approveAd(adId: string) {
    setApproving(adId);
    await supabase.from('ads').update({ status: 'active' }).eq('id', adId);
    fetch('/api/scout/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_id: adId }),
    }).catch(() => {});
    setQueue(prev => prev.filter(a => a.id !== adId));
    setApproving(null);
  }

  // — super: reject ad
  async function rejectAd(adId: string) {
    setApproving(adId);
    await supabase.from('ads').update({ status: 'rejected' }).eq('id', adId);
    setQueue(prev => prev.filter(a => a.id !== adId));
    setApproving(null);
  }

  // ─── User view ──────────────────────────────────────────────────────────

  if (!isSuper) {
    return (
      <div>
        <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          🚀 Advertise Here
        </div>

        {submitted ? (
          <div style={{ background: '#22c55e15', border: '1px solid #22c55e30', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>✅</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#22c55e' }}>Ad submitted for review</div>
            <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '0.25rem' }}>You'll be notified when it goes live.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.78rem', color: '#aaa', lineHeight: 1.6 }}>
              Get your brand in front of the Arena. Entry tier is free during your trial.
            </div>
            <button
              onClick={() => router.push('/create-ad')}
              style={{ background: '#f0883e', border: 'none', color: '#000', borderRadius: '8px', padding: '0.7rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
            >
              🚀 Create Your Ad →
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{ background: 'transparent', border: '1px solid #222', color: '#555', borderRadius: '8px', padding: '0.55rem', fontSize: '0.78rem', cursor: 'pointer' }}
            >
              {showForm ? '✕ Cancel' : 'Quick create here'}
            </button>

            {showForm && (
              <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '0.75rem', marginTop: '0.25rem' }}>
                <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ad title *" style={{ width: '100%', background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.78rem', boxSizing: 'border-box', marginBottom: '0.5rem' }} />
                <input value={form.url} onChange={e => set('url', e.target.value)} placeholder="URL * (https://)" style={{ width: '100%', background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.78rem', boxSizing: 'border-box', marginBottom: '0.5rem' }} />
                <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Description" style={{ width: '100%', background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.78rem', boxSizing: 'border-box', minHeight: '60px', resize: 'vertical', marginBottom: '0.5rem' }} />
                <button
                  onClick={handleSubmit}
                  disabled={!form.title || !form.url || submitting}
                  style={{ width: '100%', background: form.title && form.url ? '#f0883e' : '#1a1a1a', border: 'none', color: form.title && form.url ? '#000' : '#555', borderRadius: '8px', padding: '0.6rem', fontSize: '0.82rem', fontWeight: 700, cursor: form.title && form.url ? 'pointer' : 'not-allowed' }}
                >
                  {submitting ? 'Submitting...' : 'Submit for Review →'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ─── Super admin view ────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          🚀 Create Ad — Admin
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {queue.length > 0 && (
            <span style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 700 }}>⚠️ {queue.length} pending</span>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            style={{ background: showForm ? 'transparent' : '#f0883e', border: `1px solid ${showForm ? '#333' : '#f0883e'}`, color: showForm ? '#555' : '#000', borderRadius: '6px', padding: '0.25rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
          >
            {showForm ? '✕ Cancel' : '+ New Ad'}
          </button>
        </div>
      </div>

      {/* Success */}
      {submitted && (
        <div style={{ background: '#22c55e15', border: '1px solid #22c55e30', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#22c55e', marginBottom: '0.75rem' }}>
          ✅ Ad created and live
        </div>
      )}

      {/* Create form — super gets tier selector + goes live immediately */}
      {showForm && (
        <div style={{ background: '#0a0a0a', border: '1px solid #f0883e30', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#f0883e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
            New Ad — Goes Live Immediately
          </div>

          <label style={{ fontSize: '0.62rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Brand</label>
          <input value={form.brand} onChange={e => set('brand', e.target.value)} placeholder="Brand name" style={{ width: '100%', background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.78rem', boxSizing: 'border-box', marginBottom: '0.5rem' }} />

          <label style={{ fontSize: '0.62rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Email</label>
          <input value={form.email} onChange={e => set('email', e.target.value)} placeholder="owner@email.com" style={{ width: '100%', background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.78rem', boxSizing: 'border-box', marginBottom: '0.5rem' }} />

          <label style={{ fontSize: '0.62rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Title *</label>
          <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ad title" style={{ width: '100%', background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.78rem', boxSizing: 'border-box', marginBottom: '0.5rem' }} />

          <label style={{ fontSize: '0.62rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>URL *</label>
          <input value={form.url} onChange={e => set('url', e.target.value)} placeholder="https://" style={{ width: '100%', background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.78rem', boxSizing: 'border-box', marginBottom: '0.5rem' }} />

          <label style={{ fontSize: '0.62rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} placeholder="Ad description" style={{ width: '100%', background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.78rem', boxSizing: 'border-box', minHeight: '60px', resize: 'vertical', marginBottom: '0.5rem' }} />

          {/* Tier selector — super only */}
          <label style={{ fontSize: '0.62rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', display: 'block', marginBottom: '0.25rem' }}>Tier</label>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            {TIERS.map(t => (
              <button key={t} onClick={() => set('tier', t)} style={{
                background: form.tier === t ? `${TIER_COLOR[t]}20` : 'transparent',
                border: `1px solid ${form.tier === t ? TIER_COLOR[t] : '#222'}`,
                color: form.tier === t ? TIER_COLOR[t] : '#555',
                borderRadius: '6px', padding: '0.2rem 0.6rem',
                fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer',
              }}>
                {TIER_LABEL[t]}
              </button>
            ))}
          </div>

          <button
            onClick={handleSubmit}
            disabled={!form.title || !form.url || submitting}
            style={{ width: '100%', background: form.title && form.url ? '#f0883e' : '#1a1a1a', border: 'none', color: form.title && form.url ? '#000' : '#555', borderRadius: '8px', padding: '0.65rem', fontSize: '0.85rem', fontWeight: 700, cursor: form.title && form.url ? 'pointer' : 'not-allowed' }}
          >
            {submitting ? 'Creating...' : '🚀 Create Ad — Go Live'}
          </button>
        </div>
      )}

      {/* Pending review queue */}
      {queue.length > 0 && (
        <div style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#ef4444', fontWeight: 700, marginBottom: '0.5rem' }}>
            ⚠️ Pending Review ({queue.length})
          </div>
          {queue.map(ad => (
            <div key={ad.id} style={{ padding: '0.5rem 0', borderBottom: '1px solid #ef444420' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>{ad.title}</div>
                  <div style={{ fontSize: '0.68rem', color: '#555' }}>{ad.brand} · {ad.email}</div>
                </div>
              </div>
              {ad.description && (
                <div style={{ fontSize: '0.7rem', color: '#888', marginBottom: '0.4rem', fontStyle: 'italic' }}>
                  "{ad.description.slice(0, 80)}{ad.description.length > 80 ? '…' : ''}"
                </div>
              )}
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <a href={ad.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.68rem', color: '#f0883e', textDecoration: 'none' }}>
                  {ad.url.slice(0, 30)}...
                </a>
                <button
                  onClick={() => approveAd(ad.id)}
                  disabled={approving === ad.id}
                  style={{ background: '#22c55e15', border: '1px solid #22c55e40', color: '#22c55e', borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  ✅ Approve
                </button>
                <button
                  onClick={() => rejectAd(ad.id)}
                  disabled={approving === ad.id}
                  style={{ background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444', borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  ✕ Reject
                </button>
                {approving === ad.id && <span style={{ fontSize: '0.65rem', color: '#555' }}>saving...</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.4rem' }}>
        {[
          { label: 'Active',  value: ads.filter(a => a.status === 'active').length,          color: '#22c55e' },
          { label: 'Pending', value: queue.length,                                            color: '#f0883e' },
          { label: 'Total',   value: ads.length,                                              color: '#aaa' },
        ].map(s => (
          <div key={s.label} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '0.5rem' }}>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: '0.6rem', color: '#555' }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
