// ============================================================
// app/internship/collab/page.tsx
// Team Collaboration Hub — Week 3 + 4
//
// Week 1–2: Shows upcoming state — visible, locked.
// Week 3: Dev + Marketing pairing activates.
// Week 4: Project leadership tools activate.
//
// PLACEHOLDER — frame live now, tools activate Aug 15.
// See DEV.md — Planned Pages (Internship Collab Hub)
// ============================================================

export const metadata = {
  title: 'Collab Hub — antcpu.io Internship Arena',
  description: 'Week 3–4 team collaboration tools for the antcpu.io Internship Challenge.',
};

const CURRENT_WEEK = 1;

const COLLAB_TOOLS = [
  {
    week: 3,
    icon: '🤝',
    title: 'Dev × Marketing Pairing',
    desc: 'Get matched with a challenger from the other track. One Dev + one Marketer = one team.',
    status: 'Week 3 — Aug 15',
    features: [
      'Auto-pairing based on country + timezone',
      'Shared project brief assigned to your pair',
      'Joint submission — both get credit',
      'Pair leaderboard — top pairs ranked',
    ],
  },
  {
    week: 3,
    icon: '📋',
    title: 'Shared Brief',
    desc: 'Your pair gets a real brief — a mini-project that needs both a Dev and a Marketer.',
    status: 'Week 3 — Aug 15',
    features: [
      'Brief assigned Monday Aug 15',
      'Dev builds the tool, Marketer runs the campaign',
      'Submit together by Sunday Aug 21',
      'Aria reviews and scores the joint submission',
    ],
  },
  {
    week: 4,
    icon: '🚀',
    title: 'Project Leadership',
    desc: 'Week 4 top challengers lead a project. You direct, others contribute.',
    status: 'Week 4 — Aug 22',
    features: [
      'Top 3 Dev + top 3 Marketing become project leads',
      'Leads recruit 2–3 challengers to their project',
      'Project ships by Aug 31',
      'Leaders earn permanent role title in the Arena',
    ],
  },
  {
    week: 4,
    icon: '🏆',
    title: 'Final Showcase',
    desc: 'Every challenger presents their best work. The Arena votes. Top work gets featured permanently.',
    status: 'Week 4 — Aug 29–31',
    features: [
      'Submit your best single piece of work',
      'Arena community votes Aug 29–30',
      'Top Dev + top Marketer announced Aug 31',
      'Winning work featured in the Arena permanently',
    ],
  },
];

export default function CollabPage() {
  const isLocked = CURRENT_WEEK < 3;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'system-ui,sans-serif' }}>

      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: '0.4rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        ⚡ Internship Arena · Collab Hub
      </div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.5rem' }}>Team Collab Hub.</h1>
      <p style={{ color: '#6b7280', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
        Weeks 3 + 4. Dev meets Marketing. Teams form. Projects ship.
      </p>

      {isLocked && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '2rem', fontSize: '0.85rem', color: '#92400e', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span>🔒</span>
          <span>Collab tools activate Week 3 — Monday August 15. Complete Weeks 1 + 2 first.</span>
        </div>
      )}

      {/* ── TOOL CARDS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '3rem' }}>
        {COLLAB_TOOLS.map(tool => {
          const toolLocked = CURRENT_WEEK < tool.week;
          return (
            <div key={tool.title} style={{
              border: `1px solid ${toolLocked ? '#e5e7eb' : '#2563eb30'}`,
              borderRadius: 14, padding: '1.5rem',
              background: toolLocked ? '#fafafa' : '#eff6ff',
              opacity: toolLocked ? 0.75 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.5rem' }}>{tool.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '1rem' }}>{tool.title}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.82rem' }}>{tool.desc}</div>
                  </div>
                </div>
                <span style={{
                  background: toolLocked ? '#f3f4f6' : '#dbeafe',
                  color: toolLocked ? '#9ca3af' : '#1d4ed8',
                  padding: '0.2rem 0.75rem', borderRadius: 999,
                  fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
                }}>
                  {toolLocked ? `🔒 ${tool.status}` : `✅ ${tool.status}`}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                {tool.features.map(f => (
                  <div key={f} style={{ display: 'flex', gap: '0.5rem', fontSize: '0.82rem', color: toolLocked ? '#9ca3af' : '#374151' }}>
                    <span style={{ color: toolLocked ? '#d1d5db' : '#2563eb', flexShrink: 0 }}>→</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── PAIRING PREVIEW — Week 3 placeholder ── */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Week 3 Pairing Preview — How It Works
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>💻</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Developer</div>
            <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>Builds the tool</div>
          </div>
          <div style={{ textAlign: 'center', fontWeight: 800, fontSize: '1.2rem', color: '#9ca3af' }}>×</div>
          <div style={{ background: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>📣</div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>Marketer</div>
            <div style={{ color: '#6b7280', fontSize: '0.75rem' }}>Runs the campaign</div>
          </div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.9rem 1rem', fontSize: '0.82rem', color: '#6b7280', lineHeight: 1.6 }}>
          <strong style={{ color: '#374151' }}>The brief:</strong> Build a tool that helps a brand grow their Arena presence.
          Dev builds it. Marketer launches it. Both submit together. Both get scored.
          Pairs are matched by country + timezone — you work with someone in your region.
        </div>
      </div>

      {/* ── WEEK 4 LEADERSHIP PREVIEW ── */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          Week 4 Leadership — How It Works
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[
            { step: '01', text: 'Top 3 Dev + top 3 Marketing by points become project leads on Aug 22' },
            { step: '02', text: 'Each lead picks a project brief and recruits 2–3 challengers' },
            { step: '03', text: 'Teams build and ship by Aug 31 — real output, not slides' },
            { step: '04', text: 'Arena community votes Aug 29–30. Winners announced Aug 31' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
              <span style={{ fontWeight: 800, fontSize: '0.75rem', color: '#2563eb', minWidth: 24, paddingTop: 2 }}>{s.step}</span>
              <span style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.5 }}>{s.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── CTA ── */}
      <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
        <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginBottom: '1rem' }}>
          Not registered yet? Join now to be ready for Week 3.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/internship/join" style={{ background: '#2563eb', color: '#fff', padding: '0.8rem 1.75rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
            Join the Challenge →
          </a>
          <a href="/internship/arena" style={{ background: '#f3f4f6', color: '#374151', padding: '0.8rem 1.5rem', borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: '0.9rem' }}>
            Challenger Board →
          </a>
        </div>
      </div>

      <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid #e5e7eb', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
        ⚡ antcpu.io · Human in the Loop · August 2026
      </div>
    </main>
  );
}
