import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const page = body.page || '/';
    const ref  = body.ref  || 'direct';
    const ts   = body.ts   || new Date().toISOString();
    const ua   = body.ua   || 'unknown';

    // Persist to Supabase — survives cold starts
    await supabase.from('page_views').insert([{ page, ref, ts, ua }]);

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
}

export async function GET() {
  try {
    // Return last 10 visits + total count
    const { data, count } = await supabase
      .from('page_views')
      .select('page, ref, ts', { count: 'exact' })
      .order('ts', { ascending: false })
      .limit(10);

    return NextResponse.json({
      recent: data || [],
      total: count || 0,
    });
  } catch {
    return NextResponse.json({ recent: [], total: 0 });
  }
}
