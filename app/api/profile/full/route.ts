// app/api/profile/full/route.ts
// ─── Full Identity Lookup ─────────────────────────────────────────────────────
// Returns everything known about an email across all tables.
// Used by admin dashboard, herald, and future CRM views.
//
// GET /api/profile/full?email=...
//
// Queries in parallel:
//   ad_signups     — identity, status, source, membership tier
//   ads            — active/pending ads
//   challengers    — internship record
//   edu_progress   — completed lessons
//   mac_conversations — MAC chat history (count only)
//   notifications  — unread count
//
// Auth: service role — internal use only
// CORS: antcpu-ads.vercel.app only
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CORS = {
  'Access-Control-Allow-Origin':  'https://antcpu-ads.vercel.app',
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
    { data: identity },
    { data: ads },
    { data: challenger },
    { data: eduProgress },
    { count: macCount },
    { count: unreadCount },
  ] = await Promise.all([

    // Identity — ad_signups
    supabase
      .from('ad_signups')
      .select('email, name, brand_name, status, role, source, country, created_at, membership_tier, streak_days, trial_expiry')
      .eq('email', email)
      .maybeSingle(),

    // Ads — active + pending
    supabase
      .from('ads')
      .select('id, title, description, category, status, points, click_count, share_count, tier, created_at, brand')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(5),

    // Challenger — internship
    supabase
      .from('challengers')
      .select('id, intern_id, track, country, cohort, progress_pct, points, role_title, status, badges, week, created_at')
      .eq('email', email)
      .maybeSingle(),

    // EDU progress — completed lessons
    supabase
      .from('edu_progress')
      .select('lesson_id, class_id, created_at')
      .eq('email', email)
      .order('created_at', { ascending: false }),

    // MAC conversations — count only
    supabase
      .from('mac_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('email', email),

    // Notifications — unread count
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('email', email)
      .eq('read', false),
  ])

  // ── Build response ────────────────────────────────────────────────────────
  const profile = {
    ok:      true,
    email,
    found:   !!identity,

    identity: identity ?? null,

    ads: {
      total:   ads?.length ?? 0,
      records: ads ?? [],
    },

    challenger: challenger ?? null,

    edu: {
      lessons_completed: eduProgress?.length ?? 0,
      records:           eduProgress ?? [],
    },

    mac: {
      conversation_turns: macCount ?? 0,
    },

    notifications: {
      unread: unreadCount ?? 0,
    },

    // ── Summary flags — useful for herald + nudge logic ───────────────────
    flags: {
      has_identity:    !!identity,
      has_active_ad:   ads?.some(a => a.status === 'active') ?? false,
      has_challenger:  !!challenger,
      has_edu:         (eduProgress?.length ?? 0) > 0,
      has_mac:         (macCount ?? 0) > 0,
      source:          identity?.source ?? null,
      membership_tier: identity?.membership_tier ?? 'trial',
    },
  }

  return NextResponse.json(profile, { headers: CORS })
}
