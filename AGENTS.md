# Doolally Khar Digital Twin (EA 2)

Read before doing anything: `docs/claude-code-prompt.md` (full brief), `reference/layout/layout.md`, `reference/evidence-register.md`, `reference/CREDITS.md`.

Hard rules:
- No hardcoded KPIs. Every number comes from the simulation event log or `src/data/params.json`.
- Tag every figure VERIFIED / OBSERVED / ASSUMED / SIMULATED. Unknown = "Insufficient evidence".
- Layout comes only from `reference/layout`. Missing facts get an `ASSUMED LAYOUT` marker and an entry in `docs/open-questions.md`.
- Do not use anything in `reference/street-view` or `reference/photos` in the published site; they are visual reference only.
- `reference/gemini` is learning material only (see `docs/gemini-audit.md`). Do not copy its KPIs or evidence labels.
- Stage and commit in small commits; do not push or open PRs until the user says "go".
