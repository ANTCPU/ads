// app/api/notify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, type = 'info', title, message } = await req.json();

    if (!email || !title) {
      return NextResponse.json({ ok: false, error: 'email + title required' }, { status: 400 });
    }

    // ── Sanitise ──────────────────────────────────────────────────────────────
    const cleanEmail   = String(email).trim().toLowerCase().slice(0, 200);
    const cleanType    = String(type).trim().slice(0, 20);
    const cleanTitle   = String(title).trim().slice(0, 100);
    const cleanMessage = message ? String(message).trim().slice(0, 500) : null;

    // ── Duplicate gate — no identical unread notification in last 24h ─────────
    const since = new Date(Date.now() - 86_400_000).toISOString();
    const { data: existing } = await supabase
      .from('notifications')
      .select('id')
      .eq('email', cleanEmail)
      .eq('title', cleanTitle)
      .eq('read', false)
      .gte('created_at', since)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ ok: true, duplicate: true });
    }

    const { error } = await supabase.from('notifications').insert([{
      email:   cleanEmail,
      type:    cleanType,
      title:   cleanTitle,
      message: cleanMessage,
      read:    false,
    }]);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
