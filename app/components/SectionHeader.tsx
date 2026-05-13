import React from 'react';

export default function SectionHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0a0a0a', letterSpacing: '-0.01em' }}>{title}</div>
      {sub && <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.2rem' }}>{sub}</div>}
    </div>
  );
}
