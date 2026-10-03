// app/api/internship/community/route.ts
// Vercel · Next.js App Router
// GET  — fetch posts for a cohort
// POST — create a new post (requires intern_id or email)

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

/* ── GET ──────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const cohort    = searchParams.get('cohort')    || 'october-2026'
  const post_type = searchParams.get('type')      || null
  const limit     = parseInt(searchParams.get('limit') || '50')
  const offset    = parseInt(searchParams.get('offset') || '0')

  // Fetch posts + author info via join
  let query = supabase
    .from('community_posts')
    .select(`
      id,
      post_type,
      content,
      cohort,
      day,
      is_pinned,
      is_system,
      parent_id,
      created_at,
      challengers!author_id (
        first_name,
        handle,
        track,
        initials,
        color,
        progress_pct
      )
    `)
    .or(`cohort.eq.${cohort},cohort.eq.all`)
    .order('is_pinned', { ascending: false })
    .order('created_at',  { ascending: false })
    .range(offset, offset + limit - 1)

  if (post_type) query = query.eq('post_type', post_type)

  const { data, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Flatten author join
  const posts = (data || []).map((p: any) => ({
    id:         p.id,
    post_type:  p.post_type,
    content:    p.content,
    cohort:     p.cohort,
    day:        p.day,
    is_pinned:  p.is_pinned,
    is_system:  p.is_system,
    parent_id:  p.parent_id,
    created_at: p.created_at,
    author: p.challengers ? {
      first_name:   p.challengers.first_name,
      handle:       p.challengers.handle,
      track:        p.challengers.track,
      initials:     p.challengers.initials,
      color:        p.challengers.color,
      progress_pct: p.challengers.progress_pct,
    } : null
  }))

  return NextResponse.json({
    posts,
    count:  posts.length,
    cohort,
    offset,
    limit
  })
}

/* ── POST ─────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const body = await req.json()
  const {
    intern_id,
    email,
    content,
    post_type = 'post',
    cohort    = 'october-2026',
    day       = null,
    parent_id = null,
  } = body

  // Validate content
  if (!content?.trim()) {
    return NextResponse.json(
      { error: 'content is required' }, { status: 400 }
    )
  }
  if (content.trim().length > 2000) {
    return NextResponse.json(
      { error: 'content exceeds 2000 characters' }, { status: 400 }
    )
  }

  // Resolve author — intern_id or email
  if (!intern_id && !email) {
    return NextResponse.json(
      { error: 'intern_id or email required' }, { status: 400 }
    )
  }

  const authQuery = intern_id
    ? supabase.from('challengers').select('id,first_name,handle,track,cohort')
        .eq('intern_id', intern_id).single()
    : supabase.from('challengers').select('id,first_name,handle,track,cohort')
        .eq('email', email).single()

  const { data: challenger, error: authError } = await authQuery

  if (authError || !challenger) {
    return NextResponse.json(
      { error: 'Challenger not found' }, { status: 401 }
    )
  }

  // Insert post
  const { data: post, error: insertError } = await supabase
    .from('community_posts')
    .insert({
      author_id:   challenger.id,
      author_type: 'challenger',
      post_type,
      content:     content.trim(),
      cohort,
      day,
      parent_id,
      is_pinned:   false,
      is_system:   false,
    })
    .select()
    .single()

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message }, { status: 500 }
    )
  }

  // Update challenger last_seen
  await supabase
    .from('challengers')
    .update({ last_seen: new Date().toISOString() })
    .eq('id', challenger.id)

  // Fire Discord webhook if configured
  const webhookUrl = process.env.DISCORD_WEBHOOK_COMMUNITY
  if (webhookUrl) {
    const trackEmoji = challenger.track === 'marketing' ? '📣' : '💻'
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title:       `${trackEmoji} New ${post_type} in Community`,
          description: content.trim().slice(0, 300),
          color:       challenger.track === 'marketing' ? 0x7c3aed : 0x2563eb,
          footer: {
            text: `${challenger.handle} · ${cohort}`
          },
          timestamp: new Date().toISOString()
        }]
      })
    }).catch(() => {}) // non-blocking
  }

  return NextResponse.json({
    ok:   true,
    post: {
      ...post,
      author: {
        first_name: challenger.first_name,
        handle:     challenger.handle,
        track:      challenger.track,
      }
    }
  }, { status: 201 })
}
