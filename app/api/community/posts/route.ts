import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET() {
  const { data, error } = await supabase
    .from('community_posts')
    .select('*')
    .is('parent_id', null)        // top-level posts only
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ posts: data })
}

export async function POST(req: Request) {
  const body = await req.json()
  const { author_id, author_type, post_type, content, parent_id } = body

  if (!content || content.trim().length < 3) {
    return NextResponse.json({ error: 'Content too short' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('community_posts')
    .insert({
      author_id:   author_id   ?? null,
      author_type: author_type ?? 'challenger',
      post_type:   post_type   ?? 'post',
      content:     content.trim(),
      parent_id:   parent_id   ?? null,
      is_pinned:   false,
      is_system:   false,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ post: data })
}
