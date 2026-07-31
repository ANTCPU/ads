// ============================================================
// app/internship/page.tsx
// Internship Arena landing page
//
// Server component — live stats from challengers table.
// Dark theme matching mapofpi pattern.
// Entry point from antcpu.io/apply/
// ============================================================

import { createClient } from '@supabase/supabase-js';

export const revalidate = 60;

export const metadata = {
  title: 'Human in the Loop — antcpu.io Internship Arena',
  description: '31 days. Real roles. Real CV. Dev or Marketing. Enter the Arena.',
  openGraph: {
    title: 'Human in the Loop — antcpu.io Internship Challenge',
    description: '31 days. Real roles. Real CV. Dev or Marketing. Enter the Arena.',
    url: 'https://antcpu-ads.vercel.app/internship',
    siteName: 'ANTCPU ADS',
    images: [{ url: 'https://antcpu-ads.vercel.app/og-internchallenge.jpg', width: 1200, height: 630, alt: 'antcpu.io Human in the Loop Internship Challenge' }],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image' as const,
    title: 'Human in the Loop — antcpu.io Internship Challenge',
    description: '31 days. Real roles. Real CV. Dev or Marketing. Enter the Arena.',
    images: ['https://antcpu-ads.vercel.app/og-internchallenge.jpg'],
  },
};


const accent = '#2563eb';
const bg     = '#0a0a0a';
const card   = '#111';
const border = '#1a1a1a';
const white  = '#fff';
const muted  = '#888';
const muted2 = '#555';

const WEEKS = [
  { n: 1, icon: '🔭', title: 'Explorer',     dates: 'Aug 1–7',   desc: 'Orient. Register. Post your intro ad. Meet the Arena.',         status: 'active' },
  { n: 2, icon: '⚡', title: 'Creator',      dates: 'Aug 8–14',  desc: 'Submit your first real work. Dev ships a tool. Marketing runs a campaign.', status: 'upcoming' },
  { n: 3, icon: '🤝', title: 'Collaborator', dates: 'Aug 15–21', desc: 'Teams form. Dev + Marketing pairs build together. First collab deliverable.', status: 'upcoming' },
  { n: 4, icon: '🚀', title: 'Leader',       dates: 'Aug 22–31', desc: 'Lead a project. Present your work. Earn your role title.',       status: 'upcoming' },
];

const TRACKS = [
  {
    icon: '💻', track: 'dev', label: 'Developer',
    desc: 'Build tools, automate workflows, write code. Ship real features to the Arena. Your code runs in production.',
    deliverables: ['Week 2 — Ship a working tool or feature', 'Week 3 — Pair with a Marketer, build together', 'Week 4 — Lead a technical project'],
    href: '/internship/join?track=dev',
  },
  {
    icon: '📣', track: 'marketing', label: 'Marketer',
    desc: 'Run campaigns, build community, drive real reach. Your work appears in the Arena and beyond.',
    deliverables: ['Week 2 — Run a real campaign, submit results', 'Week 3 — Pair with a Dev, build together', 'Week 4 — Lead a brand project'],
    href: '/internship/join?track=marketing',
  },
];

