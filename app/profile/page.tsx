'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  return (
    <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <div style={{ fontSize: '2rem' }}>👤</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Your Profile</h1>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>Profile builder coming soon — logo, bio, contact details.</p>
      <button
        onClick={() => router.push('/')}
        style={{ background: 'none', border: '1px solid #333', color: '#888', borderRadius: '8px', padding: '0.6rem 1.4rem', cursor: 'pointer', fontSize: '0.85rem' }}
      >
        ← Back to Arena
      </button>
    </div>
  );
}
