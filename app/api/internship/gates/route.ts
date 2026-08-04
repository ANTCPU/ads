import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const day  = searchParams.get('day');
  const week = searchParams.get('week');
  const id   = searchParams.get('id');

  let query = supabase
    .from('gates')
    .select('*')
    .order('day', { ascending: true });

  if (id)   query = query.eq('id', id);
  if (day)  query = query.eq('day', parseInt(day));
  if (week) query = query.eq('week', parseInt(week));

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: 'Failed to fetch gates' },
      { status: 500 }
    );
  }

  // Single gate requested — return object not array
  if (id || day) {
    return NextResponse.json({ gate: data?.[0] || null });
  }

  return NextResponse.json({ gates: data || [] });
}
