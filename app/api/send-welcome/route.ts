import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { notifyDiscord } from '../../lib/discord';

// ─── Clients ──────────────────────────────────────────────────────────────────

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dashboardUrl(role: string, email: string): string {
  if (role === 'super' || email === 'antcpu@gmail.com') return 'https://antcpu-ads.vercel.app/dashboard/admin';
  if (role === 'admin') return 'https://antcpu-ads.vercel.app/dashboard/users';
  return 'https://antcpu-ads.vercel.app/dashboard/user';
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { name, email, brand, trialStatus, role = 'user' } = await req.json();
    const firstName = name?.split(' ')[0] || 'there';
    const isTeam    = trialStatus === 'team';
    const days      = isTeam ? 90 : 3;
    const myDash    = dashboardUrl(role, email);

    const steps = [
      { n: '01', title: 'Create Your First Ad',  desc: 'Title, URL, description. 2 minutes. Go live immediately.',                                    href: 'https://antcpu-ads.vercel.app/create-ad' },
      { n: '02', title: 'Share It Everywhere',   desc: 'Use the ↗ Share button on your ad card. Pre-written post ready for every platform.',          href: myDash },
      { n: '03', title: 'Climb the Ladder',      desc: 'Entry → Rising → Featured → Top Tier. Engagement earns you higher placement automatically.', href: 'https://antcpu-ads.vercel.app/arena' },
    ];

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
      <body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;color:#fff">
        <div style="max-width:560px;margin:0 auto;padding:2rem 1.5rem">

          <!-- Header -->
          <div style="text-align:center;margin-bottom:2rem">
            <div style="font-size:1.5rem;font-weight:800;color:#f0883e">⚡ ANTCPU ADS</div>
            <div style="font-size:0.72rem;color:#555;margin-top:0.25rem;letter-spacing:0.1em;text-transform:uppercase">The Arena · v0.5</div>
          </div>

          <!-- Hero -->
          <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;padding:2rem;margin-bottom:1.5rem;text-align:center">
            <div style="font-size:1.4rem;font-weight:800;margin-bottom:0.5rem">Welcome to the Arena, ${firstName}. ⚡</div>
            <div style="font-size:0.88rem;color:#aaa;margin-bottom:1.5rem">
              <strong style="color:#fff">${brand}</strong> is now live in the ANTCPU ADS network.<br>
              You have <strong style="color:#f0883e">${days} days</strong> of ${isTeam ? 'team' : 'free trial'} access — full features, no limits.
            </div>
            <a href="${myDash}" style="display:inline-block;background:#f0883e;color:#000;text-decoration:none;font-weight:800;font-size:1rem;padding:0.85rem 2rem;border-radius:10px">
              Enter the Arena →
            </a>
          </div>

          <!-- Steps -->
          <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:1.25rem;margin-bottom:1.5rem">
            <div style="font-size:0.7rem;color:#555;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:1rem">Get Started in 3 Steps</div>
            ${steps.map(s => `
              <div style="display:flex;gap:1rem;padding:0.75rem 0;border-bottom:1px solid #1a1a1a">
                <div style="font-size:0.7rem;font-weight:800;color:#f0883e;min-width:24px;padding-top:2px">${s.n}</div>
                <div style="flex:1">
                  <div style="font-weight:700;font-size:0.88rem;margin-bottom:0.2rem">${s.title}</div>
                  <div style="font-size:0.78rem;color:#555;line-height:1.5">${s.desc}</div>
                </div>
                <a href="${s.href}" style="font-size:0.75rem;color:#f0883e;text-decoration:none;font-weight:700;white-space:nowrap;padding-top:2px">Go →</a>
              </div>
            `).join('')}
          </div>

          <!-- Featured ad -->
          <div style="background:#111;border:1px solid #D4AF3730;border-radius:12px;padding:1.25rem;margin-bottom:1.5rem">
            <div style="font-size:0.7rem;color:#555;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">⚡ Featured Ad — Share This</div>
            <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem">
              <span style="font-size:1.5rem">🗺️</span>
              <div>
                <div style="font-weight:800">Map of Pi</div>
                <div style="font-size:0.72rem;color:#D4AF37">Featured Partner</div>
              </div>
            </div>
            <div style="font-size:0.82rem;color:#aaa;margin-bottom:0.75rem">The world's most used crypto global marketplace. 2.1M+ users · 148K sellers · Free to use.</div>
            <div style="font-size:0.75rem;color:#555;margin-bottom:1rem">
              ✓ 2.1M+ registered users<br>
              ✓ 148,000 sellers<br>
              ✓ 173,000+ completed transactions<br><br>
              #mapofpi #pinetwork #picommerce #antcpuads
            </div>
            <a href="https://mapofpi.com/" style="display:inline-block;background:#D4AF37;color:#000;text-decoration:none;font-weight:700;font-size:0.85rem;padding:0.6rem 1.25rem;border-radius:8px">Visit Map of Pi →</a>
          </div>

          <!-- Tip -->
          <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:1.25rem;margin-bottom:1.5rem">
            <div style="font-size:0.7rem;color:#555;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem">💡 Quick Tip</div>
            <div style="font-size:0.88rem;color:#aaa;line-height:1.6">Your first share is your most powerful. The Arena grows when members share each other's ads. Every share earns points. Points climb the ladder. The ladder earns reach.</div>
          </div>

          <!-- Status badge -->
          <div style="text-align:center;margin-bottom:1.5rem">
            <span style="background:${isTeam ? '#7928ca15' : '#0070f315'};color:${isTeam ? '#7928ca' : '#0070f3'};border:1px solid ${isTeam ? '#7928ca30' : '#0070f330'};border-radius:999px;padding:0.3rem 1rem;font-size:0.75rem;font-weight:700">
              ${isTeam ? '🔵 Team Member — Unlimited' : '🟢 3-Day Free Trial Active'}
            </span>
          </div>

          <!-- Footer -->
          <div style="text-align:center;font-size:0.72rem;color:#333;border-top:1px solid #1a1a1a;padding-top:1rem">
            ⚡ ANTCPU ADS · <a href="mailto:ads@antcpu.io" style="color:#555">ads@antcpu.io</a> · <a href="https://antcpu-ads.vercel.app" style="color:#555">antcpu-ads.vercel.app</a><br>
            <a href="https://discord.gg/antcpu" style="color:#555">Join our Discord →</a>
          </div>

        </div>
      </body>
      </html>
    `;

    const { error } = await resend.emails.send({
      from:    'ANTCPU ADS <ads@antcpu.io>',
      to:      email,
      subject: `⚡ Welcome to the Arena, ${firstName} — you're live`,
      html,
    });

    if (error) throw error;

    await notifyDiscord(
      `📧 Welcome email sent to **${name}** (${email}) · ${brand} · ${isTeam ? '🔵 Team' : '🟢 Trial'} · role: ${role}`
    );

    return NextResponse.json({ sent: true });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
