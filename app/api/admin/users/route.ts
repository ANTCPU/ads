import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data, error } = await supabase
    .from('ad_signups')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ users: data || [] });
}
export async function PATCH(req: NextRequest) {
  const { email, ...updates } = await req.json();
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
  const { error } = await supabase
    .from('ad_signups')
    .update(updates)
    .eq('email', email);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
