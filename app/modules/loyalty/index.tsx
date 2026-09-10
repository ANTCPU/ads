// app/modules/loyalty/index.tsx
'use client';

import { useEffect, useState } from 'react';
import { ModuleContext } from '../types';
import LoyaltyCard from '../../components/LoyaltyCard';

type SignupRow = {
  status:             string;
  created_at:         string;
  points:             number;
  trial_extended_at:  string | null;
};

export default function LoyaltyModule({ user, supabase }: ModuleContext) {
  const [row,        setRow]        = useState<SignupRow | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [restarting, setRestarting] = useState(false);

  useEffect(() => {
    if (!user.email) { setLoading(false); return; }
    supabase
      .from('ad_signups')
      .select('status, created_at, points, trial_extended_at')
      .eq('email', user.email.trim().toLowerCase())
      .maybeSingle()
      .then(({ data }) => {
        setRow(data || null);
        setLoading(false);
      });
  }, [user.email]);

  async function handleRestart() {
    if (!user.email || restarting) return;
    setRestarting(true);
    try {
      const res  = await fetch('/api/loyalty/restart', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: user.email }),
      });
      const data = await res.json();
      if (data.ok && data.extended) {
        setRow(prev => prev ? { ...prev, trial_extended_at: new Date().toISOString() } : prev);
      }
    } catch {}
    setRestarting(false);
  }

  if (loading) return (
    <div style={{ color: '#333', fontSize: '0.8rem' }}>Loading...</div>
  );

  if (!row) return null;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '1rem' }}>
        🔄 Loyalty
      </div>
      <LoyaltyCard
        status={row.status}
        createdAt={row.created_at}
        points={row.points || 0}
        trialExtendedAt={row.trial_extended_at}
        restarting={restarting}
        onRestart={handleRestart}
        onUpgrade={() => { if (typeof window !== 'undefined') window.location.href = '/?upgrade=1'; }}
      />
    </div>
  );
}
