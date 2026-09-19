// app/api/herald/edu/route.ts
// ─── Herald EDU — School Announcement Engine + Drop-off Intelligence ──────────
//
// POST — school-level announcements only
//   { email, type: 'announcement', subject, html }
//   or
//   { emails: string[], type: 'announcement', subject, html } — bulk
//
// GET — drop-off intelligence for admin/teacher view
//   Returns buckets:
//     stalled      — has progress, nothing in 7+ days
//     never_started — in ad_signups via edu source, zero edu_progress
//     multi_class   — completed lessons in 2+ classes
//
// Email philosophy:
//   Teachers email their students — that's their relationship.
//   School (antcpu EDU) emails announcements only — new classes, events.
//   Lesson completion earns badges, shown in student dashboard.
//   No automated nudge emails — Discord #edu is the real-time signal.
//
// Discord: all events → DISCORD_WEBHOOK_EDU (#edu) via edu_nudge
// CORS: antcpu-ads.vercel.app only — internal
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { heraldSend, heraldWrap }    from '../../../lib/herald'
import { notifyDiscord, DC }         from '../../../lib/discord'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CORS = {
  'Access-Control-Allow-Origin':  'https://antcpu-ads.vercel.app',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const EXCLUDE = ['test@antcpu.com', 'antcpu@gmail.com']

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// ── GET — drop-off intelligence ───────────────────────────────────────────────

export async function GET() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString()

  const [
    { data: allEduSignups },
    { data: allProgress },
    { data: unsubList },
  ] = await Promise.all([
    supabase
      .from('ad_signups')
      .select('email, name, source, created_at')
      .like('source', 'edu-%')
      .not('email', 'in', `(${EXCLUDE.map(e => `"${e}"`).join(',')})`)
      .limit(500),
    supabase
      .from('edu_progress')
      .select('email, class_id, lesson_id, created_at')
      .not('email', 'in', `(${EXCLUDE.map(e => `"${e}"`).join(',')})`)
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase
      .from('unsubscribes')
      .select('email')
      .limit(500),
  ])

  const signups  = allEduSignups ?? []
  const progress = allProgress   ?? []
  const unsubs   = new Set((unsubList ?? []).map((r: any) => r.email))

  const progressByEmail: Record<string, typeof progress> = {}
  for (const row of progress) {
    if (!progressByEmail[row.email]) progressByEmail[row.email] = []
    progressByEmail[row.email].push(row)
  }

  // Never started — in ad_signups via edu, zero progress
  const neverStarted = signups
    .filter(s => !unsubs.has(s.email) && !progressByEmail[s.email]?.length)

  // Stalled — has progress, last activity > 7 days
  const stalled: { email: string; last_active: string; lessons_done: number }[] = []
  const seen = new Set<string>()
  for (const [email, rows] of Object.entries(progressByEmail)) {
    if (unsubs.has(email) || seen.has(email)) continue
    const lastActive = rows[0]?.created_at
    if (lastActive && lastActive < sevenDaysAgo) {
      seen.add(email)
      stalled.push({ email, last_active: lastActive, lessons_done: rows.length })
    }
  }

  // Multi-class — lessons in 2+ distinct classes
  const multiClass: { email: string; classes_count: number; lessons_done: number }[] = []
  for (const [email, rows] of Object.entries(progressByEmail)) {
    if (unsubs.has(email)) continue
    const distinctClasses = new Set(rows.map(r => r.class_id)).size
    if (distinctClasses >= 2) {
      multiClass.push({ email, classes_count: distinctClasses, lessons_done: rows.length })
    }
  }

  return NextResponse.json({
    never_started: neverStarted,
    stalled,
    multi_class:   multiClass,
  }, { headers: CORS })
}

// ── POST — school announcement only ──────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      email,
      emails: bulkEmails,
      type,
      subject,
      html: customHtml,
    } = await req.json()

    if (type !== 'announcement') {
      return NextResponse.json(
        { ok: false, error: 'only announcement type is supported — teachers email their own students' },
        { status: 400, headers: CORS }
      )
    }

    if (!subject || !customHtml) {
      return NextResponse.json(
        { ok: false, error: 'subject and html required for announcement' },
        { status: 400, headers: CORS }
      )
    }

    // Resolve recipient list — single or bulk
    const rawList: string[] = bulkEmails?.length
      ? bulkEmails
      : email ? [email] : []

    if (rawList.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'email or emails required' },
        { status: 400, headers: CORS }
      )
    }

    // Check unsubscribes in bulk
    const { data: unsubList } = await supabase
      .from('unsubscribes')
      .select('email')
      .in('email', rawList)
      .limit(rawList.length)

    const unsubs    = new Set((unsubList ?? []).map((r: any) => r.email))
    const recipients = rawList
      .map(e => String(e).trim().toLowerCase())
      .filter(e => e.includes('@') && !unsubs.has(e))

    if (recipients.length === 0) {
      return NextResponse.json(
        { ok: false, error: 'no eligible recipients' },
        { status: 200, headers: CORS }
      )
    }

    // Send to each — fire sequentially to avoid Resend rate limits
    let sent = 0
    for (const to of recipients) {
      try {
        await heraldSend({ to, subject, html: customHtml })
        sent++
      } catch {}
    }

    // ── Discord ───────────────────────────────────────────────────────────────
    void notifyDiscord('', 'edu_nudge', {
      title:  `📢 EDU Announcement Sent`,
      color:  DC.edu,
      fields: [
        { name: 'Subject',    value: subject,           inline: false },
        { name: 'Recipients', value: String(sent),      inline: true  },
        { name: 'Skipped',    value: String(rawList.length - sent), inline: true },
      ],
      footer:    'antcpu EDU · school announcement',
      timestamp: true,
    })

    return NextResponse.json(
      { ok: true, sent, skipped: rawList.length - sent },
      { headers: CORS }
    )

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500, headers: CORS }
    )
  }
}
