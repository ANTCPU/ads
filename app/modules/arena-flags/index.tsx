// app/modules/arena-flags/index.tsx
// ─── Feature flag management — extracted from antcpu/page.tsx ─────────────────
'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { G, rowBtn, sectionCard } from '../../lib/adminTokens';

type ArenaFlag = {
  id: string; label: string; description: string;
  version: string; status: string; enabled: boolean;
  notes?: string; source?: string;
};

const VERSION_TABS = [
  { id: 'beta',      label: '🧪 Beta'    },
  { id: 'v1',        label: '✅ v1'       },
  { id: 'v1testing', label: '🔬 v1 Test' },
  { id: 'v2',        label: '🚀 v2'       },
  { id: 'v2testing', label: '🔭 v2 Test' },
];

export default function ArenaFlagsModule() {
  const [flags,       setFlags]       = useState<ArenaFlag[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [version,     setVersion]     = useState('beta');
  const [savingFlag,  setSavingFlag]  = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/flags');
      const json = await res.json();
      if (json.flags) setFlags(json.flags);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleFlag(id: string, currentEnabled: boolean) {
    setSavingFlag(id);
    const newEnabled = !currentEnabled;
    const newStatus  = newEnabled ? 'on' : 'off';
    await fetch('/api/flags', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, enabled: newEnabled, status: newStatus }) });
    setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: newEnabled, status: newStatus } : f));
    setSavingFlag(null);
  }

  async function markKilled(id: string) {
    setSavingFlag(id);
    await fetch('/api/flags', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, enabled: false, status: 'killed' }) });
    setFlags(prev => prev.map(f => f.id === id ? { ...f, enabled: false, status: 'killed' } : f));
    setSavingFlag(null);
  }

  const visible     = flags.filter(f => f.version === version);
  const killedCount = flags.filter(f => f.status === 'killed').length;

  return (
    <div style={sectionCard}>
      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: G.text, marginBottom: '0.2rem' }}>⚡ Arena Flags</div>
      <div style={{ fontSize: '0.72rem', color: G.muted, marginBottom: '1rem' }}>Toggle features by version — DB overrides code defaults instantly</div>

      {/* Version tabs */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {VERSION_TABS.map(v => (
          <button key={v.id} onClick={() => setVersion(v.id)}
            style={{ background: version === v.id ? G.orange : 'transparent', border: `1px solid ${version === v.id ? G.orange : G.border2}`, borderRadius: '6px', padding: '0.25rem 0.65rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', color: version === v.id ? '#000' : G.muted, transition: 'all 0.15s' }}>
            {v.label}
          </button>
        ))}
      </div>

      {/* Flag rows */}
      {loading ? (
        <div style={{ fontSize: '0.82rem', color: G.muted, padding: '0.5rem 0' }}>Loading flags...</div>
      ) : (
        <div style={{ maxHeight: '360px', overflowY: 'auto', paddingRight: '0.25rem', scrollbarWidth: 'thin', scrollbarColor: `${G.border2} transparent` } as any}>
          {visible.length === 0 ? (
            <div style={{ fontSize: '0.82rem', color: G.muted, padding: '0.5rem 0' }}>No flags in this version yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {visible.map(f => {
                const busy    = savingFlag === f.id;
                const killed  = f.status === 'killed';
                const testing = f.status === 'testing';
                return (
                  <div key={f.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: killed ? '#1a0a0a' : G.card2, border: `1px solid ${killed ? G.red + '30' : G.border}`, borderRadius: '8px', opacity: killed ? 0.7 : 1, transition: 'opacity 0.15s' }}>
                    {/* Toggle */}
                    <button onClick={() => !killed && !busy && toggleFlag(f.id, f.enabled)} disabled={killed || busy}
                      style={{ position: 'relative', width: '36px', height: '20px', borderRadius: '999px', border: 'none', cursor: killed || busy ? 'default' : 'pointer', background: busy ? G.border : killed ? G.red + '40' : f.enabled ? G.green : G.border2, flexShrink: 0, transition: 'background 0.2s', padding: 0 }}>
                      <span style={{ position: 'absolute', top: '2px', left: f.enabled && !killed ? '18px' : '2px', width: '16px', height: '16px', borderRadius: '50%', background: '#fff', transition: 'left 0.2s', display: 'block' }} />
                    </button>
                    {/* Label */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: killed ? G.dim : G.text, textDecoration: killed ? 'line-through' : 'none', marginBottom: '0.1rem' }}>{f.label}</div>
                      <div style={{ fontSize: '0.68rem', color: G.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.description}</div>
                    </div>
                    {/* Status pill */}
                    <span style={{ fontSize: '0.6rem', fontWeight: 700, flexShrink: 0, padding: '0.15rem 0.5rem', borderRadius: '999px', letterSpacing: '0.05em', background: killed ? G.red + '20' : testing ? G.orange + '20' : f.enabled ? G.green + '20' : G.border, color: killed ? G.red : testing ? G.orange : f.enabled ? G.green : G.muted }}>
                      {busy ? '…' : f.status.toUpperCase()}
                    </span>
                    {/* Kill */}
                    {!killed ? (
                      <button onClick={() => !busy && markKilled(f.id)} disabled={busy} title="Mark as killed"
                        style={{ background: 'none', border: `1px solid ${G.red}40`, borderRadius: '6px', color: G.red, fontSize: '0.65rem', fontWeight: 700, padding: '0.2rem 0.45rem', cursor: busy ? 'default' : 'pointer', flexShrink: 0, transition: 'all 0.15s' }}>
                        ✕
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.65rem', color: G.red, flexShrink: 0, fontWeight: 700 }}>KILL</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {killedCount > 0 && (
        <div style={{ marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: `1px solid ${G.border}`, fontSize: '0.72rem', color: G.red, fontWeight: 600 }}>
          ✕ {killedCount} flag{killedCount !== 1 ? 's' : ''} marked for cleanup
        </div>
      )}
    </div>
  );
}

