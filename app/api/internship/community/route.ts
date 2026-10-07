// ============================================================
// app/api/internship/community/route.ts
// GET  — fetch posts for a cohort / channel / thread
// POST — create a post (challenger or staff)
// POST /prompt — staff structured prompt post
//
// v4 changes:
// — GET: channel param added — filters by community_posts.channel
//   fixes 500 on ?channel=direct from chat.js
// — GET: intern_id param read for auth context on direct channel
// — GET: challenger join made safe — left join, null author handled
// — POST: channel field written from body (defaults 'general')
// — POST: intern_id written to post for direct message threading
// — v3: .then(() => {}) on all sideEffect Supabase builders
//   resolves TS2345 PostgrestFilterBuilder → Promise error
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

function currentCohort(): string {
  const months = [
    'january','february','march','april','may','june',
    'july','august','september','october','november','december'
  ];
  const now = new Date();
  return `${months[now.getUTCMonth()]}-${now.getUTCFullYear()}`;
}

function sanitizeContent(raw: string): {
  clean:   string;
  flagged: boolean;
  reason:  string | null;
} {
  const trimmed = raw.trim();
  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(trimmed))
    return { clean: trimmed, flagged: true, reason: 'email_detected' };
  if (/https?:\/\/(?!antcpu\.(io|com|cloud)|github\.com\/ANTCPU)[^\s]+/i.test(trimmed))
    return { clean: trimmed, flagged: true, reason: 'external_url' };
  if (/\b(find me on|dm me|reach me at|contact me outside|message me outside|whatsapp|telegram|signal)\b/i.test(trimmed))
    return { clean: trimmed, flagged: true, reason: 'contact_fishing' };
  const hasPhone = /\b\d[\d\s\-().]{6,}\d\b/.test(trimmed);
  return { clean: trimmed, flagged: hasPhone, reason: hasPhone ? 'possible_phone' : null };
}

const PROMPT_LIBRARY: Record<string, Record<string, string>> = {
  marketing: {
    d8_country:   'Which country are you claiming for Map of Pi? Tell me: the country, why you chose it, and one thing you already know about that market.',
    d8_angle:     'What is your campaign angle for your country? One sentence. What makes Map of Pi relevant there?',
    d9_research:  'Share your research findings. What platform does your audience use most? What tone lands in your country?',
    d10_draft:    'Share your first draft — caption, visual concept, or campaign hook. Which AI tool did you use to build it?',
    d11_progress: 'Where are you on your Week 2 build? What is working and what needs more time?',
    d12_submit:   'Your Week 2 submission is due. What are you submitting? Describe it or paste the link.',
    d13_feedback: 'Give feedback on one other challenger\'s Week 2 submission. What works? What would you change and why?',
    d15_intro:    'Introduce yourself to your team. One sentence on your background and one on what you bring to Week 3.',
    d16_brief:    'What is your team building this week? One sentence. Dev builds it. You campaign it. Agree on the deliverable.',
    d17_checkin:  'Day 1 check-in. What did you create today? Share it with your team.',
    d18_sync:     'Does your campaign match what Dev is building? What did you adjust after syncing?',
    d19_ship:     'Your team project is due. What did you ship? Paste the link or describe the final deliverable.',
    d20_review:   'Review another team\'s Week 3 project. Give feedback on both the build and the campaign together.',
  },
  dev: {
    d8_pr:        'Which open PR are you working on? Paste the issue number and your approach in one paragraph.',
    d9_analysis:  'What did you find in the codebase? What does the section your PR touches actually do?',
    d10_commit:   'What did you commit today? Paste your commit message and one sentence on what it does.',
    d11_progress: 'Where are you on your PR? What is working and what is blocked?',
    d12_ship:     'Your PR is due. Status: Open / Draft / Blocked. If blocked — what is blocking you?',
    d13_review:   'Review one other challenger\'s PR. What is one specific improvement they should make?',
    d15_intro:    'Introduce yourself to your team. One sentence on your stack and one on what you are building this week.',
    d16_brief:    'What is your team building? One sentence. You build it. Marketing campaigns it. Agree on the deliverable.',
    d17_checkin:  'Day 1 check-in. What did you commit or build today?',
    d18_sync:     'Does your build match what Marketing is campaigning? What did you adjust after syncing?',
    d19_ship:     'Your team project is due. Paste your PR link or deployment URL.',
    d20_review:   'Review another team\'s Week 3 project. Give feedback on both the build and the campaign together.',
  },
};

