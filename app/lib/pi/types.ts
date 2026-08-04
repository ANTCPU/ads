// ─── Pi Identity Types ────────────────────────────────────────────────────────
// Source of truth for Pi auth across the entire app.
// Matches ad_signups columns exactly — no drift.
// ─────────────────────────────────────────────────────────────────────────────

// Pi /v2/me response — what we get after verifying the bearer token server-side
export type PiMeResponse = {
  uid: string;             // app-scoped stable ID — maps to pi_uid in ad_signups
  username: string;        // Pi username — maps to pi_username
  wallet_address?: string; // present only if wallet_address scope was consented
};

// The Pi columns on ad_signups — exactly as they exist in the DB
export type PiIdentityRow = {
  pi_uid: string | null;
  pi_username: string | null;
  pi_wallet_address: string | null;
  auth_method: 'email_pin' | 'pi';
};

// What the Pi auth route returns to the client on success
// Matches the shape of /api/user-auth response exactly
export type PiAuthResult = {
  ok: true;
  user: {
    email: string | null;
    name: string;
    brand: string;
    trialStatus: string;
    role: string;
    pi_uid: string;
    pi_username: string;
    pi_wallet_address: string | null; // null if user declined wallet_address scope
    auth_method: 'pi';
  };
};

// Full session shape — covers both email_pin and Pi users
export type ArenaSession = {
  email: string | null;
  name: string;
  brand: string;
  trialStatus: string;
  role: string;
  pi_uid?: string;
  pi_username?: string;
  pi_wallet_address?: string;
  auth_method?: 'email_pin' | 'pi';
};
