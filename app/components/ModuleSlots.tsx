'use client';
// app/components/ModuleSlots.tsx
// ─── Module Slots — arena module zone + enhanced picker ───────────────────────
//
// Renders the active module slots on an arena page.
// Each slot: live module component + remove button.
// Empty slot: dashed "Add Module" card → opens picker modal.
//
// Picker modal — Sep 2026 rewrite:
//   — Search input: live filter by label + desc
//   — Tier pills: all | trial | basic | standard | premium
//   — Tag pills:  🆕 new | ✨ enhanced | 🤖 admin | 🧠 ai
//   — Module cards: icon, label, tier badge, tag badge, desc, size hint
//   — Result count updates live
//   — Empty state with clear filters button
//   — Flags logic preserved
//
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { MODULE_REGISTRY }     from '../modules/index';
import { ModuleContext, ModuleTag, ModuleSize } from '../modules/types';
import { getFlags, isEnabled }  from '../lib/flags';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
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
  red:     '#ef4444',
  muted:   '#555',
  dim:     '#333',
  text:    '#e0e0e0',
  sub:     '#888',
};

// ─── Tier config ──────────────────────────────────────────────────────────────

const TIER_META: Record<string, { color: string; label: string }> = {
  trial:    { color: C.green,  label: 'Trial'    },
  basic:    { color: C.blue,   label: 'Basic'    },
  standard: { color: C.purple, label: 'Standard' },
  premium:  { color: C.orange, label: 'Premium'  },
};

// ─── Tag config ───────────────────────────────────────────────────────────────

const TAG_META: Record<ModuleTag, { color: string; label: string; icon: string }> = {
  new:      { color: C.green,  label: 'New',      icon: '🆕' },
  enhanced: { color: C.orange, label: 'Enhanced', icon: '✨' },
  admin:    { color: C.gold,   label: 'Admin',    icon: '🤖' },
  ai:       { color: C.purple, label: 'AI',       icon: '🧠' },
};

// ─── Size config ──────────────────────────────────────────────────────────────

