// app/lib/theme.ts
// ─── Season Theme Definitions ─────────────────────────────────────────────────
//
// DEFAULT — pure #0a0a0a black. Never touched. Zero change when flags off.
//
// Visual stack when a season is active:
//   1. html background  — season gradient (bleeds through element gaps)
//   2. page surfaces    — bgLevel CSS overrides (lifted from black)
//   3. particles        — fixed overlay, float above everything
//
// BgLevel ladder:
//   dark        #0a0a0a  — default, never applied via CSS
//   dark-grey   #111111  — one step above black (summer)
//   grey        #1a1a1a  — subtle lift (fall)
//   light-grey  #2a2a2a  — noticeable shift (spring)
//   white       #f5f5f5  — full flip (winter)
//
// Accent colors (orange, gold, teal, blue, purple) are NEVER overridden.
// Brand identity is fully preserved at every level.
//
// v2 changes:
//   - Fall particles: clip-path removed — was rendering black in all browsers
//     Replaced with organic border-radius shapes, opacity raised to 0.55–0.75
//   - brightnessToLevel() added — used by ThemeProvider + ThemeSwitcher
//   - h1 emoji CSS hardened in buildThemeCSS — !important + broader selectors
//
// ─────────────────────────────────────────────────────────────────────────────

export type SeasonId = 'fall' | 'winter' | 'spring' | 'summer';
export type BgLevel = 'dark' | 'dark-grey' | 'grey' | 'grey-2' | 'grey-3' | 'light-grey' | 'white';

// ─── Particle shape ───────────────────────────────────────────────────────────

export type ParticleShape = {
  w:       number;   // width px
  h:       number;   // height px
  left:    number;   // left % of viewport
  delay:   number;   // animation delay seconds
  dur:     number;   // animation duration seconds
  color:   string;   // CSS color
  radius:  string;   // border-radius — use elliptical syntax for leaf shapes
  clip?:   string;   // clip-path — NOT used for fall (renders black in browsers)
  opacity: number;
  anim:    string;   // keyframe name
};

// ─── Season theme shape ───────────────────────────────────────────────────────

export type SeasonTheme = {
  id:        SeasonId;
  label:     string;
  gradient:  string;
  bgLevel:   BgLevel;
  h1Emoji:   string;
  particles: ParticleShape[];
  keyframes: string;
};

// ─── BgLevel definitions ──────────────────────────────────────────────────────

export type BgTokens = {
  htmlBg:    string;
  pageBg:    string;
  cardBg:    string;
  altBg:     string;
  borderCol: string;
  textCol:   string;
  mutedCol:  string;
  muted2Col: string;
};

export const BG_LEVELS: Record<BgLevel, BgTokens> = {

  dark: {
    htmlBg:    '#0a0a0a',
    pageBg:    '#0a0a0a',
    cardBg:    '#111111',
    altBg:     '#0d0d0d',
    borderCol: '#1a1a1a',
    textCol:   '#ffffff',
    mutedCol:  '#888888',
    muted2Col: '#555555',
  },

  'dark-grey': {
    htmlBg:    '#111111',
    pageBg:    '#111111',
    cardBg:    '#181818',
    altBg:     '#141414',
    borderCol: '#222222',
    textCol:   '#f0f0f0',
    mutedCol:  '#888888',
    muted2Col: '#555555',
  },

  grey: {
    htmlBg:    '#1a1a1a',
    pageBg:    '#1a1a1a',
    cardBg:    '#222222',
    altBg:     '#1e1e1e',
    borderCol: '#2e2e2e',
    textCol:   '#f0f0f0',
    mutedCol:  '#999999',
    muted2Col: '#666666',
  },
  'grey-2': {
    // Second grey step — fall mid, spring base
    htmlBg:    '#202020',
    pageBg:    '#202020',
    cardBg:    '#282828',
    altBg:     '#242424',
    borderCol: '#363636',
    textCol:   '#f0f0f0',
    mutedCol:  '#a0a0a0',
    muted2Col: '#6e6e6e',
  },

  'grey-3': {
    // Third grey step — noticeably lighter, still dark-mode feel
    htmlBg:    '#262626',
    pageBg:    '#262626',
    cardBg:    '#2e2e2e',
    altBg:     '#2a2a2a',
    borderCol: '#3e3e3e',
    textCol:   '#f2f2f2',
    mutedCol:  '#a8a8a8',
    muted2Col: '#747474',
  },

  'light-grey': {
    htmlBg:    '#2a2a2a',
    pageBg:    '#2a2a2a',
    cardBg:    '#333333',
    altBg:     '#2e2e2e',
    borderCol: '#444444',
    textCol:   '#f5f5f5',
    mutedCol:  '#aaaaaa',
    muted2Col: '#777777',
  },

  white: {
    htmlBg:    '#f5f5f5',
    pageBg:    '#f5f5f5',
    cardBg:    '#ffffff',
    altBg:     '#eeeeee',
    borderCol: '#e0e0e0',
    textCol:   '#0a0a0a',
    mutedCol:  '#555555',
    muted2Col: '#888888',
  },

};

