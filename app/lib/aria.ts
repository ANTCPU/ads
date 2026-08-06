// app/lib/aria.ts
// ─────────────────────────────────────────────────────────────────────────────
// Central Aria intelligence library.
// Used by:
//   CreateAdDrawer.tsx      → ariaCheck() + resolveUrl() (client)
//   api/aria-review/        → ariaVerdict() + resolveUrl() (server)
//   dashboard/antcpu/       → ariaVerdict() (replaces inline copy)
//
// BRAND_URLS is the source of truth for all brand → URL mappings.
// Add new brands here when they join the network.
// Keys are matched case-insensitively against ad.brand.
// ─────────────────────────────────────────────────────────────────────────────

// ── Brand URL registry ────────────────────────────────────────────────────────
// Source of truth — used by resolveUrl() and brand pipeline cleansing.
// Add new brands here as they join the network.

export const BRAND_URLS: Record<string, string> = {
  'antcpu':             'https://antcpu.com',
  'antcpu ads':         'https://antcpu-ads.vercel.app',
  'antcpu challenge':   'https://antcpu.io',
  'antcpu edu':         'https://antcpu.com/edu',
  'antcpu antcoin':     'https://antcoin.store',
  'Map of Pi':          'https://mapofpi.com',
  '@pipioneersX':       'https://x.com/PiPioneersX',
  'Amanda Photography': 'https://antcpu.com/manda/',
  'Artist Kenrick Jobe':'https://antcpu.com/ken/',
};

export const FALLBACK_URL = 'https://antcpu.com';

// ── Seed + brand guard phrases ────────────────────────────────────────────────
// Seed phrases = default example ad content — user didn't write their own.
// ANTCPU phrases = ANTCPU brand content appearing under a different brand.

export const SEED_PHRASES   = ['coming in hot', 'antcpu ad network', 'antcpu-ads.vercel.app'];
export const ANTCPU_PHRASES = ['antcpu', 'antcpu.com', 'antcpu-ads'];

// ── Invalid URL patterns ──────────────────────────────────────────────────────
const INVALID_HOSTS = ['localhost', '127.0.0.1', '0.0.0.0', 'example.com'];

function isValidUrl(url: string): boolean {
  if (!url || url.trim().length < 6) return false;
  const u = url.trim();
  if (!u.startsWith('http://') && !u.startsWith('https://')) return false;
  if (INVALID_HOSTS.some(h => u.includes(h))) return false;
  return true;
}

function normaliseUrl(url: string): string {
  const u = url.trim();
  if (!u) return '';
  if (u.startsWith('http://') || u.startsWith('https://')) return u;
  return 'https://' + u;
}

// ── resolveUrl ────────────────────────────────────────────────────────────────
// Resolves the best available URL for an ad using the priority chain:
//   1. User-provided valid URL
//   2. Brand match in BRAND_URLS
//   3. Prior approved ad URL
//   4. Profile URL from ad_signups
//   5. FALLBACK_URL (antcpu.com)
//
// Returns { url, source, message } — message shown to user in the UI.
// source is used for logging and Aria notes.

export type UrlResolution = {
  url:     string;
  source:  'user' | 'brand' | 'prior' | 'profile' | 'fallback';
  message: string;
};

export function resolveUrl(
  userUrl:    string,
  brand:      string,
  priorUrl?:  string | null,
  profileUrl?: string | null,
): UrlResolution {

  // 1. User provided a valid URL
  const normalised = normaliseUrl(userUrl || '');
  if (isValidUrl(normalised)) {
    return {
      url:     normalised,
      source:  'user',
      message: '🦋 Your URL looks good.',
    };
  }

  // 2. Brand match in BRAND_URLS (case-insensitive)
  const brandKey = Object.keys(BRAND_URLS).find(
    k => k.toLowerCase() === (brand || '').toLowerCase().trim()
  );
  if (brandKey) {
    return {
      url:     BRAND_URLS[brandKey],
      source:  'brand',
      message: `🦋 Aria found your site — using ${BRAND_URLS[brandKey]}`,
    };
  }

  // 3. Prior approved ad URL
  if (priorUrl && isValidUrl(priorUrl)) {
    return {
      url:     priorUrl,
      source:  'prior',
      message: `🦋 Using your previous URL — ${priorUrl}`,
    };
  }

  // 4. Profile URL
  if (profileUrl && isValidUrl(profileUrl)) {
    return {
      url:     profileUrl,
      source:  'profile',
      message: `🦋 Using your profile URL — ${profileUrl}`,
    };
  }

  // 5. Fallback
  return {
    url:     FALLBACK_URL,
    source:  'fallback',
    message: `🦋 No URL found — linking to ${FALLBACK_URL} for now. Add your own URL to get more clicks.`,
  };
}

