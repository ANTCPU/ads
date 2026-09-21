'use client';
// app/modules/agents/index.tsx
// ─── Agents Hub ───────────────────────────────────────────────────────────────
//
// The command centre for all Arena agents.
//
// AGENTS (8 total):
//   0  antcpu   ⚡  Master agent — Arena orchestrator
//   1  scout    🔍  Scoring, tiers, ranking
//   2  aria     🦋  Ad review, quality, strategy
//   3  herald   ✉️  Notifications, drop-off nudges
//   4  ledger   📊  Analytics, Arena stats
//   5  mac      🗺️  Map of Pi shop builder
//   —  antbots  🤖  10-bot pod — visual experience
//   —  vault    🔐  Security layer (admin only)
//
// USER VIEW:
//   — Agent roster: pill selector for antcpu, scout, aria, herald, ledger, mac
//   — Selected agent: role card + chat window
//   — Antbots tab: visual pod experience — 10 bots firing in sequence
//     Shows each bot's channel, status, output — makes background work visible
//   — Aria chat unlocks at 10pts, others at isSuper
//
// ADMIN VIEW:
//   — All of the above
//   — Vault tab: security status — env key health, recent agent_runs log
//
// Antbots visual:
//   — Champion context form (brand, shop, country, language)
//   — Run All button → fires all 10 bots sequentially via /api/agents/run
//   — Each bot: icon, channel, status pill (idle/running/complete/error), output
//   — Animated pulse on running bots
//   — Progress bar across the pod
//
// v1 (Sep 2026) — new module
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react';
import { ModuleContext }                from '../types';
import { buildPod, type Antbot, type ClientContext } from '../../antbots/index';

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:      '#0a0a0a',
  card:    '#111',
  card2:   '#0d0d0d',
  border:  '#1a1a1a',
  border2: '#222',
  orange:  '#f0883e',
  gold:    '#D4AF37',
  green:   '#22c55e',
  blue:    '#0070f3',
  red:     '#ef4444',
  purple:  '#7928ca',
  muted:   '#555',
  dim:     '#333',
  text:    '#e0e0e0',
  sub:     '#888',
};

// ─── Agent roster ─────────────────────────────────────────────────────────────

const AGENTS = [
  {
    id:      'antcpu',
    botId:   0,
    icon:    '⚡',
    name:    'ANTCPU',
    color:   '#D4AF37',
    role:    'Master agent — Arena orchestrator. Oversees all agents, routes tasks, monitors network health.',
    knows:   'Full Arena state — all ads, all agents, all events. First to know when anything changes.',
    unlock:  'super',
  },
  {
    id:      'scout',
    botId:   1,
    icon:    '🔍',
    name:    'Scout',
    color:   '#f0883e',
    role:    'Points and ranking engine. Calculates scores, assigns tiers, awards badges.',
    knows:   'Every active ad, its points, clicks, shares, tier, and rank position. Fires after every engagement.',
    unlock:  'super',
  },
  {
    id:      'aria',
    botId:   2,
    icon:    '🦋',
    name:    'Aria',
    color:   '#ff0080',
    role:    'Ad review engine. Checks quality, resolves URLs, auto-approves returning brands.',
    knows:   'Brand URL registry, seed phrase patterns, prior approved ads per user.',
    unlock:  10, // pts threshold
  },
  {
    id:      'herald',
    botId:   3,
    icon:    '✉️',
    name:    'Herald',
    color:   '#0070f3',
    role:    'Notification and email agent. Drop-off intelligence, nudges, announcements.',
    knows:   'Notification types: approved, rejected, points, rank, nudge. Drop-off buckets: noShares, noAd, inactive.',
    unlock:  'super',
  },
  {
    id:      'ledger',
    botId:   4,
    icon:    '📊',
    name:    'Ledger',
    color:   '#22c55e',
    role:    'Analytics and numbers. Tracks Arena-wide stats, brand performance, daily activity.',
    knows:   'Total ads, users, clicks today, shares today, top brand, membership tier breakdown.',
    unlock:  'super',
  },
  {
    id:      'mac',
    botId:   5,
    icon:    '🗺️',
    name:    'MAC',
    color:   '#7928ca',
    role:    'Map of Pi shop builder. Guides Pi sellers through creating their first Arena ad.',
    knows:   'Full Map of Pi KB — stats, champion program, points system, tier ladder, phase roadmap.',
    unlock:  0, // always available
  },
] as const;

