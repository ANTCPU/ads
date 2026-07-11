'use client';
import { useEffect, useState } from 'react';
import { ModuleContext } from '../types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const BRAND_MAP: Record<string, string> = {
  mapofpi:     'Map of Pi',
  antcpu:      'ANTCPU ADS',
  adsnetwork:  'ANTCPU ADS',
  photography: 'Amanda Photography',
  pipioneers:  'PiPioneersX',
};

const TIME_WINDOWS = [
  '9:00 AM – 10:00 AM',
  '10:00 AM – 11:00 AM',
  '11:00 AM – 12:00 PM',
  '1:00 PM – 2:00 PM',
  '2:00 PM – 3:00 PM',
  '3:00 PM – 4:00 PM',
  '4:00 PM – 5:00 PM',
];
const BOOKING_WEBHOOK = process.env.NEXT_PUBLIC_DISCORD_BOOKING_WEBHOOK!;


// ─── Types ────────────────────────────────────────────────────────────────────

type DayData = {
  day:    string;
  count:  number;
  clicks: number;
  shares: number;
  points: number;
};

type Booking = {
  id:          string;
  email:       string;
  name:        string;
  brand:       string;
  day:         string;
  time_window: string;
  note:        string;
  status:      string;
  created_at:  string;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ScheduleModule({ slug, supabase, user, isSuper }: ModuleContext) {
  // — ad schedule state
  const [dayData, setDayData]     = useState<DayData[]>([]);
  const [loadingAds, setLoadingAds] = useState(true);
  const [mode, setMode]           = useState<'ads' | 'clicks' | 'shares' | 'points'>('ads');

  // — booking state
  const [bookings, setBookings]   = useState<Booking[]>([]);
  const [loadingBook, setLoadingBook] = useState(true);
  const [selectedDay, setSelectedDay] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [note, setNote]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [updating, setUpdating]   = useState<string | null>(null);

  const today = new Date().getDay();

  useEffect(() => {
    fetchAdData();
    fetchBookings();
  }, [slug]);

  // — fetch ad schedule data
  async function fetchAdData() {
    setLoadingAds(true);
    const brandName = BRAND_MAP[slug] || slug;
    const { data } = await supabase
      .from('ads')
      .select('created_at, click_count, share_count, points')
      .ilike('brand', `%${brandName}%`)
      .eq('status', 'active');

    if (!data) { setLoadingAds(false); return; }

    const counts = Array(7).fill(0);
    const clicks = Array(7).fill(0);
    const shares = Array(7).fill(0);
    const points = Array(7).fill(0);

    data.forEach((ad: { created_at: string; click_count: number; share_count: number; points: number }) => {
      const day = new Date(ad.created_at).getDay();
      counts[day]++;
      clicks[day] += ad.click_count || 0;
      shares[day] += ad.share_count || 0;
      points[day] += ad.points      || 0;
    });

    setDayData(DAYS.map((day, i) => ({
      day, count: counts[i], clicks: clicks[i], shares: shares[i], points: points[i],
    })));
    setLoadingAds(false);
  }

  // — fetch bookings
  async function fetchBookings() {
    setLoadingBook(true);
    const query = isSuper
      ? supabase.from('bookings').select('*').order('created_at', { ascending: false })
      : supabase.from('bookings').select('*').eq('email', user.email).order('created_at', { ascending: false });
    const { data } = await query;
    setBookings(data || []);
    setLoadingBook(false);
  }

  // — submit booking request
  async function submitBooking() {
    if (!selectedDay || !selectedTime || !user.email) return;
    setSubmitting(true);

    // — insert into bookings table
    await supabase.from('bookings').insert([{
      email:       user.email,
      name:        user.name  || user.email,
      brand:       user.brand || slug,
      day:         selectedDay,
      time_window: selectedTime,
      note:        note.trim(),
      status:      'pending',
    }]);

    // — fire to Discord voice channel
    await fetch(BOOKING_WEBHOOK, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: null,
        embeds: [{
          title:       '📅 New Booking Request',
          color:       0xf0883e,
          fields: [
            { name: '👤 From',       value: `${user.name || user.email} · ${user.brand || slug}`, inline: true },
            { name: '📧 Email',      value: user.email,   inline: true },
            { name: '📅 Day',        value: selectedDay,  inline: true },
            { name: '🕐 Time',       value: selectedTime, inline: true },
            { name: '💬 Note',       value: note.trim() || '—', inline: false },
          ],
          footer: { text: 'ANTCPU ADS · Arena Booking System' },
          timestamp: new Date().toISOString(),
        }],
      }),
    }).catch(() => {});

    setSubmitted(true);
    setSelectedDay('');
    setSelectedTime('');
    setNote('');
    setSubmitting(false);
    fetchBookings();
    setTimeout(() => setSubmitted(false), 4000);
  }

  // — super: update booking status
  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    await supabase.from('bookings').update({ status }).eq('id', id);

    // — notify user via Discord if confirmed
    if (status === 'confirmed') {
      const booking = bookings.find(b => b.id === id);
      if (booking) {
        await fetch(BOOKING_WEBHOOK, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: null,
            embeds: [{
              title:       '✅ Booking Confirmed',
              color:       0x22c55e,
              description: `**${booking.name}** — your session has been confirmed.`,
              fields: [
                { name: '📅 Day',  value: booking.day,         inline: true },
                { name: '🕐 Time', value: booking.time_window, inline: true },
                { name: '💬 Note', value: booking.note || '—', inline: false },
              ],
              footer: { text: 'ANTCPU ADS · Arena Booking System' },
              timestamp: new Date().toISOString(),
            }],
          }),
        }).catch(() => {});
      }
    }

    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
    setUpdating(null);
  }

  // — helpers
  function getValue(d: DayData): number {
    if (mode === 'clicks') return d.clicks;
    if (mode === 'shares') return d.shares;
    if (mode === 'points') return d.points;
    return d.count;
  }

  function statusColor(s: string): string {
    if (s === 'confirmed') return '#22c55e';
    if (s === 'declined')  return '#ef4444';
    return '#f0883e';
  }

  const max     = Math.max(...dayData.map(getValue), 1);
  const bestDay = dayData.reduce(
    (best, d) => getValue(d) > getValue(best) ? d : best,
    dayData[0] || { day: '—', count: 0, clicks: 0, shares: 0, points: 0 }
  );

  const pendingBookings   = bookings.filter(b => b.status === 'pending');
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');

  // ─── User view ──────────────────────────────────────────────────────────

  if (!isSuper) {
    return (
      <div>
        {/* Header */}
        <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
          📅 Schedule a Session
        </div>

        {/* Simple bar chart */}
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'flex-end', height: '48px', marginBottom: '1rem' }}>
          {dayData.map((d, i) => {
            const h = max > 0 ? Math.max((d.count / max) * 40, d.count > 0 ? 4 : 0) : 0;
            return (
              <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                <div style={{ width: '100%', height: `${h}px`, background: i === today ? '#f0883e' : '#1a1a1a', borderRadius: '3px 3px 0 0' }} />
                <span style={{ fontSize: '0.55rem', color: i === today ? '#f0883e' : '#555' }}>{d.day}</span>
              </div>
            );
          })}
        </div>

        {/* Booking form */}
        {submitted ? (
          <div style={{ background: '#22c55e15', border: '1px solid #22c55e30', borderRadius: '10px', padding: '1rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.2rem', marginBottom: '0.25rem' }}>✅</div>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#22c55e' }}>Request sent!</div>
            <div style={{ fontSize: '0.72rem', color: '#555', marginTop: '0.25rem' }}>Antony will confirm via Discord.</div>
          </div>
        ) : (
          <div style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '10px', padding: '1rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#aaa', fontWeight: 600, marginBottom: '0.75rem' }}>
              Book a session with Antony ⚡
            </div>

            {/* Day select */}
            <label style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>Day</label>
            <select
              value={selectedDay}
              onChange={e => setSelectedDay(e.target.value)}
              style={{ width: '100%', background: '#111', border: '1px solid #222', color: selectedDay ? '#fff' : '#555', borderRadius: '8px', padding: '0.6rem 0.75rem', fontSize: '0.82rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
            >
              <option value=''>Select a day</option>
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            {/* Time select */}
            <label style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>Time Window</label>
            <select
              value={selectedTime}
              onChange={e => setSelectedTime(e.target.value)}
              style={{ width: '100%', background: '#111', border: '1px solid #222', color: selectedTime ? '#fff' : '#555', borderRadius: '8px', padding: '0.6rem 0.75rem', fontSize: '0.82rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
            >
              <option value=''>Select a time</option>
              {TIME_WINDOWS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            {/* Note */}
            <label style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: '0.3rem' }}>What do you need help with?</label>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. My ad isn't getting clicks, want to discuss strategy..."
              style={{ width: '100%', background: '#111', border: '1px solid #222', color: '#fff', borderRadius: '8px', padding: '0.6rem 0.75rem', fontSize: '0.78rem', minHeight: '72px', resize: 'vertical', boxSizing: 'border-box', marginBottom: '0.75rem' }}
            />

            <button
              onClick={submitBooking}
              disabled={!selectedDay || !selectedTime || submitting}
              style={{ width: '100%', background: selectedDay && selectedTime ? '#f0883e' : '#1a1a1a', border: 'none', color: selectedDay && selectedTime ? '#000' : '#555', borderRadius: '8px', padding: '0.7rem', fontSize: '0.85rem', fontWeight: 700, cursor: selectedDay && selectedTime ? 'pointer' : 'not-allowed' }}
            >
              {submitting ? 'Sending...' : '📅 Request Session'}
            </button>
          </div>
        )}

        {/* User's bookings */}
        {bookings.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>Your Requests</div>
            {bookings.map(b => (
              <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1a1a1a' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', color: '#aaa' }}>{b.day} · {b.time_window}</div>
                  {b.note && <div style={{ fontSize: '0.68rem', color: '#555', marginTop: '0.1rem' }}>{b.note.slice(0, 50)}{b.note.length > 50 ? '…' : ''}</div>}
                </div>
                <span style={{ fontSize: '0.68rem', fontWeight: 700, color: statusColor(b.status), background: `${statusColor(b.status)}15`, border: `1px solid ${statusColor(b.status)}30`, borderRadius: '999px', padding: '0.15rem 0.5rem' }}>
                  {b.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ─── Super admin view ────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ fontSize: '0.7rem', color: '#555', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          📅 Schedule — Admin
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.72rem' }}>
          {pendingBookings.length > 0 && <span style={{ color: '#f0883e', fontWeight: 700 }}>⚠️ {pendingBookings.length} pending</span>}
          <span style={{ color: '#22c55e' }}>✅ {confirmedBookings.length} confirmed</span>
        </div>
      </div>

      {/* Pending bookings — action required */}
      {pendingBookings.length > 0 && (
        <div style={{ background: '#f0883e10', border: '1px solid #f0883e30', borderRadius: '10px', padding: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#f0883e', fontWeight: 700, marginBottom: '0.5rem' }}>
            ⚠️ Pending ({pendingBookings.length})
          </div>
          {pendingBookings.map(b => (
            <div key={b.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid #f0883e20' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.3rem' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#fff' }}>{b.name} · {b.brand}</div>
                  <div style={{ fontSize: '0.68rem', color: '#555' }}>{b.email}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.72rem', color: '#aaa' }}>{b.day} · {b.time_window}</div>
                </div>
              </div>
              {b.note && (
                <div style={{ fontSize: '0.72rem', color: '#888', fontStyle: 'italic', marginBottom: '0.4rem' }}>"{b.note}"</div>
              )}
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  onClick={() => updateStatus(b.id, 'confirmed')}
                  disabled={updating === b.id}
                  style={{ background: '#22c55e15', border: '1px solid #22c55e40', color: '#22c55e', borderRadius: '6px', padding: '0.25rem 0.75rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  ✅ Confirm
                </button>
                <button
                  onClick={() => updateStatus(b.id, 'declined')}
                  disabled={updating === b.id}
                  style={{ background: '#ef444415', border: '1px solid #ef444430', color: '#ef4444', borderRadius: '6px', padding: '0.25rem 0.75rem', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  ✕ Decline
                </button>
                {updating === b.id && <span style={{ fontSize: '0.65rem', color: '#555' }}>saving...</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* All bookings */}
      {bookings.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
            All Bookings ({bookings.length})
          </div>
          {bookings.map(b => (
            <div key={b.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0', borderBottom: '1px solid #1a1a1a', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.75rem', color: '#aaa', fontWeight: 600 }}>{b.name} · {b.brand}</div>
                <div style={{ fontSize: '0.68rem', color: '#555' }}>{b.day} · {b.time_window}</div>
                {b.note && <div style={{ fontSize: '0.65rem', color: '#444', fontStyle: 'italic' }}>"{b.note.slice(0, 60)}{b.note.length > 60 ? '…' : ''}"</div>}
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: statusColor(b.status), background: `${statusColor(b.status)}15`, border: `1px solid ${statusColor(b.status)}30`, borderRadius: '999px', padding: '0.15rem 0.5rem', flexShrink: 0 }}>
                {b.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Ad schedule chart */}
      <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={{ fontSize: '0.65rem', color: '#555', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ad Activity</div>
          {bestDay && <div style={{ fontSize: '0.68rem', color: '#f0883e' }}>Best: {bestDay.day}</div>}
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: '0.35rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
          {(['ads', 'clicks', 'shares', 'points'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              background: mode === m ? '#f0883e' : 'transparent',
              border: `1px solid ${mode === m ? '#f0883e' : '#222'}`,
              color: mode === m ? '#000' : '#555',
              borderRadius: '999px', padding: '0.15rem 0.55rem',
              fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
            }}>
              {m === 'ads' ? '📢' : m === 'clicks' ? '👆' : m === 'shares' ? '↗' : '⚡'} {m}
            </button>
          ))}
        </div>

        {loadingAds ? (
          <div style={{ color: '#555', fontSize: '0.78rem' }}>Loading...</div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-end', height: '60px', marginBottom: '0.4rem' }}>
              {dayData.map((d, i) => {
                const val  = getValue(d);
                const h    = max > 0 ? Math.max((val / max) * 52, val > 0 ? 4 : 0) : 0;
                const best = d.day === bestDay?.day;
                return (
                  <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px' }}>
                    <span style={{ fontSize: '0.55rem', color: val > 0 ? '#aaa' : '#333' }}>{val > 0 ? val : ''}</span>
                    <div style={{ width: '100%', height: `${h}px`, background: best ? '#f0883e' : i === today ? '#0070f3' : '#1a1a1a', borderRadius: '3px 3px 0 0' }} />
                    <span style={{ fontSize: '0.55rem', color: best ? '#f0883e' : i === today ? '#0070f3' : '#555' }}>{d.day}</span>
                  </div>
                );
              })}
            </div>

            {/* Totals */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem' }}>
              {[
                { label: 'Ads',    value: dayData.reduce((s, d) => s + d.count,  0), color: '#aaa' },
                { label: 'Clicks', value: dayData.reduce((s, d) => s + d.clicks, 0), color: '#0070f3' },
                { label: 'Shares', value: dayData.reduce((s, d) => s + d.shares, 0), color: '#22c55e' },
                { label: 'Points', value: dayData.reduce((s, d) => s + d.points, 0), color: '#f0883e' },
              ].map(s => (
                <div key={s.label} style={{ background: '#0a0a0a', border: '1px solid #1a1a1a', borderRadius: '6px', padding: '0.4rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: '0.55rem', color: '#555' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
