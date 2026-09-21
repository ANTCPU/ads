'use client';

// app/modules/slide-panel/index.tsx
// ─── SlidePanel — universal expandable list module ────────────────────────────
//
// Purpose:
//   Handles any list that overflows a visible threshold.
//   Top N items shown. Remainder slides in from below (bottom sheet)
//   on mobile, or fades in inline on desktop.
//   Mobile-first. Touch-friendly. ESC to close.
//
// Usage contexts (current):
//   - Country grid overflow on Fall Arena page (topCountries / allCountries)
//   - Archive list overflow
//   - Future: leaderboard full list, any ranked list > threshold
//
// Props via ModuleContext:
//   slug     — used to scope any future DB-driven config
//   isSuper  — shows item count badge in header when true
//
// Data:
//   Fetches /api/stats → allCountries[]
//   Does NOT use ads[] from context — country data lives in stats
//
// Render modes:
//   default  — top 10 visible, "+ N more" trigger below
//   open     — full list slides up from bottom (mobile bottom sheet)
//              fades in inline on wider screens
//
// v1 (Sep 2026) — initial build
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react';
import { ModuleContext } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type CountryRow = {
  country: string;
  count:   number;
  flag:    string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const VISIBLE_COUNT = 10; // rows shown before "show more" trigger

// ─── Design tokens — matches arena palette ────────────────────────────────────
const C = {
  bg:      '#0a0a0a',
  card:    '#111',
  border:  '#1a1a1a',
  border2: '#222',
  gold:    '#D4AF37',
  amber:   '#f59e0b',
  burnt:   '#c2410c',
  muted:   '#555',
  muted2:  '#333',
  white:   '#fff',
  overlay: 'rgba(0,0,0,0.72)',
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SlidePanelModule({ slug, isSuper }: ModuleContext) {
  const [all,     setAll]     = useState<CountryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open,    setOpen]    = useState(false);
  const [mobile,  setMobile]  = useState(false);

  // ── Detect mobile ─────────────────────────────────────────────────────────
  useEffect(() => {
    function check() { setMobile(window.innerWidth < 640); }
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── ESC to close ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // ── Lock body scroll when panel open on mobile ────────────────────────────
  useEffect(() => {
    if (mobile) {
      document.body.style.overflow = open ? 'hidden' : '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open, mobile]);

  // ── Fetch country data from /api/stats ────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const res  = await fetch('/api/stats', { cache: 'no-store' });
      const data = await res.json();
      setAll(data.allCountries || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [slug, load]);

  const visible  = all.slice(0, VISIBLE_COUNT);
  const overflow = all.slice(VISIBLE_COUNT);
  const max      = all[0]?.count || 1;

  // ─── Row renderer ─────────────────────────────────────────────────────────

  function Row({ row, i, showBar = true }: { row: CountryRow; i: number; showBar?: boolean }) {
    const isMedal = i < 3;
    const medal   = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null;
    const barColor = i === 0 ? C.gold : i < 3 ? C.amber : C.burnt;

    return (
      <div style={{
        display:    'flex',
        alignItems: 'center',
        gap:        '0.6rem',
        padding:    '0.45rem 0.6rem',
        background: isMedal ? `${C.gold}08` : 'transparent',
        borderRadius: '8px',
        transition: 'background 0.15s',
      }}>
        {/* Rank */}
        <div style={{
          width:     '28px',
          textAlign: 'center',
          fontSize:  isMedal ? '1rem' : '0.7rem',
          color:     isMedal ? undefined : C.muted,
          fontWeight: 700,
          flexShrink: 0,
        }}>
          {medal || `${i + 1}`}
        </div>

        {/* Flag */}
        <span style={{ fontSize: '1.25rem', flexShrink: 0, lineHeight: 1 }}>
          {row.flag}
        </span>

        {/* Country + bar */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display:        'flex',
            justifyContent: 'space-between',
            alignItems:     'center',
            marginBottom:   showBar ? '3px' : 0,
          }}>
            <span style={{
              fontSize:   '0.78rem',
              fontWeight: isMedal ? 700 : 400,
              color:      isMedal ? C.white : '#aaa',
              whiteSpace:   'nowrap',
              overflow:     'hidden',
              textOverflow: 'ellipsis',
            }}>
              {row.country}
            </span>
            <span style={{
              fontSize:   '0.68rem',
              color:      isMedal ? C.amber : C.muted,
              fontWeight: 700,
              marginLeft: '0.5rem',
              flexShrink: 0,
            }}>
              {row.count}
            </span>
          </div>
          {showBar && (
            <div style={{ height: '3px', background: C.border, borderRadius: '2px' }}>
              <div style={{
                height:     '100%',
                width:      `${(row.count / max) * 100}%`,
                background: barColor,
                borderRadius: '2px',
                transition: 'width 0.4s ease',
              }} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── Slide panel — bottom sheet on mobile, inline fade on desktop ──────────

  function Panel() {
    if (!open) return null;

    // ── Mobile — bottom sheet ──────────────────────────────────────────────
    if (mobile) {
      return (
        <>
          {/* Overlay */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position:   'fixed',
              inset:      0,
              background: C.overlay,
              zIndex:     400,
              animation:  'fadeIn 0.2s ease',
            }}
          />
          {/* Sheet */}
          <div style={{
            position:     'fixed',
            bottom:       0,
            left:         0,
            right:        0,
            background:   C.card,
            borderTop:    `1px solid ${C.border2}`,
            borderRadius: '16px 16px 0 0',
            zIndex:       401,
            maxHeight:    '75vh',
            overflowY:    'auto',
            padding:      '0 1rem 2rem',
            animation:    'slideUp 0.25s ease',
          }}>
            {/* Handle */}
            <div style={{
              width:        '36px',
              height:       '4px',
              background:   C.border2,
              borderRadius: '2px',
              margin:       '0.75rem auto 1rem',
            }} />
            <PanelContent />
          </div>
        </>
      );
    }

    // ── Desktop — inline fade below the grid ──────────────────────────────
    return (
      <div style={{
        marginTop:    '0.75rem',
        background:   C.card,
        border:       `1px solid ${C.border2}`,
        borderRadius: '12px',
        padding:      '1rem',
        animation:    'fadeIn 0.2s ease',
      }}>
        <PanelContent />
      </div>
    );
  }

  function PanelContent() {
    return (
      <>
        {/* Panel header */}
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          marginBottom:   '0.85rem',
        }}>
          <div style={{
            fontSize:      '0.68rem',
            color:         C.amber,
            fontWeight:    700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            🌍 All Countries · {all.length} total
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              background:   'none',
              border:       `1px solid ${C.border2}`,
              borderRadius: '6px',
              color:        C.muted,
              fontSize:     '0.72rem',
              padding:      '0.2rem 0.6rem',
              cursor:       'pointer',
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* All rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {all.map((row, i) => (
            <Row key={row.country} row={row} i={i} showBar={false} />
          ))}
        </div>
      </>
    );
  }

  // ─── Main render ──────────────────────────────────────────────────────────

  return (
    <>
      {/* CSS animations — inline keyframes via style tag */}
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
      `}</style>

      <div style={{ width: '100%' }}>

        {/* Section header */}
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
          marginBottom:   '0.85rem',
        }}>
          <div style={{
            fontSize:      '0.68rem',
            color:         C.muted,
            fontWeight:    700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}>
            🌍 Top Countries
          </div>
          {isSuper && all.length > 0 && (
            <span style={{
              fontSize:     '0.62rem',
              color:        C.muted,
              background:   C.border,
              borderRadius: '999px',
              padding:      '0.1rem 0.45rem',
            }}>
              {all.length} total
            </span>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div style={{ color: C.muted, fontSize: '0.82rem' }}>Loading...</div>
        )}

        {/* Empty */}
        {!loading && all.length === 0 && (
          <div style={{ color: C.muted, fontSize: '0.82rem' }}>
            No country data yet.
          </div>
        )}

        {/* Top 10 visible rows */}
        {!loading && visible.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            {visible.map((row, i) => (
              <Row key={row.country} row={row} i={i} />
            ))}
          </div>
        )}

        {/* Show more trigger */}
        {!loading && overflow.length > 0 && (
          <button
            onClick={() => setOpen(true)}
            style={{
              marginTop:    '0.75rem',
              width:        '100%',
              background:   'transparent',
              border:       `1px solid ${C.border2}`,
              borderRadius: '8px',
              color:        C.amber,
              fontSize:     '0.75rem',
              fontWeight:   700,
              padding:      '0.55rem 0',
              cursor:       'pointer',
              transition:   'border-color 0.15s, color 0.15s',
              letterSpacing: '0.02em',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = C.amber;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = C.border2;
            }}
          >
            🌍 + {overflow.length} more countries →
          </button>
        )}

      </div>

      {/* Panel — rendered outside flow to avoid layout shift */}
      <Panel />
    </>
  );
}
