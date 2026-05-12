import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const DISCORD_WEBHOOK = 'https://discord.com/api/webhooks/1495909060170616884/5RthXmjPurDkhjpXkM_iQGa11-Gl-WnjGeRp-gq79piX5od5frIPqT1L-tGb-t-W06e7';

const QUOTES = [
  { quote: "The best marketing doesn't feel like marketing.", author: "Tom Fishburne" },
  { quote: "Content is fire. Social media is gasoline.", author: "Jay Baer" },
  { quote: "Make it simple. Make it memorable. Make it inviting to look at.", author: "Leo Burnett" },
  { quote: "Your brand is what people say about you when you're not in the room.", author: "Jeff Bezos" },
  { quote: "Stop interrupting what people are interested in and be what people are interested in.", author: "Craig Davis" },
];

export async function POST(req: NextRequest) {
  try {
    const { secret } = await req.json();
    if (secret !== process.env.WEEKLY_SECRET) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // Fetch all subscribers
    const { data: signups } = await supabase.from('ad_signups').select('name,email,brand_name,status').eq('status', 'team').or('status.eq.trial');
    if (!signups?.length) return NextResponse.json({ sent: 0 });

    // Fetch top 3 ads
    const { data: topAds } = await supabase.from('ads').select('*').eq('status', 'active').order('pinned', { ascending: false }).limit(3);

    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    const week = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    let sent = 0;
    for (const user of signups) {
      const firstName = user.name?.split(' ')[0] || 'there';

      const leaderboardHtml = (topAds || []).map((ad, i) => `
        <div style="display:flex;gap:1rem;align-items:flex-start;padding:0.75rem 0;border-bottom:1px solid #1a1a1a;">
          <div style="font-size:1.2rem;font-weight:800;color:#D4AF37;min-width:1.5rem;">${['🥇','🥈','🥉'][i]}</div>
          <div>
            <div style="font-weight:700;font-size:0.9rem;">${ad.brand}</div>
            <div style="color:#666;font-size:0.8rem;">${ad.title}</div>
            <a href="${ad.url}" style="color:#0070f3;font-size:0.75rem;text-decoration:none;">${ad.url} →</a>
          </div>
        </div>
      `).join('');

      const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="background:#0a0a0a;color:#fff;font-family:system-ui,sans-serif;margin:0;padding:0;">
  <div style="max-width:600px;margin:0 auto;padding:2rem;">

    <!-- Header -->
    <div style="text-align:center;padding:2rem 0 1.5rem;">
      <div style="font-size:2rem;margin-bottom:0.5rem;">⚡</div>
      <div style="font-weight:800;font-size:1.4rem;">ANTCPU ADS</div>
      <div style="color:#555;font-size:0.8rem;">Weekly Arena Digest · ${week}</div>
    </div>

    <!-- Greeting -->
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;padding:1.75rem;margin-bottom:1.5rem;">
      <div style="font-size:1.2rem;font-weight:800;margin-bottom:0.4rem;">Hey ${firstName} 👋</div>
      <div style="color:#666;font-size:0.88rem;line-height:1.7;">Here's your weekly Arena update — top ads, a featured share, a quick tip, and something to think about.</div>
    </div>

    <!-- Leaderboard -->
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;padding:2rem;margin-bottom:1.5rem;">
      <div style="font-size:0.65rem;color:#D4AF37;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:1rem;">🏆 This Week's Leaderboard</div>
      ${leaderboardHtml || '<div style="color:#555;font-size:0.85rem;">No ads yet this week — be the first to go live.</div>'}
      <a href="https://antcpu-ads.vercel.app/dashboard/user" style="display:inline-block;margin-top:1rem;background:#0070f315;border:1px solid #0070f340;color:#0070f3;padding:0.5rem 1.25rem;border-radius:8px;font-weight:600;text-decoration:none;font-size:0.82rem;">View Full Arena →</a>
    </div>

    <!-- Featured Ad to Share -->
    <div style="background:#111;border:1px solid #D4AF3730;border-radius:16px;padding:2rem;margin-bottom:1.5rem;position:relative;overflow:hidden;">
      <div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,#2E7D32,#D4AF37);"></div>
      <div style="font-size:0.65rem;color:#D4AF37;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:1rem;">⚡ Featured Ad — Share This Week</div>
      <div style="font-weight:800;font-size:1.1rem;margin-bottom:0.3rem;">🗺️ Map of Pi</div>
      <div style="color:#666;font-size:0.85rem;line-height:1.6;margin-bottom:1rem;">The world's most used crypto global marketplace. 2.1M+ users · 148K sellers.</div>
      <div style="background:#0a0a0a;border:1px solid #1a1a1a;border-radius:10px;padding:1rem;font-size:0.82rem;color:#888;line-height:1.7;margin-bottom:1rem;font-family:monospace;">
        Map of Pi is the world's most used crypto global marketplace.&#10;&#10;✓ 2.1M+ registered users&#10;✓ 148,000 sellers&#10;✓ Free to use. No bank account required.&#10;&#10;→ mapofpi.com&#10;&#10;#mapofpi #pinetwork #picommerce #antcpuads
      </div>
      <a href="https://mapofpi.com" style="display:inline-block;background:#2E7D32;color:#fff;padding:0.6rem 1.25rem;border-radius:8px;font-weight:700;text-decoration:none;font-size:0.85rem;">Visit Map of Pi →</a>
    </div>

    <!-- Quick Tip -->
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;padding:1.5rem;margin-bottom:1.5rem;">
      <div style="font-size:0.65rem;color:#555;letter-spacing:0.12em;text-transform:uppercase;margin-bottom:0.75rem;">💡 Quick Tip This Week</div>
      <div style="font-size:0.95rem;font-weight:600;margin-bottom:0.4rem;">Share other people's ads — not just your own.</div>
      <div style="color:#666;font-size:0.85rem;line-height:1.6;">The Arena rewards generosity. When you share another member's ad, you earn points AND build goodwill. That's how the ladder climbs fastest.</div>
    </div>

    <!-- Quote -->
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;padding:1.5rem;margin-bottom:1.5rem;text-align:center;">
      <div style="font-size:1.1rem;font-style:italic;color:#888;line-height:1.7;margin-bottom:0.75rem;">"${quote.quote}"</div>
      <div style="font-size:0.78rem;color:#555;font-weight:600;">— ${quote.author}</div>
    </div>

    <!-- Discord CTA -->
    <div style="background:#5865F215;border:1px solid #5865F230;border-radius:16px;padding:1.5rem;margin-bottom:1.5rem;text-align:center;">
      <div style="font-weight:700;margin-bottom:0.4rem;">Join the Arena on Discord</div>
      <div style="color:#666;font-size:0.85rem;margin-bottom:1rem;">Share wins, get feedback, coordinate ad shares with other members.</div>
      <a href="https://discord.gg/antcpu" style="display:inline-block;background:#5865F2;color:#fff;padding:0.6rem 1.5rem;border-radius:8px;font-weight:700;text-decoration:none;font-size:0.85rem;">Join Discord →</a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;color:#333;font-size:0.75rem;padding:1.5rem 0;">
      ⚡ ANTCPU ADS · <a href="mailto:antony@antcpu.com" style="color:#333;">antony@antcpu.com</a><br><br>
      You're receiving this because you joined the Arena.<br>
      <a href="https://antcpu-ads.vercel.app" style="color:#333;">antcpu-ads.vercel.app</a>
    </div>

  </div>
</body>
</html>`;

      await resend.emails.send({
        from: 'ANTCPU ADS <antony@antcpu.com>',
        to: user.email,
        subject: `⚡ Arena Weekly — ${week} · Leaderboard + Featured Share`,
        html,
      });
      sent++;
    }

    // Discord notification
    await fetch(DISCORD_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `📧 Weekly digest sent to **${sent}** Arena members · ${week}`,
      }),
    });

    return NextResponse.json({ sent });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
