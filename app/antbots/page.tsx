'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ArenaFooter from '../components/ArenaFooter';

const BOTS = [
  { id: 'ANT-01', icon: '📡', channel: 'Brand Awareness',     desc: 'Positions your brand across the network with precision messaging.' },
  { id: 'ANT-02', icon: '🔍', channel: 'Google Ads',          desc: 'Writes search-optimised headlines and descriptions for paid reach.' },
  { id: 'ANT-03', icon: '📸', channel: 'Meta / Instagram',    desc: 'Crafts captions, CTAs and hashtag sets for visual platforms.' },
  { id: 'ANT-04', icon: '🐦', channel: 'Twitter / X',         desc: 'Generates stat-driven and community tweets tuned for engagement.' },
  { id: 'ANT-05', icon: '👾', channel: 'Reddit',              desc: 'Writes authentic community posts that start real conversations.' },
  { id: 'ANT-06', icon: '🎬', channel: 'YouTube',             desc: 'Produces 60-second Shorts scripts with on-screen text cues.' },
  { id: 'ANT-07', icon: '🎵', channel: 'TikTok',              desc: 'Builds hook-first concepts targeting crypto-curious audiences.' },
  { id: 'ANT-08', icon: '📝', channel: 'SEO / Content',       desc: 'Writes keyword-rich blog intros that rank and convert.' },
  { id: 'ANT-09', icon: '💬', channel: 'Discord / Community', desc: 'Drafts announcements that drive replies and community growth.' },
  { id: 'ANT-10', icon: '📧', channel: 'Email Campaign',      desc: 'Builds welcome sequences that onboard and retain new users.' },
];

const AGENTS = [
  { name: 'Aria',   icon: '🦋', color: '#f0883e', role: 'Reviews every ad before it goes live. Quality gate.' },
  { name: 'Scout',  icon: '🔍', color: '#00ffcc', role: 'Scores performance. Tracks clicks, shares, and points.' },
  { name: 'Herald', icon: '📣', color: '#0070f3', role: 'Distributes your ad across the network. Referral engine.' },
  { name: 'Forge',  icon: '⚙️', color: '#7928ca', role: 'Upgrades your tier when you earn it. Tier gatekeeper.' },
];

