// ============================================================
// app/office/[handle]/page.tsx
// Public challenger virtual office — server component
// Fetches office data + health clock in parallel
// Handles nulls, missing fields, bad handles gracefully
// ============================================================

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import OfficeClient from './OfficeClient';

const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL ?? 'https://antcpu-ads.vercel.app';

// ── Fetch office data + clock in parallel ──────────────────
async function getOfficeData(handle: string) {
  try {
    const [officeRes, healthRes] = await Promise.all([
      fetch(`${APP_URL}/api/office/${handle}`, {
        cache: 'no-store',
      }),
      fetch(`${APP_URL}/api/internship/health`, {
        cache: 'no-store',
      }),
    ]);

    if (!officeRes.ok) return null;

    const data  = await officeRes.json();
    const health = healthRes.ok ? await healthRes.json() : null;

    // ── Merge clock from health ──
    const clock = health?.calendar
      ? {
          day:            health.calendar.day,
          week:           health.calendar.week,
          week_name:      health.calendar.week_name,
          days_left_total: health.calendar.days_left_total,
          entry_open:     health.calendar.entry_open,
          next_cohort:    health.next_cohort ?? null,
        }
      : null;

    // ── Sanitise flag — never expose internal values ──
    const INTERNAL_FLAGS = ['none', 'stalled', 'nudge', 'at-risk', 'shining'];
    const flag = INTERNAL_FLAGS.includes(data.flag) ? null : data.flag;

    return {
      ...data,
      flag,
      clock,
      // ── Safe defaults for optional fields ──
      badges:          Array.isArray(data.badges)   ? data.badges   : [],
      activity:        Array.isArray(data.activity) ? data.activity : [],
      links:           data.links   ?? {},
      bio:             data.bio     ?? null,
      stack:           data.stack   ?? null,
      channels:        data.channels ?? null,
      github_handle:   data.github_handle ?? null,
      cutoff_status:   data.cutoff_status ?? null,
      elevation_level: data.elevation_level ?? null,
      is_captain:      data.is_captain ?? false,
    };
  } catch {
    return null;
  }
}

// ── Metadata ───────────────────────────────────────────────
export async function generateMetadata(
  { params }: { params: Promise<{ handle: string }> }
): Promise<Metadata> {
  const { handle } = await params;
  const data = await getOfficeData(handle);

  if (!data) return { title: 'Office — antcpu' };

  const track      = data.track === 'marketing' ? '📣 Marketing' : '💻 Dev';
  const trackEmoji = data.track === 'marketing' ? '📣' : '💻';

  return {
    title:       `${data.name} · ${track} · antcpu Office`,
    description: `${data.name} is a ${data.role_title} in the antcpu Human in the Loop Internship Challenge. ${data.progress_pct}% complete · ${data.country}`,
    openGraph: {
      title:       `${data.name} — antcpu Virtual Office`,
      description: `${data.role_title} · ${data.progress_pct}% · ${data.country}`,
      url:         `${APP_URL}/office/${handle}`,
      type:        'profile',
    },
    twitter: {
      card:        'summary_large_image',
      title:       `${data.name} ${trackEmoji} · antcpu Office`,
      description: `${data.name} is building in the antcpu internship challenge — ${track} track. ${data.progress_pct}% complete · ${data.country}`,
      site:        '@antcpu',
      creator:     '@antcpu',
    },
  };
}

// ── Page ───────────────────────────────────────────────────
export default async function OfficePage(
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const data = await getOfficeData(handle);

  if (!data) notFound();

  return <OfficeClient data={data} />;
}
