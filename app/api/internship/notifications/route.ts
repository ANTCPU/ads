// app/api/internship/notifications/route.ts
// GET  ?email= or ?intern_id=  → unread count + list
// PATCH ?id=                   → mark single read
// PATCH ?email= (body: all)    → mark all read
// ─────────────────────────────────────────────────────

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

    // Match by email OR intern_id — whichever is provided
    if (email && intern_id) {
      query = query.or(`email.eq.${email},intern_id.eq.${intern_id}`);
    } else if (email) {
      query = query.eq('email', email);
    } else {
      query = query.eq('intern_id', intern_id!);
    }

    // Unread only filter
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
    const id    = searchParams.get('id')    || null;
    const email = searchParams.get('email') || null;

    // Mark single notification read
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

    // Mark all read for email
    if (email) {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('email', email)
        .eq('read', false);

      if (error)
        return NextResponse.json(
          { error: error.message },
          { status: 500, headers: CORS }
        );

      return NextResponse.json({ ok: true, marked: 'all' }, { headers: CORS });
    }

    return NextResponse.json(
      { error: 'id or email required' },
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
