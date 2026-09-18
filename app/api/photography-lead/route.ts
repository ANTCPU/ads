// app/api/photography-lead/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Amanda Photography — Lead capture + booking pipeline
//
// POST /api/photography-lead
//
// type: 'partial'  → name + session type captured, email not yet
//                  → INSERT contact_submissions + agent_runs
//                  → Discord #manda-photography (amber)
//
// type: 'complete' → full booking — name, email, session type, date
//                  → INSERT bookings + agent_runs
//                  → Discord #manda-photography (green)
//                  → Resend: confirmation to client
//                  → Resend: notify antcpu@gmail.com + antony@antcpu.com
//
// mac_conversations written on every call — full session persistence
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { notifyDiscord, DC }         from '../../lib/discord'
import { heraldSend, heraldWrap }    from '../../lib/herald'

export const runtime = 'edge'

const CORS = {
  'Access-Control-Allow-Origin':  'https://amandaland.vercel.app',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-api-key',
  'Content-Type':                 'application/json',
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ── Auth — simple API key guard ───────────────────────────────────────────────
// Set PHOTOGRAPHY_API_KEY in both ADS and Photography Vercel env vars
function isAuthorized(req: NextRequest): boolean {
  const key = req.headers.get('x-api-key')
  return !!key && key === process.env.PHOTOGRAPHY_API_KEY
}

// ── Email HTML builders ───────────────────────────────────────────────────────

function clientConfirmationHtml(name: string, sessionType: string, date: string): string {
  const firstName = name.split(' ')[0] || 'there'
  const body = `
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;
    padding:2rem;margin-bottom:1.5rem;text-align:center">
      <div style="font-size:1.4rem;font-weight:800;margin-bottom:0.5rem">
        📸 You're booked, ${firstName}!
      </div>
      <div style="font-size:0.88rem;color:#aaa;margin-bottom:1.5rem">
        Your <strong style="color:#fff">${sessionType}</strong> session request
        has been received.<br>
        Requested date: <strong style="color:#c8f564">${date}</strong>
      </div>
      <a href="https://antcpu.com/manda/"
        style="display:inline-block;background:#c8f564;color:#000;
        text-decoration:none;font-weight:800;font-size:1rem;
        padding:0.85rem 2rem;border-radius:10px">
        View Portfolio →
      </a>
    </div>

    <div style="background:#111;border:1px solid #1a1a1a;border-radius:12px;
    padding:1.25rem;margin-bottom:1.5rem">
      <div style="font-size:0.7rem;color:#555;font-weight:700;
      letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.75rem">
        What happens next
      </div>
      <div style="font-size:0.88rem;color:#aaa;line-height:1.8">
        ✓ Amanda will reach out within 24 hours to confirm your session<br>
        ✓ You'll receive location and prep details before your shoot<br>
        ✓ Files delivered same day — AirDrop or download link<br>
        ✓ Social pack included — every platform size ready to post
      </div>
    </div>

    <div style="text-align:center;font-size:0.8rem;color:#555">
      🍂 Fall 2026 · Amanda Photography · Piedmont Triad, NC<br>
      Questions? Reply to this email or visit
      <a href="https://antcpu.com/manda/agent/" style="color:#c8f564">
        antcpu.com/manda/agent
      </a>
    </div>
  `
  return heraldWrap('en', body, 'Amanda Photography · Booking Confirmation')
}

function ownerNotifyHtml(name: string, email: string, sessionType: string, date: string, sessionId: string): string {
  const body = `
    <div style="background:#111;border:1px solid #1a1a1a;border-radius:16px;
    padding:2rem;margin-bottom:1.5rem">
      <div style="font-size:1.2rem;font-weight:800;margin-bottom:1rem">
        📅 New Booking Request
      </div>
      <table style="width:100%;font-size:0.88rem;color:#aaa;border-collapse:collapse">
        <tr><td style="padding:0.4rem 0;color:#555;width:120px">Name</td>
            <td style="color:#fff;font-weight:600">${name}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#555">Email</td>
            <td><a href="mailto:${email}" style="color:#c8f564">${email}</a></td></tr>
        <tr><td style="padding:0.4rem 0;color:#555">Session</td>
            <td style="color:#fff">${sessionType}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#555">Date</td>
            <td style="color:#c8f564;font-weight:600">${date}</td></tr>
        <tr><td style="padding:0.4rem 0;color:#555">Session ID</td>
            <td style="font-family:monospace;font-size:0.75rem;color:#555">${sessionId}</td></tr>
      </table>
    </div>
    <div style="text-align:center">
      <a href="mailto:${email}?subject=Re: Your Amanda Photography Session"
        style="display:inline-block;background:#c8f564;color:#000;
        text-decoration:none;font-weight:800;font-size:0.9rem;
        padding:0.75rem 1.75rem;border-radius:10px">
        Reply to ${name.split(' ')[0]} →
      </a>
    </div>
  `
  return heraldWrap('en', body, 'Amanda Photography · New Booking')
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
    }

    const {
      type,        // 'partial' | 'complete'
      sessionId,
      name,
      email,
      sessionType,
      date,
      messages,   // { role, message, field_context }[]
    } = await req.json()

    if (!type || !sessionId) {
      return NextResponse.json({ error: 'Missing type or sessionId' }, { status: 400, headers: CORS })
    }

    const ts = new Date().toISOString()

    // ── 1. Persist conversation to mac_conversations ──────────────────────────
    if (messages?.length) {
      const rows = messages.map((m: any) => ({
        email:         email || 'anonymous',
        session_id:    sessionId,
        role:          m.role,
        message:       m.message,
        field_context: m.field_context || null,
        language:      'en',
      }))
      await supabase.from('mac_conversations').insert(rows)
    }

    // ── 2. Log agent run ──────────────────────────────────────────────────────
    await supabase.from('agent_runs').insert({
      agent_id:     'amanda',
      channel:      'web-chat',
      trigger:      'user-message',
      input:        messages?.filter((m: any) => m.role === 'user').map((m: any) => m.message).join(' | ') || '',
      output:       messages?.filter((m: any) => m.role === 'agent').map((m: any) => m.message).join(' | ') || '',
      status:       type === 'complete' ? 'complete' : 'partial',
      email:        email || null,
      brand:        'Amanda Photography',
      source_route: '/api/chat',
      bucket:       'photography',
    })

    // ── PARTIAL FLOW ──────────────────────────────────────────────────────────
    if (type === 'partial') {
      // Insert contact submission — partial lead
      await supabase.from('contact_submissions').insert({
        name:    name || 'Unknown',
        email:   '(not yet captured)',
        service: 'photography',
        message: `Session type: ${sessionType || 'unknown'} · via agent · session: ${sessionId}`,
      })

      // Discord — amber, #manda-photography
      await notifyDiscord('', 'photo_lead', {
        title:  '🔔 New Lead Started',
        color:  0xF59E0B, // amber
        fields: [
          { name: 'Name',         value: name        || '—', inline: true  },
          { name: 'Session Type', value: sessionType || '—', inline: true  },
          { name: 'Source',       value: 'Amanda Agent · web-chat', inline: false },
          { name: 'Session ID',   value: sessionId,            inline: false },
        ],
        footer:    'Amanda Photography · Partial Lead',
        timestamp: true,
      })

      return NextResponse.json({ ok: true, type: 'partial' }, { headers: CORS })
    }

    // ── COMPLETE FLOW ─────────────────────────────────────────────────────────
    if (type === 'complete') {
      if (!email || !date || !sessionType) {
        return NextResponse.json(
          { error: 'Missing email, date, or sessionType for complete booking' },
          { status: 400, headers: CORS }
        )
      }

      // Insert booking
      await supabase.from('bookings').insert({
        email,
        name:        name || null,
        brand:       'Amanda Photography',
        day:         date,
        time_window: sessionType,
        note:        `via agent · fall 2026 · session: ${sessionId}`,
        status:      'pending',
      })

      // Discord — green, #manda-photography
      await notifyDiscord('', 'photo_booking', {
        title:  '📅 New Booking Request',
        color:  DC.green,
        fields: [
          { name: 'Name',         value: name,        inline: true  },
          { name: 'Session Type', value: sessionType, inline: true  },
          { name: 'Date',         value: date,        inline: true  },
          { name: 'Email',        value: email,       inline: false },
          { name: 'Session ID',   value: sessionId,   inline: false },
        ],
        footer:    'Amanda Photography · Booking Request',
        timestamp: true,
      })

      // Resend — confirmation to client
      await heraldSend({
        to:      email,
        subject: `📸 Your session request — Amanda Photography`,
        html:    clientConfirmationHtml(name || 'there', sessionType, date),
      })

      // Resend — notify owner (fire and forget, don't block)
      const ownerHtml = ownerNotifyHtml(name || 'Unknown', email, sessionType, date, sessionId)
      await Promise.allSettled([
        heraldSend({
          to:      'antcpu@gmail.com',
          subject: `📅 New booking — ${name} · ${sessionType}`,
          html:    ownerHtml,
        }),
      ])

      return NextResponse.json({ ok: true, type: 'complete' }, { headers: CORS })
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400, headers: CORS })

  } catch (err) {
    console.error('[photography-lead] error:', err)

    // Discord error ping — #web-dev
    await notifyDiscord('', 'photo_error', {
      title:  '🔴 Photography Lead Error',
      color:  DC.red,
      fields: [{ name: 'Error', value: String(err).slice(0, 200), inline: false }],
      footer:    'Amanda Photography · Error',
      timestamp: true,
    }).catch(() => {})

    return NextResponse.json({ error: 'Internal error' }, { status: 500, headers: CORS })
  }
}