const SIZE_MIN_HEIGHT: Record<ModuleSize, string> = {
  compact:  '80px',
  standard: '120px',
  full:     '160px',
};

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  slots:   (string | null)[];
  onSave:  (slots: (string | null)[]) => void;
  context: ModuleContext;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ModuleSlots({ slots, onSave, context }: Props) {
  const [picking,     setPicking]     = useState<number | null>(null);
  const [flags,       setFlags]       = useState<Record<string, boolean>>({});
  const [search,      setSearch]      = useState('');
  const [tierFilter,  setTierFilter]  = useState<string>('all');
  const [tagFilter,   setTagFilter]   = useState<string>('all');

  // Load flags once on mount
  useEffect(() => {
    getFlags().then(setFlags);
  }, []);

  // Reset filters when picker opens
  useEffect(() => {
    if (picking !== null) {
      setSearch('');
      setTierFilter('all');
      setTagFilter('all');
    }
  }, [picking]);

  function addModule(slotIndex: number, id: string) {
    const next = [...slots];
    next[slotIndex] = id;
    onSave(next);
    setPicking(null);
  }

  function removeModule(slotIndex: number) {
    const next = [...slots];
    next[slotIndex] = null;
    onSave(next);
  }

  const used = slots.filter(Boolean) as string[];

  // Base available — not already used + flag enabled
  const base = MODULE_REGISTRY.filter(m =>
    !used.includes(m.id) && isEnabled(flags, `module-${m.id}`)
  );

  // Apply filters
  const filtered = base.filter(m => {
    const matchSearch = !search.trim() ||
      m.label.toLowerCase().includes(search.toLowerCase()) ||
      m.desc.toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter === 'all' || m.tier === tierFilter;
    const matchTag  = tagFilter  === 'all' || m.tag  === tagFilter;
    return matchSearch && matchTier && matchTag;
  });

  const hasActiveFilter = search.trim() || tierFilter !== 'all' || tagFilter !== 'all';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ marginBottom: '1.5rem' }}>

      {/* Section label */}
      <div style={{
        fontSize:      '0.68rem',
        color:         C.dim,
        fontWeight:    700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        marginBottom:  '0.75rem',
      }}>
        Arena Modules
      </div>

      {/* Slots */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {slots.map((slotId, i) => {
          const def           = slotId ? MODULE_REGISTRY.find(m => m.id === slotId) : null;
          const LiveComponent = def?.component || null;
          const flagOk        = slotId ? isEnabled(flags, `module-${slotId}`) : true;
          const minH          = def?.size ? SIZE_MIN_HEIGHT[def.size] : SIZE_MIN_HEIGHT.standard;

          return (
            <div key={i}>
              <div
                onClick={() => !slotId && setPicking(i)}
                style={{
                  border:         slotId ? `1px solid ${C.border2}` : `1px dashed ${C.dim}`,
                  borderRadius:   '12px',
                  padding:        '1.25rem',
                  background:     slotId ? C.card : 'transparent',
                  cursor:         slotId ? 'default' : 'pointer',
                  minHeight:      slotId ? minH : '80px',
                  display:        'flex',
                  flexDirection:  'column',
                  justifyContent: slotId ? 'flex-start' : 'center',
                  alignItems:     slotId ? 'flex-start' : 'center',
                  transition:     'border-color 0.2s',
                }}
                onMouseEnter={e => {
                  if (!slotId) (e.currentTarget as HTMLDivElement).style.borderColor = C.muted;
                }}
                onMouseLeave={e => {
                  if (!slotId) (e.currentTarget as HTMLDivElement).style.borderColor = C.dim;
                }}
              >
                {slotId && def && LiveComponent && flagOk ? (
                  <>
                    <LiveComponent {...context} />
                    <button
                      onClick={e => { e.stopPropagation(); removeModule(i); }}
                      style={{
                        marginTop:    '0.75rem',
                        fontSize:     '0.68rem',
                        color:        C.dim,
                        background:   'none',
                        border:       `1px solid ${C.border2}`,
                        borderRadius: '6px',
                        padding:      '0.2rem 0.6rem',
                        cursor:       'pointer',
                        transition:   'color 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = C.muted)}
                      onMouseLeave={e => (e.currentTarget.style.color = C.dim)}
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '1.25rem', color: C.dim, marginBottom: '0.2rem' }}>+</div>
                    <div style={{ fontSize: '0.72rem', color: C.dim }}>Add Module</div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          MODULE PICKER MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {picking !== null && (
        <div
          onClick={() => setPicking(null)}
          style={{
            position:       'fixed',
            inset:          0,
            background:     'rgba(0,0,0,0.75)',
            zIndex:         100,
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            padding:        '1rem',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background:   C.card,
              border:       `1px solid ${C.border2}`,
              borderRadius: '16px',
              padding:      '1.5rem',
              width:        '360px',
              maxWidth:     '95vw',
              maxHeight:    '85vh',
              display:      'flex',
              flexDirection:'column',
              gap:          '0',
            }}
          >

            {/* Header */}
            <div style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              marginBottom:   '1rem',
            }}>
              <div style={{ fontWeight: 700, fontSize: '0.95rem', color: C.text }}>
                Choose a Module
              </div>
              <button
                onClick={() => setPicking(null)}
                style={{
                  background:   'none',
                  border:       `1px solid ${C.border2}`,
                  borderRadius: '6px',
                  color:        C.muted,
                  fontSize:     '0.75rem',
                  padding:      '0.2rem 0.5rem',
                  cursor:       'pointer',
                }}
              >
                ✕
              </button>
            </div>

            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
              <span style={{
                position:  'absolute',
                left:      '0.75rem',
                top:       '50%',
                transform: 'translateY(-50%)',
                fontSize:  '0.82rem',
                color:     C.muted,
                pointerEvents: 'none',
              }}>
                🔍
              </span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search modules..."
                autoFocus
                style={{
                  width:        '100%',
                  background:   C.bg,
                  border:       `1px solid ${C.border2}`,
                  borderRadius: '8px',
                  color:        C.text,
                  fontSize:     '0.85rem',
                  padding:      '0.6rem 0.75rem 0.6rem 2.25rem',
                  boxSizing:    'border-box',
                  outline:      'none',
                }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    position:   'absolute',
                    right:      '0.6rem',
                    top:        '50%',
                    transform:  'translateY(-50%)',
                    background: 'none',
                    border:     'none',
                    color:      C.muted,
                    cursor:     'pointer',
                    fontSize:   '0.75rem',
                    padding:    0,
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Tier filter pills */}
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
              {['all', 'trial', 'basic', 'standard', 'premium'].map(t => {
                const meta   = t !== 'all' ? TIER_META[t] : null;
                const active = tierFilter === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTierFilter(t)}
                    style={{
                      background:   active ? (meta?.color || C.orange) : 'transparent',
                      border:       `1px solid ${active ? (meta?.color || C.orange) : C.border2}`,
                      borderRadius: '999px',
                      color:        active ? '#000' : C.muted,
                      fontSize:     '0.68rem',
                      fontWeight:   active ? 700 : 400,
                      padding:      '0.2rem 0.6rem',
                      cursor:       'pointer',
                      transition:   'all 0.15s',
                      textTransform: 'capitalize',
                    }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>

            {/* Tag filter pills */}
            <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
              <button
                onClick={() => setTagFilter('all')}
                style={{
                  background:   tagFilter === 'all' ? C.muted : 'transparent',
                  border:       `1px solid ${tagFilter === 'all' ? C.muted : C.border2}`,
                  borderRadius: '999px',
                  color:        tagFilter === 'all' ? '#000' : C.dim,
                  fontSize:     '0.65rem',
                  fontWeight:   tagFilter === 'all' ? 700 : 400,
                  padding:      '0.15rem 0.55rem',
                  cursor:       'pointer',
                  transition:   'all 0.15s',
                }}
              >
                all tags
              </button>
              {(Object.entries(TAG_META) as [ModuleTag, typeof TAG_META[ModuleTag]][]).map(([key, meta]) => {
                const active = tagFilter === key;
                return (
                  <button
                    key={key}
                    onClick={() => setTagFilter(key)}
                    style={{
                      background:   active ? `${meta.color}20` : 'transparent',
                      border:       `1px solid ${active ? meta.color : C.border2}`,
                      borderRadius: '999px',
                      color:        active ? meta.color : C.dim,
                      fontSize:     '0.65rem',
                      fontWeight:   active ? 700 : 400,
                      padding:      '0.15rem 0.55rem',
                      cursor:       'pointer',
                      transition:   'all 0.15s',
                    }}
                  >
                    {meta.icon} {meta.label}
                  </button>
                );
              })}
            </div>

            {/* Result count */}
            <div style={{
              fontSize:     '0.65rem',
              color:        C.muted,
              marginBottom: '0.65rem',
              display:      'flex',
              alignItems:   'center',
              justifyContent: 'space-between',
            }}>
              <span>
                {filtered.length} module{filtered.length !== 1 ? 's' : ''}
                {base.length !== filtered.length && ` of ${base.length}`}
              </span>
              {hasActiveFilter && (
                <button
                  onClick={() => { setSearch(''); setTierFilter('all'); setTagFilter('all'); }}
                  style={{
                    background: 'none',
                    border:     'none',
                    color:      C.orange,
                    fontSize:   '0.65rem',
                    cursor:     'pointer',
                    padding:    0,
                  }}
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Module list — scrollable */}
            <div style={{
              overflowY:  'auto',
              flex:       1,
              display:    'flex',
              flexDirection: 'column',
              gap:        '0.4rem',
            }}>

              {/* Empty state */}
              {filtered.length === 0 && (
                <div style={{
                  textAlign:  'center',
                  padding:    '2rem 1rem',
                  color:      C.muted,
                  fontSize:   '0.82rem',
                }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>🔍</div>
                  No modules match
                  {hasActiveFilter && (
                    <div style={{ marginTop: '0.5rem' }}>
                      <button
                        onClick={() => { setSearch(''); setTierFilter('all'); setTagFilter('all'); }}
                        style={{
                          background:   'none',
                          border:       `1px solid ${C.border2}`,
                          borderRadius: '6px',
                          color:        C.orange,
                          fontSize:     '0.72rem',
                          padding:      '0.3rem 0.75rem',
                          cursor:       'pointer',
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* All modules added */}
              {base.length === 0 && (
                <div style={{ color: C.muted, fontSize: '0.82rem', padding: '1rem 0', textAlign: 'center' }}>
                  All available modules are already added.
                </div>
              )}

              {/* Module cards */}
              {filtered.map(mod => {
                const tierMeta = TIER_META[mod.tier];
                const tagMeta  = mod.tag ? TAG_META[mod.tag] : null;
                const isCompact = mod.size === 'compact';

                return (
                  <div
                    key={mod.id}
                    onClick={() => addModule(picking, mod.id)}
                    style={{
                      padding:      isCompact ? '0.6rem 0.75rem' : '0.85rem 0.9rem',
                      borderRadius: '10px',
                      cursor:       'pointer',
                      border:       `1px solid ${C.border}`,
                      background:   C.bg,
                      transition:   'border-color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.borderColor = tierMeta.color + '60';
                      el.style.background  = C.card;
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLDivElement;
                      el.style.borderColor = C.border;
                      el.style.background  = C.bg;
                    }}
                  >
                    {/* Top row — icon + label + tier badge */}
                    <div style={{
                      display:        'flex',
                      alignItems:     'center',
                      justifyContent: 'space-between',
                      gap:            '0.5rem',
                      marginBottom:   '0.3rem',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                        {mod.icon && (
                          <span style={{ fontSize: isCompact ? '0.9rem' : '1rem', flexShrink: 0 }}>
                            {mod.icon}
                          </span>
                        )}
                        <span style={{
                          fontWeight:   700,
                          fontSize:     isCompact ? '0.8rem' : '0.88rem',
                          color:        C.text,
                          overflow:     'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace:   'nowrap',
                        }}>
                          {/* Strip emoji from label since icon field handles it */}
                          {mod.label.replace(/^\p{Emoji}\s*/u, '')}
                        </span>
                      </div>

                      {/* Right badges */}
                      <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0, alignItems: 'center' }}>
                        {/* Tag badge */}
                        {tagMeta && (
                          <span style={{
                            fontSize:     '0.58rem',
                            fontWeight:   700,
                            color:        tagMeta.color,
                            background:   `${tagMeta.color}15`,
                            border:       `1px solid ${tagMeta.color}30`,
                            borderRadius: '999px',
                            padding:      '0.1rem 0.4rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                          }}>
                            {tagMeta.icon} {tagMeta.label}
                          </span>
                        )}
                        {/* Tier badge */}
                        <span style={{
                          fontSize:     '0.58rem',
                          fontWeight:   700,
                          color:        tierMeta.color,
                          background:   `${tierMeta.color}15`,
                          border:       `1px solid ${tierMeta.color}30`,
                          borderRadius: '999px',
                          padding:      '0.1rem 0.4rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}>
                          {tierMeta.label}
                        </span>
                      </div>
                    </div>

                    {/* Desc */}
                    <div style={{
                      fontSize:   '0.72rem',
                      color:      C.sub,
                      lineHeight: 1.45,
                      paddingLeft: mod.icon ? '1.4rem' : 0,
                    }}>
                      {mod.desc}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer cancel */}
            <button
              onClick={() => setPicking(null)}
              style={{
                marginTop:    '1rem',
                width:        '100%',
                background:   'none',
                border:       `1px solid ${C.border2}`,
                color:        C.muted,
                borderRadius: '8px',
                padding:      '0.55rem',
                cursor:       'pointer',
                fontSize:     '0.82rem',
                flexShrink:   0,
              }}
            >
              Cancel
            </button>

          </div>
        </div>
      )}
    </div>
  );
}

