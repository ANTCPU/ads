// app/api/build/route.ts
// ─── Build Stats API ──────────────────────────────────────────────────────────
// Public GET — no auth required.
// Returns live build stats for the ANTCPU/ads repo.
//
// Consumers:
//   antcpu.com/progress.html     → overall section · commit count + velocity
//   antcpu.com/admin/dashboard/  → build panel · commit count + last commit
//
// How commit count works:
//   GitHub's paginated API returns a Link header on ?per_page=1 requests.
//   The rel="last" entry contains the final page number = total commit count.
//   This runs server-side so the Link header is readable — browsers can't
//   read Link headers cross-origin.
//   No GitHub token needed — ANTCPU/ads is a public repo.
//
// CORS: open * — public build stats, no credentials.
// Cache: 1 hour edge cache — commit count doesn't need real-time precision.
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from 'next/server';

// ── Constants ─────────────────────────────────────────────────────────────────

const REPO       = 'ANTCPU/ads';
const START_DATE = '2026-04-07'; // first commit date — used for days building calc
const GH_API     = `https://api.github.com/repos/${REPO}/commits`;

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Cache-Control':                'public, s-maxage=3600, stale-while-revalidate=7200',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

// Parse total commit count from GitHub Link header.
// Link: <https://api.github.com/...?page=1006>; rel="last"
// Returns null if header is missing or unparseable — repo may have < 1 page.
function parseLinkTotal(link: string | null): number | null {
  if (!link) return null;
  const match = link.match(/[?&]page=(\d+)>;\s*rel="last"/);
  if (!match) return null;
  return parseInt(match[1], 10);
}

// Days between two ISO date strings, rounded down.
function daysBetween(from: string, to: string): number {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

// Format velocity as a readable string.
// e.g. 5.9 → "~5.9/day", 10.0 → "~10/day"
function fmtVelocity(commitsPerDay: number): string {
  const rounded = Math.round(commitsPerDay * 10) / 10;
  return `~${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}/day`;
}

// ── OPTIONS — preflight ───────────────────────────────────────────────────────
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET() {
  try {

    // ── Parallel fetch — commit count + latest commit ─────────────────────────
    // Two requests:
    //   1. ?per_page=1 → Link header gives total count, body gives latest commit
    //   2. That's it — one request does both jobs
    const res = await fetch(
      `${GH_API}?per_page=1&sha=main`,
      {
        headers: {
          'Accept':     'application/vnd.github+json',
          'User-Agent': 'antcpu-build-api/1.0',
          // No auth token — public repo, unauthenticated rate limit is
          // 60 req/hour per IP. With 1hr edge cache this is 1 req/hour max.
          // If rate limiting becomes an issue, add GITHUB_TOKEN env var here:
          // 'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
        },
        next: { revalidate: 3600 }, // Next.js fetch cache — 1 hour
      }
    );

    if (!res.ok) {
      throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
    }

    // ── Parse commit count from Link header ───────────────────────────────────
    const linkHeader  = res.headers.get('link');
    const totalFromLink = parseLinkTotal(linkHeader);

    // ── Parse latest commit from body ─────────────────────────────────────────
    const commits = await res.json() as any[];
    const latest  = commits?.[0];

    const lastSha     = latest?.sha?.slice(0, 7)          ?? null;
    const lastMsg     = latest?.commit?.message?.split('\n')[0] ?? null; // first line only
    const lastDate    = latest?.commit?.author?.date       ?? null;
    const lastAuthor  = latest?.commit?.author?.name       ?? null;

    // ── Calculate derived stats ───────────────────────────────────────────────
    const today        = new Date().toISOString().slice(0, 10);
    const daysBuilding = daysBetween(START_DATE, today);

    // If Link header gave us a count use it.
    // If repo has exactly 1 page (< 30 commits) Link header has no rel="last"
    // — fall back to 1 in that case, but this repo has 1000+ so won't happen.
    const totalCommits = totalFromLink ?? 1;

    const commitsPerDay = daysBuilding > 0
      ? Math.round((totalCommits / daysBuilding) * 10) / 10
      : 0;

    const velocity = fmtVelocity(commitsPerDay);

    // ── Milestone flags ───────────────────────────────────────────────────────
    // Simple boolean milestones derived from commit count.
    // Add more as the repo grows.
    const milestones = {
      passed100:  totalCommits >= 100,
      passed500:  totalCommits >= 500,
      passed1000: totalCommits >= 1000,
      next:       totalCommits < 100  ? 100  :
                  totalCommits < 500  ? 500  :
                  totalCommits < 1000 ? 1000 :
                  totalCommits < 2000 ? 2000 : null,
    };

    return NextResponse.json(
      {
        // ── Repo identity ─────────────────────────────────────────────────────
        repo:          REPO,
        repoUrl:       `https://github.com/${REPO}`,
        startDate:     START_DATE,

        // ── Commit stats ──────────────────────────────────────────────────────
        totalCommits,
        daysBuilding,
        commitsPerDay,
        velocity,

        // ── Latest commit ─────────────────────────────────────────────────────
        lastSha,
        lastMsg,
        lastDate,
        lastAuthor,

        // ── Milestones ────────────────────────────────────────────────────────
        milestones,

        // ── Meta ──────────────────────────────────────────────────────────────
        generatedAt: new Date().toISOString(),
      },
      { status: 200, headers: CORS }
    );

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'unknown error';

    // Return a degraded response — consumers should handle null gracefully.
    // Never return 500 to a public stats endpoint.
    return NextResponse.json(
      {
        repo:         REPO,
        totalCommits: null,
        daysBuilding: null,
        commitsPerDay:null,
        velocity:     null,
        lastSha:      null,
        lastMsg:      null,
        lastDate:     null,
        lastAuthor:   null,
        milestones:   null,
        error:        message,
        generatedAt:  new Date().toISOString(),
      },
      { status: 200, headers: CORS } // 200 even on error — consumers get null fields
    );
  }
}
