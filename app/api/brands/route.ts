// app/api/brands/route.ts
// ─── Brands registry API ──────────────────────────────────────────────────────
// Public GET — returns all active brands from the brands table.
// Used by:
//   ArenaNav.tsx        → replaces ALL_BRANDS hardcode
//   ArenaClient.tsx     → replaces BRANDS registry hardcode
//   arena/[slug]/page.tsx → replaces SLUG_ALIAS + PUBLIC_OG_FALLBACK
//   Any external site   → brand directory
//
// CORS: open — readable by any external site
// Cache: 60s CDN edge — brands change rarely
//
// Response shape:
// {
//   brands: [{
//     id, name, slug, campaign, label, icon, color,
//     logo_url, site_url, tagline, og_image_url,
//     arena_url, dashboard_url, owner_email,
//     twitter, youtube, discord, telegram, active
//   }]
// }
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse, NextRequest } from 'next/server';
import { notifyDiscord, DC } from '../../lib/discord';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'public, s-maxage=60, stale-while-revalidate=120',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('brands')
      .select(`
        id, name, slug, campaign, label, icon, color,
        logo_url, site_url, tagline, og_image_url,
        arena_url, dashboard_url, owner_email,
        twitter, youtube, discord, telegram, active,
        created_at
      `)
      .eq('active', true)
      .order('created_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json(
      { brands: data || [] },
      { status: 200, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json(
      { error: message, brands: [] },
      { status: 500, headers: CORS }
    );
  }
}

// ─── POST — Register a new brand ─────────────────────────────────────────────
// Body: { name, slug, email, tagline?, site_url?, icon?, color?, twitter?, discord?, telegram?, youtube? }
// Auth: x-admin-token OR open (brands self-register, admin reviews)
// On success: inserts brand as active:false pending review + fires Discord notify

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS });

    const { name, slug, email, tagline, site_url, icon, color, twitter, discord, telegram, youtube } = body;

    if (!name || !slug || !email) {
      return NextResponse.json(
        { error: 'Missing required fields: name, slug, email' },
        { status: 400, headers: CORS }
      );
    }

    // Sanitise slug — lowercase, alphanumeric + hyphens only
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

    // Check slug not already taken
    const { data: existing } = await supabase
      .from('brands')
      .select('id')
      .eq('slug', cleanSlug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Slug already taken' }, { status: 409, headers: CORS });
    }

    // Insert — active: false until admin reviews
    const { data: brand, error } = await supabase
      .from('brands')
      .insert({
        name,
        slug:       cleanSlug,
        campaign:   cleanSlug,
        label:      name,
        icon:       icon       || '⚡',
        color:      color      || '#f0883e',
        tagline:    tagline    || null,
        site_url:   site_url   || null,
        owner_email: email,
        twitter:    twitter    || null,
        discord:    discord    || null,
        telegram:   telegram   || null,
        youtube:    youtube    || null,
        arena_url:  `/arena/${cleanSlug}`,
        dashboard_url: `/dashboard/${cleanSlug}`,
        active:     false,
      })
      .select()
      .single();

    if (error) throw error;

    // Fire Discord notify — fire and forget
    notifyDiscord('', 'new_brand', {
      title:  `🏷️ New Brand Registered — ${name}`,
      color:  DC.orange,
      fields: [
        { name: 'Slug',    value: cleanSlug,       inline: true },
        { name: 'Email',   value: email,            inline: true },
        { name: 'Status',  value: '⏳ Pending review', inline: true },
        { name: 'Site',    value: site_url || '—',  inline: false },
        { name: 'Tagline', value: tagline  || '—',  inline: false },
      ],
      footer:    'antcpu.cloud · brand registration',
      timestamp: true,
    }).catch(() => {});

    return NextResponse.json(
      { ok: true, brand },
      { status: 201, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: CORS });
  }
}
