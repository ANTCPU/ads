// app/api/tix/route.ts
// ─── Tix API ──────────────────────────────────────────────────────────────────
//
// GET  /api/tix              — list tickets (super/admin only)
// POST /api/tix              — request a ticket (any authenticated user)
// PATCH /api/tix             — update ticket status (super only)
//
// Ticket ID format: ADS-0001, IO-0003, ANTCPU-0001, ANTCOIN-0001
// Prefix counter lives in prefix_counters table — one row per prefix.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { notifyTix, DC } from '../../lib/discord'

const BASE_URL    = process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL         || 'antcpu@gmail.com'

async function nudgeTix(ticket: any, status: string): Promise<void> {
  const map: Record<string, { emoji: string; color: number; msg: string }> = {
    assigned:  { emoji: '🎫', color: DC.purple, msg: 'has been assigned to you'     },
    open:      { emoji: '🟢', color: DC.green,  msg: 'is now open — start working' },
    in_review: { emoji: '🔍', color: DC.blue,   msg: 'is ready for peer review'    },
    closed:    { emoji: '✅', color: DC.green,  msg: 'has been closed'              },
    rejected:  { emoji: '🔴', color: DC.red,    msg: 'was not approved — check notes' },
  }
  const s = map[status]
  if (!s) return
  const fields = [
    { name: 'Ticket', value: ticket.id,    inline: true  },
    { name: 'Type',   value: ticket.type,  inline: true  },
    { name: 'Track',  value: ticket.track, inline: true  },
    { name: 'Title',  value: ticket.title, inline: false },
    ...(ticket.assignee ? [{ name: 'Assignee', value: ticket.assignee, inline: true }] : []),
    ...(ticket.reviewer ? [{ name: 'Reviewer', value: ticket.reviewer, inline: true }] : []),
  ]
  if (ticket.assignee) {
    fetch(`${BASE_URL}/api/notify`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ticket.assignee, type: 'tix', title: `${s.emoji} Ticket ${ticket.id} ${s.msg}`, message: ticket.title }) }).catch(() => {})
  }
  if (status === 'in_review' && ticket.reviewer) {
    fetch(`${BASE_URL}/api/notify`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ticket.reviewer, type: 'tix', title: `🔍 Ticket ${ticket.id} needs your review`, message: ticket.title }) }).catch(() => {})
  }
  if (['in_review', 'closed'].includes(status)) {
    fetch(`${BASE_URL}/api/notify`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ADMIN_EMAIL, type: 'tix', title: `${s.emoji} ${ticket.id} — ${status}`, message: ticket.title }) }).catch(() => {})
  }
  notifyTix('tix_event', { title: `${s.emoji} ${ticket.id} — ${status.charAt(0).toUpperCase()+status.slice(1)}`,
    url: `${BASE_URL}/health`, color: s.color, fields,
    footer: `tix · ${ticket.prefix} · ${ticket.cohort || 'no cohort'}` }).catch(() => {})
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SUPER_EMAIL = process.env.SUPER_EMAIL!
const VALID_PREFIXES = ['ADS', 'IO', 'ANTCPU', 'ANTCOIN']
const VALID_TYPES    = ['bug', 'update', 'feature', 'marketing']
const VALID_TRACKS   = ['dev', 'marketing']
const VALID_STATUSES = ['requested', 'assigned', 'open', 'in_review', 'closed', 'rejected']

const CORS = {
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// ── Auth helper ───────────────────────────────────────────────────────────────
async function getSessionUser(): Promise<{ email: string; role: string } | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('arena_session')?.value
  if (!raw) return null
  try { return JSON.parse(raw) } catch { return null }
}

function isSuper(user: { email: string } | null): boolean {
  return !!user && user.email === SUPER_EMAIL
}

// ── Pad sequence to 4 digits — ADS-0001 ──────────────────────────────────────
function formatId(prefix: string, seq: number): string {
  return `${prefix}-${String(seq).padStart(4, '0')}`
}

// ── OPTIONS ───────────────────────────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// ── GET — list tickets ────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || (user.role !== 'super' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const prefix   = searchParams.get('prefix')
  const status   = searchParams.get('status')
  const assignee = searchParams.get('assignee')

  let query = supabase
    .from('tix')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (prefix)   query = query.eq('prefix', prefix.toUpperCase())
  if (status)   query = query.eq('status', status)
  if (assignee) query = query.eq('assignee', assignee)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, tickets: data }, { headers: CORS })
}

// ── POST — request a ticket ───────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { prefix, title, type, track, item, plan, description, cohort } = body

  // Validate
  if (!prefix || !VALID_PREFIXES.includes(prefix.toUpperCase()))
    return NextResponse.json({ error: 'Invalid prefix' }, { status: 400 })
  if (!title?.trim())
    return NextResponse.json({ error: 'Title required' }, { status: 400 })
  if (!VALID_TYPES.includes(type))
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  if (!VALID_TRACKS.includes(track))
    return NextResponse.json({ error: 'Invalid track' }, { status: 400 })

  // Increment prefix counter atomically
  const { data: counter, error: counterErr } = await supabase
    .from('prefix_counters')
    .select('last_seq')
    .eq('prefix', prefix.toUpperCase())
    .single()

  if (counterErr || !counter)
    return NextResponse.json({ error: 'Prefix not found' }, { status: 400 })

  const nextSeq = counter.last_seq + 1
  const ticketId = formatId(prefix.toUpperCase(), nextSeq)

  // Update counter
  await supabase
    .from('prefix_counters')
    .update({ last_seq: nextSeq, updated_at: new Date().toISOString() })
    .eq('prefix', prefix.toUpperCase())

  // Antony issuing = can set assignee directly, others = requested only
  const assignee = isSuper(user) ? (body.assignee || null) : null
  const status   = isSuper(user) && body.assignee ? 'assigned' : 'requested'

  const { data: ticket, error: insertErr } = await supabase
    .from('tix')
    .insert({
      id:          ticketId,
      prefix:      prefix.toUpperCase(),
      prefix_seq:  nextSeq,
      title:       title.trim(),
      type,
      track,
      item:        item?.trim() || null,
      plan:        plan?.trim() || null,
      description: description?.trim() || null,
      status,
      assignee,
      created_by:  user.email,
      cohort:      cohort || null,
    })
    .select()
    .single()

  if (insertErr)
    return NextResponse.json({ error: insertErr.message }, { status: 500 })

  if (ticket && status === 'assigned') void nudgeTix(ticket, 'assigned')

  return NextResponse.json({ ok: true, ticket }, { status: 201, headers: CORS })
}

// ── PATCH — update ticket (super only) ───────────────────────────────────────
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser()
  if (!isSuper(user))
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { id, ...updates } = body

  if (!id) return NextResponse.json({ error: 'Ticket ID required' }, { status: 400 })
  if (updates.status && !VALID_STATUSES.includes(updates.status))
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 })

  // Auto-set timestamps on status transitions
  const now = new Date().toISOString()
  if (updates.status === 'open')      updates.opened_at   = now
  if (updates.status === 'assigned')  updates.approved_at = now
  if (updates.status === 'closed')    updates.closed_at   = now

  const { data, error } = await supabase
    .from('tix')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (data?.status) void nudgeTix(data, data.status)


  return NextResponse.json({ ok: true, ticket: data }, { headers: CORS })
}
