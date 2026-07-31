// ============================================================
// app/internship/submit/page.tsx
// Work submission module — Week 2+
//
// Week 1: Shows "coming Week 2" state — visible but locked.
// Week 2+: Full submission form (URL + description + track).
// Writes to a submissions table (Phase 3 — to be created).
//
// PLACEHOLDER — frame is live, form activates Aug 8.
// ============================================================

export const metadata = {
  title: 'Submit Your Work — antcpu.io Internship',
  description: 'Submit your Week 2+ deliverables to the Internship Arena.',
};

// Current week — update this manually each Monday or wire to challengers.week
const CURRENT_WEEK = 1;

const SUBMISSION_TYPES = {
  dev: [
    { id: 'tool',     label: '🔧 Tool / Feature',   desc: 'A working tool, script, or feature you built' },
    { id: 'pr',       label: '📦 Pull Request',      desc: 'A PR submitted to the Arena repo' },
    { id: 'writeup',  label: '📝 Technical Write-up', desc: 'Documentation, spec, or technical post' },
  ],
  marketing: [
    { id: 'campaign', label: '📣 Campaign',          desc: 'A campaign you ran — show the results' },
    { id: 'content',  label: '✍️ Content Piece',     desc: 'Post, thread, article, or video you published' },
    { id: 'analysis', label: '📊 Analysis',          desc: 'Market research, competitor analysis, or data report' },
  ],
};

export default function SubmitPage() {
  const isLocked = CURRENT_WEEK < 2;

  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'system-ui,sans-serif' }}>

      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.4rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        ⚡ Internship Arena · Work Submission
      </div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Submit Your Work.</h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.95rem' }}>
        Week 2+. Real deliverables. Dev ships tools. Marketers run campaigns.
      </p>

      {isLocked ? (
        /* ── LOCKED STATE — Week 1 ── */
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: '2.5rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>🔒</div>
          <h2 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem' }}>Opens Week 2 — Aug 8</h2>
          <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Week 1 is Explorer phase — get oriented, post your intro ad, meet the Arena.<br />
            Submissions open Monday August 8.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 280, margin: '0 auto' }}>
            <a href="/internship/arena" style={{ background: '#2563eb', color: '#fff', padding: '0.8rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
              View Challenger Board →
            </a>
            <a href="https://antcpu.io/challenge/" style={{ background: '#f3f4f6', color: '#374151', padding: '0.8rem', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
              Week 1 Tasks →
            </a>
          </div>
        </div>
      ) : (
        /* ── ACTIVE STATE — Week 2+ ── */
        /* TODO Week 2: Wire this form to POST /api/internship/submit */
        /* Writes to: submissions table (create before Aug 8) */
        /* Fields: challenger_email, track, type, url, description, week */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Track selector */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
              Your track
            </label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {['dev', 'marketing'].map(t => (
                <button key={t} style={{ flex: 1, padding: '0.75rem', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }}>
                  {t === 'dev' ? '💻 Developer' : '📣 Marketer'}
                </button>
              ))}
            </div>
          </div>

          {/* Submission type */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
              What are you submitting?
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {SUBMISSION_TYPES.dev.map(s => (
                <div key={s.id} style={{ padding: '0.9rem 1rem', border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{s.label}</div>
                  <div style={{ color: '#9ca3af', fontSize: '0.8rem' }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* URL */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
              Link to your work
            </label>
            <input disabled placeholder="https://github.com/... or https://..." style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '1rem', boxSizing: 'border-box' as const, background: '#f9fafb', color: '#9ca3af' }} />
          </div>

          {/* Description */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: '0.5rem' }}>
              What did you build / do?
            </label>
            <textarea disabled placeholder="Describe your work in 2–3 sentences..." rows={4} style={{ width: '100%', padding: '0.8rem 1rem', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.95rem', boxSizing: 'border-box' as const, resize: 'vertical', background: '#f9fafb', color: '#9ca3af' }} />
          </div>

          <button disabled style={{ background: '#d1d5db', color: '#9ca3af', border: 'none', padding: '0.9rem', borderRadius: 8, fontWeight: 700, fontSize: '1rem', cursor: 'not-allowed' }}>
            Submit Work — Opens Aug 8
          </button>
        </div>
      )}

      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
        ⚡ antcpu.io · Human in the Loop · August 2026
      </div>
    </main>
  );
}
