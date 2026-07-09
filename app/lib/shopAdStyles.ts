// ============================================================
// lib/shopAdStyles.ts — Shared style tokens for shop ad forms
// Used by: create-shop-ad, login brand-aware rewrite
// ============================================================

export const tokens = {
  bg:     '#0a0a0a',
  card:   '#111',
  border: '#1a1a1a',
  white:  '#fff',
  muted:  '#888',
  muted2: '#444',
  green:  '#2E7D32',
  gold:   '#D4AF37',
};

export const inp: React.CSSProperties = {
  width: '100%', background: tokens.card, border: `1px solid ${tokens.border}`,
  borderRadius: '10px', padding: '0.85rem 1rem', color: tokens.white,
  fontSize: '0.95rem', outline: 'none', fontFamily: 'system-ui, sans-serif',
  boxSizing: 'border-box',
};

export const nextBtn = (on: boolean): React.CSSProperties => ({
  width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
  background: on ? tokens.gold : tokens.muted2,
  color: on ? '#0a0a0a' : tokens.muted,
  fontWeight: 800, fontSize: '1rem',
  cursor: on ? 'pointer' : 'not-allowed',
  transition: 'background 0.2s', marginTop: '1.5rem',
});

export const backBtn: React.CSSProperties = {
  ...nextBtn(true), background: tokens.muted2, color: tokens.muted,
  flex: '0 0 auto', width: 'auto', padding: '1rem 1.5rem', marginTop: 0,
};

export const macBtn: React.CSSProperties = {
  background: 'none', border: `1px solid ${tokens.green}40`, borderRadius: '8px',
  color: tokens.green, fontSize: '0.72rem', padding: '0.3rem 0.7rem',
  cursor: 'pointer', fontWeight: 600,
};
