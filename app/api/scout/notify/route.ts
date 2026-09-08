import { NextRequest, NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app';

export async function POST(req: NextRequest) {
  const { email, name, subject, message } = await req.json();

  if (!email || !subject || !message)
    return NextResponse.json({ error: 'email, subject, message required' }, { status: 400 });

  // Send email via Resend
  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ANTCPU ADS <arena@antcpu.com>',
      to:   [email],
      subject,
      html: `<div style="background:#0a0a0a;color:#fff;font-family:system-ui;padding:2rem;border-radius:12px">
        <h2 style="color:#f0883e">⚡ ANTCPU ADS</h2>
        <p>Hi ${name || 'there'},</p>
        <p>${message}</p>
        <hr style="border-color:#1a1a1a;margin:1.5rem 0"/>
        <p style="color:#444;font-size:0.8rem">The Arena · antcpu-ads.vercel.app</p>
      </div>`,
    }),
  });

  // 🔒 Discord via API route — never import discord.ts in server routes
  fetch(`${BASE_URL}/api/discord-notify`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: '',
      event:   'general',
      embed: {
        title:  '📣 Scout Notification Sent',
        color:  0xF0883E,
        fields: [
          { name: 'To',      value: email,   inline: true  },
          { name: 'Subject', value: subject, inline: false },
        ],
        footer:    'ANTCPU ADS · Scout Notify',
        timestamp: true,
      },
    }),
  }).catch(() => {});

  return NextResponse.json({ ok: emailRes.ok, status: emailRes.status });
}
