// app/api/image-error/route.ts
// ─── Image Error Logger ───────────────────────────────────────────────────────
// Called by onerror handlers on img tags across all antcpu properties.
// Fires to Discord #web-dev — no DB write, no table needed.
// Label clearly so troubleshooting is instant.
//
// POST { url, page, property, email? }
//   property — 'manda' | 'turtle' | 'amandaland' | 'arena' | 'edu'
//
// CORS open — called from antcpu.com, amandaland.vercel.app, antcpu-ads
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { notifyDiscord, DC }         from '../../lib/discord';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const { url, page, property, email } = await req.json();

    if (!url && !page) {
      return NextResponse.json(
        { ok: false, error: 'url or page required' },
        { status: 400, headers: CORS }
      );
    }

    const cleanUrl      = url      ? String(url).slice(0, 500)      : '—';
    const cleanPage     = page     ? String(page).slice(0, 200)     : '—';
    const cleanProperty = property ? String(property).slice(0, 50)  : 'unknown';
    const cleanEmail    = email    ? String(email).slice(0, 200)    : null;

    void notifyDiscord('', 'photo_error', {
      title:  `🖼️ Image Error — ${cleanProperty}`,
      color:  DC.red,
      fields: [
        { name: 'Property', value: cleanProperty, inline: true  },
        { name: 'Page',     value: cleanPage,     inline: true  },
        { name: 'URL',      value: cleanUrl,      inline: false },
        ...(cleanEmail ? [{ name: 'User', value: cleanEmail, inline: true }] : []),
      ],
      footer:    'antcpu · image-error',
      timestamp: true,
    });

    return NextResponse.json({ ok: true }, { headers: CORS });

  } catch {
    return NextResponse.json(
      { ok: false, error: 'server error' },
      { status: 500, headers: CORS }
    );
  }
}
