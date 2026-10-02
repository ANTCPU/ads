// ============================================================
// /api/auth/access/route.js
//
// GET /api/auth/access?email=melshoshani@gmail.com
//
// The master access key for the entire antcpu platform.
// Every dashboard — admin, arena, internship, observer —
// calls this once on load to know what to show.
//
// Returns:
//   - Who they are
//   - What they can access
//   - What scope they're limited to
//   - Live context for their role (arena stats, challengers)
//
// Used by:
//   - antcpu.com(owner)
//   - antcpu.io
//   - antcpu-ads.vercel.app
// ============================================================

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Arena stats API — already live
const ARENA_STATS_URL =
  'https://antcpu-ads.vercel.app/api/stats';

// Challengers API — already live
const CHALLENGERS_URL =
  'https://antcpu-ads.vercel.app/api/internship/challengers?view=public';

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email')?.toLowerCase().trim();

  if (!email) {
    return Response.json(
      { ok: false, error: 'email required' },
      { status: 400 }
    );
  }

  // ── 1. LOOK UP ACCESS RECORD ──────────────────────────────
  const { data: user, error } = await supabase
    .from('antcpu_users')
    .select(`
      id, email, name, access_level, status,
      can_access_admin, can_access_arena,
      can_access_internship, can_access_edu,
      track_scope, cohort_scope,
      brand_name, brand_role,
      intern_id, ad_signup_id,
      notes, created_at,
      granted_by (
        id, name, email, access_level
      )
    `)
    .eq('email', email)
    .eq('status', 'active')
    .single();

  if (error || !user) {
    return Response.json(
      { ok: false, error: 'no access record', access_level: 'none' },
      { status: 404 }
    );
  }

  // ── 2. BUILD BASE ACCESS OBJECT ───────────────────────────
  const access = {
    ok:           true,
    id:           user.id,
    email:        user.email,
    name:         user.name,
    access_level: user.access_level,

    // Role flags — clean booleans for any dashboard
    is_owner:       user.access_level === 'owner',
    is_staff:       ['owner', 'staff'].includes(user.access_level),
    is_observer:    user.access_level === 'staff',
    is_brand_admin: user.access_level === 'brand_admin',
    is_alumni:      user.access_level === 'alumni',
    is_user:        user.access_level === 'user',

    // System access flags
    can: {
      admin:      user.can_access_admin      || false,
      arena:      user.can_access_arena      || false,
      internship: user.can_access_internship || false,
      edu:        user.can_access_edu        || false
    },

    // Scope — null means all
    scope: {
      track:  user.track_scope  || 'all',
      cohort: user.cohort_scope || 'all'
    },

    // Affiliations
    brand:      user.brand_name  || null,
    brand_role: user.brand_role  || null,
    intern_id:  user.intern_id   || null,

    // Who granted access
    granted_by: user.granted_by
      ? { name: user.granted_by.name, email: user.granted_by.email }
      : null,

    // Context — populated below based on access level
    context: {}
  };

  // ── 3. LOAD LIVE CONTEXT BY ROLE ──────────────────────────
  // Parallel fetch — only what their role needs
  const contextFetches = [];

  // Arena stats — for owner + anyone with arena access
  if (access.can.arena) {
    contextFetches.push(
      fetch(ARENA_STATS_URL)
        .then(r => r.json())
        .then(stats => ({ type: 'arena', stats }))
        .catch(() => ({ type: 'arena', stats: null }))
    );
  }

  // Challengers — for owner + staff + observers
  if (access.can.internship && access.is_staff) {
    contextFetches.push(
      fetch(CHALLENGERS_URL)
        .then(r => r.json())
        .then(data => {
          let challengers = data.challengers || [];

          // Scope filter — Mohamed only sees marketing
          if (access.scope.track !== 'all') {
            challengers = challengers.filter(
              c => c.track === access.scope.track);
          }
          // Cohort filter
          if (access.scope.cohort !== 'all') {
            challengers = challengers.filter(
              c => c.cohort === access.scope.cohort);
          }

          return { type: 'challengers', challengers };
        })
        .catch(() => ({ type: 'challengers', challengers: [] }))
    );
  }

  // Brand context — for brand_admin + staff with brand affiliation
  if (access.brand && access.can.arena) {
    contextFetches.push(
      supabase
        .from('ad_signups')
        .select('id, name, email, brand_name, status, points, created_at')
        .eq('brand_name', access.brand)
        .then(({ data }) => ({
          type: 'brand_team',
          team: data || []
        }))
        .catch(() => ({ type: 'brand_team', team: [] }))
    );
  }

  // Challenger record — for alumni + active challengers
  if (access.intern_id) {
    contextFetches.push(
      supabase
        .from('challengers')
        .select(`
          intern_id, first_name, last_name, track,
          progress_pct, role_title, completed_gates,
          badges, cohort, status
        `)
        .eq('intern_id', access.intern_id)
        .single()
        .then(({ data }) => ({ type: 'challenger', challenger: data }))
        .catch(() => ({ type: 'challenger', challenger: null }))
    );
  }

  // ── 4. RESOLVE CONTEXT ────────────────────────────────────
  const results = await Promise.all(contextFetches);

  results.forEach(result => {
    switch (result.type) {
      case 'arena':
        access.context.arena = result.stats
          ? {
              ads_live:      result.stats.totalAds,
              brands:        result.stats.totalBrands,
              countries:     result.stats.totalCountries,
              total_points:  result.stats.totalPoints,
              top_brand:     result.stats.topBrand,
              top_brands:    result.stats.topBrands?.slice(0, 3),
              // Brand-specific stats if scoped
              brand_stats: access.brand
                ? result.stats.topBrands?.find(
                    b => b.brand === access.brand) || null
                : null
            }
          : null;
        break;

      case 'challengers':
        access.context.challengers = {
          total:    result.challengers.length,
          list:     result.challengers,
          by_track: {
            dev:       result.challengers.filter(c => c.track === 'dev'),
            marketing: result.challengers.filter(c => c.track === 'marketing')
          },
          // Who's moved past d1
          active:   result.challengers.filter(
            c => (c.completed_gates || []).length > 1),
          // Still at d1 only
          stalled:  result.challengers.filter(
            c => (c.completed_gates || []).length <= 1)
        };
        break;

      case 'brand_team':
        access.context.brand_team = result.team;
        break;

      case 'challenger':
        access.context.challenger = result.challenger;
        break;
    }
  });

  // ── 5. DASHBOARD ROUTING HINT ─────────────────────────────
  // Tells the frontend which dashboard to render
  // so no page needs its own routing logic
  access.dashboard = (() => {
    if (access.is_owner)       return '/admin/dashboard/';
    if (access.is_observer)    return '/admin/observer/';
    if (access.is_brand_admin) return '/brand/dashboard/';
    if (access.is_alumni)      return '/dashboard/';
    return '/dashboard/';
  })();

  return Response.json(access);
}
