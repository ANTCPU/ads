'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import ArenaFooter from '../components/ArenaFooter';

const STORY = [
  { year: '2024', text: 'ANTCPU ADS founded in Thomasville, NC by veteran entrepreneur Antony Ciccone. First brand in the Arena: ANTCPU itself.' },
  { year: 'Early 2025', text: 'Map of Pi joins as the first external client — 2024 Pi Commerce Hackathon winner. The Country Champion program is born.' },
  { year: 'Mid 2025', text: 'The antbot pod system launches. 10 AI agents per brand. Each one owns a channel. Zero sleep.' },
  { year: '2026', text: 'Arena module system ships. Aria goes live. The network reaches 4 countries, 30+ active ads, 7 brands.' },
];

const VALUES = [
  { icon: '⚡', title: 'Built to last', desc: 'Veteran-built infrastructure. No shortcuts. No hype. Real systems for real brands.' },
  { icon: '🤝', title: 'Brands first', desc: 'Every feature exists to help a brand grow. Not to impress investors. Not to win awards.' },
  { icon: '🌍', title: 'Global by default', desc: '8 languages. Every arena is live worldwide from day one. Your brand has no borders.' },
  { icon: '🦋', title: 'AI with intention', desc: 'Aria, Scout, Herald, Forge — four agents with specific jobs. No AI for the sake of AI.' },
];

export default function AboutPage() {
  const router = useRouter();

  const bg = '#0a0a0a';
  const border = '#1a1a1a';
  const orange = '#f0883e';
  const white = '#fff';
  const muted = '#555';
  const muted2 = '#333';

  return (
    <div style={{ background: bg, color: white, fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>

      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 clamp(16px,5vw,48px)', height: '60px',
        borderBottom: `1px solid ${border}`, position: 'sticky', top: 0,
        background: 'rgba(10,10,10,0.95)', backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <button onClick={() => router.push('/')}
          style={{ fontWeight: 800, fontSize: '18px', color: white,
            background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '-0.5px' }}>
          ⚡ ANTCPU ADS
        </button>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => router.push('/arena')}
            style={{ color: muted, background: 'none', border: 'none',
              cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
            The Arena
          </button>
          <button onClick={() => router.push('/login')}
            style={{ background: orange, color: white, border: 'none',
              borderRadius: '8px', padding: '8px 18px', fontSize: '14px',
              fontWeight: 700, cursor: 'pointer' }}>
            Start Free →
          </button>
        </div>
      </nav>

      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '80px clamp(16px,5vw,48px) 0' }}>

        {/* HERO */}
        <div style={{ marginBottom: '80px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px',
            textTransform: 'uppercase', color: muted2, marginBottom: '20px' }}>
            About
          </div>
          <h1 style={{ fontSize: 'clamp(36px,6vw,56px)', fontWeight: 800,
            letterSpacing: '-2px', lineHeight: 1.05, marginBottom: '24px' }}>
            We built the Arena<br />because we needed it.
          </h1>
          <p style={{ color: muted, fontSize: '1.1rem', lineHeight: 1.8, maxWidth: '560px' }}>
            ANTCPU ADS is an automated marketing network built by a veteran entrepreneur
            in Thomasville, NC. Not a startup. Not a pitch deck. A working system for
            brands that want to grow without an agency.
          </p>
        </div>

        {/* STORY */}
        <div style={{ marginBottom: '80px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px',
            textTransform: 'uppercase', color: muted2, marginBottom: '32px' }}>
            The Story
          </div>
          <div style={{ position: 'relative' }}>
            {/* Timeline line */}
            <div style={{ position: 'absolute', left: '72px', top: 0, bottom: 0,
              width: '1px', background: border }} />
            {STORY.map((s, i) => (
              <div key={i} style={{ display: 'flex', gap: '32px', marginBottom: '40px', position: 'relative' }}>
                <div style={{ minWidth: '72px', fontSize: '0.72rem', color: orange,
                  fontWeight: 700, paddingTop: '2px', textAlign: 'right' }}>
                  {s.year}
                </div>
                {/* Dot */}
                <div style={{ position: 'absolute', left: '68px', top: '6px',
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: orange, border: `2px solid ${bg}` }} />
                <div style={{ paddingLeft: '20px', fontSize: '0.9rem',
                  color: '#aaa', lineHeight: 1.7 }}>
                  {s.text}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* VALUES */}
        <div style={{ marginBottom: '80px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px',
            textTransform: 'uppercase', color: muted2, marginBottom: '32px' }}>
            What we believe
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1px',
            border: `1px solid ${border}`, borderRadius: '12px', overflow: 'hidden' }}>
            {VALUES.map((v, i) => (
              <div key={i} style={{ padding: '1.75rem', background: '#0d0d0d',
                borderRight: i % 2 === 0 ? `1px solid ${border}` : 'none',
                borderBottom: i < 2 ? `1px solid ${border}` : 'none' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{v.icon}</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '8px' }}>{v.title}</div>
                <div style={{ fontSize: '0.82rem', color: muted, lineHeight: 1.7 }}>{v.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* FOUNDER */}
        <div style={{ marginBottom: '80px', padding: '2rem', background: '#0d0d0d',
          border: `1px solid ${border}`, borderRadius: '16px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px',
            textTransform: 'uppercase', color: muted2, marginBottom: '16px' }}>
            The Builder
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '8px' }}>
            Antony Ciccone
          </div>
          <div style={{ fontSize: '0.72rem', color: orange, fontWeight: 600,
            marginBottom: '16px', letterSpacing: '0.05em' }}>
            Founder · Thomasville, NC · US Army Veteran
          </div>
          <p style={{ fontSize: '0.88rem', color: muted, lineHeight: 1.8, margin: 0 }}>
            Built ANTCPU ADS from scratch — infrastructure, agents, arena, and all.
            The same system we use to promote our own brand is the one we give to every
            advertiser. If it doesn't work for us, it doesn't ship.
          </p>
        </div>

        {/* CTA */}
        <div style={{ textAlign: 'center', marginBottom: '80px' }}>
          <h2 style={{ fontSize: 'clamp(24px,4vw,36px)', fontWeight: 800,
            letterSpacing: '-1px', marginBottom: '16px' }}>
            Ready to run?
          </h2>
          <p style={{ color: muted, fontSize: '0.95rem', marginBottom: '32px' }}>
            Free 3-day trial. No credit card. Live before tonight.
          </p>
          <button onClick={() => router.push('/login')}
            style={{ background: orange, color: white, border: 'none',
              borderRadius: '10px', padding: '14px 40px', fontSize: '16px',
              fontWeight: 700, cursor: 'pointer', marginBottom: '12px',
              display: 'block', width: '100%', maxWidth: '280px', margin: '0 auto 12px' }}>
            Enter the Arena →
          </button>
          <button onClick={() => router.push('/antbots')}
            style={{ background: 'none', color: muted, border: `1px solid ${border}`,
              borderRadius: '10px', padding: '12px 40px', fontSize: '14px',
              fontWeight: 600, cursor: 'pointer', display: 'block',
              width: '100%', maxWidth: '280px', margin: '0 auto' }}>
            Meet the Antbots
          </button>
        </div>

      </div>

      <ArenaFooter />
    </div>
  );
}
