'use client';
import React from 'react';

export default function Pill({ label, onClick, color = '#0070f3', outline = false }: {
  label: string;
  onClick: () => void;
  color?: string;
  outline?: boolean;
}) {
  return (
    <button onClick={onClick} style={{
      background: outline ? '#fff' : color,
      color: outline ? color : '#fff',
      border: `1px solid ${color}`,
      borderRadius: '999px',
      padding: '0.4rem 1.1rem',
      fontSize: '0.8rem',
      fontWeight: 700,
      cursor: 'pointer',
      whiteSpace: 'nowrap',
    }}>{label}</button>
  );
}
