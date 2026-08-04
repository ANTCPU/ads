import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const intern_id = searchParams.get('intern_id');

  if (!intern_id) {
    return NextResponse.json(
      { error: 'intern_id required' },
      { status: 400 }
    );
  }

  const { data: challenger } = await supabase
    .from('challengers')
    .select('id')
    .eq('intern_id', intern_id)
    .single();

  if (!challenger) {
    return NextResponse.json({ activity: [] });
  }

  const { data: activity, error } = await supabase
    .from('activity_log')
    .select('*')
    .eq('challenger_id', challenger.id)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    return NextResponse.json({ activity: [] });
  }

  return NextResponse.json({ activity: activity || [] });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { intern_id, type, label, icon, gate_id, points } = body;

  if (!intern_id || !label) {
    return NextResponse.json(
      { error: 'intern_id and label required' },
      { status: 400 }
    );
  }

  const { data: challenger } = await supabase
    .from('challengers')
    .select('id')
    .eq('intern_id', intern_id)
    .single();

  if (!challenger) {
    return NextResponse.json(
      { error: 'Challenger not found' },
      { status: 404 }
    );
  }

  const { error } = await supabase
    .from('activity_log')
    .insert({
      challenger_id: challenger.id,
      type:          type    || 'task',
      label:         label,
      icon:          icon    || '⚡',
      gate_id:       gate_id || null,
      points:        points  || 0
    });

  if (error) {
    return NextResponse.json(
      { error: 'Failed to log activity' },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
