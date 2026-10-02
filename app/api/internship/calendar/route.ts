// ============================================================
// https://antcpu-ads.vercel.app/app/api/internship/calendar/route.ts
// GET — Challenge calendar state
// Fully dynamic — derives cohort from current month automatically
// No hardcoded dates — works for any month forever
// Called by: all pages, all API routes, config.js
//
// v2 — Oct 2026
// + Cache-Control: no-store (fixes Vercel CDN caching bug)
// + DST-aware EST/EDT timezone
// + week_gates — all gates for current week in one call
// + challenger_count — live cohort size from DB
// + prev_cohort — for showcase/graduate pages
// + day_of_week — for community session display
// + hours_until_next_day — for dashboard countdown
// + parallel DB calls — gates + challengers fetched simultaneously
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

// No-cache headers — prevents Vercel CDN from serving stale day/week
const NO_CACHE = {
  'Cache-Control': 'no-store, max-age=0',
};

const RESPONSE_HEADERS = { ...CORS, ...NO_CACHE };

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: RESPONSE_HEADERS });
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

const DAY_NAMES = [
  'Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'
];

// ── DST-aware EST/EDT offset ───────────────────────────────────
// EST = UTC-5 (Nov–Mar), EDT = UTC-4 (Mar–Nov)
// Uses US DST rules: starts 2nd Sun in March, ends 1st Sun in November
function getESTOffset(date: Date): number {
  const year = date.getUTCFullYear();

  // 2nd Sunday in March
  const marchFirst  = new Date(Date.UTC(year, 2, 1));
  const marchOffset = (7 - marchFirst.getUTCDay()) % 7;
  const dstStart    = new Date(Date.UTC(year, 2, 1 + marchOffset + 7, 7, 0, 0));

  // 1st Sunday in November
  const novFirst  = new Date(Date.UTC(year, 10, 1));
  const novOffset = (7 - novFirst.getUTCDay()) % 7;
  const dstEnd    = new Date(Date.UTC(year, 10, 1 + novOffset, 6, 0, 0));

  const isEDT = date >= dstStart && date < dstEnd;
  return isEDT ? -4 * 60 * 60 * 1000 : -5 * 60 * 60 * 1000;
}

