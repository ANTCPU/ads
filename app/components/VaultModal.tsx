'use client';

import { useState, useEffect } from 'react';

// ─── Constants ────────────────────────────────────────────────────────────────

const VAULT_MSGS = [
  'Vault is standing by.',
  'Vault is scanning your identity.',
  'Vault is verifying credentials.',
  'Vault is checking the ledger.',
  'Vault is securing your session.',
] as const;

// ─── Types ────────────────────────────────────────────────────────────────────

type VaultStep = 'email' | 'pin' | 'success';

type VaultUser = {
  email: string;
  name: string;
  brand: string;
  trialStatus: string;
  role: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: VaultUser) => void;
  redirectTo?: string;
};

// ─── Session writer ───────────────────────────────────────────────────────────

function writeSession(session: VaultUser) {
  const encoded = encodeURIComponent(JSON.stringify(session));
  const days = session.role === 'super' || session.trialStatus === 'team' ? 90 : 3;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `arena_session=${encoded}; path=/; expires=${expires}; SameSite=Lax`;
  localStorage.setItem('arena_user', JSON.stringify(session));
}

// ─── Role-based redirect ──────────────────────────────────────────────────────

function resolveRedirect(role: string, redirectTo?: string): string {
  if (redirectTo) return redirectTo;
  if (role === 'super') return '/dashboard/antcpu';
  if (role === 'admin') return '/dashboard/users';
  return '/dashboard/user';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function VaultModal({ open, onClose, onSuccess, redirectTo }: Props) {
  const [step,      setStep]      = useState<VaultStep>('email');
  const [email,     setEmail]     = useState('');
  const [pin,       setPin]       = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [vaultMsg,  setVaultMsg]  = useState<string>(VAULT_MSGS[0]);
  const [hasPinSet, setHasPinSet] = useState(false);
  const [isSuper,   setIsSuper]   = useState(false);
  const [showPin,   setShowPin]   = useState(false);

  useEffect(() => {
    if (!open) {
      setStep('email');
      setEmail('');
      setPin('');
      setError('');
      setIsSuper(false);
      setHasPinSet(false);
      setShowPin(false);
      setVaultMsg(VAULT_MSGS[0]);
    }
  }, [open]);

  // ─── Step 1: Email lookup ─────────────────────────────────────────────────

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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: norm, pin: '__check__' }),
      });
      const data = await res.json();

      if (data.error === 'User not found') {
        setError('No account found. Please sign up first.');
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

  // ─── Step 2: PIN verify ───────────────────────────────────────────────────
  // All three paths now go through /api/user-auth — single route, single
  // source of truth. Super path sends { email, pin } just like regular users.
  // user-auth returns the full user object — no separate DB fetch needed.
  // /api/admin-auth removed — no longer needed, no env var dependency.

  async function handlePin() {
    const norm = email.trim().toLowerCase();
    setLoading(true);
    setError('');
    setVaultMsg(VAULT_MSGS[2]);

    try {
      let session: VaultUser;

      if (isSuper || hasPinSet) {
        // ── Super + regular PIN users — same route, same shape ──────────────
        const res = await fetch('/api/user-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: norm, pin }),
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
          // Force super role for super email — DB role is the fallback
          role: isSuper ? 'super' : (user.role || 'user'),
        };

      } else {
        // ── No PIN set — user-auth already returned profile on __check__ ────
        // Re-fetch cleanly to get full user object
        const res = await fetch('/api/user-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: norm, pin: '__check__' }),
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

      setVaultMsg(VAULT_MSGS[4]);
      writeSession(session);
      setStep('success');

      setTimeout(() => {
        onSuccess(session);
        window.location.href = resolveRedirect(session.role, redirectTo);
      }, 1200);

    } catch {
      setError('Vault error. Try again.');
    }
    setLoading(false);
  }

  if (!open) return null;

  // ─── Styles ───────────────────────────────────────────────────────────────

  const inputStyle = {
    width: '100%', background: '#111', border: '1px solid #222',
    borderRadius: '10px', padding: '0.85rem 1rem', color: '#fff',
    fontSize: '0.95rem', boxSizing: 'border-box' as const,
    outline: 'none', fontFamily: 'inherit',
  };

  const btnStyle = (active: boolean): React.CSSProperties => ({
    width: '100%', padding: '0.9rem', borderRadius: '10px', border: 'none',
    background: active ? '#f0883e' : '#1a1a1a',
    color: active ? '#000' : '#555',
    fontWeight: 700, fontSize: '0.95rem',
    cursor: active ? 'pointer' : 'not-allowed',
    transition: 'background 0.2s', marginTop: '0.5rem',
  });

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
          <div style={{ fontSize: '2rem', marginBottom: '0.4rem' }}>🔒</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', letterSpacing: '0.1em' }}>VAULT</div>
          <div style={{ fontSize: '0.7rem', color: '#333', marginTop: '0.2rem', letterSpacing: '0.08em' }}>Secured by ANTCPU</div>
        </div>

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
              onKeyDown={e => e.key === 'Enter' && handleEmail()}
              style={{ ...inputStyle, marginBottom: '0.75rem' }}
            />
            {error && (
              <div style={{ color: '#ef4444', fontSize: '0.78rem', marginBottom: '0.75rem' }}>
                {error}
              </div>
            )}
            <button onClick={handleEmail} disabled={loading || !email.trim()} style={btnStyle(!loading && !!email.trim())}>
              {loading ? 'Scanning...' : 'Continue →'}
            </button>
            <button onClick={onClose} style={{ width: '100%', background: 'none', border: 'none', color: '#333', fontSize: '0.75rem', marginTop: '0.75rem', cursor: 'pointer', padding: '0.25rem' }}>
              Cancel
            </button>
          </>
        )}

        {/* ── Step: pin ── */}
        {step === 'pin' && (
          <>
            <div style={{
              fontSize: '0.78rem', color: '#555', background: '#111',
              border: '1px solid #1a1a1a', borderRadius: '8px',
              padding: '0.5rem 0.75rem', marginBottom: '1rem',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
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
                  style={{ ...inputStyle, padding: '0.85rem 3rem 0.85rem 1rem', letterSpacing: '0.25em', fontSize: '1.2rem', textAlign: 'center' }}
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
            <div style={{ fontWeight: 700, color: '#fff', marginBottom: '0.4rem' }}>Access Granted</div>
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
