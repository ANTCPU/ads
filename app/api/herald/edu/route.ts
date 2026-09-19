// app/api/herald/edu/route.ts
// ─── Herald EDU — Student Nudge Engine ───────────────────────────────────────
// Sends targeted emails to EDU students based on progress state.
//
// POST — send a specific nudge type to a specific email
//   { email, type, class_slug? }
//
// GET — returns EDU drop-off intelligence (same pattern as /api/herald)
//   Returns buckets:
//     stalled     — completed lesson 1 but nothing in 7+ days
//     never_nudged — in ad_signups via edu source, zero edu_progress
//     multi_class  — completed 2+ classes — ready for arena/internship CTA
//
// Nudge types:
//   'lesson2'      — completed lesson 1, nudge to lesson 2
//   'comeback'     — stalled 7+ days, come back
//   'arena'        — completed a full class, arena CTA
//   'internship'   — completed 2+ classes, internship CTA
//   'announcement' — custom subject + body (admin broadcast to EDU students)
//
// CORS: antcpu-ads.vercel.app only — internal
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse }          from 'next/server'
import { createClient }                       from '@supabase/supabase-js'
import { heraldSend, heraldWrap, heraldHeader } from '../../../lib/herald'

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

// ── Email builders ────────────────────────────────────────────────────────────

function buildLesson2Email(classTitle: string, classUrl: string, email: string): string {
  return heraldWrap('en', `
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;
      padding:2rem;text-align:center;margin-bottom:1.5rem">
      <div style="font-size:2rem;margin-bottom:0.75rem">🎓</div>
      <div style="font-weight:800;font-size:1.2rem;margin-bottom:0.5rem">
        Lesson 2 is waiting.
      </div>
      <div style="font-size:0.88rem;color:#aaa;margin-bottom:1.5rem">
        You started <strong style="color:#fff">${classTitle}</strong>.<br>
        Pick up where you left off — it only takes a few minutes.
      </div>
      <a href="${classUrl}"
        style="display:inline-block;background:#f0883e;color:#fff;
        text-decoration:none;font-weight:800;font-size:0.9rem;
        padding:0.75rem 1.75rem;border-radius:10px">
        Continue Learning →
      </a>
    </div>
    <div style="text-align:center;font-size:0.78rem;color:#555">
      Free · Self-paced · No pressure
    </div>
  `, 'antcpu EDU', email)
}

function buildComebackEmail(classTitle: string, classUrl: string, email: string): string {
  return heraldWrap('en', `
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;
      padding:2rem;text-align:center;margin-bottom:1.5rem">
      <div style="font-size:2rem;margin-bottom:0.75rem">👋</div>
      <div style="font-weight:800;font-size:1.2rem;margin-bottom:0.5rem">
        Come back when you're ready.
      </div>
      <div style="font-size:0.88rem;color:#aaa;margin-bottom:1.5rem">
        Your progress in <strong style="color:#fff">${classTitle}</strong>
        is saved.<br>Pick up exactly where you left off.
      </div>
      <a href="${classUrl}"
        style="display:inline-block;background:#f0883e;color:#fff;
        text-decoration:none;font-weight:800;font-size:0.9rem;
        padding:0.75rem 1.75rem;border-radius:10px">
        Resume Class →
      </a>
    </div>
  `, 'antcpu EDU', email)
}

function buildArenaEmail(classTitle: string, email: string): string {
  return heraldWrap('en', `
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;
      padding:2rem;text-align:center;margin-bottom:1.5rem">
      <div style="font-size:2rem;margin-bottom:0.75rem">⚡</div>
      <div style="font-weight:800;font-size:1.2rem;margin-bottom:0.5rem">
        You finished ${classTitle}.
      </div>
      <div style="font-size:0.88rem;color:#aaa;margin-bottom:1.5rem">
        Put those skills to work. The Arena is where real brands get built —
        free to join, 10 antbots on launch.
      </div>
      <a href="https://antcpu-ads.vercel.app"
        style="display:inline-block;background:#f0883e;color:#fff;
        text-decoration:none;font-weight:800;font-size:0.9rem;
        padding:0.75rem 1.75rem;border-radius:10px">
        Enter the Arena →
      </a>
    </div>
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;
      padding:1rem;font-size:0.82rem;color:#555;text-align:center">
      Free · 3-day trial · No credit card
    </div>
  `, 'antcpu EDU → Arena', email)
}

function buildInternshipEmail(email: string): string {
  return heraldWrap('en', `
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;
      padding:2rem;text-align:center;margin-bottom:1.5rem">
      <div style="font-size:2rem;margin-bottom:0.75rem">🔭</div>
      <div style="font-weight:800;font-size:1.2rem;margin-bottom:0.5rem">
        You're ready for the internship.
      </div>
      <div style="font-size:0.88rem;color:#aaa;margin-bottom:1.5rem">
        You've completed multiple classes. The antcpu.io Human in the Loop
        Internship Challenge is the next step — 31 days, real roles, real CV.
        Free.
      </div>
      <a href="https://antcpu.io/apply/"
        style="display:inline-block;background:#2563eb;color:#fff;
        text-decoration:none;font-weight:800;font-size:0.9rem;
        padding:0.75rem 1.75rem;border-radius:10px">
        Apply Now — Free →
      </a>
    </div>
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;
      padding:1rem;font-size:0.82rem;color:#555;text-align:center">
      31 days · Real roles · Real CV · Free · New cohorts monthly
    </div>
  `, 'antcpu EDU → Internship', email)
}

