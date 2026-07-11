'use client';
import { useState } from 'react';
import { ModuleContext, Ad } from '../types';

// ─── Component ────────────────────────────────────────────────────────────────

export default function VideoFeedModule({ slug, ads, supabase, isSuper }: ModuleContext) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [localAds, setLocalAds] = useState<Ad[]>(ads);

  const mediaAds = localAds.filter(a =>
    a.image_url && (a.pinned || a.tier !== 'entry')
  );

  const allMediaAds = localAds.filter(a => a.image_url);

  // — super: toggle pin
  async function togglePin(ad: Ad) {
    setUpdating(ad.id);
    await supabase.from('ads').update({ pinned: !ad.pinned }).eq('id', ad.id);
    setLocalAds(prev => prev.map(a => a.id === ad.id ? { ...a, pinned: !a.pinned } : a));
    setUpdating(null);
  }

  // — super: remove image
  async function removeImage(adId: string) {
    setUpdating(adId);
    await supabase.from('ads').update({ image_url: null }).eq('id', adId);
    setLocalAds(prev => prev.map(a => a.id === adId ? { ...a, image_url: undefined } : a));
    setUpdating(null);
  }

  // ─── User view ──────────────────────────────────────────────────────────

  if (!isSuper) {
    return (
      <div>
        <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          🎬 Video Feed
        </div>
        {mediaAds.length === 0 ? (
          <div style={{ color: '#555', fontSize: '0.82rem' }}>No media ads for this arena yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {mediaAds.map(ad => (
              <a key={ad.id} href={ad.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
                <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px', overflow: 'hidden' }}>
                  <img
                    src={ad.image_url!}
                    alt={ad.title}
                    style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', display: 'block' }}
                  />
                  <div style={{ padding: '0.6rem 0.75rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>{ad.title}</div>
                    <div style={{ fontSize: '0.68rem', color: '#555' }}>{ad.description?.slice(0, 60)}{(ad.description?.length ?? 0) > 60 ? '…' : ''}</div>
                  </div>
                </div>
              </a>
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
          🎬 Video Feed — Admin
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem' }}>
          <span style={{ color: '#f0883e' }}>{allMediaAds.length} with media</span>
          <span style={{ color: '#555' }}>{ads.length - allMediaAds.length} text only</span>
        </div>
      </div>

      {/* Image readiness bar */}
      <div style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#555', marginBottom: '0.3rem' }}>
          <span>Image readiness</span>
          <span>{ads.length > 0 ? Math.round((allMediaAds.length / ads.length) * 100) : 0}%</span>
        </div>
        <div style={{ height: '4px', background: '#1a1a1a', borderRadius: '2px' }}>
          <div style={{ height: '100%', width: `${ads.length > 0 ? (allMediaAds.length / ads.length) * 100 : 0}%`, background: '#f0883e', borderRadius: '2px', transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Media ad list */}
      {allMediaAds.length === 0 ? (
        <div style={{ color: '#555', fontSize: '0.82rem' }}>No ads with images yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {allMediaAds.map(ad => (
            <div key={ad.id} style={{ background: '#0a0a0a', border: `1px solid ${ad.pinned ? '#f0883e40' : '#1a1a1a'}`, borderRadius: '10px', overflow: 'hidden' }}>
              <img
                src={ad.image_url!}
                alt={ad.title}
                style={{ width: '100%', maxHeight: '140px', objectFit: 'cover', display: 'block' }}
              />
              <div style={{ padding: '0.6rem 0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>{ad.title}</span>
                  {ad.pinned && <span style={{ fontSize: '0.65rem' }}>📌</span>}
                  <span style={{ fontSize: '0.65rem', color: '#555' }}>{ad.brand}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.65rem', fontSize: '0.65rem', color: '#555', marginBottom: '0.5rem' }}>
                  <span>👆 {ad.click_count || 0}</span>
                  <span>↗ {ad.share_count || 0}</span>
                  <span>⚡ {ad.points || 0} pts</span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button
                    onClick={() => togglePin(ad)}
                    disabled={updating === ad.id}
                    style={{ background: ad.pinned ? '#f0883e15' : 'transparent', border: `1px solid ${ad.pinned ? '#f0883e' : '#222'}`, color: ad.pinned ? '#f0883e' : '#555', borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}
                  >
                    {ad.pinned ? '📌 Unpin' : '+ Pin'}
                  </button>
                  <button
                    onClick={() => removeImage(ad.id)}
                    disabled={updating === ad.id}
                    style={{ background: 'transparent', border: '1px solid #222', color: '#555', borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.68rem', cursor: 'pointer' }}
                  >
                    Remove Image
                  </button>
                  <a href={ad.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.68rem', color: '#f0883e', textDecoration: 'none', fontWeight: 600 }}>
                    View →
                  </a>
                  {updating === ad.id && <span style={{ fontSize: '0.65rem', color: '#555' }}>saving...</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
