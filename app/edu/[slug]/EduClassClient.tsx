// app/edu/[slug]/EduClassClient.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const BASE_EDU = 'https://antcpu.com/edu/classes'

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
}

type EduLesson = {
  id: string
  lesson_order: number
  slug: string
  title: string
  subtitle: string | null
  duration: string | null
  status: string
  sort_order: number
}

const CATEGORY_COLOR: Record<string, string> = {
  cpu:      '#4caf50',
  art:      '#f5e642',
  music:    '#64b5f6',
  religion: '#ce93d8',
}

const CATEGORY_LABEL: Record<string, string> = {
  cpu:      '💻 CPU',
  art:      '🎨 Art',
  music:    '🎵 Music',
  religion: '✝️ Religion',
}

export default function EduClassClient() {
  const { slug } = useParams<{ slug: string }>()
  const [cls, setCls] = useState<EduClass | null>(null)
  const [lessons, setLessons] = useState<EduLesson[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    Promise.all([
      supabase.from('edu_classes').select('*').eq('slug', slug).maybeSingle(),
      supabase.from('edu_lessons').select('*').eq('class_id',
        supabase.from('edu_classes').select('id').eq('slug', slug)
      ).order('sort_order'),
    ]).then(async ([{ data: classData }, _]) => {
      if (!classData) { setNotFound(true); setLoading(false); return }
      setCls(classData)
      const { data: lessonData } = await supabase
        .from('edu_lessons')
        .select('*')
        .eq('class_id', classData.id)
        .order('sort_order')
      setLessons(lessonData ?? [])
      setLoading(false)
    })
  }, [slug])

  if (loading) return <div style={s.loading}>Loading···</div>
  if (notFound) return (
    <div style={s.root}>
      <div style={s.notFound}>Class not found.</div>
      <a href="/edu" style={s.back}>← Back to EDU</a>
    </div>
  )
  if (!cls) return null

  const color = CATEGORY_COLOR[cls.category] ?? '#4caf50'
  const liveCount = lessons.filter(l => l.status === 'live').length

  return (
    <div style={s.root}>

      {/* back */}
      <a href="/edu" style={s.back}>← antcpu EDU</a>

      {/* header */}
      <div style={s.header}>
        <div style={{ ...s.catTag, color }}>{CATEGORY_LABEL[cls.category]} · {cls.level}</div>
        <div style={s.icon}>{cls.icon}</div>
        <h1 style={s.title}>{cls.label}</h1>
        <p style={s.desc}>{cls.description}</p>
        <div style={s.meta}>
          <span style={s.metaItem}>{liveCount} of {cls.lesson_count} lessons live</span>
          {cls.teacher === 'chase' && <span style={s.metaItem}>👤 Chase</span>}
          {cls.arena_linked && <span style={{ ...s.metaItem, color: '#f5e642' }}>🏟️ Arena</span>}
          {cls.above_cutoff
            ? <span style={{ ...s.metaItem, color: '#4caf50' }}>✅ Free</span>
            : <span style={{ ...s.metaItem, color: '#ce93d8' }}>Paid</span>
          }
        </div>

        {/* CTA */}
        {cls.status === 'live' && lessons.length > 0 && (
          <a
            href={`${BASE_EDU}/${cls.slug}/lesson-1.html`}
            style={s.ctaBtn}
            target="_blank"
            rel="noreferrer"
          >
            Start Lesson 1 →
          </a>
        )}
        {cls.status === 'waitlist' && (
          <a
            href={`${BASE_EDU}/${cls.slug}/waitlist/`}
            style={{ ...s.ctaBtn, background: 'rgba(245,230,66,0.08)', borderColor: 'rgba(245,230,66,0.35)', color: '#f5e642' }}
            target="_blank"
            rel="noreferrer"
          >
            Join the Waitlist →
          </a>
        )}
      </div>

      {/* lessons */}
      <div style={s.lessonsSection}>
        <div style={s.sectionLabel}>// lessons</div>
        {lessons.length === 0 ? (
          <div style={s.comingSoon}>Lessons coming soon.</div>
        ) : (
          lessons.map((l, i) => {
            const isLive = l.status === 'live'
            const href = `${BASE_EDU}/${cls.slug}/${l.slug}.html`
            return (
              <a
                key={l.id}
                href={isLive ? href : undefined}
                target={isLive ? '_blank' : undefined}
                rel="noreferrer"
                style={{ ...s.lessonRow, opacity: isLive ? 1 : 0.45, cursor: isLive ? 'pointer' : 'default', textDecoration: 'none' }}
              >
                <span style={{ ...s.lessonNum, color }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={s.lessonTitle}>{l.title}</span>
                {l.duration && <span style={s.lessonDur}>{l.duration}</span>}
                <span style={{ ...s.lessonStatus, color: isLive ? '#4caf50' : '#555' }}>
                  {isLive ? (i === 0 ? 'START HERE' : 'VIEW') : 'COMING'}
                </span>
              </a>
            )
          })
        )}
      </div>

      {/* footer */}
      <div style={s.footer}>
        <a href="/edu" style={s.back}>← Back to all classes</a>
        <a href="https://antcpu.com/edu" style={s.extLink} target="_blank" rel="noreferrer">
          antcpu.com/edu →
        </a>
      </div>

    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  root:          { maxWidth: 720, margin: '0 auto', padding: '28px 20px', fontFamily: 'var(--font-mono, monospace)', color: '#e6e6e0' },
  loading:       { padding: '60px 20px', textAlign: 'center', fontSize: 12, color: '#555' },
  notFound:      { fontSize: 14, color: '#555', padding: '40px 0' },
  back:          { fontSize: 11, color: '#555', textDecoration: 'none', letterSpacing: '0.05em' },
  header:        { marginTop: 20, marginBottom: 32, display: 'flex', flexDirection: 'column', gap: 10 },
  catTag:        { fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase' },
  icon:          { fontSize: 32 },
  title:         { fontSize: 26, fontWeight: 700, margin: 0, color: '#fff', lineHeight: 1.2 },
  desc:          { fontSize: 13, color: '#888', margin: 0, lineHeight: 1.6 },
  meta:          { display: 'flex', gap: 16, flexWrap: 'wrap' },
  metaItem:      { fontSize: 11, color: '#666' },
  ctaBtn:        { alignSelf: 'flex-start', fontSize: 12, fontWeight: 700, color: '#4caf50', border: '1px solid rgba(76,175,80,0.35)', borderRadius: 6, padding: '8px 20px', textDecoration: 'none', background: 'rgba(76,175,80,0.08)' },
  lessonsSection:{ marginBottom: 32 },
  sectionLabel:  { fontSize: 11, color: '#555', letterSpacing: '0.08em', marginBottom: 12 },
  comingSoon:    { fontSize: 12, color: '#555' },
  lessonRow:     { display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: '1px solid #111', color: 'inherit' },
  lessonNum:     { fontSize: 12, fontWeight: 700, minWidth: 24 },
  lessonTitle:   { fontSize: 13, flex: 1, color: '#e6e6e0' },
  lessonDur:     { fontSize: 11, color: '#555' },
  lessonStatus:  { fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' },
  footer:        { display: 'flex', justifyContent: 'space-between', paddingTop: 20, borderTop: '1px solid #1e1e1e' },
  extLink:       { fontSize: 11, color: '#4caf50', textDecoration: 'none' },
}
