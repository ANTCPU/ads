// app/api/badges/award/route.ts
// ─── Badge Award API ──────────────────────────────────────────────────────────
// Called from client components after first-time actions.
// Idempotent — safe to call multiple times, never duplicates.
// Only awards Tier 2 action badges — never Tier 4 (admin-only).
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { awardBadge, BadgeSlug }     from '../../../lib/badges';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Only these slugs are awardable from the client
const ALLOWED: BadgeSlug[] = [
  'first-share',
  'first-like',
  'first-boost',
  'first-click',
  'first-reaction',
];

export async function POST(req: NextRequest) {
  try {
    const { email, slug } = await req.json();

    if (!email || !slug)
      return NextResponse.json({ error: 'email and slug required' }, { status: 400 });

    if (!ALLOWED.includes(slug as BadgeSlug))
      return NextResponse.json({ error: 'slug not awardable from client' }, { status: 403 });

    const awarded = await awardBadge(supabase, email, slug as BadgeSlug, 'system');

    return NextResponse.json({ ok: true, awarded, slug });
  } catch {
    return NextResponse.json({ error: 'internal error' }, { status: 500 });
  }
}
