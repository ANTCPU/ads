// ============================================================
// app/lib/challengeDays.ts
// Challenge calendar — single source of truth for all
// day-aware logic across the ads network.
//
// CHALLENGE_START = midnight EDT Aug 1 = 04:00 UTC
// Week 1 = Days 1–7 (Aug 1–7)
// Week 2 = Days 8–14 (Aug 8–14)
// Week 3 = Days 15–21 (Aug 15–21)
// Week 4 = Days 22–31 (Aug 22–31)
//
// To use next month: update CHALLENGE_START and CHALLENGE_END.
// Everything else recalculates automatically.
// ============================================================

export const CHALLENGE_START = new Date('2026-08-01T04:00:00.000Z'); // midnight EDT
export const CHALLENGE_END   = new Date('2026-09-01T04:00:00.000Z'); // end of Aug 31
export const WEEK1_END       = new Date('2026-08-08T04:00:00.000Z'); // end of Day 7

export function getChallengeDay(): number {
  const now = new Date();
  if (now < CHALLENGE_START) return 0;   // pre-challenge
  if (now >= CHALLENGE_END)  return 32;  // post-challenge
  return Math.floor((now.getTime() - CHALLENGE_START.getTime()) / 86400000) + 1;
}

export function getChallengeWeek(): 0 | 1 | 2 | 3 | 4 {
  const d = getChallengeDay();
  if (d <= 0)  return 0;
  if (d <= 7)  return 1;
  if (d <= 14) return 2;
  if (d <= 21) return 3;
  return 4;
}

export function isWeek1Open(): boolean {
  const d = getChallengeDay();
  return d >= 1 && d <= 7;
}

export function isChallengeOpen(): boolean {
  const d = getChallengeDay();
  return d >= 1 && d <= 31;
}

// ─── Week 1 task registry ─────────────────────────────────
// Used by: register email, success page, catch-up checklist
// Reusable: swap tasks each month by updating this array only

export type ChallengeTask = {
  day:   number;
  title: string;
  time:  string;   // human estimate
  pct:   number;   // progress % awarded
  url:   string;   // where to complete it
  cta:   string;   // button label
  edu?: {          // optional EDU class tie-in
    dev?:       { label: string; url: string };
    marketing?: { label: string; url: string };
  };
};

export const WEEK1_TASKS: ChallengeTask[] = [
  {
    day: 1, title: 'Register & Introduce Yourself', time: '5 min', pct: 5,
    url: 'https://antcpu.io/apply/', cta: 'Register on antcpu.io',
  },
  {
    day: 2, title: 'Complete Your Profile', time: '5 min', pct: 5,
    url: 'https://antcpu.io/dashboard/', cta: 'Open Dashboard',
  },
  {
    day: 3, title: 'Explore Workspace + EDU + Arena', time: '15 min', pct: 5,
    url: 'https://antcpu.io/dev/', cta: 'Open Workspace',
    edu: {
      dev:       { label: 'Build Your First Website', url: 'https://antcpu.com/edu/classes/build-your-first-website/' },
      marketing: { label: 'Logo Creation Basics',     url: 'https://antcpu.com/edu/classes/logo-creation-basics/' },
    },
  },
  {
    day: 4, title: 'Show Your Best Work', time: '20 min', pct: 5,
    url: 'https://antcpu.io/dashboard/', cta: 'Submit Work',
  },
  {
    day: 5, title: 'Join the Community Session', time: '10 min', pct: 2,
    url: 'https://antcpu.io/community/', cta: 'Community Feed',
  },
  {
    day: 6, title: 'Give Peer Feedback', time: '10 min', pct: 2,
    url: 'https://antcpu.io/community/', cta: 'Give Feedback',
  },
  {
    day: 7, title: 'Week 1 Reflection', time: '10 min', pct: 1,
    url: 'https://antcpu.io/dashboard/', cta: 'Write Reflection',
    edu: {
      dev:       { label: 'Website 101 — get ahead for Week 2', url: 'https://antcpu.com/edu/classes/website-101/' },
      marketing: { label: 'Logo Creation Basics — finish strong', url: 'https://antcpu.com/edu/classes/logo-creation-basics/' },
    },
  },
];

// ─── Catch-up helper ──────────────────────────────────────
// Returns tasks a late signup still needs to complete
// given the current day. Day 1 = all tasks. Day 5 = tasks 5–7.

export function getCatchUpTasks(currentDay: number): ChallengeTask[] {
  if (currentDay <= 1) return WEEK1_TASKS;
  // Tasks from currentDay onwards — plus any missed tasks compressed
  return WEEK1_TASKS.filter(t => t.day >= currentDay);
}

// ─── Max achievable % ─────────────────────────────────────
// Given the current day, what's the highest % a new signup
// can still reach by end of Week 1?

export function getMaxAchievable(currentDay: number): number {
  return WEEK1_TASKS
    .filter(t => t.day >= currentDay)
    .reduce((sum, t) => sum + t.pct, 0);
}
