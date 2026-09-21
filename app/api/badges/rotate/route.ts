import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { rotateSingleHolderBadge }   from '../../../lib/badges';

// ─── POST /api/badges/rotate ──────────────────────────────────────────────────
// Rotates the featured-profile badge to a new holder.
// Removes from previous holder, awards to new.
// Called by: featured-candidates module "Set as Featured" button.
//
// Body: { email: string, awardedBy: string }
// Returns: { ok: true, revoked: string | null, awarded: boolean }
//
// Auth: service role — admin only. No public access.
// ─────────────────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const { email, awardedBy } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ ok: false, error: 'email required' }, { status: 400 });
    }

    const { revoked, awarded } = await rotateSingleHolderBadge(
      supabase,
      'featured-profile',
      email,
      awardedBy || 'admin',
    );

    return NextResponse.json({ ok: true, revoked, awarded });

  } catch (e: unknown) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'unknown' },
      { status: 500 }
    );
  }
}
