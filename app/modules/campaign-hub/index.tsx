// app/modules/campaign-hub/index.tsx
// ─── Campaign Hub — tier groups + pending review queue ────────────────────────
// Changes vs previous:
//   - BRAND_MAP removed — uses user.brand directly
//   - TIER_COLOR / TIER_LABEL / TIERS keys fixed: 'toptier' → 'top_tier'
//     ads.tier column stores 'top_tier' — was causing wrong colour + missing groups
'use client';

import { useEffect, useState } from 'react';
import { ModuleContext, Ad }   from '../types';

// ─── Tier config — keys match ads.tier column exactly ────────────────────────

const TIER_COLOR: Record<string, string> = {
  top_tier: '#f0883e',
  featured: '#ff0080',
  rising:   '#7928ca',
  entry:    '#0070f3',
};

const TIER_LABEL: Record<string, string> = {
  top_tier: 'Top Tier',
  featured: 'Featured',
  rising:   'Rising',
  entry:    'Entry',
};

const TIERS = ['top_tier', 'featured', 'rising', 'entry'];

// ─── Types ────────────────────────────────────────────────────────────────────

type TierGroup = {
  tier:        string;
  count:       number;
  totalPoints: number;
  totalClicks: number;
  totalShares: number;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function CampaignHubModule({ slug, supabase, user, isSuper }: ModuleContext) {
  const [groups,   setGroups]   = useState<TierGroup[]>([]);
  const [ads,      setAds]      = useState<Ad[]>([]);
  const [total,    setTotal]    = useState(0);
  const [loading,  setLoading]  = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, [slug]);

  async function fetchData() {
    setLoading(true);
    const brandName = user.brand || slug;
    const { data } = await supabase
      .from('ads')
      .select('*')
      .ilike('brand', `%${brandName}%`)
      .eq('status', 'active')
      .order('points', { ascending: false });

    if (!data) { setLoading(false); return; }

    const map: Record<string, TierGroup> = {};
    data.forEach((ad: Ad) => {
      const t = ad.tier || 'entry';
      if (!map[t]) map[t] = { tier: t, count: 0, totalPoints: 0, totalClicks: 0, totalShares: 0 };
      map[t].count++;
      map[t].totalPoints += ad.points      || 0;
      map[t].totalClicks += ad.click_count || 0;
      map[t].totalShares += ad.share_count || 0;
    });

    setGroups(TIERS.filter(t => map[t]).map(t => map[t]));
    setAds(data);
    setTotal(data.length);
    setLoading(false);
  }

  async function approveAd(adId: string) {
    setUpdating(adId);
    await supabase.from('ads').update({ status: 'active' }).eq('id', adId);
    setAds(prev => prev.map(a => a.id === adId ? { ...a, status: 'active' } : a));
    fetch('/api/scout/score', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ad_id: adId }),
    }).catch(() => {});
    setUpdating(null);
  }

  async function rejectAd(adId: string) {
    setUpdating(adId);
    await supabase.from('ads').update({ status: 'rejected' }).eq('id', adId);
    setAds(prev => prev.filter(a => a.id !== adId));
    setUpdating(null);
  }

  async function togglePin(ad: Ad) {
    setUpdating(ad.id);
    await supabase.from('ads').update({ pinned: !ad.pinned }).eq('id', ad.id);
    setAds(prev => prev.map(a => a.id === ad.id ? { ...a, pinned: !a.pinned } : a));
    setUpdating(null);
  }

  async function updateTier(adId: string, tier: string) {
    setUpdating(adId);
    await supabase.from('ads').update({ tier }).eq('id', adId);
    setAds(prev => prev.map(a => a.id === adId ? { ...a, tier } : a));
    await fetchData();
    setUpdating(null);
  }

  // ─── User view ────────────────────────────────────────────────────────────

  if (!isSuper) {
    return (
      <div>
        <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          📡 Campaign Hub
        </div>
        {loading ? (
          <div style={{ color: '#555', fontSize: '0.82rem' }}>Loading...</div>
        ) : groups.length === 0 ? (
          <div style={{ color: '#555', fontSize: '0.82rem' }}>No active campaigns.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {groups.map(g => (
              <div key={g.tier} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', background: '#0a0a0a', border: `1px solid ${TIER_COLOR[g.tier]}30`, borderLeft: `3px solid ${TIER_COLOR[g.tier]}`, borderRadius: '8px' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: TIER_COLOR[g.tier] }}>{TIER_LABEL[g.tier]}</div>
                  <div style={{ fontSize: '0.68rem', color: '#555', marginTop: '0.15rem' }}>{g.count} ad{g.count !== 1 ? 's' : ''}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f0883e' }}>{g.totalPoints} pts</div>
                  <div style={{ fontSize: '0.68rem', color: '#555' }}>{g.totalClicks} clicks</div>
                </div>
              </div>
            ))}
            <div style={{ fontSize: '0.68rem', color: '#555', marginTop: '0.25rem' }}>{total} total active</div>
          </div>
        )}
      </div>
    );
  }

  // ─── Super admin view ─────────────────────────────────────────────────────

  const pendingAds = ads.filter(a => a.status === 'pending_review');

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          📡 Campaign Hub — Admin
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem' }}>
          <span style={{ color: '#f0883e', fontWeight: 700 }}>{total} active</span>
          {pendingAds.length > 0 && (
            <span style={{ color: '#ef4444', fontWeight: 700 }}>⚠️ {pendingAds.length} pending</span>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#555', fontSize: '0.82rem' }}>Loading...</div>
      ) : (
        <>
          {pendingAds.length > 0 && (
            <div style={{ background: '#ef444410', border: '1px solid #ef444430', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700, marginBottom: '0.5rem' }}>
                ⚠️ Pending Review ({pendingAds.length})
              </div>
              {pendingAds.map(ad => (
                <div key={ad.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0', borderBottom: '1px solid #ef444420', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>{ad.title}</div>
                    <div style={{ fontSize: '0.68rem', color: '#555' }}>{ad.brand} · {ad.email}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button onClick={() => approveAd(ad.id)} disabled={updating === ad.id}
                      style={{ background: '#22c55e15', border: '1px solid #22c55e40', color: '#22c55e', borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>
                      ✅ Approve
                    </button>
                    <button onClick={() => rejectAd(ad.id)} disabled={updating === ad.id}
                      style={{ background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444', borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>
                      ✕ Reject
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {groups.map(g => (
            <div key={g.tier} style={{ marginBottom: '0.75rem' }}>
              <button onClick={() => setExpanded(expanded === g.tier ? null : g.tier)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#0a0a0a', border: `1px solid ${TIER_COLOR[g.tier]}30`, borderLeft: `3px solid ${TIER_COLOR[g.tier]}`, borderRadius: '8px', padding: '0.6rem 0.75rem', cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: TIER_COLOR[g.tier] }}>{TIER_LABEL[g.tier]}</span>
                  <span style={{ fontSize: '0.68rem', color: '#555' }}>{g.count} ads</span>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.68rem', color: '#f0883e' }}>{g.totalPoints} pts</span>
                  <span style={{ fontSize: '0.68rem', color: '#555' }}>{g.totalClicks} clicks · {g.totalShares} shares</span>
                  <span style={{ color: '#555', fontSize: '0.7rem' }}>{expanded === g.tier ? '▲' : '▼'}</span>
                </div>
              </button>

              {expanded === g.tier && (
                <div style={{ border: `1px solid ${TIER_COLOR[g.tier]}20`, borderTop: 'none', borderRadius: '0 0 8px 8px', overflow: 'hidden' }}>
                  {ads.filter(a => a.tier === g.tier).map(ad => (
                    <div key={ad.id} style={{ padding: '0.6rem 0.75rem', borderBottom: '1px solid #1a1a1a', background: '#0a0a0a' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff', flex: 1 }}>{ad.title}</span>
                        {ad.pinned && <span style={{ fontSize: '0.65rem', color: '#f0883e' }}>📌</span>}
                        <span style={{ fontSize: '0.68rem', color: '#555' }}>{ad.points || 0} pts · {ad.click_count || 0} clicks · {ad.share_count || 0} shares</span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#555', marginBottom: '0.5rem' }}>{ad.brand} · {ad.email}</div>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <select value={ad.tier} onChange={e => updateTier(ad.id, e.target.value)} disabled={updating === ad.id}
                          style={{ background: '#111', border: `1px solid ${TIER_COLOR[ad.tier] || '#222'}`, color: TIER_COLOR[ad.tier] || '#555', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>
                          {TIERS.map(t => <option key={t} value={t}>{TIER_LABEL[t]}</option>)}
                        </select>
                        <button onClick={() => togglePin(ad)} disabled={updating === ad.id}
                          style={{ background: ad.pinned ? '#f0883e15' : 'transparent', border: `1px solid ${ad.pinned ? '#f0883e' : '#222'}`, color: ad.pinned ? '#f0883e' : '#555', borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.68rem', fontWeight: 700, cursor: 'pointer' }}>
                          {ad.pinned ? '📌 Unpin' : '+ Pin'}
                        </button>
                        <button onClick={() => fetch('/api/scout/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ad_id: ad.id }) }).then(() => fetchData())}
                          style={{ background: 'transparent', border: '1px solid #222', color: '#555', borderRadius: '6px', padding: '0.2rem 0.6rem', fontSize: '0.68rem', cursor: 'pointer' }}>
                          ⚡ Rescore
                        </button>
                        <a href={`/profile/${encodeURIComponent(ad.email)}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: '0.68rem', color: '#555', textDecoration: 'none' }}>
                          👤 Profile
                        </a>
                        {updating === ad.id && <span style={{ fontSize: '0.65rem', color: '#555' }}>saving...</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
