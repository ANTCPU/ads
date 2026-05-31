import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  if (!pin) return NextResponse.json({ ok: false }, { status: 400 });
  if (pin !== process.env.ADMIN_PIN) {
    return NextResponse.json({ ok: false, error: 'Invalid PIN' }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
