import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Look up ad by full ID or first 8 chars
  const { data } = await supabase
    .from('ads')
    .select('id, brand, url')
    .or(`id.eq.${id},id.ilike.${id}%`)
    .eq('status', 'active')
    .limit(1)
    .single();

  if (!data) {
    return NextResponse.redirect('https://antcpu-ads.vercel.app/arena');
  }

  // Count as a share click
  await supabase
    .from('ads')
    .update({ click_count: supabase.rpc('increment', { row_id: data.id }) })
    .eq('id', data.id);

  // Build brand slug and redirect to brand arena anchored to the ad
  const brandSlug = data.brand.toLowerCase().replace(/[^a-z0-9]/g, '');
  const destination = `https://antcpu-ads.vercel.app/arena/${brandSlug}#ad-${data.id}`;

  return NextResponse.redirect(destination, { status: 302 });
}
