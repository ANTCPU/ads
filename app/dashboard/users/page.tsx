'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import ArenaNav from '../../components/ArenaNav';
import { clearSessionCookie } from '../../lib/session';
import ArenaFooter from '../../components/ArenaFooter';

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

type Filter = 'all' | 'team' | 'trial' | 'pending' | 'champions';

function statusLabel(status: string): string {
  if (status === 'team')  return '🔵 Team';
  if (status === 'trial') return '🟢 Trial';
  return '🟡 Pending';
}

const S = {
  page:      { background: '#0a0a0a', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' } as React.CSSProperties,
  wrap:      { maxWidth: '720px', margin: '0 auto', padding: '1.5rem 1rem' } as React.CSSProperties,
  card:      { background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', marginBottom: '0.5rem', overflow: 'hidden' } as React.CSSProperties,
  label:     { fontSize: '0.62rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '0.25rem' },
  pill:      (active: boolean): React.CSSProperties => ({
    padding: '0.35rem 0.9rem', borderRadius: '999px', fontSize: '0.78rem', fontWeight: 600,
    cursor: 'pointer', border: '1px solid',
    background: active ? '#f0883e' : 'transparent',
    color: active ? '#000' : '#555',
    borderColor: active ? '#f0883e' : '#333',
    transition: 'all 0.15s',
  }),
  btn:       (bg: string, color = '#fff'): React.CSSProperties => ({
    background: bg, border: 'none', color, borderRadius: '8px',
    padding: '0.4rem 0.85rem', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
  }),
  champCard: { background: '#111', border: '1px solid #D4AF3740', borderLeft: '3px solid #D4AF37', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '0.5rem' } as React.CSSProperties,
};

export default function UsersPage() {
  const router = useRouter();

  const [hydrated, setHydrated] = useState(false);
  const [users,    setUsers]    = useState<User[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState<Filter>('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      if (u.role !== 'super' && u.role !== 'admin') {
        router.push('/dashboard/user'); return;
      }
    } catch { router.push('/'); return; }
    setHydrated(true);
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    const res  = await fetch('/api/admin/users');
    const json = await res.json();
    if (json.users) setUsers(json.users as User[]);
    setLoading(false);
  }

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

  async function sendChampionEmail(u: User) {
    const res = await fetch('/api/send-module', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'champion', name: u.name, email: u.email,
        brand: u.brand_name, trialStatus: u.status,
        shopName: u.brand_name, country: u.country,
        flag: '', adId: null, category: u.ad_category,
      }),
    });
    alert(res.ok ? `✅ Champion email sent to ${u.email}` : '❌ Failed — check Resend');
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

  async function viewAsUser(u: User) {
    const session = {
      name: u.name || u.email, email: u.email,
      brand: u.brand_name || '', trialStatus: u.status || 'trial',
      role: u.role || 'user',
    };
    await fetch('/api/session/set', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    localStorage.setItem('arena_prev_admin', 'true');
    localStorage.setItem('arena_user', JSON.stringify(session));
    router.push('/dashboard');
  }

  if (!hydrated) return null;

  const filtered = users.filter(u => {
    const matchFilter =
      filter === 'all'       ? true :
      filter === 'champions' ? u.is_country_champion :
      u.status === filter;
    const q = search.toLowerCase();
    const matchSearch = !q
      || u.email?.toLowerCase().includes(q)
      || u.name?.toLowerCase().includes(q)
      || u.brand_name?.toLowerCase().includes(q)
      || u.country?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const counts = {
    all:       users.length,
    team:      users.filter(u => u.status === 'team').length,
    trial:     users.filter(u => u.status === 'trial').length,
    pending:   users.filter(u => u.status === 'pending').length,
    champions: users.filter(u => u.is_country_champion).length,
  };

  return (
    <div style={S.page}>

      <ArenaNav
        role="admin"
        onLogout={async () => { await clearSessionCookie(); router.push('/'); }}
      />

      <div style={S.wrap}>

        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.25rem' }}>👥 Arena Users</div>
          <div style={{ fontSize: '0.78rem', color: '#555' }}>{users.length} total · click row to expand</div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {(['all', 'team', 'trial', 'pending', 'champions'] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)} style={S.pill(filter === f)}>
              {f === 'all'       ? `All (${counts.all})` :
               f === 'team'      ? `🔵 Team (${counts.team})` :
               f === 'trial'     ? `🟢 Trial (${counts.trial})` :
               f === 'champions' ? `🏆 Champions (${counts.champions})` :
                                   `🟡 Pending (${counts.pending})`}
            </button>
          ))}
        </div>

        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email, brand, country..."
          style={{
            width: '100%', background: '#111', border: '1px solid #222',
            borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.88rem',
            color: '#fff', outline: 'none', boxSizing: 'border-box', marginBottom: '1.25rem',
          }}
        />

        {/* Content */}
        {loading ? (
          <div style={{ color: '#555', padding: '2rem', textAlign: 'center' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ color: '#555', padding: '2rem', textAlign: 'center' }}>No users found.</div>

        ) : filter === 'champions' ? (
          // ── Champions column ──────────────────────────────────────────────
          <div>
            <div style={{ ...S.label, marginBottom: '1rem' }}>{counts.champions} Active Champions</div>
            {filtered.map((u, i) => (
              <div key={u.email + i} style={S.champCard}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>

                  <div style={{ flex: 1, minWidth: '160px' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#D4AF37', marginBottom: '0.2rem' }}>
                      🏆 {u.name || u.brand_name || u.email}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.2rem' }}>{u.email}</div>
                    {u.brand_name && <div style={{ fontSize: '0.72rem', color: '#aaa' }}>{u.brand_name}</div>}
                  </div>

                  <div style={{ flex: 1, minWidth: '140px', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                    {u.country && <div style={{ fontSize: '0.78rem', color: '#aaa' }}>📍 {[u.city, u.country].filter(Boolean).join(', ')}</div>}
                    {u.ad_category && <div style={{ fontSize: '0.72rem', color: '#555' }}>{u.ad_category}</div>}
                    {u.champion_since && <div style={{ fontSize: '0.68rem', color: '#555' }}>since {new Date(u.champion_since).toLocaleDateString()}</div>}
                    {u.points > 0 && <div style={{ fontSize: '0.78rem', color: '#f0883e', fontWeight: 700 }}>⚡ {u.points} pts</div>}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: u.welcome_email_sent_at ? '#0070f3' : '#ef4444' }} />
                      <span style={{ fontSize: '0.65rem', color: '#555' }}>{u.welcome_email_sent_at ? 'Welcome sent' : 'No welcome'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                      <button onClick={() => sendChampionEmail(u)} style={S.btn('#D4AF37', '#000')}>📧 Champion Email</button>
                      <button onClick={() => router.push(`/profile/${encodeURIComponent(u.email)}`)} style={S.btn('#f0883e')}>👤 Profile</button>
                      <button onClick={() => toggleChampion(u)} style={{ ...S.btn('transparent', '#ef4444'), border: '1px solid #ef4444' }}>Remove</button>
                    </div>
                  </div>

                </div>
              </div>
            ))}
          </div>

        ) : (
          // ── Standard rows ─────────────────────────────────────────────────
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {filtered.map((u, i) => {
              const key    = u.email + i;
              const isOpen = expanded === key;
              return (
                <div key={key} style={S.card}>
                  <div
                    onClick={() => setExpanded(isOpen ? null : key)}
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.85rem 1rem', cursor: 'pointer', flexWrap: 'wrap', gap: '0.5rem' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', flex: 1 }}>
                      <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
                        <div
                          onClick={e => { e.stopPropagation(); if (!u.welcome_email_sent_at) sendWelcome(u); }}
                          title={u.welcome_email_sent_at ? 'Welcome sent' : 'Click to send welcome'}
                          style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: u.welcome_email_sent_at ? '#0070f3' : '#ef4444', cursor: u.welcome_email_sent_at ? 'default' : 'pointer' }}
                        />
                        {u.is_country_champion && <span style={{ fontSize: '0.7rem' }}>🏆</span>}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{u.name || '—'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#555' }}>{u.email}</div>
                      </div>
                      {u.brand_name && <span style={{ background: '#1a1a1a', border: '1px solid #222', color: '#aaa', borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.68rem' }}>{u.brand_name}</span>}
                      {u.promo_code && <span style={{ background: '#1a1a1a', border: '1px solid #222', color: '#555', borderRadius: '999px', padding: '0.15rem 0.6rem', fontSize: '0.68rem', fontFamily: 'monospace' }}>{u.promo_code}</span>}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: '#555' }}>
                      <span>{statusLabel(u.status)}</span>
                      <span>{new Date(u.created_at).toLocaleDateString()}</span>
                      <span>{isOpen ? '▲' : '▼'}</span>
                    </div>
                  </div>

                  {isOpen && (
                    <div style={{ borderTop: '1px solid #1a1a1a', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                        {u.country    && <div><div style={S.label}>Location</div><div style={{ fontSize: '0.82rem', color: '#aaa' }}>📍 {[u.city, u.country].filter(Boolean).join(', ')}</div></div>}
                        {u.trial_expiry && <div><div style={S.label}>Expires</div><div style={{ fontSize: '0.82rem', color: '#aaa' }}>{u.trial_expiry}</div></div>}
                        {u.ad_category && <div><div style={S.label}>Category</div><div style={{ fontSize: '0.82rem', color: '#aaa' }}>{u.ad_category}</div></div>}
                        {u.points > 0  && <div><div style={S.label}>Points</div><div style={{ fontSize: '0.82rem', color: '#f0883e', fontWeight: 700 }}>⚡ {u.points}</div></div>}
                        {u.message     && <div style={{ width: '100%' }}><div style={S.label}>Message</div><div style={{ fontSize: '0.82rem', color: '#aaa' }}>"{u.message}"</div></div>}
                        {u.ip          && <div><div style={S.label}>IP</div><div style={{ fontSize: '0.75rem', color: '#555', fontFamily: 'monospace' }}>{u.ip}</div></div>}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <div style={S.label}>Country Champion</div>
                        <button
                          onClick={e => { e.stopPropagation(); toggleChampion(u); }}
                          style={{
                            background: u.is_country_champion ? '#D4AF3715' : 'transparent',
                            border: `1px solid ${u.is_country_champion ? '#D4AF37' : '#333'}`,
                            color: u.is_country_champion ? '#D4AF37' : '#555',
                            borderRadius: '999px', padding: '0.15rem 0.65rem',
                            fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer',
                          }}
                        >
                          {u.is_country_champion ? '🏆 Champion' : '+ Set Champion'}
                        </button>
                        {u.is_country_champion && u.champion_since && (
                          <span style={{ fontSize: '0.68rem', color: '#555' }}>since {new Date(u.champion_since).toLocaleDateString()}</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button onClick={() => router.push(`/profile/${encodeURIComponent(u.email)}`)} style={S.btn('#f0883e')}>👤 Profile</button>
                        {u.is_country_champion && <button onClick={() => sendChampionEmail(u)} style={S.btn('#D4AF37', '#000')}>📧 Champion Email</button>}
                        <button onClick={() => sendNotify(u)} style={S.btn('#7928ca')}>📣 Notify</button>
                        <button onClick={() => viewAsUser(u)} style={S.btn('#0070f3')}>👁 View as User</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
      <ArenaFooter />
    </div>
  );
}
