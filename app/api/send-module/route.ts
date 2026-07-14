import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { notifyDiscord, DC } from '../../lib/discord';

const resend = new Resend(process.env.RESEND_API_KEY);

const BASE_CSS = `
  body{margin:0;padding:0;background:#0a0a0a;font-family:system-ui,sans-serif;color:#fff}
  .wrap{max-width:560px;margin:0 auto;padding:2rem 1.25rem}
  .label{font-size:.65rem;color:#555;font-weight:700;letter-spacing:.12em;text-transform:uppercase;margin-bottom:.75rem}
  .step{display:flex;gap:.85rem;align-items:flex-start;margin-bottom:1.25rem}
  .step-body .title{font-weight:700;font-size:.9rem;margin-bottom:.2rem}
  .step-body .desc{font-size:.8rem;color:#aaa;line-height:1.5}
  .footer{border-top:1px solid #1a1a1a;padding-top:1.25rem;margin-top:2rem;font-size:.72rem;color:#555;text-align:center;line-height:1.8}
  .footer a{color:#555}
`;

// ─── Flag lookup — auto-derive when not passed ────────────────────────────────
const COUNTRY_FLAGS: Record<string, string> = {
  'Nigeria': '🇳🇬', 'United States': '🇺🇸', 'United Kingdom': '🇬🇧',
  'Finland': '🇫🇮', 'Saudi Arabia': '🇸🇦', 'Egypt': '🇪🇬',
  'Ghana': '🇬🇭', 'Kenya': '🇰🇪', 'South Africa': '🇿🇦',
  'India': '🇮🇳', 'Philippines': '🇵🇭', 'Indonesia': '🇮🇩',
  'Germany': '🇩🇪', 'France': '🇫🇷', 'Brazil': '🇧🇷',
  'Canada': '🇨🇦', 'Australia': '🇦🇺', 'Japan': '🇯🇵',
  'China': '🇨🇳', 'Mexico': '🇲🇽', 'Argentina': '🇦🇷',
  'Pakistan': '🇵🇰', 'Bangladesh': '🇧🇩', 'Vietnam': '🇻🇳',
  'Ethiopia': '🇪🇹', 'Tanzania': '🇹🇿', 'Uganda': '🇺🇬',
};

