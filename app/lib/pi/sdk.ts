// app/lib/pi/sdk.ts
export type PiAuthResult = {
  accessToken: string;
  uid: string;
  username: string;
};

function loadPiSDK(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject('SSR');
    if ((window as any).Pi) return resolve();
    const script = document.createElement('script');
    script.src = 'https://sdk.minepi.com/pi-sdk.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject('Pi SDK failed to load');
    document.head.appendChild(script);
  });
}

export function isInsidePiBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    navigator.userAgent.includes('PiBrowser') ||
    !!(window as any).Pi ||
    window.location.hostname.endsWith('.pi')
  );
}

export async function piAuthenticate(): Promise<PiAuthResult> {
  await loadPiSDK();
  const Pi = (window as any).Pi;
  Pi.init({ version: '2.0', sandbox: false });

  return new Promise((resolve, reject) => {
    // 8 second timeout — prevents infinite "Connecting" on non-Pi browsers
    const timeout = setTimeout(() => {
      reject(new Error('Pi auth timeout — open in Pi Browser to sign in with Pi'));
    }, 8000);

    Pi.authenticate(
      ['username', 'payments', 'wallet_address'],
      (payment: any) => {
        console.warn('[Pi] Incomplete payment found:', payment.identifier);
      }
    ).then((auth: any) => {
      clearTimeout(timeout);
      resolve({
        accessToken: auth.accessToken,
        uid: auth.user.uid,
        username: auth.user.username,
      });
    }).catch((err: any) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}
