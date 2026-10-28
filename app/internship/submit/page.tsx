// ============================================================
// app/internship/submit/page.tsx
// Work submission module — Week 2+
// Week 1: locked state. Week 2+: full guided form via SubmitClient.
// ============================================================

import SubmitClient from './SubmitClient';

export const metadata = {
  title: 'Submit Your Work — antcpu.io Internship',
  description: 'Submit your Week 2+ deliverables to the Internship Arena.',
};

export default async function SubmitPage() {
  let currentWeek = 1;
  try {
    const res  = await fetch('https://antcpu-ads.vercel.app/api/internship/calendar', { next: { revalidate: 3600 } });
    const data = await res.json();
    currentWeek = data.week ?? 1;
  } catch {}

  const isLocked = currentWeek < 2;

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'system-ui,sans-serif' }}>

      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.4rem',
        letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        ⚡ Internship Arena · Work Submission
      </div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Submit Your Work.</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.95rem' }}>
        Week 2+. Real deliverables. Dev ships tools. Marketers run campaigns.
      </p>

      {isLocked ? (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16,
          padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem' }}>Opens Week 2</h2>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Week 1 is Explorer phase — get oriented, post your intro ad, meet the Arena.<br />
            Submissions open Week 2.
          </p>
          <a href="/internship/week/1" style={{ background: '#111', color: '#fff',
            padding: '0.65rem 1.5rem', borderRadius: 8, fontWeight: 700,
            textDecoration: 'none', fontSize: '0.875rem' }}>
            Week 1 Tasks →
          </a>
        </div>
      ) : (
        <SubmitClient currentWeek={currentWeek} />
      )}

    </main>
  );
}
