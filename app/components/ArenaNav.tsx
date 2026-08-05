'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearSessionCookie } from '../lib/session';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Role = 'super' | 'admin' | 'team' | 'user' | 'mod';

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  created_at: string;
};

type Brand = {
  slug: string;
  label: string;
  icon: string;
  dashboard: string | null;
};

type MenuItem = {
  label: string;
  icon: string;
  color?: string;
  action: () => void;
};

type ArenaNavProps = {
  role: Role;
  userName?: string;
  userEmail?: string;
  userBrand?: string;
  trialStatus?: 'team' | 'trial' | 'pending';
  onLogout?: () => void;
  onDrawerOpen?: () => void;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_BRANDS: Brand[] = [
  { slug: 'antcpu',      label: 'ANTCPU',            icon: '⚡', dashboard: '/dashboard/antcpu' },
  { slug: 'mapofpi',     label: 'Map of Pi',          icon: '🗺️', dashboard: '/dashboard/mapofpi' },
  { slug: 'photography', label: 'Amanda Photography', icon: '📸', dashboard: '/dashboard/photography' },
  { slug: 'ads-network', label: 'ANTCPU ADS Network', icon: '📢', dashboard: '/dashboard/antcpu' },
  { slug: 'pipioneers',  label: 'PiPioneersX',        icon: '🚀', dashboard: null },
];

// Notification type → accent color
const NOTIF_COLOR: Record<string, string> = {
  aria:     '#f0883e',
  approved: '#22c55e',
  rejected: '#ef4444',
  points:   '#D4AF37',
  rank:     '#7928ca',
  nudge:    '#0070f3',
  info:     '#555',
};

// ─── Component ────────────────────────────────────────────────────────────────

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

  // ── Nav state ──
  const [open, setOpen]             = useState(false);
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [notifOpen, setNotifOpen]   = useState(false);
  const [brandSearch, setBrandSearch] = useState('');
  const [lastVisited, setLastVisited] = useState<string[]>([]);
  const [isPrevAdmin, setIsPrevAdmin] = useState(false);

  // ── Notification state ──
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unread, setUnread]               = useState(0);
  const [markingRead, setMarkingRead]     = useState(false);

  // ── Boot ──
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

  // ── Helpers ──
  function visitBrand(slug: string) {
    const updated = [slug, ...lastVisited.filter(s => s !== slug)].slice(0, 3);
    setLastVisited(updated);
    localStorage.setItem('arena_last_visited', JSON.stringify(updated));
    setBrandsOpen(false);
    setOpen(false);
    router.push(`/arena/${slug}`);
  }

  function handleLogout() {
    localStorage.removeItem('arena_user');
    clearSessionCookie();
    if (onLogout) onLogout();
    router.push('/');
  }

  async function markAllRead() {
    if (!userEmail || markingRead || notifications.length === 0) return;
    setMarkingRead(true);
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('email', userEmail.trim().toLowerCase())
      .eq('read', false);
    setNotifications([]);
    setUnread(0);
    setMarkingRead(false);
  }

  // ── Derived ──
  const filteredBrands = ALL_BRANDS.filter(b =>
    b.label.toLowerCase().includes(brandSearch.toLowerCase()) ||
    b.slug.toLowerCase().includes(brandSearch.toLowerCase())
  );

  const recentBrands = lastVisited
    .map(s => ALL_BRANDS.find(b => b.slug === s))
    .filter(Boolean) as Brand[];

  const accentColor = trialStatus === 'team' ? '#7928ca' : '#0070f3';

  // ── Menu items by role ──
  const menuItems: MenuItem[] = [];

  if (role === 'super') {
    menuItems.push(
      { label: 'Dashboard',    icon: '⚡', action: () => router.push('/dashboard/antcpu') },
      { label: 'The Arena',    icon: '🏟', action: () => router.push('/arena') },
      { label: 'Brands',       icon: '🏷', action: () => { setBrandsOpen(true); setOpen(false); } },
      { label: 'Review Queue', icon: '🦋', action: () => router.push('/dashboard/antcpu') },
      { label: 'Users',        icon: '👥', action: () => router.push('/dashboard/users') },
      { label: 'Create Ad',    icon: '📢', action: () => router.push('/create-ad') },
      { label: 'Profile',      icon: '👤', action: () => router.push(`/profile/${encodeURIComponent(userEmail)}`) },
    );
  }

  if (role === 'admin') {
    menuItems.push(
      { label: 'Dashboard',   icon: '⚡', action: () => router.push('/dashboard/user') },
      { label: 'The Arena',   icon: '🏟', action: () => router.push('/arena') },
      { label: 'Brands',      icon: '🏷', action: () => { setBrandsOpen(true); setOpen(false); } },
      { label: 'Ad Builder',  icon: '🏗', action: () => router.push('/dashboard/admin') },
      { label: 'Users',       icon: '👥', action: () => router.push('/dashboard/users') },
      { label: 'Leaderboard', icon: '🏆', action: () => router.push('/dashboard/leaderboard') },
      { label: 'Agents',      icon: '🤖', action: () => router.push('/dashboard/agents') },
      { label: 'Create Ad',   icon: '📢', action: () => router.push('/create-ad') },
      { label: 'Profile',     icon: '👤', action: () => router.push('/profile') },
    );
  }

  if (role === 'team') {
    menuItems.push(
      { label: 'Dashboard',   icon: '⚡', action: () => router.push('/dashboard/user') },
      { label: 'The Arena',   icon: '🏟', action: () => router.push('/arena') },
      { label: 'Create Ad',   icon: '📢', action: () => router.push('/create-ad') },
      { label: 'Leaderboard', icon: '🏆', action: () => router.push('/dashboard/leaderboard') },
      { label: 'Profile',     icon: '👤', action: () => router.push(`/profile/${encodeURIComponent(userEmail)}`) },
    );
    const slug = userBrand?.toLowerCase().trim();
    const matched = ALL_BRANDS.find(b => b.slug === slug || b.label.toLowerCase() === slug);
    if (matched?.dashboard) {
      menuItems.push({ label: matched.label, icon: matched.icon, action: () => router.push(matched.dashboard!) });
    }
  }

  if (role === 'user') {
    menuItems.push(
      { label: 'Dashboard',   icon: '⚡', action: () => router.push('/dashboard/user') },
      { label: 'The Arena',   icon: '🏟', action: () => router.push('/arena') },
      { label: 'Create Ad',   icon: '📢', action: () => router.push('/create-ad') },
      { label: 'Leaderboard', icon: '🏆', action: () => router.push('/dashboard/leaderboard') },
      { label: 'Profile',     icon: '👤', action: () => router.push(`/profile/${encodeURIComponent(userEmail)}`) },
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>

      {/* ── NOTIFICATION DRAWER ── */}
      {notifOpen && (
        <div
          onClick={() => setNotifOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
            zIndex: 1100, backdropFilter: 'blur(4px)' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ position: 'fixed', top: 0, right: 0, width: '320px',
              height: '100vh', background: '#111', borderLeft: '1px solid #222',
              zIndex: 1101, overflowY: 'auto', padding: '1.5rem 1rem',
              display: 'flex', flexDirection: 'column', gap: '0' }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>
                ✉️ Messages {unread > 0 && (
                  <span style={{ fontSize: '0.7rem', color: '#f0883e',
                    marginLeft: '0.4rem' }}>{unread} unread</span>
                )}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {unread > 0 && (
                  <button onClick={markAllRead} style={{ background: 'none',
                    border: '1px solid #333', color: '#555', cursor: 'pointer',
                    fontSize: '0.68rem', borderRadius: '6px', padding: '0.2rem 0.5rem' }}>
                    {markingRead ? '...' : 'Mark all read'}
                  </button>
                )}
                <button onClick={() => setNotifOpen(false)} style={{ background: 'none',
                  border: 'none', color: '#555', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
              </div>
            </div>

            {/* Messages */}
            {notifications.length === 0 ? (
              <div style={{ color: '#444', fontSize: '0.82rem',
                textAlign: 'center', marginTop: '3rem', lineHeight: 1.6 }}>
                ✉️<br />No messages yet.<br />
                <span style={{ fontSize: '0.72rem', color: '#333' }}>
                  We'll notify you when your ad moves.
                </span>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} style={{ background: '#0a0a0a',
                  border: `1px solid #222`,
                  borderLeft: `3px solid ${NOTIF_COLOR[n.type] || '#555'}`,
                  borderRadius: '10px', padding: '0.85rem',
                  marginBottom: '0.65rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem',
                    color: '#fff', marginBottom: '0.3rem' }}>{n.title}</div>
                  {n.message && (
                    <div style={{ fontSize: '0.75rem', color: '#888', lineHeight: 1.5 }}>
                      {n.message}
                    </div>
                  )}
                  <div style={{ fontSize: '0.65rem', color: '#333', marginTop: '0.5rem' }}>
                    {new Date(n.created_at).toLocaleDateString('en-US', {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── BRANDS PANEL ── */}
      {brandsOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200,
            background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'flex-end' }}
          onClick={() => setBrandsOpen(false)}
        >
          <div
            style={{ width: '320px', maxWidth: '90vw', background: '#111',
              borderLeft: '1px solid #1a1a1a', height: '100%', overflowY: 'auto',
              padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>🏷 Brands</div>
              <button onClick={() => setBrandsOpen(false)}
                style={{ background: 'none', border: 'none', color: '#555',
                  cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            {/* Search */}
            <input
              autoFocus
              placeholder="Search brands..."
              value={brandSearch}
              onChange={e => setBrandSearch(e.target.value)}
              style={{ width: '100%', background: '#0a0a0a', border: '1px solid #222',
                borderRadius: '8px', padding: '0.7rem 1rem', color: '#fff',
                fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none' }}
            />

            {/* Recently visited */}
            {recentBrands.length > 0 && brandSearch === '' && (
              <div>
                <div style={{ fontSize: '0.68rem', color: '#444', letterSpacing: '0.1em',
                  textTransform: 'uppercase', marginBottom: '0.5rem' }}>Recently Visited</div>
                {recentBrands.map(b => (
                  <BrandRow key={b.slug} b={b} onVisit={visitBrand}
                    onDash={() => { setBrandsOpen(false); router.push(b.dashboard!); }} />
                ))}
                <div style={{ height: '1px', background: '#1a1a1a', margin: '0.75rem 0' }} />
              </div>
            )}

            {/* All brands */}
            <div>
              <div style={{ fontSize: '0.68rem', color: '#444', letterSpacing: '0.1em',
                textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                {brandSearch ? `Results (${filteredBrands.length})` : 'All Brands'}
              </div>
              {filteredBrands.length === 0 && (
                <div style={{ color: '#444', fontSize: '0.85rem', padding: '1rem 0' }}>
                  No brands found for "{brandSearch}"
                </div>
              )}
              {filteredBrands.map(b => (
                <BrandRow key={b.slug} b={b} onVisit={visitBrand}
                  onDash={() => { setBrandsOpen(false); router.push(b.dashboard!); }} />
              ))}
            </div>

            {/* Footer */}
            <div style={{ marginTop: 'auto', fontSize: '0.72rem',
              color: '#333', textAlign: 'center' }}>
              {ALL_BRANDS.length} brands in the Arena
            </div>
          </div>
        </div>
      )}
          {/* ── NAV BAR ── */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '1.2rem 2rem', borderBottom: '1px solid #1a1a1a',
        background: '#0a0a0a', position: 'sticky', top: 0, zIndex: 50 }}>

        {/* LEFT — logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {onDrawerOpen && (
            <button onClick={onDrawerOpen} style={{ background: 'none', border: 'none',
              cursor: 'pointer', color: '#555', fontSize: '1.1rem', padding: '0.25rem' }}
              aria-label="Open drawer">☰</button>
          )}
          <span
            onClick={() => role === 'super' || role === 'admin'
              ? router.push('/dashboard/antcpu')
              : router.push('/dashboard/user')}
            style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f0883e',
              letterSpacing: '0.05em', cursor: 'pointer' }}
          >
            ⚡ ANTCPU ADS
          </span>
          {role === 'super' && (
            <span style={{ fontSize: '0.6rem', background: '#f0883e15',
              border: '1px solid #f0883e30', color: '#f0883e',
              borderRadius: '999px', padding: '0.15rem 0.5rem',
              letterSpacing: '0.1em' }}>SUPER</span>
          )}
          {role === 'admin' && (
            <span style={{ fontSize: '0.6rem', background: '#f0883e15',
              border: '1px solid #f0883e30', color: '#f0883e',
              borderRadius: '999px', padding: '0.15rem 0.5rem',
              letterSpacing: '0.1em' }}>ADMIN</span>
          )}
          {role === 'team' && (
            <span style={{ fontSize: '0.6rem', background: '#7928ca15',
              border: '1px solid #7928ca30', color: '#b388ff',
              borderRadius: '999px', padding: '0.15rem 0.5rem',
              letterSpacing: '0.1em' }}>TEAM</span>
          )}
        </div>

        {/* RIGHT — envelope + hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>

          {/* Trial badge */}
          {(role === 'user' || role === 'team') && (
            <span style={{ fontSize: '0.7rem', background: `${accentColor}15`,
              border: `1px solid ${accentColor}40`, color: accentColor,
              borderRadius: '999px', padding: '0.25rem 0.85rem' }}>
              {trialStatus === 'team' ? '🔵 Team' : '🟢 Trial'}
            </span>
          )}

          {/* ── ENVELOPE ── */}
          {userEmail && (
            <button
              onClick={() => setNotifOpen(true)}
              title={unread > 0 ? `${unread} unread` : 'Messages'}
              style={{ position: 'relative', background: 'none', border: 'none',
                cursor: 'pointer', fontSize: '1.05rem', padding: '0.4rem',
                color: unread > 0 ? '#fff' : '#444', lineHeight: 1 }}
            >
              ✉️
              {unread > 0 && (
                <span style={{ position: 'absolute', top: '3px', right: '3px',
                  width: '7px', height: '7px', borderRadius: '50%',
                  background: '#f0883e', display: 'block',
                  boxShadow: '0 0 4px #f0883e80' }} />
              )}
            </button>
          )}

          {/* ── HAMBURGER ── */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', flexDirection: 'column', gap: '5px', padding: '4px' }}
              aria-label="Menu"
            >
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: '22px', height: '2px',
                  background: open ? '#f0883e' : '#fff', borderRadius: '2px',
                  transition: 'background 0.2s' }} />
              ))}
            </button>

            {open && (
              <div style={{ position: 'absolute', top: 'calc(100% + 0.5rem)', right: 0,
                background: '#111', border: '1px solid #1a1a1a', borderRadius: '14px',
                padding: '0.5rem', minWidth: '210px', zIndex: 100,
                boxShadow: '0 8px 32px #00000080' }}>

                {/* User info */}
                <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid #1a1a1a',
                  marginBottom: '0.3rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#fff' }}>
                    {userName || userBrand}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '0.1rem' }}>
                    {userEmail}
                  </div>
                </div>

                {/* Menu items */}
                {menuItems.map(item => (
                  <button key={item.label}
                    onClick={() => { setOpen(false); item.action(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem',
                      width: '100%', padding: '0.7rem 1rem', color: item.color || '#fff',
                      background: 'none', border: 'none', borderRadius: '8px',
                      cursor: 'pointer', fontSize: '0.88rem', textAlign: 'left' }}>
                    <span style={{ fontSize: '1rem', minWidth: '1.2rem' }}>{item.icon}</span>
                    {item.label}
                  </button>
                ))}

                <div style={{ borderTop: '1px solid #1a1a1a', margin: '0.3rem 0' }} />

                {/* Back to admin */}
                {isPrevAdmin && (
                  <button
                    onClick={() => { setOpen(false); localStorage.removeItem('arena_prev_admin'); router.push('/dashboard/antcpu'); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.6rem',
                      width: '100%', padding: '0.7rem 1rem', color: '#00ffcc',
                      background: '#00ffcc08', border: 'none', borderRadius: '8px',
                      cursor: 'pointer', fontSize: '0.88rem', textAlign: 'left',
                      marginBottom: '0.2rem' }}>
                    <span>←</span> Back to Admin
                  </button>
                )}

                {/* Logout */}
                <button
                  onClick={() => { setOpen(false); handleLogout(); }}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.6rem',
                    width: '100%', padding: '0.7rem 1rem', color: '#ef4444',
                    background: 'none', border: 'none', borderRadius: '8px',
                    cursor: 'pointer', fontSize: '0.88rem', textAlign: 'left' }}>
                  <span>←</span> Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

     
    </>
  );
}

// ─── BrandRow sub-component ───────────────────────────────────────────────────
// Extracted to keep the brands panel DRY — used for both recent + all brands

function BrandRow({ b, onVisit, onDash }: {
  b: Brand;
  onVisit: (slug: string) => void;
  onDash: () => void;
}) {
  return (
    <div
      onClick={() => onVisit(b.slug)}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px',
        padding: '0.75rem 1rem', marginBottom: '0.5rem', cursor: 'pointer',
        transition: 'border-color 0.15s' }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#333')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#1a1a1a')}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{ fontSize: '1.1rem' }}>{b.icon}</span>
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: '#fff' }}>{b.label}</div>
          <div style={{ fontSize: '0.72rem', color: '#555' }}>arena/{b.slug}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        {b.dashboard && (
          <button
            onClick={e => { e.stopPropagation(); onDash(); }}
            style={{ background: '#0070f320', border: '1px solid #0070f340',
              color: '#0070f3', borderRadius: '6px', padding: '0.25rem 0.6rem',
              fontSize: '0.7rem', cursor: 'pointer', fontWeight: 600 }}>
            Dash
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); onVisit(b.slug); }}
          style={{ background: '#ffffff10', border: '1px solid #333',
            color: '#aaa', borderRadius: '6px', padding: '0.25rem 0.6rem',
            fontSize: '0.7rem', cursor: 'pointer' }}>
          Arena
        </button>
      </div>
    </div>
  );
}
