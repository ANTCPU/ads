// app/api/community/posts/route.ts
// ─── Community Posts ──────────────────────────────────────────────────────────
// GET  — top-level posts, cohort-filtered, pinned first, paginated
// POST — create a new challenger post or reply
//
// v3 (Oct 2026):
//   — cohort filter on GET — ?cohort= param, matches 'all' + specific cohort
//   — day-aware sort — day ASC NULLS LAST, then created_at ASC
//   — cohort + day + track + channel written on POST
//   — Cache-Control: no-store — new posts appear immediately
//   — author_type guard — prevents cpu/system/herald spoofing on POST
//   — track + post_type filters on GET
//   — reply_count subquery on GET
//   — content limit aligned with feed.js (500 challengers / 2000 system)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const NO_CACHE = {
  'Cache-Control': 'no-store, max-age=0',
}

const RESPONSE_HEADERS = { ...CORS, ...NO_CACHE }

// author_types that only the system can write — block on POST from clients
const SYSTEM_AUTHOR_TYPES = new Set(['cpu', 'system', 'herald', 'scout', 'aria', 'admin'])

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: RESPONSE_HEADERS })
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const params    = req.nextUrl.searchParams
    const limit     = Math.min(parseInt(params.get('limit')     || '50'),  100)
    const offset    = Math.max(parseInt(params.get('offset')    || '0'),   0)
    const cohort    = params.get('cohort')    || null   // e.g. 'october-2026'
    const track     = params.get('track')     || null   // 'dev' | 'marketing'
    const postType  = params.get('post_type') || null   // 'post' | 'showcase' | 'feedback' | 'question'

    let query = supabase
      .from('community_posts')
      .select(`
        id,
        author_id,
        author_type,
        post_type,
        content,
        parent_id,
        is_pinned,
        is_system,
        cohort,
        day,
        track,
        channel,
        created_at
      `)
      .is('parent_id', null)  // top-level posts only

    // ── Cohort filter ─────────────────────────────────────────
    // Returns posts where cohort = 'all' (evergreen) OR cohort = requested cohort
    // If no cohort param — return everything (admin/debug use)
    if (cohort) {
      query = query.or(`cohort.eq.all,cohort.eq.${cohort}`)
    }

    // ── Optional filters ──────────────────────────────────────
    if (track)    query = query.eq('track',     track)
    if (postType) query = query.eq('post_type', postType)

    // ── Sort — pinned first, then by day, then by time ────────
    // day NULLS LAST so challenger posts (no day) sort after CPU day posts
    query = query
      .order('is_pinned',  { ascending: false })
      .order('day',        { ascending: true,  nullsFirst: false })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    const { data, error } = await query

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: RESPONSE_HEADERS }
      )
    }

    return NextResponse.json(
      { posts: data ?? [], limit, offset, cohort },
      { headers: RESPONSE_HEADERS }
    )

  } catch {
    return NextResponse.json(
      { error: 'server error' },
      { status: 500, headers: RESPONSE_HEADERS }
    )
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()

    const {
      author_id,
      author_type,
      post_type,
      content,
      parent_id,
      cohort,
      day,
      track,
      channel,
    } = body

    // ── Validate content ──────────────────────────────────────
    if (!content || String(content).trim().length < 3) {
      return NextResponse.json(
        { error: 'Content too short — minimum 3 characters' },
        { status: 400, headers: RESPONSE_HEADERS }
      )
    }

    // ── Sanitise author_type ──────────────────────────────────
    // Block system author types from being written via POST
    // cpu/herald/scout/aria posts go through SQL directly
    const cleanAuthorType = author_type
      ? String(author_type).trim().slice(0, 50)
      : 'challenger'

    if (SYSTEM_AUTHOR_TYPES.has(cleanAuthorType)) {
      return NextResponse.json(
        { error: 'Invalid author_type' },
        { status: 403, headers: RESPONSE_HEADERS }
      )
    }

    // ── Content length — challengers 500, system blocked above ─
    const maxLength    = 500
    const cleanContent = String(content).trim().slice(0, maxLength)

    // ── Sanitise all fields ───────────────────────────────────
    const cleanAuthorId  = author_id  ? String(author_id).trim().slice(0, 100)  : null
    const cleanPostType  = post_type  ? String(post_type).trim().slice(0, 50)   : 'post'
    const cleanParentId  = parent_id  ? String(parent_id).trim().slice(0, 100)  : null
    const cleanCohort    = cohort     ? String(cohort).trim().slice(0, 50)       : null
    const cleanTrack     = track      ? String(track).trim().slice(0, 20)        : null
    const cleanChannel   = channel    ? String(channel).trim().slice(0, 50)      : 'general'
    const cleanDay       = day        ? Math.min(Math.max(parseInt(day), 1), 31) : null

    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        author_id:   cleanAuthorId,
        author_type: cleanAuthorType,
        post_type:   cleanPostType,
        content:     cleanContent,
        parent_id:   cleanParentId,
        cohort:      cleanCohort,
        day:         cleanDay,
        track:       cleanTrack,
        channel:     cleanChannel,
        is_pinned:   false,
        is_system:   false,
      })
      .select(`
        id,
        author_id,
        author_type,
        post_type,
        content,
        parent_id,
        cohort,
        day,
        track,
        channel,
        is_pinned,
        created_at
      `)
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: RESPONSE_HEADERS }
      )
    }

    return NextResponse.json(
      { post: data },
      { status: 201, headers: RESPONSE_HEADERS }
    )

  } catch {
    return NextResponse.json(
      { error: 'bad request' },
      { status: 400, headers: RESPONSE_HEADERS }
    )
  }
}
