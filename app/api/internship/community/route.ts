// ============================================================
// app/api/internship/community/route.ts
// GET  — fetch posts for a cohort
// POST — create a post (challenger or staff)
// POST /prompt — staff structured prompt post
//
// v2 changes:
// — CORS headers + OPTIONS handler added (feed was silently
//   blocked cross-origin from antcpu.io)
// — GET: gate_id, author_type, is_flagged added to select
//   + flatten. ?gate_id= and ?thread= filter params added.
//   Staff author fallback in flatten (author_type=staff).
// — POST: staff author fallback via antcpu_users — Mohammed
//   and dev mentors can post without being in challengers
// — POST: content sanitization — email, external URL,
//   contact fishing blocked. Possible phone soft-flagged.
//   Staff posts bypass sanitization (prebuilt prompts only)
// — POST: gate_id + is_flagged written on insert
// — POST: notification fires to track when staff posts thread
// — POST: activity_log fires on every post + reply
// — POST: dynamic cohort fallback — no hardcoded month
// — POST /prompt: structured prompt endpoint for staff
//   Mohammed (marketing) and Antony (dev) pick from
//   prebuilt prompt library per gate. Optional 280-char
//   note appended — sanitized. Fires notifications to all
//   challengers on that track in that cohort.
// ============================================================

import { createClient }             from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'no-store, max-age=0',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: CORS });
}

// ── Dynamic cohort ─────────────────────────────────────────────
function currentCohort(): string {
  const months = [
    'january','february','march','april','may','june',
    'july','august','september','october','november','december'
  ];
  const now = new Date();
  return `${months[now.getUTCMonth()]}-${now.getUTCFullYear()}`;
}

// ── Content sanitization ───────────────────────────────────────
// Applied to ALL challenger content before insert.
// Staff posts bypass — they use prebuilt prompts only.
// Flagged posts insert with is_flagged:true — held for review.
// Challenger gets notification: "Your post is under review."

function sanitizeContent(raw: string): {
  clean:   string;
  flagged: boolean;
  reason:  string | null;
} {
  const trimmed = raw.trim();

  // Block: email addresses
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmed)) {
    return { clean: trimmed, flagged: true, reason: 'email_detected' };
  }

  // Block: external URLs
  // Allow: antcpu.io, antcpu.com, antcpu.cloud, github.com/ANTCPU only
  if (/https?:\/\/(?!antcpu\.(io|com|cloud)|github\.com\/ANTCPU)[^\s]+/i.test(trimmed)) {
    return { clean: trimmed, flagged: true, reason: 'external_url' };
  }

  // Block: contact fishing
  if (/\b(find me on|dm me|reach me at|contact me outside|message me outside|whatsapp|telegram|signal)\b/i.test(trimmed)) {
    return { clean: trimmed, flagged: true, reason: 'contact_fishing' };
  }

  // Soft flag: possible phone number (7+ consecutive digits)
  // Allow through — could be Pi wallet ID, port, date
  // Visible in .com admin for review
  const hasPhone = /\b\d[\d\s\-().]{6,}\d\b/.test(trimmed);

  return {
    clean:   trimmed,
    flagged: hasPhone,
    reason:  hasPhone ? 'possible_phone' : null,
  };
}

// ── Prompt library ─────────────────────────────────────────────
// Prebuilt prompts per gate per track.
// Staff picks gate_id + prompt_id — content is locked.
// Optional note (280 chars max) appended after prompt.
// No free-form prompt creation — keeps convos structured.

