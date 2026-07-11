// ─── Hashtags ─────────────────────────────────────────────────────────────────
// Single source of truth for all category hashtags.
// Import from here — never hardcode hashtags in platform files.

export const HASHTAGS: Record<string, string> = {
  'Pi Commerce':        '#mapofpi #pinetwork #picommerce #pioneers',
  'Brand Awareness':    '#branding #marketing #growthhacking #antcpuads',
  'Product Launch':     '#productlaunch #startup #newproduct #antcpuads',
  'Content Promotion':  '#content #creator #marketing #antcpuads',
  'Service Offering':   '#services #business #antcpuads',
  'Event':              '#event #community #antcpuads',
  'Other':              '#marketing #ads #antcpuads',
};

export function getHashtags(category: string): string {
  return HASHTAGS[category] || HASHTAGS['Other'];
}
