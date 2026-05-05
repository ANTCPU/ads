import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { prompt, filename } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'No prompt' }, { status: 400 });

    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&model=flux`;

    const res = await fetch(url);
    if (!res.ok) return NextResponse.json({ error: 'Pollinations error' }, { status: 500 });

    const buffer = await res.arrayBuffer();
    const b64 = Buffer.from(buffer).toString('base64');

    return NextResponse.json({
      image: `data:image/jpeg;base64,${b64}`,
      filename: filename || `antcpu-${Date.now()}.jpg`,
      source: 'pollinations',
    });

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