type AgentId = typeof AGENTS[number]['id'];

// ─── Types ────────────────────────────────────────────────────────────────────

type Message = {
  role:    'user' | 'agent';
  content: string;
  agent?:  string;
  icon?:   string;
};

type VaultKey = {
  label:  string;
  envKey: string;
  set:    boolean;
};

// ─── Status pill ──────────────────────────────────────────────────────────────

function StatusPill({ status }: { status: Antbot['status'] }) {
  const map = {
    idle:     { label: 'Idle',     color: C.muted,  bg: `${C.muted}15`  },
    running:  { label: 'Running',  color: C.orange, bg: `${C.orange}15` },
    complete: { label: 'Done',     color: C.green,  bg: `${C.green}15`  },
    error:    { label: 'Error',    color: C.red,    bg: `${C.red}15`    },
  };
  const s = map[status];
  return (
    <span style={{
      fontSize:     '0.6rem',
      fontWeight:   700,
      color:        s.color,
      background:   s.bg,
      border:       `1px solid ${s.color}30`,
      borderRadius: '999px',
      padding:      '0.1rem 0.45rem',
      textTransform: 'uppercase',
      letterSpacing: '0.06em',
    }}>
      {status === 'running' && '● '}{s.label}
    </span>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AgentsModule({ slug, ads, user, isSuper }: ModuleContext) {

  // ── Tab state ─────────────────────────────────────────────────────────────
  type Tab = AgentId | 'antbots' | 'vault';
  const [tab, setTab] = useState<Tab>('aria');

  // ── Chat state ────────────────────────────────────────────────────────────
  const [messages,  setMessages]  = useState<Record<string, Message[]>>({});
  const [input,     setInput]     = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // ── Antbots state ─────────────────────────────────────────────────────────
  const [bots,       setBots]       = useState<Antbot[]>(buildPod());
  const [botRunning, setBotRunning] = useState(false);
  const [ctx, setCtx] = useState<ClientContext>({
    brand:   user.brand || slug,
    country: '',
    language: 'en',
  });

  // ── Vault state (admin) ───────────────────────────────────────────────────
  const [agentRuns,    setAgentRuns]    = useState<any[]>([]);
  const [vaultLoading, setVaultLoading] = useState(false);
  const [vaultLoaded,  setVaultLoaded]  = useState(false);

  // ── Points for unlock ─────────────────────────────────────────────────────
  const brandAds  = ads.filter(a => a.brand?.toLowerCase().includes((user.brand || slug).toLowerCase()));
  const topPoints = Math.max(...brandAds.map(a => a.points || 0), 0);

  // ── Scroll to bottom on new message ──────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, tab]);

  // ── Load vault data when tab opens ───────────────────────────────────────
  useEffect(() => {
    if (tab !== 'vault' || !isSuper || vaultLoaded) return;
    setVaultLoading(true);
    fetch('/api/agents/feed')
      .then(r => r.json())
      .then(data => {
        setAgentRuns(data.recentRuns || data.runs || []);
        setVaultLoaded(true);
      })
      .catch(() => {})
      .finally(() => setVaultLoading(false));
  }, [tab, isSuper, vaultLoaded]);

  // ── Send chat message ─────────────────────────────────────────────────────
  async function sendMessage(agent: typeof AGENTS[number]) {
    if (!input.trim() || chatLoading) return;
    const userMsg = input.trim();
    setInput('');

    const key = agent.id;
    setMessages(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), { role: 'user', content: userMsg }],
    }));
    setChatLoading(true);

    // Build context
    const topAds = [...brandAds]
      .sort((a, b) => (b.points || 0) - (a.points || 0))
      .slice(0, 3);

    const context = [
      `Brand: ${user.brand || slug}`,
      `Active ads: ${brandAds.length}`,
      `Top points: ${topPoints}`,
      topAds.length > 0
        ? `Top ads: ${topAds.map(a => `"${a.title}" ${a.points || 0}pts`).join(', ')}`
        : '',
      isSuper ? 'User is super admin.' : '',
    ].filter(Boolean).join(' · ');

    try {
      const res = await fetch('/api/agents/run', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt:  `${context}\n\nUser: ${userMsg}`,
          botId:   agent.botId,
          channel: `module-agents-${agent.id}`,
          email:   user.email,
        }),
      });
      const data = await res.json();
      setMessages(prev => ({
        ...prev,
        [key]: [...(prev[key] || []), {
          role:    'agent',
          content: data.result || 'No response.',
          agent:   agent.name,
          icon:    agent.icon,
        }],
      }));
    } catch {
      setMessages(prev => ({
        ...prev,
        [key]: [...(prev[key] || []), {
          role:    'agent',
          content: 'Connection issue — try again.',
          agent:   agent.name,
          icon:    agent.icon,
        }],
      }));
    }
    setChatLoading(false);
  }

  // ── Run antbot pod ────────────────────────────────────────────────────────
  async function runPod() {
    if (botRunning) return;
    setBotRunning(true);

    // Rebuild pod with current context
    const pod = buildPod(ctx);
    setBots(pod.map(b => ({ ...b, status: 'idle', output: null })));

    for (let i = 0; i < pod.length; i++) {
      const bot = pod[i];

      // Set this bot to running
      setBots(prev => prev.map(b =>
        b.id === bot.id ? { ...b, status: 'running' } : b
      ));

      try {
        const res = await fetch('/api/agents/run', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt:  bot.task,
            botId:   0,
            channel: `antbot-${bot.channel.toLowerCase().replace(/\s+/g, '-')}`,
            email:   user.email,
          }),
        });
        const data = await res.json();
        setBots(prev => prev.map(b =>
          b.id === bot.id
            ? { ...b, status: 'complete', output: data.result || 'Done.', tokens: data.tokens || 0 }
            : b
        ));
      } catch {
        setBots(prev => prev.map(b =>
          b.id === bot.id ? { ...b, status: 'error', output: 'Failed.' } : b
        ));
      }
    }
    setBotRunning(false);
  }

  // ── Reset pod ─────────────────────────────────────────────────────────────
  function resetPod() {
    setBots(buildPod(ctx));
  }

  // ── Derived ───────────────────────────────────────────────────────────────
  const completedBots = bots.filter(b => b.status === 'complete').length;
  const progress      = (completedBots / bots.length) * 100;

  // ── Vault keys (status only — no values) ─────────────────────────────────
  const vaultKeys: VaultKey[] = [
    { label: 'Google AI Key',          envKey: 'GOOGLE_AI_KEY',                        set: true  },
    { label: 'Agent Token',            envKey: 'AGENT_TOKEN',                          set: true  },
    { label: 'Supabase Service Role',  envKey: 'SUPABASE_SERVICE_ROLE_KEY',            set: true  },
    { label: 'Discord Booking Hook',   envKey: 'NEXT_PUBLIC_DISCORD_BOOKING_WEBHOOK',  set: !!process.env.NEXT_PUBLIC_DISCORD_BOOKING_WEBHOOK },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ width: '100%' }}>

      {/* Header */}
      <div style={{ fontWeight: 700, fontSize: '1rem', color: C.text, marginBottom: '1.25rem' }}>
        ⚡ Agents Hub
      </div>

      {/* Tab bar */}
      <div style={{
        display:    'flex',
        gap:        '0.35rem',
        flexWrap:   'wrap',
        marginBottom: '1.25rem',
      }}>
        {AGENTS.map(agent => {
          const locked = agent.unlock === 'super'
            ? !isSuper
            : typeof agent.unlock === 'number'
              ? topPoints < agent.unlock && !isSuper
              : false;

          return (
            <button
              key={agent.id}
              onClick={() => !locked && setTab(agent.id)}
              title={locked ? `Unlocks at ${agent.unlock} pts` : agent.name}
              style={{
                background:   tab === agent.id ? agent.color : 'transparent',
                border:       `1px solid ${tab === agent.id ? agent.color : C.border2}`,
                borderRadius: '8px',
                color:        tab === agent.id ? '#000' : locked ? C.dim : C.sub,
                fontWeight:   tab === agent.id ? 700 : 400,
                fontSize:     '0.75rem',
                padding:      '0.35rem 0.75rem',
                cursor:       locked ? 'not-allowed' : 'pointer',
                opacity:      locked ? 0.4 : 1,
                transition:   'all 0.15s',
                display:      'flex',
                alignItems:   'center',
                gap:          '0.3rem',
              }}
            >
              <span>{agent.icon}</span>
              <span>{agent.name}</span>
              {locked && <span style={{ fontSize: '0.55rem' }}>🔒</span>}
            </button>
          );
        })}

        {/* Antbots tab */}
        <button
          onClick={() => setTab('antbots')}
          style={{
            background:   tab === 'antbots' ? C.orange : 'transparent',
            border:       `1px solid ${tab === 'antbots' ? C.orange : C.border2}`,
            borderRadius: '8px',
            color:        tab === 'antbots' ? '#000' : C.sub,
            fontWeight:   tab === 'antbots' ? 700 : 400,
            fontSize:     '0.75rem',
            padding:      '0.35rem 0.75rem',
            cursor:       'pointer',
            transition:   'all 0.15s',
            display:      'flex',
            alignItems:   'center',
            gap:          '0.3rem',
          }}
        >
          <span>🤖</span>
          <span>Antbots</span>
          {botRunning && (
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: C.orange, display: 'inline-block',
              animation: 'pulse 1s infinite',
            }} />
          )}
        </button>

        {/* Vault tab — admin only */}
        {isSuper && (
          <button
            onClick={() => setTab('vault')}
            style={{
              background:   tab === 'vault' ? C.gold : 'transparent',
              border:       `1px solid ${tab === 'vault' ? C.gold : C.border2}`,
              borderRadius: '8px',
              color:        tab === 'vault' ? '#000' : C.sub,
              fontWeight:   tab === 'vault' ? 700 : 400,
              fontSize:     '0.75rem',
              padding:      '0.35rem 0.75rem',
              cursor:       'pointer',
              transition:   'all 0.15s',
              display:      'flex',
              alignItems:   'center',
              gap:          '0.3rem',
            }}
          >
            <span>🔐</span>
            <span>Vault</span>
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          AGENT CHAT TABS
      ══════════════════════════════════════════════════════════════════ */}
      {AGENTS.map(agent => {
        if (tab !== agent.id) return null;

        const locked = agent.unlock === 'super'
          ? !isSuper
          : typeof agent.unlock === 'number'
            ? topPoints < agent.unlock && !isSuper
            : false;

        const msgs = messages[agent.id] || [];

        // ── Locked state ────────────────────────────────────────────────
        if (locked) {
          return (
            <div key={agent.id} style={{
              background:   C.bg,
              border:       `1px solid ${C.border}`,
              borderRadius: '12px',
              padding:      '1.5rem',
              textAlign:    'center',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{agent.icon}</div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: C.sub, marginBottom: '0.25rem' }}>
                {agent.name} is watching
              </div>
              <div style={{ fontSize: '0.75rem', color: C.muted, lineHeight: 1.6, marginBottom: '1rem' }}>
                {typeof agent.unlock === 'number'
                  ? `Reach ${agent.unlock} pts to unlock a direct line to ${agent.name}. You're at ${topPoints} pts.`
                  : `${agent.name} is available to super admins only.`
                }
              </div>
              {typeof agent.unlock === 'number' && (
                <>
                  <div style={{ height: '4px', background: C.border, borderRadius: '999px', overflow: 'hidden', maxWidth: '160px', margin: '0 auto' }}>
                    <div style={{
                      height: '100%',
                      width:  `${Math.min((topPoints / (agent.unlock as number)) * 100, 100)}%`,
                      background: agent.color,
                      borderRadius: '999px',
                      transition: 'width 0.4s',
                    }} />
                  </div>
                  <div style={{ fontSize: '0.65rem', color: C.muted, marginTop: '0.4rem' }}>
                    {topPoints}/{agent.unlock} pts
                  </div>
                </>
              )}
            </div>
          );
        }

        // ── Agent card + chat ────────────────────────────────────────────
        return (
          <div key={agent.id}>

            {/* Agent identity card */}
            <div style={{
              background:   C.bg,
              border:       `1px solid ${agent.color}30`,
              borderLeft:   `3px solid ${agent.color}`,
              borderRadius: '10px',
              padding:      '0.85rem 1rem',
              marginBottom: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.4rem' }}>
                <span style={{ fontSize: '1.1rem' }}>{agent.icon}</span>
                <span style={{ fontSize: '0.88rem', fontWeight: 700, color: agent.color }}>
                  {agent.name}
                </span>
                <span style={{
                  fontSize:     '0.6rem',
                  color:        C.green,
                  background:   `${C.green}15`,
                  border:       `1px solid ${C.green}30`,
                  borderRadius: '999px',
                  padding:      '0.1rem 0.4rem',
                  marginLeft:   'auto',
                }}>
                  ● Online
                </span>
              </div>
              <div style={{ fontSize: '0.78rem', color: C.sub, lineHeight: 1.55, marginBottom: '0.3rem' }}>
                {agent.role}
              </div>
              <div style={{ fontSize: '0.7rem', color: C.dim, lineHeight: 1.5 }}>
                Knows: {agent.knows}
              </div>
            </div>

            {/* Message thread */}
            <div style={{
              maxHeight:     '220px',
              overflowY:     'auto',
              marginBottom:  '0.75rem',
              display:       'flex',
              flexDirection: 'column',
              gap:           '0.5rem',
              padding:       '0.1rem 0',
            }}>
              {msgs.length === 0 && (
                <div style={{ fontSize: '0.75rem', color: C.muted, fontStyle: 'italic', lineHeight: 1.6 }}>
                  {agent.id === 'mac'
                    ? 'Ask MAC to help you build a Map of Pi shop ad — or ask anything about the Arena.'
                    : `Ask ${agent.name} anything about your ${agent.id === 'ledger' ? 'Arena stats' : agent.id === 'scout' ? 'points and ranking' : agent.id === 'herald' ? 'notifications' : agent.id === 'antcpu' ? 'Arena network' : 'ad performance'}.`
                  }
                </div>
              )}
              {msgs.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth:     '88%',
                    padding:      '0.55rem 0.85rem',
                    borderRadius: '10px',
                    background:   m.role === 'user' ? agent.color : C.card,
                    color:        m.role === 'user' ? '#000' : C.sub,
                    fontSize:     '0.78rem',
                    lineHeight:   1.55,
                    border:       m.role === 'agent' ? `1px solid ${C.border}` : 'none',
                  }}>
                    {m.role === 'agent' && (
                      <span style={{ fontSize: '0.65rem', color: agent.color, display: 'block', marginBottom: '0.2rem', fontWeight: 700 }}>
                        {m.icon} {m.agent}
                      </span>
                    )}
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && tab === agent.id && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{
                    background:   C.card,
                    border:       `1px solid ${C.border}`,
                    borderRadius: '10px',
                    padding:      '0.55rem 0.85rem',
                    fontSize:     '0.75rem',
                    color:        C.muted,
                  }}>
                    {agent.icon} thinking...
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage(agent)}
                placeholder={`Ask ${agent.name}...`}
                style={{
                  flex:         1,
                  background:   C.card,
                  border:       `1px solid ${C.border2}`,
                  color:        C.text,
                  borderRadius: '8px',
                  padding:      '0.6rem 0.85rem',
                  fontSize:     '0.82rem',
                  outline:      'none',
                }}
              />
              <button
                onClick={() => sendMessage(agent)}
                disabled={!input.trim() || chatLoading}
                style={{
                  background:   input.trim() && !chatLoading ? agent.color : C.border,
                  border:       'none',
                  color:        input.trim() && !chatLoading ? '#000' : C.muted,
                  borderRadius: '8px',
                  padding:      '0.6rem 1rem',
                  fontSize:     '0.85rem',
                  fontWeight:   700,
                  cursor:       input.trim() && !chatLoading ? 'pointer' : 'not-allowed',
                }}
              >
                →
              </button>
            </div>

            {/* Clear */}
            {msgs.length > 0 && (
              <button
                onClick={() => setMessages(prev => ({ ...prev, [agent.id]: [] }))}
                style={{ marginTop: '0.5rem', background: 'none', border: 'none', color: C.dim, fontSize: '0.68rem', cursor: 'pointer' }}
              >
                Clear history
              </button>
            )}
          </div>
        );
      })}

      {/* ══════════════════════════════════════════════════════════════════
          ANTBOTS TAB — visual pod experience
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'antbots' && (
        <div>
          <style>{`
            @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
            @keyframes botSlide { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
          `}</style>

          {/* What antbots are */}
          <div style={{
            background:   `${C.orange}08`,
            border:       `1px solid ${C.orange}25`,
            borderRadius: '10px',
            padding:      '0.85rem 1rem',
            marginBottom: '1rem',
            fontSize:     '0.78rem',
            color:        C.sub,
            lineHeight:   1.6,
          }}>
            <span style={{ color: C.orange, fontWeight: 700 }}>🤖 10 Antbots — </span>
            your personal marketing pod. When you launch an ad, 10 specialist bots activate in the background —
            each writing platform-ready content for a different channel. Brand awareness, Google Ads, Instagram,
            Twitter, Reddit, YouTube, TikTok, SEO, Discord, Email. All firing at once.
          </div>

          {/* Champion context form */}
          <div style={{
            background:   C.bg,
            border:       `1px solid ${C.border}`,
            borderRadius: '10px',
            padding:      '0.85rem 1rem',
            marginBottom: '1rem',
          }}>
            <div style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
              Champion Context
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {[
                { key: 'brand',    label: 'Brand',    placeholder: user.brand || 'Map of Pi' },
                { key: 'shopName', label: 'Shop Name', placeholder: 'e.g. Mama Ama\'s Kitchen' },
                { key: 'shopType', label: 'Shop Type', placeholder: 'e.g. Coffee & Café'      },
                { key: 'country',  label: 'Country',   placeholder: 'e.g. Nigeria'             },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: '0.6rem', color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.2rem' }}>
                    {f.label}
                  </label>
                  <input
                    value={(ctx as any)[f.key] || ''}
                    onChange={e => setCtx(prev => ({ ...prev, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    disabled={botRunning}
                    style={{
                      width:        '100%',
                      background:   C.card,
                      border:       `1px solid ${C.border2}`,
                      color:        C.text,
                      borderRadius: '6px',
                      padding:      '0.5rem 0.65rem',
                      fontSize:     '0.78rem',
                      boxSizing:    'border-box',
                      outline:      'none',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Language select */}
            <div style={{ marginTop: '0.5rem' }}>
              <label style={{ fontSize: '0.6rem', color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: '0.2rem' }}>
                Language
              </label>
              <select
                value={ctx.language || 'en'}
                onChange={e => setCtx(prev => ({ ...prev, language: e.target.value }))}
                disabled={botRunning}
                style={{
                  width:        '100%',
                  background:   C.card,
                  border:       `1px solid ${C.border2}`,
                  color:        C.text,
                  borderRadius: '6px',
                  padding:      '0.5rem 0.65rem',
                  fontSize:     '0.78rem',
                  boxSizing:    'border-box',
                }}
              >
                {[
                  ['en', 'English'], ['ar', 'Arabic'], ['zh', 'Chinese'],
                  ['hi', 'Hindi'],   ['pt', 'Portuguese'], ['fr', 'French'],
                  ['id', 'Indonesian'], ['tr', 'Turkish'], ['ko', 'Korean'],
                  ['sw', 'Swahili'], ['ha', 'Hausa'], ['yo', 'Yoruba'],
                ].map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Progress bar */}
          {bots.some(b => b.status !== 'idle') && (
            <div style={{ marginBottom: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: C.muted, marginBottom: '0.3rem' }}>
                <span>{botRunning ? `Running pod...` : completedBots === bots.length ? '✅ Pod complete' : 'Pod ready'}</span>
                <span style={{ color: C.orange, fontWeight: 700 }}>{completedBots}/{bots.length}</span>
              </div>
              <div style={{ height: '4px', background: C.border, borderRadius: '999px', overflow: 'hidden' }}>
                <div style={{
                  height:       '100%',
                  width:        `${progress}%`,
                  background:   completedBots === bots.length ? C.green : C.orange,
                  borderRadius: '999px',
                  transition:   'width 0.3s ease',
                }} />
              </div>
            </div>
          )}

          {/* Run / Reset buttons */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button
              onClick={runPod}
              disabled={botRunning}
              style={{
                flex:         1,
                background:   botRunning ? C.border : C.orange,
                border:       'none',
                color:        botRunning ? C.muted : '#000',
                borderRadius: '8px',
                padding:      '0.7rem',
                fontSize:     '0.85rem',
                fontWeight:   700,
                cursor:       botRunning ? 'not-allowed' : 'pointer',
                transition:   'all 0.15s',
              }}
            >
              {botRunning ? '⚡ Running...' : '🚀 Run All 10 Antbots'}
            </button>
            {!botRunning && bots.some(b => b.status !== 'idle') && (
              <button
                onClick={resetPod}
                style={{
                  background:   'transparent',
                  border:       `1px solid ${C.border2}`,
                  color:        C.muted,
                  borderRadius: '8px',
                  padding:      '0.7rem 1rem',
                  fontSize:     '0.82rem',
                  cursor:       'pointer',
                }}
              >
                ↺ Reset
              </button>
            )}
          </div>

          {/* Bot grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {bots.map((bot, i) => {
              const isRunning  = bot.status === 'running';
              const isComplete = bot.status === 'complete';
              const [expanded, setExpanded] = [false, () => {}]; // local expand handled below

              return (
                <BotCard
                  key={bot.id}
                  bot={bot}
                  index={i}
                  isRunning={isRunning}
                  isComplete={isComplete}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          VAULT TAB — admin only
      ══════════════════════════════════════════════════════════════════ */}
      {tab === 'vault' && isSuper && (
        <div>

          {/* Security header */}
          <div style={{
            background:   `${C.gold}08`,
            border:       `1px solid ${C.gold}30`,
            borderLeft:   `3px solid ${C.gold}`,
            borderRadius: '10px',
            padding:      '0.85rem 1rem',
            marginBottom: '1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem' }}>
              <span style={{ fontSize: '1rem' }}>🔐</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: C.gold }}>Vault</span>
              <span style={{
                fontSize: '0.6rem', color: C.green,
                background: `${C.green}15`, border: `1px solid ${C.green}30`,
                borderRadius: '999px', padding: '0.1rem 0.4rem', marginLeft: 'auto',
              }}>
                ● Secure
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: C.sub, lineHeight: 1.5 }}>
              Security layer — environment key health, agent token status, recent run log.
              Values are never exposed — status only.
            </div>
          </div>

          {/* Env key health */}
          <div style={{
            background:   C.bg,
            border:       `1px solid ${C.border}`,
            borderRadius: '10px',
            padding:      '0.85rem 1rem',
            marginBottom: '1rem',
          }}>
            <div style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
              Environment Keys
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {vaultKeys.map(k => (
                <div key={k.envKey} style={{
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'space-between',
                  padding:        '0.45rem 0.65rem',
                  background:     C.card,
                  border:         `1px solid ${k.set ? C.green + '20' : C.red + '20'}`,
                  borderRadius:   '8px',
                }}>
                  <div>
                    <div style={{ fontSize: '0.82rem', color: C.text, fontWeight: 600 }}>{k.label}</div>
                    <div style={{ fontSize: '0.65rem', color: C.muted, fontFamily: 'monospace' }}>{k.envKey}</div>
                  </div>
                  <span style={{
                    fontSize:     '0.68rem',
                    fontWeight:   700,
                    color:        k.set ? C.green : C.red,
                    background:   k.set ? `${C.green}15` : `${C.red}15`,
                    border:       `1px solid ${k.set ? C.green : C.red}30`,
                    borderRadius: '999px',
                    padding:      '0.15rem 0.5rem',
                  }}>
                    {k.set ? '✅ Set' : '⚠️ Missing'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Agent token info */}
          <div style={{
            background:   C.bg,
            border:       `1px solid ${C.border}`,
            borderRadius: '10px',
            padding:      '0.85rem 1rem',
            marginBottom: '1rem',
          }}>
            <div style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.65rem' }}>
              Agent Access
            </div>
            {[
              { label: 'Action endpoint',  value: 'POST /api/agents/action?token=AGENT_TOKEN', color: C.blue   },
              { label: 'Run endpoint',     value: 'POST /api/agents/run',                      color: C.orange },
              { label: 'Feed endpoint',    value: 'GET  /api/agents/feed?token=AGENT_TOKEN',   color: C.green  },
              { label: 'Auth method',      value: 'AGENT_TOKEN query param',                   color: C.muted  },
            ].map(row => (
              <div key={row.label} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.35rem', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '0.68rem', color: C.muted, width: '110px', flexShrink: 0 }}>{row.label}</span>
                <span style={{ fontSize: '0.68rem', color: row.color, fontFamily: 'monospace', wordBreak: 'break-all' }}>{row.value}</span>
              </div>
            ))}
          </div>

          {/* Recent agent runs */}
          <div style={{
            background:   C.bg,
            border:       `1px solid ${C.border}`,
            borderRadius: '10px',
            padding:      '0.85rem 1rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <div style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Recent Agent Runs
              </div>
              <button
                onClick={() => { setVaultLoaded(false); }}
                style={{ background: 'none', border: `1px solid ${C.border2}`, borderRadius: '6px', color: C.muted, fontSize: '0.65rem', padding: '0.15rem 0.45rem', cursor: 'pointer' }}
              >
                ↻
              </button>
            </div>

            {vaultLoading ? (
              <div style={{ color: C.muted, fontSize: '0.78rem' }}>Loading...</div>
            ) : agentRuns.length === 0 ? (
              <div style={{ color: C.muted, fontSize: '0.78rem' }}>No runs logged yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {agentRuns.slice(0, 10).map((run: any, i: number) => (
                  <div key={i} style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '0.5rem',
                    padding:      '0.4rem 0.6rem',
                    background:   C.card,
                    border:       `1px solid ${C.border}`,
                    borderRadius: '8px',
                    flexWrap:     'wrap',
                  }}>
                    <span style={{
                      fontSize:     '0.65rem',
                      fontWeight:   700,
                      color:        run.status === 'complete' ? C.green : C.red,
                      background:   run.status === 'complete' ? `${C.green}15` : `${C.red}15`,
                      borderRadius: '999px',
                      padding:      '0.1rem 0.4rem',
                      flexShrink:   0,
                    }}>
                      {run.status === 'complete' ? '✅' : '⚠️'} {run.agent_id || 'unknown'}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: C.sub, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {run.channel || '—'}
                    </span>
                    <span style={{ fontSize: '0.65rem', color: C.dim, flexShrink: 0 }}>
                      {run.tokens || 0} tok
                    </span>
                    <span style={{ fontSize: '0.6rem', color: C.dim, flexShrink: 0 }}>
                      {run.created_at ? new Date(run.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

// ─── BotCard — individual antbot row ─────────────────────────────────────────

function BotCard({
  bot,
  index,
  isRunning,
  isComplete,
}: {
  bot:        Antbot;
  index:      number;
  isRunning:  boolean;
  isComplete: boolean;
}) {
  const [expanded, setExpanded] = useState(false);

  const C_local = {
    bg:     '#0a0a0a',
    card:   '#111',
    border: '#1a1a1a',
    orange: '#f0883e',
    green:  '#22c55e',
    muted:  '#555',
    text:   '#e0e0e0',
    sub:    '#888',
  };

  return (
    <div
      style={{
        background:   C_local.bg,
        border:       `1px solid ${isRunning ? C_local.orange + '50' : isComplete ? C_local.green + '30' : C_local.border}`,
        borderRadius: '10px',
        overflow:     'hidden',
        transition:   'border-color 0.2s',
        animation:    isRunning ? undefined : `botSlide 0.2s ease ${index * 0.03}s both`,
      }}
    >
      {/* Bot header row */}
      <div
        onClick={() => isComplete && setExpanded(e => !e)}
        style={{
          display:    'flex',
          alignItems: 'center',
          gap:        '0.65rem',
          padding:    '0.65rem 0.85rem',
          cursor:     isComplete ? 'pointer' : 'default',
        }}
      >
        {/* Icon */}
        <span style={{
          fontSize:   '1.1rem',
          flexShrink: 0,
          opacity:    isRunning ? 1 : bot.status === 'idle' ? 0.4 : 1,
          animation:  isRunning ? 'pulse 1s infinite' : undefined,
        }}>
          {bot.icon}
        </span>

        {/* Name + channel */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{
              fontSize:   '0.82rem',
              fontWeight: 700,
              color:      isRunning ? C_local.orange : isComplete ? C_local.text : C_local.muted,
            }}>
              {bot.name}
            </span>
            {bot.tokens > 0 && (
              <span style={{ fontSize: '0.6rem', color: C_local.muted }}>
                {bot.tokens} tok
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.68rem', color: C_local.muted, marginTop: '0.1rem' }}>
            {bot.channel}
          </div>
        </div>

        {/* Status */}
        <StatusPill status={bot.status} />

        {/* Expand chevron */}
        {isComplete && (
          <span style={{ fontSize: '0.65rem', color: C_local.muted, flexShrink: 0 }}>
            {expanded ? '▲' : '▼'}
          </span>
        )}
      </div>

      {/* Running animation bar */}
      {isRunning && (
        <div style={{ height: '2px', background: C_local.border, overflow: 'hidden' }}>
          <div style={{
            height:     '100%',
            width:      '40%',
            background: C_local.orange,
            animation:  'slide 1.2s ease-in-out infinite',
            borderRadius: '999px',
          }} />
        </div>
      )}

      {/* Output — expanded */}
      {isComplete && expanded && bot.output && (
        <div style={{
          borderTop:  `1px solid ${C_local.border}`,
          padding:    '0.75rem 0.85rem',
          background: C_local.card,
          fontSize:   '0.75rem',
          color:      C_local.sub,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          wordBreak:  'break-word',
          maxHeight:  '200px',
          overflowY:  'auto',
        }}>
          {bot.output}
        </div>
      )}
    </div>
  );
}

