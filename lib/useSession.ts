// ============================================================
// useSession.ts — antcpu platform
// Unified session + timeclock hook
// Punch in on login -> heartbeat every 5min -> punch out on logout
// Writes to Supabase time_clock + local launcher if available
// Geo via ipapi.co — timezone-aware, global team ready
// v1.0.0 — 2026-05-05
// ============================================================

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export interface SessionGeo {
  ip: string;
  city: string;
  country: string;
  timezone: string;
  utc_offset: string;
  lat: number;
  lng: number;
}

export interface ActiveSession {
  id: string;
  identity: string;
  source: string;
  punch_in: string;
  city: string;
  country: string;
  timezone: string;
  elapsed_mins: number;
}

async function getGeo(): Promise<SessionGeo | null> {
  try {
    const r = await fetch('https://ipapi.co/json/');
    const d = await r.json();
    return {
      ip:         d.ip,
      city:       d.city,
      country:    d.country_name,
      timezone:   d.timezone,
      utc_offset: d.utc_offset,
      lat:        d.latitude,
      lng:        d.longitude,
    };
  } catch {
    return null;
  }
}

export function useSession(source = 'ads') {
  const [session, setSession]     = useState<ActiveSession | null>(null);
  const [elapsed, setElapsed]     = useState(0);
  const heartbeatRef              = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef                = useRef<ReturnType<typeof setInterval> | null>(null);

  // PUNCH IN
  const punchIn = useCallback(async (identity: string) => {
    const geo = await getGeo();
    const now = new Date().toISOString();
    const id  = 'tc-' + Date.now();

    // close any existing active session for this identity
    await supabase
      .from('time_clock')
      .update({ status: 'closed', punch_out: now })
      .eq('identity', identity)
      .eq('status', 'active');

    // insert new session
    const { error } = await supabase.from('time_clock').insert({
      id,
      identity,
      identity_type: 'human',
      source,
      status:        'active',
      punch_in:      now,
      ip:            geo?.ip         ?? null,
      city:          geo?.city       ?? null,
      country:       geo?.country    ?? null,
      timezone:      geo?.timezone   ?? null,
      utc_offset:    geo?.utc_offset ?? null,
      lat:           geo?.lat        ?? null,
      lng:           geo?.lng        ?? null,
      created_at:    now,
    });

    if (error) { console.error('[SESSION] punch-in failed:', error.message); return; }

    const active: ActiveSession = {
      id,
      identity,
      source,
      punch_in: now,
      city:     geo?.city     ?? '—',
      country:  geo?.country  ?? '—',
      timezone: geo?.timezone ?? '—',
      elapsed_mins: 0,
    };

    setSession(active);
    setElapsed(0);
    startTimers(identity);

    // also ping local launcher if available
    fetch('http://localhost:3000/api/timeclock/punch-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity, identity_type: 'human', source, note: geo?.city ?? '' }),
    }).catch(() => {});

    console.log('[SESSION] punched in —', identity, '·', geo?.city, geo?.country);
  }, [source]);

  // PUNCH OUT
  const punchOut = useCallback(async (identity: string) => {
    stopTimers();
    const now = new Date().toISOString();

    const { data } = await supabase
      .from('time_clock')
      .select('punch_in')
      .eq('identity', identity)
      .eq('status', 'active')
      .single();

    const duration = data?.punch_in
      ? Math.round((Date.now() - new Date(data.punch_in).getTime()) / 60000)
      : 0;

    const sc_earned = duration >= 60 ? Math.floor(duration / 60) : 0;

    await supabase
      .from('time_clock')
      .update({ status: 'closed', punch_out: now, duration_mins: duration, sc_earned })
      .eq('identity', identity)
      .eq('status', 'active');

    setSession(null);
    setElapsed(0);

    // ping local launcher
    fetch('http://localhost:3000/api/timeclock/punch-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity }),
    }).catch(() => {});

    console.log('[SESSION] punched out —', identity, '·', duration + 'min ·', sc_earned, 'SC earned');
  }, []);

  // TIMERS
  const startTimers = useCallback((identity: string) => {
    stopTimers();

    // elapsed counter — updates every minute
    elapsedRef.current = setInterval(() => {
      setElapsed(e => e + 1);
    }, 60000);

    // heartbeat — every 5 min
    heartbeatRef.current = setInterval(() => {
      fetch('http://localhost:3000/api/timeclock/heartbeat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity }),
      }).catch(() => {});
    }, 5 * 60000);
  }, []);

  const stopTimers = useCallback(() => {
    if (elapsedRef.current)   clearInterval(elapsedRef.current);
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
  }, []);

  // cleanup on unmount
  useEffect(() => () => stopTimers(), [stopTimers]);

  // SESSION BADGE TEXT
  const badgeText = session
    ? ('⏱ ' + session.city + ' · ' + String(Math.floor(elapsed / 60)).padStart(2,'0') + ':' + String(elapsed % 60).padStart(2,'0'))
    : null;

  return { session, elapsed, badgeText, punchIn, punchOut };
}
