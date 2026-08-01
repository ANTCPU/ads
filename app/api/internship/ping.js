// /api/internship/ping.js

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', 'https://antcpu.io');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).end();

  const {
    step, email, firstName,
    country, track, timestamp, sessionId
  } = req.body;

  // ── Format Discord message ──────────────────
  const isComplete = step === 'complete';

  const emoji = {
    1:          '👤',
    2:          '🎯',
    3:          '📝',
    4:          '✅',
    complete:   '🎉'
  }[step] || '📋';

  const title = isComplete
    ? '🎉 NEW CHALLENGER REGISTERED'
    : `${emoji} Step ${step} passed`;

  const lines = [
    `**${title}**`,
    `Name: ${firstName || '—'}`,
    `Email: ${email || '—'}`,
    `Country: ${country || '—'}`,
    track     ? `Track: ${track}`         : null,
    `Session: \`${sessionId || '—'}\``,
    `⏱ ${timestamp ? new Date(timestamp).toUTCString() : '—'}`
  ].filter(Boolean).join('\n');

  // ── Send to Discord ─────────────────────────
  try {
    await fetch(process.env.DISCORD_INTERN, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: lines })
    });
  } catch(e) {
    console.warn('Discord ping failed:', e);
  }

  return res.status(200).json({ ok: true });
}
