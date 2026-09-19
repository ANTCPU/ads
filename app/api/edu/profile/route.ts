// app/api/edu/profile/route.ts
// ─── EDU Student Profile ──────────────────────────────────────────────────────
// Full EDU picture for a student by email.
// Used by: EDU dashboard, herald nudge logic, admin KYC view.
//
// GET /api/edu/profile?email=...
//
// Returns:
//   classes_started    — distinct classes with any progress
//   lessons_completed  — total lesson count
//   progress_by_class  — per-class breakdown with completion %
//   last_active        — most recent completion timestamp
//   in_ad_signups      — whether identity is captured
//   herald_eligible    — true if email is real and not unsubscribed
//
// CORS: antcpu.com + antcpu-ads.vercel.app
// No auth — email is the key, used by EDU pages directly
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email')?.trim().toLowerCase()

  if (!email) {
    return NextResponse.json(
      { ok: false, error: 'email required' },
      { status: 400, headers: CORS }
    )
  }

  // ── Parallel queries ──────────────────────────────────────────────────────
  const [
    { data: progress },
    { data: identity },
    { data: unsubRecord },
    { data: classes },
  ] = await Promise.all([

    // All completed lessons for this email
    supabase
      .from('edu_progress')
      .select('id, class_id, lesson_id, created_at')
      .eq('email', email)
      .order('created_at', { ascending: false }),

    // Identity in ad_signups
    supabase
      .from('ad_signups')
      .select('email, source, status, created_at, membership_tier')
      .eq('email', email)
      .maybeSingle(),

    // Unsubscribe record
    supabase
      .from('unsubscribes')
      .select('email')
      .eq('email', email)
      .maybeSingle(),

    // All EDU classes — for title + lesson count lookup
    supabase
      .from('edu_classes')
      .select('id, slug, title, lesson_count'),
  ])

  const progressRows  = progress  ?? []
  const classRegistry = classes   ?? []

  // ── Build per-class breakdown ─────────────────────────────────────────────
  const classMap: Record<string, {
    class_id:          string
    slug:              string
    title:             string
    lessons_completed: number
    total_lessons:     number
    pct:               number
    last_completed:    string | null
  }> = {}

  for (const row of progressRows) {
    const cls = classRegistry.find(c => c.id === row.class_id)
    if (!cls) continue

    if (!classMap[row.class_id]) {
      classMap[row.class_id] = {
        class_id:          row.class_id,
        slug:              cls.slug,
        title:             cls.title,
        lessons_completed: 0,
        total_lessons:     cls.lesson_count ?? 0,
        pct:               0,
        last_completed:    null,
      }
    }

    classMap[row.class_id].lessons_completed += 1
    if (!classMap[row.class_id].last_completed) {
      classMap[row.class_id].last_completed = row.created_at
    }
  }

  // Calculate completion %
  for (const entry of Object.values(classMap)) {
    entry.pct = entry.total_lessons > 0
      ? Math.round((entry.lessons_completed / entry.total_lessons) * 100)
      : 0
  }

  const progressByClass = Object.values(classMap)
    .sort((a, b) => (b.last_completed ?? '').localeCompare(a.last_completed ?? ''))

  // ── Response ──────────────────────────────────────────────────────────────
  return NextResponse.json({
    ok:    true,
    email,

    summary: {
      classes_started:   progressByClass.length,
      lessons_completed: progressRows.length,
      last_active:       progressRows[0]?.created_at ?? null,
      in_ad_signups:     !!identity,
      herald_eligible:   !!identity && !unsubRecord,
      source:            identity?.source ?? null,
      membership_tier:   identity?.membership_tier ?? null,
    },

    progress_by_class: progressByClass,

    // Raw for admin / herald use
    identity:   identity   ?? null,
    unsubscribed: !!unsubRecord,
  }, { headers: CORS })
}
