// app/lib/challengeDays.ts
// Challenge day helpers — fully dynamic, no hardcoded dates
// Works for any month forever
//
// v4 changes:
// — getNextCohort() added — returns next cohort slug
//   used by register/route.ts to redirect Day 7+ applicants
//   and by discord notifier for closed-cohort embeds
//
// v3 changes:
// — WEEK1_TASKS updated to week-unlock model:
//   all tasks day:1 — open from Day 1, no daily unlock
// — d3 title: 'Explore the Arena'
//   url: antcpu.cloud (mkt) / github.com/ANTCPU/ads (dev)
// — d4 title: 'First Action in the Arena'
//   url: antcpu.cloud (both tracks)
// — d5 title: 'First Submission'
//   url: antcpu.io/marketing/ (mkt) / antcpu.io/dev/ (dev)
// — getCatchUpTasks() — returns all Week 1 tasks (all open Day 1)
//   day param kept for API compat, no longer used for filtering
// — getMaxAchievable() — explicit return of Week 1 max pct (25)
//   day param kept for API compat
//
// v2 — urlMarketing added for track-split task destinations

// ─── Types ────────────────────────────────────────────────────

export type ChallengeTask = {
  day:           number;
  title:         string;
  time:          string;
  pct:           number;
  url:           string;           // dev default / shared
  urlMarketing?: string;           // marketing override — only set where tracks differ
  cta:           string;
  edu?: {
    dev?:       { label: string; url: string };
    marketing?: { label: string; url: string };
  };
};

// ─── Week 1 tasks ─────────────────────────────────────────────
// Week-unlock model: all tasks open from Day 1.
// day field kept for display compat — all set to 1.
// url          = dev track destination (or shared if no urlMarketing)
// urlMarketing = marketing track destination (only where different)
// edu.dev / edu.marketing = track-specific class shown in email

export const WEEK1_TASKS: ChallengeTask[] = [
  {
    day:   1,
    title: 'Register & Introduce Yourself',
    time:  '5 min',
    pct:   5,
    url:   'https://antcpu.io/apply/',
    cta:   'Register →',
  },
  {
    day:   1,
    title: 'Complete Your Profile',
    time:  '5 min',
    pct:   10,
    url:   'https://antcpu.io/dashboard/',
    cta:   'Go to Dashboard →',
  },
  {
    day:   1,
    title: 'Explore the Arena',
    time:  '15 min',
    pct:   15,
    url:          'https://github.com/ANTCPU/ads',   // dev → codebase
    urlMarketing: 'https://antcpu.cloud/',            // marketing → Arena
    cta:   'Open the Arena →',
    edu: {
      dev:       { label: 'Build Your First Website', url: 'https://antcpu.com/edu/classes/build-your-first-website/' },
      marketing: { label: 'Logo Creation Basics',     url: 'https://antcpu.com/edu/classes/logo-creation-basics/' },
    },
  },
  {
    day:   1,
    title: 'First Action in the Arena',
    time:  '20 min',
    pct:   20,
    url:          'https://antcpu.cloud/',            // dev → Arena
    urlMarketing: 'https://antcpu.cloud/',            // marketing → Arena
    cta:   'Go to the Arena →',
    edu: {
      dev:       { label: 'Website 101',           url: 'https://antcpu.com/edu/classes/website-101/' },
      marketing: { label: 'Social Media Graphics', url: 'https://antcpu.com/edu/classes/social-media-graphics/' },
    },
  },
  {
    day:   1,
    title: 'First Submission',
    time:  '30 min',
    pct:   22,
    url:          'https://antcpu.io/dev/',           // dev → workspace
    urlMarketing: 'https://antcpu.io/marketing/',     // marketing → workspace
    cta:   'Submit Work →',
    edu: {
      dev:       { label: 'JavaScript Essentials', url: 'https://antcpu.com/edu/classes/javascript-essentials/' },
      marketing: { label: 'Brand Identity Design', url: 'https://antcpu.com/edu/classes/brand-identity-design/' },
    },
  },
  {
    day:   1,
    title: 'Give Peer Feedback',
    time:  '15 min',
    pct:   24,
    url:   'https://antcpu.io/community/',
    cta:   'Give Feedback →',
  },
  {
    day:   1,
    title: 'Week 1 Reflection',
    time:  '10 min',
    pct:   25,
    url:          'https://antcpu.io/dev/',           // dev → workspace
    urlMarketing: 'https://antcpu.io/marketing/',     // marketing → workspace
    cta:   'Submit Reflection →',
    edu: {
      dev:       { label: 'AI Tools for Everyone', url: 'https://antcpu.com/edu/classes/ai-tools-for-everyone/' },
      marketing: { label: 'Prompt Engineering',    url: 'https://antcpu.com/edu/classes/prompt-engineering/' },
    },
  },
];

