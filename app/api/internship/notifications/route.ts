// app/api/internship/notifications/route.ts
// GET   ?email= or ?intern_id=  → unread count + list
// PATCH ?id=                    → mark single notification read
// PATCH ?email= or ?intern_id=  → mark all read for challenger
//
// v2 (Oct 2026):
// — PATCH mark-all: intern_id support added
//   fixes chat.js mark-all call which passes intern_id not email
// — PATCH mark-all: accepts email OR intern_id OR both
// — File 1 (app/api/notifications/route.ts) deprecated → redirects here
// ─────────────────────────────────────────────────────────────────────────────

import { createClient }             from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'no-store, max-age=0',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

/* ── GET ─────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const email     = searchParams.get('email')     || null;
    const intern_id = searchParams.get('intern_id') || null;
    const unread    = searchParams.get('unread')    === 'true';
    const limit     = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    if (!email && !intern_id) {
      return NextResponse.json(
        { error: 'email or intern_id required' },
        { status: 400, headers: CORS }
      );
    }

    let query = supabase
      .from('notifications')
      .select('id, type, title, message, link, read, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Match by intern_id OR email — whichever is provided, prefer both
    if (email && intern_id) {
      query = query.or(`email.eq.${email},intern_id.eq.${intern_id}`);
    } else if (email) {
      query = query.eq('email', email);
    } else {
      query = query.eq('intern_id', intern_id!);
    }

    if (unread) query = query.eq('read', false);

    const { data, error } = await query;

    if (error)
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: CORS }
      );

    const notifications = data || [];
    const unreadCount   = notifications.filter(n => !n.read).length;

    return NextResponse.json(
      { notifications, unread: unreadCount, total: notifications.length },
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

/* ── PATCH ───────────────────────────────────────────── */

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const id        = searchParams.get('id')        || null;
    const email     = searchParams.get('email')     || null;
    const intern_id = searchParams.get('intern_id') || null;

    // ── Mark single notification read ─────────────────────
    if (id) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error)
        return NextResponse.json(
          { error: error.message },
          { status: 500, headers: CORS }
        );

      return NextResponse.json({ ok: true, marked: 'single' }, { headers: CORS });
    }

    // ── Mark all read — email OR intern_id OR both ─────────
    // v2: intern_id support added — chat.js passes intern_id not email
    if (email || intern_id) {
      let query = supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false);

      if (email && intern_id) {
        // Both provided — use OR to catch rows matched by either
        query = query.or(`email.eq.${email},intern_id.eq.${intern_id}`);
      } else if (email) {
        query = query.eq('email', email);
      } else {
        query = query.eq('intern_id', intern_id!);
      }

      const { error } = await query;

      if (error)
        return NextResponse.json(
          { error: error.message },
          { status: 500, headers: CORS }
        );

      return NextResponse.json({ ok: true, marked: 'all' }, { headers: CORS });
    }

    return NextResponse.json(
      { error: 'id, email, or intern_id required' },
      { status: 400, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}
