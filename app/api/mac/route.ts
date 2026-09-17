// app/api/mac/route.ts
// ─── MAC Chat API — Map of Pi AI Companion ────────────────────────────────────
// Dedicated endpoint for MacChatOverlay.
// Accepts: { message, history, language, fieldContext, email, sessionId }
// Returns: { reply, sessionId, tokens }
//
// Flow:
//   1. Resolve session — generate if not provided
//   2. Build multi-turn Gemini contents[] from history
//   3. Inject MAC_CONTEXT as system turn
//   4. Call Gemini 2.5 Flash
//   5. Persist both turns to mac_conversations
//   6. Log run to agent_runs
//   7. Return { reply, sessionId, tokens }
//
// Flag-gated: mac-agent must be ON (checked at call time)
// Server-only — never import from client components
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { MAC_CONTEXT, ARENA_CONTEXT } from '../../lib/agents';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TOWER_BEACON = 'https://antcpu.com/api/beacon';

// ── Tower log — fire and forget ───────────────────────────────────────────────
async function logToTower(status: string, tokens: number, email?: string) {
  fetch(TOWER_BEACON, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      node_id:     'mac-agent',
      action:      'gemini_call',
      message:     `[gemini-2.5-flash] MAC · chat — ${status} — ${tokens} tokens${email ? ` · ${email}` : ''}`,
      status:      status === 'complete' ? 'active' : 'warn',
      priority:    3,
      reward:      '0',
      reward_type: 'test',
      session:     'mac',
      sprint_id:   null,
    }),
  }).catch(() => {});
}

// ── Persist to mac_conversations ──────────────────────────────────────────────
async function persistTurns(
  email:        string,
  sessionId:    string,
  fieldContext: string,
  language:     string,
  userMessage:  string,
  macReply:     string,
) {
  try {
    await supabase.from('mac_conversations').insert([
      {
        email,
        session_id:    sessionId,
        role:          'user',
        message:       userMessage.slice(0, 2000),
        field_context: fieldContext || null,
        language,
      },
      {
        email,
        session_id:    sessionId,
        role:          'mac',
        message:       macReply.slice(0, 2000),
        field_context: fieldContext || null,
        language,
      },
    ]);
  } catch {}
}

// ── Log to agent_runs ─────────────────────────────────────────────────────────
async function logAgentRun(
  email:       string,
  input:       string,
  output:      string,
  tokens:      number,
  status:      string,
  flagState:   string,
) {
  try {
    await supabase.from('agent_runs').insert({
      agent_id:     'mac',
      channel:      'chat',
      trigger:      'user',
      input:        input.slice(0, 500),
      output:       output.slice(0, 500),
      tokens,
      status,
      email:        email || null,
      brand:        'Map of Pi',
      flag_state:   flagState,
      source_route: '/api/agents/mac',
    });
  } catch {}
}

// ── POST ──────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const {
      message,
      history     = [],
      language    = 'en',
      fieldContext = 'default',
      email       = 'visitor',
      sessionId: incomingSessionId,
    } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_AI_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // ── Check mac-agent flag ──────────────────────────────────────────────────
    const { data: flagRow } = await supabase
      .from('arena_flags')
      .select('enabled')
      .eq('id', 'mac-agent')
      .maybeSingle();

    // Default: off unless explicitly enabled in DB
    const flagEnabled = flagRow?.enabled === true;
    const flagState   = flagEnabled ? 'on' : 'off';

    if (!flagEnabled) {
      return NextResponse.json({
        reply:     "M.A.C. is coming soon. I'll be ready to help with your Map of Pi shop shortly.",
        sessionId: incomingSessionId || crypto.randomUUID(),
        tokens:    0,
        gated:     true,
      });
    }

    // ── Session ID ────────────────────────────────────────────────────────────
    const sessionId = incomingSessionId || crypto.randomUUID();

    // ── Build Gemini multi-turn contents[] ────────────────────────────────────
    // Turn 1: system context injected as first user turn + model ack
    // Then: prior history turns
    // Last: current user message

    const systemTurn = `${MAC_CONTEXT}\n\n${ARENA_CONTEXT}\n\nAlways respond in ${language} language. Keep responses under 3 sentences unless the user asks for more detail.`;

    const contents: { role: string; parts: { text: string }[] }[] = [
      // System context as opening user turn
      { role: 'user',  parts: [{ text: systemTurn }] },
      { role: 'model', parts: [{ text: "Understood. I'm MAC, ready to help with Map of Pi." }] },
    ];

    // Prior history turns
    for (const turn of history) {
      contents.push({
        role:  turn.role === 'mac' ? 'model' : 'user',
        parts: [{ text: turn.text }],
      });
    }

    // Current message
    contents.push({
      role:  'user',
      parts: [{ text: message }],
    });

    // ── Call Gemini ───────────────────────────────────────────────────────────
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: {
            maxOutputTokens: 1000,
            temperature:     0.7,
          },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data.error?.message || 'Gemini error';
      await logToTower(`error — ${errMsg}`, 0, email);
      await logAgentRun(email, message, errMsg, 0, 'error', flagState);
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    const reply  = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm not sure about that — try asking differently.";
    const tokens = data.usageMetadata?.totalTokenCount || 0;

    // ── Persist + log — fire and forget ──────────────────────────────────────
    Promise.all([
      persistTurns(email, sessionId, fieldContext, language, message, reply),
      logAgentRun(email, message, reply, tokens, 'complete', flagState),
      logToTower('complete', tokens, email),
    ]).catch(() => {});

    return NextResponse.json({ reply, sessionId, tokens });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
