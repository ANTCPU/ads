// ============================================================
// app/api/internship/office/route.ts
// GET  — fetch room messages (?cohort=&room=&limit=)
// POST — send a message to a room
//
// Rooms: general, dev, marketing, standups, mentors
// Separate from community_posts — this is live room chat
// community_posts = async feed, day-gated
// office_messages = presence-aware room chat, always open
//
// Auth: handle OR intern_id validated against challengers table
// System posts: author_type = 'system' blocked on POST
//               written directly via SQL only
//
// v2 (Oct 2026) — accept handle OR intern_id on POST
//               — status filter removed for mentors + leads
// v3 (Nov 2026) — mentors room added to VALID_ROOMS
//               — cohort optional on GET (null = global)
//               — mentor/guest author_type bypass cohort check
//               — author_type no longer hardcoded to 'challenger'
//               — mentors room read-only for challengers
//               — rate limit: 30s between messages per author
//               — paused/stalled accounts blocked from posting
// ============================================================

import { createClient }              from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'no-store, max-age=0',
};

const VALID_ROOMS    = new Set(['general', 'dev', 'marketing', 'standups', 'mentors']);
const SYSTEM_TYPES   = new Set(['system', 'cpu', 'herald', 'admin']);
const ELEVATED_TYPES = new Set(['mentor', 'guest']);
const MAX_LENGTH     = 500;
const DEFAULT_LIMIT  = 50;
const MAX_LIMIT      = 100;
const RATE_LIMIT_MS  = 30000; // 30 seconds between messages

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ── GET — fetch messages for a room ───────────────────────────
export async function GET(req: NextRequest) {
  try {
    const params = req.nextUrl.searchParams;
    const cohort = params.get('cohort') || null;
    const room   = params.get('room')   || 'general';
    const limit  = Math.min(
      parseInt(params.get('limit') || String(DEFAULT_LIMIT)),
      MAX_LIMIT
    );
    const before = params.get('before') || null;

    if (!VALID_ROOMS.has(room)) {
      return NextResponse.json(
        { error: `room must be one of: ${[...VALID_ROOMS].join(', ')}` },
        { status: 400, headers: CORS }
      );
    }

    let query = supabase
      .from('office_messages')
      .select(`
        id,
        room,
        author_id,
        author_name,
        author_type,
        track,
        content,
        is_pinned,
        is_system,
        created_at
      `)
      .eq('room', room)
      .order('created_at', { ascending: false })
      .limit(limit);

    // cohort null = global — fetch across all cohorts
    if (cohort) {
      query = query.eq('cohort', cohort);
    }

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: CORS }
      );
    }

    const messages = (data ?? []).reverse();

    return NextResponse.json(
      {
        messages,
        room,
        cohort,
        count:    messages.length,
        has_more: messages.length === limit,
      },
      { headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}

// ── POST — send a message ─────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      cohort,
      room        = 'general',
      intern_id,
      author_id,
      content,
      author_type = 'challenger',
    } = body;

    // ── Validate required fields ──────────────────────────────
    const lookup = intern_id || author_id;

    if (!lookup) {
      return NextResponse.json(
        { error: 'intern_id or author_id required' },
        { status: 400, headers: CORS }
      );
    }

    if (!content || String(content).trim().length < 1) {
      return NextResponse.json(
        { error: 'content required' },
        { status: 400, headers: CORS }
      );
    }

    // ── Block system author types from client ─────────────────
    if (SYSTEM_TYPES.has(String(author_type).toLowerCase())) {
      return NextResponse.json(
        { error: 'Invalid author_type' },
        { status: 403, headers: CORS }
      );
    }

    // ── Validate room ─────────────────────────────────────────
    const cleanRoom = VALID_ROOMS.has(room) ? room : 'general';

    // ── Resolve challenger — accept handle OR intern_id ───────
    const isInternId = lookup.startsWith('intern-');
    const { data: challenger } = await supabase
      .from('challengers')
      .select('id, intern_id, first_name, handle, track, cohort, flag, profile_type, cutoff_status')
      .eq(isInternId ? 'intern_id' : 'handle', lookup)
      .maybeSingle();

    if (!challenger) {
      return NextResponse.json(
        { error: 'Challenger not found' },
        { status: 404, headers: CORS }
      );
    }

    // ── Block paused / stalled accounts ──────────────────────
    if (
      challenger.cutoff_status === 'paused' ||
      challenger.flag === 'stalled'
    ) {
      return NextResponse.json(
        { error: 'Your account is paused' },
        { status: 403, headers: CORS }
      );
    }

    // ── Elevated types — mentors + guests bypass cohort check ─
    const cleanType  = String(author_type).toLowerCase();
    const isElevated = ELEVATED_TYPES.has(cleanType) ||
                       ELEVATED_TYPES.has(String(challenger.profile_type ?? '').toLowerCase());

    // ── Mentors room — elevated only ──────────────────────────
    if (cleanRoom === 'mentors' && !isElevated) {
      return NextResponse.json(
        { error: 'Mentors room is read-only for challengers' },
        { status: 403, headers: CORS }
      );
    }

    // ── Cohort check — challengers post in own cohort only ────
    if (!isElevated && cohort && challenger.cohort !== cohort) {
      return NextResponse.json(
        { error: 'Cohort mismatch' },
        { status: 403, headers: CORS }
      );
    }

    // ── Track room check — dev/marketing are track-gated ─────
    if (!isElevated) {
      if (cleanRoom === 'dev' && challenger.track !== 'dev') {
        return NextResponse.json(
          { error: 'Dev room is for dev track only' },
          { status: 403, headers: CORS }
        );
      }
      if (cleanRoom === 'marketing' && challenger.track !== 'marketing') {
        return NextResponse.json(
          { error: 'Marketing room is for marketing track only' },
          { status: 403, headers: CORS }
        );
      }
    }

    // ── Rate limit — 30s between messages per author ─────────
    const { data: recent } = await supabase
      .from('office_messages')
      .select('id')
      .eq('author_id', challenger.intern_id)
      .gt('created_at', new Date(Date.now() - RATE_LIMIT_MS).toISOString())
      .limit(1)
      .maybeSingle();

    if (recent) {
      return NextResponse.json(
        { error: 'Slow down — wait 30 seconds between messages' },
        { status: 429, headers: CORS }
      );
    }

    // ── Sanitise content ──────────────────────────────────────
    const cleanContent = String(content).trim().slice(0, MAX_LENGTH);

    // ── Insert ────────────────────────────────────────────────
    const { data: message, error: insertError } = await supabase
      .from('office_messages')
      .insert({
        cohort:      cohort ?? challenger.cohort,
        room:        cleanRoom,
        author_id:   challenger.intern_id,
        author_name: challenger.handle ?? challenger.first_name ?? lookup,
        author_type: isElevated ? cleanType : 'challenger',
        track:       challenger.track ?? null,
        content:     cleanContent,
        is_pinned:   false,
        is_system:   false,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500, headers: CORS }
      );
    }

    return NextResponse.json(
      { ok: true, message },
      { status: 201, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('[internship/office] POST error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}
