// app/api/unsubscribe/route.ts
// ─── One-click unsubscribe ────────────────────────────────────────────────────
// GET  — human clicks link in email → confirmation page
// POST — Gmail one-click (List-Unsubscribe-Post header fires this)
//
// Both verify signed token before writing to email_validity.
// Token = base64url(email:UNSUB_SECRET) — generated in herald.ts unsubToken()
// Never trusts email param alone — token required.
//
// After unsubscribe:
//   email_validity.status = 'unsubscribed'
//   checkEmailGate() blocks all future sends to this address
//   No further emails — no in-app notifications either (shouldNotify = false)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = 'https://antcpu-ads.vercel.app';

// ─── Token verification ───────────────────────────────────────────────────────
// Mirrors unsubToken() in herald.ts — must stay in sync.

function verifyToken(email: string, token: string): boolean {
  const secret   = process.env.UNSUB_SECRET || 'antcpu-unsub-2026';
  const expected = Buffer.from(`${email}:${secret}`).toString('base64url');
  return token === expected;
}

// ─── Write to DB ──────────────────────────────────────────────────────────────

async function markUnsubscribed(email: string): Promise<void> {
  const now = new Date().toISOString();
  await supabase
    .from('email_validity')
    .upsert([{
      email:       email.trim().toLowerCase(),
      status:      'unsubscribed',
      unsubbed_at: now,
      source:      'unsubscribe_link',
      updated_at:  now,
    }], { onConflict: 'email' });
}

// ─── GET — human-facing confirmation ─────────────────────────────────────────

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email') || '';
  const token = req.nextUrl.searchParams.get('token') || '';

  if (!email || !token || !verifyToken(email, token)) {
    return new NextResponse(
      `<html><body style="background:#0a0a0a;color:#fff;font-family:system-ui;
        display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0">
        <div style="text-align:center;padding:2rem">
          <div style="font-size:2rem;margin-bottom:1rem">❌</div>
          <div style="font-weight:700;margin-bottom:0.5rem">Invalid link.</div>
          <div style="color:#555;font-size:0.85rem">
            This unsubscribe link is invalid or has expired.
          </div>
          <a href="${APP_URL}" style="color:#f0883e;font-size:0.85rem;
            text-decoration:none;display:block;margin-top:1.5rem">
            ← Back to the Arena
          </a>
        </div>
      </body></html>`,
      { status: 400, headers: { 'Content-Type': 'text/html' } }
    );
  }

  await markUnsubscribed(email);

  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Unsubscribed — ANTCPU ADS</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;
  color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh">
  <div style="text-align:center;padding:2rem;max-width:400px">
    <div style="font-size:2.5rem;margin-bottom:1rem">✅</div>
    <div style="font-size:1.2rem;font-weight:800;margin-bottom:0.5rem">
      You've been unsubscribed.
    </div>
    <div style="font-size:0.88rem;color:#555;margin-bottom:0.5rem">
      ${email}
    </div>
    <div style="font-size:0.82rem;color:#444;margin-bottom:1.5rem;line-height:1.6">
      You won't receive any more emails from ANTCPU ADS.<br>
      Your account and ad remain active.
    </div>
    <a href="${APP_URL}"
      style="color:#f0883e;font-size:0.85rem;text-decoration:none;
      font-weight:600">
      ← Back to the Arena
    </a>
  </div>
</body>
</html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  );
}

// ─── POST — Gmail one-click ───────────────────────────────────────────────────
// Gmail sends POST with body: List-Unsubscribe=One-Click
// Email + token come from the URL params in the List-Unsubscribe header.

export async function POST(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email') || '';
  const token = req.nextUrl.searchParams.get('token') || '';

  if (!email || !token || !verifyToken(email, token)) {
    return NextResponse.json({ error: 'invalid token' }, { status: 400 });
  }

  await markUnsubscribed(email);
  return NextResponse.json({ unsubscribed: true, email });
}
