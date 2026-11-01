
## Nov 1, 2026 — Nudge + Platform Scan

### Fixed
- nudge/route.ts: accepts intern_id OR email — ops button was silently failing
- health/route.ts: accepts ?cohort= param — panel now cohort-scoped
- office/[handle]/route.ts: doorbell Discord ping on visit, 1h rate limit
- next upgraded 16.4.0 → 16.4.3 — patched 2x RCE + 1x DoS CVEs
- ops/index.html: needsRepair orphan removed, gates_completed null fix, cohort-aware health fetch

### Pending
- [ ] nudge_responded_at column — track challenger return after nudge
- [ ] ops nudge button: auto-select nudge type by progress pct
- [ ] daily Discord digest — email sent/opened/clicked/bounced per cohort
- [ ] verify herald returns november-2026 challengers (not hardcoded october)
- [ ] waitlist signup → immediate Discord ping
- [ ] ops: show nudge status per challenger row
- [ ] ops: october.html review panel (static, baked-in data)
- [ ] ops: AI actions panel split — global not cohort-scoped
- [ ] session ping wired on antcpu.io dashboard pages
- [ ] Hatem + Shairose: confirm welcome email received, send hard_d1 nudge
