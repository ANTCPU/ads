// app/api/admin/badges/award/route.ts
// ─── Admin Badge Award + Revoke ───────────────────────────────────────────────
// GET    ?email=x&viewer=admin@email     → current badges for user
// POST   { email, badge_slug, viewer_email }  → award any badge, any tier
// DELETE { email, badge_slug, viewer_email, reason? } → revoke, triggers consequence chain
//
// Award source is always: "Ad Arena Badge System"
// Auth: viewer_email must match NEXT_PUBLIC_SUPER_EMAIL
//
// Consequence chain on revoke:
//   1 revocation  → in-app nudge
//   2 revocations → active ads → pending_review
//   3+ revocations → account suspended_review, all ads archived
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient }              from '@supabase/supabase-js';
import { awardBadge, revokeBadge,
         BADGE_REGISTRY, BadgeSlug } from '../../../../lib/badges';
import { notifyDiscord, DC }         from '../../../../lib/discord';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SUPER_EMAIL  = process.env.NEXT_PUBLIC_SUPER_EMAIL || 'antcpu@gmail.com';
const BASE_URL     = process.env.NEXT_PUBLIC_APP_URL     || 'https://antcpu-ads.vercel.app';
const AWARD_SOURCE = 'Ad Arena Badge System';

// ─── Auth ─────────────────────────────────────────────────────────────────────

function isAuthorized(req: NextRequest, viewerEmail?: string): boolean {
  const cronSecret = process.env.CRON_SECRET || '';
  const authHeader = req.headers.get('authorization') || '';
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true;
  if (viewerEmail && viewerEmail.toLowerCase() === SUPER_EMAIL.toLowerCase()) return true;
  return false;
}

// ─── Notify user ──────────────────────────────────────────────────────────────

async function notifyUser(email: string, type: string, title: string, message: string) {
  fetch(`${BASE_URL}/api/notify`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, type, title, message }),
  }).catch(() => {});
}

// ─── Consequence chain ────────────────────────────────────────────────────────

async function applyConsequenceChain(
  email: string, badgeSlug: string, reason: string | null,
): Promise<{ level: number; action: string }> {

  const { count } = await supabase
    .from('badge_revocations')
    .select('*', { count: 'exact', head: true })
    .eq('email', email);

  const total = count || 0;

  if (total === 1) {
    await notifyUser(email, 'info',
      '🦋 A badge was updated on your account',
      "One of your badges was removed. Keep your ads clean and you'll earn it back. " +
      'If you have questions, reach out via the support page.',
    );
    notifyDiscord('', 'general', {
      title: '🔄 Badge Revoked — Level 1', color: DC.orange,
      fields: [
        { name: 'Email',  value: email,     inline: true },
        { name: 'Badge',  value: badgeSlug, inline: true },
        { name: 'Total',  value: '1',       inline: true },
        { name: 'Action', value: 'Nudge only — no ad changes', inline: false },
        ...(reason ? [{ name: 'Reason', value: reason, inline: false }] : []),
      ],
      footer: 'Ad Arena Badge System · Consequence Chain', timestamp: true,
    }).catch(() => {});
    return { level: 1, action: 'nudge' };
  }

  if (total === 2) {
    await supabase.from('ads').update({ status: 'pending_review' })
      .eq('email', email).eq('status', 'active');
    await notifyUser(email, 'info',
      '🦋 Your ads are under review',
      "Your ads aren't visible in the Arena right now while we sort something out. " +
      "We'll be in touch. Your points and badges are safe.",
    );
    notifyDiscord('', 'general', {
      title: '⚠️ Badge Revoked — Level 2', color: DC.orange,
      fields: [
        { name: 'Email',  value: email,     inline: true },
        { name: 'Badge',  value: badgeSlug, inline: true },
        { name: 'Total',  value: '2',       inline: true },
        { name: 'Action', value: 'Active ads → pending_review', inline: false },
        ...(reason ? [{ name: 'Reason', value: reason, inline: false }] : []),
      ],
      footer: 'Ad Arena Badge System · Consequence Chain', timestamp: true,
    }).catch(() => {});
    return { level: 2, action: 'ads_pending' };
  }

  // Level 3+ — suspend
  await supabase.from('ads').update({ status: 'archived', pinned: false }).eq('email', email);
  await supabase.from('ad_signups').update({ status: 'suspended_review' }).eq('email', email);
  await notifyUser(email, 'info',
    '🦋 Your account is under review',
    "Your account and ads aren't visible right now. We'll reach out directly. Your data is safe.",
  );
  notifyDiscord('', 'general', {
    title: '🚨 Badge Revoked — Level 3+ SUSPENDED', color: 0xef4444,
    fields: [
      { name: 'Email',  value: email,        inline: true },
      { name: 'Badge',  value: badgeSlug,    inline: true },
      { name: 'Total',  value: String(total), inline: true },
      { name: 'Action', value: 'Account suspended_review · all ads archived', inline: false },
      ...(reason ? [{ name: 'Reason', value: reason, inline: false }] : []),
    ],
    footer: 'Ad Arena Badge System · Consequence Chain', timestamp: true,
  }).catch(() => {});
  return { level: 3, action: 'suspended' };
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const email       = req.nextUrl.searchParams.get('email')  || '';
  const viewerEmail = req.nextUrl.searchParams.get('viewer') || '';

  if (!isAuthorized(req, viewerEmail))
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!email)
    return NextResponse.json({ error: 'email required' }, { status: 400 });

  const { data, error } = await supabase
    .from('user_badges')
    .select('badge_slug, awarded_by, awarded_at')
    .eq('user_email', email.toLowerCase().trim())
    .order('awarded_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const badges = (data || []).map(b => {
    const def = BADGE_REGISTRY.find(r => r.slug === b.badge_slug);
    return {
      slug:       b.badge_slug,
      awarded_by: b.awarded_by,
      awarded_at: b.awarded_at,
      label:      def?.label || b.badge_slug,
      icon:       def?.icon  || '🏅',
      color:      def?.color || '#555',
      tier:       def?.tier  || 1,
      auto:       def?.auto  ?? false,
    };
  });

  return NextResponse.json({ ok: true, email, badges });
}

