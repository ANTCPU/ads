import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { notifyDiscord, DC } from '../../lib/discord';

const resend = new Resend(process.env.RESEND_API_KEY);

// ─── Shared CSS ───────────────────────────────────────────────────────────────

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

// ─── Template: Champion Welcome ───────────────────────────────────────────────

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
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  ${BASE_CSS}
  .badge{display:inline-block;background:#D4AF3720;border:1px solid #D4AF3740;color:#D4AF37;border-radius:999px;padding:.25rem .75rem;font-size:.72rem;font-weight:700;letter-spacing:.08em;margin-bottom:1.25rem}
  h1{font-size:1.5rem;font-weight:800;margin:0 0 .5rem;line-height:1.2}
  .sub{color:#aaa;font-size:.9rem;margin-bottom:2rem;line-height:1.5}
  .cta-gold{display:block;background:#D4AF37;color:#000;text-decoration:none;font-weight:800;font-size:1rem;border-radius:12px;padding:1rem;text-align:center;margin-bottom:2rem}
  .tier-row{display:flex;gap:.5rem;margin-bottom:2rem;flex-wrap:wrap}
  .tier{flex:1;min-width:90px;background:#111;border:1px solid #1a1a1a;border-radius:10px;padding:.85rem .75rem;text-align:center}
  .tier.now{border-color:#D4AF3760;background:#D4AF3710}
  .tier-icon{font-size:1.2rem;margin-bottom:.25rem}
  .tier-name{font-size:.72rem;font-weight:700;color:#fff}
  .tier-pts{font-size:.65rem;color:#555;margin-top:.15rem}
  .tier.now .tier-pts{color:#D4AF37}
  .step-num{background:#D4AF3720;border:1px solid #D4AF3740;color:#D4AF37;border-radius:8px;padding:.35rem .6rem;font-size:.72rem;font-weight:800;flex-shrink:0}
  .share-box{background:#111;border:1px solid #1a1a1a;border-radius:12px;padding:1.25rem;margin-bottom:2rem}
  .share-url{font-size:.75rem;color:#555;word-break:break-all;margin-bottom:.75rem;font-family:monospace}
  .share-btn{display:block;background:#0070f3;color:#fff;text-decoration:none;font-weight:700;font-size:.85rem;border-radius:8px;padding:.7rem;text-align:center}
  .btn-gold{display:block;background:transparent;border:1px solid #D4AF3740;color:#D4AF37;text-decoration:none;font-weight:700;font-size:.85rem;border-radius:12px;padding:.85rem;text-align:center;margin-bottom:1rem}
  .btn-grey{display:block;background:transparent;border:1px solid #1a1a1a;color:#555;text-decoration:none;font-size:.82rem;border-radius:12px;padding:.75rem;text-align:center;margin-bottom:2rem}
</style></head><body><div class="wrap">

  <div class="badge">🗺️ Country Champion · ${p.flag} ${p.country}</div>
  <h1>You're live, ${p.firstName}. ⚡</h1>
  <p class="sub">
    <strong style="color:#fff">${p.shopName}</strong> is now representing
    <strong style="color:#D4AF37">${p.flag} ${p.country}</strong> in the Map of Pi Arena.
    Your 10 antbots are deployed. Now it's time to climb.
  </p>

  <a href="${p.arenaLink}" class="cta-gold">View Your Shop in the Arena →</a>

  <div class="label">The Tier Ladder — Where You're Headed</div>
  <div class="tier-row">
    <div class="tier now">
      <div class="tier-icon">🟢</div>
      <div class="tier-name">Entry</div>
      <div class="tier-pts">You are here</div>
    </div>
    <div class="tier">
      <div class="tier-icon">🔵</div>
      <div class="tier-name">Rising</div>
      <div class="tier-pts">100 pts</div>
    </div>
    <div class="tier">
      <div class="tier-icon">🟣</div>
      <div class="tier-name">Featured</div>
      <div class="tier-pts">300 pts</div>
    </div>
    <div class="tier">
      <div class="tier-icon">🟠</div>
      <div class="tier-name">Top Tier</div>
      <div class="tier-pts">750 pts</div>
    </div>
  </div>

  <div class="label">How to Earn Points</div>
  <div class="step">
    <div class="step-num">+5</div>
    <div class="step-body">
      <div class="title">Share your shop link</div>
      <div class="desc">Every share earns 5 points. WhatsApp, Telegram, X, Instagram — anywhere. Use the link below.</div>
    </div>
  </div>
  <div class="step">
    <div class="step-num">+3</div>
    <div class="step-body">
      <div class="title">Get people to click</div>
      <div class="desc">Every click on your shop earns 3 points. The more people visit, the faster you rise.</div>
    </div>
  </div>
  <div class="step">
    <div class="step-num">+50</div>
    <div class="step-body">
      <div class="title">Get pinned by admin</div>
      <div class="desc">Top performing shops get pinned to the top of the Arena — 50 bonus points and maximum visibility.</div>
    </div>
  </div>

  <div class="share-box">
    <div class="label">Your Shop Link — Share This</div>
    <div class="share-url">${p.shareLink}</div>
    <a href="${p.shareLink}" class="share-btn">↗ Share Your Shop Now</a>
  </div>

  <a href="${p.lbLink}"   class="btn-gold">🏆 View the Leaderboard →</a>
  <a href="${p.dashLink}" class="btn-grey">⚡ Your Dashboard →</a>

  <div class="footer">
    ⚡ ANTCPU ADS · <a href="mailto:ads@antcpu.io">ads@antcpu.io</a><br>
    <a href="https://antcpu-ads.vercel.app">antcpu-ads.vercel.app</a> ·
    <a href="https://discord.gg/antcpu">Join our Discord</a><br><br>
    ${p.isTeam ? '🔵 Team Member — 90 days free' : `🟢 Free Trial — ${p.days} days active`}
  </div>

</div></body></html>`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      type,                          // 'champion' | 'standard'
      name, email, brand, trialStatus, role = 'user',
      // champion-only
      shopName, country, flag, adId, category,
    } = await req.json();

    if (!email || !type) {
      return NextResponse.json({ error: 'email and type required' }, { status: 400 });
    }

    const firstName = name?.split(' ')[0] || 'there';
    const isTeam    = trialStatus === 'team';
    const days      = isTeam ? 90 : 3;
    const shareLink = adId
      ? `https://antcpu-ads.vercel.app/s/${String(adId).slice(0, 8)}`
      : 'https://antcpu-ads.vercel.app/arena';

    // ─── Champion welcome ─────────────────────────────────────────────────────
    if (type === 'champion') {
      if (!adId || !country || !flag) {
        return NextResponse.json({ error: 'champion requires adId, country, flag' }, { status: 400 });
      }

      const html = championHtml({
        firstName,
        shopName: shopName || brand,
        country,
        flag,
        shareLink,
        arenaLink:  'https://antcpu-ads.vercel.app/mapofpi/icons/arena',
        lbLink:     'https://antcpu-ads.vercel.app/dashboard/leaderboard',
        dashLink:   'https://antcpu-ads.vercel.app/dashboard/user',
        isTeam,
        days,
      });

      const { error } = await resend.emails.send({
        from:    'ANTCPU ADS <ads@antcpu.io>',
        to:      email,
        subject: `🗺️ ${firstName}, your shop is live — start earning points`,
        html,
      });
      if (error) throw error;

      notifyDiscord('', 'new_signup', {
        title:  '📧 Champion Welcome Sent',
        color:  DC.gold,
        fields: [
          { name: 'Name',     value: name,                 inline: true  },
          { name: 'Country',  value: `${flag} ${country}`, inline: true  },
          { name: 'Shop',     value: shopName || brand,    inline: false },
          { name: 'Email',    value: email,                inline: false },
          { name: 'Category', value: category || '—',      inline: true  },
          { name: 'Link',     value: shareLink,            inline: false },
        ],
        footer:    'ANTCPU ADS · Email Module',
        timestamp: true,
      });

      return NextResponse.json({ sent: true, type: 'champion' });
    }

    // ─── Standard (future types go here) ─────────────────────────────────────
    return NextResponse.json({ error: `unknown type: ${type}` }, { status: 400 });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
