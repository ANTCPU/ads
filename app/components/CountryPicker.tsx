// ============================================================
// components/CountryPicker.tsx
// Reusable country grid with search + auto-detect highlight
// Used by: create-shop-ad, mac/page, login brand-aware rewrite
//
// v2 (Sep 2026):
//   — search input — filters by name or code, clears on country select
//   — label prop — optional heading above the grid
//   — disabled prop — locks picker after selection
//   — aria-label on each button — screen reader + keyboard nav
//   — accentColor default updated to match MAC green (#22c55e)
// ============================================================

'use client';

import { useState }  from 'react';
import { Country }   from '../clients/mapofpi/assets';

type Props = {
  countries:    Country[];
  selected:     string;           // country code e.g. 'NG'
  onSelect:     (code: string, lang: string) => void;
  accentColor?: string;
  label?:       string;           // optional heading above grid
  disabled?:    boolean;          // lock after selection
};

const card   = '#111';
const border = '#1a1a1a';

export default function CountryPicker({
  countries,
  selected,
  onSelect,
  accentColor = '#22c55e',
  label,
  disabled = false,
}: Props) {
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? countries.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.code.toLowerCase().includes(search.toLowerCase())
      )
    : countries;

  function handleSelect(code: string, lang: string) {
    if (disabled) return;
    setSearch('');
    onSelect(code, lang);
  }

  return (
    <div>
      {/* ── Optional label ── */}
      {label && (
        <div style={{
          fontSize:      '0.72rem',
          color:         '#555',
          fontWeight:    700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom:  '0.6rem',
        }}>
          {label}
        </div>
      )}

      {/* ── Search ── */}
      {!disabled && (
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search country..."
          style={{
            width:        '100%',
            background:   card,
            border:       `1px solid ${border}`,
            borderRadius: '8px',
            padding:      '0.6rem 0.85rem',
            color:        '#fff',
            fontSize:     '0.85rem',
            marginBottom: '0.6rem',
            boxSizing:    'border-box',
            outline:      'none',
            fontFamily:   'inherit',
          }}
        />
      )}

      {/* ── Grid ── */}
      <div style={{
        display:               'grid',
        gridTemplateColumns:   'repeat(2, 1fr)',
        gap:                   '0.5rem',
        maxHeight:             '300px',
        overflowY:             'auto',
        opacity:               disabled ? 0.5 : 1,
        pointerEvents:         disabled ? 'none' : 'auto',
      }}>
        {filtered.length === 0 && (
          <div style={{
            gridColumn: '1 / -1',
            color:      '#444',
            fontSize:   '0.82rem',
            padding:    '1rem 0',
            textAlign:  'center',
          }}>
            No countries found for &ldquo;{search}&rdquo;
          </div>
        )}

        {filtered.map(c => (
          <button
            key={c.code}
            onClick={() => handleSelect(c.code, c.lang)}
            aria-label={`${c.name} (${c.code})`}
            aria-pressed={selected === c.code}
            style={{
              background:   selected === c.code ? `${accentColor}22` : card,
              border:       `1px solid ${selected === c.code ? accentColor : border}`,
              borderRadius: '10px',
              padding:      '0.65rem 0.85rem',
              cursor:       disabled ? 'default' : 'pointer',
              textAlign:    'left',
              display:      'flex',
              alignItems:   'center',
              gap:          '0.6rem',
              transition:   'border-color 0.15s',
            }}
          >
            <span style={{ fontSize: '1.2rem' }}>{c.flag}</span>
            <span style={{
              fontSize:   '0.82rem',
              color:      selected === c.code ? accentColor : '#fff',
              fontWeight: selected === c.code ? 700 : 400,
            }}>
              {c.name}
            </span>
          </button>
        ))}
      </div>

      {/* ── Selected confirmation ── */}
      {selected && !search && (
        <div style={{
          fontSize:    '0.72rem',
          color:       accentColor,
          marginTop:   '0.5rem',
          fontWeight:  600,
        }}>
          {countries.find(c => c.code === selected)?.flag}{' '}
          {countries.find(c => c.code === selected)?.name} selected
        </div>
      )}
    </div>
  );
}
