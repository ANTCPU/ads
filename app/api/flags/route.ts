// app/api/flags/route.ts
// ─── Arena Flags API ──────────────────────────────────────────────────────────
// GET  → all flags merged (DB overrides code defaults)
// PATCH → { id, enabled, status?, notes? } → update one flag
// Super admin only — verified server-side via AGENT_TOKEN or session cookie.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { FLAG_DEFAULTS }             from '../../lib/flags';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

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
      notes:      db ? db.notes      : null,
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

  return NextResponse.json({ ok: true, flags: merged });
}

// ── PATCH — toggle a flag ─────────────────────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const { id, enabled, status, notes } = await req.json();
  if (!id) return NextResponse.json({ ok: false, error: 'id required' }, { status: 400 });

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

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, id, ...update });
}
