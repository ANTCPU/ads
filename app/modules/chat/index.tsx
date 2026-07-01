'use client';
import { useRouter } from 'next/navigation';
import { ModuleContext } from '../types';

const UNLOCK_THRESHOLD = 10; // points required to unlock Aria

export default function ChatModule({ slug, ads, user }: ModuleContext) {
  const router = useRouter();

  const brandAds = ads.filter(ad =>
    ad.brand?.toLowerCase().includes(slug.toLowerCase())
  );
  const topPoints = Math.max(...brandAds.map(ad => ad.points || 0), 0);
  const unlocked = topPoints >= UNLOCK_THRESHOLD;

  if (!unlocked) {
    return (
      <div style={{ width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🦋</div>
        <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.4rem' }}>
          Aria is watching
        </div>
        <div style={{ fontSize: '0.72rem', color: '#555', lineHeight: 1.6, marginBottom: '0.75rem' }}>
          Reach {UNLOCK_THRESHOLD} points to unlock a direct line to Aria.
          You're at {topPoints} pts.
        </div>
        <div style={{ background: '#1a1a1a', borderRadius: '6px', height: '4px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${Math.min((topPoints / UNLOCK_THRESHOLD) * 100, 100)}%`,
            background: '#f0883e',
            borderRadius: '6px',
            transition: 'width 0.4s ease',
          }} />
        </div>
        <div style={{ fontSize: '0.65rem', color: '#333', marginTop: '0.4rem' }}>
          {topPoints}/{UNLOCK_THRESHOLD} pts
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.6rem' }}>
        <span style={{ fontSize: '1.2rem' }}>🦋</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>Aria</div>
          <div style={{ fontSize: '0.65rem', color: '#3fb950' }}>● Unlocked</div>
        </div>
      </div>
      <div style={{ fontSize: '0.75rem', color: '#555', lineHeight: 1.6, marginBottom: '0.75rem' }}>
        Your brand has earned direct access to Aria — the Arena's intelligence layer.
        Ask her anything about your campaign.
      </div>
      <button
        onClick={() => router.push('/antbots/chat')}
        style={{
          width: '100%',
          background: '#f0883e',
          border: 'none',
          color: '#fff',
          borderRadius: '8px',
          padding: '0.65rem 1rem',
          fontWeight: 700,
          fontSize: '0.82rem',
          cursor: 'pointer',
        }}>
        Talk to Aria →
      </button>
    </div>
  );
}
