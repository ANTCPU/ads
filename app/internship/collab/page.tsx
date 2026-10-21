import { getChallengeCohort } from '../../lib/challengeDays';
// ============================================================
// app/internship/collab/page.tsx
// Team Collaboration Hub — Week 3 LIVE
//
// Week 3: Node assignments active — Alpha/Beta/Gamma/Delta
// Week 4: Project leadership tools — locked until week 4
// Reads node assignments from Supabase challengers table
// ============================================================

import { createClient } from '@supabase/supabase-js';

export const revalidate = 60;

export const metadata = {
  title: 'Collab Hub — antcpu.io Internship Arena',
  description: 'Week 3 team collaboration — nodes active, dev × marketing pairing live.',
};

const CURRENT_WEEK = 3;

const NODE_META: Record<string, { name: string; color: string; emoji: string; border: string }> = {
  'node-1': { name: 'Alpha', color: '#ff4d00', emoji: '🔴', border: '#ff4d0040' },
  'node-2': { name: 'Beta',  color: '#00d4ff', emoji: '🔵', border: '#00d4ff40' },
  'node-3': { name: 'Gamma', color: '#ffd700', emoji: '🟡', border: '#ffd70040' },
  'node-4': { name: 'Delta', color: '#00ff88', emoji: '🟢', border: '#00ff8840' },
};

const STAFF = ['Antony0', 'Mohamed39', 'Arena4'];