const PROMPT_LIBRARY: Record<string, Record<string, string>> = {
  marketing: {
    // Week 2 — Creator
    d8_country:   'Which country are you claiming for Map of Pi? Tell me: the country, why you chose it, and one thing you already know about that market.',
    d8_angle:     'What is your campaign angle for your country? One sentence. What makes Map of Pi relevant there?',
    d9_research:  'Share your research findings. What platform does your audience use most? What tone lands in your country?',
    d10_draft:    'Share your first draft — caption, visual concept, or campaign hook. Which AI tool did you use to build it?',
    d11_progress: 'Where are you on your Week 2 build? What is working and what needs more time?',
    d12_submit:   'Your Week 2 submission is due. What are you submitting? Describe it or paste the link.',
    d13_feedback: 'Give feedback on one other challenger\'s Week 2 submission. What works? What would you change and why?',
    // Week 3 — Collaborator
    d15_intro:    'Introduce yourself to your team. One sentence on your background and one on what you bring to Week 3.',
    d16_brief:    'What is your team building this week? One sentence. Dev builds it. You campaign it. Agree on the deliverable.',
    d17_checkin:  'Day 1 check-in. What did you create today? Share it with your team.',
    d18_sync:     'Does your campaign match what Dev is building? What did you adjust after syncing?',
    d19_ship:     'Your team project is due. What did you ship? Paste the link or describe the final deliverable.',
    d20_review:   'Review another team\'s Week 3 project. Give feedback on both the build and the campaign together.',
  },
  dev: {
    // Week 2 — Creator
    d8_pr:        'Which open PR are you working on? Paste the issue number and your approach in one paragraph.',
    d9_analysis:  'What did you find in the codebase? What does the section your PR touches actually do?',
    d10_commit:   'What did you commit today? Paste your commit message and one sentence on what it does.',
    d11_progress: 'Where are you on your PR? What is working and what is blocked?',
    d12_ship:     'Your PR is due. Status: Open / Draft / Blocked. If blocked — what is blocking you?',
    d13_review:   'Review one other challenger\'s PR. What is one specific improvement they should make?',
    // Week 3 — Collaborator
    d15_intro:    'Introduce yourself to your team. One sentence on your stack and one on what you are building this week.',
    d16_brief:    'What is your team building? One sentence. You build it. Marketing campaigns it. Agree on the deliverable.',
    d17_checkin:  'Day 1 check-in. What did you commit or build today?',
    d18_sync:     'Does your build match what Marketing is campaigning? What did you adjust after syncing?',
    d19_ship:     'Your team project is due. Paste your PR link or deployment URL.',
    d20_review:   'Review another team\'s Week 3 project. Give feedback on both the build and the campaign together.',
  },
};

// ── Staff resolver ─────────────────────────────────────────────
// Resolves from antcpu_users — owner or staff only.
// Returns { id, name, email, access_level, track_scope } or null.

async function resolveStaff(email: string) {
  const { data } = await supabase
    .from('antcpu_users')
    .select('id, name, email, access_level, track_scope')
    .eq('email', email.trim().toLowerCase())
    .in('access_level', ['owner', 'staff'])
    .maybeSingle();
  return data ?? null;
}

// ── Challenger resolver ────────────────────────────────────────

async function resolveChallenger(params: {
  intern_id?: string | null;
  email?:     string | null;
}) {
  const query = params.intern_id
    ? supabase.from('challengers')
        .select('id, first_name, handle, track, cohort, initials, color')
        .eq('intern_id', params.intern_id)
        .eq('status', 'active')
        .maybeSingle()
    : supabase.from('challengers')
        .select('id, first_name, handle, track, cohort, initials, color')
        .eq('email', params.email!.trim().toLowerCase())
        .eq('status', 'active')
        .maybeSingle();
  const { data } = await query;
  return data ?? null;
}

