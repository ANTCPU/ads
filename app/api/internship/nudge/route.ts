// ============================================================
// app/api/internship/nudge/route.ts
// POST — Send a nudge email to a specific challenger
//
// Called by: cron/nudge (server-to-server) + admin dashboard
//            (browser trigger from antcpu.io/admin/)
//
// Nudge types:
//   hard_d1       — stuck at 5%, hasn't returned
//   hard_d2       — stuck at 10%, hasn't touched codebase/arena
//   soft          — 15-24%, stalled before Week 1 complete
//   light         — active but not done (gentle pointer)
//   week2_unlock  — Week 1 done, Week 2 just opened
//   week3_unlock  — Week 2 closing, team forms Day 14
//   captain_alert — elevated to Node Captain, doesn't know yet
//
// Gate: checkEmailValidity only (bounce/unsub check)
//       + nudge_sent_at idempotency on challengers table
//       No MIN_ACCOUNT_AGE_DAYS — challengers need nudges Day 2
//
// Email: antcpu.io branded (#2563eb), not ADS branded (#f0883e)
//        Track-aware copy — marketing gets Arena CTA,
//        dev gets GitHub/codebase CTA
//
// CORS: antcpu* wildcard regex + Vercel deployment
//       getCORS() reflects origin back when allowed,
//       falls back to antcpu-ads.vercel.app otherwise
//
// v1.1 (Oct 2026):
//   — getCORS() replaces static CORS constant
//   — CORS constant alias added for non-req contexts
//   — OPTIONS handler updated to use getCORS
//   — All NextResponse returns use getCORS(origin)
//
// v1.2 (Oct 2026):
//   — B1: hard_d2 dev CTA -> github.com/ANTCPU/ads
//   — B2: dashUrl fixed (was copy of devUrl)
//   — B3: href=dashUrl quotes fixed (hard_d1 + week3_unlock)
//   — B4: internal names removed from week3_unlock
//   — B5: handle fetched from DB, used in officeUrl
//   — handle + elevation_level + node_role added to select
//   — officeUrl derived from handle, fallback dashboard/?t=
//   — handle returned in POST response + Discord fields
//   — captain_alert: see next patch
// ============================================================

import { NextRequest, NextResponse }   from 'next/server';
import { createClient }                from '@supabase/supabase-js';
import { heraldSend }                  from '../../../lib/herald';
import { notifyDiscord, DC }           from '../../../lib/discord';
import {
  checkEmailValidity,
  recordEmailSent,
  logEmailSend,
  logSkippedSend,
} from '../../../lib/emailGate';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── CORS ───────────────────────────────────────────────────────
// Reflects origin back when it matches antcpu* or Vercel deploy.
// Falls back to antcpu-ads.vercel.app for unknown origins.

function getCORS(origin: string) {
  const allowed =
    /^https:\/\/([\w-]+\.)?antcpu\.(io|com|cloud)$/.test(origin) ||
    origin === 'https://antcpu-ads.vercel.app';
  return {
    'Access-Control-Allow-Origin':  allowed ? origin : 'https://antcpu-ads.vercel.app',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// Alias for contexts where req is not available (OPTIONS, catch blocks)
const CORS = getCORS('https://antcpu-ads.vercel.app');

// ── Email constants — antcpu.io branded ───────────────────────
const ACCENT  = '#2563eb';
const BG      = '#0a0a0a';
const CARD    = '#111111';
const BORDER  = '#1a1a1a';
const SUCCESS = '#059669';

// ── OPTIONS ────────────────────────────────────────────────────
export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get('origin') || '';
  return new NextResponse(null, { status: 204, headers: getCORS(origin) });
}

// ── Nudge type ─────────────────────────────────────────────────
type NudgeType =
  | 'hard_d1'
  | 'hard_d2'
  | 'soft'
  | 'light'
  | 'week2_unlock'
  | 'week3_unlock'
  | 'captain_alert'
  | 'week2_push'
  | 'week3_push'
  | 'week4_push'
  | 'final_push'
  | 'complete_badge';

// ── Email builders ─────────────────────────────────────────────

function emailHeader(): string {
  const now    = new Date();
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December',
  ];
  const cohortLabel = `${months[now.getUTCMonth()]} ${now.getUTCFullYear()}`;
  return `
    <div style="text-align:center;margin-bottom:2rem">
      <div style="font-size:1.5rem;font-weight:800;color:${ACCENT}">
        ⚡ antcpu.io
      </div>
      <div style="font-size:0.72rem;color:#555;margin-top:0.25rem;
        letter-spacing:0.1em;text-transform:uppercase">
        Human in the Loop · ${cohortLabel}
      </div>
    </div>`;
}

function emailFooter(): string {
  return `
    <div style="text-align:center;font-size:0.72rem;color:#333;
      border-top:1px solid ${BORDER};padding-top:1rem;margin-top:1.5rem">
      ⚡ antcpu.io ·
      <a href="mailto:ads@antcpu.io" style="color:#555">ads@antcpu.io</a><br>
      <a href="https://antcpu.io" style="color:#555">antcpu.io</a>
    </div>`;
}

