'use client';
import { useRouter } from 'next/navigation';
import { ModuleContext } from '../types';

export default function CreateAdModule({ slug, user }: ModuleContext) {
  const router = useRouter();
  const hasAd = false; // future: check ads array for user's own ad

  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
        🚀 Advertise Here
      </div>
      <div style={{ fontSize: '0.78rem', color: '#555', lineHeight: 1.6, marginBottom: '1rem' }}>
        Get your brand in front of the {slug} audience. Free trial — live within hours.
      </div>
      <button
        onClick={() => router.push('/create-ad')}
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
          marginBottom: '0.5rem',
        }}
      >
        Create Your Ad →
      </button>
      <button
        onClick={() => router.push('/login')}
        style={{
          width: '100%',
          background: 'none',
          border: '1px solid #222',
          color: '#555',
          borderRadius: '8px',
          padding: '0.55rem 1rem',
          fontWeight: 600,
          fontSize: '0.75rem',
          cursor: 'pointer',
        }}
      >
        New here? Sign up free
      </button>
    </div>
  );
}