// ─── Brightness resolver ──────────────────────────────────────────────────────
// Maps user brightness choice (dark/mid/light) onto the season's bgLevel.
// dark  → season default unchanged
// mid   → one step lighter than season default
// light → two steps lighter
// Used by ThemeProvider on mount + on brightness change event.

const LEVEL_ORDER: BgLevel[] = [
  'dark', 'dark-grey', 'grey', 'grey-2', 'grey-3', 'light-grey', 'white',
];

export function brightnessToLevel(
  seasonDefault: BgLevel,
  brightness:    'dark' | 'mid' | 'light',
): BgLevel {
  const base    = LEVEL_ORDER.indexOf(seasonDefault);
  const offsets = { dark: 0, mid: 1, light: 2 };
  const idx     = Math.min(base + offsets[brightness], LEVEL_ORDER.length - 1);
  return LEVEL_ORDER[idx];
}

// ─── Keyframe animations ──────────────────────────────────────────────────────

const KEYFRAMES_FALL = `
  @keyframes drift-fall {
    0%   { transform: translateY(-60px)  translateX(0px)    rotate(0deg);   opacity: 0; }
    5%   { opacity: 1; }
    85%  { opacity: 1; }
    100% { transform: translateY(110vh)  translateX(-140px) rotate(380deg); opacity: 0; }
  }
`;

const KEYFRAMES_SNOW = `
  @keyframes drift-snow {
    0%   { transform: translateY(-20px) translateX(0px);  opacity: 0; }
    8%   { opacity: 1; }
    90%  { opacity: 1; }
    100% { transform: translateY(110vh) translateX(30px);  opacity: 0; }
  }
  @keyframes sway-snow {
    0%,100% { margin-left: 0px;  }
    50%     { margin-left: 18px; }
  }
`;

const KEYFRAMES_PETAL = `
  @keyframes drift-petal {
    0%   { transform: translateY(-30px) translateX(0px)  rotate(0deg);   opacity: 0; }
    6%   { opacity: 1; }
    88%  { opacity: 1; }
    100% { transform: translateY(110vh) translateX(60px) rotate(180deg); opacity: 0; }
  }
`;

const KEYFRAMES_ORB = `
  @keyframes pulse-orb {
    0%,100% { transform: scale(1);    opacity: 0.08; }
    50%     { transform: scale(1.15); opacity: 0.18; }
  }
`;

// ─── Season themes ────────────────────────────────────────────────────────────

