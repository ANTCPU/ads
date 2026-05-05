'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ANTBOT_POD, { Antbot, AntbotStatus } from '../../antbots/index';
import { MAPOFPI_KB, ADS_SYSTEM_PROMPT } from '../../clients/mapofpi/kb';

const STORAGE_KEY = 'antbot_outputs';

const s: Record<string, React.CSSProperties> = {
  page:       { background: '#0a0a0a', color: '#fff', fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column' },
  nav:        { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem 2rem', borderBottom: '1px solid #1a1a1a' },
  navLogo:    { fontWeight: 800, fontSize: '1rem', letterSpacing: '0.05em', color: '#f0883e' },
  navSub:     { fontSize: '0.75rem', color: '#444', letterSpacing: '0.1em' },
  client:     { display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '0.4rem 1rem', fontSize: '0.8rem', color: '#888' },
  clientDot:  { width: '8px', height: '8px', borderRadius: '50%', background: '#f0883e' },
  body:       { display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 57px)' },
  chat:       { width: '380px', minWidth: '380px', borderRight: '1px solid #1a1a1a', display: 'flex', flexDirection: 'column' },
  chatHead:   { padding: '1rem 1.5rem', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'center', gap: '0.75rem' },
  agentDot:   { width: '10px', height: '10px', borderRadius: '50%', background: '#f0883e', boxShadow: '0 0 6px #f0883e' },
  agentName:  { fontWeight: 700, fontSize: '0.9rem', color: '#f0883e' },
  agentLabel: { fontSize: '0.7rem', color: '#444', letterSpacing: '0.1em' },
  msgs:       { flex: 1, overflowY: 'auto' as const, padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column' as const, gap: '0.75rem' },
  msgAgent:   { background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px 12px 12px 2px', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#ccc', maxWidth: '90%', alignSelf: 'flex-start' as const, lineHeight: 1.5 },
  msgUser:    { background: '#f0883e22', border: '1px solid #f0883e33', borderRadius: '12px 12px 2px 12px', padding: '0.75rem 1rem', fontSize: '0.85rem', color: '#fff', maxWidth: '90%', alignSelf: 'flex-end' as const },
  msgTime:    { fontSize: '0.65rem', color: '#333', marginTop: '0.25rem' },
  inputRow:   { padding: '1rem 1.5rem', borderTop: '1px solid #1a1a1a', display: 'flex', gap: '0.5rem' },
  input:      { flex: 1, background: '#111', border: '1px solid #222', borderRadius: '8px', padding: '0.65rem 1rem', color: '#fff', fontSize: '0.85rem', outline: 'none' },
  sendBtn:    { background: '#f0883e', border: 'none', borderRadius: '8px', padding: '0.65rem 1.2rem', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem' },
  pod:        { flex: 1, overflowY: 'auto' as const, padding: '1.5rem' },
  podHead:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' },
  podTitle:   { fontWeight: 700, fontSize: '1rem' },
  podSub:     { fontSize: '0.75rem', color: '#444', marginTop: '0.2rem' },
  runAll:     { background: '#f0883e', border: 'none', borderRadius: '8px', padding: '0.5rem 1.2rem', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem' },
  clearBtn:   { background: 'none', border: '1px solid #222', borderRadius: '8px', padding: '0.5rem 1rem', color: '#555', cursor: 'pointer', fontSize: '0.8rem', marginRight: '0.5rem' },
  grid:       { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' },
  card:       { background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.2rem' },
  cardHead:   { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' },
  cardName:   { fontWeight: 700, fontSize: '0.85rem', color: '#f0883e' },
  cardChan:   { fontSize: '0.7rem', color: '#555', marginTop: '0.1rem' },
  cardOut:    { fontSize: '0.78rem', color: '#aaa', background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '0.6rem 0.8rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' as const, marginTop: '0.75rem' },
  cardIdle:   { fontSize: '0.75rem', color: '#333', marginTop: '0.5rem' },
  runBtn:     { background: 'none', border: '1px solid #f0883e44', borderRadius: '6px', padding: '0.35rem 0.8rem', color: '#f0883e', fontSize: '0.75rem', cursor: 'pointer', marginTop: '0.75rem' },
  tokenBadge: { fontSize: '0.65rem', color: '#444', marginTop: '0.4rem' },
};

const statusColor: Record<AntbotStatus, string> = {
  idle: '#333', running: '#d29922', complete: '#3fb950', error: '#ff7b72',
};

const statusLabel: Record<AntbotStatus, string> = {
  idle: 'IDLE', running: 'RUNNING...', complete: 'DONE', error: 'ERROR',
};

// Strip the system prompt prefix from task for display
function shortTask(task: string): string {
  const idx = task.indexOf('Write');
  if (idx !== -1) return task.slice(idx);
  const idx2 = task.indexOf('Draft');
  if (idx2 !== -1) return task.slice(idx2);
  return task.slice(0, 80) + '...';
}

function AntbotCard({ bot, onRun }: { bot: Antbot & { tokens: number }; onRun: (id: number) => void }) {
  return (
    <div style={{ ...s.card, borderColor: bot.status === 'running' ? '#d2992244' : bot.status === 'complete' ? '#3fb95022' : '#1a1a1a' }}>
      <div style={s.cardHead}>
        <div>
          <div style={s.cardName}>{bot.icon} {bot.name}</div>
          <div style={s.cardChan}>{bot.channel}</div>
        </div>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: statusColor[bot.status], letterSpacing: '0.08em' }}>
          {statusLabel[bot.status]}
        </div>
      </div>
      <div style={s.cardIdle}>{shortTask(bot.task)}</div>
      {bot.output && (
        <>
          <div style={s.cardOut}>{bot.output}</div>
          <div style={s.tokenBadge}>⚡ {bot.tokens} tokens</div>
        </>
      )}
      {bot.status !== 'running' && (
        <button style={s.runBtn} onClick={() => onRun(bot.id)}>
          {bot.status === 'complete' ? '↺ Re-run' : '▶ Run'}
        </button>
      )}
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [bots, setBots] = useState<(Antbot & { tokens: number })[]>(
    ANTBOT_POD.map(b => ({ ...b }))
  );
  const [msgs, setMsgs] = useState([
    { role: 'agent', text: `ADS agent online. Client: ${MAPOFPI_KB.name} — ${MAPOFPI_KB.stats.users}, ${MAPOFPI_KB.stats.sellers}. 10 antbots standing by.`, time: '' },
  ]);
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const msgsEnd = useRef<HTMLDivElement>(null);

  // Load persisted outputs
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed: Record<number, { output: string; tokens: number; status: AntbotStatus }> = JSON.parse(saved);
      setBots(prev => prev.map(b => parsed[b.id] ? { ...b, ...parsed[b.id] } : b));
    }
    setHydrated(true);
  }, []);

  // Persist outputs on change
  useEffect(() => {
    if (!hydrated) return;
    const toSave: Record<number, { output: string | null; tokens: number; status: AntbotStatus }> = {};
    bots.forEach(b => { if (b.output) toSave[b.id] = { output: b.output, tokens: b.tokens, status: b.status }; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [bots, hydrated]);

  useEffect(() => { msgsEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs]);

  function now() { return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
  function addMsg(role: 'agent' | 'user', text: string) { setMsgs(m => [...m, { role, text, time: now() }]); }

  async function runBot(id: number) {
    const bot = bots.find(b => b.id === id);
    if (!bot) return;
    setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'running', output: null } : b));
    addMsg('agent', `Dispatching ${bot.name} → ${bot.channel}...`);
    try {
      const res = await fetch('/api/ads-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `${ADS_SYSTEM_PROMPT}\n\nTask for ${bot.name} (${bot.channel}):\n${bot.task}`, botId: bot.id, channel: bot.channel }),
      });
      const data = await res.json();
      const output = data.result || 'No output.';
      const tokens = data.tokens || 0;
      setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'complete', output, tokens } : b));
      addMsg('agent', `${bot.name} ✓ — ${bot.channel} done. ${tokens} tokens.`);
    } catch {
      setBots(prev => prev.map(b => b.id === id ? { ...b, status: 'error', output: 'Error.' } : b));
      addMsg('agent', `${bot.name} error.`);
    }
  }

  async function runAll() {
    addMsg('agent', 'Launching full pod — 10 channels deploying...');
    for (const bot of bots) { await runBot(bot.id); }
  }

  function clearAll() {
    setBots(ANTBOT_POD.map(b => ({ ...b })));
    localStorage.removeItem(STORAGE_KEY);
    addMsg('agent', 'Pod cleared. All antbots reset to idle.');
  }

  async function sendMsg() {
    if (!input.trim() || loading) return;
    const text = input.trim();
    setInput('');
    addMsg('user', text);
    setLoading(true);
    try {
      const res = await fetch('/api/ads-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: `${ADS_SYSTEM_PROMPT}\n\nUser: ${text}` }),
      });
      const data = await res.json();
      addMsg('agent', data.result || 'No response.');
    } catch { addMsg('agent', '⚠ API error.'); }
    setLoading(false);
  }

  if (!hydrated) return null;

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <div>
          <div style={s.navLogo} onClick={() => router.push("/dashboard")} onMouseEnter={e => (e.currentTarget.style.cursor="pointer")} onMouseLeave={e => (e.currentTarget.style.cursor="default")}>⚡ ANTCPU ADS</div>
          <div style={s.navSub}>AGENT DASHBOARD</div>
        </div>
        <div style={s.client}>
          <div style={s.clientDot} />
          {MAPOFPI_KB.name} · v{MAPOFPI_KB.version} · {MAPOFPI_KB.stats.users}
        </div>
      </nav>

      <div style={s.body}>
        <div style={s.chat}>
          <div style={s.chatHead}>
            <div style={s.agentDot} />
            <div>
              <div style={s.agentName}>ADS AGENT</div>
              <div style={s.agentLabel}>ANTCPU · marketing agent</div>
            </div>
          </div>
          <div style={s.msgs}>
            {msgs.map((m, i) => (
              <div key={i}>
                <div style={m.role === 'agent' ? s.msgAgent : s.msgUser}>{m.text}</div>
                <div style={{ ...s.msgTime, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                  {m.role === 'agent' ? 'ADS' : 'you'}{m.time ? ` · ${m.time}` : ''}
                </div>
              </div>
            ))}
            {loading && <div style={s.msgAgent}>thinking...</div>}
            <div ref={msgsEnd} />
          </div>
          <div style={s.inputRow}>
            <input
              style={s.input}
              placeholder="Brief the ADS agent..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMsg()}
            />
            <button style={s.sendBtn} onClick={sendMsg}>Send</button>
          </div>
        </div>

        <div style={s.pod}>
          <div style={s.podHead}>
            <div>
              <div style={s.podTitle}>🐜 Antbot Pod — 10 Agents</div>
              <div style={s.podSub}>Each bot owns a channel. Outputs persist across refreshes.</div>
            </div>
            <div>
              <button style={s.clearBtn} onClick={clearAll}>✕ Clear All</button>
              <button style={s.runAll} onClick={runAll}>▶▶ Run All</button>
            </div>
          </div>
          <div style={s.grid}>
            {bots.map(bot => <AntbotCard key={bot.id} bot={bot} onRun={runBot} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
