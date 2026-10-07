// ============================================================
// app/api/internship/messages/route.ts
// GET   ?intern_id=                → inbox threads
// POST                             → send a message
// PATCH ?id=&intern_id=            → mark single message read
// PATCH ?thread_id=&intern_id=     → mark thread read
//
// Completely separate from community_posts.
// Direct messages only — 1:1 between challenger and owner/staff.
// community_posts is for the public board only.
//
// v1.1 (Oct 2026):
// — POST: Discord fires to DISCORD_INTERN on send
//   Flagged messages insert silently, skip Discord, DB only
//   isReply flag — new thread vs reply shown in embed title
//   trackEmoji from sender.track — requires track in select
// — POST: duplicate return removed (build error fix)
// — resolveChallenger: track added to select (Discord embed)
//
// v1.0 (Oct 2026):
// — New table: direct_messages
// — GET: returns threads where intern_id is sender OR recipient
//   Groups by parent_id to show thread list, not individual msgs
// — POST: sends to recipient_intern_id, validates both parties
//   exist, sanitizes content
// — PATCH: marks single message or full thread as read
// ============================================================

import { createClient }             from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'no-store, max-age=0',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

// ── Cohort helper ──────────────────────────────────────────────
function currentCohort(): string {
  const months = [
    'january','february','march','april','may','june',
    'july','august','september','october','november','december'
  ];
  const now = new Date();
  return `${months[now.getUTCMonth()]}-${now.getUTCFullYear()}`;
}

// ── Content sanitizer ──────────────────────────────────────────
function sanitize(raw: string): {
  clean:   string;
  flagged: boolean;
  reason:  string | null;
} {
  const t = raw.trim();
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(t))
    return { clean: t, flagged: true, reason: 'email_detected' };
  if (/https?:\/\/(?!antcpu\.(io|com|cloud)|github\.com\/ANTCPU)[^\s]+/i.test(t))
    return { clean: t, flagged: true, reason: 'external_url' };
  if (/\b(find me on|dm me|reach me at|contact me outside|message me outside|whatsapp|telegram|signal)\b/i.test(t))
    return { clean: t, flagged: true, reason: 'contact_fishing' };
  const hasPhone = /\b\d[\d\s\-().]{6,}\d\b/.test(t);
  return { clean: t, flagged: hasPhone, reason: hasPhone ? 'possible_phone' : null };
}

// ── Resolve challenger by intern_id ────────────────────────────
// track included — needed for Discord embed trackEmoji
async function resolveChallenger(intern_id: string) {
  const { data } = await supabase
    .from('challengers')
    .select('id, intern_id, first_name, initials, color, email, cohort, track')
    .eq('intern_id', intern_id)
    .maybeSingle();
  return data ?? null;
}

/* ── GET ──────────────────────────────────────────────────── */
// Returns thread list — top-level messages where intern_id
// is sender or recipient. Each thread shows latest message
// as preview. Replies fetched separately via ?thread_id=

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const intern_id = searchParams.get('intern_id') || null;
    const thread_id = searchParams.get('thread_id') || null;
    const limit     = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    if (!intern_id) {
      return NextResponse.json(
        { error: 'intern_id required' },
        { status: 400, headers: CORS }
      );
    }

    // ── Thread view — fetch replies for a specific thread ──────
    if (thread_id) {
      const { data, error } = await supabase
        .from('direct_messages')
        .select('id, content, sender_intern_id, recipient_intern_id, is_read, is_flagged, parent_id, created_at')
        .eq('parent_id', thread_id)
        .eq('is_flagged', false)
        .order('created_at', { ascending: true });

      if (error)
        return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });

      // Also fetch the parent message itself
      const { data: parent } = await supabase
        .from('direct_messages')
        .select('id, content, sender_intern_id, recipient_intern_id, is_read, is_flagged, parent_id, created_at')
        .eq('id', thread_id)
        .maybeSingle();

      const messages = [
        ...(parent ? [parent] : []),
        ...(data || [])
      ];

      // Resolve all unique intern_ids in thread for author data
      const ids = [...new Set(messages.flatMap(m =>
        [m.sender_intern_id, m.recipient_intern_id].filter(Boolean)
      ))];

      const authorMap: Record<string, any> = {};
      if (ids.length > 0) {
        const { data: challengers } = await supabase
          .from('challengers')
          .select('intern_id, first_name, initials, color')
          .in('intern_id', ids);
        (challengers || []).forEach((c: any) => { authorMap[c.intern_id] = c; });
      }

      const shaped = messages.map(m => ({
        ...m,
        author:  authorMap[m.sender_intern_id] ?? null,
        is_mine: m.sender_intern_id === intern_id,
      }));

      return NextResponse.json(
        { messages: shaped, count: shaped.length, thread_id },
        { headers: CORS }
      );
    }

    // ── Thread list — top-level messages only ──────────────────
    const { data, error } = await supabase
      .from('direct_messages')
      .select('id, content, sender_intern_id, recipient_intern_id, is_read, created_at')
      .is('parent_id', null)
      .eq('is_flagged', false)
      .or(`sender_intern_id.eq.${intern_id},recipient_intern_id.eq.${intern_id}`)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });

    const threads = data || [];

    // Resolve the OTHER person in each thread for display
    const otherIds = [...new Set(
      threads.map(t =>
        t.sender_intern_id === intern_id
          ? t.recipient_intern_id
          : t.sender_intern_id
      ).filter(Boolean)
    )];

    const otherMap: Record<string, any> = {};
    if (otherIds.length > 0) {
      const { data: others } = await supabase
        .from('challengers')
        .select('intern_id, first_name, initials, color')
        .in('intern_id', otherIds);
      (others || []).forEach((c: any) => { otherMap[c.intern_id] = c; });
    }

    const shaped = threads.map(t => {
      const otherId = t.sender_intern_id === intern_id
        ? t.recipient_intern_id
        : t.sender_intern_id;
      return {
        id:         t.id,
        content:    t.content,
        preview:    t.content.slice(0, 60),
        is_read:    t.is_read,
        created_at: t.created_at,
        is_mine:    t.sender_intern_id === intern_id,
        other:      otherMap[otherId] ?? null,
      };
    });

    return NextResponse.json(
      { threads: shaped, count: shaped.length },
      { headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: CORS });
  }
}

