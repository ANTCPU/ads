// ============================================================
// app/api/internship/nudge/route.ts
// POST — Send a nudge email to a specific challenger
//
// Called by: manual trigger or future cron
// Pattern: mirrors register/route.ts email send (no emailGate
// age check — challengers are < 7 days old during Week 1)
//
// Nudge types:
//   hard_d1      — stuck at 5%, hasn't returned
//   hard_d2      — stuck at 10%, hasn't touched Arena
//   soft         — 15–24%, stalled before Week 1 complete
//   light        — active but not done (gentle pointer)
//   week2_unlock — Week 1 done, Week 2 just opened
//
// Gate: checkEmailValidity only (bounce/unsub check)
//       + nudge_sent_at idempotency on challengers table
//       No MIN_ACCOUNT_AGE_DAYS — challengers need nudges Day 2
//
// Email: antcpu.io branded (#2563eb), not ADS branded (#f0883e)
//        Track-aware copy — marketing gets Arena CTA,
//        dev gets GitHub/codebase CTA
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
  gatedNotify,
  shouldNotify,
} from '../../../lib/emailGate';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  'https://antcpu-ads.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Email constants — antcpu.io branded ───────────────────────
const ACCENT  = '#2563eb';
const BG      = '#0a0a0a';
const CARD    = '#111111';
const BORDER  = '#1a1a1a';
const SUCCESS = '#059669';

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// ── Nudge type definitions ─────────────────────────────────────
type NudgeType =
  | 'hard_d1'
  | 'hard_d2'
  | 'soft'
  | 'light'
  | 'week2_unlock';

// ── Email builders ─────────────────────────────────────────────