// ── ariaCheck ─────────────────────────────────────────────────────────────────
// Client-side validation in CreateAdDrawer.
// URL is no longer required — resolveUrl() handles missing URLs.
// Returns { ok, field, message } — message shown inline in the form.

export type AriaCheckResult = {
  ok:      boolean;
  field:   'title' | 'description' | 'seed' | null;
  message: string;
};

export function ariaCheck(
  title:       string,
  description: string,
): AriaCheckResult {
  const combined = `${title} ${description}`.toLowerCase();

  if (SEED_PHRASES.some(p => combined.includes(p)))
    return {
      ok:      false,
      field:   'seed',
      message: '⚠️ Looks like the example ad is still in there — write about your own brand instead.',
    };

  if (!title || title.trim().length < 8)
    return {
      ok:      false,
      field:   'title',
      message: '🦋 A stronger headline gets more clicks. Try to be specific about what you offer.',
    };

  if (!description || description.trim().length < 20)
    return {
      ok:      false,
      field:   'description',
      message: '🦋 Tell people what makes your brand worth clicking. One strong sentence is enough.',
    };

  return {
    ok:      true,
    field:   null,
    message: '🦋 Looks great — your ad is ready to submit.',
  };
}

// ── ariaVerdict ───────────────────────────────────────────────────────────────
// Server-side consistency check used in:
//   api/aria-review/route.ts  → auto-approve decision
//   dashboard/antcpu/         → admin review advisory
//
// Returns { icon, note, autoApprove }
// autoApprove: true = Aria is confident enough to approve without human review.

export type AriaVerdict = {
  icon:        string;
  note:        string;
  autoApprove: boolean;
};

type AdForVerdict = {
  brand:       string;
  title:       string;
  description: string;
  url:         string;
  email?:      string;
};

export function ariaVerdict(ad: AdForVerdict, isFirstAd = true): AriaVerdict {
  const c = `${ad.title} ${ad.description} ${ad.url}`.toLowerCase();
  const b = (ad.brand || '').toLowerCase();

  // Hard fails — never auto-approve
  if (SEED_PHRASES.some(p => c.includes(p)))
    return {
      icon:        '⚠️',
      note:        'Default seed ad detected — user did not edit the example. Reject and ask for their own ad.',
      autoApprove: false,
    };

  if (b !== 'antcpu' && b !== 'antcpu ads' && ANTCPU_PHRASES.some(p => c.includes(p)))
    return {
      icon:        '⚠️',
      note:        'Brand mismatch — ANTCPU content under a different brand. Likely used the seed ad. Reject and ask them to rewrite.',
      autoApprove: false,
    };

  if (!ad.url || ad.url.length < 6)
    return {
      icon:        '🦋',
      note:        'No destination URL. Aria will resolve one — but check the brand match before approving.',
      autoApprove: false,
    };

  if (!ad.description || ad.description.length < 20)
    return {
      icon:        '🦋',
      note:        'Description missing or too short. Ask the brand to add more context before approving.',
      autoApprove: false,
    };

  if (!ad.title || ad.title.length < 8)
    return {
      icon:        '🦋',
      note:        'Title is short. Will work, but a stronger headline would perform better.',
      autoApprove: !isFirstAd, // auto-approve short titles on subsequent ads
    };

  // Clean pass
  return {
    icon:        '🦋',
    note:        isFirstAd
      ? 'Looks good. First ad — queue for human review as normal.'
      : 'Consistent with prior ads. Aria recommends auto-approval.',
    autoApprove: !isFirstAd,
  };
}