function wrap(body: string): string {
  return `<!DOCTYPE html><html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width,initial-scale=1">
    </head>
    <body style="margin:0;padding:0;background:${BG};
      font-family:system-ui,sans-serif;color:#fff">
      <div style="max-width:560px;margin:0 auto;padding:2rem 1.5rem">
        ${emailHeader()}
        ${body}
        ${emailFooter()}
      </div>
    </body>
  </html>`;
}

function ctaButton(label: string, href: string): string {
  return `
    <a href="${href}"
      style="display:inline-block;background:${ACCENT};color:#fff;
        text-decoration:none;font-weight:700;font-size:0.85rem;
        padding:0.65rem 1.4rem;border-radius:8px;margin-top:1rem">
      ${label}
    </a>`;
}

function taskRow(label: string, desc: string, pct: number): string {
  return `
    <div style="padding:0.75rem 0;border-bottom:1px solid ${BORDER}">
      <div style="font-weight:700;font-size:0.88rem;
        color:#fff;margin-bottom:0.2rem">${label}</div>
      <div style="font-size:0.78rem;color:#555;
        margin-bottom:0.3rem">${desc}</div>
      <div style="font-size:0.72rem;color:${ACCENT}">+${pct}%</div>
    </div>`;
}

// ── Build email ────────────────────────────────────────────────

