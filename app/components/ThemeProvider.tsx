'use client';

// app/components/ThemeProvider.tsx
// ─── Season Theme Engine ──────────────────────────────────────────────────────
//
// v2 — full rewrite:
//   - createPortal into document.body — bypasses overflowX:'hidden' on page roots
//   - brightness listener — user can nudge dark/mid/light via ThemeSwitcher
//   - brightness read on mount — persisted in localStorage, applied immediately
//   - h1 emoji hardened — !important + broader selector
//   - zIndex 9999 on particles — clears nav (100) and modals (200+)
//   - willChange: transform — GPU layer, independent stacking context
//   - mounted guard — createPortal needs document.body to exist
//   - silent failure throughout — theme never breaks the page
//
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect }  from 'react';
import { createPortal }         from 'react-dom';
import { getFlags }             from '../lib/flags';
import {
  resolveTheme,
  buildThemeCSS,
  brightnessToLevel,
  SeasonTheme,
  ParticleShape,
  BgLevel,
}                               from '../lib/theme';
import {
  getStoredBrightness,
  BrightnessLevel,
}                               from './ThemeSwitcher';

// ─── Constants ────────────────────────────────────────────────────────────────

const STYLE_ID        = 'antcpu-theme';
const BRIGHTNESS_EVENT = 'arena-brightness-change';

// ─── Particle ─────────────────────────────────────────────────────────────────
// Portalled to document.body — immune to every page overflow clip.

function Particle({ p, index }: { p: ParticleShape; index: number }) {
  return (
    <div
      style={{
        position:                'fixed',
        top:                     '-60px',
        left:                    `${p.left}%`,
        width:                   `${p.w}px`,
        height:                  `${p.h}px`,
        borderRadius:            p.radius,
        background:              p.color,
        clipPath:                p.clip ?? undefined,
        opacity:                 p.opacity,
        pointerEvents:           'none',
        zIndex:                  9999,
        willChange:              'transform',
        animationName:           p.anim,
        animationDuration:       `${p.dur}s`,
        animationDelay:          `${p.delay}s`,
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
        animationFillMode:       'both',
        // Slight horizontal variation per particle index
        marginLeft:              `${(index % 3) * 8}px`,
      }}
    />
  );
}

// ─── Style helpers ────────────────────────────────────────────────────────────

function injectStyle(css: string) {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el    = document.createElement('style');
    el.id = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

function removeStyle() {
  document.getElementById(STYLE_ID)?.remove();
}

// ─── Apply theme + brightness ─────────────────────────────────────────────────
// Central function — called on mount and on every brightness change.
// Resolves the effective bgLevel from season default + user brightness choice.

function applyTheme(
  theme:      SeasonTheme,
  brightness: BrightnessLevel,
  showParts:  boolean,
  showEmoji:  boolean,
) {
  const effectiveLevel = brightnessToLevel(theme.bgLevel, brightness);
  const css = buildThemeCSS(
    { ...theme, bgLevel: effectiveLevel },
    showParts,
    showEmoji,
  );
  injectStyle(css);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ThemeProvider() {
  const [theme,     setTheme]     = useState<SeasonTheme | null>(null);
  const [particles, setParticles] = useState(false);
  const [h1Emoji,   setH1Emoji]   = useState(false);
  const [ready,     setReady]     = useState(false);
  const [mounted,   setMounted]   = useState(false);

  // ── Mount guard — createPortal needs document.body ────────────────────────
  useEffect(() => { setMounted(true); }, []);

  // ── Boot — read flags, resolve theme, apply ───────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const flags     = await getFlags();
        if (cancelled) return;

        const resolved  = resolveTheme(flags);
        const showParts = !!flags['theme-particles'];
        const showEmoji = !!flags['theme-h1-emoji'];

        // No active season flag — preserve default black, exit clean
        if (!resolved) {
          setReady(true);
          return;
        }

        // 1. Set data-theme on <html> — CSS selectors hook here
        document.documentElement.setAttribute('data-theme', resolved.id);

        // 2. Read user brightness preference from localStorage
        const brightness = getStoredBrightness();

        // 3. Apply theme CSS with effective brightness level
        applyTheme(resolved, brightness, showParts, showEmoji);

        // 4. Update state — triggers particle render
        setTheme(resolved);
        setParticles(showParts);
        setH1Emoji(showEmoji);
        setReady(true);

      } catch {
        // Silent — theme failure never breaks the page
        setReady(true);
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  // ── Brightness change listener ────────────────────────────────────────────
  // ThemeSwitcher dispatches 'arena-brightness-change' when user cycles levels.
  // Re-applies CSS with new effective bgLevel — no page reload needed.
  useEffect(() => {
    if (!theme) return;

    function handleBrightnessChange(e: Event) {
      try {
        const level = (e as CustomEvent<{ level: BrightnessLevel }>).detail.level;
        applyTheme(theme!, level, particles, h1Emoji);
      } catch {
        // Silent
      }
    }

    window.addEventListener(BRIGHTNESS_EVENT, handleBrightnessChange);
    return () => window.removeEventListener(BRIGHTNESS_EVENT, handleBrightnessChange);
  }, [theme, particles, h1Emoji]);

  // ── Cleanup on unmount ────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute('data-theme');
      removeStyle();
    };
  }, []);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (!ready || !theme || !particles || !mounted) return null;

  // ── Portal particles into document.body ──────────────────────────────────
  // Bypasses overflowX:'hidden' on every page root div.
  // z-index 9999 clears nav (100), modals (200+), everything.
  return createPortal(
    <>
      {theme.particles.map((p, i) => (
        <Particle key={i} p={p} index={i} />
      ))}
    </>,
    document.body
  );
}
