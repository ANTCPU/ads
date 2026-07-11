'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ModuleContext } from '../types';
import { YOUTUBE_CHANNELS } from '../../lib/platforms/youtube';
import { EMOJI } from '../../lib/content/emojis';

// ─── Supabase ─────────────────────────────────────────────────────────────────

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// ─── Types ────────────────────────────────────────────────────────────────────

type ChannelConfig = {
  channelId: string;
  handle:    string;
};

type ModuleConfig = {
  'youtube-live'?: ChannelConfig;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Load saved config from arena_modules.config for this slug + email
async function loadConfig(slug: string, email: string): Promise<ChannelConfig | null> {
  const { data } = await supabase
    .from('arena_modules')
    .select('config')
    .eq('slug', slug)
    .eq('email', email)
    .maybeSingle();
  const cfg = data?.config as ModuleConfig | null;
  return cfg?.['youtube-live'] || null;
}

// Save channel config into arena_modules.config JSONB
async function saveConfig(slug: string, email: string, channel: ChannelConfig) {
  // Read existing config first so we don't overwrite other module configs
  const { data } = await supabase
    .from('arena_modules')
    .select('config')
    .eq('slug', slug)
    .eq('email', email)
    .maybeSingle();
  const existing = (data?.config as ModuleConfig) || {};
  const updated: ModuleConfig = { ...existing, 'youtube-live': channel };
  await supabase
    .from('arena_modules')
    .upsert(
      { slug, email, config: updated, updated_at: new Date().toISOString() },
      { onConflict: 'slug,email' }
    );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function YouTubeLiveModule({ slug, user }: ModuleContext) {


  // — state
  const [channel, setChannel]     = useState<ChannelConfig | null>(null);
  const [loading, setLoading]     = useState(true);
  const [setup, setSetup]         = useState(false);
  const [inputId, setInputId]     = useState('');
  const [inputHandle, setInputHandle] = useState('');
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  // — on mount: check hardcoded registry first, then saved config
  useEffect(() => {
    async function init() {
      // 1. Check hardcoded registry (antcpu + mapofpi already have channels)
      const hardcoded = YOUTUBE_CHANNELS[slug];
      if (hardcoded && !hardcoded.channelId.includes('xxx')) {
        setChannel(hardcoded);
        setLoading(false);
        return;
      }
      // 2. Check saved config in arena_modules
      if (user.email) {
        const saved = await loadConfig(slug, user.email);
        if (saved) {
          setChannel(saved);
          setLoading(false);
          return;
        }
      }
      // 3. No channel found — show setup
      setLoading(false);
    }
    init();
  }, [slug, user.email]);

  // — save new channel config
  async function handleSave() {
    setError('');
    const id     = inputId.trim();
    const handle = inputHandle.trim().replace('@', '');
    if (!id || !handle) {
      setError('Both Channel ID and handle are required.');
      return;
    }
    if (!id.startsWith('UC') || id.length < 20) {
      setError('Channel ID should start with UC and be ~24 characters. Find it in YouTube Studio → Settings → Channel → Advanced.');
      return;
    }
    setSaving(true);
    const cfg: ChannelConfig = { channelId: id, handle: `@${handle}` };
    await saveConfig(slug, user.email, cfg);
    setChannel(cfg);
    setSetup(false);
    setSaving(false);
  }

  // ─── Render: loading ──────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ padding: '1.5rem', textAlign: 'center', color: '#555', fontSize: '0.82rem' }}>
        Loading...
      </div>
    );
  }

  // ─── Render: setup flow ───────────────────────────────────────────────────

  if (!channel || setup) {
    return (
      <div style={{ padding: '1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ fontSize: '1.2rem' }}>{EMOJI.youtube}</span>
          <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#fff' }}>Connect YouTube Channel</span>
        </div>

        {/* Instructions */}
        <div style={{ fontSize: '0.78rem', color: '#555', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          To show your live stream in this arena:<br />
          1. Go to <strong style={{ color: '#aaa' }}>YouTube Studio</strong><br />
          2. Settings → Channel → Advanced settings<br />
          3. Copy your <strong style={{ color: '#aaa' }}>Channel ID</strong> (starts with UC...)<br />
          4. Paste it below and enter your handle (e.g. mapofpi)
        </div>

        {/* Channel ID input */}
        <label style={{ display: 'block', fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          Channel ID
        </label>
        <input
          value={inputId}
          onChange={e => setInputId(e.target.value)}
          placeholder="UCxxxxxxxxxxxxxxxxxxxxxxxxx"
          style={{
            width: '100%', background: '#0a0a0a', border: '1px solid #222',
            borderRadius: '8px', padding: '0.7rem 1rem', color: '#fff',
            fontSize: '0.85rem', boxSizing: 'border-box', marginBottom: '0.75rem',
            outline: 'none', fontFamily: 'monospace',
          }}
        />

        {/* Handle input */}
        <label style={{ display: 'block', fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '0.4rem' }}>
          YouTube Handle
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
          <span style={{ color: '#555', fontSize: '0.9rem' }}>@</span>
          <input
            value={inputHandle}
            onChange={e => setInputHandle(e.target.value.replace('@', ''))}
            placeholder="mapofpi"
            style={{
              flex: 1, background: '#0a0a0a', border: '1px solid #222',
              borderRadius: '8px', padding: '0.7rem 1rem', color: '#fff',
              fontSize: '0.85rem', boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        {/* Error */}
        {error && (
          <div style={{ fontSize: '0.78rem', color: '#ef4444', marginBottom: '0.75rem', lineHeight: 1.5 }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleSave}
            disabled={saving || !inputId.trim() || !inputHandle.trim()}
            style={{
              flex: 1, background: saving ? '#222' : '#FF0000',
              border: 'none', color: '#fff', borderRadius: '8px',
              padding: '0.65rem', fontSize: '0.82rem', fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? 'Saving...' : `${EMOJI.youtube} Connect Channel`}
          </button>
          {setup && channel && (
            <button
              onClick={() => { setSetup(false); setError(''); }}
              style={{ background: 'transparent', border: '1px solid #222', color: '#555', borderRadius: '8px', padding: '0.65rem 1rem', fontSize: '0.82rem', cursor: 'pointer' }}
            >
              Cancel
            </button>
          )}
        </div>

        {/* Test your channel ID link */}
        {inputId.startsWith('UC') && inputId.length >= 20 && (
          <a
            href={`https://www.youtube.com/channel/${inputId}`}
            target="_blank"
            rel="noreferrer"
            style={{ display: 'block', marginTop: '0.75rem', fontSize: '0.75rem', color: '#FF0000', textDecoration: 'none' }}
          >
            ▶️ Test this channel ID →
          </a>
        )}
      </div>
    );
  }

  // ─── Render: live stream embed ────────────────────────────────────────────

  return (
    <div>
      {/* 16:9 responsive embed */}
      <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', borderRadius: '10px', marginBottom: '0.75rem' }}>
        <iframe
          src={`https://www.youtube.com/embed/live_stream?channel=${channel.channelId}&autoplay=0&rel=0`}
          title={`${channel.handle} Live`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          style={{
            position: 'absolute', top: 0, left: 0,
            width: '100%', height: '100%',
            border: 'none', borderRadius: '10px',
          }}
        />
      </div>

      {/* Footer row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF0000', display: 'inline-block', flexShrink: 0 }} />
        <span style={{ fontSize: '0.72rem', color: '#555' }}>
          Live when streaming · {channel.handle}
        </span>
        <a
          href={`https://www.youtube.com/@${channel.handle.replace('@', '')}`}
          target="_blank"
          rel="noreferrer"
          style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#FF0000', textDecoration: 'none', fontWeight: 600 }}
        >
          {EMOJI.youtube} YouTube →
        </a>
        {user.email && (
          <button
            onClick={() => { setSetup(true); setInputId(channel.channelId); setInputHandle(channel.handle.replace('@', '')); }}
            style={{ background: 'none', border: 'none', color: '#333', cursor: 'pointer', fontSize: '0.7rem', padding: 0 }}
          >
            ✏️
          </button>
        )}
      </div>
    </div>
  );
}
