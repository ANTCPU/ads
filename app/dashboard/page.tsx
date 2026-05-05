'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ANTCPU_KB from '../clients/antcpu/kb';
import { MAPOFPI_KB } from '../clients/mapofpi/kb';

const clients = [
  {
    id: 'antcpu',
    name: ANTCPU_KB.name,
    url: ANTCPU_KB.url,
    version: ANTCPU_KB.version,
    status: 'active',
    bots: 10,
    done: 0,
    icon: '⚡',
    tag: 'AI Platform · Goal 1',
  },
  {
    id: 'mapofpi',
    name: MAPOFPI_KB.name,
    url: MAPOFPI_KB.url,
    version: `v${MAPOFPI_KB.version}`,
    status: 'active',
    bots: 10,
    done: 3,
    icon: '🗺️',
    tag: `Pi Commerce · ${MAPOFPI_KB.stats.users}`,
  },
];

const s: Record<string, React.CSSProperties> = {
  page:     { background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', padding: '2rem 1.5rem', maxWidth: '600px', margin: '0 auto' },
  logo:     { fontWeight: 800, fontSize: '1.1rem', color: '#f0883e', letterSpacing: '0.05em', marginBottom: '0.25rem' },
  sub:      { fontSize: '0.75rem', color: '#444', letterSpacing: '0.1em', marginBottom: '2.5rem' },
  heading:  { fontSize: '0.7rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: '1rem' },
  card:     { background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px', padding: '1.25rem 1.5rem', marginBottom: '1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.15s' },
  cardLeft: { display: 'flex', alignItems: 'center', gap: '1rem' },
  icon:     { fontSize: '1.8rem', lineHeight: 1 },
  name:     { fontWeight: 700, fontSize: '1rem', marginBottom: '0.2rem' },
  tag:      { fontSize: '0.75rem', color: '#555' },
  right:    { textAlign: 'right' as const },
  version:  { fontSize: '0.75rem', color: '#f0883e', fontWeight: 700, marginBottom: '0.3rem' },
  progress: { fontSize: '0.7rem', color: '#444' },
  bar:      { height: '3px', background: '#1a1a1a', borderRadius: '2px', marginTop: '0.4rem', width: '80px' },
  barFill:  { height: '100%', background: '#f0883e', borderRadius: '2px' },
  statusDot:{ width: '7px', height: '7px', borderRadius: '50%', display: 'inline-block', marginRight: '0.4rem' },
  newBtn:   { width: '100%', background: 'none', border: '1px dashed #222', borderRadius: '14px', padding: '1.1rem', color: '#333', fontSize: '0.85rem', cursor: 'pointer', marginTop: '0.5rem' },
  footer:   { marginTop: '3rem', fontSize: '0.7rem', color: '#2a2a2a', textAlign: 'center' as const },
};

const statusColors: Record<string, string> = {
  active:   '#3fb950',
  building: '#d29922',
  idle:     '#444',
};

export default function DashboardHome() {
  const router = useRouter();

  return (
    <div style={s.page}>
      <div style={s.logo}>⚡ ANTCPU ADS</div>
      <div style={s.sub}>AGENT DASHBOARD</div>

      <div style={s.heading}>Active Clients</div>

      {clients.map(c => (
        <div
          key={c.id}
          style={s.card}
          onClick={() => router.push(`/dashboard/${c.id}`)}
          onMouseEnter={e => (e.currentTarget.style.borderColor = '#f0883e44')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = '#1a1a1a')}
        >
          <div style={s.cardLeft}>
            <div style={s.icon}>{c.icon}</div>
            <div>
              <div style={s.name}>
                <span style={{ ...s.statusDot, background: statusColors[c.status] }} />
                {c.name}
              </div>
              <div style={s.tag}>{c.tag}</div>
            </div>
          </div>
          <div style={s.right}>
            <div style={s.version}>{c.version}</div>
            <div style={s.progress}>{c.done}/{c.bots} bots run</div>
            <div style={s.bar}>
              <div style={{ ...s.barFill, width: `${(c.done / c.bots) * 100}%` }} />
            </div>
          </div>
        </div>
      ))}

      <button style={s.newBtn} onClick={() => router.push('/dashboard/new')}>
        + New Client
      </button>

      <div style={s.footer}>antcpu.com · ads agent v1</div>
    </div>
  );
}
