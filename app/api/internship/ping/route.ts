// ============================================================
// app/api/internship/ping/route.ts
// POST — Step funnel ping
// Fires on every step advance from apply/index.html
// Notifies Discord with step progress + partial lead data
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { notifyDiscord } from '../../../lib/discord';

const STEP_LABELS: Record<string | number, string> = {
  1:        '👤 Step 1 — Name + Email',
  2:        '🎯 Step 2 — Track selected',
  3:        '📝 Step 3 — Tell us more',
  4:        '✅ Step 4 — Confirm page reached',
  complete: '🎉 Registration complete'
};

export async function POST(req: NextRequest) {
  try {
    const {
      step,
      email,
      firstName,
      country,
      track,
      timestamp,
      sessionId
    } = await req.json();

    const label = STEP_LABELS[step] ?? `📋 Step ${step}`;
    const time  = timestamp
      ? new Date(timestamp).toUTCString()
      : new Date().toUTCString();

    const lines = [
      label,
      firstName ? `Name: ${firstName}`     : null,
      email     ? `Email: ${email}`         : null,
      country   ? `Country: ${country}`     : null,
      track     ? `Track: ${track}`         : null,
      sessionId ? `Session: \`${sessionId}\`` : null,
      `⏱ ${time}`
    ].filter(Boolean).join('\n');

    await notifyDiscord(lines);

    return NextResponse.json({ ok: true });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('Ping error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
