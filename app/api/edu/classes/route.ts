// app/api/edu/classes/route.ts
// EDU Classes — Public API
// Returns all active classes with their lessons.
// Consumed by edu-sdk.js and preview.html on antcpu.com/edu
// CORS open to antcpu.com

import { NextResponse } from 'next/server'
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

export async function GET() {
  try {
    const [{ data: classes, error: classErr }, { data: lessons, error: lessonErr }] =
      await Promise.all([
        supabase
          .from('edu_classes')
          .select('id, slug, label, description, category, icon, level, teacher, lesson_count, status, above_cutoff, arena_linked, sort_order')
          .eq('active', true)
          .order('category')
          .order('sort_order'),
        supabase
          .from('edu_lessons')
          .select('id, class_id, lesson_order, slug, title, duration, status, sort_order')
          .eq('active', true)
          .order('sort_order'),
      ])

    if (classErr) throw classErr
    if (lessonErr) throw lessonErr

    const result = (classes ?? []).map(cls => ({
      ...cls,
      lessons: (lessons ?? [])
        .filter(l => l.class_id === cls.id)
        .sort((a, b) => a.sort_order - b.sort_order),
    }))

    const stats = {
      total_classes: result.filter(c => c.status === 'live').length,
      total_lessons: result.reduce((sum, c) => sum + (c.lesson_count || 0), 0),
      categories: 4,
      teachers: [...new Set(result.map(c => c.teacher))].length,
    }

    return NextResponse.json(
      { ok: true, classes: result, stats },
      { headers: CORS }
    )
  } catch {
    return NextResponse.json(
      { ok: false, error: 'failed to load classes' },
      { status: 500, headers: CORS }
    )
  }
}
