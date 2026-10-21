import { NextRequest, NextResponse } from 'next/server';
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

  // ── Merge challenger handle by email ──────────────────────
  const { data: challengers } = await supabase
    .from('challengers')
    .select('email, handle');

  const handleMap: Record<string, string> = {};
  for (const c of challengers ?? []) {
    if (c.email && c.handle) handleMap[c.email] = c.handle;
  }

  const users = (data || []).map((u: { email: string }) => ({
    ...u,
    handle: handleMap[u.email] ?? null,
  }));

  return NextResponse.json({ users });
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
