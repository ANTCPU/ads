'use client';
import { useState } from 'react';
import { ModuleContext, Ad } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type PostForm = {
  title:       string;
  description: string;
  url:         string;
  category:    string;
};

const EMPTY_FORM: PostForm = { title: '', description: '', url: '', category: 'Brand Awareness' };

const CATEGORIES = [
  'Brand Awareness', 'Product Launch', 'Content Promotion',
  'Service Offering', 'Event', 'Other',
];

const BRAND_MAP: Record<string, string> = {
  mapofpi:     'Map of Pi',
  antcpu:      'ANTCPU ADS',
  adsnetwork:  'ANTCPU ADS',
  photography: 'Amanda Photography',
  pipioneers:  'PiPioneersX',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PostsModule({ slug, ads, supabase, user, isSuper }: ModuleContext) {
  const [creating, setCreating]   = useState(false);
  const [form, setForm]           = useState<PostForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pinning, setPinning]     = useState<string | null>(null);
  const [localAds, setLocalAds]   = useState<Ad[]>(ads);

  const brandName = BRAND_MAP[slug] || slug;
  const brandAds  = localAds.filter(a =>
    a.brand?.toLowerCase().includes(brandName.toLowerCase()) ||
    a.brand?.toLowerCase().includes(slug.toLowerCase())
  );

  const set = (k: keyof PostForm, v: string) => setForm(f => ({ ...f, [k]: v }));

  // — create new post (ad)
  async function handleCreate() {
    if (!form.title || !form.url) return;
    setSubmitting(true);

    const { data } = await supabase.from('ads').insert([{
      title:       form.title.trim(),
      description: form.description.trim(),
      url:         form.url.trim(),
      category:    form.category,
      brand:       user.brand || brandName,
      email:       user.email,
      status:      isSuper ? 'active' : 'pending_review',
      tier:        'entry',
      pinned:      false,
    }]).select().single();

    if (data) setLocalAds(prev => [data, ...prev]);
    setForm(EMPTY_FORM);
    setCreating(false);
    setSubmitted(true);
    setSubmitting(false);
    setTimeout(() => setSubmitted(false), 3000);
  }

  // — super: toggle pin
  async function togglePin(ad: Ad) {
    setPinning(ad.id);
    await supabase.from('ads').update({ pinned: !ad.pinned }).eq('id', ad.id);
    setLocalAds(prev => prev.map(a => a.id === ad.id ? { ...a, pinned: !a.pinned } : a));
    setPinning(null);
  }

  // — super: archive post
  async function archivePost(adId: string) {
    await supabase.from('ads').update({ status: 'archived' }).eq('id', adId);
    setLocalAds(prev => prev.filter(a => a.id !== adId));
  }

  // ─── User view ──────────────────────────────────────────────────────────

  if (!isSuper) {
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            📝 Posts
          </div>
          <span style={{ fontSize: '0.68rem', color: '#555' }}>{brandAds.length} active</span>
        </div>

        {brandAds.length === 0 ? (
          <div style={{ color: '#555', fontSize: '0.82rem' }}>No posts for this brand yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {brandAds.map(ad => (
              <div key={ad.id} style={{ padding: '0.75rem', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>{ad.title}</span>
                  {ad.pinned && <span style={{ fontSize: '0.65rem' }}>📌</span>}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                  {ad.description?.slice(0, 80)}{(ad.description?.length ?? 0) > 80 ? '…' : ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <a href={ad.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.72rem', color: '#f0883e', textDecoration: 'none', fontWeight: 600 }}>
                    View →
                  </a>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem', color: '#555' }}>
                    {(ad.click_count || 0) > 0 && <span>👆 {ad.click_count}</span>}
                    {(ad.share_count || 0) > 0 && <span>↗ {ad.share_count}</span>}
                    {(ad.points     || 0) > 0 && <span>⚡ {ad.points}</span>}
                  </div>
                </div>
              </div>
            ))}
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
          📝 Posts — Admin
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '0.72rem', color: '#555' }}>{brandAds.length} posts</span>
          <button
            onClick={() => { setCreating(!creating); setForm(EMPTY_FORM); }}
            style={{ background: creating ? 'transparent' : '#f0883e', border: `1px solid ${creating ? '#333' : '#f0883e'}`, color: creating ? '#555' : '#000', borderRadius: '6px', padding: '0.25rem 0.75rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
          >
            {creating ? '✕ Cancel' : '+ New Post'}
          </button>
        </div>
      </div>

      {/* Success toast */}
      {submitted && (
        <div style={{ background: '#22c55e15', border: '1px solid #22c55e30', borderRadius: '8px', padding: '0.5rem 0.75rem', fontSize: '0.78rem', color: '#22c55e', marginBottom: '0.75rem' }}>
          ✅ Post created successfully
        </div>
      )}

      {/* Create form */}
      {creating && (
        <div style={{ background: '#0a0a0a', border: '1px solid #f0883e30', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#f0883e', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
            New Post
          </div>

          {/* Title */}
          <label style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>Title *</label>
          <input
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Post title"
            style={{ width: '100%', background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '8px', padding: '0.6rem 0.75rem', fontSize: '0.82rem', boxSizing: 'border-box', marginBottom: '0.6rem' }}
          />

          {/* Description */}
          <label style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>Description</label>
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="What's this post about?"
            style={{ width: '100%', background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '8px', padding: '0.6rem 0.75rem', fontSize: '0.82rem', boxSizing: 'border-box', minHeight: '72px', resize: 'vertical', marginBottom: '0.6rem' }}
          />

          {/* URL */}
          <label style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>URL *</label>
          <input
            value={form.url}
            onChange={e => set('url', e.target.value)}
            placeholder="https://"
            style={{ width: '100%', background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '8px', padding: '0.6rem 0.75rem', fontSize: '0.82rem', boxSizing: 'border-box', marginBottom: '0.6rem' }}
          />

          {/* Category */}
          <label style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>Category</label>
          <select
            value={form.category}
            onChange={e => set('category', e.target.value)}
            style={{ width: '100%', background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '8px', padding: '0.6rem 0.75rem', fontSize: '0.82rem', boxSizing: 'border-box', marginBottom: '0.75rem' }}
          >
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <button
            onClick={handleCreate}
            disabled={!form.title || !form.url || submitting}
            style={{ width: '100%', background: form.title && form.url ? '#f0883e' : '#1a1a1a', border: 'none', color: form.title && form.url ? '#000' : '#555', borderRadius: '8px', padding: '0.65rem', fontSize: '0.85rem', fontWeight: 700, cursor: form.title && form.url ? 'pointer' : 'not-allowed' }}
          >
            {submitting ? 'Creating...' : '📝 Create Post'}
          </button>
        </div>
      )}

      {/* Post list */}
      {brandAds.length === 0 ? (
        <div style={{ color: '#555', fontSize: '0.82rem' }}>No posts yet — create the first one.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {brandAds.map(ad => (
            <div key={ad.id} style={{ background: '#0a0a0a', border: `1px solid ${ad.pinned ? '#f0883e40' : '#1a1a1a'}`, borderRadius: '10px', padding: '0.75rem' }}>

              {/* Post header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>{ad.title}</span>
                    {ad.pinned && <span style={{ fontSize: '0.65rem' }}>📌</span>}
                    <span style={{ fontSize: '0.62rem', color: ad.status === 'active' ? '#22c55e' : '#f0883e', background: ad.status === 'active' ? '#22c55e15' : '#f0883e15', border: `1px solid ${ad.status === 'active' ? '#22c55e30' : '#f0883e30'}`, borderRadius: '999px', padding: '0.1rem 0.4rem' }}>
                      {ad.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.68rem', color: '#555', marginTop: '0.15rem' }}>{ad.category}</div>
                </div>
              </div>

              {/* Description */}
              {ad.description && (
                <div style={{ fontSize: '0.72rem', color: '#888', marginBottom: '0.5rem', lineHeight: 1.5 }}>
                  {ad.description.slice(0, 100)}{ad.description.length > 100 ? '…' : ''}
                </div>
              )}

              {/* Stats */}
              <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.65rem', color: '#555', marginBottom: '0.5rem' }}>
                <span>👆 {ad.click_count || 0}</span>
                <span>↗ {ad.share_count || 0}</span>
                <span>⚡ {ad.points || 0} pts</span>
              </div>

              {/* Controls */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                <a
                  href={ad.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.68rem', color: '#f0883e', textDecoration: 'none', fontWeight: 600 }}
                >
                  View →
                </a>
                <button
                  onClick={() => togglePin(ad)}
                  disabled={pinning === ad.id}
                  style={{ background: ad.pinned ? '#f0883e15' : 'transparent', border: `1px solid ${ad.pinned ? '#f0883e' : '#222'}`, color: ad.pinned ? '#f0883e' : '#555', borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {ad.pinned ? '📌 Unpin' : '+ Pin'}
                </button>
                <button
                  onClick={() => archivePost(ad.id)}
                  style={{ background: 'transparent', border: '1px solid #222', color: '#555', borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.68rem', cursor: 'pointer' }}
                >
                  Archive
                </button>
                <a
                  href={`/profile/${encodeURIComponent(ad.email)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.68rem', color: '#555', textDecoration: 'none' }}
                >
                  👤
                </a>
                {pinning === ad.id && <span style={{ fontSize: '0.65rem', color: '#555' }}>saving...</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
