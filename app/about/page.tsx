'use client';
import React from 'react';
import { useRouter } from 'next/navigation';

export default function AboutPage() {
  const router = useRouter();

  const step: React.CSSProperties = { background: '#fff', border: '1px solid #e5e5e5', borderRadius: '16px', padding: '1.5rem', flex: '1', minWidth: '220px', textAlign: 'center' };
  const screenshot: React.CSSProperties = { width: '100%', aspectRatio: '16/9', background: '#f0f0f0', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#bbb', fontSize: '0.8rem', marginBottom: '1rem', border: '1px dashed #ddd' };

  return (
    <div style={{ background: '#f5f5f5', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', color: '#0a0a0a' }}>

      {/* NAV */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e5e5', padding: '1rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span onClick={() => router.push('/')} style={{ fontWeight: 800, fontSize: '1.1rem', color: '#f0883e', cursor: 'pointer', letterSpacing: '0.05em' }}>⚡ ANTCPU ADS</span>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={() => router.push('/login')} style={{ background: 'none', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#0a0a0a' }}>Login</button>
          <button onClick={() => router.push('/login')} style={{ background: '#f0883e', border: 'none', borderRadius: '8px', padding: '0.5rem 1.25rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#fff' }}>Get Started →</button>
        </div>
      </div>

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '3rem 1.25rem' }}>

        {/* HERO */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div style={{ display: 'inline-block', background: '#fff7ed', color: '#f0883e', border: '1px solid #fed7aa', borderRadius: '999px', padding: '0.3rem 1rem', fontSize: '0.75rem', fontWeight: 700, marginBottom: '1rem', letterSpacing: '0.08em' }}>⚡ THE ARENA IS LIVE</div>
          <h1 style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0a0a0a', margin: '0 0 1rem', lineHeight: 1.2 }}>The simplest way to<br />get your brand seen</h1>
          <p style={{ fontSize: '1rem', color: '#666', maxWidth: '520px', margin: '0 auto 2rem', lineHeight: 1.7 }}>ANTCPU ADS is a competitive ad arena where brands grow through real engagement, promo codes, and community sharing — not just spend.</p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/login')} style={{ background: '#f0883e', border: 'none', borderRadius: '10px', padding: '0.85rem 2rem', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', color: '#fff' }}>Start Free Trial →</button>
            <button onClick={() => router.push('/')} style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '10px', padding: '0.85rem 2rem', cursor: 'pointer', fontWeight: 600, fontSize: '1rem', color: '#0a0a0a' }}>View The Arena</button>
          </div>
        </div>

        {/* HOW IT WORKS */}
        <div style={{ marginBottom: '3.5rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>HOW IT WORKS</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, margin: 0 }}>Three steps to the Arena</h2>
          </div>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <div style={step}>
              <div style={screenshot}>📸 screenshot — sign up form</div>
              <div style={{ display: 'inline-block', background: '#f0883e', color: '#fff', borderRadius: '999px', width: '28px', height: '28px', lineHeight: '28px', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.75rem' }}>1</div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 800 }}>Sign Up</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#666', lineHeight: 1.6 }}>Create your account, set your brand name, and get your unique promo code. Takes under 2 minutes.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#ddd', paddingTop: '4rem', minWidth: '24px' }}>→</div>
            <div style={step}>
              <div style={screenshot}>📸 screenshot — ad builder</div>
              <div style={{ display: 'inline-block', background: '#7928ca', color: '#fff', borderRadius: '999px', width: '28px', height: '28px', lineHeight: '28px', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.75rem' }}>2</div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 800 }}>Build Your Ad</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#666', lineHeight: 1.6 }}>Use the Arena ad builder to create your campaign. Choose your tier, category, and message — then publish live.</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', color: '#ddd', paddingTop: '4rem', minWidth: '24px' }}>→</div>
            <div style={step}>
              <div style={screenshot}>📸 screenshot — arena feed</div>
              <div style={{ display: 'inline-block', background: '#22c55e', color: '#fff', borderRadius: '999px', width: '28px', height: '28px', lineHeight: '28px', fontWeight: 800, fontSize: '0.85rem', marginBottom: '0.75rem' }}>3</div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem', fontWeight: 800 }}>Share + Earn</h3>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#666', lineHeight: 1.6 }}>Share your promo code. Every signup through your code earns you points and moves your ad up the Arena.</p>
            </div>
          </div>
        </div>

        {/* THE ARENA */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '16px', padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>THE ARENA</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 1rem' }}>Where ads compete for attention</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            {[
              { icon: '📢', title: 'Live Ad Feed', desc: 'Your ad goes live in the Arena feed the moment you publish. Real users, real clicks.' },
              { icon: '🏆', title: 'Tier System', desc: 'Ads move through Entry → Rising → Featured → Top Tier based on engagement and points.' },
              { icon: '⚡', title: 'Points Engine', desc: 'Every click, share, and referral earns points. More points means more visibility.' },
              { icon: '🗺️', title: 'Brand Arenas', desc: 'Each brand gets their own Arena page — a dedicated space to showcase all their active ads.' },
            ].map(f => (
              <div key={f.title} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '1.3rem' }}>{f.icon}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: '0.25rem' }}>{f.title}</div>
                  <div style={{ fontSize: '0.8rem', color: '#666', lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => router.push('/')} style={{ background: '#f5f5f5', border: '1px solid #e5e5e5', borderRadius: '8px', padding: '0.6rem 1.5rem', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', color: '#0a0a0a' }}>View The Arena →</button>
        </div>

        {/* PROMO CODES */}
        <div style={{ background: '#fff', border: '1px solid #e5e5e5', borderRadius: '16px', padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#888', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>PROMO CODES</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 1rem' }}>Your code is your currency</h2>
          <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.7, marginBottom: '1.25rem' }}>Every member gets a unique promo code at signup. Share it anywhere — social media, messages, your website. When someone signs up using your code, you both benefit. Your ad climbs the Arena, your points grow, and your brand gets seen by more people.</p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {[
              { label: 'Share your code', icon: '🔗' },
              { label: 'Friend signs up', icon: '👤' },
              { label: 'Both earn points', icon: '⚡' },
              { label: 'Ad moves up', icon: '📈' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#f5f5f5', borderRadius: '999px', padding: '0.4rem 1rem', fontSize: '0.82rem', fontWeight: 600 }}>
                <span>{s.icon}</span> {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* REWARDS */}
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '16px', padding: '2rem', marginBottom: '2rem' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f0883e', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>REWARDS</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 1rem' }}>Friendly competition. Real rewards.</h2>
          <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.7, marginBottom: '1rem' }}>The Arena leaderboard tracks every brand's performance. The more your ad gets clicked, shared, and referred — the higher you climb. Top performers get featured placement, recognition, and exclusive rewards as the system grows.</p>
          <div style={{ display: 'inline-block', background: '#fff', border: '1px solid #fed7aa', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.78rem', color: '#f0883e', fontWeight: 700 }}>🏆 Leaderboard launching soon</div>
        </div>

        {/* CTA */}
        <div style={{ background: '#0a0a0a', borderRadius: '16px', padding: '2.5rem', textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff', margin: '0 0 0.75rem' }}>Ready to enter the Arena?</h2>
          <p style={{ fontSize: '0.9rem', color: '#888', marginBottom: '1.5rem' }}>Free 3-day trial. No credit card required.</p>
          <button onClick={() => router.push('/login')} style={{ background: '#f0883e', border: 'none', borderRadius: '10px', padding: '0.85rem 2.5rem', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', color: '#fff' }}>Start Free Trial →</button>
        </div>

        {/* FOOTER */}
        <div style={{ textAlign: 'center', padding: '1rem 0', color: '#aaa', fontSize: '0.78rem', display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span>⚡ ANTCPU ADS</span>
          <a href="/tos" style={{ color: '#aaa', textDecoration: 'none' }}>Terms of Service</a>
          <a href="/privacy" style={{ color: '#aaa', textDecoration: 'none' }}>Privacy Policy</a>
          <a href="mailto:antcpu@gmail.com" style={{ color: '#aaa', textDecoration: 'none' }}>Contact</a>
        </div>

      </div>
    </div>
  );
}
