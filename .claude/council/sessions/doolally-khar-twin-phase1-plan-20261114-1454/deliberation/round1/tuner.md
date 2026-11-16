## Tuner Position — Phase 1 module structure under performance constraints

**Core recommendation:** Run the sim in two workers: a **live worker** for the animated run and a **batch worker** for the replications. Only small messages should cross the boundary: event deltas for the live view, and per-replication KPI rows (transferable typed arrays) for the batch. On the render side, the module structure needs four things from day one: a quality-tier table, a frame-time monitor, crowd instancing via baked vertex-animation textures, and a per-tier asset manifest. If these are bolted on later, the scene modules will have to be rewritten.

**Key argument:**
Nothing has been measured yet, so this section is about structure, not numbers.

**(1) Batches.** The live run and the batch run go in separate workers. That way a 200 x 4 batch never stalls the live animation's event stream. Start with **one** batch worker, not a pool. Replications run in chunks ordered by replication index across all four scenarios: rep i uses seed s_i for A, B, C and D. This keeps the seeds paired, and partial CIs can be shown as the batch runs. After each chunk the worker posts `{done, total}` for the progress bar. When params change, a generation token cancels the stale batch. The cache key is `hash(canonical params subset + scenario id + seed-set base + N + engine version)`. Results live in an in-memory Map. Optionally, the default-params baseline can be precomputed at build time by running the same TS engine under Node, and shipped as JSON tagged SIMULATED with its seed set. Then the first view shows CIs with no wait. Add a pool (size `min(hardwareConcurrency - 2, 3)`, at least 1) only if measured batch time misses its target.

The tornado chart (6 drivers x low/high x N runs) is a separate, lower-priority job that runs on demand behind the main batch. It never runs automatically on every slider move.

**(2) The boundary.**
- **Live worker to main thread:** discrete event deltas (arrive, queue, seat, renege, depart), packed into an Int32Array/Float32Array. They are batched at a capped rate (target 10 Hz) and sent as transferable buffers. Agent count is in the low hundreds, so bytes are trivial. The real cost is message frequency and GC. A KPI snapshot for the HUD goes out at a lower rate (target 2 Hz). The renderer owns path interpolation; the sim never sends per-frame positions.
- **Batch worker to main thread:** per-replication KPI columns (one Float64Array per KPI) plus computed aggregates. Full event logs never cross, except for one selected replication on demand (for export/audit).
- **No SharedArrayBuffer.** GitHub Pages cannot set COOP/COEP headers.

**(3) Scene.** On phones, the expensive items in the graphics brief are, in order of expected cost (unmeasured):
1. **N8AO/SSAO**: a full-screen, depth-bound pass.
2. **Dynamic soft shadows** from more than one light, plus the characters in the shadow pass.
3. **Volumetric light shafts and DOF.**
4. **Individually skinned characters**: one draw call each, doubled by shadows. This alone can break the 300-call cap.
5. **Device pixel ratio above 1.**
6. **Selective bloom**, which needs a layer or extra pass.

Mitigations:
- **People:** InstancedMesh with baked vertex-animation textures, giving one draw call per model variant per LOD.
- **String lights:** instanced emissive meshes, not point lights.
- **Shadows:** one shadow-casting key light. Furniture shadows render once (`autoUpdate=false`). People get blob shadows on Medium and Low.
- **Post chain:** SMAA, bloom, vignette and LUT merged into a single `EffectPass`. AO runs half-res on Medium and is off on Low.
- **Assets:** KTX2 textures (ETC1S for albedo, UASTC for normals), plus meshopt/gltfpack geometry. Low gets its own texture set, so it never downloads High maps.
- **Loading:** shaders are precompiled behind the loading screen.
- **Auto-downgrade:** triggers on the rolling median frame time over about 120 frames, if above 22 ms. It ignores the first seconds after load. Hysteresis applies, and it never auto-upgrades.

**(4) docs/performance.md.** Every budget figure is labelled **TARGET**. Each row has the columns Target | Measured | Device | Browser | Build hash | Date | Method. Measured cells read "Not measured" until someone measures them.

What to measure, on a fixed benchmark camera path per tier:
- frame time p50/p95
- draw calls and triangles (`renderer.info`)
- texture count and estimated GPU texture memory
- JS heap
- gzip size per chunk and first-load bytes
- time to interactive
- batch wall time for 200 x 4 on each device
- live message rate

Measured values are tagged OBSERVED and name the device.

Module implications: `src/sim/` stays pure (no DOM; runs in Node for tests and precompute). Alongside it: `src/sim/protocol.ts` (versioned message types), `worker-live.ts`, `worker-batch.ts` and `cache.ts`. Render side:
- `src/render/quality-tiers.json`, which holds render config, not venue facts, so it stays out of params.json
- `src/render/frame-monitor.ts`
- `src/render/crowd/`
- `src/render/post/`
- `src/assets/manifest.ts`, with per-tier variants and byte sizes for the progress bar
- a `?perf=1` overlay

**Risks if ignored:**
- Skinned characters, one per mesh, plus multi-light shadows go past 300 draw calls and miss 30 fps on phones. Fixing this later means rewriting the people module.
- A single worker that does both live and batch runs freezes the animation during the batch. Recomputing the tornado on every slider move makes the sliders unusable.
- Phones download High-tier textures and the HDRI, which wastes data and memory and risks the tab being killed.

**Dependencies on other domains:**
- **Architect:** owns the protocol and the worker split. Agree on the cache-key definition.
- **Artisan:** accept per-tier cuts. Low drops AO, dynamic shadows, volumetrics and DOF.
- **Alchemist:** the CI method, plus the N for tornado runs (a reduced N must be labelled as such).
- **Craftsman:** a determinism test (same seed gives identical KPIs, in the worker and in Node) and a bundle-size check.
- **Operator:** Pages hosting constraints (no custom headers).
- **Strategist/user:** name the actual "mid-range" laptop and phone. Until then this is an open question.

---

### Appendix: budget table (all values are TARGETS, nothing measured)

| Budget | High | Medium | Low (phone) |
|---|---|---|---|
| Frame rate | 60 fps (16.7 ms) | 45 fps | 30 fps (33 ms) |
| Auto-downgrade trigger | median > 22 ms | median > 22 ms | n/a (lowest) |
| Draw calls (hard cap 300) | <= 250 | <= 180 | <= 120 |
| Triangles on screen | <= 1.5 M | <= 800 k | <= 300 k |
| Pixel ratio cap | min(dpr, 2) | 1.5 | 1.0 |
| Shadow-casting lights | 1 (2048 map, static furniture) | 1 (1024) | 0 (baked/blob) |
| People shadows | real | blob | blob |
| AO (N8AO) | full-res | half-res | off |
| Bloom / SMAA / vignette+LUT | on (one EffectPass) | on | SMAA + LUT only |
| Volumetrics, DOF | on (DOF overview only) | off | off |
| HDRI env (PMREM source) | 1K | 1K | 512 or gradient |
| Max texture size | 2K hero, 1K rest | 1K | 512 |
| GPU texture memory | <= 128 MB | <= 80 MB | <= 48 MB |
| First-load transfer (gzip) | <= 5 MB | <= 4 MB | <= 2.5 MB |
| Initial JS (gzip, before lazy chunks) | <= 250 KB | same | same |
| Live worker messages | <= 10 Hz deltas, <= 2 Hz KPI | same | same |
| Batch 200 x 4 wall time | <= 10 s (laptop) | — | <= 30 s (phone) |
