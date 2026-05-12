import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, type = 'info', title, message } = await req.json();
    if (!email || !title) return NextResponse.json({ ok: false, error: 'email + title required' }, { status: 400 });

    const { error } = await supabase.from('notifications').insert([{
      email: email.trim().toLowerCase(),
      type,
      title,
      message,
      read: false,
    }]);

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