function emailHeader(): string {
  const now    = new Date();
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
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

// ── Build email by nudge type + track ─────────────────────────

function buildNudgeEmail(opts: {
  firstName:  string;
  track:      string;
  nudgeType:  NudgeType;
  progressPct: number;
}): { subject: string; html: string } {

  const { firstName, track, nudgeType, progressPct } = opts;
  const isMkt = track === 'marketing';
  const name  = firstName || 'there';

  // ── hard_d1 — registered, never came back ─────────────────
  if (nudgeType === 'hard_d1') {
    const subject = `Your dashboard is waiting, ${name}`;
    const body = `
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
          isMkt ? 'Explore the Arena' : 'Explore the Arena',
          isMkt
            ? 'Go to antcpu.cloud. Find the Map of Pi ad. Claim your country.'
            : 'Go to antcpu.cloud. Read the codebase. Find your first PR.',
          15
        )}
      </div>

      <div style="text-align:center">
        ${ctaButton(
          isMkt ? 'Go to Marketing Workspace →' : 'Go to Dev Workspace →',
          isMkt ? 'https://antcpu.io/marketing/' : 'https://antcpu.io/dev/'
        )}
        <div style="margin-top:0.75rem">
          <a href="https://antcpu.io/dashboard/"
            style="font-size:0.78rem;color:#555;text-decoration:underline">
            Or go to your dashboard →
          </a>
        </div>
      </div>`;
    return { subject, html: wrap(body) };
  }

  // ── hard_d2 — profile done, hasn't touched Arena ──────────
  if (nudgeType === 'hard_d2') {
    const subject = `You're 10% in, ${name} — the Arena is next`;
    const body = `
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
            : 'Go to antcpu.cloud. Read the README. Find your first open PR.',
          15
        )}
        ${taskRow(
          'First Action in the Arena',
          isMkt
            ? 'React to one ad. Screenshot it. That\'s your first submission.'
            : 'Read all open PRs. Pick your target. Write one paragraph on why.',
          20
        )}
        ${taskRow(
          'First Submission',
          isMkt
            ? 'Post your first content piece — a caption, concept, or campaign idea for Map of Pi.'
            : 'Submit your first PR draft or a written code note on your chosen PR.',
          22
        )}
      </div>

      <div style="text-align:center">
        ${ctaButton(
          isMkt ? '⚡ Go to the Arena →' : '⚡ Go to the Arena →',
          'https://antcpu.cloud/'
        )}
        <div style="margin-top:0.75rem">
          <a href="${isMkt ? 'https://antcpu.io/marketing/' : 'https://antcpu.io/dev/'}"
            style="font-size:0.78rem;color:#555;text-decoration:underline">
            Or open your workspace →
          </a>
        </div>
      </div>`;
    return { subject, html: wrap(body) };
  }

  // ── soft — 15–24%, stalled before Week 1 complete ─────────
  if (nudgeType === 'soft') {
    const remaining = 25 - progressPct;
    const subject   = `You're close to Week 1, ${name}`;
    const body = `
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
          'Review two other challengers\' submissions. One specific improvement each.',
          24
        )}
        ${taskRow(
          'Week 1 Reflection',
          'What did you learn? What surprised you? Post it in the community feed.',
          25
        )}
      </div>

      <div style="text-align:center">
        ${ctaButton(
          'Go to Dashboard →',
          'https://antcpu.io/dashboard/'
        )}
        <div style="margin-top:0.75rem">
          <a href="https://antcpu.io/community/"
            style="font-size:0.78rem;color:#555;text-decoration:underline">
            Go to Community →
          </a>
        </div>
      </div>`;
    return { subject, html: wrap(body) };
  }

  // ── light — active, not done (gentle pointer) ─────────────
  if (nudgeType === 'light') {
    const subject = `Keep going, ${name} — you're ${progressPct}% in`;
    const body = `
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
        ${ctaButton(
          isMkt ? 'Go to Marketing Workspace →' : 'Go to Dev Workspace →',
          isMkt ? 'https://antcpu.io/marketing/' : 'https://antcpu.io/dev/'
        )}
      </div>`;
    return { subject, html: wrap(body) };
  }

  // ── week2_unlock — Week 1 done, Week 2 just opened ────────
  const subject = `Week 2 just unlocked, ${name}`;
  const body = `
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
      ${ctaButton(
        isMkt ? 'Go to Marketing Workspace →' : 'Go to Dev Workspace →',
        isMkt ? 'https://antcpu.io/marketing/' : 'https://antcpu.io/dev/'
      )}
    </div>`;
  return { subject, html: wrap(body) };
}

// ── POST ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      nudge_type,
      first_name,
      track,
      progress_pct,
    }: {
      email:        string;
      nudge_type:   NudgeType;
      first_name?:  string;
      track?:       string;
      progress_pct?: number;
    } = body;

    if (!email || !nudge_type) {
      return NextResponse.json(
        { error: 'email and nudge_type required' },
        { status: 400, headers: CORS }
      );
    }

    const validTypes: NudgeType[] = [
      'hard_d1', 'hard_d2', 'soft', 'light', 'week2_unlock'
    ];
    if (!validTypes.includes(nudge_type)) {
      return NextResponse.json(
        { error: `Invalid nudge_type: ${nudge_type}` },
        { status: 400, headers: CORS }
      );
    }

    // ── Step 1: Validity check — bounce/unsub only ─────────────
    // No MIN_ACCOUNT_AGE_DAYS — challengers need nudges Day 2+
    const validity = await checkEmailValidity(supabase, email);
    if (validity === 'bounced' || validity === 'unsubscribed') {
      try {
        await logSkippedSend(supabase, email, `nudge_${nudge_type}`, validity, {
          segment: 'internship',
        });
      } catch { /* silent */ }
      return NextResponse.json(
        { sent: false, reason: validity },
        { headers: CORS }
      );
    }

    // ── Step 2: Idempotency — read challenger nudge state ──────
    const { data: challenger } = await supabase
      .from('challengers')
      .select('id, first_name, track, progress_pct, nudge_sent_at, nudge_type_sent, cohort')
      .eq('email', email.trim().toLowerCase())
      .eq('status', 'active')
      .maybeSingle();

    if (!challenger) {
      return NextResponse.json(
        { error: 'Challenger not found' },
        { status: 404, headers: CORS }
      );
    }

    // Block if same nudge type already sent
    if (
      challenger.nudge_sent_at &&
      challenger.nudge_type_sent === nudge_type
    ) {
      return NextResponse.json(
        { sent: false, reason: 'already_sent', nudge_type },
        { headers: CORS }
      );
    }

    // ── Step 3: Build email ────────────────────────────────────
    const resolvedName  = first_name  || challenger.first_name  || 'there';
    const resolvedTrack = track       || challenger.track       || 'dev';
    const resolvedPct   = progress_pct ?? challenger.progress_pct ?? 0;

    const { subject, html } = buildNudgeEmail({
      firstName:   resolvedName,
      track:       resolvedTrack,
      nudgeType:   nudge_type,
      progressPct: resolvedPct,
    });

    // ── Step 4: Send ───────────────────────────────────────────
    await heraldSend({ to: email, subject, html });

    // ── Step 5: Record send — parallel ────────────────────────
    await Promise.all([

      // Increment email counters on ad_signups (emailGate budget tracking)
      recordEmailSent(supabase, email),

      // Log to email_sends table
      logEmailSend(supabase, email, `nudge_${nudge_type}`, {
        segment: 'internship',
        subject,
        locale:  'en',
        status:  'sent',
      }),

      // Mark nudge sent on challengers row — idempotency
      supabase
        .from('challengers')
        .update({
          nudge_sent_at:    new Date().toISOString(),
          nudge_type_sent:  nudge_type,
          last_seen_at:     new Date().toISOString(),
        })
        .eq('id', challenger.id),

      // Activity log — nudge is a background event, not a gate
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

    // ── Step 6: Discord notify ─────────────────────────────────
    const trackLabel = resolvedTrack === 'dev' ? '💻 Dev' : '📣 Marketing';
    notifyDiscord('', 'internship', {
      title:  `📧 Nudge Sent — ${nudge_type}`,
      color:  DC.intern,
      fields: [
        { name: 'Challenger', value: `${resolvedName} · ${trackLabel}`,  inline: true },
        { name: 'Progress',   value: `${resolvedPct}%`,                  inline: true },
        { name: 'Type',       value: nudge_type,                         inline: true },
        { name: 'Email',      value: email,                              inline: false },
      ],
      footer:    `internship nudge · ${challenger.cohort || 'october-2026'}`,
      timestamp: true,
    }).catch(() => {});

    return NextResponse.json(
      { sent: true, nudge_type, email },
      { headers: CORS }
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
