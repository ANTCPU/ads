'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ArenaNav from '../../components/ArenaNav';
import Card from '../../components/Card';
import SectionHeader from '../../components/SectionHeader';
import Pill from '../../components/Pill';
import { clearSessionCookie } from '../../lib/session';
import ArenaFooter from '../../components/ArenaFooter';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Constants ────────────────────────────────────────────────────────────────

const AMANDA_EMAIL = 'mishoemanda@gmail.com';
const accent = '#e91e8c';

const TEAM = [
  { name: 'Amanda Mishoe', email: AMANDA_EMAIL, role: 'Lead Photographer', icon: '📸' },
];

const POSTS = [
  { id: 1, tag: '🌅 Morning',  text: 'Good morning ☀️\n\nEvery family has a story worth capturing.\n\nAmanda Photography — 20+ years of portraits, events, and real moments in Thomasville, NC.\n\nNow booking for summer sessions 📸\n\n→ antcpu.com/manda\n\n#photography #familyportraits #nc #portraits #memories' },
  { id: 2, tag: '☀️ Noon',    text: 'The best photos aren\'t posed — they\'re felt. 💛\n\nAmanda Photography captures the real moments. The laughs, the tears, the in-between.\n\nBook your session today.\n\n→ antcpu.com/manda\n\n#photographer #portraitphotography #ncphotographer #familyphotos' },
  { id: 3, tag: '🌙 Evening', text: 'Every picture tells a story 🌙\n\nAs a mother and grandmother, Amanda knows what moments matter most.\n\nLet her capture yours.\n\n→ antcpu.com/manda\n\n#photography #memories #portraits #storytelling #nc' },
  { id: 4, tag: '📅 Booking', text: 'Now booking summer sessions 🌸\n\nPortraits · Events · Special Occasions\n\nLimited availability — Thomasville, NC area.\n\nReach out today to reserve your date.\n\n→ antcpu.com/manda\n\n#ncphotographer #bookingsopen #portraitphotography #familyphotos #summer' },
  { id: 5, tag: '❤️ Story',   text: 'Behind every great photo is someone who truly sees you.\n\nAmanda has been capturing families, milestones, and memories for over 20 years.\n\nNot just a photographer — a storyteller.\n\n→ antcpu.com/manda\n\n#photography #storyteller #portraits #nc #familyphotographer' },
  { id: 6, tag: '🎓 Events',  text: 'Graduation season is here 🎓\n\nCapture the milestone. Keep the memory forever.\n\nAmanda Photography — portraits for every chapter of life.\n\nBooking now for spring and summer events.\n\n→ antcpu.com/manda\n\n#graduation #portraits #ncphotographer #classof2026 #photography' },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type Ad = {
  id: string;
  title: string;
  description: string;
  url: string;
  status: string;
  tier: string;
  points: number;
  click_count: number;
  share_count: number;
  created_at: string;
};

type EditForm = { title: string; description: string; url: string };

// ─── Component ────────────────────────────────────────────────────────────────

export default function PhotographyDashboard() {
  const router = useRouter();

  // ── Session ──
  const [hydrated, setHydrated] = useState(false);
  const [user, setUser]         = useState<any>(null);

  // ── Post builder ──
  const [copiedId,     setCopiedId]     = useState<number | null>(null);
  const [custom,       setCustom]       = useState('');
  const [customCopied, setCustomCopied] = useState(false);

  // ── Ad management ──
  const [activeAds,   setActiveAds]   = useState<Ad[]>([]);
  const [pendingAds,  setPendingAds]  = useState<Ad[]>([]);
  const [archivedAds, setArchivedAds] = useState<Ad[]>([]);
  const [editingId,   setEditingId]   = useState<string | null>(null);
  const [editForm,    setEditForm]    = useState<EditForm>({ title: '', description: '', url: '' });
  const [savingId,    setSavingId]    = useState<string | null>(null);
  const [archivingId, setArchivingId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  // ── Boot ──────────────────────────────────────────────────────────────────

  const loadAds = useCallback(async () => {
    const [{ data: active }, { data: pending }, { data: archived }] = await Promise.all([
      supabase.from('ads').select('*').eq('email', AMANDA_EMAIL).eq('status', 'active').order('created_at', { ascending: false }),
      supabase.from('ads').select('*').eq('email', AMANDA_EMAIL).eq('status', 'pending_review').order('created_at', { ascending: false }),
      supabase.from('ads').select('*').eq('email', AMANDA_EMAIL).eq('status', 'archived').order('created_at', { ascending: false }),
    ]);
    setActiveAds(active || []);
    setPendingAds(pending || []);
    setArchivedAds(archived || []);
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem('arena_user');
    if (!stored) { router.push('/'); return; }
    try {
      const u = JSON.parse(stored);
      if (u.role !== 'team' && u.role !== 'super') { router.push('/dashboard/user'); return; }
      setUser(u);
      setHydrated(true);
      loadAds();
    } catch { router.push('/'); return; }
  }, [loadAds]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  function copyPost(text: string, id: number) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2500);
    });
  }

  function copyCustom() {
    if (!custom.trim()) return;
    navigator.clipboard.writeText(custom).then(() => {
      setCustomCopied(true);
      setTimeout(() => setCustomCopied(false), 2500);
    });
  }

  function openEdit(ad: Ad) {
    setEditingId(ad.id);
    setEditForm({ title: ad.title, description: ad.description, url: ad.url });
  }

  async function saveEdit(id: string) {
    setSavingId(id);
    await supabase.from('ads').update({
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      url: editForm.url.trim(),
    }).eq('id', id);
    setEditingId(null);
    await loadAds();
    setSavingId(null);
  }

  async function archiveAd(id: string) {
    setArchivingId(id);
    await supabase.from('ads').update({ status: 'archived', pinned: false }).eq('id', id);
    await loadAds();
    setArchivingId(null);
  }

  // ── Guard ─────────────────────────────────────────────────────────────────

  if (!hydrated || !user) return null;

  const isSuper = user.role === 'super';

  // ── Styles ────────────────────────────────────────────────────────────────

  const inp: React.CSSProperties = {
    width: '100%', background: '#0a0a0a', border: '1px solid #333',
    borderRadius: '8px', padding: '0.55rem 0.75rem', fontSize: '0.82rem',
    color: '#fff', outline: 'none', boxSizing: 'border-box', marginBottom: '0.5rem',
    fontFamily: 'system-ui, sans-serif',
  };

  const rowBtn = (color: string, disabled = false): React.CSSProperties => ({
    background: 'transparent', border: `1px solid ${disabled ? '#333' : color}`,
    borderRadius: '8px', color: disabled ? '#444' : color,
    fontSize: '0.72rem', fontWeight: 700, padding: '0.35rem 0.65rem',
    cursor: disabled ? 'default' : 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
  });

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div style={{ background: '#0a0a0a', color: '#fff', minHeight: '100vh', fontFamily: 'system-ui, sans-serif' }}>

      <ArenaNav
        role={user.role as 'super' | 'admin' | 'team' | 'user'}
        userName={user.name}
        userEmail={user.email}
        userBrand={user.brand}
        trialStatus={user.trialStatus as 'team' | 'trial' | 'pending'}
        onLogout={() => { localStorage.removeItem('arena_user'); clearSessionCookie(); router.push('/'); }}
      />

      <div style={{ maxWidth: '860px', margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* ── HERO ── */}
        <div style={{
          background: `linear-gradient(135deg, #1a0a10 0%, #0a0a0a 60%)`,
          border: `1px solid ${accent}30`,
          borderRadius: '16px', padding: '2rem 1.5rem', marginBottom: '1.5rem',
          position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '180px', height: '180px', borderRadius: '50%',
            background: `${accent}08`, border: `1px solid ${accent}15`,
          }} />
          <div style={{ fontSize: '0.72rem', color: accent, fontWeight: 700,
            letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Amanda Photography · Thomasville, NC
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#fff',
            lineHeight: 1.2, marginBottom: '0.5rem' }}>
            📸 Brand Dashboard
          </div>
          <div style={{ fontSize: '0.88rem', color: '#888', marginBottom: '1.25rem' }}>
            20+ years of portraits, events, and real moments.
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button onClick={() => router.push('/create-ad')}
              style={{ background: accent, border: 'none', color: '#fff', borderRadius: '8px',
                padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
              📢 Create Ad
            </button>
            <button onClick={() => router.push(`/profile/${encodeURIComponent(AMANDA_EMAIL)}`)}
              style={{ background: 'transparent', border: `1px solid ${accent}60`, color: accent,
                borderRadius: '8px', padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
              👤 Public Profile
            </button>
            <button onClick={() => router.push('/arena/photography')}
              style={{ background: 'transparent', border: '1px solid #333', color: '#aaa',
                borderRadius: '8px', padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
              🏟 Arena
            </button>
            {isSuper && (
              <button onClick={() => router.push('/dashboard/antcpu')}
                style={{ background: 'transparent', border: '1px solid #f0883e60', color: '#f0883e',
                  borderRadius: '8px', padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                ⚡ Admin
              </button>
            )}
          </div>
        </div>

        {/* ── BOOKING CTA ── */}
        <div style={{
          background: `${accent}10`, border: `1px solid ${accent}30`,
          borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff', marginBottom: '0.2rem' }}>
              📅 Now Booking — Summer Sessions
            </div>
            <div style={{ fontSize: '0.78rem', color: '#888' }}>
              Portraits · Events · Special Occasions · Thomasville, NC
            </div>
          </div>
          <button
            onClick={() => window.open('https://antcpu.com/manda', '_blank', 'noopener,noreferrer')}
            style={{ background: accent, border: 'none', color: '#fff', borderRadius: '8px',
              padding: '0.55rem 1.25rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            Book a Session →
          </button>
        </div>

        {/* ── TEAM ── */}
        <div style={{ marginBottom: '1.5rem' }}>
          {TEAM.map(m => (
            <div key={m.email} style={{
              background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px',
              padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem',
            }}>
              <div style={{ fontSize: '2rem' }}>{m.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1rem', color: '#fff' }}>{m.name}</div>
                <div style={{ fontSize: '0.78rem', color: '#555', marginTop: '0.1rem' }}>{m.email} · {m.role}</div>
              </div>
              <div style={{
                background: `${accent}15`, border: `1px solid ${accent}40`, color: accent,
                borderRadius: '999px', padding: '0.2rem 0.75rem', fontSize: '0.72rem', fontWeight: 700,
              }}>
                ✅ Photography Team
              </div>
            </div>
          ))}
        </div>

        {/* ── AD MANAGEMENT ── */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#555', fontWeight: 700,
            textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
            My Ads
          </div>

          {/* Pending */}
          {pendingAds.length > 0 && (
            <div style={{ marginBottom: '0.75rem' }}>
              {pendingAds.map(ad => (
                <div key={ad.id} style={{
                  background: '#111', border: '1px solid #f0883e30',
                  borderLeft: '3px solid #f0883e', borderRadius: '10px',
                  padding: '0.85rem 1rem', marginBottom: '0.5rem',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff' }}>{ad.title}</div>
                      <div style={{ fontSize: '0.72rem', color: '#f0883e', marginTop: '0.2rem' }}>
                        🦋 Pending review — Aria is checking it
                      </div>
                    </div>
                    <span style={{ fontSize: '0.65rem', background: '#f0883e15',
                      border: '1px solid #f0883e30', color: '#f0883e',
                      borderRadius: '999px', padding: '0.15rem 0.5rem', fontWeight: 700 }}>
                      Pending
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Active */}
          {activeAds.length === 0 && pendingAds.length === 0 ? (
            <div style={{
              background: '#111', border: '1px solid #1a1a1a', borderRadius: '10px',
              padding: '1.5rem', textAlign: 'center', color: '#555', fontSize: '0.85rem',
            }}>
              📭 No active ads yet —{' '}
              <span onClick={() => router.push('/create-ad')}
                style={{ color: accent, cursor: 'pointer', fontWeight: 700 }}>
                create one now
              </span>
            </div>
          ) : (
            activeAds.map(ad => {
              const isEditing = editingId === ad.id;
              const isBusy    = savingId === ad.id || archivingId === ad.id;
              return (
                <div key={ad.id} style={{
                  background: '#111', border: `1px solid ${accent}30`,
                  borderLeft: `3px solid ${accent}`, borderRadius: '10px',
                  padding: '0.85rem 1rem', marginBottom: '0.5rem',
                }}>
                  {/* Row header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem',
                    flexWrap: 'wrap', marginBottom: isEditing ? '0.75rem' : 0 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.88rem', color: '#fff',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {ad.title}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '0.15rem' }}>
                        🟢 Live · {ad.tier} · ⚡ {ad.points || 0} pts
                        {(ad.click_count || 0) > 0 && ` · 👆 ${ad.click_count}`}
                        {(ad.share_count || 0) > 0 && ` · ↗ ${ad.share_count}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                      {!isEditing && (
                        <button onClick={() => openEdit(ad)} style={rowBtn(accent, isBusy)} disabled={isBusy}>
                          ✏️ Edit
                        </button>
                      )}
                      <button onClick={() => archiveAd(ad.id)} style={rowBtn('#ef4444', isBusy)} disabled={isBusy}>
                        {archivingId === ad.id ? '...' : '📦 Archive'}
                      </button>
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {isEditing && (
                    <div>
                      <input value={editForm.title}
                        onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                        placeholder="Title" style={inp} />
                      <textarea value={editForm.description}
                        onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                        placeholder="Description" rows={3}
                        style={{ ...inp, resize: 'vertical', minHeight: '72px' }} />
                      <input value={editForm.url}
                        onChange={e => setEditForm(f => ({ ...f, url: e.target.value }))}
                        placeholder="URL" style={{ ...inp, marginBottom: 0 }} />
                      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.65rem' }}>
                        <button onClick={() => saveEdit(ad.id)} disabled={!!savingId}
                          style={{ background: accent, border: 'none', color: '#fff', borderRadius: '8px',
                            padding: '0.45rem 1rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer' }}>
                          {savingId === ad.id ? 'Saving…' : '✅ Save'}
                        </button>
                        <button onClick={() => setEditingId(null)}
                          style={{ background: 'transparent', border: '1px solid #333', color: '#555',
                            borderRadius: '8px', padding: '0.45rem 1rem', fontSize: '0.78rem', cursor: 'pointer' }}>
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}

          {/* Archived — collapsed */}
          {archivedAds.length > 0 && (
            <button onClick={() => setShowArchived(s => !s)}
              style={{ background: 'transparent', border: '1px solid #222', color: '#444',
                borderRadius: '8px', padding: '0.4rem 0.85rem', fontSize: '0.72rem',
                cursor: 'pointer', marginTop: '0.25rem' }}>
              {showArchived ? '▲' : '▼'} {archivedAds.length} archived ad{archivedAds.length > 1 ? 's' : ''}
            </button>
          )}
          {showArchived && archivedAds.map(ad => (
            <div key={ad.id} style={{
              background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px',
              padding: '0.75rem 1rem', marginTop: '0.4rem', opacity: 0.6,
            }}>
              <div style={{ fontSize: '0.82rem', color: '#555' }}>📦 {ad.title}</div>
            </div>
          ))}
        </div>

        {/* ── POST BUILDER ── */}
        <div style={{ fontSize: '0.68rem', color: '#555', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.75rem' }}>
          Post Builder
        </div>
        <div style={{ fontSize: '0.78rem', color: '#555', marginBottom: '1rem' }}>
          Copy a post and share it anywhere — Instagram, Facebook, X, anywhere.
        </div>

        {POSTS.map(p => (
          <div key={p.id} style={{
            background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px',
            padding: '1.25rem', marginBottom: '0.75rem',
          }}>
            <div style={{ fontSize: '0.68rem', color: accent, fontWeight: 700,
              letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
              {p.tag}
            </div>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: '#ccc',
              margin: 0, fontFamily: 'inherit', lineHeight: 1.65 }}>
              {p.text}
            </pre>
            <div style={{ marginTop: '0.85rem' }}>
              <button
                onClick={() => copyPost(p.text, p.id)}
                style={{
                  background: copiedId === p.id ? '#22c55e20' : `${accent}20`,
                  border: `1px solid ${copiedId === p.id ? '#22c55e60' : accent + '60'}`,
                  color: copiedId === p.id ? '#22c55e' : accent,
                  borderRadius: '8px', padding: '0.4rem 1rem',
                  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                }}>
                {copiedId === p.id ? '✅ Copied' : '↗ Copy Post'}
              </button>
            </div>
          </div>
        ))}

        {/* ── CUSTOM POST ── */}
        <div style={{ fontSize: '0.68rem', color: '#555', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.1em', margin: '1.5rem 0 0.75rem' }}>
          Custom Post
        </div>
        <div style={{ background: '#111', border: '1px solid #1a1a1a', borderRadius: '12px', padding: '1.25rem' }}>
          <textarea
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Write a custom post for Amanda Photography..."
            style={{ width: '100%', background: '#0a0a0a', border: '1px solid #333',
              borderRadius: '8px', padding: '0.75rem 1rem', fontSize: '0.88rem',
              color: '#fff', minHeight: '120px', resize: 'vertical',
              boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }}
          />
          <div style={{ marginTop: '0.75rem' }}>
            <button
              onClick={copyCustom}
              style={{
                background: customCopied ? '#22c55e20' : `${accent}20`,
                border: `1px solid ${customCopied ? '#22c55e60' : accent + '60'}`,
                color: customCopied ? '#22c55e' : accent,
                borderRadius: '8px', padding: '0.4rem 1rem',
                fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
              }}>
              {customCopied ? '✅ Copied' : '↗ Copy Custom Post'}
            </button>
          </div>
        </div>

        {/* ── FOOTER ── */}
        <div style={{ textAlign: 'center', padding: '2.5rem 0 1rem', color: '#333', fontSize: '0.75rem' }}>
          ⚡ ANTCPU ADS · 📸 Amanda Photography · Thomasville, NC
        </div>

      </div>
      <ArenaFooter />
    </div>
  );
}
