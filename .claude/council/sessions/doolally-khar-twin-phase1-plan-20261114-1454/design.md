# Design Document: Doolally Khar digital twin — Phase 1 plan

Session: doolally-khar-twin-phase1-plan-20261114-1454 · Council: Architect, Alchemist, Artisan, Skeptic, Craftsman, Tuner, Advocate · 3 rounds · Status: awaiting user "go". No app code written, nothing committed.

## Overview
The twin is built fresh (Vite + TypeScript + three + postprocessing, plain DOM HUD, no React, no schema library). A pure simulation core emits one append-only event log; every KPI is a reducer over that log and every 3D person is a playback cursor over the same log. Almost every model input is ASSUMED, so the plan's main job is to keep that visible: ranged parameters, a parameter-sweep band next to every Monte Carlo interval, a permanent "assumed" treatment in the scene, and permanent "hypothetical" marking on the licence-dependent scenarios.

## (a) Layout: facts vs gaps

| Element | Established (source) | Drawn as ASSUMED LAYOUT | Omitted until confirmed |
|---|---|---|---|
| Entrance / gate | Bottom-left (sketch); white gate at street level (Street View frame D8, reference only) | Gate width, host podium position | Signage, logo, facade detail |
| Pavement queue | Walk-ins wait on the pavement outside the gate (user answer) | Pavement depth; labelled "public pavement, not venue space" | Any queue capacity |
| Outdoor seating (left) | Tall narrow zone (sketch); tent roof, plank floor, bar-height pine 2- and 4-seat tables with stools (photo 1, user-confirmed match) | Dimensions, table count, spacing, roof height | Communal benches, string lights |
| Steps | Between entrance side and inside hall (sketch, user) | Up or down, rise, width | — |
| Large inside hall (top-right) | Zone (sketch); glass walls, pendant lamps, fans, standard-height pine tables with cushioned chairs, board-game bookshelf (photo 2, user-confirmed match) | Dimensions, table count and mix, shelf position | Projector |
| Lower-right inside room | Exists, inside (sketch, user) | Entire interior | — |
| Passage (top-left) | Towards bathroom/kitchen (sketch; user unsure which side) | Opening only | Room interiors |
| Bar / tap counter | Nothing (user: unknown) | Position and length, hatched | Brew tanks, tap detail |
| Takeaway counter | Nothing | Shown only as a "proposed" ghost when scenario C is on | In base scene |
| Wait lounge | Nothing | Shown only as a "proposed" ghost when scenario B is on | In base scene |
| Scale | Proportions only (sketch pixels) | One ASSUMED metres-per-pixel parameter; metres shown only in the overlay | Dimensions in default view |
| Seats | Upper bound of about 75 in total (user recall, low confidence) | Per-zone tables and seats, ranged | Any exact seat count |
| Ceiling heights | Nothing | All | — |
| Floor level | Not established | — | Any rooftop/storey cue |

Brief vs references: the graphics brief asks for communal benches, brew tanks and string lights; neither photo shows them. They are left out until the user confirms.

## (b) Folder / module structure

```
src/
  main.ts
  data/    params.json  layout.json  params.ts (typed loader + hand-written validator)
           layout.ts  tags.ts (tag names, colours, glyphs; shared by HUD and scene)
  sim/     rng.ts  events.ts  engine.ts  scenarios.ts  kpi.ts  stats.ts
           replicate.ts  calibrate.ts  protocol.ts  worker.ts  client.ts
  agents/  playback.ts  paths.ts  crowd.ts
  scene/   renderer.ts  room.ts  materials.ts  props.ts  lighting.ts  post.ts
           quality.ts  quality-tiers.json  frame-monitor.ts  camera.ts
           markers.ts  hotspots.ts
  hud/     figure.ts  kpiPanel.ts  scenarioSwitch.ts  timeline.ts  compare.ts
           sensitivity.ts  evidencePanel.ts  presenter.ts
tests/     data/  sim/  agents/  e2e/smoke.spec.ts
scripts/   check-dist.mjs
docs/      method.md  open-questions.md  performance.md  gemini-audit.md
ASSETS.md  README.md  .github/workflows/pages.yml
```

Rules: `src/sim` imports no three and no DOM. One worker module; replication batches run in chunks and yield between chunks so a new animated run or a cancel is handled promptly. The animated night is replication 0 of the batch; its full event log is sent once and played back. Same seeds across scenarios, separate random streams per process (arrivals, party size, patience, dwell). The worker refuses scenarios B and C unless "assume licence permits" is set. No results cache and no second worker until a measurement asks for one.

## (c) Parameter registry

