# Council brief (shared by all agents)

## Project context
- Workspace: E:/Github/Doolaly Twin (git repo, one initial revision; no app code, no package.json yet).
- Read first: CLAUDE.md, docs/claude-code-prompt.md (the full spec), reference/layout/layout.md + layout-sketch.png, reference/evidence-register.md, reference/visit-log.csv, reference/CREDITS.md, docs/gemini-audit.md, docs/open-questions.md.
- Visual reference only (never published): reference/photos/*, reference/street-view/*.
- reference/gemini/* and the doolally_* files in the repo root are the OLD Gemini prototype: learning material only. Do not build on, edit, or reuse their numbers or "verified" labels.
- Planned stack (from the brief): Vite + TypeScript + three + postprocessing, plain DOM HUD, simulation in a Web Worker (seeded mulberry32 DES), Vitest, GitHub Pages.

## The idea (scope of THIS session)
Phase 1 of the brief only: produce the plan. Three outputs:
(a) layout facts we have vs gaps,
(b) proposed folder/module structure,
(c) parameter registry plan (src/data/params.json: { value, unit, tag, source, confidence, note }).
NO app code is written in this session. Nothing is recorded to git history, pushed, or opened as a PR.

## Hard rules
- No hardcoded KPIs: every number from the simulation event log or params.json.
- Tag every figure VERIFIED / OBSERVED / ASSUMED / SIMULATED. Unknown = "Insufficient evidence".
- Layout only from reference/layout; every missing fact gets an ASSUMED LAYOUT marker and a docs/open-questions.md entry.
- Floor level is not established; do not assume rooftop or 6th floor.
- Scenarios B (small-pour wait lounge) and C (takeaway counter) are licence-UNCONFIRMED and gated.
- Report walk-away %, all-arrival wait with censoring, median, p90, utilisation, revenues, lost parties, 95% CIs from N >= 200 seeded replications; paired seeds across scenarios.
- No invented facts: no made-up prices, capacities, laws, studies.

## Interview answers (user, 2026-11-14)
- Bar/tap counter position: unknown, keep ASSUMED LAYOUT.
- Waiting walk-ins stand on the pavement outside the gate (OBSERVED, user).
- Total seats across the three zones: "0-75" (user recall, low confidence; treat about 75 as an upper bound). Per-zone split unknown.
- Photo 1 = left open-air/awning zone; photo 2 = large inside hall. Confirmed by user.

## Conductor's reading notes (check them yourself if relevant)
- Sketch: entrance bottom-left; tall narrow outdoor seating on the left; large inside seating top-right; smaller inside seating bottom-right; steps (yellow) between entrance side and inside hall; pink passage top-left to bathroom/kitchen. No scale, no seat counts, no bar, no takeaway counter, no waiting area.
- Photo 1 (outdoor): white tent/awning roof, wood plank floor, bar-height pine tables (4-seat on one side, 2-seat along the wall) with stools, chalkboard, globe lamps, plants, a host stand/podium near a white gate, a glass window into an inner room.
- Photo 2 (inside hall): glass walls, standard-height pine tables with cushioned chairs, pendant lamps, ceiling fans, corner bookshelf labelled library / board games, projector.
- Photos show loose 2- and 4-seat tables, NOT the 8-seat communal benches the Gemini engine assumed.
- Street View (Feb 2026, daytime, one frame): street-level white gate, scalloped awning, signage, crowd on pavement; seating visible behind a low white wall under the awning.
- Visit log: only one Khar walk-in observation (party 6-7, about 30 min wait, seated) and one booked visit; three Chembur recalls (60-120 min). No dates.
- Gemini engine issues (docs/gemini-audit.md): unsourced patience ranges, seated-only wait (survivorship bias), hardcoded HUD KPIs, unverified legal/capacity claims.

## Output rules for every agent
- Read your persona file and the skill files named in your prompt, then the repo docs above.
- Write ONLY the one markdown file named in your prompt. Do not create or edit any other file. Do not run any git command that writes history.
- Be concrete and brief (aim for under 700 words plus any skill appendix). No invented venue facts; label every assumption.
- Your final reply to the conductor: a summary of at most 120 words.
