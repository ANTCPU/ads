'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import { clearSessionCookie } from '../../lib/session';
import { createClient } from '@supabase/supabase-js';
import ArenaFooter from '../../components/ArenaFooter';
import CreateAdDrawer from '../../components/CreateAdDrawer';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Signup = {
  name: string;
  email: string;
  brand_name: string;
  status: string;
  role: string;
  created_at: string;
};

type Click = {
  ad_id: string;
  email: string;
  source: string;
  created_at: string;
};

type Stats = {
  lastSignup: string;
  ads: number;
  signups: number;
};

type SessionUser = {
  email: string;
  name: string;
  brand: string;
  trialStatus: string;
  role?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND_DASHBOARDS = [
  { label: '🗺️ Map of Pi',          path: '/dashboard/mapofpi' },
  { label: '📸 Amanda Photography', path: '/dashboard/photography' },
  { label: '⚡ ANTCPU',             path: '/dashboard/antcpu' },
];

const QUICK_LINKS = [
  { label: '👥 All Users',     path: '/dashboard/users' },
  { label: '🏟 The Arena',     path: '/arena' },
  { label: '🏆 Leaderboard',   path: '/dashboard/leaderboard' },
  { label: '🤖 Agents',        path: '/dashboard/agents' },
  { label: '📊 Test',          path: '/dashboard/test' },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();

  // — state
  const [hydrated, setHydrated]       = useState(false);
  const [stats, setStats]             = useState<Stats>({ lastSignup: '—', ads: 0, signups: 0 });
  const [signups, setSignups]         = useState<Signup[]>([]);
  const [clicks, setClicks]           = useState<Click[]>([]);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [adminEmail, setAdminEmail]   = useState('');
  const [assigning, setAssigning]     = useState(false);
  const [assignMsg, setAssignMsg]     = useState('');

  // — auth guard: super only
  useEffect(() => {
    try {
      const stored = localStorage.getItem('arena_user');
      if (!stored) { router.push('/'); return; }
      const u: SessionUser = JSON.parse(stored);
      if (u.email !== 'antcpu@gmail.com' && u.role !== 'super') {
        router.push('/dashboard/user'); return;
      }
    } catch { router.push('/'); return; }
    setHydrated(true);
    loadData();
  }, []);

  // — load stats + recent activity
  async function loadData() {
    const [
      { count: adCount },
      { data: recentSignups },
      { data: recentClicks },
    ] = await Promise.all([
      supabase.from('ads').select('*', { count: 'exact', head: true }),
      supabase.from('ad_signups')
        .select('name, email, brand_name, status, role, created_at')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase.from('ad_clicks')
        .select('ad_id, email, source, created_at')
        .order('created_at', { ascending: false })
        .limit(15),
    ]);
    const lastSignup = recentSignups?.[0]?.brand_name || recentSignups?.[0]?.name || '—';
    setStats({ lastSignup, ads: adCount || 0, signups: recentSignups?.length || 0 });
    setSignups(recentSignups || []);
    setClicks(recentClicks || []);
  }

  // — assign or revoke admin role
  async function assignAdmin(email: string, grant: boolean) {
    if (!email.trim()) return;
    setAssigning(true);
    setAssignMsg('');
    const norm = email.trim().toLowerCase();
    const { error } = await supabase
      .from('ad_signups')
      .update({ role: grant ? 'admin' : 'user' })
      .eq('email', norm);
    if (error) {
      setAssignMsg(`❌ ${error.message}`);
    } else {
      setAssignMsg(grant ? `✅ ${norm} is now an admin` : `✅ ${norm} role reset to user`);
      setAdminEmail('');
      loadData();
    }
    setAssigning(false);
  }

  if (!hydrated) return null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#fff' }}>

      {/* Nav */}
      <ArenaNav
        role="admin"
        userName="Antony Ciccone"
        userEmail="antcpu@gmail.com"
        userBrand="ANTCPU"
        trialStatus="team"
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800 }}>⚡ Super Admin</div>
          <div style={{ fontSize: '0.85rem', color: '#555', marginTop: '0.25rem' }}>
            Full system access · antcpu@gmail.com
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
          {[
            { label: 'Last Signup',  value: stats.lastSignup, color: '#0070f3' },
            { label: 'Active Ads',   value: stats.ads,        color: '#f0883e' },
            { label: 'Total Signups',value: stats.signups,    color: '#7928ca' },
          ].map(s => (
            <div key={s.label} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.75rem', color: '#555', marginTop: '0.25rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Quick Links</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {QUICK_LINKS.map(l => (
              <button key={l.path} onClick={() => router.push(l.path)} style={{
                background: 'transparent', border: '1px solid #222', color: '#aaa',
                borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.82rem',
                cursor: 'pointer', fontWeight: 600,
              }}>
                {l.label}
              </button>
            ))}
            <button onClick={() => setDrawerOpen(true)} style={{
              background: '#f0883e', border: 'none', color: '#fff',
              borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.82rem',
              cursor: 'pointer', fontWeight: 700,
            }}>
              📢 Create Ad
            </button>
          </div>
        </div>

        {/* Brand dashboards */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Brand Dashboards</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {BRAND_DASHBOARDS.map(b => (
              <button key={b.path} onClick={() => router.push(b.path)} style={{
                background: 'transparent', border: '1px solid #222', color: '#aaa',
                borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.82rem',
                cursor: 'pointer', fontWeight: 600,
              }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* Assign admin role */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Assign / Revoke Admin</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              placeholder="user@email.com"
              style={{
                flex: 1, minWidth: '200px', background: '#0a0a0a', border: '1px solid #222',
                borderRadius: '8px', padding: '0.6rem 1rem', color: '#fff',
                fontSize: '0.85rem', outline: 'none',
              }}
            />
            <button
              onClick={() => assignAdmin(adminEmail, true)}
              disabled={assigning || !adminEmail.trim()}
              style={{
                background: '#0070f3', border: 'none', color: '#fff',
                borderRadius: '8px', padding: '0.6rem 1.25rem', fontSize: '0.82rem',
                cursor: assigning ? 'not-allowed' : 'pointer', fontWeight: 700,
              }}
            >
              Grant Admin
            </button>
            <button
              onClick={() => assignAdmin(adminEmail, false)}
              disabled={assigning || !adminEmail.trim()}
              style={{
                background: 'transparent', border: '1px solid #ef4444', color: '#ef4444',
                borderRadius: '8px', padding: '0.6rem 1.25rem', fontSize: '0.82rem',
                cursor: assigning ? 'not-allowed' : 'pointer', fontWeight: 700,
              }}
            >
              Revoke
            </button>
          </div>
          {assignMsg && <div style={{ fontSize: '0.82rem', marginTop: '0.75rem', color: assignMsg.startsWith('✅') ? '#22c55e' : '#ef4444' }}>{assignMsg}</div>}
        </div>

        {/* Current admins */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Current Admins</div>
          {signups.filter(s => s.role === 'admin' || s.role === 'super').map(s => (
            <div key={s.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #1a1a1a' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.name || s.email}</div>
                <div style={{ fontSize: '0.72rem', color: '#555' }}>{s.email}</div>
              </div>
              <span style={{
                fontSize: '0.68rem', fontWeight: 700, borderRadius: '999px',
                padding: '0.15rem 0.6rem',
                background: s.role === 'super' ? '#f0883e15' : '#0070f315',
                color: s.role === 'super' ? '#f0883e' : '#0070f3',
                border: `1px solid ${s.role === 'super' ? '#f0883e30' : '#0070f330'}`,
              }}>
                {s.role === 'super' ? '⚡ Super' : '🔑 Admin'}
              </span>
            </div>
          ))}
        </div>

        {/* Recent signups */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Recent Signups</div>
          {signups.map(s => (
            <div key={s.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #1a1a1a' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{s.brand_name || s.name || '—'}</div>
                <div style={{ fontSize: '0.72rem', color: '#555' }}>{s.email}</div>
              </div>
              <span style={{ fontSize: '0.72rem', color: '#555' }}>{new Date(s.created_at).toLocaleDateString()}</span>
            </div>
          ))}
        </div>

        {/* Recent clicks */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Recent Clicks</div>
          {clicks.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0', borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ fontSize: '0.82rem', color: '#aaa' }}>{c.email}</div>
              <div style={{ fontSize: '0.72rem', color: '#555' }}>{c.source} · {new Date(c.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>

      </div>

      {/* Create ad drawer */}
      <CreateAdDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={{ name: 'Antony Ciccone', email: 'antcpu@gmail.com', brand: 'ANTCPU', trialStatus: 'team' }}
        onSuccess={() => { setDrawerOpen(false); loadData(); }}
      />

      <ArenaFooter />
    </div>
  );
}
