// app/api/edu/complete/route.ts
// EDU Lesson Completion — Public POST endpoint
//
// Called from antcpu.com/edu lesson pages when student clicks Mark Complete.
// Writes a row to edu_progress linking email + class + lesson.
// Idempotent — duplicate completions are allowed, deduped on read.
// Also captures identity to ad_signups on first completion — fire and forget.
//
// CORS open to antcpu.com
// No auth required — email is student-supplied from localStorage.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CORS = {
  'Access-Control-Allow-Origin': 'https://antcpu.com',
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

// ── Capture identity — async, fire and forget at call site ────────────────────
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

    // Look up class_id
    const { data: cls } = await supabase
      .from('edu_classes')
      .select('id')
      .eq('slug', class_slug)
      .maybeSingle()

    if (!cls) {
      return NextResponse.json(
        { ok: false, error: 'class not found' },
        { status: 404, headers: CORS }
      )
    }

    // Look up lesson_id
    const { data: lesson } = await supabase
      .from('edu_lessons')
      .select('id')
      .eq('class_id', cls.id)
      .eq('slug', lesson_slug)
      .maybeSingle()

    if (!lesson) {
      return NextResponse.json(
        { ok: false, error: 'lesson not found' },
        { status: 404, headers: CORS }
      )
    }

    // Check for existing completion — skip duplicate
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

    // ── Capture identity — fire and forget ────────────────────────────────────
    void captureIdentity(cleanEmail, class_slug)

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
