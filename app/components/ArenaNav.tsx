'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSessionCookie } from '../lib/session';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Role = 'admin' | 'team' | 'user' | 'mod';
type ArenaNavProps = {
  role: Role;
  userName?: string;
  userEmail?: string;
  userBrand?: string;
  trialStatus?: 'team' | 'trial' | 'pending';
  onLogout?: () => void;
  onDrawerOpen?: () => void;
};

export default function ArenaNav({ role, userName = '', userEmail = '', userBrand = '', trialStatus = 'trial', onLogout, onDrawerOpen }: ArenaNavProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = React.useState<{ id: string; type: string; title: string; message: string; created_at: string }[]>([]);
  const [unread, setUnread] = React.useState(0);

  React.useEffect(() => {
    if (!userEmail) return;
    supabase.from('notifications').select('id, type, title, message, created_at').eq('email', userEmail.trim().toLowerCase()).eq('read', false).order('created_at', { ascending: false }).then(({ data }) => {
      setNotifications(data || []);
      setUnread((data || []).length);
    });
  }, [userEmail]);

  function handleLogout() {
    localStorage.removeItem('arena_user');
    clearSessionCookie();
    if (onLogout) onLogout();
    router.push('/');
  }

  const menuItems: { label: string; icon: string; action: () => void }[] = [];

  if (role === 'admin') {
    menuItems.push(
      { label: 'My Dashboard',  icon: '⚡', action: () => router.push('/dashboard/user') },
      { label: 'Ad Builder',    icon: '🏗',  action: () => router.push('/dashboard/admin') },
      { label: 'Users',         icon: '👥', action: () => router.push('/dashboard/users') },
      { label: 'Leaderboard',   icon: '🏆', action: () => router.push('/dashboard/leaderboard') },
      { label: 'Agents',        icon: '🤖', action: () => router.push('/dashboard/agents') },
      { label: 'Map of Pi',     icon: '🗺️', action: () => router.push('/dashboard/mapofpi') },
      { label: 'Photography',   icon: '📸', action: () => router.push('/dashboard/photography') },
      { label: 'Create Ad',     icon: '📢', action: () => router.push('/create-ad') },
      { label: 'Profile',       icon: '👤', action: () => router.push('/profile') },
    );
  }
  if (role === 'team') {
    menuItems.push(
      { label: 'Team Dashboard', icon: '🗺️', action: () => router.push('/dashboard/mapofpi') },
      { label: 'Arena Feed',     icon: '📡', action: () => router.push('/dashboard/user') },
      { label: 'Create Ad',      icon: '📢', action: () => router.push('/create-ad') },
      { label: 'Profile',        icon: '👤', action: () => router.push(`/profile/${encodeURIComponent(userEmail)}`) },
    );
  }
  if (role === 'user') {
    menuItems.push(
      { label: 'My Dashboard', icon: '⚡', action: () => router.push('/dashboard/user') },
      { label: 'Create Ad',    icon: '📢', action: () => router.push('/create-ad') },
      { label: 'Profile',      icon: '👤', action: () => router.push(`/profile/${encodeURIComponent(userEmail)}`) },
    );
  }

  return (
    <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderBottom: '1px solid #e5e5e5', background: '#fff', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 4px #0000000a' }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <span onClick={() => router.push('/dashboard/user')} style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f0883e', letterSpacing: '0.05em', cursor: 'pointer' }}>
          ⚡ ANTCPU ADS
        </span>
        {role === 'admin' && (
          <span style={{ fontSize: '0.6rem', background: '#fff7ed', border: '1px solid #fed7aa', color: '#f0883e', borderRadius: '999px', padding: '0.15rem 0.5rem', letterSpacing: '0.1em', fontWeight: 700 }}>ADMIN</span>
        )}
        {role === 'team' && (
          <span style={{ fontSize: '0.6rem', background: '#f5f3ff', border: '1px solid #ddd6fe', color: '#7928ca', borderRadius: '999px', padding: '0.15rem 0.5rem', letterSpacing: '0.1em', fontWeight: 700 }}>TEAM</span>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {unread > 0 && (
          <span style={{ background: '#f0883e', color: '#fff', borderRadius: '999px', padding: '0.15rem 0.55rem', fontSize: '0.7rem', fontWeight: 700 }}>{unread}</span>
        )}

        {/* Hamburger */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setOpen(o => !o)} style={{ background: 'none', border: '1px solid #e5e5e5', borderRadius: '8px', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '4px', padding: '8px 10px' }} aria-label="Menu">
            <div style={{ width: '20px', height: '2px', background: open ? '#f0883e' : '#0a0a0a', borderRadius: '2px' }} />
            <div style={{ width: '20px', height: '2px', background: open ? '#f0883e' : '#0a0a0a', borderRadius: '2px' }} />
            <div style={{ width: '20px', height: '2px', background: open ? '#f0883e' : '#0a0a0a', borderRadius: '2px' }} />
          </button>

          {open && (
            <div style={{ position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0, background: '#fff', border: '1px solid #e5e5e5', borderRadius: '14px', padding: '0.5rem', minWidth: '220px', zIndex: 100, boxShadow: '0 8px 32px #00000014' }}>

              {/* User info */}
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #f0f0f0', marginBottom: '0.3rem' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0a0a0a' }}>{userName || userBrand}</div>
                <div style={{ fontSize: '0.72rem', color: '#888', marginTop: '0.1rem' }}>{userEmail}</div>
                <div style={{ fontSize: '0.68rem', color: '#f0883e', marginTop: '0.2rem', fontWeight: 600 }}>{trialStatus === 'team' ? '🔵 Team — Unlimited' : '🟢 Trial'}</div>
              </div>

              {/* Menu items */}
              {menuItems.map(item => (
                <button key={item.label} onClick={() => { setOpen(false); item.action(); }} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.65rem 1rem', color: '#0a0a0a', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', textAlign: 'left' }}>
                  <span style={{ fontSize: '1rem', minWidth: '1.2rem' }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}

              {/* Notifications */}
              {notifications.length > 0 && (
                <div style={{ margin: '0.5rem 0', borderTop: '1px solid #f0f0f0', paddingTop: '0.5rem' }}>
                  <div style={{ fontSize: '0.6rem', color: '#aaa', letterSpacing: '0.1em', padding: '0 1rem', marginBottom: '0.4rem' }}>NOTIFICATIONS</div>
                  {notifications.map(n => (
                    <div key={n.id} style={{ padding: '0.6rem 1rem', borderLeft: `3px solid ${n.type === 'aria' ? '#f0883e' : n.type === 'approved' ? '#22c55e' : '#0070f3'}`, marginBottom: '0.4rem', background: '#fafafa', borderRadius: '0 8px 8px 0' }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#0a0a0a' }}>{n.title}</div>
                      {n.message && <div style={{ fontSize: '0.7rem', color: '#888' }}>{n.message.slice(0, 80)}{n.message.length > 80 ? '…' : ''}</div>}
                    </div>
                  ))}
                </div>
              )}

              {/* Divider + logout */}
              <div style={{ borderTop: '1px solid #f0f0f0', margin: '0.3rem 0' }} />
              <button onClick={() => { setOpen(false); handleLogout(); }} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.65rem 1rem', color: '#dc2626', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', textAlign: 'left' }}>
                <span>←</span> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
