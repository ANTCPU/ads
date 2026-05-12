// Sets arena_session cookie on login, clears on logout

export function setSessionCookie(user: { email: string; name: string; brand: string; trialStatus: string }) {
  const val = encodeURIComponent(JSON.stringify(user));
  // 90 days for team, 3 days for trial
  const days = user.trialStatus === 'team' ? 90 : 3;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `arena_session=${val}; path=/; expires=${expires}; SameSite=Lax`;
}

export function clearSessionCookie() {
  document.cookie = 'arena_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
}