export const THEME_FALL: SeasonTheme = {
  id:       'fall',
  label:    '🍂 Fall',
  bgLevel:  'grey',
  h1Emoji:  '🎃',
  gradient: `linear-gradient(
    160deg,
    #1a1a1a  0%,
    #1f1100 40%,
    #2a1500 70%,
    #1a1000 100%
  )`,
  keyframes: KEYFRAMES_FALL,
  particles: [
    // ── No clip-path — renders black in browsers when combined with background
    // ── Using elliptical border-radius for organic leaf shapes instead
    // ── Opacity raised to 0.55–0.75 — colors now fully visible

    // Large — orange teardrop
    { w: 22, h: 28, left: 8,  delay: 0,   dur: 16, color: '#f0883e', radius: '80% 20% 80% 20% / 20% 80% 20% 80%', opacity: 0.72, anim: 'drift-fall' },
    // Large — gold oval
    { w: 18, h: 24, left: 22, delay: 3,   dur: 14, color: '#D4AF37', radius: '50% 80% 50% 80% / 80% 50% 80% 50%', opacity: 0.68, anim: 'drift-fall' },
    // Large — brown teardrop
    { w: 20, h: 26, left: 45, delay: 6,   dur: 18, color: '#8B4513', radius: '70% 30% 70% 30% / 30% 70% 30% 70%', opacity: 0.65, anim: 'drift-fall' },
    // Large — orange asymmetric
    { w: 16, h: 22, left: 68, delay: 1.5, dur: 15, color: '#f0883e', radius: '60% 40% 60% 40% / 40% 60% 40% 60%', opacity: 0.70, anim: 'drift-fall' },
    // Large — gold teardrop
    { w: 24, h: 30, left: 82, delay: 8,   dur: 20, color: '#D4AF37', radius: '80% 20% 80% 20% / 20% 80% 20% 80%', opacity: 0.66, anim: 'drift-fall' },
    // Medium — late-season green
    { w: 14, h: 18, left: 15, delay: 10,  dur: 13, color: '#22c55e', radius: '50% 80% 50% 80% / 80% 50% 80% 50%', opacity: 0.60, anim: 'drift-fall' },
    // Medium — brown oval
    { w: 12, h: 16, left: 55, delay: 4.5, dur: 17, color: '#8B4513', radius: '70% 30% 70% 30% / 30% 70% 30% 70%', opacity: 0.62, anim: 'drift-fall' },
    // Medium — orange
    { w: 16, h: 20, left: 75, delay: 12,  dur: 14, color: '#f0883e', radius: '60% 40% 60% 40% / 40% 60% 40% 60%', opacity: 0.60, anim: 'drift-fall' },
    // Small — gold
    { w: 10, h: 14, left: 33, delay: 7,   dur: 12, color: '#D4AF37', radius: '80% 20% 80% 20% / 20% 80% 20% 80%', opacity: 0.58, anim: 'drift-fall' },
    // Small — green
    { w: 10, h: 14, left: 90, delay: 2,   dur: 19, color: '#22c55e', radius: '50% 80% 50% 80% / 80% 50% 80% 50%', opacity: 0.55, anim: 'drift-fall' },
  ],
};

export const THEME_WINTER: SeasonTheme = {
  id:       'winter',
  label:    '❄️ Winter',
  bgLevel:  'white',
  h1Emoji:  '❄️',
  gradient: `linear-gradient(
    160deg,
    #f5f5f5  0%,
    #eef4ff 40%,
    #e8f0fe 70%,
    #f0f4ff 100%
  )`,
  keyframes: KEYFRAMES_SNOW,
  particles: [
    // Blue-tinted — visible against white bgLevel
    { w: 10, h: 10, left: 10, delay: 0,   dur: 12, color: '#aaccff', radius: '50%', opacity: 0.55, anim: 'drift-snow' },
    { w: 7,  h: 7,  left: 25, delay: 2,   dur: 10, color: '#cce0ff', radius: '50%', opacity: 0.50, anim: 'drift-snow' },
    { w: 9,  h: 9,  left: 40, delay: 5,   dur: 14, color: '#aaccff', radius: '50%', opacity: 0.52, anim: 'drift-snow' },
    { w: 8,  h: 8,  left: 58, delay: 1,   dur: 11, color: '#cce0ff', radius: '50%', opacity: 0.48, anim: 'drift-snow' },
    { w: 10, h: 10, left: 72, delay: 7,   dur: 13, color: '#aaccff', radius: '50%', opacity: 0.55, anim: 'drift-snow' },
    { w: 6,  h: 6,  left: 88, delay: 3,   dur: 9,  color: '#cce0ff', radius: '50%', opacity: 0.45, anim: 'drift-snow' },
    { w: 4,  h: 4,  left: 18, delay: 9,   dur: 8,  color: '#aaccff', radius: '50%', opacity: 0.42, anim: 'drift-snow' },
    { w: 5,  h: 5,  left: 35, delay: 4,   dur: 15, color: '#cce0ff', radius: '50%', opacity: 0.45, anim: 'drift-snow' },
    { w: 4,  h: 4,  left: 62, delay: 11,  dur: 10, color: '#aaccff', radius: '50%', opacity: 0.40, anim: 'drift-snow' },
    { w: 5,  h: 5,  left: 80, delay: 6,   dur: 12, color: '#cce0ff', radius: '50%', opacity: 0.42, anim: 'drift-snow' },
    { w: 4,  h: 4,  left: 50, delay: 8,   dur: 11, color: '#aaccff', radius: '50%', opacity: 0.40, anim: 'drift-snow' },
    { w: 6,  h: 6,  left: 95, delay: 0.5, dur: 14, color: '#cce0ff', radius: '50%', opacity: 0.45, anim: 'drift-snow' },
  ],
};

