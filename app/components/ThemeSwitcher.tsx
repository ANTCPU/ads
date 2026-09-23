'use client';

// app/components/ThemeSwitcher.tsx
// ─── User brightness toggle ───────────────────────────────────────────────────
// Lets the user nudge the site brightness independently of the season flag.
// Stored in localStorage as arena_brightness.
// ThemeProvider reads this on mount and overrides the season bgLevel.
// Three levels: dark → mid → light
// Only renders when a season theme is active (data-theme set on html).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';

export type BrightnessLevel = 'dark' | 'mid' | 'light';

const STORAGE_KEY = 'arena_brightness';

const LEVELS: { id: BrightnessLevel; icon: string; label: string }[] = [
  { id: 'dark',       icon: '🌑', label: 'Dark'    },
  { id: 'mid',        icon: '🌘', label: 'Mid'     },
  { id: 'mid-2',      icon: '🌗', label: 'Mid+'    },
  { id: 'mid-3',      icon: '🌖', label: 'Mid++'   },
  { id: 'light',      icon: '🌕', label: 'Light'   },
  { id: 'white',      icon: '☀️', label: 'White'   },
];

export type BrightnessLevel = 'dark' | 'mid' | 'mid-2' | 'mid-3' | 'light' | 'white';

export function getStoredBrightness(): BrightnessLevel {
  if (typeof window === 'undefined') return 'dark';
  return (localStorage.getItem(STORAGE_KEY) as BrightnessLevel) || 'dark';
}

export function setStoredBrightness(level: BrightnessLevel) {
  localStorage.setItem(STORAGE_KEY, level);
}

export default function ThemeSwitcher() {
  const [active,        setActive]        = useState<BrightnessLevel>('dark');
  const [themeActive,   setThemeActive]   = useState(false);
  const [mounted,       setMounted]       = useState(false);

  useEffect(() => {
    setMounted(true);
    // Only show when a season theme is active
    const hasTheme = !!document.documentElement.getAttribute('data-theme');
    setThemeActive(hasTheme);
    if (hasTheme) {
      setActive(getStoredBrightness());
    }
  }, []);

  // Don't render if no season theme active or not mounted
  if (!mounted || !themeActive) return null;

  function cycle() {
    const idx  = LEVELS.findIndex(l => l.id === active);
    const next = LEVELS[(idx + 1) % LEVELS.length];
    setActive(next.id);
    setStoredBrightness(next.id);
    // Dispatch custom event — ThemeProvider listens and re-applies bgLevel
    window.dispatchEvent(new CustomEvent('arena-brightness-change', {
      detail: { level: next.id }
    }));
  }

  const current = LEVELS.find(l => l.id === active) ?? LEVELS[0];

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
