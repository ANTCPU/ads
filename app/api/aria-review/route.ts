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
//   5. detectAll() — sanitize layer scan on title + description
//   6. ariaVerdict() — consistency check
//
//   First ad (no prior approved):
//     → stays pending_review
//     → notify user: "🦋 Aria has your ad"
//     → notify Discord: new submission
//
//   Subsequent ad + verdict.autoApprove = true + detect clean:
//     → status → active
//     → update URL if Aria resolved a better one
//     → fire Scout score
//     → notify user: "✅ Your ad is live — Aria approved it"
//     → notify Discord: "🤖 Aria Auto-Approved"
//
//   Subsequent ad + detect flags found:
//     → stays pending_review regardless of verdict.autoApprove
//     → notify user with specific flag reason
//     → notify Discord: "⚠️ Aria flagged — sanitize flags"
//
//   Subsequent ad + verdict.autoApprove = false:
//     → stays pending_review
//     → notify user: "🦋 Aria flagged your ad — [reason]"
//     → notify Discord: "⚠️ Aria flagged — needs human review"
//
// v2 (Sep 2026):
//   — detectAll() wired in from sanitize.ts
//   — sanitize flags block auto-approve independently of ariaVerdict
//   — flag-specific nudge messages per FlagReason
//   — detect results included in Discord embeds
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse }          from 'next/server';
import { createClient }                       from '@supabase/supabase-js';
import { resolveUrl, ariaVerdict }            from '../../lib/aria';
import { notifyDiscord, DC }                  from '../../lib/discord';
import { detectAll }                          from '../../lib/sanitize';
import type { FlagReason, DetectResult }      from '../../lib/sanitize';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://antcpu-ads.vercel.app';

// ── Flag reason → human-readable nudge ───────────────────────────────────────
// Shown to the brand in their notification so they know exactly what to fix.

