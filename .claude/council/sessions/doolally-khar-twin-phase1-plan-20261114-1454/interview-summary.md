# Interview Summary: Doolally Khar digital twin — Phase 1 plan

## Core Intent
Produce the Phase 1 plan of docs/claude-code-prompt.md: (a) layout facts vs gaps, (b) folder/module structure, (c) parameter registry plan. No app code, no commits, until the user says "go".

## Key Decisions Made
- Bar/tap counter position unknown: stays ASSUMED LAYOUT.
- Waiting parties stand on the pavement outside the gate (OBSERVED, user; consistent with Street View D8).
- Total seats: at most about 75 (OBSERVED, user recall, low confidence). Per-zone split unknown.
- Photo 1 = outdoor/awning zone (high pine tables, stools, host stand by gate); photo 2 = large inside hall (glass walls, board-game shelf, standard-height tables). Confirmed by user.
- Gemini files are reference only; none of their numbers are reused.

## Open Questions for Deliberation
- Table model: photos show loose 2- and 4-seat tables, not 8-seat communal benches. How should seating/capacity be parameterised under a 0-75 total?
- How to make patience, arrival rate and dwell honest with n=1 Khar walk-in observation.
- Sim worker to renderer contract (one event log for agents and KPIs).
- Where scenario B lounge and scenario C counter sit when neither exists in the sketch and the queue is on a public pavement.
- params.json schema, tag enforcement, and how "no hardcoded KPI" is tested.

## Perspective Relevance Scores
| Perspective | Score (0-5) | Rationale |
|---|---|---|
| Architect | 5 | Module boundaries, worker/render contract |
| Alchemist | 5 | DES, censoring, CIs, calibration |
| Skeptic | 5 | Evidence tags, invented-fact risk |
| Artisan | 4 | Studio-grade 3D from two photos |
| Craftsman | 4 | Tests, no-hardcode enforcement |
| Tuner | 3 | Draw-call/frame budgets shape structure |
| Advocate | 3 | HUD, accessibility (mostly Phase 5) |
| Others | 0-2 | Not relevant to Phase 1 |
