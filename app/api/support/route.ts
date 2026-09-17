// app/api/support/route.ts
// ─── Support message submission ───────────────────────────────────────────────
// POST { email, name, subject, message }
// Writes to support_messages, notifies user via Herald, pings Discord.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE = process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app';

export async function POST(req: NextRequest) {
  try {
    const { email, name, subject, message } = await req.json();

    if (!email || !message?.trim()) {
      return NextResponse.json(
        { ok: false, error: 'email and message required' },
        { status: 400 }
      );
    }

    // ── Write to support_messages ─────────────────────────────────────────
    const { error: insertError } = await supabase
      .from('support_messages')
      .insert({
        email:   email.trim().toLowerCase(),
        name:    name?.trim()    || null,
        subject: subject?.trim() || 'Support Request',
        message: message.trim(),
        status:  'open',
      });

    if (insertError) throw insertError;

    // ── Herald — in-app notification to user ──────────────────────────────
    fetch(`${BASE}/api/notify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:   email.trim().toLowerCase(),
        type:    'info',
        title:   '✉️ We got your message',
        message: `Thanks${name ? ` ${name.split(' ')[0]}` : ''} — we'll get back to you shortly. In the meantime, keep sharing your ad to earn points.`,
      }),
    }).catch(() => {});

    // ── Discord ping to admin ─────────────────────────────────────────────
    fetch(`${BASE}/api/discord-notify`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: '',
        event:   'support_message',
        embed: {
          title:  '🆘 New Support Message',
          color:  0x0070f3,
          fields: [
            { name: 'From',    value: `${name || 'Unknown'} (${email})`, inline: false },
            { name: 'Subject', value: subject || 'No subject',           inline: false },
            { name: 'Message', value: message.slice(0, 500),             inline: false },
          ],
          footer:    'Support · ANTCPU ADS',
          timestamp: true,
        },
      }),
    }).catch(() => {});

    return NextResponse.json({ ok: true });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
