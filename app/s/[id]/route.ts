import { createClient }              from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE = 'https://antcpu-ads.vercel.app';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id.length < 6) {
    return NextResponse.redirect(`${BASE}/arena`, { status: 302 });
  }

  // Look up ad by full UUID or short prefix — any status so archived links still work
  const { data, error } = await supabase
    .from('ads')
    .select('id, brand, url, status, click_count')
    .or(`id.eq.${id},id.ilike.${id}%`)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.redirect(`${BASE}/arena?ref=notfound`, { status: 302 });
  }

  // Increment click_count
  await supabase
    .from('ads')
    .update({ click_count: (data.click_count ?? 0) + 1 })
    .eq('id', data.id);

  // Redirect to ad permalink
  return NextResponse.redirect(`${BASE}/arena/${data.id}`, { status: 302 });
}
