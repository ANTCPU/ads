'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import Pill from './Pill';

const LINKS = [
  { label: '⚡ Brand',       path: '/dashboard/antcpu' },
  { label: '🏗 Ad Builder',  path: '/dashboard/admin' },
  { label: '👥 Users',       path: '/dashboard/users' },
  { label: '🏆 Leaderboard', path: '/dashboard/leaderboard' },
  { label: '🤖 Agents',      path: '/dashboard/agents' },
  { label: '🗺️ Map of Pi',   path: '/dashboard/mapofpi' },
  { label: '📸 Photography', path: '/dashboard/photography' },
];

type Props = { role?: string };

export default function AdminBar({ role }: Props) {
  const router = useRouter();
  if (role !== 'super' && role !== 'mod') return null;

  return (
    <div style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a', padding: '0.5rem 1rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ fontSize: '0.7rem', color: '#f0883e', fontWeight: 800, marginRight: '0.25rem' }}>⚡ ADMIN</span>
      {LINKS.map(({ label, path }) => (
        <Pill key={path} label={label} onClick={() => router.push(path)} color="#f0883e" />
      ))}
    </div>
  );
}
