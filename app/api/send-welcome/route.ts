// app/api/send-welcome/route.ts
// ─── Welcome email — gated by emailGate ──────────────────────────────────────
// Gate checks: account age (7d) · daily transactional budget (30/day) ·
//              monthly cap (3,000) · welcome_email_sent_at idempotency
//
// If gate blocks → in-app notification fires + skip log + Discord gated ping
// If gate passes → heraldSend fires + recordEmailSent + logEmailSend + Discord
//
// v4 (Sep 2026):
//   — logEmailSend added — send log now populates for Scout monthly report
//   — logSkippedSend added — gate blocks are recorded with reason
//
// v3 (Sep 2026):
//   — source param added — TV signups get TV-branded hero + CTA
//   — source written to Discord success embed for pipeline tracking
//
// v2 (Sep 2026):
//   — dashboardUrl: /dashboard/admin → /dashboard/antcpu
//   — Discord gated ping: plain text → rich embed, new_signup event
//   — Discord success ping: plain text → rich embed, new_signup event
//   — DC imported for embed colors
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse }              from 'next/server';
import { createClient }                           from '@supabase/supabase-js';
import { notifyDiscord, DC }                      from '../../lib/discord';
import { heraldSend, heraldWrap, HERALD_VERSION } from '../../lib/herald';
import { t }                                      from '../../lib/i18n/index';
import type { Locale }                            from '../../lib/i18n/index';
import { checkEmailGate, recordEmailSent,
         gatedNotify, logEmailSend,
         logSkippedSend }                         from '../../lib/emailGate';

