// app/lib/challengeDays.ts
// Challenge day helpers — fully dynamic, no hardcoded dates
// Works for any month forever
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
// url       = dev track destination (or shared if no urlMarketing)
// urlMarketing = marketing track destination (only where different)
// edu.dev / edu.marketing = track-specific class link shown in email + dashboard
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
    day:   2,
    title: 'Complete Your Profile',
    time:  '5 min',
    pct:   10,
    url:   'https://antcpu.io/dashboard/',
    cta:   'Go to Dashboard →',
  },
  {
    day:   3,
    title: 'Explore Your Workspace + EDU',
    time:  '15 min',
    pct:   15,
    url:          'https://antcpu.io/challenge/',   // dev → challenge overview
    urlMarketing: 'https://antcpu.io/challenge/',   // same — both see challenge page
    cta:   'Open Workspace →',
    edu: {
      dev:       { label: 'Build Your First Website', url: 'https://antcpu.com/edu/classes/build-your-first-website/' },
      marketing: { label: 'Logo Creation Basics',     url: 'https://antcpu.com/edu/classes/logo-creation-basics/' },
    },
  },
  {
    day:   4,
    title: 'Show Your Best Work',
    time:  '20 min',
    pct:   20,
    url:          'https://antcpu.io/submit/',           // dev → submit page
    urlMarketing: 'https://antcpu.io/community/',        // marketing → community post
    cta:   'Submit Work →',
    edu: {
      dev:       { label: 'Website 101',              url: 'https://antcpu.com/edu/classes/website-101/' },
      marketing: { label: 'Social Media Graphics',    url: 'https://antcpu.com/edu/classes/social-media-graphics/' },
    },
  },
  {
    day:   5,
    title: 'Join the Community Session',
    time:  '30 min',
    pct:   22,
    url:   'https://antcpu.io/community/',
    cta:   'Join Session →',
    edu: {
      dev:       { label: 'JavaScript Essentials',    url: 'https://antcpu.com/edu/classes/javascript-essentials/' },
      marketing: { label: 'Brand Identity Design',    url: 'https://antcpu.com/edu/classes/brand-identity-design/' },
    },
  },
  {
    day:   6,
    title: 'Give Peer Feedback',
    time:  '15 min',
    pct:   24,
    url:   'https://antcpu.io/community/',
    cta:   'Give Feedback →',
  },
  {
    day:   7,
    title: 'Week 1 Reflection',
    time:  '10 min',
    pct:   25,
    url:          'https://antcpu.io/submit/',           // dev → submit
    urlMarketing: 'https://antcpu.io/community/',        // marketing → community
    cta:   'Submit Reflection →',
    edu: {
      dev:       { label: 'AI Tools for Everyone',    url: 'https://antcpu.com/edu/classes/ai-tools-for-everyone/' },
      marketing: { label: 'Prompt Engineering',       url: 'https://antcpu.com/edu/classes/prompt-engineering/' },
    },
  },
];

// ─── Dynamic day calculation ───────────────────────────────────
export function getChallengeDay(): number {
  const TZ_OFFSET_MS  = -5 * 60 * 60 * 1000;
  const nowUTC        = new Date();
  const nowEST        = new Date(nowUTC.getTime() + TZ_OFFSET_MS);
  const year          = nowEST.getUTCFullYear();
  const month         = nowEST.getUTCMonth();
  const challengeStart = new Date(Date.UTC(year, month, 1, 5, 0, 0));
  const daysInMonth   = new Date(year, month + 1, 0).getDate();
  const raw = Math.floor(
    (nowUTC.getTime() - challengeStart.getTime()) / 86400000
  ) + 1;
  return Math.min(Math.max(raw, 0), daysInMonth);
}

export function getChallengeCohort(): string {
  const TZ_OFFSET_MS = -5 * 60 * 60 * 1000;
  const nowEST = new Date(new Date().getTime() + TZ_OFFSET_MS);
  const months = [
    'january','february','march','april','may','june',
    'july','august','september','october','november','december'
  ];
  return `${months[nowEST.getUTCMonth()]}-${nowEST.getUTCFullYear()}`;
}

export const CHALLENGE_END: Date = (() => {
  const TZ_OFFSET_MS = -5 * 60 * 60 * 1000;
  const nowEST  = new Date(new Date().getTime() + TZ_OFFSET_MS);
  const year    = nowEST.getUTCFullYear();
  const month   = nowEST.getUTCMonth();
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear  = month === 11 ? year + 1 : year;
  return new Date(Date.UTC(nextYear, nextMonth, 1, 5, 0, 0));
})();

export function getCatchUpTasks(day: number): ChallengeTask[] {
  return WEEK1_TASKS.filter(t => t.day >= day);
}

export function getMaxAchievable(day: number): number {
  const tasks = WEEK1_TASKS.filter(t => t.day >= day);
  if (!tasks.length) return 25;
  return tasks[tasks.length - 1].pct;
}
