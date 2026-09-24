'use client';

// app/components/ThemeProvider.tsx
// ─── Season Theme Engine ──────────────────────────────────────────────────────
//
// v3 (Sep 2026):
//   — guard split: style injection independent of particles flag
//   — explicit cleanup when no theme resolves — removes data-theme + style tag
//   — BrightnessLevel updated to 4 levels matching theme.ts
//
// v2:
//   — createPortal into document.body — bypasses overflowX:'hidden'
//   — brightness listener — user nudges via NavIsland
//   — brightness read on mount — persisted in localStorage
//   — zIndex 9999 on particles
//   — willChange: transform — GPU layer
//   — mounted guard — createPortal needs document.body
//   — silent failure throughout
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
}                               from '../lib/theme';
import {
  getStoredBrightness,
  BrightnessLevel,
}                               from './ThemeSwitcher';

// ─── Constants ────────────────────────────────────────────────────────────────

const STYLE_ID         = 'antcpu-theme';
const BRIGHTNESS_EVENT = 'arena-brightness-change';

// ─── Particle ─────────────────────────────────────────────────────────────────

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
// Resolves effective bgLevel from season default + user brightness choice.

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

  // ── Mount guard ───────────────────────────────────────────────────────────
  useEffect(() => { setMounted(true); }, []);

  // ── Boot — read flags, resolve theme, apply ───────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const flags    = await getFlags();
        if (cancelled) return;

        const resolved  = resolveTheme(flags);
        const showParts = !!flags['theme-particles'];
        const showEmoji = !!flags['theme-h1-emoji'];

        // No active season — clean up any leftover state and exit
        if (!resolved) {
          document.documentElement.removeAttribute('data-theme');
          removeStyle();
          setReady(true);
          return;
        }

        // 1. Set data-theme on <html> — CSS selectors + NavIsland MutationObserver
        document.documentElement.setAttribute('data-theme', resolved.id);

        // 2. Read user brightness preference
        const brightness = getStoredBrightness();

        // 3. Apply CSS — independent of particles flag
        applyTheme(resolved, brightness, showParts, showEmoji);

        // 4. Update state — triggers particle portal render
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
  // NavIsland dispatches 'arena-brightness-change' when user picks a level.
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

  // ── Guard — ready + mounted always required ───────────────────────────────
  // Style injected by applyTheme() above — independent of this guard.
  // Portal only renders when theme is active AND particles flag is on.
  if (!ready || !mounted) return null;
  if (!theme || !particles) return null;

  // ── Portal particles into document.body ──────────────────────────────────
  return createPortal(
    <>
      {theme.particles.map((p, i) => (
        <Particle key={i} p={p} index={i} />
      ))}
    </>,
    document.body
  );
}
