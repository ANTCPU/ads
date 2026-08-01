// app/api/profile/og/route.ts
// Returns current og_image_url for a given email.

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ og_image_url: null });

  const { data } = await supabase
    .from('ad_profiles')
    .select('og_image_url')
    .eq('email', email.trim().toLowerCase())
    .maybeSingle();

  return NextResponse.json({ og_image_url: data?.og_image_url ?? null });
}
