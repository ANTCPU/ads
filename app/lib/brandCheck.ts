import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Internal-only brands — blocked for all users regardless of email
const INTERNAL_BRANDS = [
  'antcpu ads', 'ads network', 'antcpu ad network',
  'antcpu', 'arena', 'antbot', 'antcoin',
];

export type BrandCheckResult =
  | { status: 'ok' }
  | { status: 'internal'; message: string }
  | { status: 'protected'; brand: string; domain: string; message: string }
  | { status: 'error'; message: string };

export async function checkBrand(brandName: string): Promise<BrandCheckResult> {
  const lower = brandName.trim().toLowerCase();

  // 1 — Block internal brands entirely
  if (INTERNAL_BRANDS.some(b => lower.includes(b))) {
    return {
      status: 'internal',
      message: `"${brandName}" is reserved for internal use and cannot be registered as a brand.`,
    };
  }

  // 2 — Check protected_brands table (name + aliases)
  const { data, error } = await supabase
    .from('protected_brands')
    .select('brand_name, domain, aliases');

  if (error) return { status: 'error', message: 'Brand check unavailable — please try again.' };

  for (const row of data || []) {
    const names = [
      row.brand_name.toLowerCase(),
      ...(row.aliases || []).map((a: string) => a.toLowerCase()),
    ];
    if (names.some(n => lower.includes(n) || n.includes(lower))) {
      return {
        status: 'protected',
        brand: row.brand_name,
        domain: row.domain,
        message: `"${row.brand_name}" is a protected brand. To represent this brand officially, you must verify with a @${row.domain} email address.`,
      };
    }
  }

  return { status: 'ok' };
}

export function getVerificationToken(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}
