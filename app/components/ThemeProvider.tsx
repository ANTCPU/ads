'use client';

// app/components/ThemeProvider.tsx
// ─── Season Theme Engine ──────────────────────────────────────────────────────
// Particles rendered via createPortal into document.body —
// bypasses all page overflow contexts (overflowX: 'hidden' on root divs).
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect }  from 'react';
import { createPortal }         from 'react-dom';
import { getFlags }             from '../lib/flags';
import {
  resolveTheme,
  buildThemeCSS,
  SeasonTheme,
  ParticleShape,
}                               from '../lib/theme';

const STYLE_ID = 'antcpu-theme';

// ─── Particle ─────────────────────────────────────────────────────────────────
// Portalled to document.body — immune to page overflow clips.

function Particle({ p, index }: { p: ParticleShape; index: number }) {
  return (
    <div
      style={{
        position:                 'fixed',
        top:                      '-40px',
        left:                     `${p.left}%`,
        width:                    `${p.w}px`,
        height:                   `${p.h}px`,
        borderRadius:             p.radius,
        background:               p.color,
        clipPath:                 p.clip ?? undefined,
        opacity:                  p.opacity,
        pointerEvents:            'none',
        zIndex:                   9999,
        willChange:               'transform',
        animationName:            p.anim,
        animationDuration:        `${p.dur}s`,
        animationDelay:           `${p.delay}s`,
        animationTimingFunction:  'linear',
        animationIterationCount:  'infinite',
        animationFillMode:        'both',
        marginLeft:               `${(index % 3) * 8}px`,
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function ThemeProvider() {
  const [theme,     setTheme]     = useState<SeasonTheme | null>(null);
  const [particles, setParticles] = useState(false);
  const [h1Emoji,   setH1Emoji]   = useState(false);
  const [ready,     setReady]     = useState(false);
  const [mounted,   setMounted]   = useState(false);

  // Track client mount — createPortal needs document.body
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const flags      = await getFlags();
        if (cancelled) return;

        const resolved   = resolveTheme(flags);
        const showParts  = !!flags['theme-particles'];
        const showEmoji  = !!flags['theme-h1-emoji'];

        // No active theme — preserve default, exit clean
        if (!resolved) {
          setReady(true);
          return;
        }

        // Set data-theme on <html>
        document.documentElement.setAttribute('data-theme', resolved.id);

        // Inject style block
        injectStyle(buildThemeCSS(resolved, showParts, showEmoji));

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.documentElement.removeAttribute('data-theme');
      removeStyle();
    };
  }, []);

  // Not ready, no theme, particles off, or not yet mounted — render nothing
  if (!ready || !theme || !particles || !mounted) return null;

  // Portal particles directly into document.body —
  // bypasses overflowX: 'hidden' on every page root div
  return createPortal(
    <>
      {theme.particles.map((p, i) => (
        <Particle key={i} p={p} index={i} />
      ))}
    </>,
    document.body
  );
}
