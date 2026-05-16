//
//  page.tsx
//  
//
//  Created by Joseph Antony Ciccone on 5/16/26.
//
'use client';

import React, { useState, useEffect } from 'react';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { es } from '../lib/i18n/es';

export default function EsPage() {
  const [scrolled, setScrolled] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    document.documentElement.dir = 'rtl';
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.documentElement.dir = 'ltr';
    };
  }, []);

  // ── TOKENS ──────────────────────────────────────────────────────
  const bg      = '#0a0a0a';
  const card    = '#111';
  const border  = '#1a1a1a';
  const border2 = '#222';
  const blue    = '#0070f3';
  const orange  = '#f0883e';
  const purple  = '#7928ca';
  const gold    = '#D4AF37';
  const teal    = '#00ffcc';
  const white   = '#fff';
  const muted   = '#888';
  const muted2  = '#555';

  // ── REUSABLE STYLE OBJECTS ───────────────────────────────────────
  const navStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 clamp(16px, 5vw, 48px)',
    height: '60px',
    background: scrolled ? 'rgba(10,10,10,0.92)' : bg,
    backdropFilter: scrolled ? 'blur(12px)' : 'none',
    borderBottom: `1px solid ${border}`,
    transition: 'background 0.3s, backdrop-filter 0.3s',
  };

  const logoStyle: React.CSSProperties = {
    fontSize: '18px',
    fontWeight: 800,
    letterSpacing: '-0.5px',
    color: white,
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  };

  const navLinksStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  };

  const signInStyle: React.CSSProperties = {
    color: muted,
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
    padding: '8px 14px',
    borderRadius: '8px',
    transition: 'color 0.2s',
  };

  const ctaButtonStyle: React.CSSProperties = {
    background: blue,
    color: white,
    border: 'none',
    borderRadius: '8px',
    padding: '9px 18px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
    letterSpacing: '-0.2px',
    transition: 'opacity 0.2s, transform 0.15s',
  };

  const sectionStyle: React.CSSProperties = {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '0 clamp(16px, 5vw, 48px)',
  };

  const gridLine: React.CSSProperties = {
    position: 'absolute',
    background: 'linear-gradient(to bottom, transparent, #ffffff08, transparent)',
    top: 0,
    bottom: 0,
    width: '1px',
  };

  const sectionHeadStyle: React.CSSProperties = {
    fontSize: 'clamp(11px, 1.2vw, 12px)',
    fontWeight: 700,
    letterSpacing: '3px',
    textTransform: 'uppercase' as const,
    color: muted2,
    marginBottom: '16px',
  };

  const h2Style: React.CSSProperties = {
    fontSize: 'clamp(28px, 4vw, 42px)',
    fontWeight: 800,
    letterSpacing: '-1px',
    color: white,
    marginBottom: '16px',
    lineHeight: 1.1,
  };

  const keyframes = `
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(24px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50%       { opacity: 0.5; }
    }
    @keyframes glow {
      0%, 100% { box-shadow: 0 0 20px rgba(0,112,243,0.3); }
      50%       { box-shadow: 0 0 40px rgba(0,112,243,0.6); }
    }
    .cta-btn:hover { opacity: 0.85; transform: translateY(-1px); }
    .sign-in-link:hover { color: #ccc !important; }
    .ladder-row:hover { background: #161616 !important; }
    .pricing-card:hover { border-color: #333 !important; transform: translateY(-4px); }
    .partner-link:hover { opacity: 0.8; }
  `;

  const stats = [
    { value: es.stat_free_val,  label: es.stat_free_label },
    { value: '\$9.99',           label: es.stat_price_label },
    { value: '4',               label: es.stat_levels_label },
    { value: '∞',               label: es.stat_reach_label },
  ];

  const steps = [
    { num: '01', title: es.step_01_title, desc: es.step_01_desc },
    { num: '02', title: es.step_02_title, desc: es.step_02_desc },
    { num: '03', title: es.step_03_title, desc: es.step_03_desc },
    { num: '04', title: es.step_04_title, desc: es.step_04_desc },
  ];

  const ladder = [
    { tier: 'Entry',    color: teal,   pts: es.ladder_entry_pts,    desc: es.ladder_entry_desc },
    { tier: 'Rising',   color: blue,   pts: es.ladder_rising_pts,   desc: es.ladder_rising_desc },
    { tier: 'Featured', color: orange, pts: es.ladder_featured_pts, desc: es.ladder_featured_desc },
    { tier: 'Top Tier', color: gold,   pts: es.ladder_top_pts,      desc: es.ladder_top_desc },
  ];

  const plans = [
    {
      name:     es.plan_trial_name,
      price:    es.plan_trial_price,
      period:   es.plan_trial_period,
      badge:    '',
      badgeColor: '',
      color:    teal,
      features: [es.plan_trial_f1, es.plan_trial_f2, es.plan_trial_f3, es.plan_trial_f4],
      cta:      es.plan_trial_cta,
      disabled: false,
    },
    {
      name:     es.plan_arena_name,
      price:    es.plan_arena_price,
      period:   es.plan_arena_period,
      badge:    es.plan_arena_badge,
      badgeColor: orange,
      color:    orange,
      features: [es.plan_arena_f1, es.plan_arena_f2, es.plan_arena_f3, es.plan_arena_f4, es.plan_arena_f5, es.plan_arena_f6],
      cta:      es.plan_arena_cta,
      disabled: false,
    },
    {
      name:     es.plan_pro_name,
      price:    es.plan_pro_price,
      period:   es.plan_pro_period,
      badge:    es.plan_pro_badge,
      badgeColor: purple,
      color:    purple,
      features: [es.plan_pro_f1, es.plan_pro_f2, es.plan_pro_f3, es.plan_pro_f4, es.plan_pro_f5, es.plan_pro_f6],
      cta:      es.plan_pro_cta,
      disabled: true,
    },
    {
      name:     es.plan_deluxe_name,
      price:    es.plan_deluxe_price,
      period:   es.plan_deluxe_period,
      badge:    es.plan_deluxe_badge,
      badgeColor: gold,
      color:    gold,
      features: [es.plan_deluxe_f1, es.plan_deluxe_f2, es.plan_deluxe_f3, es.plan_deluxe_f4, es.plan_deluxe_f5, es.plan_deluxe_f6],
      cta:      es.plan_deluxe_cta,
      disabled: true,
    },
  ];

  return (
    <>
      <style>{keyframes}</style>

      {/* NAV */}
      <nav style={navStyle}>
        <a href="/" style={logoStyle}>
          <span style={{ color: blue }}>⚡</span>
          <span>ANTCPU ADS</span>
        </a>
        <div style={navLinksStyle}>
          <LanguageSwitcher />
          <a href="/login" style={signInStyle} className="sign-in-link">{es.nav_signin}</a>
          <a href="/login#start" style={ctaButtonStyle} className="cta-btn">{es.nav_start}</a>
        </div>
      </nav>

      {/* PAGE WRAPPER */}
      <div style={{ background: bg, color: white, fontFamily: 'system-ui, -apple-system, sans-serif', minHeight: '100vh', paddingTop: '60px', overflowX: 'hidden' }}>

        {/* HERO */}
        <section style={{ position: 'relative', padding: 'clamp(80px, 12vw, 160px) 0 clamp(60px, 8vw, 100px)', textAlign: 'center', overflow: 'hidden' }}>
          {[15, 30, 50, 70, 85].map((pct, i) => (
            <div key={i} style={{ ...gridLine, left: `${pct}%` }} />
          ))}
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(0,112,243,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

          <div style={{ ...sectionStyle, position: 'relative' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              background: '#0070f312', border: `1px solid #0070f330`,
              borderRadius: '100px', padding: '6px 16px',
              fontSize: '12px', fontWeight: 700, color: blue,
              letterSpacing: '1px', textTransform: 'uppercase',
              marginBottom: '28px',
              opacity: mounted ? 1 : 0,
              animation: mounted ? 'fadeUp 0.6s ease forwards' : 'none',
            }}>
              <span style={{ animation: 'pulse 2s infinite' }}>⚡</span>
              {es.hero_badge}
            </div>

            <h1 style={{
              fontSize: 'clamp(44px, 8vw, 96px)',
              fontWeight: 900,
              letterSpacing: '-3px',
              lineHeight: 1,
              marginBottom: '24px',
              background: `linear-gradient(135deg, ${white} 0%, #aaa 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              opacity: mounted ? 1 : 0,
              animation: mounted ? 'fadeUp 0.6s 0.1s ease forwards both' : 'none',
            }}>
              {es.hero_title}
            </h1>

            <p style={{
              fontSize: 'clamp(16px, 2vw, 20px)',
              color: muted,
              maxWidth: '520px',
              margin: '0 auto 36px',
              lineHeight: 1.7,
              opacity: mounted ? 1 : 0,
              animation: mounted ? 'fadeUp 0.6s 0.2s ease forwards both' : 'none',
            }}>
              {es.hero_sub}<br />
              <span style={{ color: white, fontWeight: 600 }}>{es.hero_trial}</span>
            </p>

            <div style={{
              display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap',
              opacity: mounted ? 1 : 0,
              animation: mounted ? 'fadeUp 0.6s 0.3s ease forwards both' : 'none',
            }}>
              <a href="/login" style={{ ...ctaButtonStyle, padding: '14px 28px', fontSize: '16px', animation: 'glow 3s infinite' }} className="cta-btn">
                {es.hero_cta_primary}
              </a>
              <a href="/login" style={{ display: 'inline-block', padding: '14px 28px', fontSize: '16px', fontWeight: 600, color: muted, textDecoration: 'none', border: `1px solid ${border2}`, borderRadius: '8px', transition: 'color 0.2s, border-color 0.2s' }} className="sign-in-link">
                {es.hero_cta_secondary}
              </a>
            </div>
          </div>
        </section>

        {/* STATS BAR */}
        <div style={{ borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, background: '#0d0d0d' }}>
          <div style={{ ...sectionStyle, padding: '0 clamp(16px, 5vw, 48px)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0' }}>
              {stats.map((s, i) => (
                <div key={i} style={{ padding: '28px 24px', textAlign: 'center', borderRight: i < stats.length - 1 ? `1px solid ${border}` : 'none' }}>
                  <div style={{ fontSize: 'clamp(24px, 3vw, 32px)', fontWeight: 900, letterSpacing: '-1px', color: white, marginBottom: '4px' }}>{s.value}</div>
                  <div style={{ fontSize: '12px', color: muted, letterSpacing: '1px', textTransform: 'uppercase', fontWeight: 600 }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* FEATURED PARTNER */}
        <section style={{ padding: 'clamp(60px, 8vw, 100px) 0' }}>
          <div style={sectionStyle}>
            <div style={{ textAlign: 'center', marginBottom: '40px' }}>
              <div style={sectionHeadStyle}>{es.partner_section_label}</div>
            </div>
            <div style={{ background: card, border: `1px solid ${gold}`, borderRadius: '16px', padding: 'clamp(28px, 4vw, 48px)', position: 'relative', overflow: 'hidden', boxShadow: `0 0 60px rgba(212,175,55,0.12)` }}>
              <div style={{ position: 'absolute', top: 0, right: 0, width: '200px', height: '200px', background: 'radial-gradient(circle at top right, rgba(212,175,55,0.15), transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: '1 1 320px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '32px' }}>🗺️</span>
                    <div>
                      <div style={{ fontSize: '22px', fontWeight: 800, color: white, letterSpacing: '-0.5px' }}>Map of Pi</div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: gold, letterSpacing: '2px', textTransform: 'uppercase' }}>{es.partner_section_label}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: gold, marginBottom: '16px' }}>
                    🏆 2024 Pi Commerce Hackathon Winner — Pi Network v1.8
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '20px' }}>
                    {[
                      { v: '2.1M+', l: es.partner_users_label },
                      { v: '148K',  l: es.partner_sellers_label },
                      { v: '173K+', l: es.partner_tx_label },
                      { v: '\$0.17', l: es.partner_price_label },
                    ].map((st, i) => (
                      <div key={i} style={{ background: '#161616', border: `1px solid #2a2a20`, borderRadius: '8px', padding: '10px 14px' }}>
                        <div style={{ fontSize: '18px', fontWeight: 800, color: gold }}>{st.v}</div>
                        <div style={{ fontSize: '11px', color: muted, marginTop: '2px' }}>{st.l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: '#0d1208', border: `1px solid #2a3a1a`, borderRadius: '10px', padding: '14px 18px', fontSize: '14px', color: '#a8d870', fontWeight: 600 }}>
                    🤝 {es.partner_affil}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '160px' }}>
                  <a href="https://mapofpi.com" target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: gold, color: '#0a0a0a', borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 800, textDecoration: 'none', justifyContent: 'center' }}
                    className="partner-link">
                    {es.partner_visit_cta}
                  </a>
                  <a href="https://youtube.com/@mapofpi" target="_blank" rel="noopener noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#1a1a1a', border: `1px solid #333`, color: white, borderRadius: '8px', padding: '10px 18px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', justifyContent: 'center' }}
                    className="partner-link">
                    ▶ YouTube
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section style={{ padding: 'clamp(60px, 8vw, 100px) 0', borderTop: `1px solid ${border}` }}>
          <div style={sectionStyle}>
            <div style={{ textAlign: 'center', marginBottom: '56px' }}>
              <div style={sectionHeadStyle}>{es.how_section_label}</div>
              <h2 style={{ ...h2Style, marginBottom: 0 }}>{es.how_title}</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1px', background: border }}>
              {steps.map((s, i) => (
                <div key={i} style={{ background: bg, padding: 'clamp(24px, 3vw, 40px)', position: 'relative' }}>
                  <div style={{ fontSize: '48px', fontWeight: 900, color: border2, letterSpacing: '-2px', lineHeight: 1, marginBottom: '16px' }}>{s.num}</div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: white, marginBottom: '8px' }}>{s.title}</div>
                  <div style={{ fontSize: '14px', color: muted, lineHeight: 1.6 }}>{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROMOTION LADDER */}
        <section style={{ padding: 'clamp(60px, 8vw, 100px) 0', borderTop: `1px solid ${border}` }}>
          <div style={sectionStyle}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <div style={sectionHeadStyle}>{es.ladder_section_label}</div>
              <h2 style={h2Style}>{es.ladder_title}</h2>
              <p style={{ color: muted, fontSize: '15px', maxWidth: '460px', margin: '0 auto' }}>{es.ladder_sub}</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: border, borderRadius: '12px', overflow: 'hidden', border: `1px solid ${border}` }}>
              {ladder.map((row, i) => (
                <div key={i} className="ladder-row" style={{ background: card, padding: 'clamp(16px, 2vw, 24px) clamp(20px, 3vw, 36px)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px', transition: 'background 0.2s', borderBottom: i < ladder.length - 1 ? `1px solid ${border}` : 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: '1 1 200px' }}>
                    <div style={{ width: '3px', height: '36px', background: row.color, borderRadius: '2px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 800, color: white, marginBottom: '2px' }}>{row.tier}</div>
                      <div style={{ fontSize: '13px', color: muted }}>{row.desc}</div>
                    </div>
                  </div>
                  <div style={{ background: `${row.color}18`, border: `1px solid ${row.color}44`, color: row.color, borderRadius: '100px', padding: '5px 14px', fontSize: '12px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                    {row.pts}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section style={{ padding: 'clamp(60px, 8vw, 100px) 0', borderTop: `1px solid ${border}` }}>
          <div style={sectionStyle}>
            <div style={{ textAlign: 'center', marginBottom: '48px' }}>
              <div style={sectionHeadStyle}>{es.pricing_section_label}</div>
              <h2 style={h2Style}>{es.pricing_title}</h2>
              <p style={{ color: muted, fontSize: '15px' }}>{es.pricing_sub}</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '16px' }}>
              {plans.map((plan, i) => (
                <div key={i} className="pricing-card" style={{ background: card, border: `1px solid ${plan.name === es.plan_arena_name ? plan.color + '66' : border2}`, borderRadius: '14px', padding: 'clamp(20px, 2.5vw, 32px)', display: 'flex', flexDirection: 'column', position: 'relative', transition: 'border-color 0.2s, transform 0.2s', boxShadow: plan.name === es.plan_arena_name ? `0 0 40px ${plan.color}22` : 'none' }}>
                  {plan.badge && (
                    <div style={{ position: 'absolute', top: '-11px', left: '50%', transform: 'translateX(-50%)', background: plan.badgeColor, color: '#0a0a0a', borderRadius: '100px', padding: '3px 12px', fontSize: '11px', fontWeight: 800, whiteSpace: 'nowrap' }}>
                      {plan.badge}
                    </div>
                  )}
                  <div style={{ marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: plan.color, letterSpacing: '1.5px', textTransform: 'uppercase' }}>{plan.name}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px', marginBottom: '4px' }}>
                    <span style={{ fontSize: 'clamp(28px, 3vw, 36px)', fontWeight: 900, color: white, letterSpacing: '-1px' }}>{plan.price}</span>
                    <span style={{ fontSize: '14px', color: muted, fontWeight: 500 }}>{plan.period}</span>
                  </div>
                  <div style={{ height: '1px', background: border, margin: '16px 0' }} />
                  <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {plan.features.map((f, j) => (
                      <li key={j} style={{ fontSize: '13px', color: plan.disabled ? muted2 : '#ccc', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                        <span style={{ color: plan.disabled ? muted2 : plan.color, marginTop: '1px', flexShrink: 0 }}>✓</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <a href={plan.disabled ? undefined : '/login'} style={{ display: 'block', textAlign: 'center', padding: '11px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', cursor: plan.disabled ? 'not-allowed' : 'pointer', background: plan.disabled ? '#1a1a1a' : plan.color, color: plan.disabled ? muted2 : (plan.color === gold ? '#0a0a0a' : white), border: plan.disabled ? `1px solid ${border}` : 'none', opacity: plan.disabled ? 0.7 : 1, transition: 'opacity 0.2s' }}>
                    {plan.cta}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA */}
        <section style={{ padding: 'clamp(80px, 10vw, 140px) 0', borderTop: `1px solid ${border}`, position: 'relative', overflow: 'hidden', textAlign: 'center' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(0,112,243,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ ...sectionStyle, position: 'relative' }}>
            <div style={sectionHeadStyle}>{es.final_section_label}</div>
            <h2 style={{ ...h2Style, fontSize: 'clamp(36px, 5vw, 60px)' }}>{es.final_title}</h2>
            <p style={{ color: muted, fontSize: '15px', marginBottom: '36px' }}>{es.final_sub}</p>
            <a href="/login" style={{ ...ctaButtonStyle, padding: '16px 36px', fontSize: '18px', display: 'inline-block' }} className="cta-btn">
              {es.final_cta}
            </a>
            <div style={{ marginTop: '20px' }}>
              <a href="/login#signin" style={{ fontSize: '14px', color: muted, textDecoration: 'none' }} className="sign-in-link">
                <span style={{ color: white, fontWeight: 600 }}>{es.final_signin}</span>
              </a>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer style={{ borderTop: `1px solid #111`, padding: '24px clamp(16px, 5vw, 48px)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#333' }}>
            <span style={{ color: blue }}>⚡</span>
            <span>ANTCPU ADS</span>
          </div>
          <div style={{ fontSize: '12px', color: '#333' }}>
          {es.footer_copy}
        </div>
      </footer>

    </div>
  </>
);
}