Entry: `{ value, unit, tag, source, confidence, note }` (the brief's six) plus `label`, `range {min, max, step}`, `candidates[]`, `gate ("B"|"C")`.

Rules enforced by the validator and a test:
- tag is VERIFIED, OBSERVED or ASSUMED for inputs; SIMULATED only for run settings and outputs.
- VERIFIED/OBSERVED `source` must be a register row id, a visit-log row, `reference/layout/*` or the dated user interview. Photos, Street View and Gemini paths are rejected.
- ASSUMED requires `range` and a slider. `value: null` is allowed and renders "Insufficient evidence".
- A conflict lists all `candidates` and never a single silent pick.
- Scenario B and C inputs carry `gate`.
- Outputs carry their weakest input basis, e.g. "SIMULATED (basis: ASSUMED)".

| id | group | tag | source | slider |
|---|---|---|---|---|
| close_time | hours | VERIFIED | D5 | no |
| sim_window | hours | ASSUMED | none | yes |
| walkin_arrival_profile | demand | ASSUMED | none | yes |
| booked_share | demand | ASSUMED | D5 (existence only) | yes |
| party_size_mix | demand | ASSUMED | none | yes |
| seat_cap_recall (bound, value null) | capacity | OBSERVED | user interview | no |
| total_seats | capacity | ASSUMED | none | yes |
| zone_seat_split | capacity | ASSUMED | none | yes |
| table_size_set | capacity | OBSERVED (style note) | user interview | no |
| table_counts | capacity | ASSUMED | none | yes |
| allow_table_join, table_join_time | seating | ASSUMED / OBSERVED n=1 | visit-log row 2 | yes |
| balk_fn | behaviour | ASSUMED | none | yes |
| patience_dist | behaviour | ASSUMED | visit-log row 1 (sanity only) | yes |
| dwell_dist | behaviour | ASSUMED | A1 (direction only) | yes |
| A_balk_mult, A_patience_mult, A_quote_format | scenario A | ASSUMED | A2, A3 (direction only) | yes |
| B_lounge_capacity, B_lounge_conversion, B_lounge_patience_mult | B (gated) | ASSUMED | R8, E5 (analogue) | yes |
| B_pour_spend | B (gated) | ASSUMED, null | none | user entry |
| C_takeaway_share | C (gated) | ASSUMED | D3 | yes |
| C_price_per_litre | C (gated) | ASSUMED | D1, E2 (historical / analogue) | yes |
| C_litres_per_order, C_service_time | C (gated) | ASSUMED | none / E3 (analogue) | yes |
| dinein_spend_per_two | revenue | ASSUMED, conflict | D5, D6 | yes |
| layout_metres_per_px | layout | ASSUMED | none | yes |
| replications_N (>= 200), base_seed | run | SIMULATED | none | yes |

All defaults are set in Phase 2. The papers A1-A3 constrain only the direction of an effect (range bounds), never its size.

## Risk Assessment (guards)
1. Source allowlist on params (validator + test).
2. Build scan: nothing from `reference/` and none of the old Gemini figures in `dist/` (`check-dist.mjs`).
3. HUD accepts only a `Figure` (value + tag, or "insufficient"); a smoke test checks every on-screen figure has a tag.
4. Outputs tagged with their basis.
5. Monte Carlo interval labelled "sampling noise only", shown with the parameter-sweep band.
6. "Hypothetical: licence unconfirmed" stripe on every B/C result, including presenter mode and screenshots.
7. "Layout partly assumed" badge and "schematic, not to scale" mark in every capture.
8. Seats drawn in the scene equal seats in the simulation, and total is at most the recalled bound.
9. The visit log is a consistency check; the word "calibrated" is not used while Khar has one walk-in row.
10. The pavement queue is marked public space, outside the gate line.

## Quality Strategy
One check per hard rule, added in the phase that creates the thing guarded: determinism (animated run equals replication 0), conservation, censoring fixture, known-answer queue check, statistics (rejects N < 200), paired seeds, params, licence gating (Phase 2); layout and seat consistency (Phase 3); playback (Phase 4); typed figures and a Playwright smoke test with screenshot and console check (Phase 5); dist scan and deploy gate (Phase 7). No coverage target, no pixel diffing.

## Performance
Budgets live in `scene/quality-tiers.json` and `docs/performance.md`; every figure there is a target and reads "Not measured" until measured on a named device. People are instanced with baked animation; ambient occlusion, volumetrics and depth of field are off on phones.

## Tension Resolutions
| Tension | Agents | Resolution | Reasoning |
|---|---|---|---|
| One worker or two | Architect, Tuner | One worker module, one instance, chunked yielding batches, no cache | The animated run is played back from a log sent once, so batches cannot stall it; a second instance is a one-line change if measured latency demands it |
| Scene polish vs false authority | Artisan, Skeptic | Fidelity follows evidence: observed at full quality, unknowns hatched and always on, unconfirmed omitted | A polished render is itself a claim |
| Revenue sourcing | Alchemist, Skeptic | All revenue inputs ASSUMED with ranges; revenue always reported as a band tagged "SIMULATED (basis: ASSUMED)"; null input shows "Insufficient evidence" | Brief rule 6 requires revenue; the register has no Khar price that is dated and verified |
| Ban on number literals in HUD | Craftsman, Skeptic | Typed `Figure` + smoke test + dist scan; no regex lint | The lint gives false positives and the type already blocks untagged numbers |

## Decision Log
| Decision | Options considered | Chosen | Reasoning |
|---|---|---|---|
| HUD technology | React, plain DOM | Plain DOM | Brief prefers small dependencies |
| Params validation | zod, hand-written | Hand-written guard shared with tests | No dependency for a few dozen lines |
| Registry extra fields | Advocate's full display set, minimum | `label`, `range`, `candidates`, `gate` | Rest is derivable |
| Scenario/metric labels | In params.json, in code | In `scenarios.ts` / `kpi.ts` | They are not venue numbers |
| Visit-log calibration | Fit patience, consistency check | Consistency check, reported as insufficient | One Khar walk-in row |
| Sensitivity | Global, one-at-a-time | One-at-a-time tornado | Enough for the assignment |

## Open questions for the user
1. Brew tanks, communal benches, string lights: at Khar or not? (Brief asks; photos do not show.)
2. Steps: up or down from the entrance side?
3. Seats or tables per zone, even roughly.
4. Dates and times of the Khar visits (visit log).
5. Which laptop and phone count as "mid-range" for the performance targets.
6. A value for the small-pour price, if any source exists; otherwise lounge revenue reads "Insufficient evidence".
7. Brief mentions a Khar hours conflict; the register holds only "till 1 AM" (D5). Is there a second source?
