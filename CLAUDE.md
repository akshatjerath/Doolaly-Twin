# Doolally Chembur Digital Twin (EA 2)

Read before doing anything: `docs/claude-code-prompt.md` (full brief), `reference/layout/layout.md`, `reference/evidence-register.md`, `reference/CREDITS.md`.

Hard rules:
- No hardcoded KPIs. Every number comes from the simulation event log or `src/data/params.json`.
- Tag every figure VERIFIED / OBSERVED / ASSUMED / SIMULATED. Unknown = "Insufficient evidence".
- Layout comes only from `reference/layout`. Missing facts get an `ASSUMED LAYOUT` marker and an entry in `docs/open-questions.md`.
- Do not use anything in `reference/street-view` or `reference/photos` in the published site; they are visual reference only.
- `reference/gemini` is learning material only (see `docs/gemini-audit.md`). Do not copy its KPIs or evidence labels.
- Stage only. Do not commit or push until the user says "go".

## Current state (2026-11-14)
**Nothing is committed or pushed without the user's "go". Work is staged only.**

- Built and staged: simulation core with tests, 3D scene from the user's rough floor plan, rigged Kenney characters played back from the event log, scenario switching with licence gate, results / sensitivity / evidence panels. 32 tests pass.
- Decided: interface redesign per `docs/ui-plan.md` (read its "Current state" section first). Theme first, then interaction pass, then presenter tour. Product record is in `PRODUCT.md`.
- Four isolated, optional simulation changes are allowed: the mid-run policy switch, reservations with lateness and no-shows, service-time multipliers, and guest interruptions (smoke or phone step-outs, washroom trips, wrong-order remakes; rates default 0). Each needs a unit test proving that neutral settings reproduce the previous results exactly.
- Next: build step 1 of `docs/ui-plan.md` (design tokens, both themes, measured contrast for every colour pair), then stop and report.
- Run: `npm run dev`, `npm test`, `npm run report`.
