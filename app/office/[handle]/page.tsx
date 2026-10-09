// ============================================================
// app/office/[handle]/page.tsx
// Public challenger virtual office
//
// Server component — fetches /api/office/[handle]
// Track-aware theming: dev (dark/bold) | marketing (fall/warm)
// Light/dark toggle works via existing ThemeProvider
// Share module drops in via existing ShareModule
// ============================================================

import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import OfficeClient from './OfficeClient';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ??
  'https://antcpu-ads.vercel.app';

async function getOfficeData(handle: string) {
  const res = await fetch(`${APP_URL}/api/office/${handle}`, {
    cache: 'no-store',
  });
  if (!res.ok) return null;
  return res.json();
}

export async function generateMetadata(
  { params }: { params: Promise<{ handle: string }> }
): Promise<Metadata> {
  const { handle } = await params;
  const data = await getOfficeData(handle);
  if (!data) return { title: 'Office — antcpu' };

  const track = data.track === 'dev' ? '💻 Dev' : '📣 Marketing';
  const trackEmoji = data.track === 'dev' ? '💻' : '📣';

  return {
    title: `${data.name} · ${track} · antcpu Office`,
    description: `${data.name} is a ${data.role_title} in the antcpu Human in the Loop Internship Challenge. ${data.progress_pct}% complete · ${data.country}`,
    openGraph: {
      title: `${data.name} — antcpu Virtual Office`,
      description: `${data.role_title} · ${data.progress_pct}% · ${data.country}`,
      url: `${APP_URL}/office/${handle}`,
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: `${data.name} ${trackEmoji} · antcpu Office`,
      description: `${data.name} is building in the antcpu internship challenge — ${track} track. ${data.progress_pct}% complete · ${data.country}`,
      site: '@antcpu',
      creator: '@antcpu',
    },
  };
}

export default async function OfficePage(
  { params }: { params: Promise<{ handle: string }> }
) {
  const { handle } = await params;
  const data = await getOfficeData(handle);
  if (!data) notFound();
  return <OfficeClient data={data} />;
}
