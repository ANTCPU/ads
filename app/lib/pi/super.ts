// ─── Super Gate ───────────────────────────────────────────────────────────────
// Single function — answers: is this session the founder?
// Used by /dashboard/super to gate access.
// Pi UID is the primary check. Email is the fallback during transition.
// Both values live in Vercel env — never hardcoded here.
// ─────────────────────────────────────────────────────────────────────────────

import type { ArenaSession } from './types';

export function isSuper(session: ArenaSession): boolean {
  const founderPiUid  = process.env.FOUNDER_PI_UID;   // set after first Pi login
  const founderEmail  = process.env.FOUNDER_EMAIL;     // transition fallback

  // Primary — Pi UID check
  if (founderPiUid && session.pi_uid) {
    return session.pi_uid === founderPiUid;
  }

  // Fallback — email during transition period (before Pi login is live)
  if (founderEmail && session.email) {
    return session.email === founderEmail;
  }

  return false;
}
