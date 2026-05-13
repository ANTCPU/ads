'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import Card from '../../components/Card';
import SectionHeader from '../../components/SectionHeader';
import Pill from '../../components/Pill';
import { clearSessionCookie } from '../../lib/session';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type User = {
  email: string; name: string; brand_name: string; website_url: string;
  ad_category: string; promo_code: string; message: string;
  status: 'team' | 'trial' | 'pending'; trial_expiry: string;
  country: string; city: string; region: string; ip: string; created_at: string;
};

export default function UsersPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'team' | 'trial' | 'pending'>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      if (u.email !== 'antcpu@gmail.com') { router.push('/dashboard/user'); return; }
    } catch { router.push('/'); return; }
    setHydrated(true);
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase.from('ad_signups').select('*').order('created_at', { ascending: false });
    if (!error && data) setUsers(data as User[]);
    setLoading(false);
  }

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

  function viewAsUser(u: User) {
    localStorage.setItem('arena_prev_admin', 'true');
    localStorage.setItem('arena_user', JSON.stringify({ name: u.name || u.email, email: u.email, brand: u.brand_name || '', trialStatus: u.status || 'trial' }));
    document.cookie = `arena_session=${encodeURIComponent(u.email)}; path=/; max-age=86400`;
    router.push('/dashboard/user');
  }

  const filtered = users.filter(u => {
    const matchFilter = filter === 'all' || u.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q || u.email?.toLowerCase().includes(q) || u.name?.toLowerCase().includes(q) || u.brand_name?.toLowerCase().includes(q) || u.country?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const counts = {
    all: users.length,
    team: users.filter(u => u.status === 'team').length,
    trial: users.filter(u => u.status === 'trial').length,
    pending: users.filter(u => u.status === 'pending').length,
  };

  if (!hydrated) return null;

  const statusStyle = (status: string) => ({
    background: status === 'team' ? '#f5f3ff' : status === 'trial' ? '#f0fdf4' : '#fefce8',
    color: status === 'team' ? '#7928ca' : status === 'trial' ? '#16a34a' : '#ca8a04',
    border: `1px solid ${status === 'team' ? '#ddd6fe' : status === 'trial' ? '#bbf7d0' : '#fde68a'}`,
    borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.68rem', fontWeight: 700,
  });

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav role="admin" userName="Antony Ciccone" userEmail="antcpu@gmail.com" userBrand="ANTCPU" trialStatus="team"
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }} />

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0a0a0a' }}>👥 Arena Users</div>
          <div style={{ fontSize: '0.85rem', color: '#888', marginTop: '0.3rem' }}>All signups · click to expand · admin only</div>
        </div>

        {/* QUICK NAV */}
        <Card>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Pill label="⚡ Admin Hub"    onClick={() => router.push('/dashboard/admin')} color="#f0883e" />
            <Pill label="🏟 Dashboard"   onClick={() => router.push('/dashboard/user')}  color="#0a0a0a" outline />
            <Pill label="🏆 Leaderboard" onClick={() => router.push('/dashboard/leaderboard')} color="#0a0a0a" outline />
          </div>
        </Card>

        {/* STATS */}
        <Card>
          <SectionHeader title="📊 User Stats" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem' }}>
            {[
              { label: 'Total',   value: counts.all,     color: '#0070f3' },
              { label: 'Team',    value: counts.team,    color: '#7928ca' },
              { label: 'Trial',   value: counts.trial,   color: '#22c55e' },
              { label: 'Pending', value: counts.pending, color: '#f0883e' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fafafa', border: `1px solid ${s.color}20`, borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', color: '#888' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* FILTERS + SEARCH */}
        <Card>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {(['all', 'team', 'trial', 'pending'] as const).map(f => (
              <Pill key={f} label={f === 'all' ? `All (${counts.all})` : f === 'team' ? `🔵 Team (${counts.team})` : f === 'trial' ? `🟢 Trial (${counts.trial})` : `🟡 Pending (${counts.pending})`}
                onClick={() => setFilter(f)} color={filter === f ? '#f0883e' : '#888'} outline={filter !== f} />
            ))}
          </div>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, brand, country..."
            style={{ width: '100%', background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.88rem', color: '#0a0a0a', outline: 'none', boxSizing: 'border-box' }}
          />
        </Card>

        {/* USER LIST */}
        <Card>
          <SectionHeader title="👤 Users" sub={`${filtered.length} shown`} />
          {loading ? (
            <div style={{ color: '#888', fontSize: '0.85rem' }}>Loading users...</div>
          ) : filtered.length === 0 ? (
            <div style={{ color: '#888', fontSize: '0.85rem' }}>No users found.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filtered.map((u, i) => {
                const key = u.email + i;
                const isOpen = expanded === key;
                return (
                  <div key={key} style={{ background: '#fafafa', border: '1px solid #e5e5e5', borderRadius: '10px', overflow: 'hidden' }}>
                    {/* ROW */}
                    <div onClick={() => setExpanded(isOpen ? null : key)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', cursor: 'pointer', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#0a0a0a' }}>{u.name || '—'}</div>
                          <div style={{ fontSize: '0.72rem', color: '#888' }}>{u.email}</div>
                        </div>
                        {u.brand_name && <span style={{ fontSize: '0.72rem', background: '#f0f7ff', color: '#0070f3', border: '1px solid #bfdbfe', borderRadius: '999px', padding: '0.1rem 0.5rem', fontWeight: 600 }}>{u.brand_name}</span>}
                        {u.promo_code && <span style={{ fontSize: '0.68rem', background: '#fafafa', color: '#888', border: '1px solid #e5e5e5', borderRadius: '999px', padding: '0.1rem 0.5rem' }}>{u.promo_code}</span>}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={statusStyle(u.status)}>{u.status === 'team' ? '🔵 Team' : u.status === 'trial' ? '🟢 Trial' : '🟡 Pending'}</span>
                        <span style={{ fontSize: '0.72rem', color: '#aaa' }}>{new Date(u.created_at).toLocaleDateString()}</span>
                        <span style={{ color: '#aaa', fontSize: '0.8rem' }}>{isOpen ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* EXPANDED */}
                    {isOpen && (
                      <div style={{ borderTop: '1px solid #e5e5e5', padding: '1rem', background: '#fff' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
                          {u.website_url    && <div><div style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 700, marginBottom: '0.2rem' }}>WEBSITE</div><a href={u.website_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.78rem', color: '#0070f3' }}>{u.website_url}</a></div>}
                          {u.ad_category    && <div><div style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 700, marginBottom: '0.2rem' }}>CATEGORY</div><div style={{ fontSize: '0.78rem', color: '#0a0a0a' }}>{u.ad_category}</div></div>}
                          {u.trial_expiry   && <div><div style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 700, marginBottom: '0.2rem' }}>EXPIRES</div><div style={{ fontSize: '0.78rem', color: '#0a0a0a' }}>{u.trial_expiry}</div></div>}
                          {(u.city || u.country) && <div><div style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 700, marginBottom: '0.2rem' }}>LOCATION</div><div style={{ fontSize: '0.78rem', color: '#0a0a0a' }}>📍 {[u.city, u.country].filter(Boolean).join(', ')}</div></div>}
                          {u.message        && <div><div style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 700, marginBottom: '0.2rem' }}>MESSAGE</div><div style={{ fontSize: '0.78rem', color: '#555', fontStyle: 'italic' }}>"{u.message}"</div></div>}
                          {u.ip             && <div><div style={{ fontSize: '0.65rem', color: '#aaa', fontWeight: 700, marginBottom: '0.2rem' }}>IP</div><div style={{ fontSize: '0.78rem', color: '#aaa' }}>{u.ip}</div></div>}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <Pill label="👤 Profile" onClick={() => router.push(`/profile/${encodeURIComponent(u.email)}`)} color="#f0883e" />
                          <Pill label="📣 Notify"  onClick={() => sendNotify(u)} color="#7928ca" />
                          <Pill label="👁 View Arena" onClick={() => viewAsUser(u)} color="#0070f3" />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <div style={{ textAlign: 'center', padding: '2rem 0', color: '#aaa', fontSize: '0.78rem' }}>
          ⚡ ANTCPU ADS · <a href="mailto:antcpu@gmail.com" style={{ color: '#aaa' }}>antcpu@gmail.com</a>
        </div>

      </div>
    </div>
  );
}
