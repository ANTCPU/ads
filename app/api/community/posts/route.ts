// app/api/community/posts/route.ts
// ─── Community Posts ──────────────────────────────────────────────────────────
// GET  — top-level posts, pinned first, paginated
// POST — create a new post or reply
//
// v2 (Sep 2026):
//   — CORS + OPTIONS handler — called from antcpu.io + antcpu.com
//   — try/catch on POST — req.json() can throw
//   — input sanitisation — content, author_id, post_type capped
//   — explicit SELECT columns — no select('*')
//   — GET limit(100) — no unbounded table scan
//   — pagination support — ?limit= and ?offset= query params
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

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET(req: NextRequest) {
  try {
    const params  = req.nextUrl.searchParams
    const limit   = Math.min(parseInt(params.get('limit')  || '50'), 100)
    const offset  = Math.max(parseInt(params.get('offset') || '0'),  0)

    const { data, error } = await supabase
      .from('community_posts')
      .select('id, author_id, author_type, post_type, content, parent_id, is_pinned, is_system, created_at')
      .is('parent_id', null)
      .order('is_pinned', { ascending: false })
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: CORS })
    }

    return NextResponse.json({ posts: data, limit, offset }, { headers: CORS })

  } catch {
    return NextResponse.json({ error: 'server error' }, { status: 500, headers: CORS })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { author_id, author_type, post_type, content, parent_id } = body

    // ── Validate ──────────────────────────────────────────────────────────────
    if (!content || String(content).trim().length < 3) {
      return NextResponse.json({ error: 'Content too short' }, { status: 400, headers: CORS })
    }

    // ── Sanitise ──────────────────────────────────────────────────────────────
    const cleanContent    = String(content).trim().slice(0, 2000)
    const cleanAuthorId   = author_id   ? String(author_id).trim().slice(0, 100)  : null
    const cleanAuthorType = author_type ? String(author_type).trim().slice(0, 50) : 'challenger'
    const cleanPostType   = post_type   ? String(post_type).trim().slice(0, 50)   : 'post'
    const cleanParentId   = parent_id   ? String(parent_id).trim().slice(0, 100)  : null

    const { data, error } = await supabase
      .from('community_posts')
      .insert({
        author_id:   cleanAuthorId,
        author_type: cleanAuthorType,
        post_type:   cleanPostType,
        content:     cleanContent,
        parent_id:   cleanParentId,
        is_pinned:   false,
        is_system:   false,
      })
      .select('id, author_id, author_type, post_type, content, parent_id, is_pinned, created_at')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers: CORS })
    }

    return NextResponse.json({ post: data }, { headers: CORS })

  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400, headers: CORS })
  }
}
