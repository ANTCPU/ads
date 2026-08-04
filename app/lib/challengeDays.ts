// https://antcpu-ads.vercel.app/app/lib/challengeDays.ts
// Challenge day helpers — fully dynamic, no hardcoded dates
// Works for any month forever

// ─── Types ────────────────────────────────────────────────────
export type ChallengeTask = {
  day:   number;
  title: string;
  time:  string;
  pct:   number;
  url:   string;
  cta:   string;
  edu?: {
    dev?:       { label: string; url: string };
    marketing?: { label: string; url: string };
  };
};

// ─── Week 1 tasks ─────────────────────────────────────────────
// Used by register email, success page, waitlist page
export const WEEK1_TASKS: ChallengeTask[] = [
  {
    day: 1, title: 'Register & Introduce Yourself',
    time: '5 min', pct: 5,
    url: 'https://antcpu.io/apply/', cta: 'Register →',
  },
  {
    day: 2, title: 'Complete Your Profile',
    time: '5 min', pct: 10,
    url: 'https://antcpu.io/dashboard/', cta: 'Go to Dashboard →',
  },
  {
    day: 3, title: 'Explore Your Workspace + EDU',
    time: '15 min', pct: 15,
    url: 'https://antcpu.io/dev/', cta: 'Open Workspace →',
    edu: {
      dev:       { label: 'Build Your First Website',
                   url: 'https://antcpu.com/edu/classes/build-your-first-website/' },
      marketing: { label: 'Logo Creation Basics',
                   url: 'https://antcpu.com/edu/classes/logo-creation-basics/' },
    },
  },
  {
    day: 4, title: 'Show Your Best Work',
    time: '20 min', pct: 20,
    url: 'https://antcpu.io/dev/#submit', cta: 'Submit Work →',
  },
  {
    day: 5, title: 'Join the Community Session',
    time: '30 min', pct: 22,
    url: 'https://antcpu.io/community/', cta: 'Join Session →',
  },
  {
    day: 6, title: 'Give Peer Feedback',
    time: '15 min', pct: 24,
    url: 'https://antcpu.io/community/', cta: 'Give Feedback →',
  },
  {
    day: 7, title: 'Week 1 Reflection',
    time: '10 min', pct: 25,
    url: 'https://antcpu.io/dev/#submit', cta: 'Submit Reflection →',
  },
];

// ─── Dynamic day calculation ───────────────────────────────────
// Derives from current month — no hardcoded dates
export function getChallengeDay(): number {
  const TZ_OFFSET_MS  = -5 * 60 * 60 * 1000;
  const nowUTC        = new Date();
  const nowEST        = new Date(nowUTC.getTime() + TZ_OFFSET_MS);
  const year          = nowEST.getUTCFullYear();
  const month         = nowEST.getUTCMonth();
  const challengeStart = new Date(Date.UTC(year, month, 1, 5, 0, 0));
  const daysInMonth   = new Date(year, month + 1, 0).getDate();
  const raw           = Math.floor(
    (nowUTC.getTime() - challengeStart.getTime()) / 86400000
  ) + 1;
  return Math.min(Math.max(raw, 0), daysInMonth);
}

export function getChallengeCohort(): string {
  const TZ_OFFSET_MS = -5 * 60 * 60 * 1000;
  const nowEST       = new Date(new Date().getTime() + TZ_OFFSET_MS);
  const months       = [
    'january','february','march','april','may','june',
    'july','august','september','october','november','december'
  ];
  return `${months[nowEST.getUTCMonth()]}-${nowEST.getUTCFullYear()}`;
}

// ─── CHALLENGE_END — first moment of next month ───────────────
// Used by waitlist page to compute next cohort name
export const CHALLENGE_END: Date = (() => {
  const TZ_OFFSET_MS  = -5 * 60 * 60 * 1000;
  const nowEST        = new Date(new Date().getTime() + TZ_OFFSET_MS);
  const year          = nowEST.getUTCFullYear();
  const month         = nowEST.getUTCMonth();
  const nextMonth     = month === 11 ? 0 : month + 1;
  const nextYear      = month === 11 ? year + 1 : year;
  return new Date(Date.UTC(nextYear, nextMonth, 1, 5, 0, 0));
})();

// ─── Catch-up helpers ─────────────────────────────────────────
// Returns tasks still completable from current day
export function getCatchUpTasks(day: number): ChallengeTask[] {
  return WEEK1_TASKS.filter(t => t.day >= day);
}

// Returns max achievable % from current day
export function getMaxAchievable(day: number): number {
  const tasks = WEEK1_TASKS.filter(t => t.day >= day);
  if (!tasks.length) return 25;
  return tasks[tasks.length - 1].pct;
}