export default function AntbotsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => { setMounted(true); }, []);

  const bg = '#0a0a0a';
  const card = '#111';
  const border = '#1a1a1a';
  const orange = '#f0883e';
  const white = '#fff';
  const muted = '#888';
  const muted2 = '#444';

  if (!mounted) return null;

  return (
    <div style={{ background: bg, color: white, fontFamily: 'system-ui, sans-serif', minHeight: '100vh' }}>
      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        @keyframes scanline {
          0%   { transform: translateY(-100%); }
          100% { transform: translateY(100vh); }
        }
        .bot-card:hover { border-color: #f0883e44 !important; background: #141414 !important; }
        .agent-card:hover { border-color: var(--agent-color) !important; }
        .cta-btn:hover { opacity: 0.85; transform: translateY(-1px); }
      `}</style>

      {/* NAV */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 clamp(16px,5vw,48px)', height: '60px',
        borderBottom: `1px solid ${border}`, position: 'sticky', top: 0,
        background: 'rgba(10,10,10,0.92)', backdropFilter: 'blur(12px)', zIndex: 100 }}>
        <button onClick={() => router.push('/')} style={{ fontWeight: 800, fontSize: '18px',
          color: white, background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '-0.5px' }}>
          ⚡ ANTCPU ADS
        </button>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button onClick={() => router.push('/arena')} style={{ color: muted, background: 'none',
            border: 'none', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}>
            The Arena
          </button>
          <button onClick={() => router.push('/login')} style={{ background: orange, color: white,
            border: 'none', borderRadius: '8px', padding: '8px 18px', fontSize: '14px',
            fontWeight: 700, cursor: 'pointer' }} className="cta-btn">
            Start Free →
          </button>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ position: 'relative', overflow: 'hidden', padding: '80px clamp(16px,5vw,48px) 60px',
        textAlign: 'center', maxWidth: '800px', margin: '0 auto',
        animation: 'fadeUp 0.6s ease both' }}>

        {/* scanline effect */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', opacity: 0.03 }}>
          <div style={{ position: 'absolute', left: 0, right: 0, height: '2px',
            background: 'linear-gradient(to right, transparent, #f0883e, transparent)',
            animation: 'scanline 4s linear infinite' }} />
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px',
          background: '#1a1a1a', border: `1px solid ${border}`, borderRadius: '999px',
          padding: '6px 16px', fontSize: '12px', fontWeight: 700, letterSpacing: '2px',
          textTransform: 'uppercase', color: orange, marginBottom: '24px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: orange,
            animation: 'pulse 2s ease infinite', display: 'inline-block' }} />
          10 Antbots · Always On
        </div>

        <h1 style={{ fontSize: 'clamp(36px,6vw,64px)', fontWeight: 800, letterSpacing: '-2px',
          lineHeight: 1.05, marginBottom: '20px',
          background: `linear-gradient(135deg, ${white} 40%, ${orange})`,
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Your brand.<br />10 agents.<br />Zero sleep.
        </h1>

        <p style={{ color: muted, fontSize: 'clamp(16px,2vw,20px)', lineHeight: 1.7,
          maxWidth: '560px', margin: '0 auto 36px' }}>
          Every brand in the Arena gets a pod of 10 AI antbots — each one owns a channel,
          runs its own campaign, and reports back. You set the brand. They do the work.
        </p>

        <button onClick={() => router.push('/login')} className="cta-btn"
          style={{ background: orange, color: white, border: 'none', borderRadius: '10px',
            padding: '14px 36px', fontSize: '16px', fontWeight: 700, cursor: 'pointer',
            transition: 'opacity 0.2s, transform 0.15s' }}>
          Deploy Your Pod →
        </button>
      </div>

      {/* THE 10 BOTS */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 clamp(16px,5vw,48px) 80px' }}>

        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px',
            textTransform: 'uppercase', color: muted2, marginBottom: '12px' }}>
            The Pod
          </div>
          <h2 style={{ fontSize: 'clamp(24px,3vw,36px)', fontWeight: 800,
            letterSpacing: '-1px', color: white }}>
            10 channels. 10 specialists.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
          {BOTS.map((bot, i) => (
            <div key={bot.id} className="bot-card"
              onClick={() => setActive(active === i ? null : i)}
              style={{ background: card, border: `1px solid ${active === i ? '#f0883e44' : border}`,
                borderRadius: '12px', padding: '1.25rem', cursor: 'pointer',
                transition: 'all 0.2s', animation: `fadeUp 0.4s ease ${i * 0.05}s both` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '1.4rem' }}>{bot.icon}</span>
                <div>
                  <div style={{ fontSize: '0.7rem', color: orange, fontWeight: 700,
                    letterSpacing: '1px', textTransform: 'uppercase' }}>{bot.id}</div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: white }}>{bot.channel}</div>
                </div>
              </div>
              <p style={{ fontSize: '0.78rem', color: muted, lineHeight: 1.6, margin: 0 }}>
                {bot.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* THE AGENT LAYER */}
      <div style={{ borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`,
        padding: '64px clamp(16px,5vw,48px)' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px',
              textTransform: 'uppercase', color: muted2, marginBottom: '12px' }}>
              The Agent Layer
            </div>
            <h2 style={{ fontSize: 'clamp(24px,3vw,36px)', fontWeight: 800,
              letterSpacing: '-1px', color: white, marginBottom: '12px' }}>
              Four agents run the Arena.
            </h2>
            <p style={{ color: muted, fontSize: '1rem', maxWidth: '480px', margin: '0 auto' }}>
              Behind every campaign, four specialist agents keep the system honest,
              fast, and growing.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {AGENTS.map((agent) => (
              <div key={agent.name} className="agent-card"
                style={{ background: card, border: `1px solid ${border}`, borderRadius: '12px',
                  padding: '1.5rem', transition: 'border-color 0.2s',
                  ['--agent-color' as any]: agent.color }}>
                <div style={{ fontSize: '1.8rem', marginBottom: '8px' }}>{agent.icon}</div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: agent.color,
                  marginBottom: '6px' }}>{agent.name}</div>
                <div style={{ fontSize: '0.78rem', color: muted, lineHeight: 1.6 }}>{agent.role}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT CONNECTS */}
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '80px clamp(16px,5vw,48px)',
        textAlign: 'center' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '3px',
          textTransform: 'uppercase', color: muted2, marginBottom: '12px' }}>
          The Loop
        </div>
        <h2 style={{ fontSize: 'clamp(24px,3vw,36px)', fontWeight: 800,
          letterSpacing: '-1px', color: white, marginBottom: '16px' }}>
          Submit once. Run forever.
        </h2>
        <p style={{ color: muted, fontSize: '1rem', lineHeight: 1.8, marginBottom: '48px' }}>
          You submit your brand. Aria reviews it. Your pod of 10 antbots deploys across
          every channel. Scout tracks what's working. Herald amplifies it. Forge upgrades
          your tier when you earn it. The loop runs 24/7 — you just watch the points climb.
        </p>

        {/* Loop visual */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '0', flexWrap: 'wrap', marginBottom: '48px' }}>
          {['Submit', 'Aria Reviews', '10 Antbots Deploy', 'Scout Scores', 'Herald Amplifies', 'Tier Climbs'].map((step, i, arr) => (
            <React.Fragment key={step}>
              <div style={{ background: card, border: `1px solid ${border}`, borderRadius: '8px',
                padding: '8px 14px', fontSize: '0.75rem', fontWeight: 600, color: i === 0 ? orange : white,
                margin: '4px' }}>
                {step}
              </div>
              {i < arr.length - 1 && (
                <span style={{ color: muted2, fontSize: '0.75rem', margin: '0 2px' }}>→</span>
              )}
            </React.Fragment>
          ))}
        </div>

        <button onClick={() => router.push('/login')} className="cta-btn"
          style={{ background: orange, color: white, border: 'none', borderRadius: '10px',
            padding: '14px 36px', fontSize: '16px', fontWeight: 700, cursor: 'pointer',
            transition: 'opacity 0.2s, transform 0.15s', marginBottom: '16px', display: 'block',
            width: '100%', maxWidth: '320px', margin: '0 auto 12px' }}>
          Deploy Your Pod →
        </button>
        <div style={{ fontSize: '0.8rem', color: muted2 }}>
          Free 3-day trial · No credit card · Live within hours
        </div>
      </div>

      <ArenaFooter />
    </div>
  );
}