const FLAG_NUDGE: Record<FlagReason, string> = {
  url:           'Remove any links from your title or description — the URL field is the right place for your link.',
  domain:        'Remove any website addresses from your title or description.',
  handle:        'Remove any @handles or social usernames from your title or description.',
  phone:         'Remove any phone numbers from your title or description.',
  email:         'Remove any email addresses from your title or description.',
  allcaps:       'Avoid writing in ALL CAPS — it reads as shouting and reduces trust.',
  repeated_char: 'Avoid repeated characters like "!!!!!!" or "aaaaa" — keep it clean.',
  too_short:     'Your description is too short. Add more detail about what you offer.',
  too_long:      'Your description is too long. Trim it down to under 300 characters.',
};

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
      .neq('id', ad_id)
      .order('created_at', { ascending: false })
      .limit(5);

    const isFirstAd = !priorAds || priorAds.length === 0;
    const priorUrl  = priorAds?.[0]?.url || null;

    // ── 3. Fetch profile URL ──────────────────────────────────────────────────
    const { data: signup } = await supabase
      .from('ad_signups')
      .select('website_url')
      .eq('email', email)
      .maybeSingle();

    const profileUrl = signup?.website_url || null;

    // ── 4. Resolve URL ────────────────────────────────────────────────────────
    const resolved = resolveUrl(ad.url, ad.brand, priorUrl, profileUrl);

    if (resolved.source !== 'user' && resolved.url !== ad.url) {
      await supabase
        .from('ads')
        .update({ url: resolved.url })
        .eq('id', ad_id);
      ad.url = resolved.url;
    }

    // ── 5. Detect — sanitize layer scan ──────────────────────────────────────
    // Run on title + description independently.
    // description: minLength 20, maxLength 300
    // title: maxLength 80, no length minimum

    const titleDetect: DetectResult       = detectAll(ad.title,       { maxLength: 80 });
    const descDetect:  DetectResult       = detectAll(ad.description, { minLength: 20, maxLength: 300 });
    const hasDetectFlags                  = !titleDetect.clean || !descDetect.clean;
    const allFlags: FlagReason[]          = [...new Set([...titleDetect.flags, ...descDetect.flags])];
    const allMatched: string[]            = [...new Set([...titleDetect.matched, ...descDetect.matched])];

    // Primary flag for nudge — first flag found, priority order
    const primaryFlag: FlagReason | null  = allFlags[0] ?? null;
    const nudgeReason                     = primaryFlag ? FLAG_NUDGE[primaryFlag] : null;

    // ── 6. Aria verdict ───────────────────────────────────────────────────────
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
          { name: 'Brand',       value: ad.brand,                                    inline: true  },
          { name: 'Category',    value: ad.category,                                 inline: true  },
          { name: 'Tier',        value: ad.tier,                                     inline: true  },
          { name: 'Title',       value: ad.title,                                    inline: false },
          { name: 'URL',         value: ad.url,                                      inline: false },
          { name: 'Email',       value: email,                                       inline: false },
          { name: '🦋 Aria',     value: `${verdict.icon} ${verdict.note}`,           inline: false },
          { name: 'URL Source',  value: resolved.source,                             inline: true  },
          { name: '🔍 Detect',   value: hasDetectFlags ? allFlags.join(', ') : '✅ clean', inline: true },
        ],
        footer:    'First ad — queued for human review',
        timestamp: true,
      });

      return NextResponse.json({
        ok:     true,
        action: 'queued',
        reason: 'first_ad',
        urlResolution: resolved,
        verdict:       { icon: verdict.icon, note: verdict.note },
        detect:        { clean: !hasDetectFlags, flags: allFlags },
      });
    }

    // ── SUBSEQUENT AD — detect flags block auto-approve ───────────────────────
    if (hasDetectFlags) {
      await sendNotify(
        email,
        'aria',
        '🦋 Aria flagged your ad for review',
        `"${ad.title}" needs a small fix before it goes live. ${nudgeReason} Edit your ad and resubmit.`,
      );

      notifyDiscord('', 'aria_flagged', {
        title:  '⚠️ Aria Flagged — Sanitize Flags',
        color:  DC.orange,
        fields: [
          { name: 'Brand',      value: ad.brand,                inline: true  },
          { name: 'Category',   value: ad.category,             inline: true  },
          { name: 'Tier',       value: ad.tier,                 inline: true  },
          { name: 'Title',      value: ad.title,                inline: false },
          { name: 'URL',        value: ad.url,                  inline: false },
          { name: 'Email',      value: email,                   inline: false },
          { name: '🔍 Flags',   value: allFlags.join(', '),     inline: true  },
          { name: '🔍 Matched', value: allMatched.join(', ') || '—', inline: false },
          { name: 'URL Source', value: resolved.source,         inline: true  },
          { name: 'Prior Ads',  value: String(priorAds?.length || 0), inline: true },
        ],
        footer:    'Subsequent ad — sanitize flags · queued for human review',
        timestamp: true,
      });

      return NextResponse.json({
        ok:     true,
        action: 'flagged',
        reason: 'detect_flags',
        urlResolution: resolved,
        verdict:       { icon: verdict.icon, note: verdict.note },
        detect:        { clean: false, flags: allFlags, matched: allMatched },
      });
    }

    // ── SUBSEQUENT AD — auto-approve or verdict flag ──────────────────────────
    if (verdict.autoApprove) {
      await supabase
        .from('ads')
        .update({ status: 'active' })
        .eq('id', ad_id);

      await fireScout(ad_id);

      await sendNotify(
        email,
        'approved',
        '✅ Your ad is live — Aria approved it',
        `"${ad.title}" passed Aria's consistency check and is now live in the Arena. ${resolved.source !== 'user' ? resolved.message : ''} Share it to earn points and climb the ranks.`.trim(),
      );

      notifyDiscord('', 'aria_auto_approved', {
        title:  '🤖 Aria Auto-Approved',
        color:  DC.green,
        fields: [
          { name: 'Brand',      value: ad.brand,                                    inline: true  },
          { name: 'Tier',       value: ad.tier,                                     inline: true  },
          { name: 'Category',   value: ad.category,                                 inline: true  },
          { name: 'Title',      value: ad.title,                                    inline: false },
          { name: 'URL',        value: ad.url,                                      inline: false },
          { name: 'Email',      value: email,                                       inline: false },
          { name: '🦋 Aria',    value: verdict.note,                                inline: false },
          { name: '🔍 Detect',  value: '✅ clean',                                  inline: true  },
          { name: 'URL Source', value: resolved.source,                             inline: true  },
          { name: 'Prior Ads',  value: String(priorAds?.length || 0),               inline: true  },
        ],
        footer:    'Aria auto-approved · no human review needed',
        timestamp: true,
      });

      return NextResponse.json({
        ok:     true,
        action: 'auto_approved',
        urlResolution: resolved,
        verdict:       { icon: verdict.icon, note: verdict.note },
        detect:        { clean: true, flags: [] },
      });

    } else {
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
          { name: 'Brand',      value: ad.brand,                                    inline: true  },
          { name: 'Category',   value: ad.category,                                 inline: true  },
          { name: 'Tier',       value: ad.tier,                                     inline: true  },
          { name: 'Title',      value: ad.title,                                    inline: false },
          { name: 'URL',        value: ad.url,                                      inline: false },
          { name: 'Email',      value: email,                                       inline: false },
          { name: '🦋 Aria',    value: `${verdict.icon} ${verdict.note}`,           inline: false },
          { name: '🔍 Detect',  value: '✅ clean',                                  inline: true  },
          { name: 'URL Source', value: resolved.source,                             inline: true  },
          { name: 'Prior Ads',  value: String(priorAds?.length || 0),               inline: true  },
        ],
        footer:    'Subsequent ad — Aria flagged · queued for human review',
        timestamp: true,
      });

      return NextResponse.json({
        ok:     true,
        action: 'flagged',
        reason: 'aria_verdict',
        urlResolution: resolved,
        verdict:       { icon: verdict.icon, note: verdict.note },
        detect:        { clean: true, flags: [] },
      });
    }

  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
