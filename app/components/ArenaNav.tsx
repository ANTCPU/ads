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
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [lastVisited, setLastVisited] = React.useState<string[]>([]);
  const [isPrevAdmin, setIsPrevAdmin] = React.useState(false);
  const [notifications, setNotifications] = React.useState<
    { id: string; type: string; title: string; message: string; created_at: string }[]
  >([]);
  const [unread, setUnread] = React.useState(0);

  React.useEffect(() => {
    setIsPrevAdmin(localStorage.getItem('arena_prev_admin') === 'true');
    try {
      const lv = JSON.parse(localStorage.getItem('arena_last_visited') || '[]');
      setLastVisited(Array.isArray(lv) ? lv : []);
    } catch {}
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

  const ALL_BRANDS = [
    { slug: 'antcpu',      label: 'ANTCPU',             icon: '⚡', dashboard: '/dashboard/antcpu' },
    { slug: 'mapofpi',     label: 'Map of Pi',           icon: '🗺️', dashboard: '/dashboard/mapofpi' },
    { slug: 'photography', label: 'Amanda Photography',  icon: '📸', dashboard: '/dashboard/photography' },
    { slug: 'ads-network', label: 'ANTCPU ADS Network',  icon: '📢', dashboard: '/dashboard/antcpu' },
    { slug: 'pipioneers',  label: 'PiPioneersX',         icon: '🚀', dashboard: null },
  ];

  function visitBrand(slug: string) {
    const updated = [slug, ...lastVisited.filter(s => s !== slug)].slice(0, 3);
    setLastVisited(updated);
    localStorage.setItem('arena_last_visited', JSON.stringify(updated));
    setBrandsOpen(false);
    setOpen(false);
    router.push(`/arena/${slug}`);
  }

  const filteredBrands = ALL_BRANDS.filter(b =>
    b.label.toLowerCase().includes(brandSearch.toLowerCase()) ||
    b.slug.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const recentBrands = lastVisited
    .map(s => ALL_BRANDS.find(b => b.slug === s))
    .filter(Boolean) as typeof ALL_BRANDS;

  function handleLogout() {
    localStorage.removeItem('arena_user');
    clearSessionCookie();
    if (onLogout) onLogout();
    router.push('/');
  }

  const menuItems: { label: string; icon: string; color?: string; action: () => void }[] = [];

  if (role === 'admin') {
    menuItems.push(
      { label: 'Dashboard',    icon: '⚡', action: () => router.push('/dashboard/user') },
      { label: 'The Arena',    icon: '🏟', action: () => router.push('/arena') },
      { label: 'Brands',       icon: '🏷', action: () => { setBrandsOpen(true); setOpen(false); } },
      { label: 'Ad Builder',   icon: '🏗', action: () => router.push('/dashboard/admin') },
      { label: 'Users',        icon: '👥', action: () => router.push('/dashboard/users') },
      { label: 'Leaderboard',  icon: '🏆', action: () => router.push('/dashboard/leaderboard') },
      { label: 'Agents',       icon: '🤖', action: () => router.push('/dashboard/agents') },
      { label: 'Create Ad',    icon: '📢', action: () => router.push('/create-ad') },
      { label: 'Profile',      icon: '👤', action: () => router.push('/profile') },
    );
  }

  if (role === 'team') {
    menuItems.push(
      { label: 'Dashboard',    icon: '⚡', action: () => router.push('/dashboard/user') },
      { label: 'The Arena',    icon: '🏟', action: () => router.push('/arena') },
      { label: 'Create Ad',    icon: '📢', action: () => router.push('/create-ad') },
      { label: 'Leaderboard',  icon: '🏆', action: () => router.push('/dashboard/leaderboard') },
      { label: 'Profile',      icon: '👤', action: () => router.push(`/profile/${encodeURIComponent(userEmail)}`) },
    );
    // Brand-specific dashboards — match user's brand against ALL_BRANDS, push dashboard if one exists
    const userBrandSlug = userBrand?.toLowerCase().trim();
    const matchedBrand = ALL_BRANDS.find(
      b => b.slug === userBrandSlug || b.label.toLowerCase() === userBrandSlug
    );
    if (matchedBrand?.dashboard) {
      menuItems.push({ label: matchedBrand.label, icon: matchedBrand.icon, action: () => router.push(matchedBrand.dashboard!) });
    }
  }

  if (role === 'user') {
    menuItems.push(
      { label: 'Dashboard',    icon: '⚡', action: () => router.push('/dashboard/user') },
      { label: 'The Arena',    icon: '🏟', action: () => router.push('/arena') },
      { label: 'Create Ad',    icon: '📢', action: () => router.push('/create-ad') },
      { label: 'Leaderboard',  icon: '🏆', action: () => router.push('/dashboard/leaderboard') },
      { label: 'Profile',      icon: '👤', action: () => router.push(`/profile/${encodeURIComponent(userEmail)}`) },
    );
  }

  const accentColor = trialStatus === 'team' ? '#7928ca' : '#0070f3';
  // brands panel injected below in JSX

  return (
    <>
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
      {/* ── BRANDS PANEL ── */}
      {brandsOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,0.7)',
          display: 'flex', justifyContent: 'flex-end',
        }} onClick={() => setBrandsOpen(false)}>
          <div style={{
            width: '320px', maxWidth: '90vw',
            background: '#111', borderLeft: '1px solid #1a1a1a',
            height: '100%', overflowY: 'auto',
            padding: '1.5rem 1.25rem',
            display: 'flex', flexDirection: 'column', gap: '1rem',
          }} onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>🏷 Brands</div>
              <button onClick={() => setBrandsOpen(false)}
                style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            {/* Search */}
            <input
              autoFocus
              placeholder="Search brands..."
              value={brandSearch}
              onChange={e => setBrandSearch(e.target.value)}
              style={{
                width: '100%', background: '#0a0a0a', border: '1px solid #222',
                borderRadius: '8px', padding: '0.7rem 1rem', color: '#fff',
                fontSize: '0.9rem', boxSizing: 'border-box' as const, outline: 'none',
              }}
            />

            {/* Last Visited */}
            {recentBrands.length > 0 && brandSearch === '' && (
              <div>
                <div style={{ fontSize: '0.68rem', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Recently Visited</div>
                {recentBrands.map(b => (
                  <div key={b.slug} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: '#1a1a1a', border: '1px solid #222', borderRadius: '10px',
                    padding: '0.75rem 1rem', marginBottom: '0.5rem', cursor: 'pointer',
                  }} onClick={() => visitBrand(b.slug)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>{b.icon}</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fff' }}>{b.label}</div>
                        <div style={{ fontSize: '0.72rem', color: '#555' }}>arena/{b.slug}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      {b.dashboard && (
                        <button onClick={e => { e.stopPropagation(); setBrandsOpen(false); router.push(b.dashboard!); }}
                          style={{ background: '#0070f320', border: '1px solid #0070f340', color: '#0070f3', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>
                          Dash
                        </button>
                      )}
                      <button onClick={e => { e.stopPropagation(); visitBrand(b.slug); }}
                        style={{ background: '#ffffff10', border: '1px solid #333', color: '#aaa', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.7rem', cursor: 'pointer' }}>
                        Arena
                      </button>
                    </div>
                  </div>
                ))}
                <div style={{ height: '1px', background: '#1a1a1a', margin: '0.75rem 0' }} />
              </div>
            )}

            {/* All / Filtered Brands */}
            <div>
              <div style={{ fontSize: '0.68rem', color: '#444', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                {brandSearch ? `Results (${filteredBrands.length})` : 'All Brands'}
              </div>
              {filteredBrands.length === 0 && (
                <div style={{ color: '#444', fontSize: '0.85rem', padding: '1rem 0' }}>No brands found for "{brandSearch}"</div>
              )}
              {filteredBrands.map(b => (
                <div key={b.slug} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px',
                  padding: '0.75rem 1rem', marginBottom: '0.5rem', cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }} onClick={() => visitBrand(b.slug)}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.1rem' }}>{b.icon}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fff' }}>{b.label}</div>
                      <div style={{ fontSize: '0.72rem', color: '#555' }}>arena/{b.slug}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    {b.dashboard && (
                      <button onClick={e => { e.stopPropagation(); setBrandsOpen(false); router.push(b.dashboard!); }}
                        style={{ background: '#0070f320', border: '1px solid #0070f340', color: '#0070f3', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>
                        Dash
                      </button>
                    )}
                    <button onClick={e => { e.stopPropagation(); visitBrand(b.slug); }}
                      style={{ background: '#ffffff10', border: '1px solid #333', color: '#aaa', borderRadius: '6px', padding: '0.25rem 0.6rem', fontSize: '0.7rem', cursor: 'pointer' }}>
                      Arena
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 'auto', fontSize: '0.72rem', color: '#333', textAlign: 'center' as const }}>
              {ALL_BRANDS.length} brands in the Arena
            </div>
          </div>
        </div>
      )}
    </>
  );
}
