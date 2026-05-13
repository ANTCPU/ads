'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import Pill from './Pill';

export default function AdminBar() {
  const router = useRouter();

  const links = [
    { label: '🏗 Ad Builder',    path: '/dashboard/admin' },
    { label: '👥 Users',         path: '/dashboard/users' },
    { label: '🏆 Leaderboard',   path: '/dashboard/leaderboard' },
    { label: '🤖 Agents',        path: '/dashboard/agents' },
    { label: '🗺️ Map of Pi',     path: '/dashboard/mapofpi' },
    { label: '📸 Photography',   path: '/dashboard/photography' },
  ];

  return (
    <div style={{
      background: '#0a0a0a',
      border: '1px solid #222',
      borderRadius: '14px',
      padding: '1rem 1.5rem',
      marginBottom: '1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      flexWrap: 'wrap',
    }}>
      <span style={{
        color: '#f0883e',
        fontWeight: 800,
        fontSize: '0.85rem',
        letterSpacing: '0.05em',
        marginRight: '0.25rem',
      }}>⚡ ADMIN</span>
      {links.map(({ label, path }) => (
        <Pill
          key={path}
          label={label}
          onClick={() => router.push(path)}
          color="#f0883e"
        />
      ))}
    </div>
  );
}
