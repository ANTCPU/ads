// app/api/aria-review/route.ts
// ─────────────────────────────────────────────────────────────────────────────
// Aria auto-review engine.
// Called by CreateAdDrawer immediately after every ad insert.
//
// Flow:
//   1. Fetch the submitted ad
//   2. Fetch user's prior APPROVED ads (count + most recent URL)
//   3. Fetch user's profile URL from ad_signups
//   4. resolveUrl() — ensure URL is always valid before any decision
//   5. ariaVerdict() — consistency check
//
//   First ad (no prior approved):
//     → stays pending_review
//     → notify user: "🦋 Aria has your ad"
//     → notify Discord: new submission
//
//   Subsequent ad + verdict.autoApprove = true:
//     → status → active
//     → update URL if Aria resolved a better one
//     → fire Scout score
//     → notify user: "✅ Your ad is live — Aria approved it"
//     → notify Discord: "🤖 Aria Auto-Approved"
//
//   Subsequent ad + verdict.autoApprove = false:
//     → stays pending_review
//     → notify user: "🦋 Aria flagged your ad — [reason]"
//     → notify Discord: "⚠️ Aria flagged — needs human review"
//
// /api/notify  → in-app envelope notification
// /api/scout/score → recalculates all rankings after auto-approve
// notifyDiscord    → Discord webhook for admin visibility
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveUrl, ariaVerdict } from '../../lib/aria';
import { notifyDiscord, DC } from '../../lib/discord';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // service role — can update any row
);

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app';

// ── Internal helpers ──────────────────────────────────────────────────────────

async function sendNotify(
  email:   string,
  type:    string,
  title:   string,
  message: string,
) {
  await fetch(`${BASE_URL}/api/notify`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, type, title, message }),
  }).catch(() => {});
}

