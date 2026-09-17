// app/api/agents/run/route.ts
// ─── Agent LLM Runner — internal engine ───────────────────────────────────────
// Model: Google Gemini 2.5 Flash
// Internal only — called by agent routes, not directly by clients.
// All agent chat surfaces (/api/agents/mac, future /api/agents/ledger) call this.
//
// Moved from: /api/ads-agent (Sep 2026)
// Callers updated: /api/agents/mac uses this internally via buildAgentPrompt
//
// Agent routing by botId:
//   0 → Antbot   5 → MAC
//   1 → Scout    no botId → Arena assistant
//   2 → Aria
//   3 → Herald
//   4 → Ledger
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse }                        from 'next/server';
import { createClient }                                     from '@supabase/supabase-js';
import { buildAgentPrompt, getAgentByNum, AGENT_REGISTRY } from '../../../lib/agents';
import type { AgentId }                                     from '../../../lib/agents';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const TOWER_BEACON = 'https://antcpu.com/api/beacon';

async function logToTower(agentName: string, channel: string, status: string, tokens: number) {
  fetch(TOWER_BEACON, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      node_id:     'agents-run',
      action:      'gemini_call',
      message:     `[gemini-2.5-flash] ${agentName} · ${channel} — ${status} — ${tokens} tokens`,
      status:      status === 'complete' ? 'active' : 'warn',
      priority:    3,
      reward:      '0',
      reward_type: 'test',
      session:     'ads',
      sprint_id:   null,
    }),
  }).catch(() => {});
}

async function logAgentRun(
  agentId:     string,
  channel:     string,
  input:       string,
  output:      string,
  tokens:      number,
  status:      string,
  email?:      string,
  sourceRoute  = '/api/agents/run',
) {
  await supabase.from('agent_runs').insert({
    agent_id:     agentId,
    channel,
    trigger:      'user',
    input:        input.slice(0, 500),
    output:       output.slice(0, 500),
    tokens,
    status,
    email:        email || null,
    source_route: sourceRoute,
  }).catch(() => {});
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, botId, channel, email } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_AI_KEY;
    if (!apiKey) {
      await logToTower('agents-run', channel || 'chat', 'error — no API key', 0);
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    // ── Resolve agent identity ────────────────────────────────────────────────
    const agent     = botId != null ? getAgentByNum(Number(botId)) : null;
    const agentName = agent ? agent.name : 'Arena';
    const agentId   = agent ? agent.id as AgentId : null;

    // ── Build context-aware prompt ────────────────────────────────────────────
    const fullPrompt = buildAgentPrompt(agentId, prompt);

    // ── Call Gemini ───────────────────────────────────────────────────────────
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            maxOutputTokens: 2000,
            temperature:     0.7,
          },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data.error?.message || 'Gemini error';
      await logToTower(agentName, channel || 'chat', `error — ${errMsg}`, 0);
      await logAgentRun(agentId || 'unknown', channel || 'chat', prompt, errMsg, 0, 'error', email);
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No output.';
    const tokens = data.usageMetadata?.totalTokenCount || 0;

    await logToTower(agentName, channel || 'chat', 'complete', tokens);
    await logAgentRun(agentId || 'arena', channel || 'chat', prompt, result, tokens, 'complete', email);

    return NextResponse.json({
      result,
      agent:   agentName,
      agentId: agentId || null,
      botId:   botId   || null,
      channel: channel || null,
      tokens,
    });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    await logToTower('agents-run', 'exception', message, 0);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