export const THEME_SPRING: SeasonTheme = {
  id:       'spring',
  label:    '🌸 Spring',
  bgLevel:  'light-grey',
  h1Emoji:  '🌸',
  gradient: `linear-gradient(
    160deg,
    #2a2a2a  0%,
    #1a2a1e 40%,
    #1e3024 70%,
    #1a2820 100%
  )`,
  keyframes: KEYFRAMES_PETAL,
  particles: [
    { w: 18, h: 12, left: 7,  delay: 0,   dur: 14, color: '#ff80ab', radius: '50% 30% 50% 30% / 30% 50% 30% 50%', opacity: 0.65, anim: 'drift-petal' },
    { w: 14, h: 10, left: 28, delay: 3,   dur: 16, color: '#ffb3c6', radius: '40% 60% 40% 60% / 60% 40% 60% 40%', opacity: 0.60, anim: 'drift-petal' },
    { w: 16, h: 11, left: 50, delay: 7,   dur: 13, color: '#a8e6cf', radius: '50% 30% 50% 30% / 30% 50% 30% 50%', opacity: 0.58, anim: 'drift-petal' },
    { w: 18, h: 12, left: 70, delay: 1.5, dur: 17, color: '#ff80ab', radius: '30% 50% 30% 50% / 50% 30% 50% 30%', opacity: 0.65, anim: 'drift-petal' },
    { w: 14, h: 10, left: 88, delay: 9,   dur: 15, color: '#ffb3c6', radius: '50% 40% 50% 40% / 40% 50% 40% 50%', opacity: 0.58, anim: 'drift-petal' },
    { w: 10, h: 7,  left: 18, delay: 5,   dur: 12, color: '#a8e6cf', radius: '50% 30% 50% 30% / 30% 50% 30% 50%', opacity: 0.55, anim: 'drift-petal' },
    { w: 8,  h: 6,  left: 40, delay: 11,  dur: 18, color: '#ff80ab', radius: '40% 60% 40% 60% / 60% 40% 60% 40%', opacity: 0.52, anim: 'drift-petal' },
    { w: 10, h: 7,  left: 60, delay: 4,   dur: 14, color: '#ffb3c6', radius: '50% 30% 50% 30% / 30% 50% 30% 50%', opacity: 0.55, anim: 'drift-petal' },
  ],
};

