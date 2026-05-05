'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function CreateAdPage() {
  const router = useRouter();
  return (
    <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1rem' }}>
      <div style={{ fontSize: '2rem' }}>📢</div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Create Your First Ad</h1>
      <p style={{ color: '#555', fontSize: '0.9rem' }}>Ad builder coming soon — title, URL, description, category.</p>
      <div style={{ background: '#111', border: '1px solid #0070f330', borderRadius: '12px', padding: '1.5rem 2rem', textAlign: 'center', maxWidth: '400px' }}>
        <div style={{ color: '#0070f3', fontSize: '0.8rem', marginBottom: '0.5rem' }}>🟢 Your trial is active</div>
        <div style={{ color: '#555', fontSize: '0.8rem' }}>Full ad builder launching soon. You will be notified at your registered email.</div>
      </div>
      <button
        onClick={() => router.push('/')}
        style={{ background: 'none', border: '1px solid #333', color: '#888', borderRadius: '8px', padding: '0.6rem 1.4rem', cursor: 'pointer', fontSize: '0.85rem' }}
      >
        ← Back to Arena
      </button>
    </div>
  );
}
