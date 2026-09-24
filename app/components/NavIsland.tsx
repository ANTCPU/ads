'use client';

// app/components/NavIsland.tsx
// ─── Nav Island — brightness + language controls ──────────────────────────────
// Replaces standalone ThemeSwitcher + LanguageSwitcher in ArenaNav.
// Two pills side by side — brightness left, language right.
//
// Brightness pill:
//   — only renders when data-theme is set on <html>
//   — reads/writes arena_brightness in localStorage
//   — dispatches arena-brightness-change → ThemeProvider re-applies CSS
//
// Language pill:
//   — always visible
//   — reads current locale from pathname + localStorage fallback
//   — pushes to /{locale} route on select
//
// Dropdowns open upward — safe for both top nav and bottom-of-menu placement.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect }                        from 'react';
import { useRouter, usePathname }                     from 'next/navigation';
import { locales, localeLabels, localeNames, Locale } from '../lib/i18n/index';
import { setStoredLocale, getStoredLocale }           from '../lib/locale';
import {
  BRIGHTNESS_LEVELS,
  BrightnessLevel,
  getStoredBrightness,
  setStoredBrightness,
}                                                     from './ThemeSwitcher';

const BRIGHTNESS_EVENT = 'arena-brightness-change';

// ─── Component ────────────────────────────────────────────────────────────────

