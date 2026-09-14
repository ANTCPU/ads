// app/lib/adminTokens.ts
// ─── Shared design tokens + style helpers for all admin surfaces ──────────────
// Import G, rowBtn, inpStyle, rankMedal into any admin page or module.
// Never define these inline again.

import React from 'react';

// ─── Colour palette — mid-grey command centre ─────────────────────────────────
export const G = {
  bg:      '#161616',
  card:    '#1e1e1e',
  card2:   '#242424',
  border:  '#2a2a2a',
  border2: '#333',
  text:    '#e0e0e0',
  muted:   '#888',
  dim:     '#444',
  orange:  '#f0883e',
  green:   '#22c55e',
  red:     '#ef4444',
  blue:    '#0070f3',
  gold:    '#D4AF37',
  inp:     '#2a2a2a',
} as const;

// ─── Shared input style ───────────────────────────────────────────────────────
export const inpStyle: React.CSSProperties = {
  width: '100%', background: G.inp, border: `1px solid ${G.border2}`,
  borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.82rem',
  color: G.text, fontFamily: 'system-ui, sans-serif',
  outline: 'none', boxSizing: 'border-box', marginBottom: '0.5rem',
};

// ─── Row button ───────────────────────────────────────────────────────────────
export function rowBtn(color: string, disabled = false): React.CSSProperties {
  return {
    background:   'transparent',
    border:       `1px solid ${disabled ? G.border : color}`,
    borderRadius: '8px',
    color:        disabled ? G.dim : color,
    fontSize:     '0.72rem', fontWeight: 700,
    padding:      '0.35rem 0.6rem',
    cursor:       disabled ? 'default' : 'pointer',
    whiteSpace:   'nowrap', transition: 'all 0.15s', flexShrink: 0,
  };
}

// ─── Section card wrapper ─────────────────────────────────────────────────────
export const sectionCard: React.CSSProperties = {
  background:   G.card,
  border:       `1px solid ${G.border}`,
  borderRadius: '12px',
  padding:      '1.25rem',
  marginBottom: '1rem',
};

// ─── Section label ────────────────────────────────────────────────────────────
export const sectionLabel: React.CSSProperties = {
  fontWeight: 700, fontSize: '0.88rem',
  color: G.text, marginBottom: '0.2rem',
};

export const sectionSub: React.CSSProperties = {
  fontSize: '0.72rem', color: G.muted, marginBottom: '1rem',
};

// ─── Rank medal ───────────────────────────────────────────────────────────────
export function rankMedal(rank?: number): string {
  if (rank === 1) return '🥇';
  if (rank === 2) return '🥈';
  if (rank === 3) return '🥉';
  if (rank && rank <= 10) return `#${rank}`;
  return '';
}

// ─── Discord ping helper ──────────────────────────────────────────────────────
export function pingDiscord(content: string, event: string, embed?: object) {
  fetch('/api/discord-notify', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ content, event, embed }),
  }).catch(() => {});
}
