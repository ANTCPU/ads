# ANTCPU ADS — Community Flag System
> Phase 3 · Build trigger: 50+ active ads in the Arena

---

## Role Structure

| Role  | Who                  | Permissions                              |
|-------|----------------------|------------------------------------------|
| Admin | antcpu@gmail.com     | Full control — approve, reject, manage   |
| Mod   | Assigned by admin    | Flag button visible · anonymous to users |
| User  | Everyone else        | Browse, create ads, refer others         |

---

## Flag Flow

1. **Mod** sees inappropriate ad → hits 🚩 Flag button
2. **System** emails admin + ad creator with warning
3. **Ad** enters `flagged` status — still visible, marked with warning
4. **Ad creator** has 72 hours to respond or fix
5. **No response** → community vote opens to all active users
6. **Vote passes** (threshold TBD) → ad deleted automatically
7. **Vote fails** → ad restored to `active`

---

## Rules

- Flag system is for **inappropriate content only**
- NOT a performance tool — ads sort themselves by points naturally
- Mods are anonymous to other users
- Admin sees full flagged queue in /dashboard
- Mods see flagged queue + flag button on arena cards
- Users see nothing — clean experience

---

## What Needs Building (Phase 3)

- [ ] `ad_signups.role` column — admin / mod / user
- [ ] `ads.flagged_count` column
- [ ] `ads` status — add `flagged` to enum
- [ ] Flag button on arena cards (mod role only)
- [ ] Flagged queue in /dashboard admin view
- [ ] Email notification on flag → Resend → admin + creator
- [ ] 72hr warning timer on flagged ads
- [ ] Community vote UI — simple yes/no per active user
- [ ] Auto-delete on vote pass
- [ ] Mod assignment in /dashboard/users admin panel

---

## Trigger Condition

> Do not build until 50+ active ads exist in the Arena.
> Community self-governance only works with real volume.

---

## Notes

- Mods get a subtle badge in ArenaNav (visible only to them)
- Test account (test@antcpu.com) will be used to simulate mod flow
- Phase 2 copilot (test account) guides new brands onboarding
- Phase 3 community flag builds on top of Phase 2 user base

---

*Last updated: 2026-05-11 · antcpu workflow architect*
