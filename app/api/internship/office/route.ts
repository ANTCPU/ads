// ============================================================
// app/api/internship/office/route.ts
// GET  — fetch room messages (?cohort=&room=&limit=)
// POST — send a message to a room
//
// Rooms: general, dev, marketing, standups
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

const VALID_ROOMS   = new Set(['general', 'dev', 'marketing', 'standups']);
const SYSTEM_TYPES  = new Set(['system', 'cpu', 'herald', 'admin']);
const MAX_LENGTH    = 500;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT     = 100;

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

    if (!cohort) {
      return NextResponse.json(
        { error: 'cohort required' },
        { status: 400, headers: CORS }
      );
    }

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
      .eq('cohort', cohort)
      .eq('room', room)
      .order('created_at', { ascending: false })
      .limit(limit);

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
    // Accept handle via author_id OR intern_id — either works
    const lookup = intern_id || author_id;

    if (!cohort) {
      return NextResponse.json(
        { error: 'cohort required' },
        { status: 400, headers: CORS }
      );
    }
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
    // Status filter removed — mentors + leads must post too
    const isInternId = lookup.startsWith('intern-');
    const { data: challenger } = await supabase
      .from('challengers')
      .select('id, intern_id, first_name, handle, track, cohort, flag')
      .eq(isInternId ? 'intern_id' : 'handle', lookup)
      .maybeSingle();

    if (!challenger) {
      return NextResponse.json(
        { error: 'Challenger not found' },
        { status: 404, headers: CORS }
      );
    }

    // ── Cohort check — can only post in your own cohort ───────
    if (challenger.cohort !== cohort) {
      return NextResponse.json(
        { error: 'Cohort mismatch' },
        { status: 403, headers: CORS }
      );
    }

    // ── Track room check — dev room = dev track only ──────────
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

    // ── Sanitise content ──────────────────────────────────────
    const cleanContent = String(content).trim().slice(0, MAX_LENGTH);

    // ── Insert ────────────────────────────────────────────────
    const { data: message, error: insertError } = await supabase
      .from('office_messages')
      .insert({
        cohort:      cohort,
        room:        cleanRoom,
        author_id:   challenger.intern_id,
        author_name: challenger.handle ?? challenger.first_name ?? lookup,
        author_type: 'challenger',
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
