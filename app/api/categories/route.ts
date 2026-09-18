// app/api/categories/route.ts
// ─── Photo Categories — Public Lookup Endpoint ────────────────────────────────
//
// Returns all active categories from photo_categories table.
// Consumed by amandaland.vercel.app dashboard upload zone.
// Grouped and sorted by sort_order for dropdown rendering.
//
// Public — no auth required. Read-only.
// CORS open to amandaland.vercel.app
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const CORS = {
  'Access-Control-Allow-Origin':  'https://amandaland.vercel.app',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('photo_categories')
      .select('slug, label, icon, group_name, sort_order')
      .eq('active', true)
      .order('sort_order', { ascending: true })

    if (error) throw error

    // Group by group_name for dropdown rendering
    const grouped = (data ?? []).reduce((acc: Record<string, typeof data>, row) => {
      if (!acc[row.group_name]) acc[row.group_name] = []
      acc[row.group_name].push(row)
      return acc
    }, {})

    return NextResponse.json(
      { ok: true, categories: data, grouped },
      { headers: CORS }
    )

  } catch (err) {
    return NextResponse.json(
      { ok: false, error: 'failed to load categories' },
      { status: 500, headers: CORS }
    )
  }
}
