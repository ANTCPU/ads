// ============================================================
// app/internship/page.tsx
// antcpu.cloud — Human in the Loop Internship Landing
//
// REWRITE HISTORY
// v1 — Aug 2026 · Initial build · Static October dates · Dark theme
//       Hardcoded WEEKS array · No state awareness · antcpu-ads branding
// v2 — Nov 2026 · Full rewrite · Dynamic cohort · Three render states ·
//       antcpu.cloud branding · Calendar API · Office card ·
//       Week dates computed from challenge_start · SuccessClient fixes
//
// ARCHITECTURE
// Server component — revalidate: 60
// No client JS. No useEffect. No hardcoded dates. Ever.
//
// DATA SOURCES (read order)
// 1. challengeDays.ts  → getChallengeCohort(), getChallengeCohortLabel(),
//                        getNextCohort()
// 2. /api/internship/calendar → day, week, week_name, is_active,
//                               is_pre_launch, is_complete,
//                               challenge_start, next_cohort_start
// 3. Supabase challengers table → total, dev, mkt, countries
//    .select('track, country').eq('status','active')
//
// THREE RENDER STATES
// PRE_LAUNCH  is_pre_launch=true  → countdown + waitlist CTA
//             "November opens Nov 1 — register now"
// ACTIVE      is_active=true      → full page, live stats, week timeline
//             "Challenge live · Day N · Week N"
// COMPLETE    is_complete=true    → cohort wrap + next cohort CTA
//             "October complete · November opens Dec 1"
//
// WEEK TIMELINE
// Dates computed from challenge_start — never hardcoded.
// week_start[n] = challenge_start + (n-1)*7 days
// week_end[n]   = challenge_start + n*7 - 1 days
// Formatted: "Nov 1–7", "Nov 8–14", "Nov 15–21", "Nov 22–30"
//
// WHAT YOU GET CARDS (6 cards)
// Arena presence · Real deliverables · Collab Week 3 ·
// Earned title · Office from Day 1 · Real CV entry
// All copy uses getChallengeCohortLabel() — no hardcoded month
//
// BRANDING
// antcpu.cloud — not antcpu-ads.vercel.app
// Nav: antcpu.cloud · antcpu.io
// CTAs: /internship/join?track=dev|marketing
// Footer: antcpu.io × antcpu.cloud
//
// DOWNSTREAM
// → /internship/join/     JoinForm.tsx — track param
// → /internship/success/  SuccessClient.tsx — name + track params
// → /internship/arena     Challenger board
// → antcpu.io/apply/      IONOS apply page (primary entry)
// → antcpu.io/challenge/  Full challenge calendar
// → antcpu.io/november/   November cohort page
//
// STYLE
// Inline style objects — dark theme (#0a0a0a bg, #2563eb accent)
// No Tailwind. No CSS modules. Consistent with office + arena pages.
// Shared constants: bg, card, border, white, muted, muted2, accent
//
// FIXES FROM v1
// — WEEKS dates: computed not hardcoded
// — Hero badge: dynamic cohort + state label
// — "Founding member" card: dynamic cohort label
// — "Real CV entry" card: dynamic cohort label
// — antcpu-ads.vercel.app → antcpu.cloud everywhere
// — Three render states: pre-launch / active / complete
// — Office card added to "What you get"
// — Final CTA copy: dynamic cohort label not hardcoded month
// — OG/twitter metadata: antcpu.cloud URLs
// ============================================================

import { getChallengeCohortLabel, getNextCohort } from '../lib/challengeDays';
import { createClient } from '@supabase/supabase-js';

export const revalidate = 60;

// ── Shared style constants ────────────────────────────────────
const accent = '#2563eb';
const bg     = '#0a0a0a';
const card   = '#111';
const border = '#1a1a1a';
const white  = '#fff';
const muted  = '#888';
const muted2 = '#555';

// ── Calendar API response type ────────────────────────────────
type CalendarData = {
  day:               number;
  week:              number;
  week_name:         string;
  is_active:         boolean;
  is_pre_launch:     boolean;
  is_complete:       boolean;
  challenge_start:   string;   // 'YYYY-MM-DD'
  next_cohort_start: string;   // 'YYYY-MM-DD'
  cohort:            string;   // 'november-2026'
};

