'use client';

// app/modules/elevation/index.tsx
// ─── Elevation Module — team hierarchy viewer + editor ───────────────────────
// Shows all challengers ranked by elevation_level.
// Super admin can edit inline — Discord notified on change.
//
// SCALE:
//   100   ANTCPU brand — always 100
//   99    Founder / Staff
//   50-98 Mentors / Alumni / Advanced
//   1-49  Challengers (progress-based)
//   0     Not yet elevated
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { G, pingDiscord }                           from '../../lib/adminTokens';

type ElevatedChallenger = {
  intern_id:       string;
  handle:          string;
  first_name:      string;
  track:           string;
  progress_pct:    number;
  elevation_level: number;
  elevation_note:  string | null;
  role_title:      string;
  country:         string;
};

const TIER_LABEL = (level: number) => {
  if (level >= 100) return { label: 'ANTCPU Brand',  color: '#f0883e' };
  if (level >= 99)  return { label: 'Founder/Staff', color: '#f0883e' };
  if (level >= 50)  return { label: 'Mentor/Alumni', color: '#00e5ff' };
  if (level >= 1)   return { label: 'Challenger',    color: '#888'    };
  return                   { label: 'Unranked',      color: '#444'    };
};

export default function ElevationModule() {
  const [challengers, setChallengers] = useState<ElevatedChallenger[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [editing,     setEditing]     = useState<string | null>(null);
  const [editLevel,   setEditLevel]   = useState<number>(0);
  const [editNote,    setEditNote]    = useState('');
  const [saving,      setSaving]      = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/internship/health');
      const json = await res.json();
      const list: ElevatedChallenger[] = (json.challengers || [])
        .map((c: any) => ({
          intern_id:       c.intern_id,
          handle:          c.handle,
          first_name:      c.first_name,
          track:           c.track,
          progress_pct:    c.progress ?? 0,
          elevation_level: c.elevation_level ?? 0,
          elevation_note:  c.elevation_note ?? null,
          role_title:      c.role_title ?? '',
          country:         c.country ?? '',
        }))
        .sort((a: ElevatedChallenger, b: ElevatedChallenger) =>
          b.elevation_level - a.elevation_level
        );
      setChallengers(list);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function saveElevation(intern_id: string, handle: string) {
    setSaving(true);
    try {
      await fetch('/api/internship/elevate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ intern_id, elevation_level: editLevel, elevation_note: editNote }),
      });
      pingDiscord('', 'flag_toggle', {
        title:  `⚡ Elevation Updated — ${handle}`,
        color:  0xf0883e,
        fields: [
          { name: 'Handle', value: handle,            inline: true },
          { name: 'Level',  value: String(editLevel), inline: true },
          { name: 'Note',   value: editNote || '—',   inline: false },
        ],
        footer:    'ANTCPU Mission Control · Elevation',
        timestamp: true,
      });
      setEditing(null);
      await load();
    } catch {}
    setSaving(false);
  }

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ fontWeight: 800, fontSize: '0.88rem', color: G.orange }}>⚡ Elevation Ladder</div>
        <button onClick={load} style={{ background: 'transparent', border: `1px solid ${G.border2}`, borderRadius: '6px', color: G.muted, fontSize: '0.72rem', padding: '0.3rem 0.65rem', cursor: 'pointer' }}>
          {loading ? '…' : '↻ Refresh'}
        </button>
      </div>

      {challengers.map(c => {
        const tier   = TIER_LABEL(c.elevation_level);
        const isEdit = editing === c.intern_id;
        return (
          <div key={c.intern_id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderBottom: `1px solid ${G.border}`, fontSize: '0.78rem' }}>
            <div style={{ minWidth: '36px', textAlign: 'center', fontWeight: 800, fontSize: '1rem', color: tier.color }}>
              {c.elevation_level}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: '#fff' }}>{c.handle}</div>
              <div style={{ fontSize: '0.68rem', color: G.muted }}>
                <span style={{ color: tier.color }}>{tier.label}</span>
                {' · '}{c.track === 'dev' ? '💻' : '📣'}
                {' · '}{c.progress_pct}% progress
                {c.elevation_note && <span style={{ color: G.dim }}> · {c.elevation_note}</span>}
              </div>
            </div>
            {isEdit ? (
              <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                <input type="number" min={0} max={100} value={editLevel}
                  onChange={e => setEditLevel(Number(e.target.value))}
                  style={{ width: '52px', background: G.card2, border: `1px solid ${G.border2}`, borderRadius: '6px', color: '#fff', fontSize: '0.78rem', padding: '0.25rem 0.4rem' }} />
                <input type="text" placeholder="note" value={editNote}
                  onChange={e => setEditNote(e.target.value)}
                  style={{ width: '100px', background: G.card2, border: `1px solid ${G.border2}`, borderRadius: '6px', color: '#fff', fontSize: '0.78rem', padding: '0.25rem 0.4rem' }} />
                <button onClick={() => saveElevation(c.intern_id, c.handle)} disabled={saving}
                  style={{ background: G.orange, border: 'none', borderRadius: '6px', color: '#000', fontSize: '0.72rem', fontWeight: 700, padding: '0.25rem 0.6rem', cursor: 'pointer' }}>
                  {saving ? '…' : 'Save'}
                </button>
                <button onClick={() => setEditing(null)}
                  style={{ background: 'transparent', border: `1px solid ${G.border2}`, borderRadius: '6px', color: G.muted, fontSize: '0.72rem', padding: '0.25rem 0.6rem', cursor: 'pointer' }}>
                  ✕
                </button>
              </div>
            ) : (
              <button onClick={() => { setEditing(c.intern_id); setEditLevel(c.elevation_level); setEditNote(c.elevation_note ?? ''); }}
                style={{ background: 'transparent', border: `1px solid ${G.border2}`, borderRadius: '6px', color: G.muted, fontSize: '0.68rem', padding: '0.2rem 0.5rem', cursor: 'pointer' }}>
                Edit
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
