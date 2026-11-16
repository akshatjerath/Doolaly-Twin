# Architect Position: Phase 1 module structure, sim/render contract, layout and params data

**Core recommendation:** Build around one pure, three-free simulation core that outputs an append-only **event log**. KPIs are pure reducers over that log. 3D agents are a playback cursor over the same log. The Web Worker is a thin message adapter around the core. Layout geometry (`layout.json`) and numbers (`params.json`) are kept as two separate files, both validated at boot and in CI.

**Key argument:**
The brief's hard rule 2 ("one source of truth") is a data-flow rule, so the structure should make breaking it hard. `src/sim` holds `rng`, `engine`, `kpi` and `stats` as pure TypeScript with no DOM and no `three`. The same code runs in Vitest (Node) and in the worker. The engine emits typed events (`ARRIVE`, `QUEUE_JOIN`, `BALK`, `RENEGE`, `SEAT`, `DEPART`, `LOUNGE_ORDER`, `TAKEAWAY_SALE`, `CLOSE`). `kpi.ts` turns any log into a KPI vector. That covers walk-away %, all-arrival wait (reneges and still-queued parties at `CLOSE` count as censored), median, p90, utilisation, revenues and lost parties. The HUD never computes; it only formats `kpi.ts` output. `agents/playback.ts` keeps a cursor into the hero log and derives "who is where" at sim time `t`, so the timeline scrubber is just a cursor seek. Replications use **common random numbers**: each replication seed spawns independent RNG streams per process (`arrivals`, `party`, `patience`, `dwell`, `conversion`), and every scenario uses the same seed list. Paired deltas then measure the intervention, not RNG drift. The **hero run is replication 0** of that same seed list. The animated night is therefore one of the 200 runs behind the CI, never a separate "demo" run. Batch replications return only KPI vectors (no logs), so memory stays flat at N >= 200 x 4 scenarios.

**Risks if ignored:**
- *Structural:* If agents get their own movement logic (a "visual sim"), the counts on screen will drift from the KPIs. That repeats the Gemini failure (hardcoded HUD numbers, survivorship-biased wait).
- *Performance:* Sending full logs for 800 runs, or running the sim on the main thread, stalls rendering. Streaming per tick adds message chatter. Sending the whole hero log once (thousands of small events) is cheap.
- *Integration:* Seating capacity is unknown (user recall "0-75", per-zone split unknown). If it gets baked into layout geometry, every answered open question becomes a code change. Capacity must stay in `params.json` (tagged, slider). Layout should only give rectangles that the scene fills procedurally.

**Dependencies on other domains:**
- Alchemist / Skeptic: an exact definition of censored wait and the CI method (t-interval on per-replication means; paired-difference CI). I fix the data shape, they fix the estimator.
- Craftsman: test layout and the "sim imports no three/DOM" guard test; a golden-log determinism test (same seed gives a byte-identical log).
- Tuner / Artisan: an agent rendering budget (instanced vs skinned) that consumes `playback.ts` state, plus a hard cap on concurrently animated agents.
- Advocate: the HUD's rendering of "Insufficient evidence" and the licence-gate copy. The gate itself is enforced in the worker (see appendix).
- Dependencies: `three`, `postprocessing`, `vite`, `typescript`, `vitest`. No zod, no state library, no React: the validator is about 40 lines and unit-tested.

---

## Appendix A: Proposed folder tree

```
src/
  main.ts                 boot: load+validate data, start worker client, scene, hud
  data/
    params.json           registry (Phase 1 output c)
    layout.json           zones from reference/layout only
    tags.ts               type Tag = 'VERIFIED'|'OBSERVED'|'ASSUMED'|'SIMULATED'
    params.ts             validateParams(raw) -> Params (typed keys from JSON), applyOverrides()
    layout.ts             validateLayout(raw) -> Layout
  sim/                    PURE: no DOM, no three
    rng.ts                mulberry32 + stream(seed, name)
    events.ts             SimEvent union
    engine.ts             runNight(params, scenario, seed) -> SimEvent[]
    scenarios.ts          baseline | A | B | C rule hooks (B/C gated)
    kpi.ts                reduce(SimEvent[]) -> Kpis
    stats.ts              mean, t-CI, paired-delta CI, quantiles
    replicate.ts          runBatch(...) -> BatchResult (KPI vectors only)
    calibrate.ts          visit-log.csv -> patience prior (flags n tiny)
    protocol.ts           worker message types (Appendix B)
    worker.ts             onmessage adapter, ~50 lines
    client.ts             main-thread wrapper: runId, cancel, promise API
  agents/
    playback.ts           cursor over hero log -> AgentState[] at t (pure, tested)
    paths.ts              zone-to-zone waypoints from layout.json
    crowd.ts              three: instanced/skinned people driven by playback
  scene/
    renderer.ts lighting.ts post.ts quality.ts camera.ts
    room.ts               geometry from layout.json zones
    markers.ts            ASSUMED LAYOUT billboards for zones with assumed:true
    hotspots.ts           fly-to + info card (shows zone tag)
  hud/
    format.ts             fmt(value, tag, ci?) -> always shows tag; null -> "Insufficient evidence"
    kpiPanel.ts scenarioSwitch.ts timeline.ts compare.ts sensitivity.ts evidencePanel.ts
tests/
  data/params.test.ts     registry validates; every ASSUMED has min/max
  data/layout.test.ts     every assumed zone has openQuestion id
  sim/{rng,engine,kpi,stats,replicate}.test.ts
  sim/purity.test.ts      no file in src/sim imports 'three' or touches document
  agents/playback.test.ts agent counts at t == counts reconstructable from log
docs/  method.md open-questions.md performance.md gemini-audit.md
ASSETS.md  README.md  .github/workflows/pages.yml
```

