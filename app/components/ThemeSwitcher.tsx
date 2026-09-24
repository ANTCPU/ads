'use client';

// app/components/ThemeSwitcher.tsx
// ─── User brightness control ──────────────────────────────────────────────────
// BrightnessLevel type lives here — imported by ThemeProvider + NavIsland.
// Stored in localStorage as arena_brightness.
//
// Levels match brightnessToLevel() in theme.ts exactly:
//   dark       → season default (no shift)
//   mid        → one step up
//   light-grey → two steps up — subtle shadow on white text
//   light      → three steps up — full shadow on white text
//
// Component not used directly in ArenaNav — NavIsland wraps this logic.
// Exports only: BrightnessLevel type, getStoredBrightness, setStoredBrightness.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';

// ─── Single source of truth for BrightnessLevel ───────────────────────────────
// Must match brightnessToLevel() signature in theme.ts.

export type BrightnessLevel = 'dark' | 'mid' | 'light-grey' | 'light';

const STORAGE_KEY = 'arena_brightness';

export const BRIGHTNESS_LEVELS: { id: BrightnessLevel; icon: string; label: string }[] = [
  { id: 'dark',       icon: '🌑', label: 'Dark'       },
  { id: 'mid',        icon: '🌗', label: 'Mid'        },
  { id: 'light-grey', icon: '🌕', label: 'Light Grey' },
  { id: 'light',      icon: '☀️', label: 'Light'      },
];

export function getStoredBrightness(): BrightnessLevel {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem(STORAGE_KEY) as BrightnessLevel) || 'dark';
}

export function setStoredBrightness(level: BrightnessLevel) {
  localStorage.setItem(STORAGE_KEY, level);
}

// ─── Component ────────────────────────────────────────────────────────────────
// Standalone cycle button — kept for backward compat.
// NavIsland is the primary surface going forward.

export default function ThemeSwitcher() {
  const [active,      setActive]      = useState<BrightnessLevel>('dark');
  const [themeActive, setThemeActive] = useState(false);
  const [mounted,     setMounted]     = useState(false);

  useEffect(() => {
    setMounted(true);
    const hasTheme = !!document.documentElement.getAttribute('data-theme');
    setThemeActive(hasTheme);
    if (hasTheme) setActive(getStoredBrightness());
  }, []);

  if (!mounted || !themeActive) return null;

  function cycle() {
    const idx  = BRIGHTNESS_LEVELS.findIndex(l => l.id === active);
    const next = BRIGHTNESS_LEVELS[(idx + 1) % BRIGHTNESS_LEVELS.length];
    setActive(next.id);
    setStoredBrightness(next.id);
    window.dispatchEvent(new CustomEvent('arena-brightness-change', {
      detail: { level: next.id },
    }));
  }

  const current = BRIGHTNESS_LEVELS.find(l => l.id === active) ?? BRIGHTNESS_LEVELS[0];

  return (
    <button
      onClick={cycle}
      title={`Theme brightness: ${current.label}`}
      style={{
        background:   'none',
        border:       '1px solid #333',
        borderRadius: '8px',
        color:        '#888',
        fontSize:     '13px',
        padding:      '5px 10px',
        cursor:       'pointer',
        display:      'flex',
        alignItems:   'center',
        gap:          '5px',
        transition:   'border-color 0.2s',
        flexShrink:   0,
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#555')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#333')}
    >
      {current.icon}
      <span style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
        {current.label}
      </span>
    </button>
  );
}
