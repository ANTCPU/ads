'use client';

import { useSearchParams } from 'next/navigation';

export default function SuccessClient() {
  const params = useSearchParams();
  const name   = params.get('name') ?? 'Challenger';
  const track  = params.get('track') ?? 'dev';
  const first  = name.split(' ')[0];

  const isDev      = track === 'dev';
  const trackIcon  = isDev ? '💻' : '📣';
  const trackLabel = isDev ? 'Developer' : 'Marketer';
  const accent     = '#2563eb';

  return (
    <main style={{ maxWidth: 520, margin: '0 auto', padding: '4rem 1.5rem', fontFamily: 'system-ui,sans-serif', textAlign: 'center' }}>

      {/* Icon */}
      <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>{trackIcon}</div>

      {/* Headline */}
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem' }}>
        You're in, {first}.
      </h1>
      <p style={{ color: '#6b7280', fontSize: '1rem', marginBottom: '0.4rem' }}>
        {trackLabel} · Week 1 — Explorer · Founding Member ⭐
      </p>
      <p style={{ color: '#9ca3af', fontSize: '0.875rem', marginBottom: '2.5rem' }}>
        Check your email for confirmation. Your intro ad is live in the Arena right now.
      </p>

      {/* CTAs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxWidth: 340, margin: '0 auto 2.5rem' }}>
        <a href="https://antcpu.io/challenge/" style={{
          background: accent, color: '#fff', padding: '0.9rem 1.5rem',
          borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '1rem',
        }}>
          View Week 1 Tasks →
        </a>
        <a href="/internship/arena" style={{
          background: '#f3f4f6', color: '#111', padding: '0.9rem 1.5rem',
          borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '1rem',
        }}>
          See the Challenger Board →
        </a>
        <a href="/arena" style={{
          color: '#6b7280', padding: '0.75rem',
          textDecoration: 'none', fontSize: '0.875rem',
        }}>
          Explore the full Arena →
        </a>
      </div>

      {/* What's next card */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: '1.5rem', textAlign: 'left', maxWidth: 400, margin: '0 auto' }}>
        <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '1rem' }}>
          What happens now
        </div>
        {[
          { icon: '📬', text: 'Confirmation email on its way to your inbox' },
          { icon: '⚡', text: 'Your intro ad is live in the Arena — share it to earn your first points' },
          { icon: '📅', text: 'Week 1 tasks are live at antcpu.io/challenge/' },
          { icon: '🌍', text: 'You\'re part of the August 2026 founding cohort' },
        ].map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: '0.75rem', padding: '0.6rem 0', borderBottom: i < 3 ? '1px solid #e5e7eb' : 'none', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '1rem', marginTop: '0.1rem' }}>{item.icon}</span>
            <span style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.5 }}>{item.text}</span>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#d1d5db' }}>
        ⚡ antcpu.io · Human in the Loop · August 2026
      </p>
    </main>
  );
}
