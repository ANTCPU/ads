import { NextRequest, NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1495909060170616884/5RthXmjPurDkhjpXkM_iQGa11-Gl-WnjGeRp-gq79piX5od5frIPqT1L-tGb-t-W06e7';

export async function POST(req: NextRequest) {
  const { email, name, subject, message } = await req.json();
  if (!email || !subject || !message)
    return NextResponse.json({ error: 'email, subject, message required' }, { status: 400 });

  // Send email via Resend
  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: 'ANTCPU ADS <arena@antcpu.com>',
      to: [email],
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

  // Ping Discord
  await fetch(DISCORD_WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: `📣 **Scout Notification Sent**\n**To:** ${email}\n**Subject:** ${subject}` }),
  });

  const ok = emailRes.ok;
  return NextResponse.json({ ok, status: emailRes.status });
}
