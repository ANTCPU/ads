// app/api/edu/progress/route.ts
// EDU Student Progress — GET ?email=
// Returns all completed lessons grouped by class + streak stats
// Powers resume bar, progress bars, gates on lesson pages
// CORS open to antcpu.com

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CORS = {
  'Access-Control-Allow-Origin': 'https://antcpu.com',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get('email')
    if (!email) return NextResponse.json(
      { ok: false, error: 'email required' },
      { status: 400, headers: CORS }
    )

    const norm = email.trim().toLowerCase()

    const { data: rows, error } = await supabase
      .from('edu_progress')
      .select(`
        id,
        completed_at,
        class_id,
        lesson_id,
        edu_classes ( slug, label, icon, category ),
        edu_lessons ( slug, title, lesson_order )
      `)
      .eq('email', norm)
      .order('completed_at', { ascending: true })

    if (error) throw error

    type ClassRow = { slug: string; label: string; icon: string; category: string }
    type LessonRow = { slug: string; title: string; lesson_order: number }

    const byClass: Record<string, {
      class_slug: string
      label: string
      icon: string
      category: string
      lessons: string[]
      last_completed: string
    }> = {}

    for (const row of (rows ?? [])) {
      const rawCls = row.edu_classes
      const rawLes = row.edu_lessons

      // Supabase returns joined rows as object or array — normalise both
      const cls: ClassRow | null = Array.isArray(rawCls)
        ? (rawCls[0] ?? null)
        : (rawCls as ClassRow | null)

      const les: LessonRow | null = Array.isArray(rawLes)
        ? (rawLes[0] ?? null)
        : (rawLes as LessonRow | null)

      if (!cls || !les) continue

      if (!byClass[cls.slug]) {
        byClass[cls.slug] = {
          class_slug: cls.slug,
          label: cls.label,
          icon: cls.icon,
          category: cls.category,
          lessons: [],
          last_completed: row.completed_at,
        }
      }
      byClass[cls.slug].lessons.push(les.slug)
      byClass[cls.slug].last_completed = row.completed_at
    }

    const classes = Object.values(byClass)
    const totalLessons = classes.reduce((s, c) => s + c.lessons.length, 0)
    const days = new Set((rows ?? []).map(r => r.completed_at?.slice(0, 10)))

    return NextResponse.json({
      ok: true,
      email: norm,
      stats: {
        total_lessons: totalLessons,
        total_classes: classes.length,
        streak_days: days.size,
      },
      classes,
    }, { headers: CORS })

  } catch {
    return NextResponse.json(
      { ok: false, error: 'server error' },
      { status: 500, headers: CORS }
    )
  }
}
