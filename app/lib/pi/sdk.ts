// app/lib/pi/sdk.ts
// Loads Pi SDK, authenticates user, returns token + identity
// Works inside Pi Browser and standard browsers (sandbox fallback)

export type PiAuthResult = {
  accessToken: string;
  uid: string;
  username: string;
};

// Dynamically load the Pi SDK script if not already present
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

export async function piAuthenticate(): Promise<PiAuthResult> {
  await loadPiSDK();

  const Pi = (window as any).Pi;

  // Init — sandbox false = production
  Pi.init({ version: '2.0', sandbox: false });

  return new Promise((resolve, reject) => {
    Pi.authenticate(
      ['username', 'payments', 'wallet_address'],
      // onIncompletePaymentFound — required callback
      // We don't process payments yet — log and continue
      (payment: any) => {
        console.warn('[Pi] Incomplete payment found:', payment.identifier);
      }
    ).then((auth: any) => {
      resolve({
        accessToken: auth.accessToken,
        uid: auth.user.uid,
        username: auth.user.username,
      });
    }).catch((err: any) => {
      reject(err);
    });
  });
}
