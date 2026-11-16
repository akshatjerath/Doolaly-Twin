## Tuner Response to Architect

**Their position:** One pure-TS sim core behind one thin worker. The hero run is replication 0 of the same paired seed set, sent once as a whole-night log, with playback done by a main-thread cursor. Batch runs return only KPI vectors.

**My response:** Modify (mostly concede)

**Reasoning:** My two-worker argument assumed the live run streams from the worker throughout the night. Architect's design removes that assumption. The hero night is computed once and shipped as one log; after that, playback never touches the worker. So a batch cannot stall the animation, which runs off the main-thread cursor. The only collision left is a slider change mid-batch: the new hero request, or the `cancel`, waits in the queue behind the running batch. That does not justify a second worker. It does justify one requirement on day one: `replicate.ts` runs in chunks (for example one replication index across all scenarios per chunk) and yields between chunks (MessageChannel or `setTimeout(0)`). The worker then handles `cancel` and `hero` messages between chunks, takes hero requests first, and posts `progress` per chunk. Without yielding, Architect's runId cancel is decorative.

The cache is not needed on day one either. Batch cost is unmeasured, and a stale-runId drop already prevents wrong results. I withdraw the params-hash cache and the build-time precompute until a measurement says otherwise. I also accept `SimEvent[]` sent once over packed typed arrays, since the payload is one night per change.

Triggers to revisit, recorded in docs/performance.md as TARGETS:
- **Second worker:** add it if hero latency after a slider change exceeds about 200 ms while a batch is running, measured on the named phone.
- **Results cache:** add it if a 200 x 4 batch takes more than about 10 s on the laptop or 30 s on the phone, and users toggle back to settings they have already run.

`client.ts` stays the only caller of the worker, so either change is local.
