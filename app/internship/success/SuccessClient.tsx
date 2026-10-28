// ============================================================
// app/internship/success/SuccessClient.tsx
// v2 — Nov 2026 · Week-aware · Handle-aware office link ·
//      Dynamic cohort · Unified catch-up · Pre-launch state
// ============================================================

'use client';

import { useSearchParams } from 'next/navigation';
import {
  getChallengeDay,
  getChallengeCohortLabel,
  WEEK1_TASKS,
} from '../../lib/challengeDays';

const accent = '#2563eb';

const EDU: Record<string, Record<string, { label: string; url: string }>> = {
  dev: {
    '1': { label: 'Build Your First Website', url: 'https://antcpu.com/edu/classes/build-your-first-website/' },
    '2': { label: 'Website 101',              url: 'https://antcpu.com/edu/classes/website-101/' },
    '3': { label: 'JavaScript Essentials',    url: 'https://antcpu.com/edu/classes/javascript-essentials/' },
    '4': { label: 'AI Tools for Everyone',    url: 'https://antcpu.com/edu/classes/ai-tools-for-everyone/' },
  },
  marketing: {
    '1': { label: 'Logo Creation Basics',   url: 'https://antcpu.com/edu/classes/logo-creation-basics/' },
    '2': { label: 'Social Media Graphics',  url: 'https://antcpu.com/edu/classes/social-media-graphics/' },
    '3': { label: 'Brand Identity Design',  url: 'https://antcpu.com/edu/classes/brand-identity-design/' },
    '4': { label: 'Prompt Engineering',     url: 'https://antcpu.com/edu/classes/prompt-engineering/' },
  },
};

