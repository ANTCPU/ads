// app/api/internship/moods/route.ts

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function GET() {
  const { data, error } = await supabase
    .from('moods')
    .select('*')
    .order('sort_order');

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });

  // Also return keyed object for easy lookup
  const keyed: Record<string, any> = {};
  data?.forEach(m => { keyed[m.id] = m; });

  return NextResponse.json({ moods: data, keyed }, { headers: CORS });
}
