import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { notifyDiscord } from '../../lib/discord';

// ─── Clients ──────────────────────────────────────────────────────────────────

const resend   = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

type Signup = {
  name:       string;
  email:      string;
  brand_name: string;
  status:     string;
  role:       string;
};

type Ad = {
  id:          string;
  brand:       string;
  title:       string;
  url:         string;
  description: string;
  points:      number;
  tier:        string;
};

// ─── Quotes ───────────────────────────────────────────────────────────────────

const QUOTES = [
  { quote: "The best marketing doesn't feel like marketing.",                              author: 'Tom Fishburne' },
  { quote: 'Content is fire. Social media is gasoline.',                                  author: 'Jay Baer' },
  { quote: 'Make it simple. Make it memorable. Make it inviting to look at.',             author: 'Leo Burnett' },
  { quote: "Your brand is what people say about you when you're not in the room.",        author: 'Jeff Bezos' },
  { quote: "Stop interrupting what people are interested in and be what people are interested in.", author: 'Craig Davis' },
];

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { secret } = await req.json();
    if (secret !== process.env.WEEKLY_SECRET) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    // — fetch all active subscribers (team + trial) using correct IN syntax
    const { data: signups } = await supabase
      .from('ad_signups')
      .select('name, email, brand_name, status, role')
      .in('status', ['team', 'trial']);

    if (!signups?.length) return NextResponse.json({ sent: 0 });

    // — fetch top 3 ads by points
    const { data: topAds } = await supabase
      .from('ads')
      .select('id, brand, title, url, description, points, tier')
      .eq('status', 'active')
      .order('points', { ascending: false })
      .limit(3);

    const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    const week  = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    // — role-aware dashboard URL
    function dashboardUrl(user: Signup): string {
      if (user.role === 'super' || user.email === 'antcpu@gmail.com') return 'https://antcpu-ads.vercel.app/dashboard/admin';
      if (user.role === 'admin') return 'https://antcpu-ads.vercel.app/dashboard/users';
      return 'https://antcpu-ads.vercel.app/dashboard/user';
    }

    const leaderboardHtml = (topAds || []).map((ad: Ad, i: number) => `
      <div style="display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #1a1a1a;">
        <span style="font-size:1.4rem">${['🥇','🥈','🥉'][i]}</span>
        <div style="flex:1">
          <div style="font-weight:700;color:#fff">${ad.brand}</div>
          <div style="font-size:0.82rem;color:#888">${ad.title}</div>
        </div>
        <a href="${ad.url}" style="font-size:0.78rem;color:#f0883e;text-decoration:none;font-weight:700">Visit →</a>
      </div>
    `).join('');

    let sent = 0;

    for (const user of signups as Signup[]) {
      const firstName = user.name?.split(' ')[0] || 'there';
      const isTeam    = user.status === 'team';
      const myDash    = dashboardUrl(user);

      const html = `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
        <body style="margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;color:#fff">
          <div style="max-width:560px;margin:0 auto;padding:2rem 1.5rem">

            <!-- Header -->
            <div style="text-align:center;margin-bottom:2rem">
              <div style="font-size:1.5rem;font-weight:800;color:#f0883e">⚡ ANTCPU ADS</div>
              <div style="font-size:0.75rem;color:#555;margin-top:0.25rem;letter-spacing:0.1em;text-transform:uppercase">Weekly Arena Digest · ${week}</div>
            </div>

            <!-- Greeting -->
            <div style="font-size:1rem;color:#aaa;margin-bottom:1.5rem">
              Hey ${firstName} 👋 — here's your weekly Arena update.
            </div>

            <!-- Leaderboard -->
            <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:1.25rem;margin-bottom:1.5rem">
              <div style="font-size:0.7rem;color:#555;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">🏆 This Week's Leaderboard</div>
              ${leaderboardHtml || '<div style="color:#555;font-size:0.85rem">No ads yet — be the first to go live.</div>'}
              <a href="${myDash}" style="display:inline-block;margin-top:1rem;background:#f0883e;color:#000;text-decoration:none;font-weight:700;font-size:0.85rem;padding:0.6rem 1.25rem;border-radius:8px">View Full Arena →</a>
            </div>

            <!-- Featured ad -->
            <div style="background:#111;border:1px solid #D4AF3730;border-radius:12px;padding:1.25rem;margin-bottom:1.5rem">
              <div style="font-size:0.7rem;color:#555;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">⚡ Featured Ad — Share This Week</div>
              <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem">
                <span style="font-size:1.5rem">🗺️</span>
                <div>
                  <div style="font-weight:800;color:#fff">Map of Pi</div>
                  <div style="font-size:0.75rem;color:#D4AF37">Featured Partner</div>
                </div>
              </div>
              <div style="font-size:0.85rem;color:#aaa;margin-bottom:1rem">The world's most used crypto global marketplace. 2.1M+ users · 148K sellers · Free to use.</div>
              <div style="font-size:0.78rem;color:#555;margin-bottom:1rem">
                ✓ 2.1M+ registered users<br>
                ✓ 148,000 sellers<br>
                ✓ 173,000+ completed transactions<br>
                ✓ Free. International. No bank account required.
              </div>
              <div style="font-size:0.72rem;color:#555;margin-bottom:1rem">#mapofpi #pinetwork #picommerce #antcpuads</div>
              <a href="https://mapofpi.com/" style="display:inline-block;background:#D4AF37;color:#000;text-decoration:none;font-weight:700;font-size:0.85rem;padding:0.6rem 1.25rem;border-radius:8px">Visit Map of Pi →</a>
            </div>

            <!-- Quick tip -->
            <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:1.25rem;margin-bottom:1.5rem">
              <div style="font-size:0.7rem;color:#555;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem">💡 Quick Tip</div>
              <div style="font-size:0.88rem;color:#aaa;line-height:1.6">
                Share other people's ads — not just your own.<br><br>
                The Arena rewards generosity. When you share another member's ad, you earn points AND build goodwill. That's how the ladder climbs fastest.
              </div>
            </div>

            <!-- Quote -->
            <div style="border-left:3px solid #f0883e;padding:0.75rem 1rem;margin-bottom:1.5rem">
              <div style="font-size:0.88rem;color:#aaa;font-style:italic">"${quote.quote}"</div>
              <div style="font-size:0.75rem;color:#555;margin-top:0.4rem">— ${quote.author}</div>
            </div>

            <!-- Status badge -->
            <div style="text-align:center;margin-bottom:1.5rem">
              <span style="background:${isTeam ? '#7928ca15' : '#0070f315'};color:${isTeam ? '#7928ca' : '#0070f3'};border:1px solid ${isTeam ? '#7928ca30' : '#0070f330'};border-radius:999px;padding:0.3rem 1rem;font-size:0.75rem;font-weight:700">
                ${isTeam ? '🔵 Team Member' : '🟢 Trial Active'}
              </span>
            </div>

            <!-- Discord CTA -->
            <div style="text-align:center;margin-bottom:2rem">
              <a href="https://discord.gg/antcpu" style="display:inline-block;background:transparent;border:1px solid #333;color:#aaa;text-decoration:none;font-weight:600;font-size:0.85rem;padding:0.6rem 1.25rem;border-radius:8px">💬 Join the Discord →</a>
            </div>

            <!-- Footer -->
            <div style="text-align:center;font-size:0.72rem;color:#333;border-top:1px solid #1a1a1a;padding-top:1rem">
              ⚡ ANTCPU ADS · <a href="mailto:ads@antcpu.io" style="color:#555">ads@antcpu.io</a> · <a href="https://antcpu-ads.vercel.app" style="color:#555">antcpu-ads.vercel.app</a><br>
              You're receiving this because you joined the Arena.
            </div>

          </div>
        </body>
        </html>
      `;

      await resend.emails.send({
        from:    'ANTCPU ADS <ads@antcpu.io>',
        to:      user.email,
        subject: `⚡ Arena Weekly — ${week} · Leaderboard + Featured Share`,
        html,
      });
      sent++;
    }

    await notifyDiscord(`📧 Weekly digest sent to **${sent}** Arena members · ${week}`);
    return NextResponse.json({ sent });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
