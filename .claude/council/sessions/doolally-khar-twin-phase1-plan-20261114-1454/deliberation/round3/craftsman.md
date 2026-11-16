## Craftsman Final Position — Phase 1 plan

**Revised recommendation:** Each hard rule gets exactly one automated check. Each check lands in the phase that first creates the thing it guards, and CI runs all of them: tsc, then Vitest, then build, then the dist check, then the Playwright smoke test.

**Concessions made:**
- I dropped the separate check that the worker and an inline run give the same result. "Hero run equals batch replication 0" covers determinism, and there is one worker.
- I dropped the regex ban on number literals in HUD code. With the `Figure` type plus the Playwright tag check it is redundant, and it would produce false positives.
- I dropped the calibration test. Calibrating from the visit log is optional and the log has only one Khar row.
- The M/M/c+M abandonment known-answer test becomes a 1e6-arrival reference run, not a closed form. It is cheaper to keep correct.
- No coverage percentage target and no pixel diffing.

**Non-negotiables:**
- The censoring fixture: the all-arrival mean must differ from the seated-only mean.
- The conservation invariant.
- Paired seeds.
- The dist scan for anything from `reference/`.
- `Figure` as the only HUD input.

**Implementation notes:**
- Use the `Figure` union with `value | insufficient` variants. An `insufficient` figure renders "Insufficient evidence".
- The params guard is hand-written, with no new dependency. It enforces:
  - an ASSUMED entry has a `range` and a `note`;
  - a VERIFIED entry cites a register id;
  - revenue inputs are ASSUMED and may be null.
- The dine-in revenue band (D5..D6) comes from params, not from code.

### Final table: hard rule -> enforcing check

| Hard rule | Check | Phase |
|---|---|---|
| Reproducible sim | `determinism.test.ts`: the hero run's event-log hash equals batch replication 0 | 2 |
| Walk-aways not hidden | `conservation.test.ts`: arrivals = seated + reneged + balked + waiting. `censoring.test.ts`: hand-built log | 2 |
| Correct queue engine | `known-answer.test.ts`: Erlang C, and abandonment vs the reference run, both within the 95% CI | 2 |
| N>=200, CIs, median, p90 | `stats.test.ts`: fixed arrays; rejects N<200 | 2 |
| Paired seeds | `paired.test.ts`: an identical config gives delta 0 and CI [0,0] | 2 |
| Tags valid; ASSUMED has a range; VERIFIED is in the register; revenue is ASSUMED | `params.test.ts` | 2 |
| B/C licence-gated | `gating.test.ts` | 2 |
| Layout only from reference; ASSUMED LAYOUT logged | `layout.test.ts`: every ASSUMED id exists in `open-questions.md` | 3 |
| Seats drawn = seats simulated | `seats.test.ts`: the scene seat count equals the sim capacity param | 3 |
| Agents show only event-log state | `playback.test.ts`: the cursor replays the log, and agent count equals in-system parties at time t | 4 |
| No hardcoded KPIs; every figure tagged | `Figure` type (tsc). `smoke.spec.ts`: each `[data-figure]` has a valid `[data-tag]`; zero console errors; screenshot saved; ASSUMED badge visible | 5 |
| Nothing from `reference/` published; no Gemini numbers | `check-dist.mjs`: file-hash and filename scan, plus bans on `60.7`, `52.5` and `39.4` | 7 |
| TS errors fail deploy | `pages.yml` runs only after the CI job passes | 7 |
