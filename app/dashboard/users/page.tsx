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
  status: string;
  created_at: string;
  country: string;
  points: number;
  is_country_champion: boolean;
  welcome_email_sent_at: string | null;
  champion_since: string | null;
};

export default function UsersPage() {
  const router = useRouter();
  const [hydrated, setHydrated] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav role="admin" userName="Antony Ciccone" userEmail="antcpu@gmail.com" userBrand="ANTCPU" trialStatus="team"
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }} />
      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.25rem' }}>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, marginBottom: '1.5rem' }}>👥 Arena Users</div>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {users.map((u, i) => (
              <div key={i} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '1rem' }}>
                <div style={{ fontWeight: 700 }}>{u.name || '—'}</div>
                <div style={{ fontSize: '0.8rem', color: '#888' }}>{u.email}</div>
                <div style={{ fontSize: '0.75rem', color: '#aaa' }}>{u.brand_name} · {u.status} · {u.country}</div>
              </div>
            ))}
          </div>
        )}
      </div>
      <ArenaFooter />
    </div>
  );
}
