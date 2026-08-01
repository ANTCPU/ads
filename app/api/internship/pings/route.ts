// ============================================================
// app/api/internship/pings/route.ts
// GET  — Returns ping log for admin activity view
// POST — Saves any ping event (admin_visit, step events)
// Called by: antcpu.io/admin/ on every page load
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyDiscord } from '../../../lib/discord';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin': 'https://antcpu.io',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('pings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) throw error;
    return NextResponse.json(
      { pings: data ?? [] },
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

export async function POST(req: NextRequest) {
  try {
    const {
      event, email, firstName,
      country, track, step,
      sessionId, userAgent, referrer,
    } = await req.json();

    await supabase.from('pings').insert({
      event:      event      ?? step ?? 'unknown',
      email:      email      ?? null,
      first_name: firstName  ?? null,
      country:    country    ?? null,
      track:      track      ?? null,
      step:       String(step ?? ''),
      session_id: sessionId  ?? null,
      user_agent: userAgent  ?? null,
      referrer:   referrer   ?? null,
    });

    // Discord alert when someone finds the admin URL
    if (event === 'admin_visit') {
      await notifyDiscord(
        `👀 **Admin page visited**\n` +
        `🌐 Referrer: ${referrer || 'direct'}\n` +
        `🖥 UA: ${userAgent?.slice(0, 80) ?? '—'}`,
        'internship'
      );
    }

    return NextResponse.json({ ok: true }, { headers: CORS });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}
