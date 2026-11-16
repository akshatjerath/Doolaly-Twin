## Architect Final Position — Phase 1 plan (structure, sim contract, data files)

**Revised recommendation:** Use a pure sim core whose append-only event log is the only source of every KPI and every agent. Run one Web Worker. The hero night is simulated once, and its whole log is sent once and played back by a cursor. Batches run in chunks that yield between chunks. Layout geometry and numbers stay in two separate validated files.

**Concessions made:**
- **One worker, not two.** Tuner's condition makes a second thread unnecessary: the batch yields between chunks (`await` a `MessageChannel` tick), so `hero` and `cancel` messages interleave with it. A hero run costs one replication, so it slots between chunks. This means one thread, one protocol and less code. If measured hero latency during a batch goes above ~100 ms on a phone, a second instance of the same `worker.ts` is a one-line change in `client.ts`.
- **No results cache on day one.** `runId` cancellation is enough. Add a Map keyed by params hash + scenario + seed base + N + engine version only if re-runs prove slow.
- Typed-array KPI columns for batch results (Tuner).

**Non-negotiables:**
1. `src/sim` imports no `three` and no DOM. A test enforces this.
2. KPIs come only from `kpi.ts` over a log. During playback the HUD runs `kpi.ts` on the log prefix. The worker sends no separate snapshots.
3. The hero is replication 0 of the batch seed list. A test asserts that the hero KPIs equal batch row 0.
4. Common random numbers: per-process RNG streams, with the same seeds across scenarios, so paired deltas are meaningful.
5. The worker rejects B/C with `LICENCE_GATED` unless `licenceAssumed` is set, and it re-validates slider overrides against params bounds.
6. Seat capacity lives in `params.json`, never in layout. A test checks that seats drawn in the scene equal the sim's seats (Skeptic).

**Implementation notes, final tree:**
```
src/
  main.ts
  data/      params.json  layout.json  tags.ts  params.ts  layout.ts
  sim/       rng.ts events.ts engine.ts scenarios.ts kpi.ts stats.ts
             replicate.ts calibrate.ts protocol.ts worker.ts client.ts
  agents/    playback.ts paths.ts crowd.ts
  scene/     renderer.ts lighting.ts post.ts quality.ts quality-tiers.json
             frame-monitor.ts camera.ts room.ts markers.ts hotspots.ts
  hud/       format.ts kpiPanel.ts scenarioSwitch.ts timeline.ts
             compare.ts sensitivity.ts evidencePanel.ts
tests/
  data/      params.test.ts layout.test.ts
  sim/       rng engine kpi stats replicate purity determinism (.test.ts)
  agents/    playback.test.ts  seats-consistency.test.ts
docs/        method.md open-questions.md performance.md gemini-audit.md
ASSETS.md README.md .github/workflows/pages.yml
```

**Data files:**
- `src/data/params.json`: every numeric input as `{ value, unit, tag, source, confidence, note, min?, max? }`. This covers arrivals, party mix, patience, dwell, ranged seat capacity and split, ASSUMED revenue inputs (nullable, so they can render "Insufficient evidence"), and `layout.metresPerPx` (ASSUMED).
- `src/data/layout.json`: zones in sketch pixels taken from `reference/layout` only. Each zone carries `{ id, kind, rect|null, tag, assumed, openQuestion?, note }`. The bar, the queue geometry and the passage's purpose are `assumed: true`. No takeaway zone exists unless C is unlocked.
- `src/scene/quality-tiers.json`: render config per High/Medium/Low (Tuner's targets). These are not venue facts, so they are kept out of params.
- `reference/visit-log.csv`: read at build time by `calibrate.ts` (via `?raw`) as a patience-prior hint. With n=1 at Khar, the result is flagged low confidence and does not override the ASSUMED default.

Dependencies: three, postprocessing, vite, typescript, vitest.