// ── Week date helper ──────────────────────────────────────────
// Computes "Nov 1–7" style labels from challenge_start.
// Never hardcoded. Works for any month forever.
function buildWeeks(challengeStart: string) {
  const start  = new Date(challengeStart + 'T00:00:00Z');
  const months = ['Jan','Feb','Mar','Apr','May','Jun',
                  'Jul','Aug','Sep','Oct','Nov','Dec'];
  const m      = months[start.getUTCMonth()];

  const weekDefs = [
    { n: 1, icon: '🔭', title: 'Explorer',     desc: 'Orient. Register. Post your intro ad. Meet the Arena.' },
    { n: 2, icon: '⚡', title: 'Creator',      desc: 'Submit your first real work. Dev ships a tool. Marketing runs a campaign.' },
    { n: 3, icon: '🤝', title: 'Collaborator', desc: 'Teams form. Dev + Marketing pairs build together. First collab deliverable.' },
    { n: 4, icon: '🚀', title: 'Leader',       desc: 'Lead a project. Present your work. Earn your role title.' },
  ];

  return weekDefs.map(w => {
    const wStart = new Date(start);
    wStart.setUTCDate(start.getUTCDate() + (w.n - 1) * 7);
    const wEnd = new Date(start);
    // Week 4 ends on last day of month
    if (w.n === 4) {
      wEnd.setUTCMonth(start.getUTCMonth() + 1, 0);
    } else {
      wEnd.setUTCDate(start.getUTCDate() + w.n * 7 - 1);
    }
    return {
      ...w,
      dates: `${m} ${wStart.getUTCDate()}–${wEnd.getUTCDate()}`,
    };
  });
}

// ── Tracks — static, no dates ─────────────────────────────────
const TRACKS = [
  {
    icon: '💻', track: 'dev', label: 'Developer',
    desc: 'Build tools, automate workflows, write code. Ship real features to the Arena. Your code runs in production.',
    deliverables: [
      'Week 2 — Ship a working tool or feature',
      'Week 3 — Pair with a Marketer, build together',
      'Week 4 — Lead a technical project',
    ],
    href: '/internship/join?track=dev',
  },
  {
    icon: '📣', track: 'marketing', label: 'Marketer',
    desc: 'Run campaigns, build community, drive real reach. Your work appears in the Arena and beyond.',
    deliverables: [
      'Week 2 — Run a real campaign, submit results',
      'Week 3 — Pair with a Dev, build together',
      'Week 4 — Lead a brand project',
    ],
    href: '/internship/join?track=marketing',
  },
];

// ── Metadata — dynamic cohort label ──────────────────────────
export function generateMetadata() {
  const label = getChallengeCohortLabel();
  return {
    title: `Human in the Loop — antcpu.cloud · ${label}`,
    description: '30 days. Real roles. Real CV. Dev or Marketing. Enter the Arena.',
    openGraph: {
      title: `Human in the Loop — antcpu.cloud · ${label}`,
      description: '30 days. Real roles. Real CV. Dev or Marketing. Enter the Arena.',
      url: 'https://antcpu.cloud/internship',
      siteName: 'antcpu.cloud',
      images: [{ url: 'https://antcpu.cloud/og-internchallenge.jpg', width: 1200, height: 630, alt: 'antcpu Human in the Loop Internship Challenge' }],
      type: 'website' as const,
    },
    twitter: {
      card: 'summary_large_image' as const,
      title: `Human in the Loop — antcpu.cloud · ${label}`,
      description: '30 days. Real roles. Real CV. Dev or Marketing. Enter the Arena.',
      images: ['https://antcpu.cloud/og-internchallenge.jpg'],
    },
  };
}

