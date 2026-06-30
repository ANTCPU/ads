'use client';
import { ModuleContext } from '../types';

export default function ShareModule({ slug }: ModuleContext) {
  const url = `https://antcpu-ads.vercel.app/arena/${slug}`;

  function handleShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({ title: `${slug} Arena`, url }).catch(() => {});
    } else {
      navigator.clipboard.writeText(url).catch(() => {});
    }
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>🔗 Share Arena</div>
      <div style={{ fontSize: '0.72rem', color: '#555', marginBottom: '0.75rem', wordBreak: 'break-all' }}>{url}</div>
      <button onClick={handleShare} style={{
        width: '100%',
        background: '#f0883e',
        border: 'none',
        color: '#fff',
        borderRadius: '8px',
        padding: '0.6rem 1rem',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '0.8rem',
      }}>
        Share this Arena
      </button>
    </div>
  );
}
