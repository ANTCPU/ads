// lib/pingActivity.ts
// Fire-and-forget activity ping — called from any client page.
// Reads intern_id from localStorage antcpu_session.
// Silent fail — never blocks UI.

export function pingActivity({
  label,
  icon  = '⚡',
  type  = 'nav',
  gate_id,
}: {
  label:    string;
  icon?:    string;
  type?:    string;
  gate_id?: string;
}) {
  try {
    const s = JSON.parse(localStorage.getItem('antcpu_session') || '{}');
    const intern_id = s?.intern_id || localStorage.getItem('intern_id') || '';
    if (!intern_id) return; // not a challenger — skip
    fetch('/api/internship/activity', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ intern_id, label, icon, type, gate_id }),
    }).catch(() => null);
  } catch {}
}
