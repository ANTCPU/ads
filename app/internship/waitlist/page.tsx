// ============================================================
// app/internship/waitlist/page.tsx
// Next cohort waitlist
//
// For Day 8+ signups — current Week 1 has closed.
// Their Arena ad is already live (registered via /internship/join).
// This page confirms their next cohort status and shows them
// what Week 1 will look like so they're prepared.
//
// nextMonth computed from CHALLENGE_END — updates automatically
// each month when challengeDays.ts is updated.
//
// No new registration needed — they're already in challengers
// table with cohort: '[month]-2026'.
// ============================================================

import { WEEK1_TASKS, CHALLENGE_END } from '../../lib/challengeDays';

export const metadata = {
  title: 'Next Cohort — antcpu.io Internship Arena',
  description: 'Current Week 1 has closed. Your Arena ad is live — the next cohort opens on the 1st.',
  openGraph: {
    title: 'Next Cohort — antcpu.io Internship Arena',
    description: 'Current Week 1 has closed. Your Arena ad is live — the next cohort opens on the 1st.',
    url: 'https://antcpu-ads.vercel.app/internship/waitlist',
    siteName: 'ANTCPU ADS',
    images: [{ url: 'https://antcpu-ads.vercel.app/og-internchallenge.jpg', width: 1200, height: 630 }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    images: ['https://antcpu-ads.vercel.app/og-internchallenge.jpg'],
  },
};


// Compute next cohort month name from CHALLENGE_END
// CHALLENGE_END = first moment of the month after the current challenge
// e.g. Aug challenge → CHALLENGE_END = Sep 1 → nextMonth = "September"
const nextMonth     = CHALLENGE_END.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
const nextMonthYear = CHALLENGE_END.toLocaleString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const nextMonthDay1 = `${nextMonth} 1`;

export default function WaitlistPage() {
  const accent = '#2563eb';

  return (
    <main style={{ maxWidth: 560, margin: '0 auto', padding: '4rem 1.5rem', fontFamily: 'system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📅</div>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          {nextMonth} Cohort
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.95rem', lineHeight: 1.6, maxWidth: 420, margin: '0 auto' }}>
          Week 1 closed on Day 7. The {nextMonth} cohort opens on the 1st —
          full new month, same challenge, same roles.
        </p>
      </div>

      {/* Status card */}
      <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#1d4ed8', marginBottom: '0.75rem' }}>
          ✅ You're already in the Arena
        </div>
        <div style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.6, marginBottom: '1rem' }}>
          Your intro ad is live on the challenger board right now. Your points
          accumulate from today. The {nextMonth} cohort means you get the full
          Week 1 experience starting {nextMonthDay1} — nothing is lost.
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <a href="/internship/arena" style={{ background: accent, color: '#fff', padding: '0.7rem 1.25rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem' }}>
            View Challenger Board →
          </a>
          <a href="/arena" style={{ background: '#dbeafe', color: '#1d4ed8', padding: '0.7rem 1.25rem', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem' }}>
            Explore the Arena →
          </a>
        </div>
      </div>

      {/* What's coming */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.5rem' }}>
          {nextMonth} Week 1 — Preview
        </div>
        <p style={{ fontSize: '0.82rem', color: '#6b7280', marginBottom: '1rem', lineHeight: 1.5 }}>
          These tasks open {nextMonthDay1}. You'll know exactly what to do from day one.
        </p>
        {WEEK1_TASKS.map((t, i) => (
          <div key={t.day} style={{ display: 'flex', gap: '0.75rem', padding: '0.6rem 0', borderBottom: i < WEEK1_TASKS.length - 1 ? '1px solid #e5e7eb' : 'none', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#d1d5db', minWidth: 40, paddingTop: 2 }}>Day {t.day}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#374151' }}>{t.title}</div>
              <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{t.time} · +{t.pct}%</div>
            </div>
          </div>
        ))}
      </div>

      {/* EDU — start now */}
      <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.5rem' }}>
          🎓 Get ahead — free classes, no signup
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.5rem' }}>
          <a href="https://antcpu.com/edu/classes/build-your-first-website/" style={{ fontSize: '0.875rem', color: '#0369a1', textDecoration: 'none', fontWeight: 600 }}>
            💻 Build Your First Website — Dev track →
          </a>
          <a href="https://antcpu.com/edu/classes/logo-creation-basics/" style={{ fontSize: '0.875rem', color: '#0369a1', textDecoration: 'none', fontWeight: 600 }}>
            📣 Logo Creation Basics — Marketing track →
          </a>
        </div>
        <div style={{ fontSize: '0.75rem', color: '#0369a1', marginTop: '0.5rem', opacity: 0.7 }}>
          Live sessions 1pm + 6pm EST Mon–Fri · Start today, be ready for {nextMonth}
        </div>
      </div>

      {/* Footer */}
      <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#d1d5db', marginTop: '2rem' }}>
        ⚡ antcpu.io · Human in the Loop · {nextMonthYear}
      </p>
    </main>
  );
}
