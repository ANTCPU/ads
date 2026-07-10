'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import { clearSessionCookie } from '../../lib/session';
import ArenaFooter from '../../components/ArenaFooter';

// ─── Supabase ─────────────────────────────────────────────────────────────────

// Note: admin/users API route handles all reads + patches
// We do not call supabase directly from this page

// ─── Types ────────────────────────────────────────────────────────────────────

type User = {
  email: string;
  name: string;
  brand_name: string;
  website_url: string;
  ad_category: string;
  promo_code: string;
  message: string;
  status: string;
  role: string;
  trial_expiry: string;
  country: string;
  city: string;
  region: string;
  ip: string;
  created_at: string;
  points: number;
  is_country_champion: boolean;
  champion_since: string | null;
  welcome_email_sent_at: string | null;
};

type Filter = 'all' | 'team' | 'trial' | 'pending';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusColor(status: string): string {
  if (status === 'team') return '#7928ca';
  if (status === 'trial') return '#22c55e';
  return '#f0883e';
}

function statusLabel(status: string): string {
  if (status === 'team') return '🔵 Team';
  if (status === 'trial') return '🟢 Trial';
  return '🟡 Pending';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const router = useRouter();

  // — state
  const [hydrated, setHydrated]   = useState(false);
  const [users, setUsers]         = useState<User[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState<Filter>('all');
  const [expanded, setExpanded]   = useState<string | null>(null);

  // — auth guard: super + admin only
  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      const allowed = u.email === 'antcpu@gmail.com' || u.role === 'super' || u.role === 'admin';
      if (!allowed) { router.push('/dashboard/user'); return; }
    } catch { router.push('/'); return; }
    setHydrated(true);
    fetchUsers();
  }, []);

  // — fetch all users via admin API
  async function fetchUsers() {
    setLoading(true);
    const res = await fetch('/api/admin/users');
    const json = await res.json();
    if (json.users) setUsers(json.users as User[]);
    setLoading(false);
  }

  // — send welcome email (fires and updates local state on success)
  async function sendWelcome(u: User) {
    const res = await fetch('/api/send-welcome', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: u.name, email: u.email, brand: u.brand_name, trialStatus: u.status }),
    });
    if (res.ok) {
      setUsers(prev => prev.map(x =>
        x.email === u.email ? { ...x, welcome_email_sent_at: new Date().toISOString() } : x
      ));
    }
  }

  // — send custom notify via scout
  async function sendNotify(u: User) {
    const msg = prompt(`Message to ${u.name || u.email}:`);
    if (!msg) return;
    const res = await fetch('/api/scout/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: u.email, name: u.name, subject: '⚡ Message from ANTCPU ADS', message: msg }),
    });
    alert(res.ok ? `✅ Sent to ${u.email}` : '❌ Failed — check Resend');
  }

  // — toggle country champion status via admin PATCH
  async function toggleChampion(u: User) {
    const newVal = !u.is_country_champion;
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: u.email,
        is_country_champion: newVal,
        champion_since: newVal ? new Date().toISOString() : null,
      }),
    });
    setUsers(prev => prev.map(x =>
      x.email === u.email
        ? { ...x, is_country_champion: newVal, champion_since: newVal ? new Date().toISOString() : null }
        : x
    ));
  }

  // — impersonate user (admin view-as)
  function viewAsUser(u: User) {
    localStorage.setItem('arena_prev_admin', 'true');
    localStorage.setItem('arena_user', JSON.stringify({
      name: u.name || u.email,
      email: u.email,
      brand: u.brand_name || '',
      trialStatus: u.status || 'trial',
      role: u.role || 'user',
    }));
    document.cookie = `arena_session=${encodeURIComponent(u.email)}; path=/; max-age=86400`;
    router.push('/dashboard');
  }

  if (!hydrated) return null;

  // — derived lists
  const filtered = users.filter(u => {
    const matchFilter = filter === 'all' || u.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || u.email?.toLowerCase().includes(q)
      || u.name?.toLowerCase().includes(q)
      || u.brand_name?.toLowerCase().includes(q)
      || u.country?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const counts = {
    all:     users.length,
    team:    users.filter(u => u.status === 'team').length,
    trial:   users.filter(u => u.status === 'trial').length,
    pending: users.filter(u => u.status === 'pending').length,
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

      {/* Nav */}
      <ArenaNav
        role="admin"
        userName="Antony Ciccone"
        userEmail="antcpu@gmail.com"
        userBrand="ANTCPU"
        trialStatus="team"
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* Header */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0a0a0a' }}>👥 Arena Users</div>
          <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.25rem' }}>
            {users.length} total · click row to expand
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {(['all', 'team', 'trial', 'pending'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '0.4rem 1rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 600,
              cursor: 'pointer', border: '1px solid',
              background: filter === f ? '#0a0a0a' : '#fff',
              color: filter === f ? '#fff' : '#888',
              borderColor: filter === f ? '#0a0a0a' : '#e5e5e5',
            }}>
              {f === 'all'     ? `All (${counts.all})`
              : f === 'team'   ? `🔵 Team (${counts.team})`
              : f === 'trial'  ? `🟢 Trial (${counts.trial})`
              : `🟡 Pending (${counts.pending})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, brand, country..."
          style={{
            width: '100%', background: '#fff', border: '1px solid #e5e5e5',
            borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.88rem',
            color: '#0a0a0a', outline: 'none', boxSizing: 'border-box', marginBottom: '1.25rem',
          }}
        />

        {/* User list */}
        {loading ? (
          <div style={{ color: '#888' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: '#888' }}>No users found.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map((u, i) => {
              const key = u.email + i;
              const isOpen = expanded === key;
              return (
                <div key={key} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', overflow: 'hidden' }}>

                  {/* ── Row ── */}
                  <div
                    onClick={() => setExpanded(isOpen ? null : key)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', cursor: 'pointer', flexWrap: 'wrap', gap: '0.5rem' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>

                      {/* Status dots */}
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {/* Blue/red dot = welcome email sent or not — click to send */}
                        <span
                          title={u.welcome_email_sent_at ? 'Welcome email sent' : 'Click to send welcome email'}
                          onClick={e => { e.stopPropagation(); if (!u.welcome_email_sent_at) sendWelcome(u); }}
                          style={{ width: 9, height: 9, borderRadius: '50%', display: 'inline-block', flexShrink: 0, background: u.welcome_email_sent_at ? '#0070f3' : '#ef4444', cursor: u.welcome_email_sent_at ? 'default' : 'pointer' }}
                        />
                        {u.is_country_champion && <span style={{ fontSize: '0.7rem' }}>🏆</span>}
                      </div>

                      {/* Name + email */}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0a0a0a' }}>{u.name || '—'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#888' }}>{u.email}</div>
                      </div>

                      {/* Brand + promo pills */}
                      {u.brand_name && (
                        <span style={{ fontSize: '0.72rem', background: '#f0f7ff', color: '#0070f3', border: '1px solid #bfdbfe', borderRadius: '999px', padding: '0.1rem 0.5rem', fontWeight: 600 }}>
                          {u.brand_name}
                        </span>
                      )}
                      {u.promo_code && (
                        <span style={{ fontSize: '0.68rem', color: '#888', border: '1px solid #e5e5e5', borderRadius: '999px', padding: '0.1rem 0.5rem' }}>
                          {u.promo_code}
                        </span>
                      )}
                    </div>

                    {/* Right side: status + date + chevron */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{
                        fontSize: '0.68rem', fontWeight: 700, borderRadius: '999px', padding: '0.15rem 0.6rem',
                        background: `${statusColor(u.status)}15`,
                        color: statusColor(u.status),
                        border: `1px solid ${statusColor(u.status)}40`,
                      }}>
                        {statusLabel(u.status)}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#aaa' }}>{new Date(u.created_at).toLocaleDateString()}</span>
                      <span style={{ color: '#aaa', fontSize: '0.8rem' }}>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {/* ── Expanded detail panel ── */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid #e5e5e5', padding: '1rem', background: '#fafafa' }}>

                      {/* Detail grid */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                        {u.country && (
                          <div>
                            <div style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 700, marginBottom: '0.2rem' }}>LOCATION</div>
                            <div style={{ fontSize: '0.78rem' }}>📍 {[u.city, u.country].filter(Boolean).join(', ')}</div>
                          </div>
                        )}
                        {u.trial_expiry && (
                          <div>
                            <div style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 700, marginBottom: '0.2rem' }}>EXPIRES</div>
                            <div style={{ fontSize: '0.78rem' }}>{u.trial_expiry}</div>
                          </div>
                        )}
                        {u.ad_category && (
                          <div>
                            <div style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 700, marginBottom: '0.2rem' }}>CATEGORY</div>
                            <div style={{ fontSize: '0.78rem' }}>{u.ad_category}</div>
                          </div>
                        )}
                        {u.points > 0 && (
                          <div>
                            <div style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 700, marginBottom: '0.2rem' }}>POINTS</div>
                            <div style={{ fontSize: '0.78rem', color: '#f0883e', fontWeight: 700 }}>⚡ {u.points}</div>
                          </div>
                        )}
                        {u.message && (
                          <div>
                            <div style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 700, marginBottom: '0.2rem' }}>MESSAGE</div>
                            <div style={{ fontSize: '0.78rem', color: '#555', fontStyle: 'italic' }}>&quot;{u.message}&quot;</div>
                          </div>
                        )}
                        {u.ip && (
                          <div>
                            <div style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 700, marginBottom: '0.2rem' }}>IP</div>
                            <div style={{ fontSize: '0.78rem', color: '#aaa' }}>{u.ip}</div>
                          </div>
                        )}
                      </div>

                      {/* Champion toggle */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 700 }}>COUNTRY CHAMPION</span>
                        <button
                          onClick={e => { e.stopPropagation(); toggleChampion(u); }}
                          style={{
                            background: u.is_country_champion ? '#D4AF3715' : 'transparent',
                            border: `1px solid ${u.is_country_champion ? '#D4AF37' : '#e5e5e5'}`,
                            color: u.is_country_champion ? '#D4AF37' : '#888',
                            borderRadius: '999px', padding: '0.15rem 0.65rem',
                            fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          {u.is_country_champion ? '🏆 Champion' : '+ Set Champion'}
                        </button>
                        {u.is_country_champion && u.champion_since && (
                          <span style={{ fontSize: '0.68rem', color: '#D4AF37' }}>
                            since {new Date(u.champion_since).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button onClick={() => router.push(`/profile/${encodeURIComponent(u.email)}`)}
                          style={{ background: '#f0883e', border: 'none', color: '#fff', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                          👤 Profile
                        </button>
                        <button onClick={() => sendNotify(u)}
                          style={{ background: '#7928ca', border: 'none', color: '#fff', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                          📣 Notify
                        </button>
                        <button onClick={() => viewAsUser(u)}
                          style={{ background: '#0070f3', border: 'none', color: '#fff', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                          👁 View as User
                        </button>
                      </div>

                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Footer */}
      <ArenaFooter />

    </div>
  );
}