/* ── POST ─────────────────────────────────────────────────── */
// Sends a direct message. Both sender and recipient must exist
// as challengers. Content sanitized. Flagged messages insert
// but are hidden from GET — visible in admin only.

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sender_intern_id,
      recipient_intern_id,
      content,
      parent_id = null,
      cohort,
    } = body;

    if (!sender_intern_id || !recipient_intern_id) {
      return NextResponse.json(
        { error: 'sender_intern_id and recipient_intern_id required' },
        { status: 400, headers: CORS }
      );
    }

    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400, headers: CORS }
      );
    }

    if (content.trim().length > 500) {
      return NextResponse.json(
        { error: 'content exceeds 500 characters' },
        { status: 400, headers: CORS }
      );
    }

    if (sender_intern_id === recipient_intern_id) {
      return NextResponse.json(
        { error: 'cannot message yourself' },
        { status: 400, headers: CORS }
      );
    }

    const sender = await resolveChallenger(sender_intern_id);
    if (!sender) {
      return NextResponse.json(
        { error: 'Sender not found' },
        { status: 401, headers: CORS }
      );
    }

    const recipient = await resolveChallenger(recipient_intern_id);
    if (!recipient) {
      return NextResponse.json(
        { error: 'Recipient not found' },
        { status: 404, headers: CORS }
      );
    }

    const { clean, flagged, reason } = sanitize(content);
    const resolvedCohort = cohort || sender.cohort || currentCohort();

    const { data: message, error: insertError } = await supabase
      .from('direct_messages')
      .insert({
        cohort:              resolvedCohort,
        sender_id:           sender.id,
        sender_intern_id:    sender.intern_id,
        recipient_id:        recipient.id,
        recipient_intern_id: recipient.intern_id,
        content:             clean,
        is_read:             false,
        is_flagged:          flagged,
        parent_id:           parent_id || null,
      })
      .select()
      .single();

    if (insertError)
      return NextResponse.json(
        { error: insertError.message },
        { status: 500, headers: CORS }
      );

    // ── Side effects — non-blocking ───────────────────────────
    const sideEffects: Promise<any>[] = [];

    // In-app notification to recipient
sideEffects.push(
  Promise.resolve(
    supabase.from('notifications').insert({
      intern_id: recipient.intern_id,
      email:     recipient.email,
      type:      'chat',
      title:     `💬 Message from ${sender.first_name}`,
      message:   clean.slice(0, 80),
      link:      '/workspace/',
      read:      false,
    })
  ).then(() => {}).catch(() => {})
);

    // Discord — DMs go to DISCORD_INTERN (same channel as ops)
    // Flagged messages insert silently, skip Discord, visible in DB only
    if (!flagged) {
      const webhook = process.env.DISCORD_INTERN;
      if (webhook) {
        const isReply    = !!parent_id;
        const trackEmoji = sender.track === 'marketing' ? '📣' : '💻';

        sideEffects.push(
          fetch(webhook, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              embeds: [{
                title:       isReply
                  ? `💬 Reply — ${sender.first_name}`
                  : `💬 New DM — ${sender.first_name}`,
                description: clean.slice(0, 200),
                color:       0x2563EB,
                fields: [
                  { name: 'From',  value: `${trackEmoji} ${sender.first_name} · ${sender.intern_id}`, inline: true },
                  { name: 'To',    value: recipient.first_name,                                        inline: true },
                  { name: 'Type',  value: isReply ? 'Reply' : 'New thread',                           inline: true },
                ],
                footer:    { text: `direct message · ${resolvedCohort}` },
                timestamp: new Date().toISOString(),
              }]
            }),
          }).catch(() => {})
        );
      }
    }

    await Promise.allSettled(sideEffects);

    return NextResponse.json(
      {
        ok:      true,
        flagged,
        reason,
        message: {
          ...message,
          author: {
            first_name: sender.first_name,
            initials:   sender.initials,
            color:      sender.color,
            intern_id:  sender.intern_id,
          },
        },
      },
      { status: 201, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: CORS });
  }
}

/* ── PATCH ────────────────────────────────────────────────── */
// Mark single message or full thread as read.
// Requires intern_id to prevent marking other people's messages.

export async function PATCH(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id        = searchParams.get('id')        || null;
    const thread_id = searchParams.get('thread_id') || null;
    const intern_id = searchParams.get('intern_id') || null;

    if (!intern_id) {
      return NextResponse.json(
        { error: 'intern_id required' },
        { status: 400, headers: CORS }
      );
    }

    if (id) {
      const { error } = await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('id', id)
        .eq('recipient_intern_id', intern_id);

      if (error)
        return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });

      return NextResponse.json({ ok: true, marked: 'single' }, { headers: CORS });
    }

    if (thread_id) {
      const { error } = await supabase
        .from('direct_messages')
        .update({ is_read: true })
        .eq('parent_id', thread_id)
        .eq('recipient_intern_id', intern_id);

      if (error)
        return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });

      return NextResponse.json({ ok: true, marked: 'thread' }, { headers: CORS });
    }

    return NextResponse.json(
      { error: 'id or thread_id required' },
      { status: 400, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: CORS });
  }
}