export const THEME_SUMMER: SeasonTheme = {
  id:       'summer',
  label:    '☀️ Summer',
  bgLevel:  'dark-grey',
  h1Emoji:  '☀️',
  gradient: `linear-gradient(
    160deg,
    #111111  0%,
    #1a1200 40%,
    #221800 70%,
    #181000 100%
  )`,
  keyframes: KEYFRAMES_ORB,
  particles: [
    // Orbs — heat shimmer. Colors use full hex, opacity on the element not the color.
    { w: 80,  h: 80,  left: 10, delay: 0,   dur: 7, color: '#D4AF37', radius: '50%', opacity: 0.06, anim: 'pulse-orb' },
    { w: 120, h: 120, left: 55, delay: 2.5, dur: 9, color: '#fff8e1', radius: '50%', opacity: 0.05, anim: 'pulse-orb' },
    { w: 60,  h: 60,  left: 80, delay: 5,   dur: 6, color: '#D4AF37', radius: '50%', opacity: 0.05, anim: 'pulse-orb' },
    { w: 40,  h: 40,  left: 30, delay: 1,   dur: 8, color: '#f0883e', radius: '50%', opacity: 0.04, anim: 'pulse-orb' },
    { w: 50,  h: 50,  left: 70, delay: 4,   dur: 7, color: '#D4AF37', radius: '50%', opacity: 0.05, anim: 'pulse-orb' },
    { w: 25,  h: 25,  left: 45, delay: 3,   dur: 5, color: '#fff8e1', radius: '50%', opacity: 0.04, anim: 'pulse-orb' },
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

export function buildThemeCSS(
  theme:         SeasonTheme,
  showParticles: boolean,
  showH1Emoji:   boolean,
): string {
  const lines: string[] = [];
  const t  = theme.id;
  const lv = BG_LEVELS[theme.bgLevel];

  // 1. Html + body
  lines.push(`
    html[data-theme="${t}"] {
      background: ${theme.gradient};
      min-height: 100vh;
    }
    html[data-theme="${t}"] body {
      background: ${lv.htmlBg};
      color:      ${lv.textCol};
      min-height: 100vh;
    }
  `);

  // 2. Page root divs
  lines.push(`
    html[data-theme="${t}"] body > div {
      background: ${lv.pageBg} !important;
      color:      ${lv.textCol} !important;
    }
  `);

  // 3. Inline style overrides
  lines.push(`
    html[data-theme="${t}"] [style*="background: rgb(10, 10, 10)"],
    html[data-theme="${t}"] [style*="background: #0a0a0a"],
    html[data-theme="${t}"] [style*="background:#0a0a0a"] {
      background: ${lv.pageBg} !important;
    }
    html[data-theme="${t}"] [style*="background: rgb(17, 17, 17)"],
    html[data-theme="${t}"] [style*="background: #111111"],
    html[data-theme="${t}"] [style*="background: #111"],
    html[data-theme="${t}"] [style*="background:#111"] {
      background: ${lv.cardBg} !important;
    }
    html[data-theme="${t}"] [style*="background: rgb(13, 13, 13)"],
    html[data-theme="${t}"] [style*="background: #0d0d0d"],
    html[data-theme="${t}"] [style*="background:#0d0d0d"] {
      background: ${lv.altBg} !important;
    }
    html[data-theme="${t}"] [style*="background: rgb(10, 10, 10)"][style*="border"],
    html[data-theme="${t}"] [style*="background: #0a0a0a"][style*="border"] {
      background:   ${lv.cardBg}   !important;
      border-color: ${lv.borderCol} !important;
    }
  `);

  // 4. Nav + footer
  lines.push(`
    html[data-theme="${t}"] nav {
      background:          ${lv.pageBg}   !important;
      border-bottom-color: ${lv.borderCol} !important;
    }
    html[data-theme="${t}"] footer {
      background:      ${lv.pageBg}   !important;
      border-top-color:${lv.borderCol} !important;
    }
  `);

  // 5. Text cascade
  lines.push(`
    html[data-theme="${t}"] [style*="color: rgb(136, 136, 136)"],
    html[data-theme="${t}"] [style*="color: #888"] {
      color: ${lv.mutedCol} !important;
    }
    html[data-theme="${t}"] [style*="color: rgb(85, 85, 85)"],
    html[data-theme="${t}"] [style*="color: #555"] {
      color: ${lv.muted2Col} !important;
    }
  `);

  // 6. H1 emoji — hardened with !important + broad selectors
  if (showH1Emoji) {
    lines.push(`
      html[data-theme="${t}"] h1::before,
      html[data-theme="${t}"] main h1::before,
      html[data-theme="${t}"] section h1::before,
      html[data-theme="${t}"] div h1::before {
        content: '${theme.h1Emoji} ' !important;
        display: inline !important;
      }
    `);
  }

  // 7. Particle keyframes
  if (showParticles) {
    lines.push(theme.keyframes);
  }

  return lines.join('\n');
}