// ─── Dynamic day calculation ───────────────────────────────────
// Returns challenge day 1–31 based on EST clock.
// Day 1 = Oct 1 00:00 EST. Clamped to days in month.

export function getChallengeDay(): number {
  const TZ_OFFSET_MS   = -5 * 60 * 60 * 1000;
  const nowUTC         = new Date();
  const nowEST         = new Date(nowUTC.getTime() + TZ_OFFSET_MS);
  const year           = nowEST.getUTCFullYear();
  const month          = nowEST.getUTCMonth();
  const challengeStart = new Date(Date.UTC(year, month, 1, 5, 0, 0));
  const daysInMonth    = new Date(year, month + 1, 0).getDate();
  const raw = Math.floor(
    (nowUTC.getTime() - challengeStart.getTime()) / 86400000
  ) + 1;
  return Math.min(Math.max(raw, 0), daysInMonth);
}

// ─── Current cohort slug ───────────────────────────────────────
// Returns 'october-2026', 'november-2026', etc.
// Always reads from EST clock — no hardcoded month.

export function getChallengeCohort(): string {
  const TZ_OFFSET_MS = -5 * 60 * 60 * 1000;
  const nowEST = new Date(new Date().getTime() + TZ_OFFSET_MS);
  const months = [
    'january','february','march','april','may','june',
    'july','august','september','october','november','december'
  ];
  return `${months[nowEST.getUTCMonth()]}-${nowEST.getUTCFullYear()}`;
}

// ─── Next cohort slug ──────────────────────────────────────────
// Returns the cohort slug for the month after the current one.
// 'october-2026' → 'november-2026'
// 'december-2026' → 'january-2027'
//
// Used by:
// — register/route.ts  — redirect Day 7+ applicants to next cohort
// — discord notifier   — label closed-cohort embeds
// — apply page         — show correct waitlist CTA after close

export function getNextCohort(): string {
  const TZ_OFFSET_MS = -5 * 60 * 60 * 1000;
  const nowEST  = new Date(new Date().getTime() + TZ_OFFSET_MS);
  const month   = nowEST.getUTCMonth();
  const year    = nowEST.getUTCFullYear();
  const nextM   = (month + 1) % 12;
  const nextY   = month === 11 ? year + 1 : year;
  const months  = [
    'january','february','march','april','may','june',
    'july','august','september','october','november','december'
  ];
  return `${months[nextM]}-${nextY}`;
}

// ─── Challenge end date ────────────────────────────────────────
// Midnight EST on the 1st of next month.
// Used for countdown timers and cohort close logic.

export const CHALLENGE_END: Date = (() => {
  const TZ_OFFSET_MS = -5 * 60 * 60 * 1000;
  const nowEST    = new Date(new Date().getTime() + TZ_OFFSET_MS);
  const year      = nowEST.getUTCFullYear();
  const month     = nowEST.getUTCMonth();
  const nextMonth = month === 11 ? 0      : month + 1;
  const nextYear  = month === 11 ? year + 1 : year;
  return new Date(Date.UTC(nextYear, nextMonth, 1, 5, 0, 0));
})();

// ─── getCatchUpTasks ───────────────────────────────────────────
// Week-unlock model: all Week 1 tasks open from Day 1.
// Returns all tasks — used in registration email to show
// what's available. day param kept for API compat.

export function getCatchUpTasks(day: number): ChallengeTask[] {
  return [...WEEK1_TASKS];
}

// ─── getMaxAchievable ──────────────────────────────────────────
// All Week 1 tasks open from Day 1 — max achievable is always
// the final Week 1 gate pct (25%). day param kept for API compat.

export function getMaxAchievable(day: number): number {
  return WEEK1_TASKS[WEEK1_TASKS.length - 1].pct;
}
