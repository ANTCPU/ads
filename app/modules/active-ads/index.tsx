// app/modules/active-ads/index.tsx
// ─── Active + archived ad management — extracted from antcpu/page.tsx ─────────
'use client';

import React, { useState, useCallback } from 'react';
import type { SupabaseClient }           from '@supabase/supabase-js';
import { G, rowBtn, inpStyle, sectionCard, rankMedal, pingDiscord } from '../../lib/adminTokens';

type ActiveAd = {
  id: string; brand: string; title: string; description: string;
  url: string; points: number; tier: string; is_system: boolean;
  rank_position?: number;
};

type EditForm = { title: string; description: string; url: string };

type Props = {
  supabase:       SupabaseClient;
  onStatsRefresh: () => void;
};

export default function ActiveAdsModule({ supabase, onStatsRefresh }: Props) {
  const [activeAds,   setActiveAds]   = useState<ActiveAd[]>([]);
  const [archivedAds, setArchivedAds] = useState<ActiveAd[]>([]);
  const [confirmId,   setConfirmId]   = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editForm,    setEditForm]    = useState<EditForm>({ title: '', description: '', url: '' });
  const [savingId,    setSavingId]    = useState<string | null>(null);
  const [recalcing,   setRecalcing]   = useState(false);

  const load = useCallback(async () => {
    const [{ data: active }, { data: archived }] = await Promise.all([
      supabase.from('ads').select('id,brand,title,description,url,points,tier,is_system,rank_position').eq('status','active').order('points',{ascending:false}),
      supabase.from('ads').select('id,brand,title,description,url,points,tier,is_system,rank_position').eq('status','archived').order('points',{ascending:false}),
    ]);
    setActiveAds(active || []);
    setArchivedAds(archived || []);
  }, [supabase]);

  // Expose load so parent can call after approve/reject
  React.useEffect(() => { load(); }, [load]);

  async function confirmArchive(id: string) {
    setConfirmId(null); setArchivingId(id);
    await supabase.from('ads').update({ status: 'archived', pinned: false }).eq('id', id);
    const ad = activeAds.find(a => a.id === id);
    if (ad) pingDiscord('', 'ad_archived', { title: '📦 Ad Archived', color: 0xF0883E, fields: [{ name: 'Brand', value: ad.brand, inline: true }, { name: 'Title', value: ad.title, inline: false }], footer: 'ANTCPU ADS · Admin Archive', timestamp: true });
    await load(); onStatsRefresh(); setArchivingId(null);
  }

  async function restoreAd(id: string) {
    setRestoringId(id);
    await supabase.from('ads').update({ status: 'active' }).eq('id', id);
    fetch('/api/scout/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ad_id: id }) }).catch(() => {});
    await load(); onStatsRefresh(); setRestoringId(null);
  }

  async function saveEdit(id: string) {
    setSavingId(id);
    await supabase.from('ads').update({ title: editForm.title.trim(), description: editForm.description.trim(), url: editForm.url.trim() }).eq('id', id);
    setEditingId(null); await load(); setSavingId(null);
  }

  async function recalcRankings() {
    if (!activeAds.length) return;
    setRecalcing(true);
    await fetch('/api/scout/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ad_id: activeAds[0].id }) });
    await load(); onStatsRefresh(); setRecalcing(false);
  }

  return (
    <div style={sectionCard}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: G.text }}>📋 Active Ads ({activeAds.length})</div>
          <div style={{ fontSize: '0.72rem', color: G.muted }}>Edit or archive — Scout recalculates on next interaction</div>
        </div>
        <button onClick={recalcRankings} disabled={recalcing || !activeAds.length}
          style={{ background: recalcing ? G.card2 : G.orange, border: 'none', borderRadius: '8px', color: recalcing ? G.muted : '#000', fontSize: '0.75rem', fontWeight: 700, padding: '0.45rem 0.85rem', cursor: recalcing ? 'default' : 'pointer' }}>
          {recalcing ? '⏳ Recalculating…' : '⚡ Recalc Rankings'}
        </button>
      </div>

      {/* Active list */}
      <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.25rem', scrollbarWidth: 'thin', scrollbarColor: `${G.border2} transparent` } as any}>
        {activeAds.length === 0 ? (
          <div style={{ color: G.muted, fontSize: '0.82rem', padding: '1rem 0' }}>No active ads.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {activeAds.map(ad => {
              const isEditing = editingId === ad.id;
              const isConfirm = confirmId === ad.id;
              const isBusy    = archivingId === ad.id || savingId === ad.id;
              const medal     = rankMedal(ad.rank_position);
              return (
                <div key={ad.id} style={{ background: G.card2, border: `1px solid ${G.border}`, borderRadius: '10px', padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
                    {medal && <span style={{ fontSize: '0.9rem' }}>{medal}</span>}
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: G.text }}>{ad.brand}</span>
                    <span style={{ fontSize: '0.62rem', color: G.muted, background: G.bg, border: `1px solid ${G.border}`, borderRadius: '4px', padding: '0.1rem 0.35rem' }}>{ad.tier}</span>
                    {ad.is_system && <span style={{ fontSize: '0.6rem', color: G.dim }}>system</span>}
                    <span style={{ fontSize: '0.7rem', color: G.orange, fontWeight: 700, marginLeft: 'auto' }}>⚡ {ad.points ?? 0}</span>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: G.muted, marginBottom: '0.6rem' }}>{ad.title}</div>

                  {isEditing && (
                    <div style={{ marginBottom: '0.65rem' }}>
                      <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} placeholder="Title" style={inpStyle} />
                      <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Description" rows={3} style={{ ...inpStyle, resize: 'vertical' }} />
                      <input value={editForm.url} onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))} placeholder="URL" style={{ ...inpStyle, marginBottom: 0 }} />
                    </div>
                  )}
                  {isConfirm && (
                    <div style={{ background: '#1a0e00', border: `1px solid ${G.orange}30`, borderRadius: '8px', padding: '0.6rem 0.85rem', marginBottom: '0.65rem', fontSize: '0.78rem', color: G.orange }}>
                      Archive this ad? It will leave the Arena feed.
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {!isEditing && !isConfirm && (<><button onClick={() => { setConfirmId(null); setEditingId(ad.id); setEditForm({ title: ad.title, description: ad.description, url: ad.url }); }} style={rowBtn(G.blue)}>✏️ Edit</button><button onClick={() => setConfirmId(ad.id)} style={rowBtn(G.orange)}>📦 Archive</button></>)}
                    {isEditing && (<><button onClick={() => saveEdit(ad.id)} disabled={isBusy} style={rowBtn(G.green, isBusy)}>{savingId === ad.id ? '…' : '💾 Save'}</button><button onClick={() => setEditingId(null)} style={rowBtn(G.muted)}>✕ Cancel</button></>)}
                    {isConfirm && (<><button onClick={() => confirmArchive(ad.id)} disabled={isBusy} style={rowBtn(G.red, isBusy)}>{archivingId === ad.id ? '…' : '📦 Confirm'}</button><button onClick={() => setConfirmId(null)} style={rowBtn(G.muted)}>✕ Cancel</button></>)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Archived */}
      {archivedAds.length > 0 && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: `1px solid ${G.border}` }}>
          <div style={{ fontSize: '0.68rem', color: G.dim, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.65rem' }}>📦 Archived ({archivedAds.length})</div>
          <div style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '0.25rem', scrollbarWidth: 'thin', scrollbarColor: `${G.border2} transparent` } as any}>
            {archivedAds.map(ad => (
              <div key={ad.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.5rem', opacity: 0.6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.65rem', color: G.muted, fontWeight: 700 }}>{ad.brand} · </span>
                  <span style={{ fontSize: '0.75rem', color: G.dim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.title}</span>
                  {(ad.points ?? 0) > 0 && <span style={{ fontSize: '0.62rem', color: G.orange, marginLeft: '0.4rem' }}>⚡ {ad.points}</span>}
                </div>
                <button onClick={() => restoreAd(ad.id)} disabled={restoringId === ad.id} style={rowBtn(G.green, restoringId === ad.id)}>
                  {restoringId === ad.id ? '…' : '↩ Restore'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
