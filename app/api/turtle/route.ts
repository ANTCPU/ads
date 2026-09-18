// app/api/turtle/route.ts
// ─── Turtle Enterprises LLC — External Notification Endpoint ─────────────────
//
// Receives form submissions from antcpu.com/turtle/ (static HTML site).
// Fires Discord notifications for partner inquiries, interest list signups,
// and land acquisition interest.
//
// CORS is open to antcpu.com only — webhook URL never leaves this server.
// No auth required — public endpoint, rate limiting handled by Vercel.
//
// Sources: partner | interest | land
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { notifyDiscord, DC } from '../../lib/discord';

// ── CORS headers — antcpu.com only ───────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  'https://antcpu.com',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, source, interest } = await req.json();

    // Basic validation
    if (!name || !email) {
      return NextResponse.json(
        { ok: false, error: 'name and email required' },
        { status: 400, headers: CORS }
      );
    }

    const cleanName     = String(name).trim().slice(0, 100);
    const cleanEmail    = String(email).trim().toLowerCase().slice(0, 200);
    const cleanSource   = String(source   || 'turtle-site').trim().slice(0, 100);
    const cleanInterest = String(interest || '').trim().slice(0, 300);

    // ── Emoji + color by source ───────────────────────────────────────────
    const meta: Record<string, { emoji: string; title: string; color: number }> = {
      partner:  { emoji: '🤝', title: 'Partner Inquiry',    color: DC.green  },
      interest: { emoji: '📬', title: 'Interest List Signup', color: 0x2da84f },
      land:     { emoji: '🌱', title: 'Land Acquisition Interest', color: 0xc9a84c },
    };

    const sourceKey = Object.keys(meta).find(k => cleanSource.toLowerCase().includes(k)) || 'partner';
    const { emoji, title, color } = meta[sourceKey];

    // ── Build embed fields ────────────────────────────────────────────────
    const fields: { name: string; value: string; inline: boolean }[] = [
      { name: 'Name',   value: cleanName,   inline: true  },
      { name: 'Email',  value: cleanEmail,  inline: true  },
      { name: 'Source', value: cleanSource, inline: false },
    ];

    if (cleanInterest) {
      fields.push({ name: 'Interest', value: cleanInterest, inline: false });
    }

    // ── Fire Discord — fire and forget, never block the user ─────────────
    notifyDiscord('', 'general', {
      title: `${emoji} ${title} — Turtle Enterprises LLC`,
      color,
      fields,
      footer: `antcpu.com/turtle · ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })}`,
      timestamp: true,
    }).catch(() => {});

    return NextResponse.json({ ok: true }, { headers: CORS });

  } catch {
    return NextResponse.json(
      { ok: false, error: 'bad request' },
      { status: 400, headers: CORS }
    );
  }
}

// Block unused methods
export async function GET()    { return NextResponse.json({ ok: false }, { status: 405, headers: CORS }); }
export async function PUT()    { return NextResponse.json({ ok: false }, { status: 405, headers: CORS }); }
export async function DELETE() { return NextResponse.json({ ok: false }, { status: 405, headers: CORS }); }
