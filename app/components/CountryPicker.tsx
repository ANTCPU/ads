// ============================================================
// components/CountryPicker.tsx
// Reusable country grid with auto-detect highlight
// Used by: create-shop-ad, login brand-aware rewrite
// ============================================================
'use client';

import { Country } from '../clients/mapofpi/assets';

type Props = {
  countries:       Country[];
  selected:        string;        // country code e.g. 'NG'
  onSelect:        (code: string, lang: string) => void;
  accentColor?:    string;
};

const card   = '#111';
const border = '#1a1a1a';

export default function CountryPicker({
  countries,
  selected,
  onSelect,
  accentColor = '#2E7D32',
}: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', maxHeight: '340px', overflowY: 'auto' }}>
      {countries.map(c => (
        <button
          key={c.code}
          onClick={() => onSelect(c.code, c.lang)}
          style={{
            background:   selected === c.code ? `${accentColor}22` : card,
            border:       `1px solid ${selected === c.code ? accentColor : border}`,
            borderRadius: '10px',
            padding:      '0.65rem 0.85rem',
            cursor:       'pointer',
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
  );
}