function buildNudgeEmail(opts: {
  firstName:      string;
  track:          string;
  nudgeType:      NudgeType;
  progressPct:    number;
  internId?:      string;
  handle?:        string;
  elevationNote?: string;
}): { subject: string; html: string } {

  const { firstName, track, nudgeType, progressPct, internId, handle, elevationNote } = opts;
  const isMkt = track === 'marketing';
  const name  = firstName || 'there';
  const t         = internId ? '?t=' + internId : '';
  const officeUrl = handle
? `https://antcpu.io/office/?h=${handle}&src=nudge`
    : `https://antcpu.io/dashboard/${t}`;
  const dashUrl   = `https://antcpu.io/dashboard/${t}`;
  const primaryUrl  = isMkt ? 'https://antcpu.cloud/' : 'https://github.com/ANTCPU/ads';
  const primaryLabel = isMkt ? '⚡ Go to the Arena →' : '⚡ Go to the Codebase →';
  // legacy aliases kept for soft/light/week2 templates
  const mktUrl  = 'https://antcpu.cloud/';
  const devUrl  = 'https://github.com/ANTCPU/ads';

  // ── hard_d1 ───────────────────────────────────────────────
  if (nudgeType === 'hard_d1') {
    return {
      subject: `Your dashboard is waiting, ${name}`,
      html: wrap(`
        <div style="background:${CARD};border:1px solid ${ACCENT}30;
          border-radius:12px;padding:1.5rem;margin-bottom:1.25rem">
          <div style="font-size:1.1rem;font-weight:800;margin-bottom:0.5rem">
            You're registered. One task left to start.
          </div>
          <div style="font-size:0.88rem;color:#aaa;line-height:1.7">
            You signed up for the October challenge.
            Your dashboard is live. Your first task takes 5 minutes.
          </div>
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};
          border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
            Do this right now
          </div>
          ${taskRow(
            'Complete Your Profile',
            isMkt
              ? 'Add your country, channels, and AI tool. Takes 2 minutes.'
              : 'Add your GitHub, stack, and AI tool. Takes 2 minutes.',
            10
          )}
          ${taskRow(
            'Explore the Arena',
            isMkt
              ? 'Go to antcpu.cloud. Find the Map of Pi ad. Claim your country.'
              : 'Go to github.com/ANTCPU/ads. Read the README. Find your first open issue.',
            15
          )}
        </div>

        <div style="background:${CARD};border:1px solid ${ACCENT}30;
          border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
            Your mentor is here
          </div>
          <div style="font-size:0.88rem;color:#aaa;line-height:1.7;margin-bottom:0.75rem">
            ${isMkt
              ? 'Mohamed — Marketing Lead · Egypt 🇪🇬 — is in the mentors room. He reviews every marketing challenger personally.'
              : 'Arena — Dev Lead · United States 🇺🇸 — is in the mentors room. He reviews PRs and guides the GitHub workflow.'}
          </div>
          <a href="${isMkt
            ? 'https://antcpu-ads.vercel.app/office/Mohamed39'
            : 'https://antcpu-ads.vercel.app/office/Arena4'}"
            style="display:inline-block;font-size:0.78rem;color:${ACCENT};
              text-decoration:underline">
            → Visit ${isMkt ? 'Mohamed' : 'Arena'}'s Office
          </a>
        </div>
        <div style="text-align:center">
          ${ctaButton('Go to My Office →', officeUrl)}
          <div style="margin-top:0.75rem">
            <a href="${dashUrl}"
              style="font-size:0.78rem;color:#555;text-decoration:underline">
              Or go to your office →
            </a>
          </div>
        </div>`),
    };
  }

  // ── hard_d2 ───────────────────────────────────────────────
  if (nudgeType === 'hard_d2') {
    return {
      subject: `You're 10% in, ${name} — the Arena is next`,
      html: wrap(`
        <div style="background:${CARD};border:1px solid ${ACCENT}30;
          border-radius:12px;padding:1.5rem;margin-bottom:1.25rem">
          <div style="font-size:1.1rem;font-weight:800;margin-bottom:0.5rem">
            Profile done. ${isMkt ? 'The Arena is waiting.' : 'The codebase is waiting.'}
          </div>
          <div style="font-size:0.88rem;color:#aaa;line-height:1.7">
            You're at 10%. The next three tasks are all open right now —
            no waiting, no unlock schedule. Do them in any order.
          </div>
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};
          border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
            Three tasks open right now
          </div>
          ${taskRow(
            'Explore the Arena',
            isMkt
              ? 'Go to antcpu.cloud. Find the Map of Pi ad. Claim your country.'
              : 'Go to github.com/ANTCPU/ads. Read the README. Find your first open issue.',
            15
          )}
          ${taskRow(
            'First Action in the Arena',
            isMkt
              ? "React to one ad. Screenshot it. That's your first submission."
              : 'Read open issues. Pick your target. Write one paragraph on why.',
            20
          )}
          ${taskRow(
            'First Submission',
            isMkt
              ? 'Post your first content piece — a caption, concept, or campaign idea for Map of Pi.'
              : 'Submit your first PR draft or a written code note on your chosen issue.',
            22
          )}
        </div>

        <div style="background:${CARD};border:1px solid ${ACCENT}30;
          border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
            Your mentor is here
          </div>
          <div style="font-size:0.88rem;color:#aaa;line-height:1.7;margin-bottom:0.75rem">
            ${isMkt
              ? 'Mohamed — Marketing Lead · Egypt 🇪🇬 — is in the mentors room. He reviews every marketing challenger personally.'
              : 'Arena — Dev Lead · United States 🇺🇸 — is in the mentors room. He reviews PRs and guides the GitHub workflow.'}
          </div>
          <a href="${isMkt
            ? 'https://antcpu-ads.vercel.app/office/Mohamed39'
            : 'https://antcpu-ads.vercel.app/office/Arena4'}"
            style="display:inline-block;font-size:0.78rem;color:${ACCENT};
              text-decoration:underline">
            → Visit ${isMkt ? 'Mohamed' : 'Arena'}'s Office
          </a>
        </div>
        <div style="text-align:center">
          ${isMkt ? ctaButton('⚡ Go to the Arena →', 'https://antcpu.cloud/') : ctaButton('⚡ Go to the Codebase →', 'https://github.com/ANTCPU/ads')}
          <div style="margin-top:0.75rem">
            <a href="${isMkt ? mktUrl : devUrl}"
              style="font-size:0.78rem;color:#555;text-decoration:underline">
              Or open your workspace →
            </a>
          </div>
        </div>`),
    };
  }

  // ── soft ──────────────────────────────────────────────────
  if (nudgeType === 'soft') {
    const remaining = 25 - progressPct;
    return {
      subject: `You're close to Week 1, ${name}`,
      html: wrap(`
        <div style="background:${CARD};border:1px solid ${SUCCESS}30;
          border-radius:12px;padding:1.5rem;margin-bottom:1.25rem">
          <div style="font-size:1.1rem;font-weight:800;margin-bottom:0.5rem">
            ${progressPct}% done. ${remaining}% to Week 1 complete.
          </div>
          <div style="font-size:0.88rem;color:#aaa;line-height:1.7">
            You've started. All Week 1 tasks are still open.
            Finish them before Week 1 closes — then Week 2 unlocks.
          </div>
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};
          border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
            Still open — do these now
          </div>
          ${taskRow(
            'Give Peer Feedback',
            "Review two other challengers' submissions. One specific improvement each.",
            24
          )}
          ${taskRow(
            'Week 1 Reflection',
            'What did you learn? What surprised you? Post it in the community feed.',
            25
          )}
        </div>

        <div style="background:${CARD};border:1px solid ${ACCENT}30;
          border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
            Your mentor is here
          </div>
          <div style="font-size:0.88rem;color:#aaa;line-height:1.7;margin-bottom:0.75rem">
            ${isMkt
              ? 'Mohamed — Marketing Lead · Egypt 🇪🇬 — is in the mentors room. He reviews every marketing challenger personally.'
              : 'Arena — Dev Lead · United States 🇺🇸 — is in the mentors room. He reviews PRs and guides the GitHub workflow.'}
          </div>
          <a href="${isMkt
            ? 'https://antcpu-ads.vercel.app/office/Mohamed39'
            : 'https://antcpu-ads.vercel.app/office/Arena4'}"
            style="display:inline-block;font-size:0.78rem;color:${ACCENT};
              text-decoration:underline">
            → Visit ${isMkt ? 'Mohamed' : 'Arena'}'s Office
          </a>
        </div>
        <div style="text-align:center">
          ${ctaButton('Go to My Office →', officeUrl)}
          <div style="margin-top:0.75rem">
            <a href="https://antcpu.io/community/"
              style="font-size:0.78rem;color:#555;text-decoration:underline">
              Go to Community →
            </a>
          </div>
        </div>`),
    };
  }

  // ── light ─────────────────────────────────────────────────
  if (nudgeType === 'light') {
    return {
      subject: `Keep going, ${name} — you're ${progressPct}% in`,
      html: wrap(`
        <div style="background:${CARD};border:1px solid ${ACCENT}30;
          border-radius:12px;padding:1.5rem;margin-bottom:1.25rem">
          <div style="font-size:1.1rem;font-weight:800;margin-bottom:0.5rem">
            You're moving. Keep it up.
          </div>
          <div style="font-size:0.88rem;color:#aaa;line-height:1.7">
            You're at ${progressPct}%. All Week 1 tasks are open.
            Your next task is waiting in your workspace.
          </div>
        </div>
        <div style="text-align:center">
          ${ctaButton('Go to My Office →', officeUrl)}
        </div>`),
    };
  }

  // ── week1_mentor ─────────────────────────────────────────
  // Fires Day 3-4 — pure mentor intro, no task pressure
  if (nudgeType === 'week1_mentor') {
    return {
      subject: `Meet your mentor, ${name}`,
      html: wrap(`
        <div style="background:${CARD};border:1px solid ${ACCENT}30;
          border-radius:12px;padding:1.5rem;margin-bottom:1.25rem">
          <div style="font-size:1.1rem;font-weight:800;margin-bottom:0.5rem">
            ${isMkt ? 'Mohamed is your Marketing Lead.' : 'Arena is your Dev Lead.'}
          </div>
          <div style="font-size:0.88rem;color:#aaa;line-height:1.7">
            ${isMkt
              ? 'Mohamed — based in Egypt 🇪🇬 — is a professional digital marketer. Meta Ads, Google Ads, SEO, content strategy. He reviews every marketing challenger personally and is already in the mentors room.'
              : 'Arena — based in the United States 🇺🇸 — mapped the complete challenger journey. He reviews PRs, guides the GitHub workflow, and sets the technical standard. He is already in the mentors room.'}
          </div>
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};
          border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
            Two things to do right now
          </div>
          ${taskRow(
            "Visit your mentor's office",
            isMkt
              ? "Go to Mohamed's office. Read his bio. See what he's built."
              : "Go to Arena's office. Read his bio. See the codebase he mapped.",
            0
          )}
          ${taskRow(
            'Post in the mentors room',
            'Open your office. Go to the mentors room. Say hello. One line.',
            0
          )}
        </div>
        <div style="text-align:center">
          ${ctaButton(
            isMkt ? '→ Visit Mohamed\'s Office' : '→ Visit Arena\'s Office',
            isMkt
              ? 'https://antcpu-ads.vercel.app/office/Mohamed39'
              : 'https://antcpu-ads.vercel.app/office/Arena4'
          )}
          <div style="margin-top:0.75rem">
            ${ctaButton('Go to My Office →', officeUrl)}
          </div>
        </div>`),
    };
  }


  // -- captain_alert ------------------------------------------
  // Sent to elevation_level 3 challengers selected as node captains.
  // They were elevated after going dark — they don't know yet.
  if (nudgeType === 'captain_alert') {
    return {
      subject: `⚡ You've been selected as Node Captain, ${name}`,
      html: wrap(`
        <div style="background:${CARD};border:1px solid ${ACCENT}30;
          border-radius:12px;padding:1.5rem;margin-bottom:1.25rem">
          <div style="font-size:1.1rem;font-weight:800;margin-bottom:0.5rem">
            ⚡ You've been selected as Node Captain.
          </div>
          <div style="font-size:0.88rem;color:#aaa;line-height:1.7">
            Out of ${isMkt ? '4 marketing' : '29 dev'} challengers,
            you were selected to lead a node into Week 3.
            Your team is assigned. They're waiting for you.
          </div>
        </div>
        ${elevationNote ? `
        <div style="background:${CARD};border:1px solid ${BORDER};
          border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.5rem">
            Why you were selected
          </div>
          <div style="font-size:0.85rem;color:#aaa;line-height:1.7">
            ${elevationNote}
          </div>
        </div>` : ''}
        <div style="background:${CARD};border:1px solid ${BORDER};
          border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
            What happens next
          </div>
          ${taskRow(
            'Week 3 Brief — Lead Your Node',
            'Your node has a dev captain, a marketer, and members. You set the direction.',
            55
          )}
          ${taskRow(
            'First Node Check-in',
            'Post in your node channel. Introduce yourself as captain. Set the tone.',
            60
          )}
          ${taskRow(
            'Ship Together',
            'Your node submits one joint project. You own the outcome.',
            75
          )}
        </div>
        <div style="text-align:center">
          ${ctaButton('⚡ Go to My Office →', officeUrl)}
          <div style="margin-top:0.75rem">
            <a href="${primaryUrl}"
              style="font-size:0.78rem;color:#555;text-decoration:underline">
              ${primaryLabel}
            </a>
          </div>
        </div>`),
    };
  }

  // ── week3_unlock ──────────────────────────────────────────
  if (nudgeType === 'week3_unlock') {
    return {
      subject: `Your team forms in 4 days, ${name}`,
      html: wrap(`
        <div style="background:${CARD};border:1px solid ${ACCENT}30;
          border-radius:12px;padding:1.5rem;margin-bottom:1.25rem">
          <div style="font-size:1.1rem;font-weight:800;margin-bottom:0.5rem">
            ⚡ Week 3 starts Oct 14. Teams form that day.
          </div>
          <div style="font-size:0.88rem;color:#aaa;line-height:1.7">
            Dev and Marketing challengers pair into squads on Day 14.
            Only challengers who complete d8 get assigned to a team.
            3 challengers are already at 100%. Your squad is forming.
            You have 4 days.
          </div>
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};
          border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
            Complete before Oct 14
          </div>
          ${taskRow(
            'Week 2 Brief — Plan Your Build',
            isMkt
              ? 'Define your Map of Pi country campaign concept.'
              : 'Pick your PR from the open issues on the challenge repo.',
            30
          )}
          ${taskRow(
            'Build Day 1',
            isMkt
              ? 'Create your first campaign asset — hook, copy, visual.'
              : 'Write your first commit on the intern branch.',
            38
          )}
          ${taskRow(
            'Ship & Submit',
            isMkt
              ? 'Submit your campaign concept to the Arena.'
              : 'Open your pull request on the intern branch.',
            46
          )}
        </div>
        <div style="text-align:center">
          ${ctaButton('Go to My Office →', officeUrl)}
          <div style="margin-top:0.75rem">
            <a href="${dashUrl}"
              style="font-size:0.78rem;color:#555;text-decoration:underline">
              Or go to your office →
            </a>
          </div>
        </div>`),
    };
  }

  // ── week2_push ───────────────────────────────────────────
  if (nudgeType === 'week2_push') {
    const remaining = 50 - progressPct;
    return {
      subject: `You're ${progressPct}% in, ${name} — Week 2 is open`,
      html: wrap(`
        <div style="background:${CARD};border:1px solid ${ACCENT}30;
          border-radius:12px;padding:1.5rem;margin-bottom:1.25rem">
          <div style="font-size:1.1rem;font-weight:800;margin-bottom:0.5rem">
            ⚡ You started Week 2. Keep going.
          </div>
          <div style="font-size:0.88rem;color:#aaa;line-height:1.7">
            You're at ${progressPct}%. ${remaining}% to Week 3.
            Your Week 2 tasks are all open — no unlock schedule.
            Do them in any order.
          </div>
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};
          border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
            Week 2 — still open
          </div>
          ${taskRow(
            'Research & Analyze',
            isMkt
              ? 'Research your country audience. What message lands?'
              : 'Analyze the codebase section your PR touches.',
            35
          )}
          ${taskRow(
            'Build Day 1',
            isMkt
              ? 'Draft your first campaign asset. Post it in the Arena.'
              : 'Write your first commit on the intern branch.',
            38
          )}
          ${taskRow(
            'Ship & Submit',
            isMkt
              ? 'Submit your campaign concept to the Arena.'
              : 'Open your pull request on the intern branch.',
            46
          )}
        </div>
        <div style="text-align:center">
          ${ctaButton('⚡ Go to My Office →', officeUrl)}
          <div style="margin-top:0.75rem">
            <a href="${primaryUrl}"
              style="font-size:0.78rem;color:#555;text-decoration:underline">
              ${primaryLabel}
            </a>
          </div>
        </div>`),
    };
  }

  // ── week3_push ───────────────────────────────────────────
  if (nudgeType === 'week3_push') {
    return {
      subject: `Your team is waiting, ${name}`,
      html: wrap(`
        <div style="background:${CARD};border:1px solid ${ACCENT}30;
          border-radius:12px;padding:1.5rem;margin-bottom:1.25rem">
          <div style="font-size:1.1rem;font-weight:800;margin-bottom:0.5rem">
            ⚡ Week 3 is live. Your team is formed.
          </div>
          <div style="font-size:0.88rem;color:#aaa;line-height:1.7">
            You're at ${progressPct}%. Nodes are assigned.
            Your next task is d15 — introduce yourself to your team.
            It takes 2 minutes and unlocks the rest of Week 3.
          </div>
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};
          border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
            Do this now — unlocks Week 3
          </div>
          ${taskRow(
            'Introduce Yourself — d15',
            "Post in the General room. One sentence. Your name, track, and what you're building.",
            55
          )}
          ${taskRow(
            'Find Your Node',
            isMkt
              ? 'Go to your office. Find your node assignment. Message your captain.'
              : 'Go to your office. Find your node. Say hi to your dev partner.',
            60
          )}
          ${taskRow(
            'Week 3 Build',
            isMkt
              ? 'Launch your Map of Pi country campaign with your node.'
              : 'Ship your PR with your node. One joint commit.',
            75
          )}
        </div>
        <div style="text-align:center">
          ${ctaButton('⚡ Go to My Office →', officeUrl)}
          <div style="margin-top:0.75rem">
            <a href="${primaryUrl}"
              style="font-size:0.78rem;color:#555;text-decoration:underline">
              ${primaryLabel}
            </a>
          </div>
        </div>`),
    };
  }

  // ── week4_push ───────────────────────────────────────────
  if (nudgeType === 'week4_push') {
    return {
      subject: `Your node is building, ${name} — don't go dark`,
      html: wrap(`
        <div style="background:${CARD};border:1px solid ${ACCENT}30;
          border-radius:12px;padding:1.5rem;margin-bottom:1.25rem">
          <div style="font-size:1.1rem;font-weight:800;margin-bottom:0.5rem">
            ⚡ Your node is active. Are you?
          </div>
          <div style="font-size:0.88rem;color:#aaa;line-height:1.7">
            You're at ${progressPct}%. Your node is building right now.
            Week 4 tasks are open — your team needs your contribution
            to cross the finish line together.
          </div>
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};
          border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
            Week 4 — open right now
          </div>
          ${taskRow(
            'Node Check-in',
            'Post an update in your node channel. What did you ship this week?',
            65
          )}
          ${taskRow(
            'Joint Submission',
            isMkt
              ? 'Submit your node campaign asset to the Arena.'
              : 'Merge your node PR. One joint commit counts.',
            75
          )}
          ${taskRow(
            'Peer Review',
            'Review one other node member submission. One specific improvement.',
            80
          )}
        </div>
        <div style="text-align:center">
          ${ctaButton('⚡ Go to My Office →', officeUrl)}
          <div style="margin-top:0.75rem">
            <a href="${primaryUrl}"
              style="font-size:0.78rem;color:#555;text-decoration:underline">
              ${primaryLabel}
            </a>
          </div>
        </div>`),
    };
  }

  // ── final_push ───────────────────────────────────────────
  if (nudgeType === 'final_push') {
    return {
      subject: `You're ${progressPct}% done, ${name} — finish it`,
      html: wrap(`
        <div style="background:${CARD};border:1px solid ${SUCCESS}30;
          border-radius:12px;padding:1.5rem;margin-bottom:1.25rem">
          <div style="font-size:1.1rem;font-weight:800;margin-bottom:0.5rem">
            ${progressPct}% done. The finish line is right there.
          </div>
          <div style="font-size:0.88rem;color:#aaa;line-height:1.7">
            You've put in the work. The last tasks are open right now.
            Challengers who finish get their office badge, their certificate,
            and first access to the next cohort captain track.
          </div>
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};
          border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
            Final tasks — do these now
          </div>
          ${taskRow(
            'Final Reflection',
            'What did you build? What did you learn? Post it in the community feed.',
            90
          )}
          ${taskRow(
            'Share Your Office',
            'Post your office link on X, LinkedIn, or Bluesky. One post. Tag @antcpu.',
            95
          )}
          ${taskRow(
            'Challenge Complete',
            'Submit your final review. Your badge and certificate unlock at 100%.',
            100
          )}
        </div>
        <div style="text-align:center">
          ${ctaButton('🏆 Finish the Challenge →', officeUrl)}
          <div style="margin-top:0.75rem">
            <a href="${primaryUrl}"
              style="font-size:0.78rem;color:#555;text-decoration:underline">
              ${primaryLabel}
            </a>
          </div>
        </div>`),
    };
  }

  // ── complete_badge ──────────────────────────────────────────
  if (nudgeType === 'complete_badge') {
    return {
      subject: `You did it, ${name} — your badge is ready`,
      html: wrap(`
        <div style="background:${CARD};border:1px solid ${SUCCESS}30;
          border-radius:12px;padding:1.5rem;margin-bottom:1.25rem">
          <div style="font-size:1.1rem;font-weight:800;margin-bottom:0.5rem">
            🏆 Challenge complete. You finished.
          </div>
          <div style="font-size:0.88rem;color:#aaa;line-height:1.7">
            You completed the ANTCPU Internship Challenge.
            Your badge is live on your office. Your certificate is ready.
            You're now eligible for the next cohort captain track.
          </div>
        </div>
        <div style="background:${CARD};border:1px solid ${BORDER};
          border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
          <div style="font-size:0.7rem;color:#555;font-weight:700;
            letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
            What's unlocked
          </div>
          ${taskRow('Office Badge', 'Your completion badge is live on your public office page.', 100)}
          ${taskRow('Certificate', 'Download your internship certificate from your office.', 100)}
          ${taskRow('Captain Track', 'Applications open for the next cohort captain role.', 100)}
        </div>
        <div style="text-align:center">
          ${ctaButton('🏆 View My Office →', officeUrl)}
          <div style="margin-top:0.75rem">
            <a href="${primaryUrl}"
              style="font-size:0.78rem;color:#555;text-decoration:underline">
              Share your achievement
            </a>
          </div>
        </div>`),
    };
  }

  // ── week2_unlock ──────────────────────────────────────────
  return {
    subject: `Week 2 just unlocked, ${name}`,
    html: wrap(`
      <div style="background:${CARD};border:1px solid ${ACCENT}30;
        border-radius:12px;padding:1.5rem;margin-bottom:1.25rem">
        <div style="font-size:1.1rem;font-weight:800;margin-bottom:0.5rem">
          ⚡ Week 2 is open. All 7 tasks unlocked.
        </div>
        <div style="font-size:0.88rem;color:#aaa;line-height:1.7">
          You completed Week 1. Week 2 — Creator phase — is live.
          ${isMkt
            ? 'Launch your first real campaign in the Arena.'
            : 'Pick your PR. Start building on the live codebase.'}
        </div>
      </div>
      <div style="background:${CARD};border:1px solid ${BORDER};
        border-radius:12px;padding:1.25rem;margin-bottom:1.25rem">
        <div style="font-size:0.7rem;color:#555;font-weight:700;
          letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
          Week 2 — what's waiting
        </div>
        ${taskRow(
          'Week 2 Brief — Plan Your Build',
          isMkt
            ? 'Review the Week 2 brief. Pick your country campaign strategy.'
            : 'Review the Week 2 brief. Pick your PR from the open list.',
          30
        )}
        ${taskRow(
          'Research & Analyze',
          isMkt
            ? 'Research your country audience. What message lands?'
            : 'Analyze the codebase section your PR touches.',
          35
        )}
        ${taskRow(
          'Build Day 1',
          isMkt
            ? 'Draft your first campaign asset. Post it in the Arena.'
            : 'Write your first commit on the intern branch.',
          38
        )}
      </div>
      <div style="text-align:center">
        ${ctaButton('Go to My Office →', officeUrl)}
      </div>`),
  };
}

