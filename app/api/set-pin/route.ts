import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { email, pin } = await req.json();
  if (!email || !pin) return NextResponse.json({ ok: false }, { status: 400 });
  if (pin.length < 4) return NextResponse.json({ ok: false, error: 'PIN must be at least 4 characters' }, { status: 400 });

  const { error } = await supabase
    .from('ad_signups')
    .update({ pin })
    .eq('email', email.trim().toLowerCase());

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
