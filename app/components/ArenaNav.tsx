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

const MAPOFPI_TEAM = [
  'antcpu@gmail.com',
  'melshoshani@gmail.com',
  'andri.postkast@gmail.com',
  'joosdup.pj@gmail.com',
];

const PHOTOGRAPHY_TEAM = [
  'antcpu@gmail.com',
  'mishoemanda@gmail.com',
];

export default function ArenaNav({
  role,
  userName = '',
  userEmail = '',
  userBrand = '',
  trialStatus = 'trial',
  onLogout,
  onDrawerOpen,
}: ArenaNavProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPrevAdmin, setIsPrevAdmin] = React.useState(false);
  const [notifications, setNotifications] = React.useState<
    { id: string; type: string; title: string; message: string; created_at: string }[]
  >([]);
  const [unread, setUnread] = React.useState(0);

  React.useEffect(() => {
    setIsPrevAdmin(localStorage.getItem('arena_prev_admin') === 'true');
    if (!userEmail) return;
    supabase
      .from('notifications')
      .select('id, type, title, message, created_at')
      .eq('email', userEmail.trim().toLowerCase())
      .eq('read', false)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
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

  const menuItems: { label: string; icon: string; color?: string; action: () => void }[] = [];

  if (role === 'admin') {
    menuItems.push(
      { label: 'My Dashboard',   icon: '⚡', action: () => router.push('/dashboard/user') },
      { label: 'Ad Builder',     icon: '🏗', action: () => router.push('/dashboard/admin') },
      { label: 'Users',          icon: '👥', action: () => router.push('/dashboard/users') },
      { label: 'Leaderboard',    icon: '🏆', action: () => router.push('/dashboard/leaderboard') },
      { label: 'Agents',         icon: '🤖', action: () => router.push('/dashboard/agents') },
      { label: 'Map of Pi',      icon: '🗺️', action: () => router.push('/dashboard/mapofpi') },
      { label: 'Photography',    icon: '📸', action: () => router.push('/dashboard/photography') },
      { label: 'ANTCPU',         icon: '⚡', action: () => router.push('/dashboard/antcpu') },
      { label: 'About',          icon: 'ℹ️', action: () => router.push('/about') },
      { label: 'Create Ad',      icon: '📢', action: () => router.push('/create-ad') },
      { label: 'Profile',        icon: '👤', action: () => router.push('/profile') },
    );
  }

  if (role === 'team') {
    menuItems.push(
      { label: 'My Dashboard', icon: '⚡', action: () => router.push('/dashboard/user') },
      { label: 'Create Ad',    icon: '📢', action: () => router.push('/create-ad') },
      { label: 'Profile',      icon: '👤', action: () => router.push(`/profile/${encodeURIComponent(userEmail)}`) },
      { label: 'Leaderboard',  icon: '🏆', action: () => router.push('/dashboard/leaderboard') },
      { label: 'About',        icon: 'ℹ️', action: () => router.push('/about') },
    );
    // Brand-specific dashboards — only show to the right team
    if (MAPOFPI_TEAM.includes(userEmail)) {
      menuItems.push({ label: 'Map of Pi', icon: '🗺️', action: () => router.push('/dashboard/mapofpi') });
    }
    if (PHOTOGRAPHY_TEAM.includes(userEmail)) {
      menuItems.push({ label: 'Photography', icon: '📸', action: () => router.push('/dashboard/photography') });
    }
  }

  if (role === 'user') {
    menuItems.push(
      { label: 'My Dashboard', icon: '⚡', action: () => router.push('/dashboard/user') },
      { label: 'Create Ad',    icon: '📢', action: () => router.push('/create-ad') },
      { label: 'Profile',      icon: '👤', action: () => router.push(`/profile/${encodeURIComponent(userEmail)}`) },
      { label: 'Leaderboard',  icon: '🏆', action: () => router.push('/dashboard/leaderboard') },
      { label: 'About',        icon: 'ℹ️', action: () => router.push('/about') },
    );
  }

  const accentColor = trialStatus === 'team' ? '#7928ca' : '#0070f3';

  return (
    <nav style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '1.2rem 2rem', borderBottom: '1px solid #1a1a1a',
      background: '#0a0a0a', position: 'sticky', top: 0, zIndex: 50,
    }}>
      {/* LEFT — logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {onDrawerOpen && (
          <button onClick={onDrawerOpen} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', fontSize: '1.1rem', padding: '0.25rem' }} aria-label="Open drawer">☰</button>
        )}
        <span
          onClick={() => role === 'admin' ? router.push('/dashboard') : router.push('/dashboard/user')}
          style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f0883e', letterSpacing: '0.05em', cursor: 'pointer' }}
        >
          ⚡ ANTCPU ADS
        </span>
        {role === 'admin' && (
          <span style={{ fontSize: '0.6rem', background: '#f0883e15', border: '1px solid #f0883e30', color: '#f0883e', borderRadius: '999px', padding: '0.15rem 0.5rem', letterSpacing: '0.1em' }}>ADMIN</span>
        )}
        {role === 'team' && (
          <span style={{ fontSize: '0.6rem', background: '#7928ca15', border: '1px solid #7928ca30', color: '#b388ff', borderRadius: '999px', padding: '0.15rem 0.5rem', letterSpacing: '0.1em' }}>TEAM</span>
        )}
      </div>

      {/* RIGHT — hamburger */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Trial/team badge — visible on larger screens */}
        {(role === 'user' || role === 'team') && (
          <span style={{
            fontSize: '0.7rem', background: `${accentColor}15`,
            border: `1px solid ${accentColor}40`, color: accentColor,
            borderRadius: '999px', padding: '0.25rem 0.85rem',
          }}>
            {trialStatus === 'team' ? '🔵 Team' : '🟢 Trial'}
          </span>
        )}

        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setOpen(o => !o)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '5px', padding: '4px' }}
            aria-label="Menu"
          >
            {[0,1,2].map(i => (
              <div key={i} style={{ width: '22px', height: '2px', background: open ? '#f0883e' : '#fff', borderRadius: '2px', transition: 'background 0.2s' }} />
            ))}
            {unread > 0 && (
              <span style={{ position: 'absolute', top: '-4px', right: '-4px', background: '#f0883e', color: '#fff', borderRadius: '999px', fontSize: '0.55rem', fontWeight: 700, padding: '0.1rem 0.35rem', minWidth: '14px', textAlign: 'center' }}>
                {unread}
              </span>
            )}
          </button>

          {open && (
            <div style={{
              position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
              background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px',
              padding: '0.5rem', minWidth: '210px', zIndex: 100,
              boxShadow: '0 8px 32px #00000080',
            }}>
              {/* User info header */}
              <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #1a1a1a', marginBottom: '0.3rem' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>{userName || userBrand}</div>
                <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '0.1rem' }}>{userEmail}</div>
              </div>

              {/* Menu items */}
              {menuItems.map(item => (
                <button
                  key={item.label}
                  onClick={() => { setOpen(false); item.action(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.6rem',
                    width: '100%', padding: '0.7rem 1rem',
                    color: item.color || '#fff', background: 'none', border: 'none',
                    borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '1rem', minWidth: '1.2rem' }}>{item.icon}</span>
                  {item.label}
                </button>
              ))}

              {/* Notifications */}
              {notifications.length > 0 && (
                <div style={{ margin: '0.5rem 0' }}>
                  <div style={{ fontSize: '0.6rem', color: '#444', letterSpacing: '0.1em', padding: '0 1rem', marginBottom: '0.4rem' }}>NOTIFICATIONS</div>
                  {notifications.map(n => (
                    <div key={n.id} style={{
                      padding: '0.6rem 1rem',
                      borderLeft: `3px solid ${n.type === 'aria' ? '#f0883e' : n.type === 'approved' ? '#3fb950' : n.type === 'points' ? '#D4AF37' : '#0070f3'}`,
                      marginBottom: '0.4rem', background: '#0a0a0a', borderRadius: '0 8px 8px 0',
                    }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>{n.title}</div>
                      {n.message && <div style={{ fontSize: '0.7rem', color: '#555', lineHeight: 1.4 }}>{n.message.slice(0, 80)}{n.message.length > 80 ? '…' : ''}</div>}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ borderTop: '1px solid #1a1a1a', margin: '0.3rem 0' }} />

              {/* Back to admin */}
              {isPrevAdmin && userEmail !== 'antcpu@gmail.com' && (
                <button
                  onClick={() => {
                    setOpen(false);
                    localStorage.removeItem('arena_prev_admin');
                    localStorage.setItem('arena_user', JSON.stringify({ name: 'Antony Ciccone', email: 'antcpu@gmail.com', brand: 'ANTCPU', trialStatus: 'team' }));
                    document.cookie = 'arena_session=antcpu%40gmail.com; path=/; max-age=86400';
                    router.push('/dashboard');
                  }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.7rem 1rem', color: '#00ffcc', background: '#00ffcc08', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', textAlign: 'left', marginBottom: '0.2rem' }}
                >
                  <span>←</span> Back to Admin
                </button>
              )}

              {/* Logout */}
              <button
                onClick={() => { setOpen(false); handleLogout(); }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', width: '100%', padding: '0.7rem 1rem', color: '#ff4444', background: 'none', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '0.88rem', textAlign: 'left' }}
              >
                <span>←</span> Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