// ── POST ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin') || '';
  const cors   = getCORS(origin);

  try {
    const body = await req.json();
    const {
      email,
      nudge_type,
      first_name,
      track,
      progress_pct,
    }: {
      email:         string;
      nudge_type:    NudgeType;
      first_name?:   string;
      track?:        string;
      progress_pct?: number;
    } = body;

    if (!email || !nudge_type) {
      return NextResponse.json(
        { error: 'email and nudge_type required' },
        { status: 400, headers: cors }
      );
    }

    const validTypes: NudgeType[] = [
      'hard_d1', 'hard_d2', 'soft', 'light', 'week1_mentor', 'week2_unlock', 'week3_unlock', 'captain_alert', 'week2_push', 'week3_push', 'week4_push', 'final_push', 'complete_badge',
    ];
    if (!validTypes.includes(nudge_type)) {
      return NextResponse.json(
        { error: `Invalid nudge_type: ${nudge_type}` },
        { status: 400, headers: cors }
      );
    }

    // ── Step 1: Validity — bounce/unsub only ──────────────────
    const validity = await checkEmailValidity(supabase, email);
    if (validity === 'bounced' || validity === 'unsubscribed') {
      try {
        await logSkippedSend(supabase, email, `nudge_${nudge_type}`, validity, {
          segment: 'internship',
        });
      } catch { /* silent */ }
      return NextResponse.json(
        { sent: false, reason: validity },
        { headers: cors }
      );
    }

    // ── Step 2: Idempotency ───────────────────────────────────
    const { data: challenger } = await supabase
      .from('challengers')
      .select('id, intern_id, handle, first_name, track, progress_pct, nudge_sent_at, nudge_type_sent, cohort, elevation_level, elevation_note, node_role')
      .eq('email', email.trim().toLowerCase())
      .eq('status', 'active')
      .maybeSingle();

    if (!challenger) {
      return NextResponse.json(
        { error: 'Challenger not found' },
        { status: 404, headers: cors }
      );
    }

    if (challenger.nudge_sent_at && challenger.nudge_type_sent === nudge_type) {
      return NextResponse.json(
        { sent: false, reason: 'already_sent', nudge_type },
        { headers: cors }
      );
    }

    // ── Step 3: Build email ───────────────────────────────────
    const resolvedName  = first_name   || challenger.first_name  || 'there';
    const resolvedTrack = track        || challenger.track       || 'dev';
    const resolvedPct   = progress_pct ?? challenger.progress_pct ?? 0;

    const { subject, html } = buildNudgeEmail({
      firstName:     resolvedName,
      track:         resolvedTrack,
      nudgeType:     nudge_type,
      progressPct:   resolvedPct,
      internId:      challenger.intern_id    ?? undefined,
      handle:        challenger.handle       ?? undefined,
      elevationNote: challenger.elevation_note ?? undefined,
    });

    // ── Step 4: Send ──────────────────────────────────────────
    await heraldSend({ to: email, subject, html });

    // ── Step 5: Record — parallel ─────────────────────────────
    await Promise.all([
      recordEmailSent(supabase, email),
      logEmailSend(supabase, email, `nudge_${nudge_type}`, {
        segment: 'internship',
        subject,
        locale:  'en',
        status:  'sent',
      }),
      supabase
        .from('challengers')
        .update({
          nudge_sent_at:   new Date().toISOString(),
          nudge_type_sent: nudge_type,
          last_seen_at:    new Date().toISOString(),
        })
        .eq('id', challenger.id),
      supabase
        .from('activity_log')
        .insert({
          challenger_id: challenger.id,
          type:          'nudge',
          event:         'nudge_sent',
          label:         `Nudge sent: ${nudge_type}`,
          icon:          '📧',
          gate_id:       null,
          points:        0,
        }),
    ]);

    // ── Step 6: Discord ───────────────────────────────────────
    const trackLabel = resolvedTrack === 'dev' ? '💻 Dev' : '📣 Marketing';
    notifyDiscord('', 'internship', {
      title:  `📧 Nudge Sent — ${nudge_type}`,
      color:  DC.intern,
      fields: [
        { name: 'Challenger', value: `${resolvedName} · ${trackLabel}`, inline: true },
        { name: 'Progress',   value: `${resolvedPct}%`,                 inline: true },
        { name: 'Type',       value: nudge_type,                        inline: true },
        { name: 'Handle',     value: challenger.handle || '—',          inline: true },
        { name: 'Email',      value: email,                             inline: false },
      ],
      footer:    `internship nudge · ${challenger.cohort || 'october-2026'}`,
      timestamp: true,
    }).catch(() => {});

    return NextResponse.json(
      { sent: true, nudge_type, email, handle: challenger.handle },
      { headers: cors }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[internship/nudge] POST error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}

// ============================================================
// File:    app/api/internship/nudge/route.ts
// Version: v1.5
// Updated: 2026-10-19
//
// WHAT THIS FILE DOES:
//   Sends track-aware nudge emails to challengers via Resend/Herald.
//   Each nudge type targets a specific progress state.
//   All CTAs route to office/[handle] as primary destination.
//   Click/open events tracked via Resend webhook -> email_sends.
//
// CHANGES v1.2:
//   B1: hard_d2 dev CTA -> github.com/ANTCPU/ads (not antcpu.cloud)
//   B2: dashUrl fixed — was copy of devUrl, now /dashboard/?t=
//   B3: href=dashUrl quotes fixed in hard_d1 + week3_unlock
//   B4: internal names removed from week3_unlock
//   B5: handle fetched from DB, used in officeUrl
//   NEW: captain_alert nudge type added
//   NEW: handle + elevation_level + node_role in DB select
//   NEW: officeUrl -> office/[handle], fallback dashboard/?t=
//   NEW: secondaryLink pattern via inline div
//   NEW: handle returned in POST response + Discord fields
//
// NUDGE TYPES:
//   hard_d1       5%   -> hasn't returned since signup
//   hard_d2       10%  -> profile done, hasn't touched codebase/arena
//   soft          <25% -> stalled before Week 1 complete
//   light         any  -> gentle active pointer
//   week2_unlock  25%  -> Week 1 done, Week 2 just opened
//   week3_unlock  any  -> Week 2 closing, team forms Day 14
//   captain_alert any  -> elevated to Node Captain, doesn't know yet
//   complete_badge 100% -> challenge done, badge not yet awarded
//   week2_push    30%  -> Week 2 progress, going quiet
//   week3_push    50%  -> team formed, d15 waiting, fast-forward dead zone
//   week4_push    55%  -> node active, challenger going quiet
//   final_push    75%  -> almost done, finish line nudge
//
// CTA ROUTING:
//   dev primary   -> github.com/ANTCPU/ads
//   mkt primary   -> antcpu.cloud
//   all secondary -> antcpu-ads.vercel.app/office/[handle]
//   fallback      -> antcpu.io/dashboard/?t=[intern_id]
//
// RESEND TRACKING:
//   Click + open tracking enabled in Resend dashboard
//   Webhook: antcpu-ads.vercel.app/api/webhooks/resend
//   Events -> email_sends (status, opened_at, clicked_at)
//          -> email_prefs (open_count, email_ok)
//
// NEXT TASKS:
//   -> nav.js: login -> office/[handle]
//   -> dashboard.js: owner redirect -> antcpu.com/admin/dashboard/
//   -> admin/dashboard/index.html: gate + smart nudge type
//   -> OfficeClient.tsx: online now counter
//   -> office/[handle]/route.ts: add node_id, node_role
//   -> desktop.html: email panel (outbox, counter, compose)
//
// DEPENDS ON:
//   app/lib/herald.ts     heraldSend()
//   app/lib/discord.ts    notifyDiscord(), DC
//   app/lib/emailGate.ts  checkEmailValidity(), recordEmailSent(),
//                         logEmailSend(), logSkippedSend()
//   Supabase tables:
//     challengers         source of truth + handle + elevation
//     activity_log        nudge event log
//     email_sends         send history + open/click status
//     email_validity      bounce/unsub gate
//     ad_signups          quota counters
// ============================================================
