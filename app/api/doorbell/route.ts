import { NextRequest, NextResponse } from 'next/server';

let lastVisitor: { page: string; ref: string; ts: string; ua: string } | null = null;
let visitorCount = 0;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    lastVisitor = {
      page: body.page || '/',
      ref:  body.ref  || 'direct',
      ts:   body.ts   || new Date().toISOString(),
      ua:   body.ua   || 'unknown',
    };
    visitorCount++;
    console.log(`🔔 DOORBELL — visitor #${visitorCount} on ${lastVisitor.page} from ${lastVisitor.ref}`);
    return NextResponse.json({ received: true, count: visitorCount });
  } catch (e) {
    return NextResponse.json({ error: 'bad request' }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    lastVisitor,
    count: visitorCount,
    active: lastVisitor !== null,
  });
}
