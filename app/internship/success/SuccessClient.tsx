'use client';

import { useSearchParams } from 'next/navigation';
import {
  getChallengeDay,
  getCatchUpTasks,
  getMaxAchievable,
  WEEK1_TASKS,
} from '../../lib/challengeDays';

export default function SuccessClient() {
  const params    = useSearchParams();
  const name      = params.get('name') ?? 'Challenger';
  const track     = params.get('track') ?? 'dev';
  const first     = name.split(' ')[0];
  const isDev     = track === 'dev';
  const trackIcon = isDev ? '💻' : '📣';
  const trackLabel = isDev ? 'Developer' : 'Marketer';
  const accent    = '#2563eb';

  const day       = getChallengeDay();
  const catchUp   = getCatchUpTasks(Math.max(1, day));
  const maxPct    = getMaxAchievable(Math.max(1, day));
  const isSept    = day >= 8;
  const isLast    = day === 7;
  const isTight   = day === 5 || day === 6;
  const isNormal  = day <= 4;

  const eduClass = isDev
    ? { label: 'Build Your First Website', url: 'https://antcpu.com/edu/classes/build-your-first-website/' }
    : { label: 'Logo Creation Basics', url: 'https://antcpu.com/edu/classes/logo-creation-basics/' };

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '4rem 1.5rem', fontFamily: 'system-ui,sans-serif' }}>

      {/* Icon + headline */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>{trackIcon}</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.4rem' }}>
          You're in, {first}.
        </h1>
        <p style={{ color: '#6b7280', fontSize: '0.95rem', marginBottom: '0.25rem' }}>
          {trackLabel} · {isSept ? 'September 2026 Cohort' : 'Week 1 — Explorer · Founding Member ⭐'}
        </p>
        <p style={{ color: '#9ca3af', fontSize: '0.82rem' }}>
          Check your email — your day-aware guide is on its way.
        </p>
      </div>

      {/* ── September cohort state ── */}
      {isSept && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.4rem', color: '#1d4ed8' }}>
            📅 August Week 1 has closed
          </div>
          <p style={{ color: '#374151', fontSize: '0.875rem', lineHeight: 1.6, margin: '0 0 1rem' }}>
            Your Arena intro ad is live and you're on the challenger board.
            September cohort opens September 1 — you'll have the full 31 days.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <a href="/internship/waitlist" style={{ background: accent, color: '#fff', padding: '0.7rem 1.25rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem' }}>
              September Cohort →
            </a>
            <a href="/internship/arena" style={{ background: '#f3f4f6', color: '#374151', padding: '0.7rem 1.25rem', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem' }}>
              Challenger Board →
            </a>
          </div>
        </div>
      )}

      {/* ── Last day warning ── */}
      {isLast && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#991b1b' }}>
          🔴 <strong>Today is the last day of Week 1.</strong> Do Days 1–2 right now — 10 minutes, 10%, Explorer role on your CV.
        </div>
      )}

      {/* ── Tight window warning ── */}
      {isTight && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem', fontSize: '0.875rem', color: '#92400e' }}>
          ⏱ <strong>Week 1 closes Sunday Aug 7.</strong> You can still reach <strong>{maxPct}%</strong> — here's your fastest path.
        </div>
      )}

      {/* ── Catch-up checklist (days 2–7) ── */}
      {!isSept && day >= 2 && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.75rem' }}>
            {isLast ? 'Do these now' : `Your catch-up path — up to ${maxPct}%`}
          </div>

          {/* Day 7: show Days 1–2 first as priority */}
          {isLast && (
            <>
              {[WEEK1_TASKS[0], WEEK1_TASKS[1]].map(t => (
                <div key={t.day} style={{ display: 'flex', gap: '0.75rem', padding: '0.6rem 0', borderBottom: '1px solid #e5e7eb', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '0.7rem', fontWeight: 800, color: accent, minWidth: 40, paddingTop: 2 }}>Day {t.day}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111' }}>{t.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{t.time} · +{t.pct}%</div>
                  </div>
                  <a href={t.url} style={{ fontSize: '0.72rem', background: `${accent}15`, color: accent, textDecoration: 'none', padding: '0.2rem 0.6rem', borderRadius: 6, border: `1px solid ${accent}30`, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                    {t.cta}
                  </a>
                </div>
              ))}
              <div style={{ padding: '0.5rem 0', fontSize: '0.78rem', color: '#9ca3af' }}>
                More time? Complete Days 3–7 for up to {maxPct}% total.
              </div>
            </>
          )}

          {/* All other late days: show catch-up tasks */}
          {catchUp.map((t, i) => (
            <div key={t.day} style={{ display: 'flex', gap: '0.75rem', padding: '0.6rem 0', borderBottom: i < catchUp.length - 1 ? '1px solid #e5e7eb' : 'none', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: i === 0 ? accent : '#9ca3af', minWidth: 40, paddingTop: 2 }}>Day {t.day}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111' }}>{t.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{t.time} · +{t.pct}%</div>
                {t.edu?.[track as 'dev' | 'marketing'] && (
                  <a href={t.edu[track as 'dev' | 'marketing']!.url} style={{ fontSize: '0.72rem', color: accent, textDecoration: 'none', display: 'block', marginTop: '0.2rem' }}>
                    🎓 {t.edu[track as 'dev' | 'marketing']!.label} →
                  </a>
                )}
              </div>
              <a href={t.url} style={{ fontSize: '0.72rem', background: `${accent}15`, color: accent, textDecoration: 'none', padding: '0.2rem 0.6rem', borderRadius: 6, border: `1px solid ${accent}30`, whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                {t.cta}
              </a>
            </div>
          ))}
        </div>
      )}

      {/* ── Day 1 — standard task list ── */}
      {isNormal && day === 1 && (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.75rem' }}>
            Week 1 — Days 1–7
          </div>
          {WEEK1_TASKS.map((t, i) => (
            <div key={t.day} style={{ display: 'flex', gap: '0.75rem', padding: '0.6rem 0', borderBottom: i < WEEK1_TASKS.length - 1 ? '1px solid #e5e7eb' : 'none', alignItems: 'flex-start' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: i === 0 ? accent : '#9ca3af', minWidth: 40, paddingTop: 2 }}>Day {t.day}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111' }}>{t.title}</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{t.time} · +{t.pct}%</div>
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

      {/* ── EDU class card ── */}
      {!isSept && (
        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.7rem', color: '#0369a1', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' as const, marginBottom: '0.4rem' }}>
            🎓 {isDev ? 'Dev' : 'Marketing'} class — free, no signup
          </div>
          <a href={eduClass.url} style={{ fontWeight: 700, fontSize: '0.9rem', color: '#0369a1', textDecoration: 'none' }}>
            {eduClass.label} →
          </a>
          <div style={{ fontSize: '0.78rem', color: '#0369a1', marginTop: '0.2rem', opacity: 0.7 }}>
            Live sessions 1pm + 6pm EST Mon–Fri · Directly feeds your Week 1 work
          </div>
        </div>
      )}

      {/* ── Primary CTAs ── */}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '0.75rem', marginBottom: '1.5rem' }}>
        {!isSept ? (
          <a href="https://antcpu.io/challenge/" style={{ background: accent, color: '#fff', padding: '0.9rem 1.5rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '1rem', textAlign: 'center' as const }}>
            {isLast ? 'Complete Day 1 Now →' : 'View Week 1 Tasks →'}
          </a>
        ) : (
          <a href="/internship/waitlist" style={{ background: accent, color: '#fff', padding: '0.9rem 1.5rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '1rem', textAlign: 'center' as const }}>
            Join September Cohort →
          </a>
        )}
        <a href="/internship/arena" style={{ background: '#f3f4f6', color: '#111', padding: '0.9rem 1.5rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.95rem', textAlign: 'center' as const }}>
          See the Challenger Board →
        </a>
        <a href="/arena" style={{ color: '#9ca3af', padding: '0.6rem', textDecoration: 'none', fontSize: '0.875rem', textAlign: 'center' as const }}>
          Explore the full Arena →
        </a>
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#d1d5db', textAlign: 'center' as const }}>
        ⚡ antcpu.io · Human in the Loop · {isSept ? 'September' : 'August'} 2026
      </p>
    </main>
  );
}
