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

// ─── Flag lookup — matches MAPOFPI_COUNTRIES in assets.ts ─────────────────────
const COUNTRY_FLAGS: Record<string, string> = {
  // ── Africa ──────────────────────────────────────────
  'Nigeria':       '🇳🇬',
  'Ghana':         '🇬🇭',
  'Kenya':         '🇰🇪',
  'South Africa':  '🇿🇦',
  'Ethiopia':      '🇪🇹',
  'Tanzania':      '🇹🇿',
  'Uganda':        '🇺🇬',
  'Cameroon':      '🇨🇲',
  'Senegal':       '🇸🇳',
  'Ivory Coast':   '🇨🇮',
  'Zimbabwe':      '🇿🇼',
  'Zambia':        '🇿🇲',
  'Rwanda':        '🇷🇼',
  'Morocco':       '🇲🇦',
  'Algeria':       '🇩🇿',
  'Tunisia':       '🇹🇳',
  'Egypt':         '🇪🇬',
  'Mozambique':    '🇲🇿',
  'DR Congo':      '🇨🇩',
  'Togo':          '🇹🇬',
  'Benin':         '🇧🇯',
  'Sierra Leone':  '🇸🇱',
  'Liberia':       '🇱🇷',
  // ── Middle East ─────────────────────────────────────
  'Saudi Arabia':  '🇸🇦',
  'UAE':           '🇦🇪',
  'Israel':        '🇮🇱',
  // ── Asia ────────────────────────────────────────────
  'India':         '🇮🇳',
  'Pakistan':      '🇵🇰',
  'Bangladesh':    '🇧🇩',
  'Sri Lanka':     '🇱🇰',
  'Nepal':         '🇳🇵',
  'China':         '🇨🇳',
  'Japan':         '🇯🇵',
  'South Korea':   '🇰🇷',
  'Hong Kong':     '🇭🇰',
  'Taiwan':        '🇹🇼',
  'Singapore':     '🇸🇬',
  'Malaysia':      '🇲🇾',
  'Indonesia':     '🇮🇩',
  'Philippines':   '🇵🇭',
  'Vietnam':       '🇻🇳',
  'Thailand':      '🇹🇭',
  'Myanmar':       '🇲🇲',
  'Cambodia':      '🇰🇭',
  'Laos':          '🇱🇦',
  // ── Oceania ─────────────────────────────────────────
  'Australia':     '🇦🇺',
  'New Zealand':   '🇳🇿',
  // ── Europe ──────────────────────────────────────────
  'United Kingdom': '🇬🇧',
  'Germany':        '🇩🇪',
  'France':         '🇫🇷',
  'Spain':          '🇪🇸',
  'Italy':          '🇮🇹',
  'Netherlands':    '🇳🇱',
  'Portugal':       '🇵🇹',
  'Greece':         '🇬🇷',
  'Sweden':         '🇸🇪',
  'Norway':         '🇳🇴',
  'Denmark':        '🇩🇰',
  'Finland':        '🇫🇮',
  'Switzerland':    '🇨🇭',
  'Austria':        '🇦🇹',
  'Belgium':        '🇧🇪',
  'Poland':         '🇵🇱',
  'Czech Republic': '🇨🇿',
  'Hungary':        '🇭🇺',
  'Romania':        '🇷🇴',
  'Bulgaria':       '🇧🇬',
  'Serbia':         '🇷🇸',
  'Croatia':        '🇭🇷',
  'Slovakia':       '🇸🇰',
  'Turkey':         '🇹🇷',
  // ── Americas ────────────────────────────────────────
  'United States':  '🇺🇸',
  'Canada':         '🇨🇦',
  'Mexico':         '🇲🇽',
  'Brazil':         '🇧🇷',
  'Argentina':      '🇦🇷',
  'Colombia':       '🇨🇴',
  'Venezuela':      '🇻🇪',
  'Peru':           '🇵🇪',
  'Chile':          '🇨🇱',
  'Ecuador':        '🇪🇨',
  'Bolivia':        '🇧🇴',
  'Honduras':       '🇭🇳',
  'Guatemala':      '🇬🇹',
  'El Salvador':    '🇸🇻',
};

