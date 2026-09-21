'use client';
// app/modules/page.tsx
// ─── Module Lab — /modules ────────────────────────────────────────────────────
// Super admin only (layout.tsx guards the route).
// Shows every module in MODULE_REGISTRY with live preview toggle.
//
// Layout:
//   — Header with registry count + tier filter tabs
//   — Grid of module cards — id, tier, label, desc
//   — Each card has a "Preview" toggle — expands live module below
//   — Live preview uses real supabase + real user from localStorage
//
// Useful for:
//   — QA — spot broken modules instantly
//   — Demo — show any module to a brand
//   — Discovery — see what's available before wiring to an arena
//
// v1 (Sep 2026)
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect }    from 'react';
import { useRouter }              from 'next/navigation';
import { createClient }           from '@supabase/supabase-js';
import ArenaNav                   from '../components/ArenaNav';
import ArenaFooter                from '../components/ArenaFooter';
import { MODULE_REGISTRY }        from './index';
import { clearSessionCookie }     from '../lib/session';
import type { SubscriptionTier }  from './types';

// ─── Supabase ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Design tokens ────────────────────────────────────────────────────────────
const G = {
  bg:      '#0a0a0a',
  card:    '#111',
  card2:   '#0d0d0d',
  border:  '#1a1a1a',
  border2: '#222',
  orange:  '#f0883e',
  gold:    '#D4AF37',
  green:   '#22c55e',
  blue:    '#0070f3',
  purple:  '#7928ca',
  pink:    '#ff0080',
  muted:   '#555',
  dim:     '#333',
  text:    '#e0e0e0',
};

// ─── Tier colors ──────────────────────────────────────────────────────────────
const TIER_COLOR: Record<SubscriptionTier, string> = {
  trial:    G.green,
  basic:    G.blue,
  standard: G.purple,
  premium:  G.gold,
};

const TIER_ORDER: SubscriptionTier[] = ['trial', 'basic', 'standard', 'premium'];

