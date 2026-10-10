// app/api/internship/elevate/route.ts
// ─── Elevation update — super admin only ─────────────────────────────────────
// POST { intern_id, elevation_level, elevation_note }
// Updates challengers table — called from ElevationModule in command centre.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function POST(req: NextRequest) {
  try {
    const { intern_id, elevation_level, elevation_note } = await req.json();

    if (!intern_id || elevation_level === undefined) {
      return NextResponse.json({ error: 'intern_id and elevation_level required' }, { status: 400 });
    }

    const level = Math.min(100, Math.max(0, Number(elevation_level)));

    const { error } = await supabase
      .from('challengers')
      .update({
        elevation_level: level,
        elevation_note:  elevation_note ?? null,
        elevated_at:     new Date().toISOString(),
      })
      .eq('intern_id', intern_id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, intern_id, elevation_level: level });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin':  '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
