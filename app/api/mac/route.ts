// app/api/mac/route.ts
// ─── MAC Chat API — Map of Pi Shop Builder ────────────────────────────────────
// Dedicated endpoint for the MAC shop builder page (/mac).
// Accepts: { message, history, language, country, email, sessionId }
// Returns: { reply, sessionId, tokens, ad_draft, champion_slot_open }
//
// Flow:
//   1. Resolve session, language, country
//   2. Check country champion slot — query ads table
//   3. Render MAC_SHOP_CONTEXT with live values
//   4. Build full prompt from history + current message
//   5. Call /api/agents/run (botId: 5 — MAC)
//   6. Parse [AD_DRAFT] block from reply if present
//   7. Persist turns to mac_conversations
//   8. Log to agent_runs
//   9. captureIdentity() if real email
//  10. Return { reply, sessionId, tokens, ad_draft, champion_slot_open }
//
// CORS: antcpu-ads.vercel.app + mapofpi.pinet.app + antcpu.com
// No flag gate — MAC is live
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { MAC_SHOP_CONTEXT }          from '../../lib/agents';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin':  '*', // mac page can be embedded anywhere
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ── Check country champion slot ───────────────────────────────────────────────
async function checkChampionSlot(country: string): Promise<boolean> {
  if (!country || country === 'unknown') return false;
  try {
    const { data } = await supabase
      .from('ads')
      .select('id')
      .eq('country', country)
      .eq('is_country_champion', true)
      .eq('status', 'active')
      .maybeSingle();
    return !data; // true = slot is open
  } catch {
    return false;
  }
}

// ── Capture identity — fire and forget ────────────────────────────────────────
function captureIdentity(email: string, country: string): void {
  supabase
    .from('ad_signups')
    .select('email')
    .eq('email', email)
    .maybeSingle()
    .then(({ data }) => {
      if (data) return;
      return supabase.from('ad_signups').insert({
        email,
        name:       'MAC Lead',
        brand_name: 'Map of Pi',
        status:     'lead',
        role:       'user',
        source:     'mac-shop',
        country:    country || null,
        created_at: new Date().toISOString(),
      });
    })
    .catch(() => {});
}

// ── Persist turns to mac_conversations ───────────────────────────────────────
async function persistTurns(
  email:       string,
  sessionId:   string,
  country:     string,
  language:    string,
  userMessage: string,
  macReply:    string,
): Promise<void> {
  try {
    await supabase.from('mac_conversations').insert([
      {
        email,
        session_id:    sessionId,
        role:          'user',
        message:       userMessage.slice(0, 2000),
        field_context: country || null,
        language,
      },
      {
        email,
        session_id:    sessionId,
        role:          'mac',
        message:       macReply.slice(0, 2000),
        field_context: country || null,
        language,
      },
    ]);
  } catch {}
}

// ── Log to agent_runs ─────────────────────────────────────────────────────────
async function logAgentRun(
  email:   string,
  input:   string,
  output:  string,
  tokens:  number,
  status:  string,
): Promise<void> {
  try {
    await supabase.from('agent_runs').insert({
      agent_id:     'mac',
      channel:      'mac-shop',
      trigger:      'user',
      input:        input.slice(0, 500),
      output:       output.slice(0, 500),
      tokens,
      status,
      email:        email || null,
      brand:        'Map of Pi',
      source_route: '/api/mac',
    });
  } catch {}
}

// ── Parse [AD_DRAFT] block from reply ─────────────────────────────────────────
type AdDraft = {
  title:       string;
  description: string;
  category:    string;
  ready:       boolean;
} | null;

function parseAdDraft(reply: string): { clean: string; draft: AdDraft } {
  const match = reply.match(/\[AD_DRAFT\]([\s\S]*?)\[\/AD_DRAFT\]/);
  if (!match) return { clean: reply, draft: null };

  const block = match[1];
  const get   = (key: string) =>
    block.match(new RegExp(`${key}:\\s*(.+)`))?.[1]?.trim() || '';

  const title       = get('title');
  const description = get('description');
  const category    = get('category') || 'Pi Commerce';

  // Strip the [AD_DRAFT] block from the visible reply
  const clean = reply.replace(/\[AD_DRAFT\][\s\S]*?\[\/AD_DRAFT\]/, '').trim();

  if (!title || !description) return { clean: reply, draft: null };

  return {
    clean,
    draft: { title, description, category, ready: true },
  };
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const {
      message,
      history  = [],
      language = 'en',
      country  = 'unknown',
      email    = 'visitor',
      sessionId: incomingSessionId,
    } = await req.json();

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message required' }, { status: 400, headers: CORS });
    }

    const cleanEmail   = String(email).trim().toLowerCase();
    const cleanCountry = String(country).trim();
    const cleanLang    = String(language).trim() || 'en';
    const sessionId    = incomingSessionId || crypto.randomUUID();

    // ── 1. Check champion slot ────────────────────────────────────────────────
    const championSlotOpen = await checkChampionSlot(cleanCountry);
    const championStatus   = championSlotOpen ? 'open' : 'taken';

    // ── 2. Render MAC_SHOP_CONTEXT with live values ───────────────────────────
    const renderedContext = MAC_SHOP_CONTEXT
      .replace(/\{\{LANGUAGE\}\}/g,        cleanLang)
      .replace(/\{\{COUNTRY\}\}/g,         cleanCountry)
      .replace(/\{\{CHAMPION_STATUS\}\}/g, championStatus);

    // ── 3. Build full prompt — context + history + current message ────────────
    const historyText = history.length
      ? history.map((t: { role: string; text: string }) =>
          `${t.role === 'mac' ? 'MAC' : 'User'}: ${t.text}`
        ).join('\n')
      : '';

    const fullPrompt = [
      renderedContext,
      historyText ? `\n── CONVERSATION SO FAR ──\n${historyText}` : '',
      `\nUser: ${message.trim()}`,
      `\nMAC:`,
    ].join('\n');

    // ── 4. Call /api/agents/run (botId: 5 — MAC) ─────────────────────────────
    const runUrl = new URL('/api/agents/run', req.url);
    const runRes = await fetch(runUrl.toString(), {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt:  fullPrompt,
        botId:   5,
        channel: 'mac-shop',
        email:   cleanEmail !== 'visitor' ? cleanEmail : undefined,
      }),
    });

    const runData = await runRes.json();

    if (!runRes.ok) {
      const errMsg = runData.error || 'Agent error';
      logAgentRun(cleanEmail, message, errMsg, 0, 'error').catch(() => {});
      return NextResponse.json({ error: errMsg }, { status: 500, headers: CORS });
    }

    const rawReply = runData.result || "I'm not sure about that — try asking differently.";
    const tokens   = runData.tokens || 0;

    // ── 5. Parse ad draft ─────────────────────────────────────────────────────
    const { clean: reply, draft: ad_draft } = parseAdDraft(rawReply);

    // ── 6. Persist + log + identity — fire and forget ─────────────────────────
    Promise.all([
      persistTurns(cleanEmail, sessionId, cleanCountry, cleanLang, message, reply),
      logAgentRun(cleanEmail, message, reply, tokens, 'complete'),
      cleanEmail !== 'visitor' && cleanEmail.includes('@')
        ? Promise.resolve(captureIdentity(cleanEmail, cleanCountry))
        : Promise.resolve(),
    ]).catch(() => {});

    return NextResponse.json(
      { reply, sessionId, tokens, ad_draft, champion_slot_open: championSlotOpen },
      { headers: CORS }
    );

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500, headers: CORS });
  }
}
