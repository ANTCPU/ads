'use client';
import { useState, useEffect } from 'react';

const SUPER_EMAIL = process.env.NEXT_PUBLIC_SUPER_EMAIL || '';

type VaultStep = 'email' | 'pin' | 'success' | 'error';

type VaultUser = {
  email:       string;
  name:        string;
  brand:       string;
  trialStatus: string;
  role?:       string;
};


type Props = {
  open: boolean;
  onClose: () => void;
  onSuccess: (user: VaultUser) => void;
  redirectTo?: string;
};

export default function VaultModal({ open, onClose, onSuccess, redirectTo }: Props) {
  const [step, setStep] = useState<VaultStep>('email');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [vaultMsg, setVaultMsg] = useState('Vault is standing by.');
  const [hasPinSet, setHasPinSet] = useState(false);
  const [showPin, setShowPin] = useState(false);

  useEffect(() => {
    if (!open) { setStep('email'); setEmail(''); setPin(''); setError(''); }
  }, [open]);

  const VAULT_MSGS = [
    'Vault is scanning your identity.',
    'Vault is verifying credentials.',
    'Vault is checking the ledger.',
    'Vault is securing your session.',
  ];

  async function handleEmail() {
    const norm = email.trim().toLowerCase();
    if (!norm) return;
    setLoading(true);
    setError('');
    setVaultMsg(VAULT_MSGS[0]);

    try {
     if (SUPER_EMAIL && norm === SUPER_EMAIL) {
        setHasPinSet(true);
        setStep('pin');
        setVaultMsg('Admin access detected. Enter your PIN.');
        setLoading(false);
        return;
      }

      // Check if user exists + has PIN
      const res = await fetch('/api/user-auth', {
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

      setHasPinSet(data.error !== 'No PIN set');
      setStep('pin');
      setVaultMsg(data.error !== 'No PIN set'
        ? 'Identity confirmed. Enter your PIN.'
        : 'Identity confirmed. Securing your session.');
    } catch {
      setError('Vault connection failed. Try again.');
    }
    setLoading(false);
  }

  async function handlePin() {
  const norm = email.trim().toLowerCase();
  setLoading(true);
  setError('');
  setVaultMsg(VAULT_MSGS[1]);

  try {
    let session: VaultUser & { role?: string };

    if (SUPER_EMAIL && norm === SUPER_EMAIL) {
      const res = await fetch('/api/admin-auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ pin }),
      });
      if (!res.ok) { setError('Invalid PIN. Access denied.'); setLoading(false); return; }
      session = { email: norm, name: 'Antony Ciccone', brand: 'ANTCPU', trialStatus: 'team', role: 'super' };

    } else if (hasPinSet) {
      const res = await fetch('/api/user-auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: norm, pin }),
      });
      if (!res.ok) { setError('Invalid PIN. Access denied.'); setLoading(false); return; }
      const { user } = await res.json();
      session = user;

    } else {
      const res = await fetch('/api/user-auth', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: norm, pin: '__check__' }),
      });
      const data = await res.json();
      session = { email: norm, name: data.name || '', brand: data.brand || '', trialStatus: data.status || 'trial' };
    }

    // — write session to cookie + localStorage
    const encoded = encodeURIComponent(JSON.stringify(session));
    document.cookie = `arena_session=${encoded}; path=/; expires=${new Date(Date.now() + 90 * 864e5).toUTCString()}; SameSite=Lax`;
    localStorage.setItem('arena_user', JSON.stringify(session));

    setVaultMsg('Session secured. Welcome back.');
    setStep('success');
    setTimeout(() => {
      onSuccess(session as VaultUser);
      const isSuper = SUPER_EMAIL && norm === SUPER_EMAIL;
      const dest = redirectTo || (isSuper ? '/dashboard/admin' : '/dashboard/user');
      window.location.href = dest;
    }, 1200);

  } catch {
    setError('Vault error. Try again.');
  }
  setLoading(false);
}


  if (!open) return null;

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(6px)',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#0a0a0a', border: '1px solid #1a1a1a',
        borderRadius: '20px', padding: '2rem', width: '360px',
        maxWidth: '92vw', boxShadow: '0 0 60px rgba(0,0,0,0.8)',
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔒</div>
          <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#fff', letterSpacing: '0.05em' }}>VAULT</div>
          <div style={{ fontSize: '0.7rem', color: '#333', letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '0.2rem' }}>Secured by ANTCPU</div>
        </div>

        {/* Vault status message */}
        <div style={{
          background: '#0f0f0f', border: '1px solid #1a1a1a', borderRadius: '8px',
          padding: '0.6rem 1rem', marginBottom: '1.5rem',
          fontSize: '0.72rem', color: '#444', fontFamily: 'monospace',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          <span style={{ color: '#0070f3', fontSize: '0.6rem' }}>●</span>
          {vaultMsg}
        </div>

        {step === 'email' && (
          <>
            <input
              autoFocus
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleEmail()}
              style={{
                width: '100%', background: '#111', border: '1px solid #222',
                borderRadius: '8px', padding: '0.75rem 1rem', color: '#fff',
                fontSize: '0.9rem', marginBottom: '0.75rem', boxSizing: 'border-box',
                outline: 'none',
              }}
            />
            {error && <div style={{ color: '#ff4444', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{error}</div>}
            <button onClick={handleEmail} disabled={loading || !email.trim()} style={{
              width: '100%', background: '#0070f3', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '0.75rem', fontWeight: 700,
              fontSize: '0.9rem', cursor: 'pointer', opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Scanning...' : 'Continue →'}
            </button>
          </>
        )}

        {step === 'pin' && (
          <>
            <div style={{ fontSize: '0.75rem', color: '#555', marginBottom: '0.75rem' }}>
              {email}
            </div>
            {hasPinSet ? (
              <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                <input
                  autoFocus
                  type={showPin ? 'text' : 'password'}
                  placeholder="Enter PIN"
                  value={pin}
                  onChange={e => setPin(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handlePin()}
                  style={{
                    width: '100%', background: '#111', border: '1px solid #222',
                    borderRadius: '8px', padding: '0.75rem 2.75rem 0.75rem 1rem', color: '#fff',
                    fontSize: '0.9rem', boxSizing: 'border-box', outline: 'none', letterSpacing: '0.2em',
                  }}
                />
                <button
                  onClick={() => setShowPin(v => !v)}
                  style={{
                    position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#444', fontSize: '1rem',
                    padding: '0.25rem', lineHeight: 1,
                  }}
                  tabIndex={-1}
                >
                  {showPin ? '🙈' : '👁️'}
                </button>
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.75rem', padding: '0.75rem', background: '#111', borderRadius: '8px', border: '1px solid #1a1a1a' }}>
                No PIN set — Vault will secure your session automatically.
              </div>
            )}
            {error && <div style={{ color: '#ff4444', fontSize: '0.75rem', marginBottom: '0.75rem' }}>{error}</div>}
            <button onClick={handlePin} disabled={loading || (hasPinSet && !pin.trim())} style={{
              width: '100%', background: '#0070f3', color: '#fff', border: 'none',
              borderRadius: '8px', padding: '0.75rem', fontWeight: 700,
              fontSize: '0.9rem', cursor: 'pointer', opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Verifying...' : 'Unlock →'}
            </button>
            <button onClick={() => { setStep('email'); setPin(''); setError(''); }} style={{
              width: '100%', background: 'none', border: 'none', color: '#333',
              fontSize: '0.75rem', marginTop: '0.5rem', cursor: 'pointer', padding: '0.25rem',
            }}>← Back</button>
          </>
        )}

        {step === 'success' && (
          <div style={{ textAlign: 'center', padding: '1rem 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>✅</div>
            <div style={{ color: '#fff', fontWeight: 700, marginBottom: '0.25rem' }}>Access Granted</div>
            <div style={{ color: '#444', fontSize: '0.75rem' }}>Redirecting...</div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.65rem', color: '#222', letterSpacing: '0.1em' }}>
          VAULT · ANTCPU SECURITY LAYER
        </div>
      </div>
    </div>
  );
}