// ── GET — drop-off intelligence ───────────────────────────────────────────────

export async function GET() {
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400 * 1000).toISOString()

  const [
    { data: allEduSignups },
    { data: allProgress },
    { data: unsubList },
  ] = await Promise.all([
    // Everyone who entered via EDU
    supabase
      .from('ad_signups')
      .select('email, name, source, created_at')
      .like('source', 'edu-%')
      .not('email', 'in', `(${EXCLUDE.map(e => `"${e}"`).join(',')})`),

    // All EDU progress
    supabase
      .from('edu_progress')
      .select('email, class_id, lesson_id, created_at')
      .not('email', 'in', `(${EXCLUDE.map(e => `"${e}"`).join(',')})`)
      .order('created_at', { ascending: false }),

    // Unsubscribes
    supabase
      .from('unsubscribes')
      .select('email'),
  ])

  const signups   = allEduSignups ?? []
  const progress  = allProgress   ?? []
  const unsubs    = new Set((unsubList ?? []).map((r: any) => r.email))

  // Group progress by email
  const progressByEmail: Record<string, typeof progress> = {}
  for (const row of progress) {
    if (!progressByEmail[row.email]) progressByEmail[row.email] = []
    progressByEmail[row.email].push(row)
  }

  // Bucket 1 — never_nudged: in ad_signups via edu, zero progress
  const neverNudged = signups
    .filter(s => !unsubs.has(s.email) && !progressByEmail[s.email]?.length)

  // Bucket 2 — stalled: has progress, last activity > 7 days ago
  const stalledEmails = new Set<string>()
  const stalled: { email: string; last_active: string; lessons_done: number }[] = []

  for (const [email, rows] of Object.entries(progressByEmail)) {
    if (unsubs.has(email)) continue
    const lastActive = rows[0]?.created_at
    if (lastActive && lastActive < sevenDaysAgo && !stalledEmails.has(email)) {
      stalledEmails.add(email)
      stalled.push({ email, last_active: lastActive, lessons_done: rows.length })
    }
  }

  // Bucket 3 — multi_class: completed lessons in 2+ distinct classes
  const multiClass: { email: string; classes_count: number; lessons_done: number }[] = []
  for (const [email, rows] of Object.entries(progressByEmail)) {
    if (unsubs.has(email)) continue
    const distinctClasses = new Set(rows.map(r => r.class_id)).size
    if (distinctClasses >= 2) {
      multiClass.push({ email, classes_count: distinctClasses, lessons_done: rows.length })
    }
  }

  return NextResponse.json({
    never_nudged: neverNudged,
    stalled,
    multi_class:  multiClass,
  }, { headers: CORS })
}

// ── POST — send nudge ─────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { email, type, class_slug, subject, html: customHtml } = await req.json()

    if (!email || !type) {
      return NextResponse.json(
        { ok: false, error: 'email and type required' },
        { status: 400, headers: CORS }
      )
    }

    const cleanEmail = String(email).trim().toLowerCase()

    // Check unsubscribe
    const { data: unsub } = await supabase
      .from('unsubscribes')
      .select('email')
      .eq('email', cleanEmail)
      .maybeSingle()

    if (unsub) {
      return NextResponse.json(
        { ok: false, error: 'unsubscribed' },
        { status: 200, headers: CORS }
      )
    }

    // Resolve class info if needed
    let classTitle = class_slug ?? 'your class'
    let classUrl   = `https://antcpu.com/edu/classes/${class_slug ?? ''}/`

    if (class_slug) {
      const { data: cls } = await supabase
        .from('edu_classes')
        .select('title')
        .eq('slug', class_slug)
        .maybeSingle()
      if (cls?.title) classTitle = cls.title
    }

    // Build + send
    let emailHtml    = ''
    let emailSubject = ''

    switch (type) {
      case 'lesson2':
        emailSubject = `🎓 Keep going — lesson 2 is ready`
        emailHtml    = buildLesson2Email(classTitle, classUrl, cleanEmail)
        break
      case 'comeback':
        emailSubject = `👋 Your progress is saved — come back anytime`
        emailHtml    = buildComebackEmail(classTitle, classUrl, cleanEmail)
        break
      case 'arena':
        emailSubject = `⚡ You finished ${classTitle} — the Arena is next`
        emailHtml    = buildArenaEmail(classTitle, cleanEmail)
        break
      case 'internship':
        emailSubject = `🔭 You're ready for the internship challenge`
        emailHtml    = buildInternshipEmail(cleanEmail)
        break
      case 'announcement':
        if (!subject || !customHtml) {
          return NextResponse.json(
            { ok: false, error: 'subject and html required for announcement type' },
            { status: 400, headers: CORS }
          )
        }
        emailSubject = subject
        emailHtml    = customHtml
        break
      default:
        return NextResponse.json(
          { ok: false, error: `unknown type: ${type}` },
          { status: 400, headers: CORS }
        )
    }

    await heraldSend({ to: cleanEmail, subject: emailSubject, html: emailHtml })

    return NextResponse.json({ ok: true, type, email: cleanEmail }, { headers: CORS })

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json(
      { ok: false, error: msg },
      { status: 500, headers: CORS }
    )
  }
}