/* ── GET ──────────────────────────────────────────────────── */

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const cohort    = searchParams.get('cohort')  || currentCohort();
    const post_type = searchParams.get('type')    || null;
    const gate_id   = searchParams.get('gate_id') || null;
    const thread_id = searchParams.get('thread')  || null;
    const limit     = Math.min(parseInt(searchParams.get('limit')  || '50'), 100);
    const offset    = parseInt(searchParams.get('offset') || '0');

    let query = supabase
      .from('community_posts')
      .select(`
        id,
        post_type,
        content,
        cohort,
        day,
        gate_id,
        is_pinned,
        is_system,
        is_flagged,
        author_type,
        parent_id,
        created_at,
        challengers!author_id (
          first_name,
          handle,
          track,
          initials,
          color,
          progress_pct
        )
      `)
      .eq('is_flagged', false)           // never serve flagged posts
      .order('is_pinned',   { ascending: false })
      .order('created_at',  { ascending: false })
      .range(offset, offset + limit - 1);

    // Cohort filter — posts for this cohort or global 'all' posts
    query = query.or(`cohort.eq.${cohort},cohort.eq.all`);

    // Optional filters
    if (post_type) query = query.eq('post_type', post_type);
    if (gate_id)   query = query.eq('gate_id',   gate_id);

    // Thread view — fetch replies for a specific parent post
    if (thread_id) {
      query = query.eq('parent_id', thread_id);
    } else {
      // Default — top-level posts only (no replies in main feed)
      query = query.is('parent_id', null);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500, headers: CORS }
      );
    }

    // Flatten — handle both challenger and staff authors
    const posts = (data || []).map((p: any) => {
      // Staff posts have no challengers join — build author from post metadata
      const isStaff = p.author_type === 'staff';
      const author = isStaff
        ? {
            first_name:   'Mentor',
            handle:       null,
            track:        null,
            initials:     'M',
            color:        '#059669',
            progress_pct: null,
            is_staff:     true,
          }
        : p.challengers
          ? {
              first_name:   p.challengers.first_name,
              handle:       p.challengers.handle,
              track:        p.challengers.track,
              initials:     p.challengers.initials,
              color:        p.challengers.color,
              progress_pct: p.challengers.progress_pct,
              is_staff:     false,
            }
          : null;

      return {
        id:          p.id,
        post_type:   p.post_type,
        content:     p.content,
        cohort:      p.cohort,
        day:         p.day,
        gate_id:     p.gate_id,
        is_pinned:   p.is_pinned,
        is_system:   p.is_system,
        author_type: p.author_type,
        parent_id:   p.parent_id,
        created_at:  p.created_at,
        author,
      };
    });

    return NextResponse.json(
      { posts, count: posts.length, cohort, offset, limit },
      { headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}

/* ── POST ─────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // ── Route to prompt handler if prompt_id present ───────────
    if (body.prompt_id) {
      return handlePromptPost(body);
    }

    const {
      intern_id,
      email,
      content,
      post_type = 'post',
      gate_id   = null,
      parent_id = null,
      cohort,
    } = body;

    const resolvedCohort = cohort || currentCohort();

    // Validate content
    if (!content?.trim()) {
      return NextResponse.json(
        { error: 'content is required' },
        { status: 400, headers: CORS }
      );
    }
    if (content.trim().length > 2000) {
      return NextResponse.json(
        { error: 'content exceeds 2000 characters' },
        { status: 400, headers: CORS }
      );
    }

    if (!intern_id && !email) {
      return NextResponse.json(
        { error: 'intern_id or email required' },
        { status: 400, headers: CORS }
      );
    }

    // ── Step 1: Try challenger first ───────────────────────────
    let challenger = await resolveChallenger({ intern_id, email });
    let authorType: 'challenger' | 'staff' = 'challenger';
    let staffUser: any = null;

    // ── Step 2: Fall through to antcpu_users for staff ─────────
    if (!challenger && email) {
      staffUser  = await resolveStaff(email);
      if (staffUser) {
        authorType = 'staff';
      } else {
        return NextResponse.json(
          { error: 'Author not found' },
          { status: 401, headers: CORS }
        );
      }
    } else if (!challenger) {
      return NextResponse.json(
        { error: 'Author not found' },
        { status: 401, headers: CORS }
      );
    }

    // ── Step 3: Sanitize — challengers only, staff bypasses ────
    let flagged     = false;
    let flagReason: string | null = null;
    let cleanContent = content.trim();

    if (authorType === 'challenger') {
      const sanitized = sanitizeContent(content);
      cleanContent = sanitized.clean;
      flagged      = sanitized.flagged;
      flagReason   = sanitized.reason;
    }

    // ── Step 4: Resolve author_id ──────────────────────────────
    const authorId = authorType === 'staff'
      ? staffUser.id
      : challenger!.id;

    // ── Step 5: Insert post ────────────────────────────────────
    const { data: post, error: insertError } = await supabase
      .from('community_posts')
      .insert({
        author_id:   authorId,
        author_type: authorType,
        post_type,
        content:     cleanContent,
        cohort:      resolvedCohort,
        gate_id,
        parent_id,
        is_pinned:   authorType === 'staff' && !parent_id, // staff top-level = pinned
        is_system:   false,
        is_flagged:  flagged,
      })
      .select()
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500, headers: CORS }
      );
    }

    // ── Step 6: Parallel side effects ─────────────────────────
    const sideEffects: Promise<any>[] = [];

    // Update challenger last_seen
    if (authorType === 'challenger' && challenger) {
      sideEffects.push(
        supabase
          .from('challengers')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', challenger.id)
      );
    }

    // Activity log — every post and reply
    if (authorType === 'challenger' && challenger) {
      const isReply   = !!parent_id;
      const actLabel  = isReply
        ? `Replied in community${gate_id ? ': ' + gate_id : ''}`
        : `Posted in community${gate_id ? ': ' + gate_id : ''}`;

      sideEffects.push(
        supabase.from('activity_log').insert({
          challenger_id: challenger.id,
          type:          'community',
          event:         isReply ? 'community_reply' : 'community_post',
          label:         actLabel,
          icon:          isReply ? '💬' : '📝',
          gate_id:       gate_id || null,
          points:        0,
          actor:         challenger.handle,
        })
      );
    }

    // Notification to challenger if their post is flagged
    if (flagged && authorType === 'challenger' && challenger) {
      sideEffects.push(
        supabase.from('notifications').insert({
          email:   email || null,
          type:    'nudge',
          title:   '⚠️ Your post is under review',
          message: 'Your post was flagged for review. It will appear once approved.',
          read:    false,
        })
      );
    }

    // Discord webhook — non-blocking
    const webhookUrl = process.env.DISCORD_WEBHOOK_COMMUNITY;
    if (webhookUrl && !flagged) {
      const trackEmoji = (challenger?.track || staffUser?.track_scope) === 'marketing'
        ? '📣' : '💻';
      const authorLabel = authorType === 'staff'
        ? `${staffUser.name} · Staff`
        : challenger?.handle;

      sideEffects.push(
        fetch(webhookUrl, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            embeds: [{
              title:       `${trackEmoji} New ${post_type} in Community`,
              description: cleanContent.slice(0, 300),
              color:       authorType === 'staff' ? 0x059669 : 0x2563eb,
              footer:      { text: `${authorLabel} · ${resolvedCohort}` },
              timestamp:   new Date().toISOString(),
            }],
          }),
        }).catch(() => {})
      );
    }

    await Promise.allSettled(sideEffects);

    return NextResponse.json(
      {
        ok:         true,
        flagged,
        flag_reason: flagReason,
        post: {
          ...post,
          author: authorType === 'staff'
            ? { first_name: staffUser.name, handle: null, track: staffUser.track_scope, is_staff: true }
            : { first_name: challenger!.first_name, handle: challenger!.handle, track: challenger!.track, is_staff: false },
        },
      },
      { status: 201, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json(
      { error: message },
      { status: 500, headers: CORS }
    );
  }
}

/* ── PROMPT POST ──────────────────────────────────────────── */
// Staff-only. Mohammed (marketing) and Antony (dev) pick a
// prebuilt prompt by gate_id + prompt_id. Optional note
// (280 chars max) appended — sanitized. Posts as staff,
// pinned, gate-tied. Fires notifications to all challengers
// on that track in that cohort.

async function handlePromptPost(body: any): Promise<NextResponse> {
  const {
    staff_email,
    gate_id,
    prompt_id,
    track,
    note,
    cohort,
  } = body;

  const resolvedCohort = cohort || currentCohort();

  // Validate staff
  if (!staff_email) {
    return NextResponse.json(
      { error: 'staff_email required' },
      { status: 400, headers: CORS }
    );
  }

  const staffUser = await resolveStaff(staff_email);
  if (!staffUser) {
    return NextResponse.json(
      { error: 'Staff not found or insufficient access' },
      { status: 401, headers: CORS }
    );
  }

  // Validate prompt
  if (!gate_id || !prompt_id || !track) {
    return NextResponse.json(
      { error: 'gate_id, prompt_id, and track required' },
      { status: 400, headers: CORS }
    );
  }

  const trackPrompts = PROMPT_LIBRARY[track];
  if (!trackPrompts) {
    return NextResponse.json(
      { error: `Unknown track: ${track}` },
      { status: 400, headers: CORS }
    );
  }

  const promptKey  = `${gate_id}_${prompt_id}`;
  const promptText = trackPrompts[promptKey];
  if (!promptText) {
    return NextResponse.json(
      { error: `Unknown prompt: ${promptKey}` },
      { status: 400, headers: CORS }
    );
  }

  // Build content — prebuilt prompt + optional sanitized note
  let content = promptText;
  if (note?.trim()) {
    if (note.trim().length > 280) {
      return NextResponse.json(
        { error: 'note exceeds 280 characters' },
        { status: 400, headers: CORS }
      );
    }
    // Sanitize the note even for staff — note is free-form
    const sanitized = sanitizeContent(note);
    if (sanitized.flagged) {
      return NextResponse.json(
        { error: `Note blocked: ${sanitized.reason}` },
        { status: 400, headers: CORS }
      );
    }
    content = `${promptText}\n\n${sanitized.clean}`;
  }

  // Insert post
  const { data: post, error: insertError } = await supabase
    .from('community_posts')
    .insert({
      author_id:   staffUser.id,
      author_type: 'staff',
      post_type:   'mentor_thread',
      content,
      cohort:      resolvedCohort,
      gate_id,
      parent_id:   null,
      is_pinned:   true,
      is_system:   false,
      is_flagged:  false,
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json(
      { error: insertError.message },
      { status: 500, headers: CORS }
    );
  }

  // Fetch all challengers on this track in this cohort
  const { data: challengers } = await supabase
    .from('challengers')
    .select('id, email, first_name, handle')
    .eq('status', 'active')
    .eq('cohort',  resolvedCohort)
    .eq('track',   track);

  const targets = challengers || [];

  // Fire notifications + activity log for each challenger
  const notifInserts = targets.map((c: any) => ({
    email:   c.email,
    type:    'mentor',
    title:   `📣 Mentor thread opened: ${gate_id.toUpperCase()}`,
    message: `${staffUser.name} posted a question for you. Reply in the community.`,
    read:    false,
  }));

  const activityInserts = targets.map((c: any) => ({
    challenger_id: c.id,
    type:          'mentor',
    event:         'mentor_thread_opened',
    label:         `Mentor thread opened: ${gate_id}`,
    icon:          '📣',
    gate_id,
    points:        0,
    actor:         staffUser.name,
  }));

  await Promise.allSettled([
    notifInserts.length > 0
      ? supabase.from('notifications').insert(notifInserts)
      : Promise.resolve(),
    activityInserts.length > 0
      ? supabase.from('activity_log').insert(activityInserts)
      : Promise.resolve(),
  ]);

  return NextResponse.json(
    {
      ok:           true,
      post,
      notified:     targets.length,
      prompt_key:   promptKey,
      track,
      gate_id,
    },
    { status: 201, headers: CORS }
  );
}
