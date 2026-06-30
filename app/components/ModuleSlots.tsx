'use client';
import { useState } from 'react';
import { MODULE_REGISTRY } from '../modules/index';
import { ModuleContext } from '../modules/types';

type Props = {
  slots: (string | null)[];
  onSave: (slots: (string | null)[]) => void;
  context: ModuleContext;
};

export default function ModuleSlots({ slots, onSave, context }: Props) {
  const [picking, setPicking] = useState<number | null>(null);

  function addModule(slotIndex: number, id: string) {
    const next = [...slots];
    next[slotIndex] = id;
    onSave(next);
    setPicking(null);
  }

  function removeModule(slotIndex: number) {
    const next = [...slots];
    next[slotIndex] = null;
    onSave(next);
  }

  const used = slots.filter(Boolean) as string[];
  const available = MODULE_REGISTRY.filter(m => !used.includes(m.id));

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ fontSize: '0.65rem', color: '#333', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '1rem' }}>
        Arena Modules
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {slots.map((slotId, i) => {
          const def = slotId ? MODULE_REGISTRY.find(m => m.id === slotId) : null;
          const LiveComponent = def?.component || null;

          return (
            <div key={i} onClick={() => !slotId && setPicking(i)} style={{
              border: slotId ? '1px solid #222' : '1px dashed #2a2a2a',
              borderRadius: '12px',
              padding: '1.25rem',
              background: slotId ? '#111' : 'transparent',
              cursor: slotId ? 'default' : 'pointer',
              minHeight: '120px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: slotId ? 'flex-start' : 'center',
              alignItems: slotId ? 'flex-start' : 'center',
              transition: 'border-color 0.2s',
            }}>
              {slotId && def && LiveComponent ? (
                <>
                  {/* Live module renders here with full context */}
                  <LiveComponent {...context} />
                  <button
                    onClick={e => { e.stopPropagation(); removeModule(i); }}
                    style={{ marginTop: '0.75rem', fontSize: '0.7rem', color: '#333', background: 'none', border: '1px solid #222', borderRadius: '6px', padding: '0.2rem 0.6rem', cursor: 'pointer' }}
                  >
                    Remove
                  </button>
                </>
              ) : (
                <>
                  <div style={{ fontSize: '1.2rem', marginBottom: '0.4rem' }}>+</div>
                  <div style={{ fontSize: '0.75rem', color: '#333' }}>Add Module</div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Module Picker Modal */}
      {picking !== null && (
        <div onClick={() => setPicking(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#111', border: '1px solid #222', borderRadius: '16px', padding: '1.5rem', width: '320px', maxWidth: '90vw' }}>
            <div style={{ fontWeight: 700, marginBottom: '1rem', fontSize: '0.9rem' }}>Choose a Module</div>
            {available.length === 0 ? (
              <div style={{ color: '#555', fontSize: '0.8rem' }}>All modules added.</div>
            ) : (
              available.map(mod => (
                <div key={mod.id} onClick={() => addModule(picking, mod.id)} style={{ padding: '0.75rem', borderRadius: '8px', cursor: 'pointer', marginBottom: '0.5rem', border: '1px solid #1a1a1a', background: '#0a0a0a' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{mod.label}</div>
                  <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '0.2rem' }}>{mod.desc}</div>
                </div>
              ))
            )}
            <button onClick={() => setPicking(null)} style={{ marginTop: '1rem', width: '100%', background: 'none', border: '1px solid #222', color: '#555', borderRadius: '8px', padding: '0.5rem', cursor: 'pointer', fontSize: '0.8rem' }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
