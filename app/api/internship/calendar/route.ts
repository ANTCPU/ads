// ============================================================
// https://antcpu-ads.vercel.app/app/api/internship/calendar/route.ts
// GET — Challenge calendar state
// Fully dynamic — derives cohort from current month automatically
// No hardcoded dates — works for any month forever
// Called by: all pages, all API routes, config.js
// ============================================================

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

const WEEKS = [
  { id:1, name:'Explorer',     emoji:'🔭', theme:'Show us who you are.',  start:1,  end:7  },
  { id:2, name:'Creator',      emoji:'⚡', theme:'Build something real.',  start:8,  end:14 },
  { id:3, name:'Collaborator', emoji:'🤝', theme:'Work with the team.',    start:15, end:21 },
  { id:4, name:'Leader',       emoji:'🚀', theme:'Own something.',         start:22, end:31 },
];

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
];

export async function GET(req: NextRequest) {
  // ── Challenge timezone — EST ───────────────────────────────
  // All day boundaries are midnight EST regardless of server TZ
  const TZ_OFFSET_MS = -5 * 60 * 60 * 1000; // EST = UTC-5

  const nowUTC  = new Date();
  const nowEST  = new Date(nowUTC.getTime() + TZ_OFFSET_MS);

  // ── Derive cohort from current month ──────────────────────
  const year  = nowEST.getUTCFullYear();
  const month = nowEST.getUTCMonth(); // 0-indexed

  // Challenge runs 1st → last day of current month
  const challengeStart = new Date(Date.UTC(year, month, 1, 5, 0, 0));     // Aug 1 00:00 EST = Aug 1 05:00 UTC
  const challengeEnd   = new Date(Date.UTC(year, month + 1, 1, 4, 59, 59)); // Last day 23:59 EST

  // Next cohort = 1st of next month
  const nextYear  = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const nextCohortStart = new Date(Date.UTC(nextYear, nextMonth, 1, 5, 0, 0));

  // Last day of current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Cohort ID — e.g. "august-2026"
  const cohortId = `${MONTH_NAMES[month].toLowerCase()}-${year}`;

  // ── Calculate challenge day ────────────────────────────────
  const msPerDay    = 86400000;
  const isPreLaunch = nowUTC < challengeStart;
  const isComplete  = nowUTC > challengeEnd;
  const isActive    = !isPreLaunch && !isComplete;

  const rawDay = Math.floor(
    (nowUTC.getTime() - challengeStart.getTime()) / msPerDay
  ) + 1;

  const day = isPreLaunch ? 0
    : isComplete          ? daysInMonth
    : Math.min(Math.max(rawDay, 1), daysInMonth);

  // ── Calculate week ─────────────────────────────────────────
  const currentWeek = WEEKS.find(w => day >= w.start && day <= w.end)
    ?? (day === 0 ? WEEKS[0] : WEEKS[3]);

  // ── Days remaining ─────────────────────────────────────────
  const daysLeftInWeek = Math.max(currentWeek.end - day, 0);
  const daysLeftInChallenge = Math.max(
    Math.floor((challengeEnd.getTime() - nowUTC.getTime()) / msPerDay), 0
  );

  // ── Week date range ────────────────────────────────────────
  const weekStartDate = new Date(Date.UTC(year, month, currentWeek.start, 5, 0, 0));
  const weekEndDate   = new Date(Date.UTC(year, month, currentWeek.end,   5, 0, 0));

  // ── Phase ──────────────────────────────────────────────────
  const phase = isPreLaunch        ? 'pre-launch'
    : isComplete                   ? 'complete'
    : currentWeek.id === 1         ? 'week-1'
    : currentWeek.id === 2         ? 'week-2'
    : currentWeek.id === 3         ? 'week-3'
    : 'week-4';

  // ── Today's gate from DB ───────────────────────────────────
  const { data: todayGate } = await supabase
    .from('gates')
    .select('id, day, label, pct, description')
    .eq('day', day)
    .maybeSingle();

  // ── Human-readable labels ──────────────────────────────────
  const monthName = MONTH_NAMES[month];
  const nextMonthName = MONTH_NAMES[nextMonth];

  return NextResponse.json({
    // Time
    now:                    nowUTC.toISOString(),
    now_est:                nowEST.toISOString(),

    // Challenge position
    day,
    week:                   currentWeek.id,
    week_name:              currentWeek.name,
    week_emoji:             currentWeek.emoji,
    week_theme:             currentWeek.theme,
    phase,

    // Cohort
    cohort:                 cohortId,
    month:                  monthName,
    year,
    days_in_month:          daysInMonth,

    // State flags
    is_active:              isActive,
    is_pre_launch:          isPreLaunch,
    is_complete:            isComplete,

    // Countdown
    days_left_in_week:      daysLeftInWeek,
    days_left_in_challenge: daysLeftInChallenge,

    // Date ranges
    week_start:             weekStartDate.toISOString().split('T')[0],
    week_end:               weekEndDate.toISOString().split('T')[0],
    challenge_start:        challengeStart.toISOString().split('T')[0],
    challenge_end:          challengeEnd.toISOString().split('T')[0],
    next_cohort_start:      nextCohortStart.toISOString().split('T')[0],
    next_cohort:            `${nextMonthName.toLowerCase()}-${nextYear}`,

    // Today's task
    today_gate:             todayGate ?? null,
  }, { headers: CORS });
}
