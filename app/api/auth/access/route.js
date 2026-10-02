import { createClient } from '@supabase/supabase-js';

export async function GET(req) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY
  );

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email')?.toLowerCase().trim();

  const { data, error } = await supabase
    .from('antcpu_users')
    .select('email, access_level')
    .limit(3);

  return Response.json({
    email_requested: email,
    url_set: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    key_set: !!process.env.SUPABASE_SECRET_KEY,
    rows: data,
    error: error?.message || null
  });
}
