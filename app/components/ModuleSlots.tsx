'use client';
import { useState } from 'react';

const AVAILABLE_MODULES = [
  { id: 'region-map',    label: '🌍 Regional Map',      desc: 'Interactive global region selector' },
  { id: 'campaign-hub',  label: '📡 Campaign Hub',       desc: 'Active campaigns and targets' },
  { id: 'video-feed',    label: '🎬 Video Feed',          desc: 'Brand video ads' },
  { id: 'leaderboard',   label: '🏆 Leaderboard',        desc: 'Top performing ads' },
  { id: 'schedule',      label: '📅 Schedule',           desc: 'Weekly campaign schedule' },
  { id: 'posts',         label: '📝 Posts',              desc: 'Brand posts and updates' },
];

type Module = { id: string; label: string; desc: string };

export default function ModuleSlots({ slug }: { slug: string }) {
  const [slots, setSlots] = useState<(Module | null)[]>([null, null, null]);
  const [picking, setPicking] = useState<number | null>(null);

  function addModule(slotIndex: number, mod: Module) {
    const next = [...slots];
    next[slotIndex] = mod;
    setSlots(next);
    setPicking(null);
  }

  function removeModule(slotIndex: number) {
    const next = [...slots];
    next[slotIndex] = null;
    setSlots(next);
  }

  const used = slots.filter(Boolean).map(m => m!.id);
  const available = AVAILABLE_MODULES.filter(m => !used.includes(m.id));

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ fontSize: '0.65rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem', fontWeight: 700 }}>
        Arena Modules
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1rem' }}>
        {slots.map((slot, i) => (
          <div key={i} onClick={() => !slot && setPicking(i)} style={{
            border: slot ? '1px solid #222' : '1px dashed #2a2a2a',
            borderRadius: '12px',
            padding: '1.25rem',
            background: slot ? '#111' : 'transparent',
            cursor: slot ? 'default' : 'pointer',
            minHeight: '100px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: slot ? 'flex-start' : 'center',
            transition: 'border-color 0.2s',
          }}>
            {slot ? (
              <>
                <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.25rem' }}>{slot.label}</div>
                <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: '0.75rem' }}>{slot.desc}</div>
                <button onClick={(e) => { e.stopPropagation(); removeModule(i); }} style={{ fontSize: '0.7rem', color: '#333', background: 'none', border: '1px solid #222', borderRadius: '6px', padding: '0.2rem 0.6rem', cursor: 'pointer' }}>Remove</button>
              </>
            ) : (
              <div style={{ color: '#2a2a2a', fontSize: '0.8rem', textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>+</div>
                <div>Add Module</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Module Picker Modal */}
      {picking !== null && (
        <div onClick={() => setPicking(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '1.5rem', width: '320px', maxWidth: '90vw' }}>
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '1rem' }}>Choose a Module</div>
            {available.length === 0 ? (
              <div style={{ color: '#555', fontSize: '0.8rem' }}>All modules added.</div>
            ) : (
              available.map(mod => (
                <div key={mod.id} onClick={() => addModule(picking, mod)} style={{ padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '0.5rem', border: '1px solid #1a1a1a', background: '#0a0a0a' }}>
                  <div style={{ fontWeight: 600, color: '#fff', fontSize: '0.85rem' }}>{mod.label}</div>
                  <div style={{ fontSize: '0.72rem', color: '#555' }}>{mod.desc}</div>
                </div>
              ))
            )}
            <button onClick={() => setPicking(null)} style={{ marginTop: '1rem', width: '100%', background: 'none', border: '1px solid #222', color: '#555', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
