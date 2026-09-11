// ============================================================
// app/api/send-module/route.ts
//
// Modular email dispatch — Map of Pi champion program
//
// Types:
//   champion  — Country champion welcome email
//               Fired by: /mapofpi/create-shop-ad on registration
//               Discord:  DISCORD_WEBHOOK_CHAMPIONS
//
// Add new types here as the platform grows.
// Each type is a self-contained block in the POST handler.
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { heraldSend }                from '../../lib/herald';
import { notifyDiscord, DC }         from '../../lib/discord';

// ─── Flag lookup — matches MAPOFPI_COUNTRIES in assets.ts ─────────────────────

const COUNTRY_FLAGS: Record<string, string> = {
  // ── Africa ──────────────────────────────────────────
  'Nigeria':        '🇳🇬', 'Ghana':         '🇬🇭', 'Kenya':         '🇰🇪',
  'South Africa':   '🇿🇦', 'Ethiopia':      '🇪🇹', 'Tanzania':      '🇹🇿',
  'Uganda':         '🇺🇬', 'Cameroon':      '🇨🇲', 'Senegal':       '🇸🇳',
  'Ivory Coast':    '🇨🇮', 'Zimbabwe':      '🇿🇼', 'Zambia':        '🇿🇲',
  'Rwanda':         '🇷🇼', 'Morocco':       '🇲🇦', 'Algeria':       '🇩🇿',
  'Tunisia':        '🇹🇳', 'Egypt':         '🇪🇬', 'Mozambique':    '🇲🇿',
  'DR Congo':       '🇨🇩', 'Togo':          '🇹🇬', 'Benin':         '🇧🇯',
  'Sierra Leone':   '🇸🇱', 'Liberia':       '🇱🇷',
  // ── Middle East ─────────────────────────────────────
  'Saudi Arabia':   '🇸🇦', 'UAE':           '🇦🇪', 'Israel':        '🇮🇱',
  // ── Asia ────────────────────────────────────────────
  'India':          '🇮🇳', 'Pakistan':      '🇵🇰', 'Bangladesh':    '🇧🇩',
  'Sri Lanka':      '🇱🇰', 'Nepal':         '🇳🇵', 'China':         '🇨🇳',
  'Japan':          '🇯🇵', 'South Korea':   '🇰🇷', 'Hong Kong':     '🇭🇰',
  'Taiwan':         '🇹🇼', 'Singapore':     '🇸🇬', 'Malaysia':      '🇲🇾',
  'Indonesia':      '🇮🇩', 'Philippines':   '🇵🇭', 'Vietnam':       '🇻🇳',
  'Thailand':       '🇹🇭', 'Myanmar':       '🇲🇲', 'Cambodia':      '🇰🇭',
  'Laos':           '🇱🇦',
  // ── Oceania ─────────────────────────────────────────
  'Australia':      '🇦🇺', 'New Zealand':   '🇳🇿',
  // ── Europe ──────────────────────────────────────────
  'United Kingdom': '🇬🇧', 'Germany':       '🇩🇪', 'France':        '🇫🇷',
  'Spain':          '🇪🇸', 'Italy':         '🇮🇹', 'Netherlands':   '🇳🇱',
  'Portugal':       '🇵🇹', 'Greece':        '🇬🇷', 'Sweden':        '🇸🇪',
  'Norway':         '🇳🇴', 'Denmark':       '🇩🇰', 'Finland':       '🇫🇮',
  'Switzerland':    '🇨🇭', 'Austria':       '🇦🇹', 'Belgium':       '🇧🇪',
  'Poland':         '🇵🇱', 'Czech Republic':'🇨🇿', 'Hungary':       '🇭🇺',
  'Romania':        '🇷🇴', 'Bulgaria':      '🇧🇬', 'Serbia':        '🇷🇸',
  'Croatia':        '🇭🇷', 'Slovakia':      '🇸🇰', 'Turkey':        '🇹🇷',
  // ── Americas ────────────────────────────────────────
  'United States':  '🇺🇸', 'Canada':        '🇨🇦', 'Mexico':        '🇲🇽',
  'Brazil':         '🇧🇷', 'Argentina':     '🇦🇷', 'Colombia':      '🇨🇴',
  'Venezuela':      '🇻🇪', 'Peru':          '🇵🇪', 'Chile':         '🇨🇱',
  'Ecuador':        '🇪🇨', 'Bolivia':       '🇧🇴', 'Honduras':      '🇭🇳',
  'Guatemala':      '🇬🇹', 'El Salvador':   '🇸🇻',
};

