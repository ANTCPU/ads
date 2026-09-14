// app/dashboard/antcpu/layout.tsx
// ─── Admin shell — wraps every page under /dashboard/antcpu ──────────────────
// Owns: ArenaNav, AdminBar, outer bg, max-width container, padding.
// page.tsx only renders content sections — no chrome duplication.

import React    from 'react';
import { G }    from '../../lib/adminTokens';

export default function AntcpuLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background:  G.bg,
      minHeight:   '100vh',
      color:       G.text,
      fontFamily:  'system-ui, sans-serif',
    }}>
      {/*
        ArenaNav + AdminBar are client components that need localStorage.
        They live in page.tsx (client boundary) — layout is server by default.
        Layout owns the shell bg + container only.
      */}
      <div style={{
        maxWidth: '720px',
        margin:   '0 auto',
        padding:  '2rem 1.25rem 4rem',
      }}>
        {children}
      </div>
    </div>
  );
}
