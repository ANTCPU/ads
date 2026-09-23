// app/lib/theme.ts
// ─── Season Theme Definitions ─────────────────────────────────────────────────
//
// The DEFAULT theme is the existing ANTCPU dark design — #0a0a0a black.
// It is never modified. All season themes layer ON TOP of it.
//
// When all theme flags are off → default renders, zero change to the site.
//
// Each season theme defines:
//   gradient   — applied to <html> background, bleeds through section gaps
//   particles  — shapes that drift as a fixed overlay above the page
//   h1Emoji    — prepended to all h1 elements via CSS ::before
//   cssVars    — injected as :root overrides (future use — empty for now)
//
// Gradient design principle:
//   All gradients START from #0a0a0a — the existing black.
//   The shift is subtle on dark pages — warmth/coolness tints in gaps.
//   Intensity is controlled by the gradient stop percentages.
//   Future: a theme-gradient-intensity flag shifts stops further for
//   grey → light progression without touching any page token.
//
// Particle design principle:
//   Fixed position, pointer-events: none, z-index: 1.
//   Sit ABOVE the page background but BELOW interactive content (z-index: 2+).
//   Opacity kept low — atmospheric, not distracting.
//   Pure CSS animation — no canvas, no images, no external deps.
//
// ─────────────────────────────────────────────────────────────────────────────

export type SeasonId = 'fall' | 'winter' | 'spring' | 'summer';

export type ParticleShape = {
  // Size in px
  w:     number;
  h:     number;
  // Position — left % of viewport
  left:  number;
  // Animation delay in seconds
  delay: number;
  // Animation duration in seconds
  dur:   number;
  // CSS color
  color: string;
  // Border radius — e.g. '50%' for circle, '3px' for leaf
  radius: string;
  // Optional CSS clip-path for leaf shapes
  clip?: string;
  // Opacity
  opacity: number;
  // Which keyframe animation to use
  anim: string;
};

export type SeasonTheme = {
  id:        SeasonId;
  label:     string;
  // CSS gradient string applied to html element background
  gradient:  string;
  // Emoji prepended to h1 via ::before when theme-h1-emoji flag is on
  h1Emoji:   string;
  // Particle definitions
  particles: ParticleShape[];
  // CSS keyframe animation blocks — injected into the <style> tag
  keyframes: string;
};

// ─── Shared keyframe animations ───────────────────────────────────────────────

const KEYFRAMES_FALL = `
  @keyframes drift-fall {
    0%   { transform: translateY(-40px) translateX(0px)   rotate(0deg);   opacity: 0;   }
    5%   { opacity: 1; }
    85%  { opacity: 1; }
    100% { transform: translateY(110vh) translateX(-120px) rotate(360deg); opacity: 0;   }
  }
`;

const KEYFRAMES_SNOW = `
  @keyframes drift-snow {
    0%   { transform: translateY(-20px) translateX(0px);  opacity: 0;   }
    8%   { opacity: 1; }
    90%  { opacity: 1; }
    100% { transform: translateY(110vh) translateX(30px);  opacity: 0;   }
  }
  @keyframes sway-snow {
    0%,100% { margin-left: 0px;  }
    50%     { margin-left: 18px; }
  }
`;

const KEYFRAMES_PETAL = `
  @keyframes drift-petal {
    0%   { transform: translateY(-30px) translateX(0px)   rotate(0deg);   opacity: 0;   }
    6%   { opacity: 1; }
    88%  { opacity: 1; }
    100% { transform: translateY(110vh) translateX(60px)  rotate(180deg); opacity: 0;   }
  }
`;

const KEYFRAMES_ORB = `
  @keyframes pulse-orb {
    0%,100% { transform: scale(1);    opacity: 0.08; }
    50%     { transform: scale(1.15); opacity: 0.15; }
  }
`;

// ─── Fall — Season 1 🍂 ───────────────────────────────────────────────────────
// Warm amber tint bleeding through section gaps.
// Leaf shapes drift diagonally down-left.

const FALL_LEAF_CLIP =
  'polygon(50% 0%, 80% 20%, 100% 50%, 80% 80%, 50% 100%, 20% 80%, 0% 50%, 20% 20%)';

const FALL_LEAF_CLIP_2 =
  'polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)';

