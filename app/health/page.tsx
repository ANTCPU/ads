// app/health/page.tsx
// ─── Health Page ──────────────────────────────────────────────────────────────
//
// Internal maintenance tool — super/admin only.
// All fetches are server-side with cache: 'no-store' — no stale data ever.
// Sections: System Pulse · Arena · Build · Challenge Clock · Flags · Tix · Egg
//
// The easter egg terminal is a client component — EggTerminal.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import EggTerminal from './EggTerminal'

const SUPER_EMAIL = process.env.SUPER_EMAIL!
const BASE        = process.env.NEXT_PUBLIC_BASE_URL || 'https://antcpu-ads.vercel.app'

// ── Auth gate ─────────────────────────────────────────────────────────────────
async function getUser() {
  const cookieStore = await cookies()
  const raw = cookieStore.get('arena_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

// ── Fetch helpers — all no-store ──────────────────────────────────────────────
async function fetchStats() {
  try {
    const r = await fetch(`${BASE}/api/stats`, { cache: 'no-store' })
    return r.ok ? r.json() : null
  } catch { return null }
}

async function fetchBuild() {
  try {
    const r = await fetch(`${BASE}/api/build`, { cache: 'no-store' })
    return r.ok ? r.json() : null
  } catch { return null }
}

async function fetchClock() {
  try {
    const r = await fetch(`${BASE}/api/clock`, { cache: 'no-store' })
    return r.ok ? r.json() : null
  } catch { return null }
}

async function fetchFlags() {
  try {
    const r = await fetch(`${BASE}/api/flags`, { cache: 'no-store' })
    const j = r.ok ? await r.json() : null
    return j?.flags || null
  } catch { return null }
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = {
  page:    { minHeight: '100vh', background: '#0a0a0a', color: '#e5e5e5', fontFamily: 'monospace', padding: '2rem' },
  header:  { borderBottom: '1px solid #222', paddingBottom: '1rem', marginBottom: '2rem' },
  title:   { fontSize: '1.1rem', color: '#888', letterSpacing: '0.1em', margin: 0 },
  section: { marginBottom: '2.5rem' },
  label:   { fontSize: '0.7rem', color: '#555', letterSpacing: '0.15em', textTransform: 'uppercase' as const, marginBottom: '0.75rem' },
  grid:    { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem' },
  card:    { background: '#111', border: '1px solid #1e1e1e', borderRadius: '6px', padding: '0.75rem 1rem' },
  ok:      { color: '#4ade80', fontSize: '0.8rem' },
  warn:    { color: '#facc15', fontSize: '0.8rem' },
  err:     { color: '#f87171', fontSize: '0.8rem' },
  off:     { color: '#444', fontSize: '0.8rem' },
  val:     { fontSize: '1.1rem', fontWeight: 700, color: '#fff', marginTop: '0.25rem' },
  sub:     { fontSize: '0.7rem', color: '#555', marginTop: '0.2rem' },
  row:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #1a1a1a' },
}

export default async function HealthPage() {
  const user = await getUser()
  if (!user || (user.email !== SUPER_EMAIL && user.role !== 'admin')) {
    redirect('/login')
  }

  // Parallel fetch — all live, no cache
  const [stats, build, clock, flags] = await Promise.all([
    fetchStats(),
    fetchBuild(),
    fetchClock(),
    fetchFlags(),
  ])

  const now = new Date().toISOString()
  const supabaseOk = !!stats?.totalAds !== undefined
  const githubOk   = !!build?.lastSha
  const clockOk    = !!clock?.is_active !== undefined
  const flagsOk    = Array.isArray(flags)

  const activeFlags  = flags?.filter((f: any) => f.enabled) || []
  const inactiveFlags = flags?.filter((f: any) => !f.enabled) || []

  // Known gaps from DEV.md — static maintenance checklist
  const KNOWN_GAPS = [
    { priority: '🔴', item: 'Profile page — no Edit/Archive per ad', file: 'ProfileClient.tsx' },
    { priority: '🔴', item: '/dashboard/antcpu hardcoded to 1 email', file: 'dashboard/antcpu/page.tsx' },
    { priority: '🟡', item: 'Scout loop bug — email variable', file: 'api/scout/score/route.ts' },
    { priority: '🟡', item: 'RVS — reaction velocity not tracked', file: 'api/scout/score/route.ts' },
    { priority: '🟡', item: 'Champion cycle DB not built', file: 'DB — see ARENAS.md' },
    { priority: '🟢', item: 'arena_modules table unused', file: 'DB' },
    { priority: '🟢', item: 'cpu@antcpu.io has null brand_name', file: 'ad_signups' },
  ]

  return (
    <div style={s.page}>

      {/* Header */}
      <div style={s.header}>
        <p style={s.title}>⚡ ANTCPU · HEALTH · {now.slice(0, 19).replace('T', ' ')} UTC</p>
      </div>

      {/* Section 1 — System Pulse */}
      <div style={s.section}>
        <p style={s.label}>System Pulse</p>
        <div style={s.grid}>
          <div style={s.card}>
            <div style={supabaseOk ? s.ok : s.err}>{supabaseOk ? '● Supabase' : '✕ Supabase'}</div>
            <div style={s.sub}>{supabaseOk ? 'responding' : 'no data returned'}</div>
          </div>
          <div style={s.card}>
            <div style={githubOk ? s.ok : s.err}>{githubOk ? '● GitHub API' : '✕ GitHub API'}</div>
            <div style={s.sub}>{githubOk ? `sha ${build.lastSha}` : 'no response'}</div>
          </div>
          <div style={s.card}>
            <div style={clockOk ? s.ok : s.err}>{clockOk ? '● Clock' : '✕ Clock'}</div>
            <div style={s.sub}>{clockOk ? `cohort ${clock.cohort}` : 'no response'}</div>
          </div>
          <div style={s.card}>
            <div style={flagsOk ? s.ok : s.err}>{flagsOk ? '● Flags DB' : '✕ Flags DB'}</div>
            <div style={s.sub}>{flagsOk ? `${flags.length} flags loaded` : 'no response'}</div>
          </div>
        </div>
      </div>

      {/* Section 2 — Arena */}
      <div style={s.section}>
        <p style={s.label}>Arena — Live</p>
        <div style={s.grid}>
          {[
            { label: 'Live Ads',      val: stats?.totalAds },
            { label: 'Advertisers',   val: stats?.totalAdvertisers },
            { label: 'Countries',     val: stats?.totalCountries },
            { label: 'Total Points',  val: stats?.totalPoints },
            { label: 'Reactions',     val: stats?.totalReactions },
            { label: 'Shares',        val: stats?.totalShares },
            { label: 'Clicks',        val: stats?.totalClicks },
            { label: 'Top Brand',     val: stats?.topBrand },
          ].map(({ label, val }) => (
            <div key={label} style={s.card}>
              <div style={s.sub}>{label}</div>
              <div style={s.val}>{val ?? '—'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 3 — Build */}
      <div style={s.section}>
        <p style={s.label}>Build Pulse</p>
        <div style={s.grid}>
          {[
            { label: 'Last Commit',   val: build?.lastSha },
            { label: 'Message',       val: build?.lastMsg },
            { label: 'Total Commits', val: build?.totalCommits },
            { label: 'Velocity',      val: build?.velocity },
            { label: 'Days Building', val: build?.daysBuilding },
            { label: 'Next Milestone',val: build?.milestones?.next },
          ].map(({ label, val }) => (
            <div key={label} style={s.card}>
              <div style={s.sub}>{label}</div>
              <div style={{ ...s.val, fontSize: '0.85rem', wordBreak: 'break-all' as const }}>{val ?? '—'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 4 — Challenge Clock */}
      <div style={s.section}>
        <p style={s.label}>Challenge Clock</p>
        <div style={s.grid}>
          {[
            { label: 'Cohort',        val: clock?.cohort },
            { label: 'Day',           val: clock?.day },
            { label: 'Week',          val: `${clock?.week} — ${clock?.week_name}` },
            { label: 'Days Left',     val: clock?.days_left_total },
            { label: 'Active',        val: clock?.is_active ? 'Yes' : 'No' },
            { label: 'Next Cohort',   val: clock?.next_cohort?.cohort },
            { label: 'Opens In',      val: clock?.next_cohort ? `${clock.next_cohort.opens_in_days} days` : '—' },
          ].map(({ label, val }) => (
            <div key={label} style={s.card}>
              <div style={s.sub}>{label}</div>
              <div style={s.val}>{val ?? '—'}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 5 — Feature Flags */}
      <div style={s.section}>
        <p style={s.label}>Feature Flags — {activeFlags.length} on · {inactiveFlags.length} off</p>
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '6px', padding: '0.5rem 1rem' }}>
          {flags?.map((f: any) => (
            <div key={f.id} style={s.row}>
              <span style={{ fontSize: '0.8rem', color: f.enabled ? '#e5e5e5' : '#444' }}>{f.label}</span>
              <span style={f.enabled ? s.ok : s.off}>
                {f.enabled ? 'ON' : 'off'} · {f.version} · {f.source}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 6 — Known Gaps */}
      <div style={s.section}>
        <p style={s.label}>Known Gaps</p>
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '6px', padding: '0.5rem 1rem' }}>
          {KNOWN_GAPS.map((g, i) => (
            <div key={i} style={s.row}>
              <span style={{ fontSize: '0.8rem' }}>{g.priority} {g.item}</span>
              <span style={{ fontSize: '0.7rem', color: '#444' }}>{g.file}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Section 7 — Tix */}
      <div style={s.section}>
        <p style={s.label}>Tix — Ticket System</p>
        <div style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '6px', padding: '1rem' }}>
          <p style={{ ...s.sub, color: '#555' }}>
            Ticket system live. Use /api/tix to issue, assign, and track.
            Prefixes: ADS · IO · ANTCPU · ANTCOIN
          </p>
        </div>
      </div>

      {/* Easter Egg Terminal — client component */}
      <EggTerminal />

    </div>
  )
}
