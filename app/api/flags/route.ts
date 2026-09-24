// app/api/flags/route.ts
// ─── Arena Flags API ──────────────────────────────────────────────────────────
// GET  → all flags merged (DB overrides code defaults)
// PATCH → { id, enabled, status?, notes? } → update one flag
// OPTIONS → preflight for antcpu.com/admin cross-origin requests
//
// Auth: PATCH requires x-admin-secret header matching ADMIN_SECRET env var.
// CORS: GET + PATCH + OPTIONS allow https://antcpu.com origin.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { FLAG_DEFAULTS }             from '../../lib/flags';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// ── CORS headers ──────────────────────────────────────────────────────────────
// Allows antcpu.com/admin/dashboard to call this endpoint cross-origin.
// GET is open — ThemeProvider calls it from the Arena (same origin).
// PATCH is guarded by x-admin-secret — only admin dashboard sends it.

const CORS = {
  'Access-Control-Allow-Origin':  'https://antcpu.com',
  'Access-Control-Allow-Methods': 'GET, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-admin-secret',
};

// ── OPTIONS — preflight ───────────────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ── GET — return all flags merged with DB overrides ───────────────────────────
export async function GET() {
  const { data: dbRows } = await supabase
    .from('arena_flags')
    .select('id, label, description, version, status, enabled, notes, updated_at');

  const dbMap = Object.fromEntries(
    (dbRows || []).map((r: any) => [r.id, r])
  );

  // Merge: code defaults + DB overrides
  const merged = FLAG_DEFAULTS.map(def => {
    const db = dbMap[def.id];
    return {
      ...def,
      enabled:    db ? db.enabled    : (def.status === 'on' || def.status === 'testing'),
      status:     db ? db.status     : def.status,
      notes:      db ? db.notes      : (def.notes ?? null),
      updated_at: db ? db.updated_at : null,
      source:     db ? 'db'          : 'default',
    };
  });

  // Also include any DB-only flags not in code defaults
  (dbRows || []).forEach((row: any) => {
    if (!FLAG_DEFAULTS.find(f => f.id === row.id)) {
      merged.push({ ...row, source: 'db-only' });
    }
  });

  return NextResponse.json(
    { ok: true, flags: merged },
    { headers: CORS }
  );
}

// ── PATCH — toggle a flag ─────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {

  // ── Auth guard ──────────────────────────────────────────────────────────────
  const secret = req.headers.get('x-admin-secret');
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return NextResponse.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401, headers: CORS }
    );
  }

  const { id, enabled, status, notes } = await req.json();
  if (!id) return NextResponse.json(
    { ok: false, error: 'id required' },
    { status: 400, headers: CORS }
  );

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof enabled === 'boolean') update.enabled = enabled;
  if (status)                        update.status  = status;
  if (notes !== undefined)           update.notes   = notes;

  // Derive enabled from status if not explicitly passed
  if (status && typeof enabled !== 'boolean') {
    update.enabled = status === 'on' || status === 'testing';
  }

  // Upsert — creates row if not exists, updates if exists
  const { error } = await supabase
    .from('arena_flags')
    .upsert({
      id,
      label:       FLAG_DEFAULTS.find(f => f.id === id)?.label       || id,
      description: FLAG_DEFAULTS.find(f => f.id === id)?.description || '',
      version:     FLAG_DEFAULTS.find(f => f.id === id)?.version     || 'beta',
      ...update,
    }, { onConflict: 'id' });

  if (error) return NextResponse.json(
    { ok: false, error: error.message },
    { status: 500, headers: CORS }
  );

  return NextResponse.json(
    { ok: true, id, ...update },
    { headers: CORS }
  );
}