export default async function InternshipPage() {
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

  return (
    <div style={{ background: bg, color: white, fontFamily: 'system-ui,sans-serif', minHeight: '100vh' }}>

      {/* ── NAV ── */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.2rem 2rem', borderBottom: `1px solid ${border}` }}>
        <div style={{ fontWeight: 800, fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: accent }}>⚡</span>
          <span>AD NETWORK</span>
          <span style={{ color: muted2, fontWeight: 400 }}>×</span>
          <span style={{ color: accent }}>antcpu.io</span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href="/internship/arena" style={{ color: muted, fontSize: '0.85rem', textDecoration: 'none' }}>Challenger Board</a>
          <a href="/arena" style={{ color: muted, fontSize: '0.85rem', textDecoration: 'none' }}>Arena</a>
        </div>
      </nav>

      {/* ── HERO ── */}
      <div style={{ textAlign: 'center', padding: '4rem 1.25rem 2.5rem' }}>
        <div style={{ display: 'inline-block', background: '#0d1a2d', border: `1px solid ${accent}40`, borderRadius: 999, padding: '0.3rem 1rem', fontSize: '0.75rem', color: accent, marginBottom: '1.5rem', fontWeight: 700 }}>
          🚀 August 2026 Cohort · Founding Members · Applications Open
        </div>
        <h1 style={{ fontSize: 'clamp(2.2rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.05, marginBottom: '1.2rem', background: `linear-gradient(135deg, ${white} 40%, ${accent})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          The Human in<br />the Loop.
        </h1>
        <p style={{ color: muted, fontSize: '1.1rem', maxWidth: 520, margin: '0 auto 2rem', lineHeight: 1.6 }}>
          31 days. Real roles. Real CV. You are a brand.<br />
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

      {/* ── LIVE STATS ── */}
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

      {/* ── WEEK TIMELINE ── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '3.5rem 1.25rem' }}>
        <div style={{ fontSize: '0.65rem', color: accent, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          The 4-Week Journey
        </div>
        <h2 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 800, marginBottom: '0.75rem' }}>
          Every week you level up.
        </h2>
        <p style={{ color: muted, marginBottom: '2.5rem', lineHeight: 1.6 }}>
          Each week has a theme, a deliverable, and a new role title. You earn your title — it's not given.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {WEEKS.map(w => (
            <div key={w.n} style={{
              background: w.status === 'active' ? '#0d1a2d' : card,
              border: `1px solid ${w.status === 'active' ? accent + '40' : border}`,
              borderRadius: 14, padding: '1.5rem',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{w.icon}</div>
              <div style={{ fontSize: '0.65rem', color: w.status === 'active' ? accent : muted2, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                Week {w.n} · {w.dates}
                {w.status === 'active' && <span style={{ marginLeft: 6, background: accent, color: white, padding: '0.1rem 0.5rem', borderRadius: 999, fontSize: '0.6rem' }}>LIVE</span>}
              </div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.5rem' }}>{w.title}</div>
              <div style={{ color: muted, fontSize: '0.82rem', lineHeight: 1.5 }}>{w.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── TRACKS ── */}
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

      {/* ── WHAT YOU GET ── */}
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
            { icon: '⭐', title: 'Founding member',   desc: 'August 2026 cohort. First in. Early adopter status.' },
            { icon: '📄', title: 'Real CV entry',     desc: 'antcpu.io Human in the Loop Internship — August 2026.' },
          ].map(item => (
            <div key={item.title} style={{ background: card, border: `1px solid ${border}`, borderRadius: 12, padding: '1.25rem' }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{item.icon}</div>
              <div style={{ fontWeight: 700, marginBottom: '0.4rem' }}>{item.title}</div>
              <div style={{ color: muted, fontSize: '0.82rem', lineHeight: 1.5 }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FINAL CTA ── */}
      <div style={{ textAlign: 'center', padding: '3.5rem 1.25rem', borderTop: `1px solid ${border}` }}>
        <h2 style={{ fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', fontWeight: 800, marginBottom: '1rem' }}>
          Ready to enter?
        </h2>
        <p style={{ color: muted, marginBottom: '2rem', fontSize: '0.95rem' }}>
          Free · Remote · ~5 hours/week · August 2026
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

      {/* ── FOOTER ── */}
      <footer style={{ textAlign: 'center', padding: '2rem', color: '#333', fontSize: '0.8rem', borderTop: `1px solid ${border}` }}>
        © {new Date().getFullYear()} AD NETWORK ·{' '}
        <span style={{ color: accent }}>⚡ ANTCPU</span> × <span style={{ color: accent }}>antcpu.io</span>
      </footer>
    </div>
  );
}
