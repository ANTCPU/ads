'use client';

import { useState, useEffect } from 'react';
import { setStoredLocale }     from '../lib/locale';

// ─── Constants ────────────────────────────────────────────────────────────────

const VAULT_MSGS = [
  'Vault is standing by.',
  'Vault is scanning your identity.',
  'Vault is verifying credentials.',
  'Vault is checking the ledger.',
  'Vault is securing your session.',
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type VaultMode   = 'signin' | 'signup';
type VaultStep   = 'email' | 'pin' | 'signup-details' | 'success';
type VaultSource = 'arena' | 'tv-pro' | 'tv-viewer' | 'pricing' | null;

type VaultUser = {
  email:       string;
  name:        string;
  brand:       string;
  trialStatus: string;
  role:        string;
};

type Props = {
  open:         boolean;
  onClose:      () => void;
  onSuccess:    (user: VaultUser) => void;
  redirectTo?:  string;
  defaultMode?: VaultMode;
  // source: entry point context — drives header copy, CTA label, redirect
  // 'tv-pro'    → TV streamer signup path
  // 'tv-viewer' → lightweight viewer join path
  // 'pricing'   → pricing card entry
  // 'arena'     → default arena entry
  // null        → no context, arena defaults apply
  source?:      VaultSource;
};

// ─── Session writer ───────────────────────────────────────────────────────────

function writeSession(
  session: VaultUser & {
    membershipTier?: string;
    streakDays?:     number;
    lastActiveDate?: string | null;
  }
) {
  const encoded = encodeURIComponent(JSON.stringify({
    email:       session.email,
    name:        session.name,
    brand:       session.brand,
    trialStatus: session.trialStatus,
    role:        session.role,
  }));

  const days    = session.role === 'super' || session.trialStatus === 'team' ? 90 : 3;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();

  document.cookie = `arena_session=${encoded}; path=/; expires=${expires}; SameSite=Lax`;

  localStorage.setItem('arena_user', JSON.stringify({
    email:          session.email,
    name:           session.name,
    brand:          session.brand,
    trialStatus:    session.trialStatus,
    role:           session.role,
    membershipTier: session.membershipTier || 'trial',
    streakDays:     session.streakDays     || 0,
    lastActiveDate: session.lastActiveDate || null,
  }));
}

// ─── Role-based redirect ──────────────────────────────────────────────────────
// source overrides role-based defaults when present.

function resolveRedirect(
  role:       string,
  redirectTo?: string,
  source?:    VaultSource,
): string {
  if (redirectTo)                return redirectTo;
  if (source === 'tv-pro')       return '/dashboard/user?welcome=tv';
  if (source === 'tv-viewer')    return '/tv';
  if (role === 'super')          return '/dashboard/antcpu';
  if (role === 'admin')          return '/dashboard/users';
  return '/dashboard/user';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VaultModal({
  open,
  onClose,
  onSuccess,
  redirectTo,
  defaultMode = 'signin',
  source      = null,
}: Props) {

  const [mode,      setMode]      = useState<VaultMode>(defaultMode);
  const [step,      setStep]      = useState<VaultStep>('email');
  const [email,     setEmail]     = useState('');
  const [pin,       setPin]       = useState('');
  const [name,      setName]      = useState('');
  const [brand,     setBrand]     = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [vaultMsg,  setVaultMsg]  = useState<string>(VAULT_MSGS[0]);
  const [hasPinSet, setHasPinSet] = useState(false);
  const [isSuper,   setIsSuper]   = useState(false);
  const [showPin,   setShowPin]   = useState(false);

  // Reset on open/close or defaultMode change
  useEffect(() => {
    if (!open) {
      setMode(defaultMode);
      setStep('email');
      setEmail('');
      setPin('');
      setName('');
      setBrand('');
      setError('');
      setIsSuper(false);
      setHasPinSet(false);
      setShowPin(false);
      setVaultMsg(VAULT_MSGS[0]);
    }
  }, [open, defaultMode]);

  // ─── SIGNIN: Step 1 — Email lookup ───────────────────────────────────────

  async function handleEmail() {
    const norm = email.trim().toLowerCase();
    if (!norm) return;

    setLoading(true);
    setError('');
    setVaultMsg(VAULT_MSGS[1]);

    try {
      const SUPER_EMAIL = process.env.NEXT_PUBLIC_SUPER_EMAIL || '';

      if (SUPER_EMAIL && norm === SUPER_EMAIL) {
        setIsSuper(true);
        setHasPinSet(true);
        setStep('pin');
        setVaultMsg('Admin access detected. Enter your PIN.');
        setLoading(false);
        return;
      }

      const res  = await fetch('/api/user-auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: norm, pin: '__check__' }),
      });

      const data = await res.json();

      if (data.error === 'User not found') {
        // Auto-switch to signup — never dead-end with an error
        setMode('signup');
        setStep('signup-details');
        setVaultMsg(
          source === 'tv-pro'    ? 'New here? Set up your streaming account.' :
          source === 'tv-viewer' ? 'New here? Quick setup to keep watching.'  :
          'New here? Fill in your details to join the Arena.'
        );
        setLoading(false);
        return;
      }

      const pinExists = data.error !== 'No PIN set';
      setHasPinSet(pinExists);
      setStep('pin');
      setVaultMsg(pinExists
        ? 'Identity confirmed. Enter your PIN.'
        : 'Identity confirmed. Securing your session.'
      );

    } catch {
      setError('Vault connection failed. Try again.');
    }

    setLoading(false);
  }

  // ─── SIGNUP: Create account then sign in ─────────────────────────────────

  async function handleSignup() {
    const norm = email.trim().toLowerCase();
    if (!norm || !name.trim()) { setError('Name and email required.'); return; }

    setLoading(true);
    setError('');
    setVaultMsg('Creating your account...');

    try {
      const res  = await fetch('/api/signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email:  norm,
          name:   name.trim(),
          brand:  brand.trim() || name.trim(),
          source: source || 'organic',   // ← source tag — tracked in ad_signups
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Signup failed. Try again.');
        setLoading(false);
        return;
      }

      const session: VaultUser = {
        email:       norm,
        name:        name.trim(),
        brand:       brand.trim() || name.trim(),
        trialStatus: 'trial',
        role:        'user',
      };

      await completeSession(session);

    } catch {
      setError('Vault error. Try again.');
    }

    setLoading(false);
  }

  // ─── SIGNIN: Step 2 — PIN verify ─────────────────────────────────────────

  async function handlePin() {
    const norm = email.trim().toLowerCase();

    setLoading(true);
    setError('');
    setVaultMsg(VAULT_MSGS[2]);

    try {
      let session: VaultUser;

      if (isSuper || hasPinSet) {
        const res = await fetch('/api/user-auth', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email: norm, pin }),
        });

        if (!res.ok) {
          setError('Invalid PIN. Access denied.');
          setLoading(false);
          return;
        }

        setVaultMsg(VAULT_MSGS[3]);
        const { user } = await res.json();

        session = {
          email:       user.email,
          name:        user.name        || '',
          brand:       user.brand       || '',
          trialStatus: user.trialStatus || 'team',
          role:        isSuper ? 'super' : (user.role || 'user'),
        };

      } else {
        const res  = await fetch('/api/user-auth', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email: norm, pin: '__check__' }),
        });

        const data = await res.json();

        session = {
          email:       norm,
          name:        data.user?.name        || '',
          brand:       data.user?.brand       || '',
          trialStatus: data.user?.trialStatus || 'trial',
          role:        data.user?.role        || 'user',
        };
      }

      await completeSession(session);

    } catch {
      setError('Vault error. Try again.');
    }

    setLoading(false);
  }

  // ─── Shared session completion ────────────────────────────────────────────

  async function completeSession(session: VaultUser) {
    setVaultMsg(VAULT_MSGS[4]);

    let enriched = {
      membershipTier: 'trial',
      streakDays:     0,
      lastActiveDate: null as string | null,
      trialStatus:    session.trialStatus,
    };

    try {
      const syncRes  = await fetch('/api/session/set', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(session),
      });

      const syncData = await syncRes.json();

      if (syncData.ok) {
        enriched = {
          membershipTier: syncData.membershipTier || 'trial',
          streakDays:     syncData.streakDays     || 0,
          lastActiveDate: syncData.lastActiveDate || null,
          trialStatus:    syncData.trialStatus    || session.trialStatus,
        };

        if (syncData.preferredLocale) setStoredLocale(syncData.preferredLocale);
      }
    } catch {}

    writeSession({ ...session, ...enriched });
    setStep('success');

    setTimeout(() => {
      onSuccess(session);
      window.location.href = resolveRedirect(session.role, redirectTo, source);
    }, 1200);
  }

  if (!open) return null;

  // ─── Styles ───────────────────────────────────────────────────────────────

  const inputStyle = {
    width: '100%', background: '#111', border: '1px solid #222',
    borderRadius: '10px', padding: '0.85rem 1rem', color: '#fff',
    fontSize: '0.95rem', boxSizing: 'border-box' as const,
    outline: 'none', fontFamily: 'inherit', marginBottom: '0.75rem',
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    width: '100%', padding: '0.9rem', borderRadius: '10px', border: 'none',
    background: active ? '#f0883e' : '#1a1a1a',
    color:      active ? '#000'    : '#555',
    fontWeight: 700, fontSize: '0.95rem',
    cursor:     active ? 'pointer' : 'not-allowed',
    transition: 'background 0.2s', marginTop: '0.5rem',
  });

  // ─── Source context — header accent color + copy ──────────────────────────
  const isTVPro    = source === 'tv-pro';
  const isTVViewer = source === 'tv-viewer';
  const isTV       = isTVPro || isTVViewer;
  const tvAccent   = isTVPro ? '#f0883e' : '#0070f3';

  const modeLabel  = isTV
    ? (isTVPro ? 'ANTCPU TV' : 'ANTCPU TV · VIEWER')
    : (mode === 'signup' ? 'JOIN THE ARENA' : 'VAULT');

  const modeIcon   = isTV
    ? (isTVPro ? '📡' : '👁')
    : (mode === 'signup' ? '⚡' : '🔒');

  const signupCTA  =
    isTVPro    ? 'Start Streaming →'  :
    isTVViewer ? 'Join & Watch →'     :
    'Join the Arena →';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0a0a0a', border: '1px solid #1a1a1a',
          borderRadius: '20px', padding: '2rem',
          width: '100%', maxWidth: '360px',
          boxSizing: 'border-box', boxShadow: '0 0 60px rgba(0,0,0,0.8)',
        }}
      >

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>
            {modeIcon}
          </div>
          <div style={{
            fontWeight: 800, fontSize: '1.1rem',
            color: isTV ? tvAccent : '#fff',
            letterSpacing: '0.1em',
          }}>
            {modeLabel}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#333', marginTop: '0.2rem', letterSpacing: '0.08em' }}>
            Secured by ANTCPU
          </div>
        </div>

        {/* ── Source context block — TV only ── */}
        {isTV && step === 'email' && (
          <div style={{
            marginBottom: '1.25rem',
            padding: '0.85rem 1rem',
            background: `${tvAccent}08`,
            border: `1px solid ${tvAccent}25`,
            borderRadius: '10px',
          }}>
            <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fff', marginBottom: '0.2rem' }}>
              {isTVPro ? 'Start streaming free.' : 'Join to keep watching.'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#666', lineHeight: 1.5 }}>
              {isTVPro
                ? 'Create your account — go live in minutes. No card required.'
                : 'Free account. No card. Back in the stream in 30 seconds.'}
            </div>
          </div>
        )}

        {/* Mode toggle — only on email step, not for TV viewer */}
        {step === 'email' && !isTVViewer && (
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem' }}>
            {(['signin', 'signup'] as VaultMode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '0.45rem', borderRadius: '8px', border: 'none',
                  background: mode === m ? (isTV ? tvAccent : '#f0883e') : '#111',
                  color:      mode === m ? '#000' : '#555',
                  fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                {m === 'signin' ? 'Sign In' : (isTVPro ? 'Create Account' : 'Join Arena')}
              </button>
            ))}
          </div>
        )}

        {/* Status message */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px',
          padding: '0.6rem 0.9rem', marginBottom: '1.25rem',
        }}>
          <span style={{ color: '#2E7D32', fontSize: '0.6rem' }}>●</span>
          <span style={{ fontSize: '0.78rem', color: '#555' }}>{vaultMsg}</span>
        </div>

        {/* ── Step: email ── */}
        {step === 'email' && (
          <>
            <input
              type="email" inputMode="email" autoComplete="email" autoFocus
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (mode === 'signin' ? handleEmail() : setStep('signup-details'))}
              style={inputStyle}
            />

            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                {error}
              </div>
            )}

            <button
              onClick={() => mode === 'signin' ? handleEmail() : setStep('signup-details')}
              disabled={loading || !email.trim()}
              style={btnStyle(!loading && !!email.trim())}>
              {loading ? 'Scanning...' : mode === 'signin' ? 'Continue →' : 'Next →'}
            </button>

            <button onClick={onClose} style={{ width: '100%', background: 'none', border: 'none', color: '#333', fontSize: '0.75rem', marginTop: '0.75rem', cursor: 'pointer', padding: '0.25rem' }}>
              Cancel
            </button>
          </>
        )}

        {/* ── Step: signup-details ── */}
        {step === 'signup-details' && (
          <>
            <div style={{ fontSize: '0.78rem', color: '#555', background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </div>

            <input
              type="text" autoFocus
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignup()}
              style={inputStyle}
            />

            <input
              type="text"
              placeholder={isTVPro ? 'Channel or brand name (optional)' : 'Brand or shop name (optional)'}
              value={brand}
              onChange={e => setBrand(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignup()}
              style={inputStyle}
            />

            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                {error}
              </div>
            )}

            <button onClick={handleSignup} disabled={loading || !name.trim()} style={btnStyle(!loading && !!name.trim())}>
              {loading ? 'Creating account...' : signupCTA}
            </button>

            <button onClick={() => { setStep('email'); setError(''); }} style={{ width: '100%', background: 'none', border: 'none', color: '#333', fontSize: '0.75rem', marginTop: '0.5rem', cursor: 'pointer', padding: '0.25rem' }}>
              ← Back
            </button>
          </>
        )}

        {/* ── Step: pin ── */}
        {step === 'pin' && (
          <>
            <div style={{ fontSize: '0.78rem', color: '#555', background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </div>

            {hasPinSet ? (
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric" autoFocus
                  placeholder="••••••"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePin()}
                  style={{ ...inputStyle, marginBottom: 0, padding: '0.85rem 3rem 0.85rem 1rem', letterSpacing: '0.25em', fontSize: '1.2rem', textAlign: 'center' }}
                />
                <button
                  onClick={() => setShowPin(v => !v)} tabIndex={-1}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#444', fontSize: '1rem', padding: '0.25rem', lineHeight: 1 }}
                >
                  {showPin ? '🙈' : '👁️'}
                </button>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#555', background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                No PIN set — Vault will secure your session automatically.
              </div>
            )}

            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                {error}
              </div>
            )}

            <button onClick={handlePin} disabled={loading || (hasPinSet && !pin.trim())} style={btnStyle(!loading && (!hasPinSet || !!pin.trim()))}>
              {loading ? 'Verifying...' : 'Unlock →'}
            </button>

            <button onClick={() => { setStep('email'); setPin(''); setError(''); setShowPin(false); }} style={{ width: '100%', background: 'none', border: 'none', color: '#333', fontSize: '0.75rem', marginTop: '0.5rem', cursor: 'pointer', padding: '0.25rem' }}>
              ← Back
            </button>
          </>
        )}

        {/* ── Step: success ── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
              {isTVPro    ? 'Studio ready. Go live!' :
               isTVViewer ? 'You\'re in. Enjoy the stream.' :
               mode === 'signup' ? 'Welcome to the Arena!' : 'Access Granted'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#555' }}>Redirecting...</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.62rem', color: '#222', letterSpacing: '0.1em' }}>
          VAULT · ANTCPU SECURITY LAYER
        </div>

      </div>
    </div>
  );
}
  // e.g. "Join the Arena" button passes defaultMode='signup'
  defaultMode?: VaultMode;
};

// ─── Session writer — unchanged ───────────────────────────────────────────────

function writeSession(
  session: VaultUser & {
    membershipTier?: string;
    streakDays?:     number;
    lastActiveDate?: string | null;
  }
) {
  const encoded = encodeURIComponent(JSON.stringify({
    email:       session.email,
    name:        session.name,
    brand:       session.brand,
    trialStatus: session.trialStatus,
    role:        session.role,
  }));
  const days    = session.role === 'super' || session.trialStatus === 'team' ? 90 : 3;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `arena_session=${encoded}; path=/; expires=${expires}; SameSite=Lax`;

  localStorage.setItem('arena_user', JSON.stringify({
    email:          session.email,
    name:           session.name,
    brand:          session.brand,
    trialStatus:    session.trialStatus,
    role:           session.role,
    membershipTier: session.membershipTier || 'trial',
    streakDays:     session.streakDays     || 0,
    lastActiveDate: session.lastActiveDate || null,
  }));
}

// ─── Role-based redirect — unchanged ─────────────────────────────────────────

function resolveRedirect(role: string, redirectTo?: string): string {
  if (redirectTo) return redirectTo;
  if (role === 'super') return '/dashboard/antcpu';
  if (role === 'admin') return '/dashboard/users';
  return '/dashboard/user';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VaultModal({ open, onClose, onSuccess, redirectTo, defaultMode = 'signin' }: Props) {
  const [mode,      setMode]      = useState<VaultMode>(defaultMode);
  const [step,      setStep]      = useState<VaultStep>('email');
  const [email,     setEmail]     = useState('');
  const [pin,       setPin]       = useState('');
  const [name,      setName]      = useState('');
  const [brand,     setBrand]     = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [vaultMsg,  setVaultMsg]  = useState<string>(VAULT_MSGS[0]);
  const [hasPinSet, setHasPinSet] = useState(false);
  const [isSuper,   setIsSuper]   = useState(false);
  const [showPin,   setShowPin]   = useState(false);

  // Reset on open/close or defaultMode change
  useEffect(() => {
    if (!open) {
      setMode(defaultMode);
      setStep('email');
      setEmail('');
      setPin('');
      setName('');
      setBrand('');
      setError('');
      setIsSuper(false);
      setHasPinSet(false);
      setShowPin(false);
      setVaultMsg(VAULT_MSGS[0]);
    }
  }, [open, defaultMode]);

  // ─── SIGNIN: Step 1 — Email lookup ───────────────────────────────────────

  async function handleEmail() {
    const norm = email.trim().toLowerCase();
    if (!norm) return;
    setLoading(true);
    setError('');
    setVaultMsg(VAULT_MSGS[1]);

    try {
      const SUPER_EMAIL = process.env.NEXT_PUBLIC_SUPER_EMAIL || '';

      if (SUPER_EMAIL && norm === SUPER_EMAIL) {
        setIsSuper(true);
        setHasPinSet(true);
        setStep('pin');
        setVaultMsg('Admin access detected. Enter your PIN.');
        setLoading(false);
        return;
      }

      const res  = await fetch('/api/user-auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: norm, pin: '__check__' }),
      });
      const data = await res.json();

      if (data.error === 'User not found') {
        // ── Auto-switch to signup if user not found ───────────────────────
        // Instead of dead-ending with an error, offer to create an account.
        setMode('signup');
        setStep('signup-details');
        setVaultMsg('New here? Fill in your details to join the Arena.');
        setLoading(false);
        return;
      }

      const pinExists = data.error !== 'No PIN set';
      setHasPinSet(pinExists);
      setStep('pin');
      setVaultMsg(pinExists
        ? 'Identity confirmed. Enter your PIN.'
        : 'Identity confirmed. Securing your session.'
      );
    } catch {
      setError('Vault connection failed. Try again.');
    }
    setLoading(false);
  }

  // ─── SIGNUP: Create account then sign in ─────────────────────────────────
  // Calls /api/signup (or /api/user-auth create path) then falls through
  // to the normal session/set flow. No separate redirect — same success state.

  async function handleSignup() {
    const norm = email.trim().toLowerCase();
    if (!norm || !name.trim()) { setError('Name and email required.'); return; }
    setLoading(true);
    setError('');
    setVaultMsg('Creating your Arena account...');

    try {
      const res  = await fetch('/api/signup', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email: norm,
          name:  name.trim(),
          brand: brand.trim() || name.trim(),
        }),
      });
      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || 'Signup failed. Try again.');
        setLoading(false);
        return;
      }

      // Account created — now complete session
      const session: VaultUser = {
        email:       norm,
        name:        name.trim(),
        brand:       brand.trim() || name.trim(),
        trialStatus: 'trial',
        role:        'user',
      };

      await completeSession(session);

    } catch {
      setError('Vault error. Try again.');
    }
    setLoading(false);
  }

  // ─── SIGNIN: Step 2 — PIN verify ─────────────────────────────────────────

  async function handlePin() {
    const norm = email.trim().toLowerCase();
    setLoading(true);
    setError('');
    setVaultMsg(VAULT_MSGS[2]);

    try {
      let session: VaultUser;

      if (isSuper || hasPinSet) {
        const res = await fetch('/api/user-auth', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email: norm, pin }),
        });

        if (!res.ok) {
          setError('Invalid PIN. Access denied.');
          setLoading(false);
          return;
        }

        setVaultMsg(VAULT_MSGS[3]);
        const { user } = await res.json();

        session = {
          email:       user.email,
          name:        user.name        || '',
          brand:       user.brand       || '',
          trialStatus: user.trialStatus || 'team',
          role:        isSuper ? 'super' : (user.role || 'user'),
        };

      } else {
        const res  = await fetch('/api/user-auth', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email: norm, pin: '__check__' }),
        });
        const data = await res.json();

        session = {
          email:       norm,
          name:        data.user?.name        || '',
          brand:       data.user?.brand       || '',
          trialStatus: data.user?.trialStatus || 'trial',
          role:        data.user?.role        || 'user',
        };
      }

      await completeSession(session);

    } catch {
      setError('Vault error. Try again.');
    }
    setLoading(false);
  }

  // ─── Shared session completion ────────────────────────────────────────────
  // Used by both signin and signup paths — identical from here on.

  async function completeSession(session: VaultUser) {
    setVaultMsg(VAULT_MSGS[4]);

    let enriched = {
      membershipTier: 'trial',
      streakDays:     0,
      lastActiveDate: null as string | null,
      trialStatus:    session.trialStatus,
    };

    try {
      const syncRes  = await fetch('/api/session/set', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(session),
      });
      const syncData = await syncRes.json();
      if (syncData.ok) {
        enriched = {
          membershipTier: syncData.membershipTier  || 'trial',
          streakDays:     syncData.streakDays      || 0,
          lastActiveDate: syncData.lastActiveDate  || null,
          trialStatus:    syncData.trialStatus     || session.trialStatus,
        };
        if (syncData.preferredLocale) setStoredLocale(syncData.preferredLocale);
      }
    } catch {}

    writeSession({ ...session, ...enriched });
    setStep('success');

    setTimeout(() => {
      onSuccess(session);
      window.location.href = resolveRedirect(session.role, redirectTo);
    }, 1200);
  }

  if (!open) return null;

  // ─── Styles ───────────────────────────────────────────────────────────────

  const inputStyle = {
    width: '100%', background: '#111', border: '1px solid #222',
    borderRadius: '10px', padding: '0.85rem 1rem', color: '#fff',
    fontSize: '0.95rem', boxSizing: 'border-box' as const,
    outline: 'none', fontFamily: 'inherit', marginBottom: '0.75rem',
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    width: '100%', padding: '0.9rem', borderRadius: '10px', border: 'none',
    background: active ? '#f0883e' : '#1a1a1a',
    color:      active ? '#000'    : '#555',
    fontWeight: 700, fontSize: '0.95rem',
    cursor:     active ? 'pointer' : 'not-allowed',
    transition: 'background 0.2s', marginTop: '0.5rem',
  });

  const modeLabel = mode === 'signup' ? 'JOIN THE ARENA' : 'VAULT';

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#0a0a0a', border: '1px solid #1a1a1a',
          borderRadius: '20px', padding: '2rem',
          width: '100%', maxWidth: '360px',
          boxSizing: 'border-box', boxShadow: '0 0 60px rgba(0,0,0,0.8)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>
            {mode === 'signup' ? '⚡' : '🔒'}
          </div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', letterSpacing: '0.1em' }}>
            {modeLabel}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#333', marginTop: '0.2rem', letterSpacing: '0.08em' }}>
            Secured by ANTCPU
          </div>
        </div>

        {/* Mode toggle — only on email step */}
        {step === 'email' && (
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem' }}>
            {(['signin', 'signup'] as VaultMode[]).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); }}
                style={{
                  flex: 1, padding: '0.45rem', borderRadius: '8px', border: 'none',
                  background: mode === m ? '#f0883e' : '#111',
                  color:      mode === m ? '#000'    : '#555',
                  fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer',
                  transition: 'all 0.15s',
                }}>
                {m === 'signin' ? 'Sign In' : 'Join Arena'}
              </button>
            ))}
          </div>
        )}

        {/* Status message */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px',
          padding: '0.6rem 0.9rem', marginBottom: '1.25rem',
        }}>
          <span style={{ color: '#2E7D32', fontSize: '0.6rem' }}>●</span>
          <span style={{ fontSize: '0.78rem', color: '#555' }}>{vaultMsg}</span>
        </div>

        {/* ── Step: email (both modes) ── */}
        {step === 'email' && (
          <>
            <input
              type="email" inputMode="email" autoComplete="email" autoFocus
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (mode === 'signin' ? handleEmail() : setStep('signup-details'))}
              style={inputStyle}
            />
            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                {error}
              </div>
            )}
            <button
              onClick={() => mode === 'signin' ? handleEmail() : setStep('signup-details')}
              disabled={loading || !email.trim()}
              style={btnStyle(!loading && !!email.trim())}>
              {loading ? 'Scanning...' : mode === 'signin' ? 'Continue →' : 'Next →'}
            </button>
            <button onClick={onClose} style={{ width: '100%', background: 'none', border: 'none', color: '#333', fontSize: '0.75rem', marginTop: '0.75rem', cursor: 'pointer', padding: '0.25rem' }}>
              Cancel
            </button>
          </>
        )}

        {/* ── Step: signup-details ── */}
        {step === 'signup-details' && (
          <>
            <div style={{ fontSize: '0.78rem', color: '#555', background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </div>
            <input
              type="text" autoFocus
              placeholder="Your name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignup()}
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Brand or shop name (optional)"
              value={brand}
              onChange={e => setBrand(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignup()}
              style={inputStyle}
            />
            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                {error}
              </div>
            )}
            <button onClick={handleSignup} disabled={loading || !name.trim()} style={btnStyle(!loading && !!name.trim())}>
              {loading ? 'Creating account...' : 'Join the Arena →'}
            </button>
            <button onClick={() => { setStep('email'); setError(''); }} style={{ width: '100%', background: 'none', border: 'none', color: '#333', fontSize: '0.75rem', marginTop: '0.5rem', cursor: 'pointer', padding: '0.25rem' }}>
              ← Back
            </button>
          </>
        )}

        {/* ── Step: pin ── */}
        {step === 'pin' && (
          <>
            <div style={{ fontSize: '0.78rem', color: '#555', background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {email}
            </div>

            {hasPinSet ? (
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric" autoFocus
                  placeholder="••••••"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePin()}
                  style={{ ...inputStyle, marginBottom: 0, padding: '0.85rem 3rem 0.85rem 1rem', letterSpacing: '0.25em', fontSize: '1.2rem', textAlign: 'center' }}
                />
                <button
                  onClick={() => setShowPin(v => !v)} tabIndex={-1}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#444', fontSize: '1rem', padding: '0.25rem', lineHeight: 1 }}
                >
                  {showPin ? '🙈' : '👁️'}
                </button>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#555', background: '#111', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem', lineHeight: 1.5 }}>
                No PIN set — Vault will secure your session automatically.
              </div>
            )}

            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                {error}
              </div>
            )}

            <button onClick={handlePin} disabled={loading || (hasPinSet && !pin.trim())} style={btnStyle(!loading && (!hasPinSet || !!pin.trim()))}>
              {loading ? 'Verifying...' : 'Unlock →'}
            </button>
            <button onClick={() => { setStep('email'); setPin(''); setError(''); setShowPin(false); }} style={{ width: '100%', background: 'none', border: 'none', color: '#333', fontSize: '0.75rem', marginTop: '0.5rem', cursor: 'pointer', padding: '0.25rem' }}>
              ← Back
            </button>
          </>
        )}

        {/* ── Step: success ── */}
        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>
              {mode === 'signup' ? 'Welcome to the Arena!' : 'Access Granted'}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#555' }}>Redirecting...</div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.62rem', color: '#222', letterSpacing: '0.1em' }}>
          VAULT · ANTCPU SECURITY LAYER
        </div>
      </div>
    </div>
  );
}
