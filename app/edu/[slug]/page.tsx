// app/edu/[slug]/page.tsx
import { Metadata } from 'next'
import { createClient } from '@supabase/supabase-js'
import EduClassClient from './EduClassClient'

const BASE = 'https://antcpu-ads.vercel.app'
const DEFAULT_OG = 'https://antcpu.com/edu/antcpuedu.jpg'

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> }
): Promise<Metadata> {
  const { slug } = await params

  let title = 'antcpu EDU'
  let description = 'Free classes in tech, art, music and religion.'
  let ogImage = DEFAULT_OG

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    const { data: cls } = await supabase
      .from('edu_classes')
      .select('label, description, icon')
      .eq('slug', slug)
      .maybeSingle()

    if (cls) {
      title = `${cls.label} — antcpu EDU`
      if (cls.description) description = cls.description
    }
  } catch {
    // fall through to defaults
  }

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${BASE}/edu/${slug}`,
      siteName: 'ANTCPU ADS',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

export default function EduClassPage() {
  return <EduClassClient />
}
