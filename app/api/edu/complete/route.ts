// app/api/edu/complete/route.ts
// EDU Lesson Completion — Public POST endpoint
//
// Called from antcpu.com/edu lesson pages when student clicks Mark Complete.
// Writes a row to edu_progress linking email + class + lesson.
// Idempotent — duplicate completions are skipped.
//
// On completion:
//   → edu_progress row inserted
//   → captureIdentity() — email into ad_signups, source: edu-{class_slug}
//   → badge awarded — lesson-{n} badge written to student record
//   → notifyDiscord() — fires to #edu channel
//
// No emails sent — completion earns badges, not inbox noise.
// Teachers email students. School emails announcements only.
//
// CORS open to antcpu.com
// No auth required — email is student-supplied from localStorage.

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { notifyDiscord, DC }         from '../../../lib/discord'

const CORS = {
  'Access-Control-Allow-Origin':  'https://antcpu.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// ── Capture identity ──────────────────────────────────────────────────────────

async function captureIdentity(email: string, classSlug: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('ad_signups')
      .select('email')
      .eq('email', email)
      .maybeSingle()
    if (data) return
    await supabase.from('ad_signups').insert({
      email,
      name:       'EDU Student',
      brand_name: 'antcpu EDU',
      status:     'lead',
      role:       'user',
      source:     `edu-${classSlug.slice(0, 40)}`,
      created_at: new Date().toISOString(),
    })
  } catch {}
}

// ── Award badge ───────────────────────────────────────────────────────────────
// Writes to edu_badges — simple record of what the student earned.
// Badge key format: {class_slug}-lesson-{n}
// Class completion badge: {class_slug}-complete
// Displayed in student dashboard — not sent via email.

async function awardBadge(
  email:       string,
  classSlug:   string,
  lessonOrder: number,
  totalLessons: number,
): Promise<string[]> {
  const awarded: string[] = []

  try {
    const lessonBadge = `${classSlug}-lesson-${lessonOrder}`

    // Lesson badge
    const { data: existing } = await supabase
      .from('edu_badges')
      .select('id')
      .eq('email', email)
      .eq('badge', lessonBadge)
      .maybeSingle()

    if (!existing) {
      await supabase.from('edu_badges').insert({
        email,
        badge:      lessonBadge,
        class_slug: classSlug,
        earned_at:  new Date().toISOString(),
      })
      awarded.push(lessonBadge)
    }

    // Class completion badge — if this is the final lesson
    if (lessonOrder >= totalLessons) {
      const completeBadge = `${classSlug}-complete`
      const { data: existingComplete } = await supabase
        .from('edu_badges')
        .select('id')
        .eq('email', email)
        .eq('badge', completeBadge)
        .maybeSingle()

      if (!existingComplete) {
        await supabase.from('edu_badges').insert({
          email,
          badge:      completeBadge,
          class_slug: classSlug,
          earned_at:  new Date().toISOString(),
        })
        awarded.push(completeBadge)
      }
    }
  } catch {}

  return awarded
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { email, class_slug, lesson_slug } = await req.json()

    if (!email || !class_slug || !lesson_slug) {
      return NextResponse.json(
        { ok: false, error: 'email, class_slug and lesson_slug required' },
        { status: 400, headers: CORS }
      )
    }

    const cleanEmail = String(email).trim().toLowerCase()

    // Look up class
    const { data: cls } = await supabase
      .from('edu_classes')
      .select('id, title, lesson_count')
      .eq('slug', class_slug)
      .maybeSingle()

    if (!cls) {
      return NextResponse.json(
        { ok: false, error: 'class not found' },
        { status: 404, headers: CORS }
      )
    }

    // Look up lesson
    const { data: lesson } = await supabase
      .from('edu_lessons')
      .select('id, lesson_order, title')
      .eq('class_id', cls.id)
      .eq('slug', lesson_slug)
      .maybeSingle()

    if (!lesson) {
      return NextResponse.json(
        { ok: false, error: 'lesson not found' },
        { status: 404, headers: CORS }
      )
    }

    // Check for existing completion
    const { data: existing } = await supabase
      .from('edu_progress')
      .select('id')
      .eq('email', cleanEmail)
      .eq('lesson_id', lesson.id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json(
        { ok: true, status: 'already_complete' },
        { headers: CORS }
      )
    }

    // Insert progress row
    const { error } = await supabase
      .from('edu_progress')
      .insert({
        email:     cleanEmail,
        class_id:  cls.id,
        lesson_id: lesson.id,
      })

    if (error) throw error

    const lessonOrder  = lesson.lesson_order ?? 1
    const totalLessons = cls.lesson_count    ?? 99
    const classTitleSafe = cls.title ?? class_slug
    const isClassComplete = lessonOrder >= totalLessons

    // ── Fire and forget ───────────────────────────────────────────────────────
    void Promise.all([
      captureIdentity(cleanEmail, class_slug),
      awardBadge(cleanEmail, class_slug, lessonOrder, totalLessons)
        .then(awarded => {
          if (awarded.length === 0) return
          void notifyDiscord('', 'edu_nudge', {
            title:  isClassComplete
              ? `🏆 EDU — Class Complete`
              : `🎓 EDU — Lesson ${lessonOrder} Complete`,
            color:  isClassComplete ? DC.gold : DC.edu,
            fields: [
              { name: 'Email',   value: cleanEmail,                   inline: true  },
              { name: 'Lesson',  value: `${lessonOrder}/${totalLessons}`, inline: true },
              { name: 'Class',   value: classTitleSafe,               inline: false },
              { name: 'Badges',  value: awarded.join(', '),           inline: false },
            ],
            footer:    'antcpu EDU · badge awarded',
            timestamp: true,
          })
        }),
    ])

    return NextResponse.json(
      {
        ok:               true,
        status:           'complete',
        lesson_order:     lessonOrder,
        class_complete:   isClassComplete,
      },
      { headers: CORS }
    )

  } catch {
    return NextResponse.json(
      { ok: false, error: 'server error' },
      { status: 500, headers: CORS }
    )
  }
}
