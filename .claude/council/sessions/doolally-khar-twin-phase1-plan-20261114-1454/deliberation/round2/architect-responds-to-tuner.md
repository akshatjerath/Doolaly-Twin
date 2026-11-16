## Architect Response to Tuner

**Their position:** Use two workers. A live worker streams packed event deltas at up to 10 Hz with KPI snapshots at 2 Hz. A batch worker runs 200 x 4 paired replications in chunks, with an in-memory results cache keyed by params hash + seeds + N + engine version.

**My response:** Modify

**Reasoning:** I agree with Tuner's goal. A 200 x 4 batch must never stall the live view, so it needs a second thread. I also accept the cache key (params hash + scenario + seed base + N + engine version, held in a Map in `client.ts`), KPI columns as transferable `Float64Array`s, chunked batch progress, and the optional build-time baseline JSON. My `runId` already plays the role of their generation token.

I disagree that the live run should stream. In a DES engine, one simulated night computes in milliseconds, so the hero needs no live worker emitting deltas. The client sends the whole hero log once and `agents/playback.ts` plays it back on the render clock. Streaming at 10 Hz would add a packing format, a delta reassembler and a second KPI path (2 Hz snapshots). It would also break backward scrubbing, since past events would have to be cached on the main thread anyway.

Compromise: keep **one `worker.ts` module and one protocol**, instantiated twice by `client.ts`:
- `heroWorker` handles `hero` messages. It returns in milliseconds and is never blocked by a batch.
- `batchWorker` handles `batch` messages.

That gives Tuner's non-blocking topology with no second codebase and no delta protocol. The hero stays replication 0 of the batch seed list. A Craftsman test asserts that the hero's `kpis` equal batch row 0 for the same seed and params, which keeps the single source of truth checkable. Live HUD numbers during playback come from `kpi.ts` run over the log prefix up to the cursor, not from worker snapshots.

If measurement shows hero computation above ~50 ms on a phone, revisit chunked streaming then.