export default function NavIsland() {
  const router   = useRouter();
  const pathname = usePathname();

  // ── Brightness state ──────────────────────────────────────────────────────
  const [brightness,    setBrightness]    = useState<BrightnessLevel>('dark');
  const [themeActive,   setThemeActive]   = useState(false);
  const [brightOpen,    setBrightOpen]    = useState(false);

  // ── Language state ────────────────────────────────────────────────────────
  const [storedLocale,  setStoredLocale_] = useState<Locale>('en');
  const [langOpen,      setLangOpen]      = useState(false);

  // ── Mount ─────────────────────────────────────────────────────────────────
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Brightness — check if theme is active
    const hasTheme = !!document.documentElement.getAttribute('data-theme');
    setThemeActive(hasTheme);
    if (hasTheme) setBrightness(getStoredBrightness());
    // Language — read stored locale
    setStoredLocale_(getStoredLocale());
  }, []);

  // ── Listen for data-theme changes (ThemeProvider sets it async) ───────────
  useEffect(() => {
    if (!mounted) return;
    const observer = new MutationObserver(() => {
      const hasTheme = !!document.documentElement.getAttribute('data-theme');
      setThemeActive(hasTheme);
      if (hasTheme) setBrightness(getStoredBrightness());
    });
    observer.observe(document.documentElement, {
      attributes: true, attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, [mounted]);

  // ── Close both dropdowns on outside click ─────────────────────────────────
  useEffect(() => {
    if (!brightOpen && !langOpen) return;
    function handleOutside() {
      setBrightOpen(false);
      setLangOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [brightOpen, langOpen]);

  if (!mounted) return null;

  // ── Derived locale ────────────────────────────────────────────────────────
  const currentLocale: Locale = locales.find(
    l => pathname === `/${l}` || pathname.startsWith(`/${l}/`)
  ) ?? storedLocale;

  // ── Brightness select ─────────────────────────────────────────────────────
  function selectBrightness(level: BrightnessLevel) {
    setBrightness(level);
    setStoredBrightness(level);
    setBrightOpen(false);
    window.dispatchEvent(new CustomEvent(BRIGHTNESS_EVENT, {
      detail: { level },
    }));
  }

  // ── Language select ───────────────────────────────────────────────────────
  function selectLocale(l: Locale) {
    setLangOpen(false);
    setStoredLocale(l);
    setStoredLocale_(l);
    router.push(l === 'en' ? '/' : `/${l}`);
  }

  // ── Shared pill style ─────────────────────────────────────────────────────
  const pillStyle = (open: boolean): React.CSSProperties => ({
    background:    'transparent',
    border:        `1px solid ${open ? '#555' : '#333'}`,
    borderRadius:  '8px',
    color:         '#888',
    fontSize:      '13px',
    fontWeight:    600,
    padding:       '5px 10px',
    cursor:        'pointer',
    display:       'flex',
    alignItems:    'center',
    gap:           '5px',
    letterSpacing: '0.5px',
    transition:    'border-color 0.2s',
    whiteSpace:    'nowrap' as const,
    flexShrink:    0,
  });

  const dropdownStyle: React.CSSProperties = {
    position:     'absolute',
    bottom:       '110%',
    right:        0,
    background:   '#111',
    border:       '1px solid #222',
    borderRadius: '10px',
    overflow:     'hidden',
    zIndex:       300,
    minWidth:     '140px',
    boxShadow:    '0 -8px 32px rgba(0,0,0,0.4)',
  };

  const currentBright = BRIGHTNESS_LEVELS.find(l => l.id === brightness) ?? BRIGHTNESS_LEVELS[0];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>

      {/* ── Brightness pill — only when theme active ── */}
      {themeActive && (
        <div style={{ position: 'relative' }}>
          <button
            onClick={e => { e.stopPropagation(); setBrightOpen(o => !o); setLangOpen(false); }}
            style={pillStyle(brightOpen)}
            title={`Brightness: ${currentBright.label}`}
          >
            {currentBright.icon}
            <span style={{ fontSize: '11px' }}>{currentBright.label}</span>
            <span style={{ fontSize: '10px', opacity: 0.6 }}>▾</span>
          </button>

          {brightOpen && (
            <div style={dropdownStyle} onMouseDown={e => e.stopPropagation()}>
              {BRIGHTNESS_LEVELS.map(l => (
                <button
                  key={l.id}
                  onClick={() => selectBrightness(l.id)}
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '8px',
                    width:        '100%',
                    background:   brightness === l.id ? '#1a1a1a' : 'transparent',
                    border:       'none',
                    borderBottom: '1px solid #1a1a1a',
                    color:        brightness === l.id ? '#fff' : '#888',
                    fontSize:     '13px',
                    fontWeight:   brightness === l.id ? 700 : 400,
                    padding:      '10px 14px',
                    cursor:       'pointer',
                    textAlign:    'left',
                  }}
                >
                  <span>{l.icon}</span>
                  <span>{l.label}</span>
                  {brightness === l.id && (
                    <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#f0883e' }}>●</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Language pill — always visible ── */}
      <div style={{ position: 'relative' }}>
        <button
          onClick={e => { e.stopPropagation(); setLangOpen(o => !o); setBrightOpen(false); }}
          style={pillStyle(langOpen)}
          title={`Language: ${localeNames[currentLocale]}`}
        >
          {localeLabels[currentLocale]}
          <span style={{ fontSize: '10px', opacity: 0.6 }}>▾</span>
        </button>

        {langOpen && (
          <div style={dropdownStyle} onMouseDown={e => e.stopPropagation()}>
            {locales.map(l => (
              <button
                key={l}
                onClick={() => selectLocale(l)}
                style={{
                  display:      'flex',
                  alignItems:   'center',
                  gap:          '10px',
                  width:        '100%',
                  background:   currentLocale === l ? '#1a1a1a' : 'transparent',
                  border:       'none',
                  borderBottom: '1px solid #1a1a1a',
                  color:        currentLocale === l ? '#fff' : '#888',
                  fontSize:     '13px',
                  fontWeight:   currentLocale === l ? 700 : 400,
                  padding:      '10px 14px',
                  cursor:       'pointer',
                  textAlign:    'left',
                }}
              >
                <span style={{ fontSize: '11px', letterSpacing: '1px', color: '#0070f3', fontWeight: 700 }}>
                  {localeLabels[l]}
                </span>
                <span>{localeNames[l]}</span>
                {currentLocale === l && (
                  <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#f0883e' }}>●</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