// ─── Champion email ────────────────────────────────────────────────────────────

function championHtml(p: {
  firstName:     string;
  shopName:      string;
  country:       string;
  flag:          string;
  shareLink:     string;
  arenaLink:     string;
  championsLink: string;
  lbLink:        string;
  dashLink:      string;
}): string {

  const tierRows = [
    ['🟢', 'Entry',    'You are here — your shop is live', '#22c55e'],
    ['🔵', 'Rising',   '50 pts — more impressions',        '#0070f3'],
    ['🟣', 'Featured', '150 pts — top of feed',            '#7928ca'],
    ['🟠', 'Top Tier', '300 pts — pinned + maximum reach', '#f0883e'],
  ].map(([e, l, d, c]) => `
    <tr>
      <td style="padding:.5rem .75rem;font-size:1rem">${e}</td>
      <td style="padding:.5rem .75rem;font-weight:700;color:${c};
        font-size:.85rem">${l}</td>
      <td style="padding:.5rem .75rem;color:#888;font-size:.8rem">${d}</td>
    </tr>
  `).join('');

  const pointRows = [
    ['⚡ +5',  'Share your shop link',
      'Every share earns 5 points. WhatsApp, Telegram, X, Instagram — anywhere.'],
    ['👆 +3',  'Get people to click',
      'Every click on your shop earns 3 points. The more people visit, the faster you rise.'],
    ['😊 +2',  'Earn likes',
      'Visitors can like your ad directly in the Arena. Each like adds 2 points.'],
    ['⚡ +5',  'Get boosted',
      'Visitors can boost your ad once per session — instant +5 points per boost.'],
    ['🔥 +1',  'Reactions',
      'Hot, Watching, Interesting — quick one-tap reactions each add 1 point.'],
    ['📌 +50', 'Get pinned by admin',
      'Top performing shops get pinned to the top of the Arena — 50 bonus points.'],
  ].map(([pts, title, desc]) => `
    <div style="display:flex;gap:.85rem;align-items:flex-start;
      margin-bottom:1.1rem">
      <div style="background:#1a1a1a;border-radius:8px;padding:.4rem .65rem;
        font-size:.78rem;font-weight:800;color:#D4AF37;white-space:nowrap;
        min-width:52px;text-align:center">${pts}</div>
      <div>
        <div style="font-weight:700;font-size:.85rem;
          margin-bottom:.15rem">${title}</div>
        <div style="font-size:.78rem;color:#888;line-height:1.5">${desc}</div>
      </div>
    </div>
  `).join('');

  const rewardSteps = [
    ['⚡', 'Share your shop link',
      'Every share earns points. Start with WhatsApp, Telegram, or X.'],
    ['🏆', 'Reach 50 points',
      'Rising tier unlocks — more impressions, higher placement, more clicks.'],
    ['🎁', 'Stay active for 90 days',
      'Active champions earn free Arena membership. No card. No expiry. Yours.'],
  ].map(([icon, title, desc], i) => `
    <div style="display:flex;gap:.85rem;align-items:flex-start;
      padding:.75rem 0;border-bottom:1px solid #1a1a1a">
      <div style="font-size:1.1rem;min-width:28px;padding-top:2px">${icon}</div>
      <div style="flex:1">
        <div style="font-size:.7rem;font-weight:800;color:#D4AF37;
          letter-spacing:.08em;margin-bottom:.2rem">STEP ${i + 1}</div>
        <div style="font-weight:700;font-size:.88rem;
          margin-bottom:.2rem">${title}</div>
        <div style="font-size:.78rem;color:#888;line-height:1.5">${desc}</div>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;
  font-family:system-ui,sans-serif;color:#fff">
<div style="max-width:560px;margin:0 auto;padding:2rem 1.25rem">

  <!-- Header -->
  <div style="text-align:center;padding:1.5rem 0 1rem">
    <div style="font-size:2rem;margin-bottom:.4rem">🗺️</div>
    <div style="font-size:1.5rem;font-weight:800;color:#D4AF37;
      margin-bottom:.25rem">ANTCPU ADS</div>
    <div style="font-size:.7rem;color:#555;font-weight:700;
      letter-spacing:.12em;text-transform:uppercase">
      Country Champion · ${p.flag} ${p.country}
    </div>
  </div>

  <!-- Hero -->
  <div style="background:#111;border:1px solid #1a1a1a;border-radius:14px;
    padding:1.5rem;margin-bottom:1.25rem;text-align:center">
    <div style="font-size:1.4rem;font-weight:800;color:#fff;
      margin-bottom:.4rem">
      You're live, ${p.firstName}. ⚡
    </div>
    <div style="font-size:.88rem;color:#aaa;line-height:1.6;
      margin-bottom:1rem">
      <strong style="color:#D4AF37">${p.shopName}</strong>
      is now representing<br/>
      <strong style="color:#D4AF37">${p.flag} ${p.country}</strong>
      in the Map of Pi Arena.<br/>
      Your 10 antbots are deployed. Now it's time to climb.
    </div>
    <div style="background:#D4AF3715;border:1px solid #D4AF3730;
      border-radius:8px;padding:.6rem 1rem;font-size:.82rem;
      color:#D4AF37;margin-bottom:1.1rem">
      🎁 90 days free · No credit card · Cancel anytime
    </div>
    <a href="${p.arenaLink}"
      style="display:inline-block;background:#D4AF37;color:#000;
      font-weight:800;font-size:.88rem;padding:.7rem 1.75rem;
      border-radius:10px;text-decoration:none">
      View Your Shop in the Arena →
    </a>
  </div>

  <!-- Free membership reward path -->
  <div style="background:#111;border:1px solid #D4AF3730;border-radius:14px;
    padding:1.25rem;margin-bottom:1.25rem">
    <div style="font-size:.65rem;color:#D4AF37;font-weight:700;
      letter-spacing:.12em;text-transform:uppercase;margin-bottom:.75rem">
      🎯 Earn Your Free Membership
    </div>
    <div style="font-size:.82rem;color:#aaa;margin-bottom:1rem">
      Stay active during your 90 days and earn a free Arena membership —
      no card, no expiry. Here's how:
    </div>
    ${rewardSteps}
  </div>

  <!-- Tier ladder -->
  <div style="background:#111;border:1px solid #1a1a1a;border-radius:14px;
    padding:1.25rem;margin-bottom:1.25rem">
    <div style="font-size:.65rem;color:#555;font-weight:700;
      letter-spacing:.12em;text-transform:uppercase;margin-bottom:.75rem">
      The Tier Ladder — Where You're Headed
    </div>
    <table style="width:100%;border-collapse:collapse">
      ${tierRows}
    </table>
  </div>

  <!-- How to earn points -->
  <div style="background:#111;border:1px solid #1a1a1a;border-radius:14px;
    padding:1.25rem;margin-bottom:1.25rem">
    <div style="font-size:.65rem;color:#555;font-weight:700;
      letter-spacing:.12em;text-transform:uppercase;margin-bottom:.75rem">
      How to Earn Points
    </div>
    ${pointRows}
  </div>

  <!-- Share link -->
  <div style="background:#111;border:1px solid #D4AF3730;border-radius:14px;
    padding:1.25rem;margin-bottom:1.25rem;text-align:center">
    <div style="font-size:.65rem;color:#555;font-weight:700;
      letter-spacing:.12em;text-transform:uppercase;margin-bottom:.75rem">
      Your Shop Link — Share This
    </div>
    <div style="font-size:.82rem;color:#D4AF37;word-break:break-all;
      margin-bottom:.85rem;font-family:monospace">
      ${p.shareLink}
    </div>
    <a href="${p.shareLink}"
      style="display:inline-block;background:#D4AF37;color:#000;
      font-weight:800;font-size:.85rem;padding:.65rem 1.5rem;
      border-radius:8px;text-decoration:none">
      ↗ Share Your Shop Now
    </a>
  </div>

  <!-- Nav links -->
  <div style="display:flex;gap:.75rem;justify-content:center;
    flex-wrap:wrap;margin-bottom:1.5rem">
    <a href="${p.championsLink}"
      style="background:#D4AF3715;border:1px solid #D4AF3740;
      color:#D4AF37;border-radius:8px;padding:.5rem 1rem;
      font-size:.78rem;font-weight:700;text-decoration:none">
      🏆 Champions Board
    </a>
    <a href="${p.lbLink}"
      style="background:#0070f315;border:1px solid #0070f340;
      color:#0070f3;border-radius:8px;padding:.5rem 1rem;
      font-size:.78rem;font-weight:700;text-decoration:none">
      📊 Leaderboard
    </a>
    <a href="${p.dashLink}"
      style="background:#f0883e15;border:1px solid #f0883e40;
      color:#f0883e;border-radius:8px;padding:.5rem 1rem;
      font-size:.78rem;font-weight:700;text-decoration:none">
      ⚡ Dashboard
    </a>
  </div>

  <!-- Footer -->
  <div style="border-top:1px solid #1a1a1a;padding-top:1.25rem;
    margin-top:2rem;font-size:.72rem;color:#555;text-align:center;
    line-height:1.8">
    ANTCPU ADS · Automated Marketing Network<br/>
    <a href="https://antcpu-ads.vercel.app"
      style="color:#555">antcpu-ads.vercel.app</a> ·
    <a href="https://antcpu-ads.vercel.app/privacy"
      style="color:#555">Privacy</a> ·
    <a href="https://antcpu-ads.vercel.app/tos"
      style="color:#555">Terms</a>
  </div>

</div>
</body>
</html>`;
}

// ─── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      type,
      name, email, brand,
      shopName, country, flag, adId, category,
    } = await req.json();

    if (!email || !type) {
      return NextResponse.json(
        { error: 'email and type required' },
        { status: 400 }
      );
    }

    const firstName = name?.split(' ')[0] || 'there';
    const shareLink = adId
      ? `https://antcpu-ads.vercel.app/s/${String(adId).slice(0, 8)}`
      : 'https://antcpu-ads.vercel.app/mapofpi/icons/arena';

    // ─── Champion welcome ──────────────────────────────────────────────────
    if (type === 'champion') {
      if (!country) {
        return NextResponse.json(
          { error: 'champion requires country' },
          { status: 400 }
        );
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
      });

      await heraldSend({
        to:      email,
        subject: `🗺️ ${firstName}, your shop is live — start earning points`,
        html,
      });

      notifyDiscord('', 'new_champion', {
        title:  '🗺️ Champion Welcome Sent',
        color:  DC.gold,
        fields: [
          { name: 'Name',     value: name || '—',                    inline: true  },
          { name: 'Country',  value: `${resolvedFlag} ${country}`,   inline: true  },
          { name: 'Shop',     value: shopName || brand || '—',       inline: false },
          { name: 'Email',    value: email,                          inline: false },
          { name: 'Category', value: category || '—',                inline: true  },
          { name: 'Link',     value: shareLink,                      inline: false },
        ],
        footer:    'ANTCPU ADS · Champion Welcome',
        timestamp: true,
      });

      return NextResponse.json({ sent: true, type: 'champion' });
    }

    return NextResponse.json(
      { error: `unknown type: ${type}` },
      { status: 400 }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