// ─── Service role client ──────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = 'https://antcpu-ads.vercel.app';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dashboardUrl(role: string, email: string): string {
  if (role === 'super')
    return `${BASE_URL}/dashboard/antcpu`;
  if (role === 'admin')
    return `${BASE_URL}/dashboard/users`;
  return `${BASE_URL}/dashboard/user`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      name, email, brand,
      trialStatus, role = 'user',
      preferred_locale = 'en',
      source = 'organic',
    } = await req.json();

    const locale    = preferred_locale as Locale;
    const firstName = name?.split(' ')[0] || 'there';
    const isTeam    = trialStatus === 'team';
    const days      = isTeam ? 90 : 3;
    const myDash    = dashboardUrl(role, email);
    const isTV      = source === 'tv-pro';

    const subject = isTV
      ? `📡 You're ready to go live, ${firstName}`
      : `⚡ ${t(locale, 'welcome_subject')} ${firstName}`;

    // ── Email gate ────────────────────────────────────────────────────────────

    const gate = await checkEmailGate(
      supabase, email, 'transactional', 'welcome_email_sent_at'
    );

    if (!gate.allow) {
      await gatedNotify(
        supabase, email,
        `⚡ ${t(locale, 'welcome_hero')} ${firstName}`,
        `${brand} ${t(locale, 'welcome_brand_live')} ${t(locale, 'welcome_step1_desc')}`,
        'nudge'
      );

      // Skip log — records why this send was blocked for Scout report
      void logSkippedSend(supabase, email, 'welcome', gate.reason, {
        segment: source || 'organic',
        locale,
      }).catch(() => {});

      await supabase
        .from('ad_signups')
        .update({ welcome_email_sent_at: new Date().toISOString() })
        .eq('email', email);

      await notifyDiscord('', 'new_signup', {
        title:  '📭 Welcome Gated',
        color:  DC.grey,
        fields: [
          { name: 'Email',  value: email,       inline: true },
          { name: 'Reason', value: gate.reason, inline: true },
          { name: 'Locale', value: locale,      inline: true },
          { name: 'Source', value: source,      inline: true },
        ],
        footer:    'ANTCPU ADS · Email Gate',
        timestamp: true,
      });

      return NextResponse.json({ sent: false, reason: gate.reason });
    }

    // ── Gate passed — build + send email ─────────────────────────────────────
    // TV signups get a TV-branded hero block and Go Live CTA.
    // Arena signups get the standard 3-step onboarding flow.
    // Everything else (partner, tip, badge) is identical.

    const steps = [
      {
        n:     '01',
        title: t(locale, 'welcome_step1_title'),
        desc:  t(locale, 'welcome_step1_desc'),
        href:  `${BASE_URL}/create-ad`,
      },
      {
        n:     '02',
        title: t(locale, 'welcome_step2_title'),
        desc:  t(locale, 'welcome_step2_desc'),
        href:  myDash,
      },
      {
        n:     '03',
        title: t(locale, 'welcome_step3_title'),
        desc:  t(locale, 'welcome_step3_desc'),
        href:  `${BASE_URL}/arena`,
      },
    ];

    // ── Hero block — source-aware ─────────────────────────────────────────────

    const heroBlock = isTV ? `
      <!-- Hero — TV -->
      <div style="background:#111;border:1px solid #f0883e30;border-radius:16px;
        padding:2rem;margin-bottom:1.5rem;text-align:center;
        position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;
          background:linear-gradient(90deg,#f0883e,#7928ca,transparent)"></div>
        <div style="font-size:0.65rem;color:#f0883e;font-weight:700;
          letter-spacing:0.12em;text-transform:uppercase;margin-bottom:0.5rem">
          📡 ANTCPU TV
        </div>
        <div style="font-size:1.4rem;font-weight:800;margin-bottom:0.5rem">
          You're ready to go live, ${firstName}. 📡
        </div>
        <div style="font-size:0.88rem;color:#aaa;margin-bottom:1.5rem">
          <strong style="color:#fff">${brand}</strong> is set up.<br>
          Start your first stream — no installs, no plugins, no waiting.
        </div>
        <a href="https://antcpu.com/tv"
          style="display:inline-block;background:#f0883e;color:#000;
          text-decoration:none;font-weight:800;font-size:1rem;
          padding:0.85rem 2rem;border-radius:10px">
          📡 Go Live Now →
        </a>
        <div style="margin-top:0.75rem">
          <a href="${myDash}"
            style="font-size:0.78rem;color:#555;text-decoration:none">
            Or visit your dashboard →
          </a>
        </div>
      </div>
    ` : `
      <!-- Hero — Arena -->
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
    `;

    const body = `
      ${heroBlock}

      <!-- Steps -->
      ${isTV ? `
        <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;
          padding:1.25rem;margin-bottom:1.5rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:1rem">
            📡 Your First Stream
          </div>
          ${[
            { n: '01', title: 'Open your studio',     desc: 'Go to antcpu.com/tv and click Start Broadcasting.', href: 'https://antcpu.com/tv' },
            { n: '02', title: 'Share your room link', desc: 'Send it to your audience — they join instantly.',    href: 'https://antcpu.com/tv' },
            { n: '03', title: 'Grow in the Arena',    desc: 'Your brand is live in the ad network too.',          href: `${BASE_URL}/arena`     },
          ].map(s => `
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
                Go →
              </a>
            </div>
          `).join('')}
        </div>
      ` : `
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
      `}

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

    const html = heraldWrap(locale, body, `The Arena · ${HERALD_VERSION}`, email);

    await heraldSend({ to: email, subject, html, locale });

    await recordEmailSent(supabase, email);

    // ── Send log — powers Scout monthly report ────────────────────────────────
    void logEmailSend(supabase, email, 'welcome', {
      segment: source || 'organic',
      subject,
      locale,
      status:  'sent',
    }).catch(() => {});

    await notifyDiscord('', 'new_signup', {
      title:  '📧 Welcome Sent',
      color:  DC.green,
      fields: [
        { name: 'Name',   value: name,                             inline: true  },
        { name: 'Brand',  value: brand,                            inline: true  },
        { name: 'Status', value: isTeam ? '🔵 Team' : '🟢 Trial', inline: true  },
        { name: 'Email',  value: email,                            inline: false },
        { name: 'Locale', value: locale,                           inline: true  },
        { name: 'Source', value: source,                           inline: true  },
      ],
      footer:    'ANTCPU ADS · Herald',
      timestamp: true,
    });

    return NextResponse.json({ sent: true });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dashboardUrl(role: string, email: string): string {
  if (role === 'super' || email === 'antcpu@gmail.com')
    return `${BASE_URL}/dashboard/antcpu`;
  if (role === 'admin')
    return `${BASE_URL}/dashboard/users`;
  return `${BASE_URL}/dashboard/user`;
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      name, email, brand,
      trialStatus, role = 'user',
      preferred_locale = 'en',
      source = 'organic',            // ← new — 'tv-pro' | 'tv-viewer' | 'pricing' | 'organic'
    } = await req.json();

    const locale    = preferred_locale as Locale;
    const firstName = name?.split(' ')[0] || 'there';
    const isTeam    = trialStatus === 'team';
    const days      = isTeam ? 90 : 3;
    const myDash    = dashboardUrl(role, email);
    const isTV      = source === 'tv-pro';   // ← TV-aware flag

    // ── Email gate ────────────────────────────────────────────────────────────

    const gate = await checkEmailGate(
      supabase, email, 'transactional', 'welcome_email_sent_at'
    );

    if (!gate.allow) {
      await gatedNotify(
        supabase, email,
        `⚡ ${t(locale, 'welcome_hero')} ${firstName}`,
        `${brand} ${t(locale, 'welcome_brand_live')} ${t(locale, 'welcome_step1_desc')}`,
        'nudge'
      );

      await supabase
        .from('ad_signups')
        .update({ welcome_email_sent_at: new Date().toISOString() })
        .eq('email', email);

      await notifyDiscord('', 'new_signup', {
        title:  '📭 Welcome Gated',
        color:  DC.grey,
        fields: [
          { name: 'Email',  value: email,       inline: true },
          { name: 'Reason', value: gate.reason, inline: true },
          { name: 'Locale', value: locale,      inline: true },
          { name: 'Source', value: source,      inline: true },
        ],
        footer:    'ANTCPU ADS · Email Gate',
        timestamp: true,
      });

      return NextResponse.json({ sent: false, reason: gate.reason });
    }

    // ── Gate passed — build + send email ─────────────────────────────────────
    // TV signups get a TV-branded hero block and Go Live CTA.
    // Arena signups get the standard 3-step onboarding flow.
    // Everything else (steps, partner, tip, badge) is identical.

    const steps = [
      {
        n:     '01',
        title: t(locale, 'welcome_step1_title'),
        desc:  t(locale, 'welcome_step1_desc'),
        href:  `${BASE_URL}/create-ad`,
      },
      {
        n:     '02',
        title: t(locale, 'welcome_step2_title'),
        desc:  t(locale, 'welcome_step2_desc'),
        href:  myDash,
      },
      {
        n:     '03',
        title: t(locale, 'welcome_step3_title'),
        desc:  t(locale, 'welcome_step3_desc'),
        href:  `${BASE_URL}/arena`,
      },
    ];

    // ── Hero block — source-aware ─────────────────────────────────────────────

    const heroBlock = isTV ? `
      <!-- Hero — TV -->
      <div style="background:#111;border:1px solid #f0883e30;border-radius:16px;
        padding:2rem;margin-bottom:1.5rem;text-align:center;
        position:relative;overflow:hidden">
        <div style="position:absolute;top:0;left:0;right:0;height:3px;
          background:linear-gradient(90deg,#f0883e,#7928ca,transparent)"></div>
        <div style="font-size:0.65rem;color:#f0883e;font-weight:700;
          letter-spacing:0.12em;text-transform:uppercase;margin-bottom:0.5rem">
          📡 ANTCPU TV
        </div>
        <div style="font-size:1.4rem;font-weight:800;margin-bottom:0.5rem">
          You're ready to go live, ${firstName}. 📡
        </div>
        <div style="font-size:0.88rem;color:#aaa;margin-bottom:1.5rem">
          <strong style="color:#fff">${brand}</strong> is set up.<br>
          Start your first stream — no installs, no plugins, no waiting.
        </div>
        <a href="https://antcpu.com/tv"
          style="display:inline-block;background:#f0883e;color:#000;
          text-decoration:none;font-weight:800;font-size:1rem;
          padding:0.85rem 2rem;border-radius:10px">
          📡 Go Live Now →
        </a>
        <div style="margin-top:0.75rem">
          <a href="${myDash}"
            style="font-size:0.78rem;color:#555;text-decoration:none">
            Or visit your dashboard →
          </a>
        </div>
      </div>
    ` : `
      <!-- Hero — Arena -->
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
    `;

    const body = `
      ${heroBlock}

      <!-- Steps — arena only, TV gets stream-focused steps -->
      ${isTV ? `
        <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;
          padding:1.25rem;margin-bottom:1.5rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:1rem">
            📡 Your First Stream
          </div>
          ${[
            { n: '01', title: 'Open your studio',       desc: 'Go to antcpu.com/tv and click Start Broadcasting.',  href: 'https://antcpu.com/tv' },
            { n: '02', title: 'Share your room link',   desc: 'Send it to your audience — they join instantly.',     href: 'https://antcpu.com/tv' },
            { n: '03', title: 'Grow in the Arena',      desc: 'Your brand is live in the ad network too.',           href: `${BASE_URL}/arena` },
          ].map(s => `
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
                Go →
              </a>
            </div>
          `).join('')}
        </div>
      ` : `
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
      `}

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

    const html = heraldWrap(locale, body, `The Arena · ${HERALD_VERSION}`, email);

    await heraldSend({
      to:      email,
      subject: isTV
        ? `📡 You're ready to go live, ${firstName}`
        : `⚡ ${t(locale, 'welcome_subject')} ${firstName}`,
      html,
      locale,
    });

    await recordEmailSent(supabase, email);

    await notifyDiscord('', 'new_signup', {
      title:  '📧 Welcome Sent',
      color:  DC.green,
      fields: [
        { name: 'Name',   value: name,                             inline: true  },
        { name: 'Brand',  value: brand,                            inline: true  },
        { name: 'Status', value: isTeam ? '🔵 Team' : '🟢 Trial', inline: true  },
        { name: 'Email',  value: email,                            inline: false },
        { name: 'Locale', value: locale,                           inline: true  },
        { name: 'Source', value: source,                           inline: true  },
      ],
      footer:    'ANTCPU ADS · Herald',
      timestamp: true,
    });

    return NextResponse.json({ sent: true });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
