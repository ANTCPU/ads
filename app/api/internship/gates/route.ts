// ============================================================
// app/api/internship/gates/route.ts
// GET — Fetch gate definitions
//
// v2 changes:
// — CORS headers added — required for antcpu.io cross-origin
//   calls from config.js bootstrap (Step 4: fetch gates)
// — OPTIONS handler added for preflight requests
// — order changed from day → pct (day is no longer unique
//   per gate under the week-unlock model)
// — ?day= filter now returns array not single object
//   (multiple gates share the same day value)
// — ?id= single gate lookup unchanged — still returns object
// ============================================================

import { createClient }             from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'no-store, max-age=0',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const day  = searchParams.get('day');
  const week = searchParams.get('week');
  const id   = searchParams.get('id');

  let query = supabase
    .from('gates')
    .select('*')
    .order('pct', { ascending: true }); // pct order — day is not unique

  if (id)   query = query.eq('id',   id);
  if (day)  query = query.eq('day',  parseInt(day));
  if (week) query = query.eq('week', parseInt(week));

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch gates' },
      { status: 500, headers: CORS }
    );
  }

  // Single gate by ID — return object
  if (id) {
    return NextResponse.json(
      { gate: data?.[0] || null },
      { headers: CORS }
    );
  }

  // All other queries — always return array
  return NextResponse.json(
    { gates: data || [] },
    { headers: CORS }
  );
}
