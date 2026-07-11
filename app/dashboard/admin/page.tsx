'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ArenaNav        from '../../components/ArenaNav';
import ArenaFooter     from '../../components/ArenaFooter';
import ModuleSlots     from '../../components/ModuleSlots';
import CreateAdDrawer  from '../../components/CreateAdDrawer';
import { clearSessionCookie } from '../../lib/session';
import { MODULE_REGISTRY } from '../../modules/index';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Env ──────────────────────────────────────────────────────────────────────

const SUPER_EMAIL = process.env.NEXT_PUBLIC_SUPER_EMAIL || '';

// ─── Types ────────────────────────────────────────────────────────────────────

type Signup = {
  name:       string;
  email:      string;
  brand_name: string;
  status:     string;
  role:       string;
  created_at: string;
};

type Click = {
  ad_id:      string;
  email:      string;
  source:     string;
  created_at: string;
};

type SessionUser = {
  email:       string;
  name:        string;
  brand:       string;
  trialStatus: string;
  role?:       string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND_DASHBOARDS = [
  { label: '🗺️ Map of Pi',          path: '/dashboard/mapofpi' },
  { label: '📸 Amanda Photography', path: '/dashboard/photography' },
  { label: '⚡ ANTCPU',             path: '/dashboard/antcpu' },
];

const QUICK_LINKS = [
  { label: '👥 All Users',   path: '/dashboard/users' },
  { label: '🏟 The Arena',   path: '/arena' },
  { label: '🏆 Leaderboard', path: '/dashboard/leaderboard' },
  { label: '🤖 Agents',      path: '/dashboard/agents' },
  { label: '📊 Test',        path: '/dashboard/test' },
];

// All module slots — super admin sees every module
const ALL_MODULE_IDS = MODULE_REGISTRY.map(m => m.id);

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const router = useRouter();

  const [hydrated, setHydrated]   = useState(false);
  const [user, setUser]           = useState<SessionUser>({ email: '', name: '', brand: '', trialStatus: 'team' });
  const [stats, setStats]         = useState({ lastSignup: '—', ads: 0, signups: 0 });
  const [signups, setSignups]     = useState<Signup[]>([]);
  const [clicks, setClicks]       = useState<Click[]>([]);
  const [ads, setAds]             = useState<any[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState('');

  // — auth guard: super only
  useEffect(() => {
    try {
      const stored = localStorage.getItem('arena_user');
      if (!stored) { router.push('/'); return; }
      const u: SessionUser = JSON.parse(stored);
      const isSuper = u.role === 'super' || (!!SUPER_EMAIL && u.email === SUPER_EMAIL);
      if (!isSuper) { router.push('/dashboard/user'); return; }
      setUser(u);
    } catch { router.push('/'); return; }
    setHydrated(true);
    loadData();
  }, []);

  async function loadData() {
    const [
      { count: adCount },
      { data: recentSignups },
      { data: recentClicks },
      { data: allAds },
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
      supabase.from('ads')
        .select('*')
        .eq('status', 'active')
        .order('points', { ascending: false }),
    ]);

    const lastSignup = recentSignups?.[0]?.brand_name || recentSignups?.[0]?.name || '—';
    setStats({ lastSignup, ads: adCount || 0, signups: recentSignups?.length || 0 });
    setSignups(recentSignups || []);
    setClicks(recentClicks || []);
    setAds(allAds || []);
  }

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
    <div style={{ minHeight: '100vh', background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <ArenaNav
        role="admin"
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus="team"
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '2rem 1rem 4rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1.4rem', color: '#f0883e' }}>⚡ Super Admin</div>
          <div style={{ fontSize: '0.78rem', color: '#555', marginTop: '0.25rem' }}>
            Full system access · {user.email}
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '2rem' }}>
          {[
            { label: 'Last Signup',   value: stats.lastSignup, color: '#0070f3' },
            { label: 'Active Ads',    value: stats.ads,        color: '#f0883e' },
            { label: 'Total Signups', value: stats.signups,    color: '#7928ca' },
          ].map(s => (
            <div key={s.label} style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1rem' }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '0.68rem', color: '#555', marginTop: '0.2rem' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Quick Links</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {QUICK_LINKS.map(l => (
              <button key={l.path} onClick={() => router.push(l.path)} style={{ background: 'transparent', border: '1px solid #222', color: '#aaa', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}>
                {l.label}
              </button>
            ))}
            <button onClick={() => setDrawerOpen(true)} style={{ background: '#f0883e', border: 'none', color: '#000', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 700 }}>
              📢 Create Ad
            </button>
          </div>
        </div>

        {/* Brand dashboards */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Brand Dashboards</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {BRAND_DASHBOARDS.map(b => (
              <button key={b.path} onClick={() => router.push(b.path)} style={{ background: 'transparent', border: '1px solid #222', color: '#aaa', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 600 }}>
                {b.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Module preview — all modules, isSuper = true ── */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
            Arena Modules — Full Admin View
          </div>
          <ModuleSlots
            slots={ALL_MODULE_IDS}
            onSave={() => {}}
            context={{
              slug:     'antcpu',
              user:     { email: user.email, name: user.name, brand: user.brand, trialStatus: user.trialStatus },
              ads,
              supabase,
              isSuper:  true,
            }}
          />
        </div>

        {/* Assign admin role */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Assign / Revoke Admin</div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
              placeholder="user@email.com"
              style={{ flex: 1, minWidth: '200px', background: '#0a0a0a', border: '1px solid #222', borderRadius: '8px', padding: '0.6rem 1rem', color: '#fff', fontSize: '0.85rem', outline: 'none' }}
            />
            <button onClick={() => assignAdmin(adminEmail, true)} disabled={assigning || !adminEmail.trim()} style={{ background: '#0070f3', border: 'none', color: '#fff', borderRadius: '8px', padding: '0.6rem 1.25rem', fontSize: '0.82rem', cursor: assigning ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
              Grant Admin
            </button>
            <button onClick={() => assignAdmin(adminEmail, false)} disabled={assigning || !adminEmail.trim()} style={{ background: 'transparent', border: '1px solid #ef4444', color: '#ef4444', borderRadius: '8px', padding: '0.6rem 1.25rem', fontSize: '0.82rem', cursor: assigning ? 'not-allowed' : 'pointer', fontWeight: 700 }}>
              Revoke
            </button>
          </div>
          {assignMsg && <div style={{ fontSize: '0.78rem', color: '#aaa', marginTop: '0.5rem' }}>{assignMsg}</div>}
        </div>

        {/* Current admins */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Current Admins</div>
          {signups.filter(s => s.role === 'admin' || s.role === 'super').map(s => (
            <div key={s.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1a1a1a' }}>
              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff' }}>{s.name || s.email}</div>
                <div style={{ fontSize: '0.68rem', color: '#555' }}>{s.email}</div>
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: s.role === 'super' ? '#f0883e' : '#0070f3' }}>
                {s.role === 'super' ? '⚡ Super' : '🔑 Admin'}
              </span>
            </div>
          ))}
        </div>

        {/* Recent signups */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Recent Signups</div>
          {signups.map(s => (
            <div key={s.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #1a1a1a' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: '#aaa', fontWeight: 600 }}>{s.brand_name || s.name || '—'}</div>
                <div style={{ fontSize: '0.65rem', color: '#555' }}>{s.email}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.65rem', color: '#555' }}>{new Date(s.created_at).toLocaleDateString()}</div>
                <div style={{ fontSize: '0.62rem', color: s.status === 'team' ? '#7928ca' : '#0070f3' }}>{s.status}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent clicks */}
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>Recent Clicks</div>
          {clicks.map((c, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid #1a1a1a' }}>
              <div style={{ fontSize: '0.75rem', color: '#aaa' }}>{c.email}</div>
              <div style={{ fontSize: '0.65rem', color: '#555' }}>{c.source} · {new Date(c.created_at).toLocaleDateString()}</div>
            </div>
          ))}
        </div>

      </div>

      {/* Create ad drawer */}
      <CreateAdDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        user={{ name: user.name, email: user.email, brand: user.brand, trialStatus: user.trialStatus }}
        onSuccess={() => { setDrawerOpen(false); loadData(); }}
      />

      <ArenaFooter />
    </div>
  );
}
