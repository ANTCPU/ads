'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import { clearSessionCookie } from '../../lib/session';
import ArenaFooter from '../../components/ArenaFooter';

// ─── Types ────────────────────────────────────────────────────────────────────

type User = {
  email: string;
  name: string;
  brand_name: string;
  status: string;
  created_at: string;
  country: string;
  points: number;
  is_country_champion: boolean;
  welcome_email_sent_at: string | null;
  champion_since: string | null;
};

type Filter = 'all' | 'team' | 'trial' | 'pending';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function UsersPage() {
  const router = useRouter();

  // — state
  const [hydrated, setHydrated] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  // — auth guard + fetch
  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      if (u.email !== 'antcpu@gmail.com') { router.push('/dashboard/user'); return; }
    } catch { router.push('/'); return; }
    setHydrated(true);
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(j => { if (j.users) setUsers(j.users as User[]); setLoading(false); });
  }, []);

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
    all: users.length,
    team: users.filter(u => u.status === 'team').length,
    trial: users.filter(u => u.status === 'trial').length,
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
          <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.25rem' }}>Admin only · {users.length} total signups</div>
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
              {f === 'all' ? `All (${counts.all})`
                : f === 'team' ? `🔵 Team (${counts.team})`
                : f === 'trial' ? `🟢 Trial (${counts.trial})`
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
            {filtered.map((u, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{u.name || '—'}</div>
                <div style={{ fontSize: '0.78rem', color: '#888' }}>{u.email}</div>
                <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: '0.25rem' }}>
                  {u.brand_name} · {u.status} · {u.country}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Footer */}
      <ArenaFooter />

    </div>
  );
}