export const THEME_FALL: SeasonTheme = {
  id:       'fall',
  label:    '🍂 Fall',
  gradient: `linear-gradient(
    160deg,
    #0a0a0a    0%,
    #0f0900   35%,
    #1a0d00   65%,
    #0a0800  100%
  )`,
  h1Emoji:  '🎃',
  keyframes: KEYFRAMES_FALL,
  particles: [
    // Large leaves
    { w: 22, h: 22, left: 8,  delay: 0,    dur: 16, color: '#f0883e', radius: '3px', clip: FALL_LEAF_CLIP,   opacity: 0.28, anim: 'drift-fall' },
    { w: 18, h: 18, left: 22, delay: 3,    dur: 14, color: '#D4AF37', radius: '3px', clip: FALL_LEAF_CLIP_2, opacity: 0.24, anim: 'drift-fall' },
    { w: 20, h: 20, left: 45, delay: 6,    dur: 18, color: '#8B4513', radius: '3px', clip: FALL_LEAF_CLIP,   opacity: 0.20, anim: 'drift-fall' },
    { w: 16, h: 16, left: 68, delay: 1.5,  dur: 15, color: '#f0883e', radius: '3px', clip: FALL_LEAF_CLIP_2, opacity: 0.26, anim: 'drift-fall' },
    { w: 24, h: 24, left: 82, delay: 8,    dur: 20, color: '#D4AF37', radius: '3px', clip: FALL_LEAF_CLIP,   opacity: 0.22, anim: 'drift-fall' },
    // Medium leaves
    { w: 14, h: 14, left: 15, delay: 10,   dur: 13, color: '#22c55e', radius: '2px', clip: FALL_LEAF_CLIP_2, opacity: 0.18, anim: 'drift-fall' },
    { w: 12, h: 12, left: 55, delay: 4.5,  dur: 17, color: '#8B4513', radius: '2px', clip: FALL_LEAF_CLIP,   opacity: 0.22, anim: 'drift-fall' },
    { w: 16, h: 16, left: 75, delay: 12,   dur: 14, color: '#f0883e', radius: '2px', clip: FALL_LEAF_CLIP_2, opacity: 0.20, anim: 'drift-fall' },
    // Small leaves
    { w: 10, h: 10, left: 33, delay: 7,    dur: 12, color: '#D4AF37', radius: '2px', clip: FALL_LEAF_CLIP,   opacity: 0.18, anim: 'drift-fall' },
    { w: 10, h: 10, left: 90, delay: 2,    dur: 19, color: '#22c55e', radius: '2px', clip: FALL_LEAF_CLIP_2, opacity: 0.16, anim: 'drift-fall' },
  ],
};

// ─── Winter — Season 2 ❄️ ─────────────────────────────────────────────────────
// Cool blue-black tint. Snowflakes drift straight down with gentle sway.

export const THEME_WINTER: SeasonTheme = {
  id:       'winter',
  label:    '❄️ Winter',
  gradient: `linear-gradient(
    160deg,
    #0a0a0a    0%,
    #050a12   40%,
    #0a0f1a   70%,
    #060810  100%
  )`,
  h1Emoji:  '❄️',
  keyframes: KEYFRAMES_SNOW,
  particles: [
    // Large flakes
    { w: 10, h: 10, left: 10, delay: 0,   dur: 12, color: '#ffffff', radius: '50%', opacity: 0.20, anim: 'drift-snow' },
    { w: 7,  h: 7,  left: 25, delay: 2,   dur: 10, color: '#e0f0ff', radius: '50%', opacity: 0.16, anim: 'drift-snow' },
    { w: 9,  h: 9,  left: 40, delay: 5,   dur: 14, color: '#ffffff', radius: '50%', opacity: 0.18, anim: 'drift-snow' },
    { w: 8,  h: 8,  left: 58, delay: 1,   dur: 11, color: '#e0f0ff', radius: '50%', opacity: 0.14, anim: 'drift-snow' },
    { w: 10, h: 10, left: 72, delay: 7,   dur: 13, color: '#ffffff', radius: '50%', opacity: 0.20, anim: 'drift-snow' },
    { w: 6,  h: 6,  left: 88, delay: 3,   dur: 9,  color: '#e0f0ff', radius: '50%', opacity: 0.14, anim: 'drift-snow' },
    // Small flakes
    { w: 4,  h: 4,  left: 18, delay: 9,   dur: 8,  color: '#ffffff', radius: '50%', opacity: 0.12, anim: 'drift-snow' },
    { w: 5,  h: 5,  left: 35, delay: 4,   dur: 15, color: '#e0f0ff', radius: '50%', opacity: 0.14, anim: 'drift-snow' },
    { w: 4,  h: 4,  left: 62, delay: 11,  dur: 10, color: '#ffffff', radius: '50%', opacity: 0.10, anim: 'drift-snow' },
    { w: 5,  h: 5,  left: 80, delay: 6,   dur: 12, color: '#e0f0ff', radius: '50%', opacity: 0.12, anim: 'drift-snow' },
    { w: 4,  h: 4,  left: 50, delay: 8,   dur: 11, color: '#ffffff', radius: '50%', opacity: 0.10, anim: 'drift-snow' },
    { w: 6,  h: 6,  left: 95, delay: 0.5, dur: 14, color: '#e0f0ff', radius: '50%', opacity: 0.14, anim: 'drift-snow' },
  ],
};

// ─── Spring — Season 3 🌸 ─────────────────────────────────────────────────────
// Soft green-black tint. Petals tumble and float.

