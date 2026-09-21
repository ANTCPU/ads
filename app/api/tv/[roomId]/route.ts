// app/api/tv/[roomId]/route.ts
// ─── TV Room API ──────────────────────────────────────────────────────────────
//
// GET   — fetch single studio by roomId
// PATCH — update studio (emoji only — no status in DB)
// DELETE — remove studio (brand owner or super only)
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    const { data, error } = await supabase
      .from('tv_studios')
      .select('*')
      .eq('room_id', roomId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }

    return NextResponse.json({ studio: data });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body       = await req.json().catch(() => ({}));
    const { emoji }  = body;

    const updates: Record<string, string> = {};
    if (emoji) updates.emoji = emoji;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('tv_studios')
      .update(updates)
      .eq('room_id', roomId)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ studio: data });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body       = await req.json().catch(() => ({}));
    const { email }  = body;

    if (!email) {
      return NextResponse.json({ error: 'email required' }, { status: 400 });
    }

    // Verify ownership — brand_name must match email's brand
    // Super admins can delete any studio
    const { data: studio } = await supabase
      .from('tv_studios')
      .select('id, brand_name')
      .eq('room_id', roomId)
      .maybeSingle();

    if (!studio) {
      return NextResponse.json({ error: 'Studio not found' }, { status: 404 });
    }

    // Check if requester owns this brand
    const { data: signup } = await supabase
      .from('ad_signups')
      .select('brand_name, role')
      .eq('email', email)
      .maybeSingle();

    const isOwner = signup?.brand_name?.toLowerCase() === studio.brand_name.toLowerCase();
    const isSuper = signup?.role === 'super';

    if (!isOwner && !isSuper) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await supabase.from('tv_studios').delete().eq('room_id', roomId);

    return NextResponse.json({ ok: true, deleted: roomId });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
