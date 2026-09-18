// app/api/edu/signup/route.ts
// EDU Student Identity
// Creates or finds a student in ad_signups with source:'edu'
// No PIN, no brand — just email + name to establish identity
// CORS open to antcpu.com

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

export async function POST(req: NextRequest) {
  try {
    const { email, name } = await req.json()
    if (!email) return NextResponse.json({ ok: false, error: 'email required' }, { status: 400, headers: CORS })

    const norm = email.trim().toLowerCase()
    const cleanName = (name || 'Student').trim()

    // Check existing
    const { data: existing } = await supabase
      .from('ad_signups')
      .select('email, name, role, status, points, streak_days')
      .eq('email', norm)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ ok: true, existing: true, user: existing }, { headers: CORS })
    }

    // Create new student
    const { error } = await supabase
      .from('ad_signups')
      .insert({
        email: norm,
        name: cleanName,
        brand_name: cleanName,
        status: 'trial',
        role: 'student',
        source: 'edu',
        created_at: new Date().toISOString(),
      })

    if (error) throw error

    return NextResponse.json({ ok: true, existing: false, user: { email: norm, name: cleanName, role: 'student' } }, { headers: CORS })
  } catch {
    return NextResponse.json({ ok: false, error: 'server error' }, { status: 500, headers: CORS })
  }
}