export const THEME_SPRING: SeasonTheme = {
  id:       'spring',
  label:    '🌸 Spring',
  gradient: `linear-gradient(
    160deg,
    #0a0a0a    0%,
    #050f08   40%,
    #0a1a0d   70%,
    #060a07  100%
  )`,
  h1Emoji:  '🌸',
  keyframes: KEYFRAMES_PETAL,
  particles: [
    // Large petals
    { w: 18, h: 12, left: 7,  delay: 0,   dur: 14, color: '#ff80ab', radius: '50% 30%', opacity: 0.22, anim: 'drift-petal' },
    { w: 14, h: 10, left: 28, delay: 3,   dur: 16, color: '#ffb3c6', radius: '40% 50%', opacity: 0.20, anim: 'drift-petal' },
    { w: 16, h: 11, left: 50, delay: 7,   dur: 13, color: '#a8e6cf', radius: '50% 30%', opacity: 0.18, anim: 'drift-petal' },
    { w: 18, h: 12, left: 70, delay: 1.5, dur: 17, color: '#ff80ab', radius: '30% 50%', opacity: 0.22, anim: 'drift-petal' },
    { w: 14, h: 10, left: 88, delay: 9,   dur: 15, color: '#ffb3c6', radius: '50% 40%', opacity: 0.18, anim: 'drift-petal' },
    // Small petals
    { w: 10, h: 7,  left: 18, delay: 5,   dur: 12, color: '#a8e6cf', radius: '50% 30%', opacity: 0.16, anim: 'drift-petal' },
    { w: 8,  h: 6,  left: 40, delay: 11,  dur: 18, color: '#ff80ab', radius: '40% 50%', opacity: 0.14, anim: 'drift-petal' },
    { w: 10, h: 7,  left: 60, delay: 4,   dur: 14, color: '#ffb3c6', radius: '50% 30%', opacity: 0.16, anim: 'drift-petal' },
  ],
};

// ─── Summer — Season 4 ☀️ ─────────────────────────────────────────────────────
// Warm gold-black tint. Slow pulsing light orbs — heat shimmer effect.

export const THEME_SUMMER: SeasonTheme = {
  id:       'summer',
  label:    '☀️ Summer',
  gradient: `linear-gradient(
    160deg,
    #0a0a0a    0%,
    #0f0a00   40%,
    #1a1000   70%,
    #0a0800  100%
  )`,
  h1Emoji:  '☀️',
  keyframes: KEYFRAMES_ORB,
  particles: [
    // Large orbs — heat shimmer
    { w: 80,  h: 80,  left: 10, delay: 0,   dur: 7,  color: '#D4AF3712', radius: '50%', opacity: 0.12, anim: 'pulse-orb' },
    { w: 120, h: 120, left: 55, delay: 2.5, dur: 9,  color: '#fff8e10e', radius: '50%', opacity: 0.10, anim: 'pulse-orb' },
    { w: 60,  h: 60,  left: 80, delay: 5,   dur: 6,  color: '#D4AF3710', radius: '50%', opacity: 0.10, anim: 'pulse-orb' },
    // Medium orbs
    { w: 40,  h: 40,  left: 30, delay: 1,   dur: 8,  color: '#f0883e0e', radius: '50%', opacity: 0.08, anim: 'pulse-orb' },
    { w: 50,  h: 50,  left: 70, delay: 4,   dur: 7,  color: '#D4AF3710', radius: '50%', opacity: 0.10, anim: 'pulse-orb' },
    // Small orbs
    { w: 25,  h: 25,  left: 45, delay: 3,   dur: 5,  color: '#fff8e10c', radius: '50%', opacity: 0.08, anim: 'pulse-orb' },
  ],
};

// ─── Theme registry ───────────────────────────────────────────────────────────

export const THEMES: Record<SeasonId, SeasonTheme> = {
  fall:   THEME_FALL,
  winter: THEME_WINTER,
  spring: THEME_SPRING,
  summer: THEME_SUMMER,
};

// ─── Resolver ─────────────────────────────────────────────────────────────────
// Reads the flag map and returns the active season.
// Only one season should be active at a time.
// If multiple are on (misconfiguration), fall wins.
// If none are on, returns null — default dark theme, no changes.

export function resolveTheme(
  flags: Record<string, boolean>
): SeasonTheme | null {
  const order: SeasonId[] = ['fall', 'winter', 'spring', 'summer'];
  for (const id of order) {
    if (flags[`theme-${id}`]) return THEMES[id];
  }
  return null;
}

// ─── CSS builder ──────────────────────────────────────────────────────────────
// Builds the full <style> block injected by ThemeProvider.
// Called once on mount and on flag change.

export function buildThemeCSS(
  theme:        SeasonTheme,
  showParticles: boolean,
  showH1Emoji:   boolean,
): string {
  const lines: string[] = [];

  // 1. Html background gradient
  lines.push(`
    html[data-theme="${theme.id}"] {
      background: ${theme.gradient};
      min-height: 100vh;
    }
  `);

  // 2. H1 emoji via ::before — survives React re-renders
  if (showH1Emoji) {
    lines.push(`
      html[data-theme="${theme.id}"] h1::before {
        content: '${theme.h1Emoji} ';
      }
    `);
  }

  // 3. Particle keyframes — only injected when particles are on
  if (showParticles) {
    lines.push(theme.keyframes);
  }

  return lines.join('\n');
}