Dependency direction: `data` <- `sim` <- (`agents`, `hud`); `scene` reads `data` and `agents`. Nothing imports `hud` or `scene` except `main.ts`.

## Appendix B: Worker message contract

```ts
// src/sim/protocol.ts
type ScenarioId = 'baseline' | 'A' | 'B' | 'C';
type ParamOverrides = Partial<Record<ParamKey, number>>;   // slider values only

type ToWorker =
  | { type: 'hero';  runId: number; scenario: ScenarioId; overrides: ParamOverrides; seed: number; licenceAssumed: boolean }
  | { type: 'batch'; runId: number; scenarios: ScenarioId[]; overrides: ParamOverrides; baseSeed: number; n: number; licenceAssumed: boolean }
  | { type: 'cancel'; runId: number };

type FromWorker =
  | { type: 'heroLog';  runId: number; scenario: ScenarioId; seed: number; events: SimEvent[]; kpis: Kpis }
  | { type: 'progress'; runId: number; done: number; total: number }
  | { type: 'batchResult'; runId: number; n: number; seeds: [number, number];
      byScenario: Record<ScenarioId, KpiSummary>;           // mean, ci95, median-of-reps
      pairedVsBaseline: Partial<Record<ScenarioId, KpiSummary>> }
  | { type: 'error'; runId: number; code: 'INVALID_PARAMS' | 'LICENCE_GATED' | 'CANCELLED'; message: string; details?: Record<string, string> };

type SimEvent = { t: number; partyId: number } & (
  | { kind: 'ARRIVE'; size: number }
  | { kind: 'QUEUE_JOIN'; quotedWait?: number }            // A: point estimate shown
  | { kind: 'BALK' } | { kind: 'RENEGE' }
  | { kind: 'SEAT'; zoneId: string; tableId: string }
  | { kind: 'DEPART' }
  | { kind: 'LOUNGE_ORDER'; amount: number }               // B only
  | { kind: 'TAKEAWAY_SALE'; amount: number }              // C only
  | { kind: 'CLOSE' } );                                   // censoring marker

type KpiSummary = Record<KpiKey, { mean: number; lo: number; hi: number } | null>; // null -> "Insufficient evidence"
```

Rules: the worker re-validates `overrides` against `params.json` bounds (trust boundary: sliders and any URL share state). It rejects B/C with `LICENCE_GATED` unless `licenceAssumed`, so the gate holds even if the UI is bypassed. The client drops any message whose `runId` is stale (slider dragged mid-batch). Seeds are `baseSeed + i`, `i = 0..n-1`, identical across scenarios. Hero uses `seed = baseSeed`.

## Appendix C: Layout and params representation

```jsonc
// layout.json: geometry only, units = sketch px (layout.md); metres via params "layout.metresPerPx" (ASSUMED)
{ "source": "reference/layout/layout.md + layout-sketch.png", "outline": [8,10,1050,685],
  "zones": [
    { "id": "outdoor", "kind": "seating", "rect": [18,68,252,438], "tag": "OBSERVED", "assumed": false, "note": "open-air awning (user confirmed photo 1)" },
    { "id": "hall",    "kind": "seating", "rect": [320,66,1013,437], "tag": "OBSERVED", "assumed": false },
    { "id": "lower",   "kind": "seating", "rect": [577,457,1012,648], "tag": "OBSERVED", "assumed": false, "openQuestion": 1 },
    { "id": "steps",   "kind": "steps",   "rect": [420,423,550,500], "tag": "OBSERVED", "assumed": false },
    { "id": "entrance","kind": "entrance","rect": [8,534,323,720], "tag": "OBSERVED", "assumed": false },
    { "id": "passage", "kind": "passage", "rect": [30,2,265,65], "tag": "OBSERVED", "assumed": true, "openQuestion": 1, "note": "bathroom vs kitchen unsure" },
    { "id": "queue",   "kind": "queue",   "rect": null, "tag": "OBSERVED", "assumed": true, "openQuestion": 3, "note": "pavement outside gate (user); geometry ASSUMED" },
    { "id": "bar",     "kind": "bar",     "rect": null, "tag": "ASSUMED", "assumed": true, "openQuestion": 2 } ] }
```
`rect: null` with `assumed: true` means the scene places it at a rendered default and always draws an `ASSUMED LAYOUT` marker. No takeaway zone exists until scenario C is unlocked, and then only as an assumed zone.

`params.json` entry: `{ value, unit, tag, source, confidence, note, min?, max? }`. Keys are dotted (`arrivals.peakPerHour`, `capacity.seatsTotal`, `patience.meanMin`). `ParamKey = keyof typeof raw` gives compile-time key safety at no cost. `validateParams` checks: tag is in the enum, value is finite and within min/max, `source` is non-empty for VERIFIED/OBSERVED, and ASSUMED entries have min/max (they need sliders). A Vitest test runs the same function, so a bad registry fails CI and the Pages build. Seat capacity (upper bound ~75, low confidence) and the per-zone split live here, not in layout.