// ─── POST — award ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { email, badge_slug, viewer_email } = await req.json();

    if (!isAuthorized(req, viewer_email))
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (!email || !badge_slug)
      return NextResponse.json({ error: 'email and badge_slug required' }, { status: 400 });

    const norm = email.toLowerCase().trim();
    const def  = BADGE_REGISTRY.find(b => b.slug === badge_slug);
    if (!def)
      return NextResponse.json({ error: 'unknown badge slug' }, { status: 400 });

    const awarded = await awardBadge(supabase, norm, badge_slug as BadgeSlug, AWARD_SOURCE);

    await notifyUser(norm, 'info',
      `${def.icon} You've earned the ${def.label} badge`,
      def.slug === 'featured-profile'
        ? '⭐ You\'re the Arena\'s Profile of the Week. Your brand is in the spotlight — share it.'
        : def.desc,
    );

    notifyDiscord('', 'general', {
      title: `🏅 Badge Awarded — ${def.label}`, color: DC.green,
      fields: [
        { name: 'Email',  value: norm,          inline: true },
        { name: 'Badge',  value: def.label,     inline: true },
        { name: 'Tier',   value: `T${def.tier}`, inline: true },
        { name: 'Source', value: AWARD_SOURCE,  inline: false },
      ],
      footer: 'Ad Arena Badge System', timestamp: true,
    }).catch(() => {});

    return NextResponse.json({ ok: true, awarded, slug: badge_slug, label: def.label, tier: def.tier, source: AWARD_SOURCE });

  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 });
  }
}

// ─── DELETE — revoke ──────────────────────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  try {
    const { email, badge_slug, viewer_email, reason } = await req.json();

    if (!isAuthorized(req, viewer_email))
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    if (!email || !badge_slug)
      return NextResponse.json({ error: 'email and badge_slug required' }, { status: 400 });

    const norm = email.toLowerCase().trim();
    const def  = BADGE_REGISTRY.find(b => b.slug === badge_slug);
    if (!def)
      return NextResponse.json({ error: 'unknown badge slug' }, { status: 400 });

    const revoked = await revokeBadge(supabase, norm, badge_slug as BadgeSlug);
    if (!revoked)
      return NextResponse.json({ error: 'revoke failed' }, { status: 500 });

    // Write audit log BEFORE consequence chain — chain reads the count
    await supabase.from('badge_revocations').insert({
      email: norm, badge_slug,
      revoked_by: AWARD_SOURCE,
      reason: reason || null,
    });

    const consequence = await applyConsequenceChain(norm, badge_slug, reason || null);

    return NextResponse.json({ ok: true, revoked: true, slug: badge_slug, label: def.label, tier: def.tier, consequence, source: AWARD_SOURCE });

  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'unknown' }, { status: 500 });
  }
}
