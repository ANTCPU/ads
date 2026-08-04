import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { intern_id, gate_id, type, url, title, description, ai_tools, track, week } = body;

  if (!intern_id || !gate_id) {
    return NextResponse.json(
      { error: 'intern_id and gate_id required' },
      { status: 400 }
    );
  }

  // Get challenger id
  const { data: challenger, error: fetchError } = await supabase
    .from('challengers')
    .select('id, track')
    .eq('intern_id', intern_id)
    .eq('status', 'active')
    .single();

  if (fetchError || !challenger) {
    return NextResponse.json(
      { error: 'Challenger not found' },
      { status: 404 }
    );
  }

  // Insert submission — counter trigger auto-updates challengers.submissions
  const { data: submission, error: insertError } = await supabase
    .from('submissions')
    .insert({
      challenger_id: challenger.id,
      gate_id:       gate_id,
      type:          type          || 'notes',
      url:           url           || null,
      title:         title         || null,
      description:   description   || null,
      ai_tools:      ai_tools      || null,
      track:         track         || challenger.track,
      week:          week          || 1,
      status:        'pending'
    })
    .select('*')
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: 'Failed to save submission' },
      { status: 500 }
    );
  }

  // Also complete the gate
  const { data: existing } = await supabase
    .from('challengers')
    .select('completed_gates')
    .eq('id', challenger.id)
    .single();

  if (existing && !existing.completed_gates?.includes(gate_id)) {
    await supabase
      .from('challengers')
      .update({
        completed_gates: [...(existing.completed_gates || []), gate_id]
      })
      .eq('id', challenger.id);
  }

  return NextResponse.json({ ok: true, submission });
}
