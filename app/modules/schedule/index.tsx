'use client';
import { useEffect, useState } from 'react';
import { ModuleContext } from '../types';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ScheduleModule({ slug, supabase }: ModuleContext) {
  const [dayCounts, setDayCounts] = useState<{ day: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const today = new Date().getDay();

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase
        .from('ads')
        .select('created_at')
        .eq('status', 'active');
      if (!data) { setLoading(false); return; }
      const counts = Array(7).fill(0);
      data.forEach((ad: { created_at: string }) => {
        counts[new Date(ad.created_at).getDay()]++;
      });
      setDayCounts(DAYS.map((day, i) => ({ day, count: counts[i] })));
      setLoading(false);
    }
    fetch();
  }, [slug]);

  const max = Math.max(...dayCounts.map(d => d.count), 1);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>📅 Schedule</div>
        <div style={{ fontSize: '0.7rem', color: '#555' }}>Ads by launch day</div>
      </div>
      {loading ? (
        <div style={{ color: '#333', fontSize: '0.8rem' }}>Loading...</div>
      ) : (
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-end', height: '60px' }}>
          {dayCounts.map((d, i) => (
            <div key={d.day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
              <div style={{
                width: '100%',
                height: `${Math.max((d.count / max) * 44, 4)}px`,
                background: i === today ? '#f0883e' : '#1a1a1a',
                borderRadius: '3px',
                border: i === today ? 'none' : '1px solid #222',
              }} />
              <div style={{ fontSize: '0.6rem', color: i === today ? '#f0883e' : '#444' }}>{d.day}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
