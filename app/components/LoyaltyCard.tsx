// app/components/LoyaltyCard.tsx
'use client';

import React from 'react';

// ─── LoyaltyCard ──────────────────────────────────────────────────────────────
// Shown on /dashboard/user between TierStrip and Onboarding.
//
// STATE 1 — Day 2 warning:   status=trial, daysSince >= 2 && < 3
// STATE 2 — Expired+points:  status=trial, daysSince >= 3, points > 0
// STATE 3 — Expired+no pts:  status=trial, daysSince >= 3, points === 0
// STATE 4 — Restart success: trialExtendedAt is set
// HIDDEN  — status=active, no trialExtendedAt
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  status:           string;          // 'trial' | 'active'
  createdAt:        string | null;   // ISO string from DB
  points:           number;
  trialExtendedAt:  string | null;   // ISO string or null
  restarting:       boolean;
  onRestart:        () => void;
  onUpgrade:        () => void;      // routes to /login or pricing
};

export default function LoyaltyCard({
  status,
  createdAt,
  points,
  trialExtendedAt,
  restarting,
  onRestart,
  onUpgrade,
}: Props) {

  // ── Derive state ────────────────────────────────────────────────────────────
  const daysSince = createdAt
    ? (Date.now() - new Date(createdAt).getTime()) / 86_400_000
    : 0;

  const isExpired    = status === 'trial' && daysSince >= 3;
  const isWarning    = status === 'trial' && daysSince >= 2 && daysSince < 3;
  const isSuccess    = !!trialExtendedAt;
  const hoursLeft    = Math.max(0, Math.ceil((3 - daysSince) * 24));

  // Hidden: active with no restart, or trial day 0–1
  if (status === 'active' && !trialExtendedAt) return null;
  if (status === 'team') return null;
  if (!isWarning && !isExpired && !isSuccess)  return null;

  // ── Shared styles ───────────────────────────────────────────────────────────
  const base: React.CSSProperties = {
    borderRadius: '12px',
    padding:      '1.25rem',
    marginBottom: '1rem',
  };

  const lbl: React.CSSProperties = {
    fontSize:        '0.68rem',
    color:           '#555',
    fontWeight:      700,
    textTransform:   'uppercase',
    letterSpacing:   '0.1em',
    marginBottom:    '0.5rem',
  };

  const btn = (bg: string, color = '#fff', border = 'none'): React.CSSProperties => ({
    background:   bg,
    border,
    color,
    borderRadius: '8px',
    padding:      '0.5rem 1rem',
    fontSize:     '0.82rem',
    fontWeight:   700,
    cursor:       restarting ? 'not-allowed' : 'pointer',
    opacity:      restarting ? 0.6 : 1,
  });

  // ── STATE 4 — Restart success ───────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div style={{
        ...base,
        background: '#0d1f0d',
        border:     '1px solid #22c55e40',
      }}>
        <div style={lbl}>Loyalty Restart</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#22c55e', marginBottom: '0.3rem' }}>
          ✅ You're back. 7 days extended.
        </div>
        <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.75rem' }}>
          Your points kept your ad alive. The <strong style={{ color: '#D4AF37' }}>🔄 Loyal Member</strong> badge has been awarded. Keep sharing to stay live.
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <a href="/arena" style={btn('#22c55e')}>↗ Share an Ad</a>
          <a href={`/profile`} style={btn('transparent', '#22c55e', '1px solid #22c55e40')}>View Badges →</a>
        </div>
      </div>
    );
  }

  // ── STATE 1 — Day 2 warning ─────────────────────────────────────────────────
  if (isWarning) {
    return (
      <div style={{
        ...base,
        background: '#1a1200',
        border:     '1px solid #f0883e40',
      }}>
        <div style={lbl}>Trial Status</div>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#f0883e', marginBottom: '0.3rem' }}>
          ⚡ Your trial expires in ~{hoursLeft}h
        </div>
        <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.75rem' }}>
          Your points don't expire. Share one ad today to keep your brand live and unlock a 7-day extension.
        </div>
        <a href="/arena" style={btn('#f0883e', '#000')}>↗ Share an Ad Now</a>
      </div>
    );
  }

  // ── STATE 2 — Expired + has points ─────────────────────────────────────────
  if (isExpired && points > 0) {
    return (
      <div style={{
        ...base,
        background: '#0a0a1a',
        border:     '1px solid #0070f340',
      }}>
        <div style={lbl}>Trial Expired</div>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#0070f3', marginBottom: '0.3rem' }}>
          ⚡ Your trial expired — but your {points} pts didn't.
        </div>
        <div style={{ fontSize: '0.78rem', color: '#888', marginBottom: '0.75rem' }}>
          You earned points in the Arena. That means something. One share unlocks a free 7-day extension and the <strong style={{ color: '#D4AF37' }}>Loyal Member</strong> badge.
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={onRestart}
            disabled={restarting}
            style={btn('#0070f3')}
          >
            {restarting ? '⏳ Restarting…' : '⚡ Restart Free — 7 Days'}
          </button>
          <button onClick={onUpgrade} style={btn('transparent', '#555', '1px solid #333')}>
            Upgrade Instead →
          </button>
        </div>
      </div>
    );
  }

  // ── STATE 3 — Expired + no points ──────────────────────────────────────────
  if (isExpired && points === 0) {
    return (
      <div style={{
        ...base,
        background: '#0a0a0a',
        border:     '1px solid #333',
      }}>
        <div style={lbl}>Trial Ended</div>
        <div style={{ fontSize: '1rem', fontWeight: 800, color: '#888', marginBottom: '0.3rem' }}>
          Your 3-day trial has ended.
        </div>
        <div style={{ fontSize: '0.78rem', color: '#555', marginBottom: '0.75rem' }}>
          Upgrade to keep your ad live and start earning points in the Arena. $9.99/mo — no contract.
        </div>
        <button onClick={onUpgrade} style={btn('#0070f3')}>
          Upgrade to Stay Live →
        </button>
      </div>
    );
  }

  return null;
}
