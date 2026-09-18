// app/api/turtle/route.ts
// ─── Turtle Enterprises LLC — Multi-Channel Discord Router ───────────────────
//
// Routes form submissions to the correct Discord channel by source.
// Also upserts email into ad_signups — fire and forget, never blocks user.
// If email already exists in ad_signups, no-op (idempotent).
//
// Webhook env vars (set in Vercel):
// TURTLE_WEBHOOK_WEBSITE → #website-contact (partner, interest, land)
// TURTLE_WEBHOOK_HOMES   → #homes-for-rent (rental app, showing request)
// TURTLE_WEBHOOK_ALERTS  → #alerts (system, errors)
// TURTLE_WEBHOOK_CONTACT → #contact (Super — reserved)
// TURTLE_WEBHOOK_ZAPPAI  → #homes-for-rent (ZappAI automation flows)
//
// CORS: antcpu.com only
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CORS = {
  'Access-Control-Allow-Origin': 'https://antcpu.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// ── Webhook resolver ──────────────────────────────────────────────────────────
function getWebhook(source: string): string | null {
  const s = source.toLowerCase();
  if (s.includes('rental') || s.includes('showing')) return process.env.TURTLE_WEBHOOK_HOMES || null;
  if (s.includes('alert') || s.includes('system'))   return process.env.TURTLE_WEBHOOK_ALERTS || null;
  if (s.includes('contact'))                          return process.env.TURTLE_WEBHOOK_CONTACT || null;
  if (s.includes('zappai'))                           return process.env.TURTLE_WEBHOOK_ZAPPAI || null;
  return process.env.TURTLE_WEBHOOK_WEBSITE || null;
}

// ── Color + emoji by source ───────────────────────────────────────────────────
function getMeta(source: string): { emoji: string; title: string; color: number } {
  const s = source.toLowerCase();
  if (s.includes('partner'))  return { emoji: '🤝', title: 'Partner Inquiry',          color: 0x22883f };
  if (s.includes('interest')) return { emoji: '📬', title: 'Interest List Signup',      color: 0x2da84f };
  if (s.includes('land'))     return { emoji: '🌱', title: 'Land Acquisition Interest', color: 0xc9a84c };
  if (s.includes('rental'))   return { emoji: '🏠', title: 'Rental Application',        color: 0x1a6b32 };
  if (s.includes('showing'))  return { emoji: '📅', title: 'Showing Request',           color: 0x145228 };
  if (s.includes('amanda'))   return { emoji: '📸', title: 'Photography Inquiry',       color: 0x9333ea };
  return { emoji: '📩', title: 'Website Contact', color: 0x22883f };
}

// ── Fire to Discord ───────────────────────────────────────────────────────────
async function fireDiscord(webhookUrl: string, embed: object): Promise<void> {
  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] }),
  });
}

// ── Upsert to ad_signups — fire and forget, never blocks ──────────────────────
async function captureIdentity(email: string, name: string, source: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('ad_signups')
      .select('email')
      .eq('email', email)
      .maybeSingle();
    if (data) return;
    await supabase.from('ad_signups').insert({
      email,
      name,
      brand_name: 'Turtle Enterprises',
      status:     'lead',
      role:       'user',
      source:     `turtle-${source.toLowerCase().replace(/\s+/g, '-').slice(0, 40)}`,
      created_at: new Date().toISOString(),
    });
  } catch {}
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, source, interest, message } = await req.json();

    if (!name || !email) {
      return NextResponse.json(
        { ok: false, error: 'name and email required' },
        { status: 400, headers: CORS }
      );
    }

    const cleanName     = String(name).trim().slice(0, 100);
    const cleanEmail    = String(email).trim().toLowerCase().slice(0, 200);
    const cleanSource   = String(source || 'website-contact').trim().slice(0, 100);
    const cleanInterest = String(interest || '').trim().slice(0, 300);
    const cleanMessage  = String(message || '').trim().slice(0, 500);

    const webhook = getWebhook(cleanSource);

    // ── No webhook configured — alert to #alerts ──────────────────────────
    if (!webhook) {
      const alertWebhook = process.env.TURTLE_WEBHOOK_ALERTS;
      if (alertWebhook) {
        fireDiscord(alertWebhook, {
          title: '⚠️ Turtle — Unconfigured Webhook',
          color: 0xef4444,
          fields: [
            { name: 'Source', value: cleanSource,  inline: true },
            { name: 'Name',   value: cleanName,    inline: true },
            { name: 'Email',  value: cleanEmail,   inline: false },
          ],
          footer: { text: 'antcpu.com/turtle · webhook not configured for this source' },
        }).catch(() => {});
      }
      // Capture identity even when webhook is missing
      captureIdentity(cleanEmail, cleanName, cleanSource);
      return NextResponse.json({ ok: true }, { headers: CORS });
    }

    const { emoji, title, color } = getMeta(cleanSource);

    // ── Build embed fields ─────────────────────────────────────────────────
    const fields: { name: string; value: string; inline: boolean }[] = [
      { name: 'Name',   value: cleanName,   inline: true  },
      { name: 'Email',  value: cleanEmail,  inline: true  },
      { name: 'Source', value: cleanSource, inline: false },
    ];
    if (cleanInterest) fields.push({ name: 'Interest', value: cleanInterest, inline: false });
    if (cleanMessage)  fields.push({ name: 'Message',  value: cleanMessage,  inline: false });

    // ── Fire Discord — fire and forget ─────────────────────────────────────
    fireDiscord(webhook, {
      title: `${emoji} ${title} — Turtle Enterprises LLC`,
      color,
      fields,
      footer: { text: `antcpu.com/turtle · ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}` },
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    // ── Capture identity — fire and forget ─────────────────────────────────
    captureIdentity(cleanEmail, cleanName, cleanSource);

    return NextResponse.json({ ok: true }, { headers: CORS });

  } catch {
    return NextResponse.json(
      { ok: false, error: 'bad request' },
      { status: 400, headers: CORS }
    );
  }
}

export async function GET()    { return NextResponse.json({ ok: false }, { status: 405, headers: CORS }); }
export async function PUT()    { return NextResponse.json({ ok: false }, { status: 405, headers: CORS }); }
export async function DELETE() { return NextResponse.json({ ok: false }, { status: 405, headers: CORS }); }
