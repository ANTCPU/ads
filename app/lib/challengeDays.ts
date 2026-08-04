// https://antcpu-ads.vercel.app/app/lib/challengeDays.ts
// getChallengeDay() — derives from current month, no hardcoded dates

export function getChallengeDay(): number {
  const TZ_OFFSET_MS  = -5 * 60 * 60 * 1000;
  const nowUTC        = new Date();
  const nowEST        = new Date(nowUTC.getTime() + TZ_OFFSET_MS);
  const year          = nowEST.getUTCFullYear();
  const month         = nowEST.getUTCMonth();
  const challengeStart = new Date(Date.UTC(year, month, 1, 5, 0, 0));
  const daysInMonth   = new Date(year, month + 1, 0).getDate();
  const raw           = Math.floor((nowUTC.getTime() - challengeStart.getTime()) / 86400000) + 1;
  return Math.min(Math.max(raw, 0), daysInMonth);
}

export function getChallengeCohort(): string {
  const TZ_OFFSET_MS = -5 * 60 * 60 * 1000;
  const nowEST       = new Date(new Date().getTime() + TZ_OFFSET_MS);
  const months       = ['january','february','march','april','may','june',
                        'july','august','september','october','november','december'];
  return `${months[nowEST.getUTCMonth()]}-${nowEST.getUTCFullYear()}`;
}
