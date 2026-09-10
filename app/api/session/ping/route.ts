import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ ok: false }, { status: 400 });

    const clean = email.trim().toLowerCase();

    // Read current visit_count first
    const { data } = await supabase
      .from('ad_signups')
      .select('visit_count')
      .eq('email', clean)
      .maybeSingle();

    await supabase
      .from('ad_signups')
      .update({
        last_seen_at: new Date().toISOString(),
        visit_count:  ((data?.visit_count) || 0) + 1,
      })
      .eq('email', clean);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
