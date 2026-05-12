// ============================================================
// api/ads-agent/route.ts — ADS Agent API Route
// Model: Google Gemini 2.5 Flash
// Handles: antbot task runs + agent chat
// Logs every run to Tower via /api/beacon
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

const TOWER_BEACON = 'https://antcpu.com/api/beacon';

async function logToTower(botName: string, channel: string, status: string, tokens: number) {
  try {
    await fetch(TOWER_BEACON, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        node_id: 'ads-agent',
        action: 'gemini_call',
        message: `[gemini-2.5-flash] ${botName} · ${channel} — ${status} — ${tokens} tokens`,
        status: status === 'complete' ? 'active' : 'warn',
        priority: 3,
        reward: '0',
        reward_type: 'test',
        session: 'ads',
        sprint_id: null,
      }),
    });
  } catch {
    // Tower offline — non-blocking
  }
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, botId, channel } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'No prompt provided' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_AI_KEY;
    if (!apiKey) {
      await logToTower('ads-agent', channel || 'chat', 'error — no API key', 0);
      return NextResponse.json({ error: 'API key not configured' }, { status: 500 });
    }

    const botName = botId ? `ANT-${String(botId).padStart(2,'0')}` : 'chat';

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 2000,
            temperature: 0.7,
          },
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data.error?.message || 'Gemini error';
      await logToTower(botName, channel || 'chat', `error — ${errMsg}`, 0);
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No output.';
    const tokens = data.usageMetadata?.totalTokenCount || 0;

    await logToTower(botName, channel || 'chat', 'ok', tokens);

    return NextResponse.json({
      result,
      botId: botId || null,
      channel: channel || null,
      tokens,
    });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    await logToTower('ads-agent', 'exception', message, 0);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
