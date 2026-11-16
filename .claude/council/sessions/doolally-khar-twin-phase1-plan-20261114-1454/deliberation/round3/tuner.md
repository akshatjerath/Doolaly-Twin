## Tuner Final Position — Phase 1 plan

**Revised recommendation:** One `worker.ts` module and one protocol, with the batch loop chunked and yielding. On the render side, structure the scene around a quality-tier table, an instanced crowd and a per-tier asset manifest. Every budget is a TARGET until measured.

**Worker point settled:** I accept Architect's design: one `worker.ts` and one protocol. `client.ts` may start it twice (hero and batch), because that costs no extra code. The batch must still yield between chunks. Results are computed under Architect's cache key, but nothing is kept in memory or on disk until a measured batch time justifies it.

**Concessions made:**
- No 10 Hz delta stream. The hero log is sent once, which is simpler and cannot stall the animation.
- No build-time precompute, and no pool, before measurement.
- `SimEvent[]` is fine for one night; typed arrays are only for batch KPI columns.

**Non-negotiables:**
- The batch loop yields between chunks so `cancel` and new hero requests are handled. Progress is reported per chunk.
- People render as InstancedMesh with baked vertex-animation textures, not one SkinnedMesh per guest. Draw calls must stay under 300 even when the crowd is at its largest.
- The tier table lives in its own render config, separate from `params.json` (which holds venue facts only).
- Phones never download High-tier textures or the 1K HDRI.

**Final constraints that shape modules now:**
1. `src/sim/replicate.ts`: chunked by replication index across scenarios, yields between chunks, paired seeds. A test checks the hero run equals replication 0.
2. `src/agents/crowd.ts`: instanced and VAT-animated, with a hard cap on concurrently animated agents.
3. `src/scene/quality.ts` plus the tier table: pixel-ratio cap, shadow-light count (1 static on High, 0 on Low), AO (full / half / off), one merged `EffectPass`, volumetrics and DOF on High only.
4. `src/scene/frame-monitor`: rolling median frame time above 22 ms triggers a step down, with hysteresis, an ignore window after load, and no auto-upgrade.
5. `src/assets/manifest`: per-tier KTX2/meshopt variants with byte sizes for the loading progress bar. Shaders precompile behind the loader.

Artisan's cuts (no string lights, brew tanks or benches) lower the cost further. I have not measured how much.

**Implementation notes on `docs/performance.md`:**
- Columns: Budget | TARGET | Measured | Device | Browser | Build hash | Date | Method. Every Measured cell reads "Not measured" until it is measured.
- Rows: frame time p50/p95 per tier on a fixed camera path, draw calls, triangles, GPU texture memory estimate, JS heap, gzip size per chunk, first-load bytes, time to interactive, 200 x 4 batch wall time, and hero latency after a slider change while a batch runs.
- Revisit triggers for a second worker or a persistent cache: hero latency above about 200 ms, or batch time above about 10 s (laptop) or 30 s (phone).
- Measured values are tagged OBSERVED and name the device.
- Open question for the user: which laptop and phone count as "mid-range".