// ─── Component ────────────────────────────────────────────────────────────────
export default function ModulesPage() {
  const router = useRouter();

  const [user,       setUser]       = useState<any>(null);
  const [hydrated,   setHydrated]   = useState(false);
  const [expanded,   setExpanded]   = useState<Record<string, boolean>>({});
  const [tierFilter, setTierFilter] = useState<SubscriptionTier | 'all'>('all');
  const [search,     setSearch]     = useState('');

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      setUser(u);
      setHydrated(true);
    } catch { router.push('/'); }
  }, [router]);

  if (!hydrated || !user) return null;

  // ── Module context — real data ────────────────────────────────────────────
  const moduleCtx = {
    slug:         'modules-lab',
    user:         { email: user.email, name: user.name, brand: user.brand, trialStatus: 'team' },
    ads:          [],
    supabase,
    isSuper:      true,
    subscription: 'premium' as SubscriptionTier,
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = MODULE_REGISTRY.filter(m => {
    const matchTier   = tierFilter === 'all' || m.tier === tierFilter;
    const matchSearch = search === '' ||
      m.id.includes(search.toLowerCase()) ||
      m.label.toLowerCase().includes(search.toLowerCase()) ||
      m.desc.toLowerCase().includes(search.toLowerCase());
    return matchTier && matchSearch;
  });

  function toggleExpand(id: string) {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function expandAll()   { const m: Record<string, boolean> = {}; filtered.forEach(mod => m[mod.id] = true);  setExpanded(m); }
  function collapseAll() { setExpanded({}); }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: G.bg, color: G.text, fontFamily: 'system-ui, sans-serif' }}>
      <ArenaNav
        role="super"
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus="team"
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '2rem 1rem 4rem' }}>

              {/* ── Header ── */}
        <div style={{
          background:   G.card,
          border:       `1px solid ${G.orange}30`,
          borderRadius: '14px',
          padding:      '1.5rem',
          marginBottom: '1.5rem',
          position:     'relative',
          overflow:     'hidden',
        }}>
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: `linear-gradient(90deg, ${G.orange}, ${G.gold}, transparent)` }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.3rem', color: G.orange, marginBottom: '0.2rem' }}>
                🧩 Module Lab
              </div>
              <div style={{ fontSize: '0.75rem', color: G.muted }}>
                {MODULE_REGISTRY.length} modules registered · preview any module live
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button onClick={expandAll}
                style={{ background: 'transparent', border: `1px solid ${G.border2}`, borderRadius: '6px', color: G.muted, fontSize: '0.68rem', padding: '0.3rem 0.65rem', cursor: 'pointer' }}>
                Expand All
              </button>
              <button onClick={collapseAll}
                style={{ background: 'transparent', border: `1px solid ${G.border2}`, borderRadius: '6px', color: G.muted, fontSize: '0.68rem', padding: '0.3rem 0.65rem', cursor: 'pointer' }}>
                Collapse All
              </button>
              <button onClick={() => router.push('/dashboard/antcpu')}
                style={{ background: 'transparent', border: `1px solid ${G.border2}`, borderRadius: '6px', color: G.muted, fontSize: '0.68rem', padding: '0.3rem 0.65rem', cursor: 'pointer' }}>
                ← Command Centre
              </button>
            </div>
          </div>  {/* ← closes the flex row — this was the missing close */}

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            {TIER_ORDER.map(tier => {
              const count = MODULE_REGISTRY.filter(m => m.tier === tier).length;
              return (
                <div key={tier} style={{
                  background:   G.card2,
                  border:       `1px solid ${TIER_COLOR[tier]}30`,
                  borderRadius: '8px',
                  padding:      '0.5rem 0.85rem',
                  textAlign:    'center',
                  flex:         1,
                  minWidth:     '60px',
                }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: TIER_COLOR[tier] }}>{count}</div>
                  <div style={{ fontSize: '0.6rem', color: G.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{tier}</div>
                </div>
              );
            })}
          </div>
        </div> 

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '0.65rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
            {TIER_ORDER.map(tier => {
              const count = MODULE_REGISTRY.filter(m => m.tier === tier).length;
              return (
                <div key={tier} style={{
                  background:   G.card2,
                  border:       `1px solid ${TIER_COLOR[tier]}30`,
                  borderRadius: '8px',
                  padding:      '0.5rem 0.85rem',
                  textAlign:    'center',
                  flex:         1,
                  minWidth:     '60px',
                }}>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: TIER_COLOR[tier] }}>{count}</div>
                  <div style={{ fontSize: '0.6rem', color: G.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{tier}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Search + filter ── */}
        <div style={{ display: 'flex', gap: '0.65rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Search modules..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              flex:         1,
              minWidth:     '180px',
              background:   G.card,
              border:       `1px solid ${G.border2}`,
              borderRadius: '8px',
              color:        G.text,
              fontSize:     '0.82rem',
              padding:      '0.55rem 0.85rem',
              outline:      'none',
            }}
          />
          {/* Tier filter tabs */}
          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
            {(['all', ...TIER_ORDER] as const).map(tier => {
              const active = tierFilter === tier;
              const color  = tier === 'all' ? G.orange : TIER_COLOR[tier];
              return (
                <button
                  key={tier}
                  onClick={() => setTierFilter(tier)}
                  style={{
                    background:   active ? `${color}20` : 'transparent',
                    border:       `1px solid ${active ? color : G.border2}`,
                    borderRadius: '6px',
                    color:        active ? color : G.muted,
                    fontSize:     '0.68rem',
                    fontWeight:   active ? 700 : 400,
                    padding:      '0.3rem 0.65rem',
                    cursor:       'pointer',
                    transition:   'all 0.15s',
                    textTransform: 'capitalize',
                  }}
                >
                  {tier}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Results count ── */}
        <div style={{ fontSize: '0.68rem', color: G.dim, marginBottom: '0.85rem' }}>
          {filtered.length} module{filtered.length !== 1 ? 's' : ''}
          {search && ` matching "${search}"`}
          {tierFilter !== 'all' && ` · ${tierFilter} tier`}
        </div>

        {/* ── Module cards ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filtered.map(mod => {
            const isOpen     = !!expanded[mod.id];
            const tierColor  = TIER_COLOR[mod.tier];
            const ModComp    = mod.component;

            return (
              <div key={mod.id} style={{
                background:   G.card,
                border:       `1px solid ${isOpen ? tierColor + '40' : G.border}`,
                borderLeft:   `3px solid ${isOpen ? tierColor : G.border}`,
                borderRadius: '12px',
                overflow:     'hidden',
                transition:   'border-color 0.15s',
              }}>

                {/* Card header */}
                <div style={{
                  display:    'flex',
                  alignItems: 'center',
                  gap:        '0.75rem',
                  padding:    '0.85rem 1rem',
                  cursor:     'pointer',
                }}
                  onClick={() => toggleExpand(mod.id)}
                >
                  {/* Tier badge */}
                  <span style={{
                    fontSize:     '0.6rem',
                    fontWeight:   700,
                    color:        tierColor,
                    background:   `${tierColor}15`,
                    border:       `1px solid ${tierColor}30`,
                    borderRadius: '999px',
                    padding:      '0.15rem 0.5rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    flexShrink:   0,
                  }}>
                    {mod.tier}
                  </span>

                  {/* Label + desc */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isOpen ? tierColor : G.text }}>
                      {mod.label}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: G.muted, marginTop: '0.1rem' }}>
                      {mod.desc}
                    </div>
                  </div>

                  {/* ID chip */}
                  <code style={{
                    fontSize:     '0.62rem',
                    color:        G.dim,
                    background:   G.card2,
                    border:       `1px solid ${G.border}`,
                    borderRadius: '4px',
                    padding:      '0.15rem 0.4rem',
                    flexShrink:   0,
                  }}>
                    {mod.id}
                  </code>

                  {/* Toggle arrow */}
                  <span style={{
                    fontSize:   '0.75rem',
                    color:      G.muted,
                    flexShrink: 0,
                    transition: 'transform 0.2s',
                    transform:  isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                    display:    'inline-block',
                  }}>
                    ▼
                  </span>
                </div>

                {/* Live preview — only rendered when expanded */}
                {isOpen && (
                  <div style={{
                    borderTop:  `1px solid ${G.border}`,
                    padding:    '1.25rem 1rem',
                    background: G.card2,
                  }}>
                    {/* Preview label */}
                    <div style={{
                      fontSize:      '0.6rem',
                      color:         tierColor,
                      fontWeight:    700,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      marginBottom:  '1rem',
                      display:       'flex',
                      alignItems:    'center',
                      gap:           '0.4rem',
                    }}>
                      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: tierColor, display: 'inline-block' }} />
                      Live Preview · {mod.id}
                    </div>

                    {/* Module rendered live */}
                    <ModComp {...moduleCtx} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* ── Footer nav ── */}
        <div style={{
          marginTop:      '2.5rem',
          display:        'flex',
          gap:            '0.5rem',
          justifyContent: 'center',
          flexWrap:       'wrap',
        }}>
          {[
            { label: '⚡ Command Centre', path: '/dashboard/antcpu' },
            { label: '🏟️ Arena',          path: '/arena'            },
            { label: '👥 Users',           path: '/dashboard/users'  },
          ].map(({ label, path }) => (
            <button key={path} onClick={() => router.push(path)}
              style={{
                background:   'transparent',
                border:       `1px solid ${G.border2}`,
                borderRadius: '8px',
                color:        G.muted,
                fontSize:     '0.75rem',
                padding:      '0.5rem 1rem',
                cursor:       'pointer',
              }}>
              {label}
            </button>
          ))}
        </div>  {/* ← footer nav */}

      </div>  {/* ← maxWidth container */}

      <ArenaFooter />
    </div>  {/* ← page root */}
  );
}
