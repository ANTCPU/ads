import { NextRequest, NextResponse } from 'next/server';
import { notifyDiscord }             from '../../lib/discord';
import { heraldSend, heraldWrap, HERALD_VERSION } from '../../lib/herald';
import { t }                         from '../../lib/i18n/index';
import type { Locale }               from '../../lib/i18n/index';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dashboardUrl(role: string, email: string): string {
  if (role === 'super' || email === 'antcpu@gmail.com')
    return 'https://antcpu-ads.vercel.app/dashboard/admin';
  if (role === 'admin')
    return 'https://antcpu-ads.vercel.app/dashboard/users';
  return 'https://antcpu-ads.vercel.app/dashboard/user';
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      name, email, brand,
      trialStatus, role = 'user',
      preferred_locale = 'en',
    } = await req.json();

    const locale    = preferred_locale as Locale;
    const firstName = name?.split(' ')[0] || 'there';
    const isTeam    = trialStatus === 'team';
    const days      = isTeam ? 90 : 3;
    const myDash    = dashboardUrl(role, email);

    const steps = [
      {
        n:    '01',
        title: t(locale, 'welcome_step1_title'),
        desc:  t(locale, 'welcome_step1_desc'),
        href:  'https://antcpu-ads.vercel.app/create-ad',
      },
      {
        n:    '02',
        title: t(locale, 'welcome_step2_title'),
        desc:  t(locale, 'welcome_step2_desc'),
        href:  myDash,
      },
      {
        n:    '03',
        title: t(locale, 'welcome_step3_title'),
        desc:  t(locale, 'welcome_step3_desc'),
        href:  'https://antcpu-ads.vercel.app/arena',
      },
    ];

    const body = `
      <!-- Hero -->
      <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;
        padding:2rem;margin-bottom:1.5rem;text-align:center">
        <div style="font-size:1.4rem;font-weight:800;margin-bottom:0.5rem">
          ${t(locale, 'welcome_hero')} ${firstName}. ⚡
        </div>
        <div style="font-size:0.88rem;color:#aaa;margin-bottom:1.5rem">
          <strong style="color:#fff">${brand}</strong>
          ${t(locale, 'welcome_brand_live')}<br>
          ${t(locale, 'welcome_trial_line_1')}
          <strong style="color:#f0883e">${days} ${t(locale, 'welcome_days')}</strong>
          ${t(locale, 'welcome_trial_line_2')}
          ${isTeam ? t(locale, 'welcome_access_team') : t(locale, 'welcome_access_trial')}.
        </div>
        <a href="${myDash}"
          style="display:inline-block;background:#f0883e;color:#000;
          text-decoration:none;font-weight:800;font-size:1rem;
          padding:0.85rem 2rem;border-radius:10px">
          ${t(locale, 'arena_join_cta')} →
        </a>
      </div>

      <!-- Steps -->
      <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;
        padding:1.25rem;margin-bottom:1.5rem">
        <div style="font-size:0.7rem;color:#555;font-weight:700;
          letter-spacing:0.1em;text-transform:uppercase;margin-bottom:1rem">
          ${t(locale, 'welcome_steps_label')}
        </div>
        ${steps.map(s => `
          <div style="display:flex;gap:1rem;padding:0.75rem 0;
            border-bottom:1px solid #1a1a1a">
            <div style="font-size:0.7rem;font-weight:800;color:#f0883e;
              min-width:24px;padding-top:2px">${s.n}</div>
            <div style="flex:1">
              <div style="font-weight:700;font-size:0.88rem;
                margin-bottom:0.2rem">${s.title}</div>
              <div style="font-size:0.78rem;color:#555;
                line-height:1.5">${s.desc}</div>
            </div>
            <a href="${s.href}"
              style="font-size:0.75rem;color:#f0883e;text-decoration:none;
              font-weight:700;white-space:nowrap;padding-top:2px">
              ${t(locale, 'partner_visit_cta')} →
            </a>
          </div>
        `).join('')}
      </div>

      <!-- Featured partner -->
      <div style="background:#111;border:1px solid #D4AF3730;border-radius:12px;
        padding:1.25rem;margin-bottom:1.5rem">
        <div style="font-size:0.7rem;color:#555;font-weight:700;
          letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
          ⚡ ${t(locale, 'partner_section_label')}
        </div>
        <div style="display:flex;align-items:center;gap:0.75rem;
          margin-bottom:0.75rem">
          <span style="font-size:1.5rem">🗺️</span>
          <div>
            <div style="font-weight:800">Map of Pi</div>
            <div style="font-size:0.72rem;color:#D4AF37">
              ${t(locale, 'partner_section_label')}
            </div>
          </div>
        </div>
        <div style="font-size:0.82rem;color:#aaa;margin-bottom:0.75rem">
          ${t(locale, 'partner_affil')}
        </div>
        <div style="font-size:0.75rem;color:#555;margin-bottom:1rem">
          ✓ 2.1M+ ${t(locale, 'partner_users_label')}<br>
          ✓ 148,000 ${t(locale, 'partner_sellers_label')}<br>
          ✓ 173,000+ ${t(locale, 'partner_tx_label')}<br><br>
          #mapofpi #pinetwork #picommerce #antcpuads
        </div>
        <a href="https://mapofpi.com/"
          style="display:inline-block;background:#D4AF37;color:#000;
          text-decoration:none;font-weight:700;font-size:0.85rem;
          padding:0.6rem 1.25rem;border-radius:8px">
          ${t(locale, 'partner_visit_cta')} →
        </a>
      </div>

      <!-- Tip -->
      <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;
        padding:1.25rem;margin-bottom:1.5rem">
        <div style="font-size:0.7rem;color:#555;font-weight:700;
          letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem">
          💡 ${t(locale, 'weekly_tip_label')}
        </div>
        <div style="font-size:0.88rem;color:#aaa;line-height:1.6">
          ${t(locale, 'welcome_tip_body')}
        </div>
      </div>

      <!-- Status badge -->
      <div style="text-align:center;margin-bottom:1.5rem">
        <span style="background:${isTeam ? '#7928ca15' : '#0070f315'};
          color:${isTeam ? '#7928ca' : '#0070f3'};
          border:1px solid ${isTeam ? '#7928ca30' : '#0070f330'};
          border-radius:999px;padding:0.3rem 1rem;
          font-size:0.75rem;font-weight:700">
          ${isTeam
            ? `🔵 ${t(locale, 'weekly_status_team')}`
            : `🟢 ${t(locale, 'plan_trial_name')}`}
        </span>
      </div>
    `;

    const html = heraldWrap(locale, body, `The Arena · ${HERALD_VERSION}`);

    await heraldSend({
      to:      email,
      subject: `⚡ ${t(locale, 'welcome_subject')} ${firstName}`,
      html,
      locale,
    });

    await notifyDiscord(
      `📧 Welcome email sent to **${name}** (${email}) · ${brand} · ` +
      `${isTeam ? '🔵 Team' : '🟢 Trial'} · role: ${role} · locale: ${locale}`
    );

    return NextResponse.json({ sent: true });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
