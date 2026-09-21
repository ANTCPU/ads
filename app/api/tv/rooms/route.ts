// app/api/tv/rooms/route.ts
// ─── TV Studios API ───────────────────────────────────────────────────────────
//
// GET  — list all studios (public room browser)
// POST — create a new studio for a brand
//
// Table: tv_studios
//   id          uuid
//   brand_name  text
//   room_id     text
//   emoji       text  default ⚡
//   studio_url  text  — /tv/[roomId]?mode=broadcast
//   watch_url   text  — /tv/[roomId]?mode=watch
//   created_at  timestamptz
//
// room_id format: [brand-slug]-[8 random chars]
// No status column — live/offline is UI-only (no DB polling)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nanoid(len = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 24);
}

// ─── GET — list all studios ───────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const brand = req.nextUrl.searchParams.get('brand');

    let query = supabase
      .from('tv_studios')
      .select('*')
      .order('created_at', { ascending: false });

    if (brand) {
      query = query.ilike('brand_name', `%${brand}%`);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      studios: data || [],
      count:   (data || []).length,
    }, {
      headers: { 'Cache-Control': 'no-store' },
    });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST — create studio ─────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { brand_name, emoji } = body;

    if (!brand_name?.trim()) {
      return NextResponse.json(
        { error: 'brand_name is required' },
        { status: 400 }
      );
    }

    const brand     = brand_name.trim();
    const slug      = slugify(brand);
    const roomId    = `${slug}-${nanoid(8)}`;
    const studioUrl = `${APP_URL}/tv/${roomId}?mode=broadcast`;
    const watchUrl  = `${APP_URL}/tv/${roomId}?mode=watch`;

    // Check if brand already has a studio
    const { data: existing } = await supabase
      .from('tv_studios')
      .select('id, room_id, studio_url, watch_url')
      .ilike('brand_name', brand)
      .maybeSingle();

    if (existing) {
      // Return existing studio — one studio per brand
      return NextResponse.json({
        studio:   existing,
        created:  false,
        message:  'Studio already exists for this brand',
      });
    }

    // Insert new studio
    const { data, error } = await supabase
      .from('tv_studios')
      .insert([{
        brand_name:  brand,
        room_id:     roomId,
        emoji:       emoji || '⚡',
        studio_url:  studioUrl,
        watch_url:   watchUrl,
      }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      studio:  data,
      created: true,
    }, { status: 201 });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
