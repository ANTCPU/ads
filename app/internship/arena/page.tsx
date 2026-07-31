// ============================================================
// app/internship/arena/page.tsx
// Live challenger board — Dev and Marketing tabs
//
// Server component — reads challengers table directly.
// Revalidates every 60s — always fresh without full reload.
// This is your admin view + public leaderboard in one.
// See DEV.md — The Internship Arena
// ============================================================

import { createClient } from '@supabase/supabase-js';

export const revalidate = 60;

export const metadata = {
  title: 'Challenger Board — antcpu.io Internship Arena',
  description: 'Live leaderboard of Dev and Marketing challengers in the antcpu.io Human in the Loop Internship Challenge.',
};

// ─── Country flags ────────────────────────────────────────────
const FLAG: Record<string, string> = {
  'United States': '🇺🇸', 'United Kingdom': '🇬🇧', 'Canada': '🇨🇦',
  'Australia': '🇦🇺', 'India': '🇮🇳', 'Nigeria': '🇳🇬', 'Brazil': '🇧🇷',
  'Germany': '🇩🇪', 'France': '🇫🇷', 'Philippines': '🇵🇭',
  'South Africa': '🇿🇦', 'Mexico': '🇲🇽', 'Indonesia': '🇮🇩',
  'Pakistan': '🇵🇰', 'Bangladesh': '🇧🇩', 'Kenya': '🇰🇪',
  'Ghana': '🇬🇭', 'Egypt': '🇪🇬', 'China': '🇨🇳', 'Japan': '🇯🇵',
  'South Korea': '🇰🇷', 'Italy': '🇮🇹', 'Spain': '🇪🇸',
  'Iran': '🇮🇷', 'Senegal': '🇸🇳', 'Other': '🌍',
};

type Challenger = {
  id: string;
  name: string;
  country: string;
  track: string;
  week: number;
  points: number;
  role_title: string;
  is_early_adopter: boolean;
  created_at: string;
};

// ─── Challenger card ──────────────────────────────────────────
function ChallengerCard({ c, rank }: { c: Challenger; rank: number }) {
  const flag       = FLAG[c.country] ?? '🌍';
  const trackLabel = c.track === 'dev' ? '💻 Developer' : '📣 Marketer';
  const weekLabel  = ['', '🔭 Explorer', '⚡ Creator', '🤝 Collaborator', '🚀 Leader'][c.week] ?? `Week ${c.week}`;

  return (
    <div style={{
      border: '1px solid #e5e7eb', borderRadius: 12, padding: '1rem 1.25rem',
      background: '#fff', marginBottom: '0.75rem',
      borderLeft: rank <= 3 ? '3px solid #2563eb' : '1px solid #e5e7eb',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
            {rank <= 3 && (
              <span style={{ fontSize: '0.9rem' }}>
                {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
              </span>
            )}
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{c.name}</span>
            {c.is_early_adopter && (
              <span style={{ background: '#fef9c3', color: '#854d0e', padding: '0.1rem 0.5rem', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700 }}>
                ⭐ Founding
              </span>
            )}
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.8rem', marginBottom: '0.2rem' }}>
            {flag} {c.country}
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.4rem' }}>
            <span style={{ background: '#eff6ff', color: '#2563eb', padding: '0.15rem 0.6rem', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600 }}>
              {trackLabel}
            </span>
            <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '0.15rem 0.6rem', borderRadius: 999, fontSize: '0.72rem' }}>
              {weekLabel}
            </span>
            <span style={{ background: '#f3f4f6', color: '#6b7280', padding: '0.15rem 0.6rem', borderRadius: 999, fontSize: '0.72rem' }}>
              {c.role_title}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#2563eb' }}>{c.points}</div>
          <div style={{ color: '#9ca3af', fontSize: '0.7rem' }}>pts</div>
        </div>
      </div>
    </div>
  );
}

// ─── Section ──────────────────────────────────────────────────
function Section({ title, list }: { title: string; list: Challenger[] }) {
  return (
    <div style={{ marginBottom: '2.5rem' }}>
      <h2 style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        {title}
        <span style={{ color: '#9ca3af', fontWeight: 400, fontSize: '0.9rem' }}>({list.length})</span>
      </h2>
      {list.length === 0 ? (
        <div style={{ color: '#9ca3af', padding: '2rem', textAlign: 'center', border: '1px dashed #e5e7eb', borderRadius: 12, fontSize: '0.9rem' }}>
          No challengers yet — be the first.{' '}
          <a href="/internship/join" style={{ color: '#2563eb' }}>Join now →</a>
        </div>
      ) : (
        list.map((c, i) => <ChallengerCard key={c.id} c={c} rank={i + 1} />)
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────
export default async function InternshipArenaPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data } = await supabase
    .from('challengers')
    .select('id, name, country, track, week, points, role_title, is_early_adopter, created_at')
    .eq('status', 'active')
    .order('points', { ascending: false });

  const all  = (data ?? []) as Challenger[];
  const devs = all.filter(c => c.track === 'dev');
  const mkts = all.filter(c => c.track === 'marketing');
  const countries = new Set(all.map(c => c.country)).size;

  return (
    <main style={{ maxWidth: 680, margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'system-ui,sans-serif' }}>

      {/* Header */}
      <div style={{ fontSize: '0.72rem', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
        ⚡ ANTCPU ADS · Internship Arena · Live
      </div>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>Challenger Board.</h1>
      <p style={{ color: '#6b7280', marginBottom: '0.5rem', fontSize: '0.95rem' }}>
        {all.length} challenger{all.length !== 1 ? 's' : ''} · {countries} countr{countries !== 1 ? 'ies' : 'y'} · August 2026 Cohort
      </p>
      <p style={{ color: '#9ca3af', fontSize: '0.75rem', marginBottom: '2rem' }}>
        Updates every 60s · Sorted by points
      </p>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
        <a href="/internship/join" style={{
          background: '#2563eb', color: '#fff', padding: '0.7rem 1.5rem',
          borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem',
        }}>
          + Join the Challenge
        </a>
        <a href="/internship" style={{
          background: '#f3f4f6', color: '#374151', padding: '0.7rem 1.5rem',
          borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem',
        }}>
          About the Challenge
        </a>
        <a href="/arena" style={{
          background: '#f3f4f6', color: '#374151', padding: '0.7rem 1.5rem',
          borderRadius: 8, fontWeight: 600, textDecoration: 'none', fontSize: '0.875rem',
        }}>
          Full Arena →
        </a>
      </div>

      {/* Boards */}
      <Section title="💻 Developers" list={devs} />
      <Section title="📣 Marketers"  list={mkts} />

      {/* Footer */}
      <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '1.5rem', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
        Part of the <a href="https://antcpu.io" style={{ color: '#2563eb' }}>antcpu.io</a> Human in the Loop Internship Challenge ·{' '}
        <a href="https://antcpu-ads.vercel.app" style={{ color: '#2563eb' }}>antcpu-ads.vercel.app</a>
      </div>
    </main>
  );
}
