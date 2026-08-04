import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email     = searchParams.get('email');
  const intern_id = searchParams.get('intern_id');

  if (!email && !intern_id) {
    return NextResponse.json(
      { error: 'email or intern_id required' },
      { status: 400 }
    );
  }

  const query = supabase
    .from('challengers')
    .select('*')
    .eq('status', 'active')
    .single();

  if (email)     query.eq('email', email);
  if (intern_id) query.eq('intern_id', intern_id);

  const { data, error } = await query;

  if (error || !data) {
    return NextResponse.json(
      { error: 'Challenger not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ challenger: data });
}
