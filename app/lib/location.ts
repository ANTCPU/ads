export async function getLocation(): Promise<{
  country: string;
  city: string;
  region: string;
  ip: string;
}> {
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(3000) });
    const d = await res.json();
    return {
      country: d.country_name || '',
      city:    d.city         || '',
      region:  d.region       || '',
      ip:      d.ip           || '',
    };
  } catch {
    return { country: '', city: '', region: '', ip: '' };
  }
}