function championHtml(p: {
  firstName: string;
  shopName: string;
  country: string;
  flag: string;
  shareLink: string;
  arenaLink: string;
  lbLink: string;
  dashLink: string;
  isTeam: boolean;
  days: number;
}): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>${BASE_CSS}</style></head><body>
  <div class="wrap">
    <div class="label">🗺️ Country Champion · ${p.flag} ${p.country}</div>
    <h1 style="font-size:1.4rem;font-weight:800;margin:0 0 0.5rem">You're live, ${p.firstName}. ⚡</h1>
    <p style="color:#aaa;font-size:0.9rem;line-height:1.6;margin:0 0 1.5rem">
      <strong style="color:#fff">${p.shopName}</strong> is now representing
      <strong style="color:#fff">${p.flag} ${p.country}</strong> in the Map of Pi Arena.
      Your 10 antbots are deployed. Now it's time to climb.
    </p>
    <a href="${p.arenaLink}" style="display:block;background:#22c55e;color:#000;text-align:center;padding:0.9rem;border-radius:10px;font-weight:700;text-decoration:none;margin-bottom:2rem">
      View Your Shop in the Arena →
    </a>
    <div class="label">The Tier Ladder — Where You're Headed</div>
    <div style="display:flex;gap:0.5rem;margin-bottom:1.5rem;flex-wrap:wrap">
      ${[['🟢','Entry','You are here','#22c55e'],['🔵','Rising','100 pts','#0070f3'],['🟣','Featured','300 pts','#7928ca'],['🟠','Top Tier','750 pts','#f0883e']].map(([e,l,d,c])=>`
      <div style="flex:1;min-width:100px;background:#111;border:1px solid ${c}40;border-radius:10px;padding:0.75rem;text-align:center">
        <div style="font-size:1.2rem">${e}</div>
        <div style="font-weight:700;font-size:0.82rem;color:${c}">${l}</div>
        <div style="font-size:0.72rem;color:#555">${d}</div>
      </div>`).join('')}
    </div>
    <div class="label">How to Earn Points</div>
    ${[['⚡ +5','Share your shop link','Every share earns 5 points. WhatsApp, Telegram, X, Instagram — anywhere.'],['👆 +3','Get people to click','Every click on your shop earns 3 points. The more people visit, the faster you rise.'],['📌 +50','Get pinned by admin','Top performing shops get pinned to the top of the Arena — 50 bonus points and maximum visibility.']].map(([pts,title,desc])=>`
    <div class="step">
      <div style="background:#f0883e20;border:1px solid #f0883e40;color:#f0883e;border-radius:8px;padding:0.4rem 0.6rem;font-weight:800;font-size:0.8rem;white-space:nowrap">${pts}</div>
      <div class="step-body"><div class="title">${title}</div><div class="desc">${desc}</div></div>
    </div>`).join('')}
    <div style="background:#111;border:1px solid #222;border-radius:10px;padding:1rem;margin:1.5rem 0">
      <div class="label">Your Shop Link — Share This</div>
      <div style="font-family:monospace;font-size:0.85rem;color:#22c55e;word-break:break-all;margin-bottom:0.75rem">${p.shareLink}</div>
      <a href="${p.shareLink}" style="display:block;background:#22c55e;color:#000;text-align:center;padding:0.75rem;border-radius:8px;font-weight:700;text-decoration:none">↗ Share Your Shop Now</a>
    </div>
    <div style="display:flex;gap:0.75rem;margin-bottom:2rem">
      <a href="${p.lbLink}" style="flex:1;background:#111;border:1px solid #222;color:#fff;text-align:center;padding:0.75rem;border-radius:8px;font-weight:700;text-decoration:none;font-size:0.85rem">🏆 Leaderboard</a>
      <a href="${p.dashLink}" style="flex:1;background:#111;border:1px solid #222;color:#fff;text-align:center;padding:0.75rem;border-radius:8px;font-weight:700;text-decoration:none;font-size:0.85rem">⚡ Dashboard</a>
    </div>
    <div class="footer">
      ANTCPU ADS · <a href="https://antcpu-ads.vercel.app">antcpu-ads.vercel.app</a><br>
      You're receiving this because you claimed a country on Map of Pi Arena.
    </div>
  </div>
  </body></html>`;
}

export async function POST(req: NextRequest) {
  try {
    const {
      type,
      name, email, brand, trialStatus, role = 'user',
      shopName, country, flag, adId, category,
    } = await req.json();

    if (!email || !type) {
      return NextResponse.json({ error: 'email and type required' }, { status: 400 });
    }

    const firstName    = name?.split(' ')[0] || 'there';
    const isTeam       = trialStatus === 'team';
    const days         = isTeam ? 90 : 3;
    const shareLink    = adId
      ? `https://antcpu-ads.vercel.app/s/${String(adId).slice(0, 8)}`
      : 'https://antcpu-ads.vercel.app/mapofpi/icons/arena';

    // ─── Champion welcome ─────────────────────────────────────────────────────
    if (type === 'champion') {
      if (!country) {
        return NextResponse.json({ error: 'champion requires country' }, { status: 400 });
      }

      // Auto-derive flag if not passed
      const resolvedFlag = flag || COUNTRY_FLAGS[country] || '🌍';

      const html = championHtml({
        firstName,
        shopName:  shopName || brand,
        country,
        flag:      resolvedFlag,
        shareLink,
        arenaLink: 'https://antcpu-ads.vercel.app/mapofpi/icons/arena',
        lbLink:    'https://antcpu-ads.vercel.app/dashboard/leaderboard',
        dashLink:  'https://antcpu-ads.vercel.app/dashboard/user',
        isTeam,
        days,
      });

      const { error } = await resend.emails.send({
        from:    'ANTCPU ADS <arena@antcpu.com>',
        to:      email,
        subject: `🗺️ ${firstName}, your shop is live — start earning points`,
        html,
      });
      if (error) throw error;

      notifyDiscord('', 'new_signup', {
        title:  '📧 Champion Welcome Sent',
        color:  DC.gold,
        fields: [
          { name: 'Name',     value: name || '—',                    inline: true  },
          { name: 'Country',  value: `${resolvedFlag} ${country}`,   inline: true  },
          { name: 'Shop',     value: shopName || brand || '—',       inline: false },
          { name: 'Email',    value: email,                          inline: false },
          { name: 'Category', value: category || '—',                inline: true  },
          { name: 'Link',     value: shareLink,                      inline: false },
        ],
        footer:    'ANTCPU ADS · Email Module',
        timestamp: true,
      });

      return NextResponse.json({ sent: true, type: 'champion' });
    }

    return NextResponse.json({ error: `unknown type: ${type}` }, { status: 400 });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
