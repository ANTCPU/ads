import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1495909060170616884/5RthXmjPurDkhjpXkM_iQGa11-Gl-WnjGeRp-gq79piX5od5frIPqT1L-tGb-t-W06e7';

export async function POST(req: NextRequest) {
  try {
    const { name, email, brand, trialStatus } = await req.json();
    const firstName = name?.split(' ')[0] || 'there';
    const isTeam = trialStatus === 'team';
    const days = isTeam ? 90 : 3;

    const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0a0a0a;color:#fff;font-family:system-ui,sans-serif;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;padding:2rem;">

    <!-- Header -->
    <div style="text-align:center;padding:2rem 0 1.5rem;">
      <div style="font-size:2rem;margin-bottom:0.5rem;">⚡</div>
      <div style="font-weight:800;font-size:1.4rem;letter-spacing:0.05em;">ANTCPU ADS</div>
      <div style="color:#555;font-size:0.8rem;margin-top:0.25rem;">The Arena · v0.5</div>
    </div>

    <!-- Welcome -->
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;padding:2rem;margin-bottom:1.5rem;">
      <div style="font-size:1.5rem;font-weight:800;margin-bottom:0.5rem;">Welcome to the Arena, ${firstName}. ⚡</div>
      <div style="color:#666;font-size:0.95rem;line-height:1.7;margin-bottom:1rem;">
        ${brand} is now live in the ANTCPU ADS network. You have <strong style="color:#0070f3">${days} days</strong> of ${isTeam ? 'team' : 'free trial'} access — full features, no limits.
      </div>
      <a href="https://antcpu-ads.vercel.app/dashboard/user" style="display:inline-block;background:#0070f3;color:#fff;padding:0.75rem 1.75rem;border-radius:8px;font-weight:700;text-decoration:none;font-size:0.95rem;">Enter the Arena →</a>
    </div>

    <!-- Getting Started -->
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;padding:2rem;margin-bottom:1.5rem;">
      <div style="font-size:0.65rem;color:#555;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:1.25rem;">Get Started in 3 Steps</div>
      ${[
        { n:'01', title:'Create Your First Ad', desc:'Title, URL, description. 2 minutes. Go live immediately.', href:'https://antcpu-ads.vercel.app/create-ad' },
        { n:'02', title:'Share It Everywhere', desc:'Use the ↗ Share button on your ad card. Pre-written post ready to copy for every platform.', href:'https://antcpu-ads.vercel.app/dashboard/user' },
        { n:'03', title:'Climb the Ladder', desc:'Entry → Rising → Featured → Top Tier. Engagement earns you higher placement automatically.', href:'https://antcpu-ads.vercel.app/#ladder' },
      ].map(s => `
        <div style="display:flex;gap:1rem;margin-bottom:1.25rem;align-items:flex-start;">
          <div style="font-size:1.5rem;font-weight:800;color:#0070f3;min-width:2.5rem;">${s.n}</div>
          <div>
            <div style="font-weight:700;font-size:0.95rem;margin-bottom:0.2rem;">${s.title}</div>
            <div style="color:#666;font-size:0.82rem;line-height:1.6;margin-bottom:0.4rem;">${s.desc}</div>
            <a href="${s.href}" style="color:#0070f3;font-size:0.78rem;font-weight:600;text-decoration:none;">Go →</a>
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Featured Ad to Share -->
    <div style="background:#111;border:1px solid #D4AF3730;border-radius:16px;padding:2rem;margin-bottom:1.5rem;position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#2E7D32,#D4AF37);"></div>
      <div style="font-size:0.65rem;color:#D4AF37;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:1rem;">⚡ Featured Ad — Share This</div>
      <div style="font-weight:800;font-size:1.1rem;margin-bottom:0.3rem;">🗺️ Map of Pi</div>
      <div style="color:#666;font-size:0.85rem;line-height:1.6;margin-bottom:1rem;">The world's most used crypto global marketplace. 2.1M+ users · 148K sellers · Free to use.</div>
      <div style="background:#0a0a0a;border:1px solid #1a1a1a;border-radius:10px;padding:1rem;font-size:0.82rem;color:#888;line-height:1.7;margin-bottom:1rem;font-family:monospace;">
        Map of Pi is the world's most used crypto global marketplace on your smartphone.&#10;&#10;✓ 2.1M+ registered users&#10;✓ 148,000 sellers&#10;✓ 173,000+ completed transactions&#10;&#10;Free to use. International. No bank account required.&#10;&#10;→ mapofpi.com&#10;&#10;#mapofpi #pinetwork #picommerce #antcpuads
      </div>
      <a href="https://mapofpi.com" style="display:inline-block;background:#2E7D32;color:#fff;padding:0.6rem 1.25rem;border-radius:8px;font-weight:700;text-decoration:none;font-size:0.85rem;">Visit Map of Pi →</a>
    </div>

    <!-- Quick Tip -->
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;padding:1.5rem;margin-bottom:1.5rem;">
      <div style="font-size:0.65rem;color:#555;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:0.75rem;">💡 Quick Tip</div>
      <div style="font-size:0.95rem;font-weight:600;margin-bottom:0.4rem;">Your first share is your most powerful.</div>
      <div style="color:#666;font-size:0.85rem;line-height:1.6;">The Arena grows when members share each other's ads. Every share earns points. Points climb the ladder. The ladder earns reach.</div>
    </div>

    <!-- Footer -->
    <div style="text-align:center;color:#333;font-size:0.75rem;padding:1.5rem 0;">
      ⚡ ANTCPU ADS · <a href="mailto:ads@antcpu.io" style="color:#333;">ads@antcpu.io</a> · <a href="https://antcpu-ads.vercel.app" style="color:#333;">antcpu-ads.vercel.app</a>
      <br><br>
      <a href="https://discord.gg/antcpu" style="color:#5865F2;font-weight:600;text-decoration:none;">Join our Discord →</a>
    </div>

  </div>
</body>
</html>`;

    // Send via Resend
    const { error } = await resend.emails.send({
      from: 'ANTCPU ADS <ads@antcpu.io>',
      to: email,
      subject: `⚡ Welcome to the Arena, ${firstName} — you're live`,
      html,
    });

    if (error) throw error;

    // Discord notification
    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `📧 Welcome email sent to **${name}** (${email}) · ${brand} · ${isTeam ? '🔵 Team' : '🟢 Trial'}`,
      }),
    });

    return NextResponse.json({ sent: true });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
