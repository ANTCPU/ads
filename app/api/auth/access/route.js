import { createClient } from '@supabase/supabase-js';

export async function GET(req) {

  // Inside handler — not module level
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email')?.toLowerCase().trim();

  if (!email) {
    return Response.json(
      { ok: false, error: 'email required' },
      { status: 400 }
    );
  }

  // Look up access record — no nested select on granted_by
  const { data: user, error } = await supabase
    .from('antcpu_users')
    .select(
      'id, email, name, access_level, status, ' +
      'can_access_admin, can_access_arena, ' +
      'can_access_internship, can_access_edu, ' +
      'track_scope, cohort_scope, ' +
      'brand_name, brand_role, ' +
      'intern_id, ad_signup_id, ' +
      'notes, granted_by'
    )
    .eq('email', email)
    .eq('status', 'active')
    .single();

  if (error || !user) {
    return Response.json(
      { ok: false, error: 'no access record', access_level: 'none' },
      { status: 404 }
    );
  }

  // Resolve granted_by name separately if needed
  let grantedByName = null;
  if (user.granted_by) {
    const { data: grantor } = await supabase
      .from('antcpu_users')
      .select('name, email')
      .eq('id', user.granted_by)
      .single();
    if (grantor) grantedByName = grantor.name;
  }

  const access = {
    ok:           true,
    id:           user.id,
    email:        user.email,
    name:         user.name,
    access_level: user.access_level,
    is_owner:       user.access_level === 'owner',
    is_staff:       ['owner','staff'].includes(user.access_level),
    is_observer:    user.access_level === 'staff',
    is_brand_admin: user.access_level === 'brand_admin',
    is_alumni:      user.access_level === 'alumni',
    is_user:        user.access_level === 'user',
    can: {
      admin:      user.can_access_admin      || false,
      arena:      user.can_access_arena      || false,
      internship: user.can_access_internship || false,
      edu:        user.can_access_edu        || false
    },
    scope: {
      track:  user.track_scope  || 'all',
      cohort: user.cohort_scope || 'all'
    },
    brand:      user.brand_name || null,
    brand_role: user.brand_role || null,
    intern_id:  user.intern_id  || null,
    granted_by: grantedByName,
    context:    {}
  };

  // Parallel context fetches
  const fetches = [];

  if (access.can.arena) {
    fetches.push(
      fetch('https://antcpu-ads.vercel.app/api/stats')
        .then(r => r.json())
        .then(s => ({ type: 'arena', data: s }))
        .catch(() => ({ type: 'arena', data: null }))
    );
  }

  if (access.can.internship && access.is_staff) {
    fetches.push(
      fetch('https://antcpu-ads.vercel.app/api/internship/challengers?view=public')
        .then(r => r.json())
        .then(d => {
          let list = d.challengers || [];
          if (access.scope.track  !== 'all')
            list = list.filter(c => c.track  === access.scope.track);
          if (access.scope.cohort !== 'all')
            list = list.filter(c => c.cohort === access.scope.cohort);
          return { type: 'challengers', data: list };
        })
        .catch(() => ({ type: 'challengers', data: [] }))
    );
  }

  if (access.brand && access.can.arena) {
    fetches.push(
      supabase
        .from('ad_signups')
        .select('id, name, email, brand_name, status, points, created_at')
        .eq('brand_name', access.brand)
        .then(({ data }) => ({ type: 'brand_team', data: data || [] }))
        .catch(() => ({ type: 'brand_team', data: [] }))
    );
  }

  if (access.intern_id) {
    fetches.push(
      supabase
        .from('challengers')
        .select(
          'intern_id, first_name, last_name, track, ' +
          'progress_pct, role_title, completed_gates, ' +
          'badges, cohort, status'
        )
        .eq('intern_id', access.intern_id)
        .single()
        .then(({ data }) => ({ type: 'challenger', data }))
        .catch(() => ({ type: 'challenger', data: null }))
    );
  }

  const results = await Promise.all(fetches);

  results.forEach(r => {
    switch (r.type) {
      case 'arena':
        access.context.arena = r.data ? {
          ads_live:     r.data.totalAds,
          brands:       r.data.totalBrands,
          countries:    r.data.totalCountries,
          total_points: r.data.totalPoints,
          top_brand:    r.data.topBrand,
          top_brands:   r.data.topBrands?.slice(0, 3),
          brand_stats:  access.brand
            ? r.data.topBrands?.find(b => b.brand === access.brand) || null
            : null
        } : null;
        break;
      case 'challengers':
        access.context.challengers = {
          total:    r.data.length,
          list:     r.data,
          by_track: {
            dev:       r.data.filter(c => c.track === 'dev'),
            marketing: r.data.filter(c => c.track === 'marketing')
          },
          active:  r.data.filter(c => (c.completed_gates||[]).length > 1),
          stalled: r.data.filter(c => (c.completed_gates||[]).length <= 1)
        };
        break;
      case 'brand_team':
        access.context.brand_team = r.data;
        break;
      case 'challenger':
        access.context.challenger = r.data;
        break;
    }
  });

  access.dashboard =
    access.is_owner       ? '/admin/dashboard/' :
    access.is_observer    ? '/admin/observer/'  :
    access.is_brand_admin ? '/brand/dashboard/' :
                            '/dashboard/';

  return Response.json(access);
}
