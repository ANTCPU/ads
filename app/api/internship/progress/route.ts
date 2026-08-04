import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { intern_id, gate_id } = body;

  if (!intern_id || !gate_id) {
    return NextResponse.json(
      { error: 'intern_id and gate_id required' },
      { status: 400 }
    );
  }

  // Fetch current challenger
  const { data: challenger, error: fetchError } = await supabase
    .from('challengers')
    .select('id, completed_gates')
    .eq('intern_id', intern_id)
    .eq('status', 'active')
    .single();

  if (fetchError || !challenger) {
    return NextResponse.json(
      { error: 'Challenger not found' },
      { status: 404 }
    );
  }

  // Skip if gate already completed
  if (challenger.completed_gates?.includes(gate_id)) {
    return NextResponse.json({ ok: true, already_complete: true });
  }

  // Append gate — trigger auto-recalculates everything
  const { data: updated, error: updateError } = await supabase
    .from('challengers')
    .update({
      completed_gates: [...(challenger.completed_gates || []), gate_id]
    })
    .eq('id', challenger.id)
    .select('*')
    .single();

  if (updateError) {
    return NextResponse.json(
      { error: 'Failed to update progress' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true, challenger: updated });
}
