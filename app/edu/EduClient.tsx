// app/edu/EduClient.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type EduClass = {
  id: string
  slug: string
  label: string
  description: string
  category: string
  icon: string
  level: string
  teacher: string
  lesson_count: number
  status: string
  above_cutoff: boolean
  arena_linked: boolean
  sort_order: number
}

const CATEGORY_META: Record<string, { label: string; emoji: string; color: string }> = {
  cpu:      { label: 'CPU — Technology',           emoji: '💻', color: '#4caf50' },
  art:      { label: 'Art — Design & Visual',      emoji: '🎨', color: '#f5e642' },
  music:    { label: 'Music — Genre Tracks',        emoji: '🎵', color: '#64b5f6' },
  religion: { label: 'Religion — Bible, Art & History', emoji: '✝️', color: '#ce93d8' },
}

const STATUS_BADGE: Record<string, { label: string; color: string }> = {
  live:     { label: '✅ Live',     color: '#4caf50' },
  coming:   { label: 'Coming',     color: '#888' },
  waitlist: { label: '🔒 Waitlist', color: '#f5e642' },
  paid:     { label: 'Paid',       color: '#ce93d8' },
}

export default function EduClient() {
  const [classes, setClasses] = useState<EduClass[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('edu_classes')
      .select('*')
      .eq('active', true)
      .order('category')
      .order('sort_order')
      .then(({ data }) => {
        setClasses(data ?? [])
        setLoading(false)
      })
  }, [])

  const byCategory = ['cpu', 'art', 'music', 'religion'].map(cat => ({
    cat,
    meta: CATEGORY_META[cat],
    classes: classes.filter(c => c.category === cat),
  }))

  const liveCount   = classes.filter(c => c.status === 'live').length
  const lessonTotal = classes.reduce((sum, c) => sum + (c.lesson_count || 0), 0)

  return (
    <div style={s.root}>

      {/* ── Header ── */}
      <div style={s.header}>
        <div style={s.tag}>🎓 antcpu EDU</div>
        <h1 style={s.title}>Free classes in tech, art,<br />music & religion.</h1>
        <p style={s.sub}>Self-paced · No signup · No credit card · Always free</p>
        <div style={s.stats}>
          <span style={s.stat}><b style={{ color: '#4caf50' }}>{loading ? '···' : lessonTotal}</b> lessons</span>
          <span style={s.stat}><b style={{ color: '#4caf50' }}>{loading ? '···' : liveCount}</b> classes open</span>
          <span style={s.stat}><b style={{ color: '#4caf50' }}>4</b> categories</span>
          <span style={s.stat}><b style={{ color: '#4caf50' }}>Free</b> always</span>
        </div>
        <a href="https://antcpu.com/edu" style={s.ctaBtn} target="_blank" rel="noreferrer">
          Go to antcpu EDU →
        </a>
      </div>

      {/* ── Categories ── */}
      {loading ? (
        <div style={s.loading}>Loading classes···</div>
      ) : (
        byCategory.map(({ cat, meta, classes: catClasses }) => (
          <div key={cat} style={s.section}>
            <div style={s.catHeader}>
              <span style={{ ...s.catDot, background: meta.color }} />
              <span style={s.catLabel}>{meta.emoji} {meta.label}</span>
              <span style={s.catCount}>{catClasses.reduce((s, c) => s + (c.lesson_count || 0), 0)} lessons</span>
            </div>

            <div style={s.grid}>
              {catClasses.map(c => {
                const badge  = STATUS_BADGE[c.status] ?? STATUS_BADGE.coming
                const isLive = c.status === 'live'
                return (
                  <a
                    key={c.id}
                    href={isLive ? `https://antcpu.com/edu/classes/${c.slug}/` : undefined}
                    target="_blank"
                    rel="noreferrer"
                    style={{ ...s.card, opacity: isLive ? 1 : 0.55, cursor: isLive ? 'pointer' : 'default', textDecoration: 'none' }}
                  >
                    <div style={s.cardTop}>
                      <span style={s.cardIcon}>{c.icon}</span>
                      {c.arena_linked && <span style={s.arenaBadge}>🏟️ Arena</span>}
                    </div>
                    <div style={s.cardLabel}>{c.label}</div>
                    <div style={s.cardDesc}>{c.description}</div>
                    <div style={s.cardFooter}>
                      <span style={s.levelBadge}>{c.level}</span>
                      <span style={{ ...s.statusBadge, color: badge.color }}>{badge.label}</span>
                      {c.lesson_count > 0 && (
                        <span style={s.lessonCount}>{c.lesson_count} lessons</span>
                      )}
                    </div>
                    {c.teacher === 'chase' && (
                      <div style={s.teacher}>👤 Chase</div>
                    )}
                  </a>
                )
              })}
            </div>
          </div>
        ))
      )}

      {/* ── Footer CTA ── */}
      <div style={s.footer}>
        <span style={s.footerText}>Want to teach here?</span>
        <a href="https://antcpu.com/edu/teach/" style={s.footerLink} target="_blank" rel="noreferrer">
          Apply to Teach →
        </a>
      </div>

    </div>
  )
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  root:        { maxWidth: 900, margin: '0 auto', padding: '32px 20px', fontFamily: 'var(--font-mono, monospace)', color: '#e6e6e0' },
  header:      { marginBottom: 40, display: 'flex', flexDirection: 'column', gap: 10 },
  tag:         { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: '#4caf50' },
  title:       { fontSize: 28, fontWeight: 700, margin: 0, lineHeight: 1.2, color: '#fff' },
  sub:         { fontSize: 13, color: '#888', margin: 0 },
  stats:       { display: 'flex', gap: 20, flexWrap: 'wrap', marginTop: 4 },
  stat:        { fontSize: 12, color: '#aaa' },
  ctaBtn:      { alignSelf: 'flex-start', marginTop: 8, fontSize: 12, fontWeight: 700, color: '#4caf50', border: '1px solid rgba(76,175,80,0.35)', borderRadius: 6, padding: '6px 16px', textDecoration: 'none', background: 'rgba(76,175,80,0.08)' },
  loading:     { fontSize: 12, color: '#555', padding: '40px 0', textAlign: 'center' },
  section:     { marginBottom: 36 },
  catHeader:   { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, borderBottom: '1px solid #1e1e1e', paddingBottom: 10 },
  catDot:      { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  catLabel:    { fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', color: '#e6e6e0' },
  catCount:    { marginLeft: 'auto', fontSize: 11, color: '#555' },
  grid:        { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 },
  card:        { background: '#0f0f0b', border: '1px solid #1e1e1e', borderRadius: 8, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 6, transition: 'border-color 0.15s' },
  cardTop:     { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  cardIcon:    { fontSize: 20 },
  arenaBadge:  { fontSize: 10, color: '#f5e642', border: '1px solid rgba(245,230,66,0.3)', borderRadius: 4, padding: '2px 6px' },
  cardLabel:   { fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.3 },
  cardDesc:    { fontSize: 11, color: '#666', lineHeight: 1.5 },
  cardFooter:  { display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 4, alignItems: 'center' },
  levelBadge:  { fontSize: 10, color: '#555', textTransform: 'capitalize' },
  statusBadge: { fontSize: 10, fontWeight: 600 },
  lessonCount: { fontSize: 10, color: '#555', marginLeft: 'auto' },
  teacher:     { fontSize: 10, color: '#888', marginTop: 2 },
  footer:      { marginTop: 40, paddingTop: 20, borderTop: '1px solid #1e1e1e', display: 'flex', alignItems: 'center', gap: 16 },
  footerText:  { fontSize: 12, color: '#555' },
  footerLink:  { fontSize: 12, color: '#4caf50', textDecoration: 'none' },
}
