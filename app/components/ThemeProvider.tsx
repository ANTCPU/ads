'use client';

// app/components/ThemeProvider.tsx
// ─── Season Theme Engine ──────────────────────────────────────────────────────
//
// Sits as a sibling in layout.tsx — renders no visible UI of its own.
// Reads flags once on mount via getFlags().
// Resolves active season via resolveTheme().
// If no season flag is on → exits immediately, zero DOM changes.
// If a season is active:
//   1. Sets data-theme on <html>
//   2. Injects <style id="antcpu-theme"> with gradient + h1 emoji + keyframes
//   3. Renders particle divs as fixed overlay (pointer-events:none, z-index:1)
//
// Cleanup: removes data-theme + style tag on unmount.
// Safe to hot-reload — style tag is replaced not duplicated (same id).
//
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react';
import { getFlags }            from '../lib/flags';
import {
  resolveTheme,
  buildThemeCSS,
  SeasonTheme,
  ParticleShape,
}                              from '../lib/theme';

// ─── Style tag id — ensures only one exists at a time ─────────────────────────
const STYLE_ID = 'antcpu-theme';

// ─── Particle component ───────────────────────────────────────────────────────
// Each particle is a single div with inline styles + CSS animation.
// Fixed position, pointer-events none — never blocks clicks.

function Particle({ p, index }: { p: ParticleShape; index: number }) {
  return (
    <div
      key={index}
      style={{
        position:        'fixed',
        top:             '-40px',
        left:            `${p.left}%`,
        width:           `${p.w}px`,
        height:          `${p.h}px`,
        borderRadius:    p.radius,
        background:      p.color,
        clipPath:        p.clip ?? undefined,
        opacity:         p.opacity,
        pointerEvents:   'none',
        zIndex:          1,
        animationName:   p.anim,
        animationDuration:       `${p.dur}s`,
        animationDelay:          `${p.delay}s`,
        animationTimingFunction: 'linear',
        animationIterationCount: 'infinite',
        animationFillMode:       'both',
        // Slight horizontal variation per particle
        marginLeft:      `${(index % 3) * 8}px`,
      }}
    />
  );
}

// ─── Style injector ───────────────────────────────────────────────────────────
// Injects or replaces the theme <style> tag.
// Uses the same id so it's never duplicated.

function injectStyle(css: string) {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!el) {
    el          = document.createElement('style');
    el.id       = STYLE_ID;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

function removeStyle() {
  document.getElementById(STYLE_ID)?.remove();
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ThemeProvider() {
  const [theme,     setTheme]     = useState<SeasonTheme | null>(null);
  const [particles, setParticles] = useState(false);
  const [h1Emoji,   setH1Emoji]   = useState(false);
  const [ready,     setReady]     = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const flags = await getFlags();

        if (cancelled) return;

        const resolved   = resolveTheme(flags);
        const showParts  = !!flags['theme-particles'];
        const showEmoji  = !!flags['theme-h1-emoji'];

        // ── No active theme — preserve default, exit clean ──────────────────
        if (!resolved) {
          setReady(true);
          return;
        }

        // ── Apply theme ──────────────────────────────────────────────────────

        // 1. Set data-theme on <html> — CSS gradient selector hooks here
        document.documentElement.setAttribute('data-theme', resolved.id);

        // 2. Inject style block — gradient + optional emoji + keyframes
        const css = buildThemeCSS(resolved, showParts, showEmoji);
        injectStyle(css);

        // 3. Update state — triggers particle render
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

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Cleanup on unmount ─────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute('data-theme');
      removeStyle();
    };
  }, []);

  // ── Nothing to render until flags resolved ─────────────────────────────────
  // Prevents flash — particles only appear after flags are known
  if (!ready) return null;

  // ── No active theme — render nothing ──────────────────────────────────────
  if (!theme) return null;

  // ── Particles off — style injected but no DOM elements ────────────────────
  if (!particles) return null;

  // ── Render particle overlay ────────────────────────────────────────────────
  return (
    <>
      {theme.particles.map((p, i) => (
        <Particle key={i} p={p} index={i} />
      ))}
    </>
  );
}
