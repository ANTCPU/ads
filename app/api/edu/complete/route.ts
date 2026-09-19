// app/api/edu/complete/route.ts
// EDU Lesson Completion — Public POST endpoint
//
// Called from antcpu.com/edu lesson pages when student clicks Mark Complete.
// Writes a row to edu_progress linking email + class + lesson.
// Idempotent — duplicate completions are allowed, deduped on read.
//
// On first completion:
//   → captureIdentity() — email into ad_signups, source: edu-{class_slug}
//   → heraldNudge()     — if lesson 1, send "keep going" email via herald
//
// CORS open to antcpu.com
// No auth required — email is student-supplied from localStorage.

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { heraldSend, heraldWrap }    from '../../../lib/herald'

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

// ── Herald nudge — lesson 1 completion only ───────────────────────────────────
// Sends a single "keep going" email when a student completes their first
// lesson in a class. Checks total lesson count first — only fires on lesson 1.

async function heraldNudge(
  email:     string,
  classSlug: string,
  classTitle: string,
  nextLessonUrl: string,
): Promise<void> {
  try {
    // Only nudge on first lesson — check total completions for this class
    const { data: progress } = await supabase
      .from('edu_progress')
      .select('id')
      .eq('email', email)
      .eq('class_id', (
        await supabase
          .from('edu_classes')
          .select('id')
          .eq('slug', classSlug)
          .maybeSingle()
      ).data?.id)

    // More than 1 completion means they're already progressing — no nudge
    if ((progress?.length ?? 0) > 1) return

    const html = heraldWrap(
      'en',
      `
      <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;
        padding:2rem;text-align:center;margin-bottom:1.5rem">
        <div style="font-size:2rem;margin-bottom:0.75rem">🎓</div>
        <div style="font-weight:800;font-size:1.2rem;margin-bottom:0.5rem">
          Lesson 1 complete.
        </div>
        <div style="font-size:0.88rem;color:#aaa;margin-bottom:1.5rem">
          You just finished your first lesson in
          <strong style="color:#fff">${classTitle}</strong>.<br>
          Lesson 2 is ready — keep the momentum going.
        </div>
        <a href="${nextLessonUrl}"
          style="display:inline-block;background:#f0883e;color:#fff;
          text-decoration:none;font-weight:800;font-size:0.9rem;
          padding:0.75rem 1.75rem;border-radius:10px">
          Continue to Lesson 2 →
        </a>
      </div>

      <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;
        padding:1.25rem;font-size:0.82rem;color:#555;text-align:center">
        All lessons are free · No signup required · Self-paced<br>
        <a href="https://antcpu.com/edu/catalog/"
          style="color:#f0883e;text-decoration:none;margin-top:0.4rem;
          display:inline-block">
          Browse all 48 lessons →
        </a>
      </div>
      `,
      'antcpu EDU · Free Classes',
      email,
    )

    await heraldSend({
      to:      email,
      subject: `🎓 Lesson 1 done — lesson 2 is ready`,
      html,
    })
  } catch {}
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
      .select('id, title')
      .eq('slug', class_slug)
      .maybeSingle()

    if (!cls) {
      return NextResponse.json(
        { ok: false, error: 'class not found' },
        { status: 404, headers: CORS }
      )
    }

    // Look up lesson — include lesson_order to detect lesson 1
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

    // ── Fire and forget — never blocks response ───────────────────────────────
    const isFirstLesson = (lesson.lesson_order ?? 1) === 1
    const nextLessonUrl = `https://antcpu.com/edu/classes/${class_slug}/`

    void Promise.all([
      captureIdentity(cleanEmail, class_slug),
      isFirstLesson
        ? heraldNudge(cleanEmail, class_slug, cls.title ?? class_slug, nextLessonUrl)
        : Promise.resolve(),
    ])

    return NextResponse.json(
      { ok: true, status: 'complete' },
      { headers: CORS }
    )

  } catch {
    return NextResponse.json(
      { ok: false, error: 'server error' },
      { status: 500, headers: CORS }
    )
  }
}