export async function GET(req: NextRequest) {

  // ── Current time ──────────────────────────────────────────
  const nowUTC       = new Date();
  const tzOffset     = getESTOffset(nowUTC);
  const nowEST       = new Date(nowUTC.getTime() + tzOffset);

  // ── Derive cohort from current month ──────────────────────
  const year  = nowEST.getUTCFullYear();
  const month = nowEST.getUTCMonth(); // 0-indexed

  // Challenge runs 1st → last day of current month (midnight EST)
  const challengeStart = new Date(Date.UTC(year, month,     1, Math.abs(tzOffset / 3600000), 0, 0));
  const challengeEnd   = new Date(Date.UTC(year, month + 1, 1, Math.abs(tzOffset / 3600000), 0, 0) - 1);

  // Previous cohort
  const prevYear  = month === 0 ? year - 1 : year;
  const prevMonth = month === 0 ? 11 : month - 1;

  // Next cohort
  const nextYear  = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;

  const nextCohortStart = new Date(Date.UTC(nextYear,  nextMonth, 1, Math.abs(tzOffset / 3600000), 0, 0));
  const prevCohortStart = new Date(Date.UTC(prevYear,  prevMonth, 1, Math.abs(tzOffset / 3600000), 0, 0));

  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Cohort IDs
  const cohortId   = `${MONTH_NAMES[month].toLowerCase()}-${year}`;
  const nextCohort = `${MONTH_NAMES[nextMonth].toLowerCase()}-${nextYear}`;
  const prevCohort = `${MONTH_NAMES[prevMonth].toLowerCase()}-${prevYear}`;

  // ── Calculate challenge day ────────────────────────────────
  const msPerDay    = 86400000;
  const isPreLaunch = nowUTC < challengeStart;
  const isComplete  = nowUTC >= challengeEnd;
  const isActive    = !isPreLaunch && !isComplete;

  const rawDay = Math.floor(
    (nowUTC.getTime() - challengeStart.getTime()) / msPerDay
  ) + 1;

  const day = isPreLaunch ? 0
    : isComplete          ? daysInMonth
    : Math.min(Math.max(rawDay, 1), daysInMonth);

  // ── Day of week ────────────────────────────────────────────
  const dayOfWeek = DAY_NAMES[nowEST.getUTCDay()];

  // ── Hours until next day flips ─────────────────────────────
  const nextDayStart = new Date(challengeStart.getTime() + day * msPerDay);
  const hoursUntilNextDay = Math.max(
    Math.ceil((nextDayStart.getTime() - nowUTC.getTime()) / 3600000), 0
  );

  // ── Calculate week ─────────────────────────────────────────
  const currentWeek = WEEKS.find(w => day >= w.start && day <= w.end)
    ?? (day === 0 ? WEEKS[0] : WEEKS[3]);

  // ── Days remaining ─────────────────────────────────────────
  const daysLeftInWeek      = Math.max(currentWeek.end - day, 0);
  const daysLeftInChallenge = Math.max(
    Math.floor((challengeEnd.getTime() - nowUTC.getTime()) / msPerDay), 0
  );

  // ── Week date range ────────────────────────────────────────
  const weekStartDate = new Date(Date.UTC(year, month, currentWeek.start, Math.abs(tzOffset / 3600000), 0, 0));
  const weekEndDate   = new Date(Date.UTC(year, month, currentWeek.end,   Math.abs(tzOffset / 3600000), 0, 0));

  // ── Phase ──────────────────────────────────────────────────
  const phase = isPreLaunch    ? 'pre-launch'
    : isComplete               ? 'complete'
    : currentWeek.id === 1     ? 'week-1'
    : currentWeek.id === 2     ? 'week-2'
    : currentWeek.id === 3     ? 'week-3'
    : 'week-4';

  // ── Parallel DB calls ──────────────────────────────────────
  // Fetch today's gate, current week's gates, and cohort size simultaneously
  const [
    { data: todayGate },
    { data: weekGates },
    { count: challengerCount },
  ] = await Promise.all([

    // Today's gate
    supabase
      .from('gates')
      .select('id, day, label, pct, description, edu_url_dev, edu_url_marketing, arena_url_dev, arena_url_marketing')
      .eq('day', day)
      .maybeSingle(),

    // All gates for current week
    supabase
      .from('gates')
      .select('id, day, week, label, pct, track, locked, edu_url_dev, edu_url_marketing, arena_url_dev, arena_url_marketing')
      .eq('week', currentWeek.id)
      .order('day', { ascending: true }),

    // Active challengers this cohort
    supabase
      .from('challengers')
      .select('*', { count: 'exact', head: true })
      .eq('cohort', cohortId)
      .eq('status', 'active'),
  ]);

  // ── Human-readable labels ──────────────────────────────────
  const monthName     = MONTH_NAMES[month];
  const nextMonthName = MONTH_NAMES[nextMonth];
  const prevMonthName = MONTH_NAMES[prevMonth];

  return NextResponse.json({

    // ── Time ──────────────────────────────────────────────────
    now:                    nowUTC.toISOString(),
    now_est:                nowEST.toISOString(),
    day_of_week:            dayOfWeek,
    hours_until_next_day:   hoursUntilNextDay,

    // ── Challenge position ────────────────────────────────────
    day,
    week:                   currentWeek.id,
    week_name:              currentWeek.name,
    week_emoji:             currentWeek.emoji,
    week_theme:             currentWeek.theme,
    phase,

    // ── Cohort ────────────────────────────────────────────────
    cohort:                 cohortId,
    month:                  monthName,
    year,
    days_in_month:          daysInMonth,
    challenger_count:       challengerCount ?? 0,

    // ── State flags ───────────────────────────────────────────
    is_active:              isActive,
    is_pre_launch:          isPreLaunch,
    is_complete:            isComplete,

    // ── Countdown ─────────────────────────────────────────────
    days_left_in_week:      daysLeftInWeek,
    days_left_in_challenge: daysLeftInChallenge,

    // ── Date ranges ───────────────────────────────────────────
    week_start:             weekStartDate.toISOString().split('T')[0],
    week_end:               weekEndDate.toISOString().split('T')[0],
    challenge_start:        challengeStart.toISOString().split('T')[0],
    challenge_end:          challengeEnd.toISOString().split('T')[0],

    // ── Cohort navigation ─────────────────────────────────────
    next_cohort:            nextCohort,
    next_cohort_start:      nextCohortStart.toISOString().split('T')[0],
    prev_cohort:            prevCohort,
    prev_cohort_start:      prevCohortStart.toISOString().split('T')[0],

    // ── Gates ─────────────────────────────────────────────────
    today_gate:             todayGate  ?? null,
    week_gates:             weekGates  ?? [],

  }, { headers: RESPONSE_HEADERS });
}
