import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app';

function notify(email: string, type: string, title: string, message: string) {
  fetch(`${BASE_URL}/api/notify`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, type, title, message }),
  }).catch(() => {});
}

export async function POST(req: NextRequest) {
  const { email, pin } = await req.json();
  if (!email || !pin) return NextResponse.json({ ok: false }, { status: 400 });

  const norm = email.trim().toLowerCase();

  const { data } = await supabase
    .from('ad_signups')
    .select('pin, name, brand_name, status, role, last_login, created_at, points')
    .eq('email', norm)
    .maybeSingle();

  if (!data) return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });

  // ── PIN check probe — VaultModal calls with pin: '__check__' to test existence
  if (pin === '__check__') {
    if (!data.pin) return NextResponse.json({ ok: false, error: 'No PIN set' }, { status: 400 });
    return NextResponse.json({ ok: true, hasPinSet: true });
  }

  if (!data.pin) return NextResponse.json({ ok: false, error: 'No PIN set' }, { status: 400 });
  if (data.pin !== pin) return NextResponse.json({ ok: false, error: 'Invalid PIN' }, { status: 401 });

  // ── Successful auth — fire nudges + update last_login ─────────────────────

  const now        = new Date();
  const lastLogin  = data.last_login ? new Date(data.last_login) : null;
  const createdAt  = data.created_at ? new Date(data.created_at) : null;
  const daysSince  = lastLogin
    ? (now.getTime() - lastLogin.getTime()) / 86_400_000
    : null;
  const isNewUser  = createdAt
    ? (now.getTime() - createdAt.getTime()) < 86_400_000  // created within last 24h
    : false;
  const userPoints = data.points || 0;
  const firstName  = data.name?.split(' ')[0] || 'there';

  // New user — first login nudge
  if (isNewUser && !lastLogin) {
    notify(norm, 'nudge',
      '🎉 You\'re in the Arena',
      `Welcome ${firstName}. Create your first ad and Aria will have it live within hours. Every share earns points — the ladder starts now.`
    );
  }

  // Returning user — away 7+ days
  else if (daysSince !== null && daysSince >= 7) {
    const days = Math.floor(daysSince);
    notify(norm, 'nudge',
      `👋 Welcome back to the Arena`,
      `It's been ${days} day${days === 1 ? '' : 's'}, ${firstName}. Your brand has ${userPoints} pts. Share your ad today to climb the ranks — the Arena never stops.`
    );
  }

  // Update last_login — non-blocking, silent fail if column missing
  Promise.resolve(
  supabase
    .from('ad_signups')
    .update({ last_login: now.toISOString() })
    .eq('email', norm)
).catch(() => {});


  return NextResponse.json({
    ok: true,
    user: {
      email:       norm,
      name:        data.name       || '',
      brand:       data.brand_name || '',
      trialStatus: data.status     || 'trial',
      role:        data.role       || 'user',
    }
  });
}
