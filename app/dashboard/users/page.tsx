'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type User = {
  email: string;
  name: string;
  brand_name: string;
  website_url: string;
  ad_category: string;
  has_used_ad_service: boolean;
  previous_ad_service: string;
  promo_code: string;
  message: string;
  status: 'team' | 'trial' | 'pending';
  trial_days: number;
  trial_expiry: string;
  country: string;
  city: string;
  region: string;
  ip: string;
  created_at: string;
};

const STATUS_COLOR: Record<string, string> = {
  team:    '#b388ff',
  trial:   '#4caf50',
  pending: '#f0c040',
};

const STATUS_BG: Record<string, string> = {
  team:    '#7928ca15',
  trial:   '#4caf5015',
  pending: '#f0c04015',
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
    if (!stored) { router.push('/login'); return; }
    try {
      const u = JSON.parse(stored);
      if (u.email !== 'antcpu@gmail.com') { router.push('/dashboard/user'); return; }
    } catch { router.push('/login'); return; }
    setHydrated(true);
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const { data, error } = await supabase
      .from('ad_signups')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setUsers(data as User[]);
    setLoading(false);
  }

  const filtered = users.filter(u => {
    const matchFilter = filter === 'all' || u.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      u.email?.toLowerCase().includes(q) ||
      u.name?.toLowerCase().includes(q) ||
      u.brand_name?.toLowerCase().includes(q) ||
      u.country?.toLowerCase().includes(q) ||
      u.city?.toLowerCase().includes(q) ||
      u.ad_category?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const counts = {
    all:     users.length,
    team:    users.filter(u => u.status === 'team').length,
    trial:   users.filter(u => u.status === 'trial').length,
    pending: users.filter(u => u.status === 'pending').length,
  };

  if (!hydrated) return (
    <div style={{ background: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#333', fontSize: '0.85rem' }}>loading...</div>
    </div>
  );

  return (
    <div style={{ background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <ArenaNav role="admin" userName="Antony Ciccone" userEmail="antcpu@gmail.com" userBrand="ANTCPU" trialStatus="team" />

      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '2.5rem 2rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <button onClick={() => router.push('/dashboard')} style={{ background: 'none', border: 'none', color: '#444', fontSize: '0.8rem', cursor: 'pointer', padding: 0, marginBottom: '0.75rem' }}>← Admin</button>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '0.3rem' }}>👥 Arena Users</h1>
            <p style={{ color: '#444', fontSize: '0.88rem' }}>All signups · full profile · click to expand</p>
          </div>
          <div style={{ textAlign: 'right' as const }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f0883e' }}>{counts.all}</div>
            <div style={{ fontSize: '0.65rem', color: '#444', letterSpacing: '0.1em' }}>TOTAL USERS</div>
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' as const }}>
          {(['all', 'team', 'trial', 'pending'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ background: filter === f ? '#f0883e' : '#111', border: filter === f ? 'none' : '1px solid #1a1a1a', color: filter === f ? '#fff' : '#555', borderRadius: '999px', padding: '0.35rem 1rem', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              {f === 'all' ? `All (${counts.all})` : f === 'team' ? `🔵 Team (${counts.team})` : f === 'trial' ? `🟢 Trial (${counts.trial})` : `🟡 Pending (${counts.pending})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          placeholder="Search name, email, brand, city, country, category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '0.75rem 1rem', color: '#fff', fontSize: '0.88rem', boxSizing: 'border-box' as const, marginBottom: '1.5rem', outline: 'none' }}
        />

        {/* User list */}
        {loading ? (
          <div style={{ color: '#333', fontSize: '0.85rem' }}>loading users...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: '#333', fontSize: '0.85rem' }}>no users found</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.6rem' }}>
            {filtered.map((u, i) => (
              <div key={u.email + i}
                style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', overflow: 'hidden' }}>

                {/* Row */}
                <div
                  onClick={() => setExpanded(expanded === u.email + i ? null : u.email + i)}
                  style={{ padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' as const, cursor: 'pointer' }}>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.2rem', flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' as const }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{u.name || '—'}</span>
                      <span style={{ fontSize: '0.7rem', background: STATUS_BG[u.status], border: `1px solid ${STATUS_COLOR[u.status]}33`, borderRadius: '999px', padding: '0.15rem 0.5rem', color: STATUS_COLOR[u.status], fontWeight: 700 }}>
                        {u.status}
                      </span>
                      {u.promo_code && <span style={{ fontSize: '0.65rem', color: '#444' }}>{u.promo_code}</span>}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#555' }}>{u.email}</div>
                    {u.brand_name && <div style={{ fontSize: '0.75rem', color: '#f0883e' }}>{u.brand_name}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end', gap: '0.25rem' }}>
                    {(u.city || u.country) && (
                      <div style={{ fontSize: '0.72rem', color: '#444' }}>📍 {[u.city, u.country].filter(Boolean).join(', ')}</div>
                    )}
                    <div style={{ fontSize: '0.65rem', color: '#333' }}>{new Date(u.created_at).toLocaleDateString()}</div>
                    <div style={{ fontSize: '0.65rem', color: '#333' }}>{expanded === u.email + i ? '▲' : '▼'}</div>
                  </div>
                </div>

                {/* Expanded detail */}
                {expanded === u.email + i && (
                  <div style={{ borderTop: '1px solid #1a1a1a', padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {u.website_url && (
                      <div>
                        <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>WEBSITE</div>
                        <a href={u.website_url} target="_blank" rel="noreferrer" style={{ fontSize: '0.82rem', color: '#0070f3' }}>{u.website_url}</a>
                      </div>
                    )}
                    {u.ad_category && (
                      <div>
                        <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>AD CATEGORY</div>
                        <div style={{ fontSize: '0.82rem', color: '#fff' }}>{u.ad_category}</div>
                      </div>
                    )}
                    {u.previous_ad_service && (
                      <div>
                        <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>PREV AD SERVICE</div>
                        <div style={{ fontSize: '0.82rem', color: '#fff' }}>{u.previous_ad_service}</div>
                      </div>
                    )}
                    {u.trial_expiry && (
                      <div>
                        <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>TRIAL EXPIRES</div>
                        <div style={{ fontSize: '0.82rem', color: '#fff' }}>{u.trial_expiry}</div>
                      </div>
                    )}
                    {u.region && (
                      <div>
                        <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>REGION</div>
                        <div style={{ fontSize: '0.82rem', color: '#fff' }}>{u.region}</div>
                      </div>
                    )}
                    {u.message && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>MESSAGE</div>
                        <div style={{ fontSize: '0.82rem', color: '#888', fontStyle: 'italic' }}>"{u.message}"</div>
                      </div>
                    )}
                    {(u as any).points > 0 && (
                      <div>
                        <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>POINTS</div>
                        <div style={{ fontSize: '0.82rem', color: '#D4AF37', fontWeight: 700 }}>⚡ {(u as any).points} pts</div>
                      </div>
                    )}
                    {u.ip && (
                      <div>
                        <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>IP</div>
                        <div style={{ fontSize: '0.82rem', color: '#333' }}>{u.ip}</div>
                      </div>
                    )}
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        onClick={() => router.push(`/profile/${encodeURIComponent(u.email)}`)}
                        style={{ fontSize: '0.75rem', background: '#D4AF3715', border: '1px solid #D4AF3733', color: '#D4AF37', borderRadius: '8px', padding: '0.4rem 1rem', cursor: 'pointer', fontWeight: 600 }}>
                        👤 Profile
                      </button>
                      <button
                        onClick={async () => {
                          const msg = prompt(`Message to ${u.name || u.email}:`);
                          if (!msg) return;
                          const res = await fetch('/api/scout/notify', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: u.email, name: u.name, subject: '⚡ Message from ANTCPU ADS', message: msg }),
                          });
                          alert(res.ok ? `✅ Sent to ${u.email}` : '❌ Failed — check Resend');
                        }}
                        style={{ fontSize: '0.75rem', background: '#f0883e15', border: '1px solid #f0883e33', color: '#f0883e', borderRadius: '8px', padding: '0.4rem 1rem', cursor: 'pointer', fontWeight: 600 }}>
                        📣 Notify
                      </button>
                      <button
                        onClick={() => {
                          // Store admin flag + impersonate user session
                          localStorage.setItem('arena_prev_admin', 'true');
                          localStorage.setItem('arena_user', JSON.stringify({
                            name: u.name || u.email,
                            email: u.email,
                            brand: u.brand_name || '',
                            trialStatus: u.status || 'trial',
                          }));
                          document.cookie = `arena_session=${encodeURIComponent(u.email)}; path=/; max-age=86400`;
                          router.push('/dashboard/user');
                        }}
                        style={{ fontSize: '0.75rem', background: '#0070f315', border: '1px solid #0070f333', color: '#0070f3', borderRadius: '8px', padding: '0.4rem 1rem', cursor: 'pointer', fontWeight: 600 }}>
                        👁 View Arena
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