async function resolveStaff(email: string) {
  const { data } = await supabase
    .from('antcpu_users')
    .select('id, name, email, access_level, track_scope')
    .eq('email', email.trim().toLowerCase())
    .in('access_level', ['owner', 'staff'])
    .maybeSingle();
  return data ?? null;
}

async function resolveChallenger(params: {
  intern_id?: string | null;
  email?:     string | null;
}) {
  const query = params.intern_id
    ? supabase.from('challengers')
        .select('id, intern_id, first_name, handle, track, cohort, initials, color, email')
        .eq('intern_id', params.intern_id)
        .eq('status', 'active')
        .maybeSingle()
    : supabase.from('challengers')
        .select('id, intern_id, first_name, handle, track, cohort, initials, color, email')
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

    const cohort    = searchParams.get('cohort')    || currentCohort();
    const channel   = searchParams.get('channel')   || null;  // ← v4: read channel
    const intern_id = searchParams.get('intern_id') || null;  // ← v4: auth context
    const post_type = searchParams.get('type')      || null;
    const gate_id   = searchParams.get('gate_id')   || null;
    const thread_id = searchParams.get('thread')    || null;
    const limit     = Math.min(parseInt(searchParams.get('limit')  || '50'), 100);
    const offset    = parseInt(searchParams.get('offset') || '0');

    // ── Direct channel auth ────────────────────────────────────
    // channel=direct requires intern_id — no anonymous reads
    if (channel === 'direct' && !intern_id) {
      return NextResponse.json(
        { error: 'intern_id required for direct channel' },
        { status: 401, headers: CORS }
      );
    }

    let query = supabase
      .from('community_posts')
      .select(`
        id,
        post_type,
        content,
        cohort,
        channel,
        day,
        gate_id,
        is_pinned,
        is_system,
        is_flagged,
        author_type,
        author_id,
        parent_id,
        created_at,
        challengers!left (
          intern_id,
          first_name,
          handle,
          track,
          initials,
          color,
          progress_pct
        )
      `)
      .eq('is_flagged', false)
      .order('is_pinned',  { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    // ── Channel filter ─────────────────────────────────────────
    // direct: only posts where this intern_id is author or recipient
    // general/null: exclude direct channel posts
    if (channel === 'direct' && intern_id) {
      query = query.eq('channel', 'direct');
      // Show threads where this challenger is the author
      // Phase 2: add recipient_id column for full DM threading
      query = query.eq('author_intern_id', intern_id);
    } else if (channel) {
      query = query.eq('channel', channel);
    } else {
      // Default: exclude direct messages from public feed
      query = query.neq('channel', 'direct');
    }

    query = query.or(`cohort.eq.${cohort},cohort.eq.all`);

    if (post_type) query = query.eq('post_type', post_type);
    if (gate_id)   query = query.eq('gate_id',   gate_id);

    if (thread_id) {
      query = query.eq('parent_id', thread_id);
    } else {
      query = query.is('parent_id', null);
    }

    const { data, error } = await query;

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500, headers: CORS });

    const posts = (data || []).map((p: any) => {
      const isStaff  = p.author_type === 'staff';
      // ← v4: safe null check — left join may return null challenger
      const chal     = p.challengers ?? null;
      const author   = isStaff
        ? { first_name: 'Mentor', handle: null, track: null,
            initials: 'M', color: '#059669', progress_pct: null,
            intern_id: null, is_staff: true }
        : chal
          ? { first_name: chal.first_name, handle: chal.handle,
              track: chal.track, initials: chal.initials,
              color: chal.color, progress_pct: chal.progress_pct,
              intern_id: chal.intern_id, is_staff: false }
          : null;

      return {
        id:          p.id,
        post_type:   p.post_type,
        content:     p.content,
        cohort:      p.cohort,
        channel:     p.channel,
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
      { posts, count: posts.length, cohort, channel, offset, limit },
      { headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: CORS });
  }
}

/* ── POST ─────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.prompt_id) return handlePromptPost(body);

    const {
      intern_id, email, content,
      post_type = 'post',
      gate_id   = null,
      parent_id = null,
      channel   = 'general',   // ← v4: read channel from body
      cohort,
    } = body;

    const resolvedCohort = cohort || currentCohort();

    if (!content?.trim())
      return NextResponse.json({ error: 'content is required' }, { status: 400, headers: CORS });

    if (content.trim().length > 2000)
      return NextResponse.json({ error: 'content exceeds 2000 characters' }, { status: 400, headers: CORS });

    if (!intern_id && !email)
      return NextResponse.json({ error: 'intern_id or email required' }, { status: 400, headers: CORS });

    const challenger = await resolveChallenger({ intern_id, email });
    let authorType: 'challenger' | 'staff' = 'challenger';
    let staffUser: any = null;

    if (!challenger && email) {
      staffUser = await resolveStaff(email);
      if (staffUser) {
        authorType = 'staff';
      } else {
        return NextResponse.json({ error: 'Author not found' }, { status: 401, headers: CORS });
      }
    } else if (!challenger) {
      return NextResponse.json({ error: 'Author not found' }, { status: 401, headers: CORS });
    }

    let flagged      = false;
    let flagReason: string | null = null;
    let cleanContent = content.trim();

    if (authorType === 'challenger') {
      const sanitized = sanitizeContent(content);
      cleanContent    = sanitized.clean;
      flagged         = sanitized.flagged;
      flagReason      = sanitized.reason;
    }

    const authorId      = authorType === 'staff' ? staffUser.id : challenger!.id;
    const authorInternId = authorType === 'challenger' ? (challenger!.intern_id ?? null) : null;
    const cleanChannel  = ['general','direct','dev','marketing','showcase','feedback','question']
      .includes(channel) ? channel : 'general';

    const { data: post, error: insertError } = await supabase
      .from('community_posts')
      .insert({
        author_id:       authorId,
        author_intern_id: authorInternId,   // ← v4: write intern_id for DM threading
        author_type:     authorType,
        post_type,
        content:         cleanContent,
        cohort:          resolvedCohort,
        gate_id,
        parent_id,
        channel:         cleanChannel,      // ← v4: write channel
        is_pinned:       authorType === 'staff' && !parent_id,
        is_system:       false,
        is_flagged:      flagged,
      })
      .select()
      .single();

    if (insertError)
      return NextResponse.json({ error: insertError.message }, { status: 500, headers: CORS });

    // ── Side effects ───────────────────────────────────────────
    const sideEffects: PromiseLike<any>[] = [];

    if (authorType === 'challenger' && challenger) {
      sideEffects.push(
        supabase.from('challengers')
          .update({ last_seen: new Date().toISOString() })
          .eq('id', challenger.id)
          .then(() => {})
      );
    }

    if (authorType === 'challenger' && challenger) {
      const isReply  = !!parent_id;
      const actLabel = isReply
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
        }).then(() => {})
      );
    }

    if (flagged && authorType === 'challenger' && challenger) {
      sideEffects.push(
        supabase.from('notifications').insert({
          email:     challenger.email ?? email ?? null,
          intern_id: challenger.intern_id ?? null,
          type:      'nudge',
          title:     '⚠️ Your post is under review',
          message:   'Your post was flagged for review. It will appear once approved.',
          read:      false,
        }).then(() => {})
      );
    }

    // Discord — skip direct channel messages (private)
    const webhookUrl = process.env.DISCORD_WEBHOOK_COMMUNITY;
    if (webhookUrl && !flagged && cleanChannel !== 'direct') {
      const trackEmoji  = (challenger?.track || staffUser?.track_scope) === 'marketing' ? '📣' : '💻';
      const authorLabel = authorType === 'staff' ? `${staffUser.name} · Staff` : challenger?.handle;
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
        ok:          true,
        flagged,
        flag_reason: flagReason,
        post: {
          ...post,
          author: authorType === 'staff'
            ? { first_name: staffUser.name, handle: null,
                track: staffUser.track_scope, is_staff: true }
            : { first_name: challenger!.first_name, handle: challenger!.handle,
                track: challenger!.track, is_staff: false },
        },
      },
      { status: 201, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500, headers: CORS });
  }
}

/* ── PROMPT POST ──────────────────────────────────────────── */

async function handlePromptPost(body: any): Promise<NextResponse> {
  const { staff_email, gate_id, prompt_id, track, note, cohort } = body;
  const resolvedCohort = cohort || currentCohort();

  if (!staff_email)
    return NextResponse.json({ error: 'staff_email required' }, { status: 400, headers: CORS });

  const staffUser = await resolveStaff(staff_email);
  if (!staffUser)
    return NextResponse.json({ error: 'Staff not found or insufficient access' }, { status: 401, headers: CORS });

  if (!gate_id || !prompt_id || !track)
    return NextResponse.json({ error: 'gate_id, prompt_id, and track required' }, { status: 400, headers: CORS });

  const trackPrompts = PROMPT_LIBRARY[track];
  if (!trackPrompts)
    return NextResponse.json({ error: `Unknown track: ${track}` }, { status: 400, headers: CORS });

  const promptKey  = `${gate_id}_${prompt_id}`;
  const promptText = trackPrompts[promptKey];
  if (!promptText)
    return NextResponse.json({ error: `Unknown prompt: ${promptKey}` }, { status: 400, headers: CORS });

  let content = promptText;
  if (note?.trim()) {
    if (note.trim().length > 280)
      return NextResponse.json({ error: 'note exceeds 280 characters' }, { status: 400, headers: CORS });
    const sanitized = sanitizeContent(note);
    if (sanitized.flagged)
      return NextResponse.json({ error: `Note blocked: ${sanitized.reason}` }, { status: 400, headers: CORS });
    content = `${promptText}\n\n${sanitized.clean}`;
  }

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
      channel:     'general',
      is_pinned:   true,
      is_system:   false,
      is_flagged:  false,
    })
    .select()
    .single();

  if (insertError)
    return NextResponse.json({ error: insertError.message }, { status: 500, headers: CORS });

  const { data: challengers } = await supabase
    .from('challengers')
    .select('id, email, intern_id, first_name, handle')
    .eq('status', 'active')
    .eq('cohort',  resolvedCohort)
    .eq('track',   track);

  const targets = challengers || [];

  const notifInserts = targets.map((c: any) => ({
    email:     c.email,
    intern_id: c.intern_id,
    type:      'mentor',
    title:     `📣 Mentor thread opened: ${gate_id.toUpperCase()}`,
    message:   `${staffUser.name} posted a question for you. Reply in the community.`,
    read:      false,
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
      ? supabase.from('notifications').insert(notifInserts).then(() => {})
      : Promise.resolve(),
    activityInserts.length > 0
      ? supabase.from('activity_log').insert(activityInserts).then(() => {})
      : Promise.resolve(),
  ]);

  return NextResponse.json(
    { ok: true, post, notified: targets.length, prompt_key: promptKey, track, gate_id },
    { status: 201, headers: CORS }
  );
}
