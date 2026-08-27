// /app/api/discord-notify/route.ts
// ─── Internal Discord notification endpoint ───────────────────────────────────
//
// Called by client components that need to fire Discord events.
// The webhook URL never leaves this server-side function.
//
// All events route through notifyDiscord() in lib/discord.ts
// which reads env vars lazily at call time — never stored in JS objects.
//
// Security:
//   - Server-side only (Next.js App Router route handler)
//   - Optional INTERNAL_SECRET header guard
//   - Webhook URL never in response, never in logs
//   - Silent fail on missing webhook — never blocks the user
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse }              from 'next/server';
import { notifyDiscord, DiscordEvent, DiscordEmbed } from '../../lib/discord';

export async function POST(req: NextRequest) {

  // 🔒 Optional secret guard
  // Add INTERNAL_SECRET to Vercel env vars (any random 32-char string)
  // If not set, the endpoint is open to your own app — add it when ready
  const secret = req.headers.get('x-internal-secret');
  if (process.env.INTERNAL_SECRET && secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const body = await req.json();

    const content: string       = body.content ?? '';
    const event:   DiscordEvent = body.event   ?? 'general';
    const embed:   DiscordEmbed = body.embed    ?? undefined;

    // content is required — everything else is optional
    if (!content) {
      return NextResponse.json(
        { ok: false, error: 'content required' },
        { status: 400 }
      );
    }

    await notifyDiscord(content, event, embed);
    return NextResponse.json({ ok: true });

  } catch (e: any) {
    // 🔒 Never expose internal details in the error response
    return NextResponse.json(
      { ok: false, error: 'internal error' },
      { status: 500 }
    );
  }
}

// Block all other methods cleanly
export async function GET()    { return NextResponse.json({ ok: false }, { status: 405 }); }
export async function PUT()    { return NextResponse.json({ ok: false }, { status: 405 }); }
export async function DELETE() { return NextResponse.json({ ok: false }, { status: 405 }); }