export default function SuccessClient() {
  const params     = useSearchParams();
  const name       = params.get('name')   ?? 'Challenger';
  const track      = params.get('track')  ?? 'dev';
  const handle     = params.get('handle') ?? '';
  const first      = name.split(' ')[0];
  const isDev      = track === 'dev';
  const trackIcon  = isDev ? '💻' : '📣';
  const trackLabel = isDev ? 'Developer' : 'Marketer';
  const cohort     = getChallengeCohortLabel();
  const day        = getChallengeDay();
  const week       = day === 0 ? 0 : Math.min(Math.ceil(day / 7), 4);
  const officeHref = handle ? `/office/${handle}` : '/office';

  // Mutually exclusive states
  const isPreLaunch = day === 0;
  const isDay1      = day === 1;
  const isWeek1Late = day >= 2 && day <= 6;
  const isWeek1Last = day === 7;
  const isWeek2Plus = day >= 8;

  const isTight = day === 5 || day === 6;
  const eduClass = EDU[isDev ? 'dev' : 'marketing'][String(week || 1)];

  const weekLabel: Record<number, string> = {
    2: 'Week 2 — Creator',
    3: 'Week 3 — Collaborator',
    4: 'Week 4 — Leader',
  };

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '4rem 1.5rem', fontFamily: 'system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{trackIcon}</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.4rem' }}>
          You&apos;re in, {first}.
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
          {trackLabel} · {cohort} Cohort
          {isDay1 && ' · Week 1 — Explorer ⭐'}
        </p>
        <p style={{ color: '#9ca3af', fontSize: '0.82rem' }}>
          Check your email — your guide is on its way.
        </p>
      </div>

      {/* Pre-launch */}
      {isPreLaunch && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem', color: '#15803d' }}>
            ✅ You&apos;re registered early
          </div>
          <p style={{ color: '#374151', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1rem' }}>
            The challenge starts on the 1st. Your dashboard and office are ready.
            Day 1 tasks unlock automatically at midnight EST.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href={officeHref} style={{ background: accent, color: '#fff', padding: '0.7rem 1.25rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem' }}>
              View Your Office →
            </a>
            <a href={officeHref} style={{ background: '#f3f4f6', color: '#374151', padding: '0.7rem 1.25rem', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem' }}>
              My Office →
            </a>
          </div>
        </div>
      )}

      {/* Week 1 last day warning */}
      {isWeek1Last && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#991b1b' }}>
          🔴 <strong>Today is the last day of Week 1.</strong> Do tasks 1–2 right now — 10 minutes, 10%, Explorer role on your CV.
        </div>
      )}

      {/* Tight window warning */}
      {isTight && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#92400e' }}>
          ⏱ <strong>Week 1 tasks are all open.</strong> You can still reach <strong>25%</strong> — here&apos;s your fastest path.
        </div>
      )}

      {/* Week 2+ state */}
      {isWeek2Plus && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem', color: '#1d4ed8' }}>
            📅 {weekLabel[week] ?? 'Week 4 — Leader'} is live
          </div>
          <p style={{ color: '#374151', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1rem' }}>
            Your office is live and you&apos;re on the challenger board.
            Week 1 gates are still open — complete them to build your progress.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href={officeHref} style={{ background: accent, color: '#fff', padding: '0.7rem 1.25rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem' }}>
              View Your Office →
            </a>
            <a href={officeHref} style={{ background: '#f3f4f6', color: '#374151', padding: '0.7rem 1.25rem', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem' }}>
              My Office →
            </a>
          </div>
        </div>
      )}

      {/* Day 1 — full task list */}
      {isDay1 && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.75rem' }}>
            Week 1 — All tasks open now
          </div>
          {WEEK1_TASKS.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.6rem 0', borderBottom: i < WEEK1_TASKS.length - 1 ? '1px solid #e5e7eb' : 'none', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: i === 0 ? accent : '#9ca3af', minWidth: 40, paddingTop: 2 }}>+{t.pct}%</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111' }}>{t.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{t.time}</div>
              </div>
              {i === 0 && (
                <a href={t.url} style={{ fontSize: '0.72rem', background: accent, color: '#fff', textDecoration: 'none', padding: '0.2rem 0.6rem', borderRadius: 6, whiteSpace: 'nowrap' as const, flexShrink: 0, fontWeight: 700 }}>
                  Start →
                </a>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Week 1 catch-up (days 2–7) */}
      {(isWeek1Late || isWeek1Last) && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.75rem' }}>
            {isWeek1Last ? 'Do these now' : 'Your catch-up path — up to 25%'}
          </div>
          {(isWeek1Last ? WEEK1_TASKS.slice(0, 2) : WEEK1_TASKS).map((t, i, arr) => (
            <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.6rem 0', borderBottom: i < arr.length - 1 ? '1px solid #e5e7eb' : 'none', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: i === 0 ? accent : '#9ca3af', minWidth: 40, paddingTop: 2 }}>+{t.pct}%</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111' }}>{t.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{t.time}</div>
                {t.edu?.[track as 'dev' | 'marketing'] && (
                  <a href={t.edu[track as 'dev' | 'marketing']!.url} style={{ fontSize: '0.72rem', color: accent, textDecoration: 'none', display: 'block', marginTop: '0.2rem' }}>
                    🎓 {t.edu[track as 'dev' | 'marketing']!.label} →
                  </a>
                )}
              </div>
              <a href={isDev ? t.url : (t.urlMarketing ?? t.url)} style={{ fontSize: '0.72rem', background: `${accent}15`, color: accent, textDecoration: 'none', padding: '0.2rem 0.6rem', borderRadius: 6, border: `1px solid ${accent}30`, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                {t.cta}
              </a>
            </div>
          ))}
          {isWeek1Last && (
            <div style={{ padding: '0.5rem 0', fontSize: '0.78rem', color: '#9ca3af' }}>
              More time? Complete all 7 tasks for 25% total.
            </div>
          )}
        </div>
      )}

      {/* EDU card — Week 1 only, not shown for Week 2+ joiners */}
      {!isWeek2Plus && !isPreLaunch && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.4rem' }}>
            🎓 {isDev ? 'Dev' : 'Marketing'} class — free, no signup
          </div>
          <a href={eduClass.url} style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0369a1', textDecoration: 'none' }}>
            {eduClass.label} →
          </a>
          <div style={{ fontSize: '0.78rem', color: '#0369a1', marginTop: '0.2rem', opacity: 0.7 }}>
            Live sessions 1pm + 6pm EST Mon–Fri · Feeds directly into your Week 1 work
          </div>
        </div>
      )}

      {/* Primary CTAs */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.75rem', marginBottom: '1.5rem' }}>
        {isWeek2Plus || isPreLaunch ? (
          <a href={officeHref} style={{ background: accent, color: '#fff', padding: '0.9rem 1.5rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '1rem', textAlign: 'center' as const }}>
            View Your Office →
          </a>
        ) : (
          <a href={officeHref} style={{ background: accent, color: '#fff', padding: '0.9rem 1.5rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '1rem', textAlign: 'center' as const }}>
            {isWeek1Last ? 'Go to My Office →' : 'Go to My Office →'}
          </a>
        )}
        <a href="/internship/arena" style={{ background: '#f3f4f6', color: '#111', padding: '0.9rem 1.5rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem', textAlign: 'center' as const }}>
          Challenger Board →
        </a>
        <a href="/arena" style={{ color: '#9ca3af', padding: '0.6rem', textDecoration: 'none', fontSize: '0.875rem', textAlign: 'center' as const }}>
          Explore the Arena →
        </a>
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#d1d5db', textAlign: 'center' as const }}>
        ⚡ antcpu.io · Human in the Loop · {cohort}
      </p>

    </main>
  );
}
