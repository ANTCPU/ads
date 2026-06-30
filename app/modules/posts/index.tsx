'use client';
import { ModuleContext } from '../types';

export default function PostsModule({ slug, ads }: ModuleContext) {
  const brandAds = ads.filter(ad =>
    ad.brand?.toLowerCase().includes(slug.toLowerCase())
  );

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>📝 Posts</div>
        <div style={{ fontSize: '0.7rem', color: '#555' }}>{brandAds.length} active</div>
      </div>
      {brandAds.length === 0 ? (
        <div style={{ color: '#333', fontSize: '0.8rem' }}>No posts for this brand yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {brandAds.map(ad => (
            <div key={ad.id} style={{ padding: '0.75rem', background: '#0a0a0a', borderRadius: '8px', border: '1px solid #1a1a1a' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{ad.title}</div>
                {ad.pinned && <span style={{ fontSize: '0.6rem', color: '#f0883e' }}>📌</span>}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#555', lineHeight: 1.5, marginBottom: '0.5rem' }}>
                {ad.description?.slice(0, 80)}{(ad.description?.length ?? 0) > 80 ? '...' : ''}
              </div>
              <a href={ad.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.7rem', color: '#f0883e', fontWeight: 600, textDecoration: 'none' }}>
                View →
              </a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
