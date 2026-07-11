import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const { email, pin } = await req.json();
  if (!email || !pin) return NextResponse.json({ ok: false }, { status: 400 });

  const { data } = await supabase
    .from('ad_signups')
    .select('pin, name, brand_name, status, role')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  if (!data) return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
  if (!data.pin) return NextResponse.json({ ok: false, error: 'No PIN set' }, { status: 400 });
  if (data.pin !== pin) return NextResponse.json({ ok: false, error: 'Invalid PIN' }, { status: 401 });

  return NextResponse.json({
    ok: true,
    user: {
      email:       email.trim().toLowerCase(),
      name:        data.name       || '',
      brand:       data.brand_name || '',
      trialStatus: data.status     || 'trial',
      role:        data.role       || 'user',
    }
  });
}