function championHtml(p: {
  firstName: string;
  shopName: string;
  country: string;
  flag: string;
  shareLink: string;
  arenaLink: string;
  championsLink: string;
  lbLink: string;
  dashLink: string;
  isTeam: boolean;
  days: number;
}): string {
  const tierRows = [
    ['🟢', 'Entry',    'You are here',  '#22c55e'],
    ['🔵', 'Rising',   '100 pts',       '#0070f3'],
    ['🟣', 'Featured', '300 pts',       '#7928ca'],
    ['🟠', 'Top Tier', '750 pts',       '#f0883e'],
  ].map(([e, l, d, c]) => `
    <tr>
      <td style="padding:.5rem .75rem;font-size:1rem">${e}</td>
      <td style="padding:.5rem .75rem;font-weight:700;color:${c};font-size:.85rem">${l}</td>
      <td style="padding:.5rem .75rem;color:#888;font-size:.8rem">${d}</td>
    </tr>
  `).join('');

  const pointRows = [
    ['⚡ +5',  'Share your shop link',       'Every share earns 5 points. WhatsApp, Telegram, X, Instagram — anywhere.'],
    ['👆 +3',  'Get people to click',        'Every click on your shop earns 3 points. The more people visit, the faster you rise.'],
    ['😊 +2',  'Earn likes',                 'Visitors can like your ad directly in the Arena. Each like adds 2 points.'],
    ['⚡ +5',  'Get boosted',                'Visitors can boost your ad once per session — instant +5 points per boost.'],
    ['🔥 +1',  'Reactions — Hot, Watching, Interesting', 'Quick one-tap reactions from visitors each add 1 point to your score.'],
    ['📌 +50', 'Get pinned by admin',        'Top performing shops get pinned to the top of the Arena — 50 bonus points and maximum visibility.'],
  ].map(([pts, title, desc]) => `
    <div style="display:flex;gap:.85rem;align-items:flex-start;margin-bottom:1.1rem">
      <div style="background:#1a1a1a;border-radius:8px;padding:.4rem .65rem;font-size:.78rem;font-weight:800;color:#D4AF37;white-space:nowrap;min-width:52px;text-align:center">${pts}</div>
      <div>
        <div style="font-weight:700;font-size:.85rem;margin-bottom:.15rem">${title}</div>
        <div style="font-size:.78rem;color:#888;line-height:1.5">${desc}</div>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>${BASE_CSS}</style>
</head>
<body>
<div class="wrap">

  <!-- Header -->
  <div style="text-align:center;padding:1.5rem 0 1rem">
    <div style="font-size:2rem;margin-bottom:.4rem">🗺️</div>
    <div style="font-size:.7rem;color:#555;font-weight:700;letter-spacing:.12em;text-transform:uppercase">
      Country Champion · ${p.flag} ${p.country}
    </div>
  </div>

  <!-- Hero -->
  <div style="background:#111;border:1px solid #1a1a1a;border-radius:14px;padding:1.5rem;margin-bottom:1.25rem;text-align:center">
    <div style="font-size:1.4rem;font-weight:800;color:#fff;margin-bottom:.4rem">
      You're live, ${p.firstName}. ⚡
    </div>
    <div style="font-size:.88rem;color:#aaa;line-height:1.6">
      <strong style="color:#D4AF37">${p.shopName}</strong> is now representing<br/>
      <strong style="color:#D4AF37">${p.flag} ${p.country}</strong> in the Map of Pi Arena.<br/>
      Your 10 antbots are deployed. Now it's time to climb.
    </div>
    <a href="${p.arenaLink}" style="display:inline-block;margin-top:1.1rem;background:#D4AF37;color:#000;font-weight:800;font-size:.88rem;padding:.7rem 1.75rem;border-radius:10px;text-decoration:none">
      View Your Shop in the Arena →
    </a>
  </div>

  <!-- Tier ladder -->
  <div style="background:#111;border:1px solid #1a1a1a;border-radius:14px;padding:1.25rem;margin-bottom:1.25rem">
    <div class="label">The Tier Ladder — Where You're Headed</div>
    <table style="width:100%;border-collapse:collapse">
      ${tierRows}
    </table>
  </div>

  <!-- How to earn points -->
  <div style="background:#111;border:1px solid #1a1a1a;border-radius:14px;padding:1.25rem;margin-bottom:1.25rem">
    <div class="label">How to Earn Points</div>
    ${pointRows}
  </div>

  <!-- Share link -->
  <div style="background:#111;border:1px solid #D4AF3730;border-radius:14px;padding:1.25rem;margin-bottom:1.25rem;text-align:center">
    <div class="label">Your Shop Link — Share This</div>
    <div style="font-size:.82rem;color:#D4AF37;word-break:break-all;margin-bottom:.85rem;font-family:monospace">
      ${p.shareLink}
    </div>
    <a href="${p.shareLink}" style="display:inline-block;background:#D4AF37;color:#000;font-weight:800;font-size:.85rem;padding:.65rem 1.5rem;border-radius:8px;text-decoration:none">
      ↗ Share Your Shop Now
    </a>
  </div>

  <!-- Nav links -->
  <div style="display:flex;gap:.75rem;justify-content:center;flex-wrap:wrap;margin-bottom:1.5rem">
    <a href="${p.championsLink}" style="background:#D4AF3715;border:1px solid #D4AF3740;color:#D4AF37;border-radius:8px;padding:.5rem 1rem;font-size:.78rem;font-weight:700;text-decoration:none">
      🏆 Champions Board
    </a>
    <a href="${p.lbLink}" style="background:#0070f315;border:1px solid #0070f340;color:#0070f3;border-radius:8px;padding:.5rem 1rem;font-size:.78rem;font-weight:700;text-decoration:none">
      📊 Leaderboard
    </a>
    <a href="${p.dashLink}" style="background:#f0883e15;border:1px solid #f0883e40;color:#f0883e;border-radius:8px;padding:.5rem 1rem;font-size:.78rem;font-weight:700;text-decoration:none">
      ⚡ Dashboard
    </a>
  </div>

  <!-- Footer -->
  <div class="footer">
    ANTCPU ADS · Automated Marketing Network<br/>
    <a href="https://antcpu-ads.vercel.app">antcpu-ads.vercel.app</a> ·
    <a href="https://antcpu-ads.vercel.app/privacy">Privacy</a> ·
    <a href="https://antcpu-ads.vercel.app/tos">Terms</a>
  </div>

</div>
</body>
</html>`;
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

    // ─── Champion welcome ───────────────────────────────────────────────────
    if (type === 'champion') {
      if (!country) {
        return NextResponse.json({ error: 'champion requires country' }, { status: 400 });
      }

      const resolvedFlag = flag || COUNTRY_FLAGS[country] || '🌍';

      const html = championHtml({
        firstName,
        shopName:      shopName || brand,
        country,
        flag:          resolvedFlag,
        shareLink,
        arenaLink:     'https://antcpu-ads.vercel.app/mapofpi/icons/arena',
        championsLink: 'https://antcpu-ads.vercel.app/champions',
        lbLink:        'https://antcpu-ads.vercel.app/dashboard/leaderboard',
        dashLink:      'https://antcpu-ads.vercel.app/dashboard/user',
        isTeam,
        days,
      });

      const { error } = await resend.emails.send({
        from:    'ANTCPU ADS <noreply@antcpu.com>',
        to:      email,
        subject: `🗺️ ${firstName}, your shop is live — start earning points`,
        html,
      });
      if (error) throw error;

      notifyDiscord('', 'new_signup', {
        title:  '📧 Champion Welcome Sent',
        color:  DC.gold,
        fields: [
          { name: 'Name',     value: name || '—',              inline: true  },
          { name: 'Country',  value: `${resolvedFlag} ${country}`, inline: true  },
          { name: 'Shop',     value: shopName || brand || '—', inline: false },
          { name: 'Email',    value: email,                    inline: false },
          { name: 'Category', value: category || '—',          inline: true  },
          { name: 'Link',     value: shareLink,                inline: false },
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
