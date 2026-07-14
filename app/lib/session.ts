// ─── Session helpers ──────────────────────────────────────────────────────────
// arena_session cookie is now HttpOnly — set server-side via /api/session/set.
// clearSessionCookie() calls the server to clear it + wipes localStorage cache.
// setSessionCookie() is retired — kept as no-op for any legacy callers.
// ─────────────────────────────────────────────────────────────────────────────

export async function clearSessionCookie(): Promise<void> {
  await fetch('/api/session/clear', { method: 'POST' }).catch(() => {});
  if (typeof window !== 'undefined') {
    localStorage.removeItem('arena_user');
  }
}

// Legacy — no longer writes cookie directly. Cookie set via /api/session/set.
export function setSessionCookie(_user?: unknown): void {}
