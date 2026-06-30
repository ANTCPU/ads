'use client';
import { ModuleContext } from '../types';

export default function VideoFeedModule({ slug, ads }: ModuleContext) {
  const mediaAds = ads.filter(ad => ad.image_url && (ad.pinned || ad.tier !== 'entry'));

  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>🎬 Video Feed</div>
      {mediaAds.length === 0 ? (
        <div style={{ color: '#333', fontSize: '0.8rem' }}>No media ads for this arena yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {mediaAds.map(ad => (
            <a key={ad.id} href={ad.url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
              <div style={{ borderRadius: '10px', overflow: 'hidden', border: '1px solid #1a1a1a', background: '#0a0a0a' }}>
                <img src={ad.image_url!} alt={ad.title} style={{ width: '100%', display: 'block', maxHeight: '160px', objectFit: 'cover' }} />
                <div style={{ padding: '0.6rem 0.75rem' }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fff' }}>{ad.title}</div>
                  <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '0.2rem' }}>{ad.description?.slice(0, 60)}...</div>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