// ── Page ──────────────────────────────────────────────────────
export default async function InternshipPage() {

  // ── 1. Calendar API ────────────────────────────────────────
  let cal: CalendarData | null = null;
  try {
    const res = await fetch(
      'https://antcpu.cloud/api/internship/calendar',
      { next: { revalidate: 60 } }
    );
    if (res.ok) cal = await res.json();
  } catch { /* fall through to defaults */ }

  const isActive    = cal?.is_active    ?? true;
  const isPreLaunch = cal?.is_pre_launch ?? false;
  const isComplete  = cal?.is_complete  ?? false;
  const currentDay  = cal?.day          ?? 1;
  const currentWeek = cal?.week         ?? 1;
  const weekName    = cal?.week_name    ?? 'Explorer';
  const cohortLabel = getChallengeCohortLabel();
  const nextCohort  = getNextCohort();
  const nextLabel   = nextCohort.split('-').map((p,i) =>
    i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p
  ).join(' ');

  // ── 2. Week timeline — computed from challenge_start ───────
  const challengeStart = cal?.challenge_start ?? (() => {
    const now = new Date();
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth()+1).padStart(2,'0')}-01`;
  })();
  const WEEKS = buildWeeks(challengeStart);

  // ── 3. Supabase live stats ─────────────────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data } = await supabase
    .from('challengers')
    .select('track, country')
    .eq('status', 'active');

  const all      = data ?? [];
  const total    = all.length;
  const devCount = all.filter(c => c.track === 'dev').length;
  const mktCount = all.filter(c => c.track === 'marketing').length;
  const countries = new Set(all.map(c => c.country)).size;

  // ── Hero badge label ───────────────────────────────────────
  const badgeLabel = isPreLaunch
    ? `⏳ ${cohortLabel} · Opens ${cal?.next_cohort_start?.slice(5,10).replace('-','/')} — Register Now`
    : isComplete
    ? `✅ ${cohortLabel} Complete · ${nextLabel} Opens Next`
    : `🚀 ${cohortLabel} · Day ${currentDay} · Week ${currentWeek} — ${weekName} · Active`;

  // ── CTA footer label ───────────────────────────────────────
  const ctaLabel = `Free · Remote · ~5 hours/week · ${cohortLabel}`;

  return (
    <div style={{ background: bg, color: white, fontFamily: 'system-ui,sans-serif', minHeight: '100vh' }}>

      {/* ── NAV ── */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2rem', borderBottom: `1px solid ${border}` }}>
        <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: accent }}>⚡</span>
          <span>antcpu.cloud</span>
          <span style={{ color: muted2, fontWeight: 400 }}>×</span>
          <span style={{ color: accent }}>antcpu.io</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href="/internship/arena" style={{ color: muted, fontSize: '0.85rem', textDecoration: 'none' }}>Challenger Board</a>
          <a href="/arena"            style={{ color: muted, fontSize: '0.85rem', textDecoration: 'none' }}>Arena</a>
          <a href="https://antcpu.io/challenge/" style={{ color: accent, fontSize: '0.85rem', textDecoration: 'none', fontWeight: 700 }}>Challenge →</a>
        </div>
      </nav>

      {/* ── PRE-LAUNCH STATE ── */}
      {isPreLaunch && (
        <div style={{ maxWidth: 600, margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#0d1a2d', border: `1px solid ${accent}40`, borderRadius: 999, padding: '0.3rem 1rem', fontSize: '0.75rem', color: accent, marginBottom: '1.5rem', fontWeight: 700 }}>
            ⏳ {cohortLabel} · Opens {cal?.next_cohort_start?.slice(5,10).replace('-','/')}
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1rem', background: `linear-gradient(135deg, ${white} 40%, ${accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            The Human in<br />the Loop.
          </h1>
          <p style={{ color: muted, fontSize: '1rem', lineHeight: 1.7, marginBottom: '2rem' }}>
            30 days. Real roles. Real CV.<br />
            Register now — your dashboard unlocks automatically on Day 1.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://antcpu.io/apply/" style={{ background: accent, color: white, padding: '1rem 2.5rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}>
              Register Free →
            </a>
            <a href="https://antcpu.io/november/" style={{ background: 'transparent', color: white, padding: '1rem 2rem', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: '1rem', border: `1px solid #333` }}>
              View {cohortLabel} →
            </a>
          </div>
          <p style={{ color: muted2, fontSize: '0.8rem', marginTop: '2rem' }}>
            {total} challengers already registered · {countries} countries
          </p>
        </div>
      )}

      {/* ── COMPLETE STATE ── */}
      {isComplete && (
        <div style={{ maxWidth: 600, margin: '6rem auto', padding: '0 1.5rem', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: '#0d1a2d', border: `1px solid ${accent}40`, borderRadius: 999, padding: '0.3rem 1rem', fontSize: '0.75rem', color: accent, marginBottom: '1.5rem', fontWeight: 700 }}>
            ✅ {cohortLabel} Complete
          </div>
          <h1 style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '1rem' }}>
            Cohort complete.<br />
            <span style={{ color: accent }}>{nextLabel} is next.</span>
          </h1>
          <p style={{ color: muted, fontSize: '1rem', lineHeight: 1.7, marginBottom: '2rem' }}>
            Results announced. Builders Network open.<br />
            {nextLabel} opens {cal?.next_cohort_start?.slice(5,10).replace('-','/')}.
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://antcpu.io/apply/" style={{ background: accent, color: white, padding: '1rem 2.5rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}>
              Join {nextLabel} →
            </a>
            <a href="/internship/arena" style={{ background: 'transparent', color: white, padding: '1rem 2rem', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: '1rem', border: `1px solid #333` }}>
              View Results →
            </a>
          </div>
        </div>
      )}

      {/* ── ACTIVE STATE ── */}
      {isActive && (
        <>
          {/* HERO */}
          <div style={{ textAlign: 'center', padding: '4rem 1.25rem 2.5rem' }}>
            <div style={{ display: 'inline-block', background: '#0d1a2d', border: `1px solid ${accent}40`, borderRadius: 999, padding: '0.3rem 1rem', fontSize: '0.75rem', color: accent, marginBottom: '1.5rem', fontWeight: 700 }}>
              {badgeLabel}
            </div>
            <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.05, marginBottom: '1.2rem', background: `linear-gradient(135deg, ${white} 40%, ${accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              The Human in<br />the Loop.
            </h1>
            <p style={{ color: muted, fontSize: '1.1rem', maxWidth: 520, margin: '0 auto 2rem', lineHeight: 1.6 }}>
              30 days. Real roles. Real CV. You are a brand.<br />
              Your skills are your service. Pick your track and enter the Arena.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/internship/join?track=dev" style={{ background: accent, color: white, padding: '1rem 2.5rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}>
                💻 Join as Developer
              </a>
              <a href="/internship/join?track=marketing" style={{ background: 'transparent', color: white, padding: '1rem 2rem', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: '1rem', border: `1px solid #333` }}>
                📣 Join as Marketer
              </a>
            </div>
          </div>

          {/* LIVE STATS */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '3rem', padding: '2rem', borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, flexWrap: 'wrap' }}>
            {[
              { v: total,    l: 'Challengers' },
              { v: countries, l: 'Countries' },
              { v: devCount, l: '💻 Developers' },
              { v: mktCount, l: '📣 Marketers' },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: accent }}>{s.v}</div>
                <div style={{ fontSize: '0.72rem', color: muted2, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{s.l}</div>
              </div>
            ))}
          </div>

          {/* WEEK TIMELINE */}
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '3.5rem 1.25rem' }}>
            <div style={{ fontSize: '0.65rem', color: accent, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              The 4-Week Journey
            </div>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, marginBottom: '0.75rem' }}>
              Every week you level up.
            </h2>
            <p style={{ color: muted, marginBottom: '2.5rem', lineHeight: 1.6 }}>
              Each week has a theme, a deliverable, and a new role title. You earn your title — it&apos;s not given.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {WEEKS.map(w => {
                const isLive = w.n === currentWeek;
                return (
                  <div key={w.n} style={{
                    background: isLive ? '#0d1a2d' : card,
                    border: `1px solid ${isLive ? accent + '40' : border}`,
                    borderRadius: 14, padding: '1.5rem',
                  }}>
                    <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{w.icon}</div>
                    <div style={{ fontSize: '0.65rem', color: isLive ? accent : muted2, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                      Week {w.n} · {w.dates}
                      {isLive && <span style={{ marginLeft: 6, background: accent, color: white, padding: '0.1rem 0.5rem', borderRadius: 999, fontSize: '0.6rem' }}>LIVE</span>}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>{w.title}</div>
                    <div style={{ color: muted, fontSize: '0.82rem', lineHeight: 1.5 }}>{w.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* TRACKS */}
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 1.25rem 3.5rem', borderTop: `1px solid ${border}`, paddingTop: '3.5rem' }}>
            <div style={{ fontSize: '0.65rem', color: accent, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
              Two Tracks
            </div>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, marginBottom: '0.75rem' }}>
              You are a brand.
            </h2>
            <p style={{ color: muted, marginBottom: '2.5rem', lineHeight: 1.6 }}>
              Your skills are your service. One track only. Own it.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
              {TRACKS.map(t => (
                <div key={t.track} style={{ background: card, border: `1px solid ${border}`, borderRadius: 16, padding: '2rem' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>{t.icon}</div>
                  <div style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem' }}>{t.label}</div>
                  <p style={{ color: muted, fontSize: '0.88rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>{t.desc}</p>
                  <div style={{ marginBottom: '1.5rem' }}>
                    {t.deliverables.map(d => (
                      <div key={d} style={{ display: 'flex', gap: '0.5rem', padding: '0.4rem 0', borderBottom: `1px solid ${border}`, fontSize: '0.8rem', color: muted }}>
                        <span style={{ color: accent, flexShrink: 0 }}>→</span>
                        <span>{d}</span>
                      </div>
                    ))}
                  </div>
                  <a href={t.href} style={{ display: 'block', background: accent, color: white, padding: '0.85rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', textAlign: 'center', fontSize: '0.95rem' }}>
                    Join as {t.label} →
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* WHAT YOU GET */}
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 1.25rem 3.5rem', borderTop: `1px solid ${border}`, paddingTop: '3.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, marginBottom: '2rem' }}>
              What you actually get.
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {[
                { icon: '⚡', title: 'Arena presence',    desc: 'Your intro ad is live from Day 1. Real reach, real points.' },
                { icon: '📋', title: 'Real deliverables', desc: 'Not fake projects. Work that ships into the Arena.' },
                { icon: '🤝', title: 'Collab in Week 3',  desc: 'Dev + Marketing pairs. Build something together.' },
                { icon: '🏆', title: 'Earned title',      desc: 'Explorer → Creator → Collaborator → Leader. Earned, not given.' },
                { icon: '🏢', title: 'Office from Day 1', desc: `Your office is live the moment you register. Share it. Own it.` },
                { icon: '📄', title: 'Real CV entry',     desc: `antcpu.io Human in the Loop Internship — ${cohortLabel}.` },
              ].map(item => (
                <div key={item.title} style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '1.25rem' }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{item.icon}</div>
                  <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>{item.title}</div>
                  <div style={{ color: muted, fontSize: '0.82rem', lineHeight: 1.5 }}>{item.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* FINAL CTA */}
          <div style={{ textAlign: 'center', padding: '3.5rem 1.25rem', borderTop: `1px solid ${border}` }}>
            <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, marginBottom: '1rem' }}>
              Ready to enter?
            </h2>
            <p style={{ color: muted, marginBottom: '2rem', fontSize: '0.95rem' }}>
              {ctaLabel}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/internship/join?track=dev" style={{ background: accent, color: white, padding: '1rem 2.5rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '1rem' }}>
                💻 Join as Developer
              </a>
              <a href="/internship/join?track=marketing" style={{ background: 'transparent', color: white, padding: '1rem 2rem', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: '1rem', border: `1px solid #333` }}>
                📣 Join as Marketer
              </a>
            </div>
            <div style={{ marginTop: '1.5rem' }}>
              <a href="/internship/arena" style={{ color: muted2, fontSize: '0.85rem', textDecoration: 'none' }}>
                View the Challenger Board →
              </a>
            </div>
          </div>
        </>
      )}

      {/* ── FOOTER ── */}
      <footer style={{ textAlign: 'center', padding: '2rem', color: '#333', fontSize: '0.8rem', borderTop: `1px solid ${border}` }}>
        © {new Date().getFullYear()} antcpu.cloud ·{' '}
        <span style={{ color: accent }}>⚡ antcpu.cloud</span> × <span style={{ color: accent }}>antcpu.io</span>
      </footer>

    </div>
  );
}
