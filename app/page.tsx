'use client';
import React from 'react';

export default function Page() {
  return (
    <main style={{
      margin: 0,
      padding: 0,
      background: '#000',
      color: '#fff',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      minHeight: '100vh',
    }}>

      {/* NAV */}
      <nav style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1.5rem 2.5rem',
        borderBottom: '1px solid #111',
        position: 'sticky',
        top: 0,
        background: 'rgba(0,0,0,0.85)',
        backdropFilter: 'blur(12px)',
        zIndex: 100,
      }}>
        <span style={{ fontWeight: '900', fontSize: '1.1rem', letterSpacing: '0.08em', color: '#0070f3' }}>
          ANTCPU ADS
        </span>
        <a href="#start" style={{
          background: '#0070f3',
          color: '#fff',
          padding: '0.55rem 1.4rem',
          borderRadius: '6px',
          fontWeight: '700',
          fontSize: '0.9rem',
          textDecoration: 'none',
        }}>
          Start — $9.99/mo
        </a>
      </nav>

      {/* HERO */}
      <section style={{
        maxWidth: '860px',
        margin: '0 auto',
        padding: '7rem 2rem 5rem',
        textAlign: 'center',
      }}>
        <div style={{
          display: 'inline-block',
          background: '#0070f315',
          border: '1px solid #0070f340',
          borderRadius: '999px',
          padding: '0.35rem 1rem',
          fontSize: '0.8rem',
          color: '#0070f3',
          fontWeight: '700',
          letterSpacing: '0.1em',
          marginBottom: '2rem',
          textTransform: 'uppercase',
        }}>
          ⚡ Deployment Status: Active
        </div>

        <h1 style={{
          fontSize: 'clamp(2.8rem, 7vw, 5rem)',
          fontWeight: '900',
          lineHeight: '1.05',
          margin: '0 0 1.5rem',
          letterSpacing: '-0.02em',
        }}>
          Welcome to<br />
          <span style={{
            background: 'linear-gradient(90deg, #0070f3, #7928ca)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            The Arena.
          </span>
        </h1>

        <p style={{
          fontSize: '1.25rem',
          color: '#666',
          maxWidth: '560px',
          margin: '0 auto 3rem',
          lineHeight: '1.7',
        }}>
          The central hub for automated marketing systems.
          Launch 1 ad for <strong style={{ color: '#fff' }}>$9.99/month</strong> —
          earn attention, climb the ladder, scale your reach.
        </p>

        <a href="#start" style={{
          display: 'inline-block',
          background: 'linear-gradient(135deg, #0070f3, #7928ca)',
          color: '#fff',
          padding: '1rem 2.8rem',
          borderRadius: '8px',
          fontWeight: '800',
          fontSize: '1.1rem',
          textDecoration: 'none',
          letterSpacing: '0.01em',
        }}>
          Enter the Arena →
        </a>
      </section>

      {/* STATS BAR */}
      <section style={{
        borderTop: '1px solid #111',
        borderBottom: '1px solid #111',
        padding: '2rem',
        display: 'flex',
        justifyContent: 'center',
        gap: '4rem',
        flexWrap: 'wrap',
        background: '#050505',
      }}>
        {[
          { value: '$9.99', label: 'Per Month' },
          { value: '1', label: 'Ad to Start' },
          { value: '4', label: 'Ladder Levels' },
          { value: '∞', label: 'Reach Potential' },
        ].map(({ value, label }) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', fontWeight: '900', color: '#0070f3' }}>{value}</div>
            <div style={{ fontSize: '0.8rem', color: '#444', marginTop: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section style={{ maxWidth: '860px', margin: '0 auto', padding: '5rem 2rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '2.5rem', textAlign: 'center' }}>
          How It Works
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
          {[
            { n: '01', title: 'Submit Your Ad', body: 'Title, URL, description. 2 minutes to set up.' },
            { n: '02', title: 'Pay $9.99/mo', body: 'Simple subscription. Cancel anytime.' },
            { n: '03', title: 'Go Live', body: 'Your ad enters the network immediately.' },
            { n: '04', title: 'Climb the Ladder', body: 'Engagement earns you higher placement automatically.' },
          ].map(({ n, title, body }) => (
            <div key={n} style={{
              background: '#0a0a0a',
              border: '1px solid #1a1a1a',
              borderRadius: '12px',
              padding: '1.75rem',
            }}>
              <div style={{ fontSize: '2.2rem', fontWeight: '900', color: '#0070f320', marginBottom: '0.75rem' }}>{n}</div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: '800' }}>{title}</h3>
              <p style={{ margin: 0, color: '#555', fontSize: '0.9rem', lineHeight: '1.6' }}>{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* LADDER */}
      <section style={{ maxWidth: '860px', margin: '0 auto', padding: '0 2rem 5rem' }}>
        <h2 style={{ fontSize: '2rem', fontWeight: '900', marginBottom: '2.5rem', textAlign: 'center' }}>
          The Promotion Ladder
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {[
            { level: 'Entry',    pts: 'Start here', desc: 'Standard rotation across the network',            color: '#333', glow: '#33333330' },
            { level: 'Rising',   pts: '100 pts',    desc: 'Higher priority + increased impressions',          color: '#0070f3', glow: '#0070f330' },
            { level: 'Featured', pts: '300 pts',    desc: 'Featured placement + cross-channel distribution',  color: '#7928ca', glow: '#7928ca30' },
            { level: 'Top Tier', pts: '750 pts',    desc: 'Full network + creator channel integrations',      color: '#ff0080', glow: '#ff008030' },
          ].map(({ level, pts, desc, color, glow }) => (
            <div key={level} style={{
              background: '#0a0a0a',
              border: `1px solid ${color}`,
              borderRadius: '10px',
              padding: '1.1rem 1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: `0 0 20px ${glow}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{
                  background: color,
                  color: '#fff',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}>{level}</span>
                <span style={{ color: '#555', fontSize: '0.9rem' }}>{desc}</span>
              </div>
              <span style={{ color, fontWeight: '800', fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{pts}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="start" style={{
        maxWidth: '700px',
        margin: '0 auto',
        padding: '0 2rem 8rem',
        textAlign: 'center',
      }}>
        <div style={{
          background: '#0a0a0a',
          border: '1px solid #1a1a1a',
          borderRadius: '20px',
          padding: '4rem 2rem',
        }}>
          <h2 style={{ fontSize: '2.5rem', fontWeight: '900', margin: '0 0 1rem', lineHeight: '1.1' }}>
            Ready to Enter<br />the Arena?
          </h2>
          <p style={{ color: '#555', marginBottom: '2.5rem', fontSize: '1rem' }}>
            1 ad. $9.99/month. No contracts. Cancel anytime.
          </p>
          <a href="mailto:antcpu@gmail.com" style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #0070f3, #7928ca)',
            color: '#fff',
            padding: '1rem 2.8rem',
            borderRadius: '8px',
            fontWeight: '800',
            fontSize: '1.1rem',
            textDecoration: 'none',
          }}>
            Get Started →
          </a>
          <p style={{ color: '#333', fontSize: '0.8rem', marginTop: '1.5rem' }}>
            Questions? <a href="mailto:antcpu@gmail.com" style={{ color: '#444' }}>antcpu@gmail.com</a>
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{
        borderTop: '1px solid #111',
        padding: '2rem',
        textAlign: 'center',
        color: '#333',
        fontSize: '0.8rem',
      }}>
        © {new Date().getFullYear()} ANTCPU. All rights reserved.
      </footer>

    </main>
  );
}
