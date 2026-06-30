import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  const { data } = await supabase
    .from('ad_signups')
    .select('country')
    .not('country', 'is', null)
    .neq('country', '');

  if (!data) return NextResponse.json({ counts: [] });

  const counts: Record<string, number> = {};
  data.forEach((row: { country: string }) => {
    const c = row.country.trim();
    counts[c] = (counts[c] || 0) + 1;
  });

  const sorted = Object.entries(counts)
    .map(([country, count]) => ({ country, count }))
    .sort((a, b) => b.count - a.count);

  return NextResponse.json({ counts: sorted, total: data.length });
}