export default async function CollabPage() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: challengers } = await supabase
    .from('challengers')
    .select('handle, first_name, track, team_id, is_captain, captain_team, team_notes')
    .eq('cohort', getChallengeCohort())
    .eq('status', 'active')
    .not('team_id', 'is', null);

  // Group by node
  const nodes: Record<string, { captain?: any; marketer?: any; members: any[] }> = {
    'node-1': { members: [] },
    'node-2': { members: [] },
    'node-3': { members: [] },
    'node-4': { members: [] },
  };

  for (const c of (challengers ?? [])) {
    if (STAFF.includes(c.handle)) continue;
    const node = nodes[c.team_id];
    if (!node) continue;
    if (c.is_captain)              node.captain  = c;
    else if (c.track === 'marketing') node.marketer = c;
    else                           node.members.push(c);
  }

  const isWeek4 = CURRENT_WEEK >= 4;

  return (
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '3rem 1.5rem', fontFamily: 'system-ui,sans-serif', background: '#0a0a0a', minHeight: '100vh', color: '#f1f5f9' }}>

      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginBottom: '0.4rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
        ⚡ Internship Arena · Week 3
      </div>
      <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '0.4rem' }}>Team Collab Hub.</h1>
      <p style={{ color: '#9ca3af', marginBottom: '0.25rem', fontSize: '0.95rem' }}>
        4 nodes. Dev builds. Marketing campaigns. One shared deliverable.
      </p>
      <p style={{ color: '#6b7280', marginBottom: '2rem', fontSize: '0.82rem' }}>
        Week 3 is live — find your node, meet your captain, ship together.
      </p>

      {/* ── MENTOR STRIP ── */}
      <div style={{ background: '#111', border: '1px solid #1f2937', borderRadius: 10, padding: '0.75rem 1rem', marginBottom: '2rem', display: 'flex', gap: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: '0.72rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Mentors</span>
        <a href="https://antcpu-ads.vercel.app/office/Arena4" target="_blank" rel="noreferrer"
          style={{ color: '#60a5fa', fontSize: '0.82rem', textDecoration: 'none' }}>
          💻 Arena4 — Dev Mentor →
        </a>
        <a href="https://antcpu-ads.vercel.app/office/Mohamed39" target="_blank" rel="noreferrer"
          style={{ color: '#c084fc', fontSize: '0.82rem', textDecoration: 'none' }}>
          📣 Mohamed39 — Marketing Mentor →
        </a>
      </div>

      {/* ── NODE CARDS ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginBottom: '3rem' }}>
        {Object.entries(nodes).map(([nodeId, node]) => {
          const meta = NODE_META[nodeId];
          if (!meta) return null;
          const nodeNum = nodeId.split('-')[1];
          return (
            <div key={nodeId} style={{
              border: `1px solid ${meta.border}`,
              borderRadius: 14, padding: '1.25rem 1.5rem',
              background: `${meta.color}08`,
            }}>
              {/* Node header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <span style={{
                  background: meta.color, color: '#000', fontWeight: 800,
                  fontSize: '0.72rem', padding: '0.25rem 0.75rem', borderRadius: 999,
                }}>
                  {meta.emoji} NODE {nodeNum.toUpperCase()} — {meta.name.toUpperCase()}
                </span>
                <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>Week 3 Active ✅</span>
              </div>

              {/* Captain + Marketer */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                {node.captain && (
                  <a href={`https://antcpu-ads.vercel.app/office/${node.captain.handle}`}
                    target="_blank" rel="noreferrer"
                    style={{ background: '#ffd70015', border: '1px solid #ffd70030', borderRadius: 8, padding: '0.6rem 0.75rem', textDecoration: 'none', display: 'block' }}>
                    <div style={{ fontSize: '0.68rem', color: '#ffd700', fontWeight: 700, marginBottom: '0.15rem' }}>👑 CAPTAIN</div>
                    <div style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 600 }}>{node.captain.first_name ?? node.captain.handle}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.72rem' }}>{node.captain.handle}</div>
                  </a>
                )}
                {node.marketer && (
                  <a href={`https://antcpu-ads.vercel.app/office/${node.marketer.handle}`}
                    target="_blank" rel="noreferrer"
                    style={{ background: '#c084fc15', border: '1px solid #c084fc30', borderRadius: 8, padding: '0.6rem 0.75rem', textDecoration: 'none', display: 'block' }}>
                    <div style={{ fontSize: '0.68rem', color: '#c084fc', fontWeight: 700, marginBottom: '0.15rem' }}>📣 MARKETER</div>
                    <div style={{ color: '#f1f5f9', fontSize: '0.85rem', fontWeight: 600 }}>{node.marketer.first_name ?? node.marketer.handle}</div>
                    <div style={{ color: '#6b7280', fontSize: '0.72rem' }}>{node.marketer.handle}</div>
                  </a>
                )}
              </div>

              {/* Dev members */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                {node.members.map((m: any) => (
                  <a key={m.handle} href={`https://antcpu-ads.vercel.app/office/${m.handle}`}
                    target="_blank" rel="noreferrer"
                    style={{
                      fontSize: '0.72rem', padding: '0.2rem 0.6rem', borderRadius: 999,
                      border: `1px solid ${meta.border}`, color: meta.color,
                      textDecoration: 'none', background: `${meta.color}10`,
                    }}>
                    💻 {m.first_name ?? m.handle}
                  </a>
                ))}
              </div>

              {/* Week 3 CTAs */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <a href="https://antcpu-ads.vercel.app/office/Arena4" target="_blank" rel="noreferrer"
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.9rem', borderRadius: 999, background: meta.color, color: '#000', fontWeight: 700, textDecoration: 'none' }}>
                  d15 — Meet Your Team →
                </a>
                <a href="https://github.com/ANTCPU/ads/issues" target="_blank" rel="noreferrer"
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.9rem', borderRadius: 999, border: `1px solid ${meta.border}`, color: meta.color, textDecoration: 'none' }}>
                  d16 — GitHub Issues →
                </a>
                <a href="https://antcpu-ads.vercel.app/arena" target="_blank" rel="noreferrer"
                  style={{ fontSize: '0.75rem', padding: '0.3rem 0.9rem', borderRadius: 999, border: `1px solid #c084fc40`, color: '#c084fc', textDecoration: 'none' }}>
                  d16 — Arena →
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── WEEK 4 LOCKED ── */}
      <div style={{ background: '#111', border: '1px solid #1f2937', borderRadius: 14, padding: '1.5rem', opacity: 0.6 }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🔒</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Week 4 — Project Leadership</div>
            <div style={{ color: '#6b7280', fontSize: '0.8rem' }}>Unlocks when week 3 is complete. Top challengers lead. Others contribute.</div>
          </div>
        </div>
      </div>

    </main>
  );
}
