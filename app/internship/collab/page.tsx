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
    desc: 'Your pair gets a real brief — a mini-project that needs both a Dev and a Marketer to complete.',
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
    desc: 'Week 4 top challengers lead a project. You direct, others contribute. Real leadership, real output.',
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
          <span>Collab tools activate Week 3 — Monday