async function fireScout(adId: string) {
  await fetch(`${BASE_URL}/api/scout/score`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ ad_id: adId, source: 'aria_auto_approve' }),
  }).catch(() => {});
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { ad_id } = await req.json();
    if (!ad_id) {
      return NextResponse.json({ ok: false, error: 'ad_id required' }, { status: 400 });
    }

    // ── 1. Fetch the submitted ad ─────────────────────────────────────────────
    const { data: ad, error: adErr } = await supabase
      .from('ads')
      .select('id, email, brand, title, description, url, tier, category, status')
      .eq('id', ad_id)
      .single();

    if (adErr || !ad) {
      return NextResponse.json({ ok: false, error: 'ad not found' }, { status: 404 });
    }

    // Only process pending_review ads — ignore if already active/rejected
    if (ad.status !== 'pending_review') {
      return NextResponse.json({ ok: true, action: 'skipped', reason: 'not pending_review' });
    }

    const email = (ad.email || '').trim().toLowerCase();

    // ── 2. Check prior approved ads ───────────────────────────────────────────
    const { data: priorAds } = await supabase
      .from('ads')
      .select('id, url, created_at')
      .eq('email', email)
      .eq('status', 'active')
      .neq('id', ad_id)                          // exclude the current ad
      .order('created_at', { ascending: false })
      .limit(5);

    const isFirstAd  = !priorAds || priorAds.length === 0;
    const priorUrl   = priorAds?.[0]?.url || null;

    // ── 3. Fetch profile URL ──────────────────────────────────────────────────
    const { data: signup } = await supabase
      .from('ad_signups')
      .select('website_url')
      .eq('email', email)
      .maybeSingle();

    const profileUrl = signup?.website_url || null;

    // ── 4. Resolve URL ────────────────────────────────────────────────────────
    const resolved = resolveUrl(ad.url, ad.brand, priorUrl, profileUrl);

    // If Aria resolved a better URL, update the ad row now
    // so whatever happens next (auto-approve or human review) the URL is clean
    if (resolved.source !== 'user' && resolved.url !== ad.url) {
      await supabase
        .from('ads')
        .update({ url: resolved.url })
        .eq('id', ad_id);
      ad.url = resolved.url; // keep local copy in sync
    }

    // ── 5. Aria verdict ───────────────────────────────────────────────────────
    const verdict = ariaVerdict(ad, isFirstAd);

    // ── FIRST AD — queue for human review ─────────────────────────────────────
    if (isFirstAd) {
      await sendNotify(
        email,
        'aria',
        '🦋 Aria has your ad',
        `"${ad.title}" is in the review queue. We'll have it live within a few hours. ${resolved.source !== 'user' ? resolved.message : ''}`.trim(),
      );

      notifyDiscord('', 'aria_review', {
        title:  '🦋 New Ad — First Submission',
        color:  DC.blue,
        fields: [
          { name: 'Brand',    value: ad.brand,    inline: true },
          { name: 'Category', value: ad.category, inline: true },
          { name: 'Tier',     value: ad.tier,     inline: true },
          { name: 'Title',    value: ad.title,    inline: false },
          { name: 'URL',      value: ad.url,      inline: false },
          { name: 'Email',    value: email,        inline: false },
          { name: '🦋 Aria',  value: `${verdict.icon} ${verdict.note}`, inline: false },
          { name: 'URL Source', value: resolved.source, inline: true },
        ],
        footer:    'First ad — queued for human review',
        timestamp: true,
      });

      return NextResponse.json({
        ok:     true,
        action: 'queued',
        reason: 'first_ad',
        urlResolution: resolved,
        verdict: { icon: verdict.icon, note: verdict.note },
      });
    }

    // ── SUBSEQUENT AD — auto-approve or flag ──────────────────────────────────

    if (verdict.autoApprove) {

      // Auto-approve
      await supabase
        .from('ads')
        .update({ status: 'active' })
        .eq('id', ad_id);

      // Fire Scout — recalculates all rankings
      await fireScout(ad_id);

      // Notify user
      await sendNotify(
        email,
        'approved',
        '✅ Your ad is live — Aria approved it',
        `"${ad.title}" passed Aria's consistency check and is now live in the Arena. ${resolved.source !== 'user' ? resolved.message : ''} Share it to earn points and climb the ranks.`.trim(),
      );

      // Notify Discord
      notifyDiscord('', 'aria_auto_approved', {
        title:  '🤖 Aria Auto-Approved',
        color:  DC.green,
        fields: [
          { name: 'Brand',      value: ad.brand,    inline: true },
          { name: 'Tier',       value: ad.tier,     inline: true },
          { name: 'Category',   value: ad.category, inline: true },
          { name: 'Title',      value: ad.title,    inline: false },
          { name: 'URL',        value: ad.url,      inline: false },
          { name: 'Email',      value: email,        inline: false },
          { name: '🦋 Aria',    value: verdict.note, inline: false },
          { name: 'URL Source', value: resolved.source, inline: true },
          { name: 'Prior Ads',  value: String(priorAds?.length || 0), inline: true },
        ],
        footer:    'Aria auto-approved · no human review needed',
        timestamp: true,
      });

      return NextResponse.json({
        ok:     true,
        action: 'auto_approved',
        urlResolution: resolved,
        verdict: { icon: verdict.icon, note: verdict.note },
      });

    } else {

      // Subsequent ad but Aria flagged it — queue for human review
      await sendNotify(
        email,
        'aria',
        '🦋 Aria flagged your ad for review',
        `"${ad.title}" needs a small fix before it goes live. ${verdict.note} Edit your ad and resubmit.`,
      );

      notifyDiscord('', 'aria_flagged', {
        title:  '⚠️ Aria Flagged — Human Review Needed',
        color:  DC.orange,
        fields: [
          { name: 'Brand',      value: ad.brand,    inline: true },
          { name: 'Category',   value: ad.category, inline: true },
          { name: 'Tier',       value: ad.tier,     inline: true },
          { name: 'Title',      value: ad.title,    inline: false },
          { name: 'URL',        value: ad.url,      inline: false },
          { name: 'Email',      value: email,        inline: false },
          { name: '🦋 Aria',    value: `${verdict.icon} ${verdict.note}`, inline: false },
          { name: 'URL Source', value: resolved.source, inline: true },
          { name: 'Prior Ads',  value: String(priorAds?.length || 0), inline: true },
        ],
        footer:    'Subsequent ad — Aria flagged · queued for human review',
        timestamp: true,
      });

      return NextResponse.json({
        ok:     true,
        action: 'flagged',
        urlResolution: resolved,
        verdict: { icon: verdict.icon, note: verdict.note },
      });
    }

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
