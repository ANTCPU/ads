import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabase = createClient(url!, key!);

  const { data, error, count } = await supabase
    .from('challengers')
    .select('intern_id, email, status, cohort', { count: 'exact' })
    .limit(10);

  return NextResponse.json({
    url_prefix: url?.slice(0, 30),
    key_prefix:  key?.slice(0, 20),
    count,
    rows: data?.length,
    data,
    error
  });
}
