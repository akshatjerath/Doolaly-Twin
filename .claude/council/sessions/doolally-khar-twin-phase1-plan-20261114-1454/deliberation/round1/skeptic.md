# Skeptic Position: Phase 1 plan, honesty failure modes

**Core recommendation:** Treat dishonesty as the main failure mode and build the guards into the Phase 1 plan as machine-checked rules, not prose. The registry schema, a build-time "provenance lint" and permanent UI banners have to make it impossible to ship a number, a layout fact or a scenario result without its tag and its caveat.

**Key argument:**
The Gemini prototype did not fail because someone lied. It failed because plausible numbers (62 min, INR 330 pint, 48 bench seats, 6th floor) spread from a draft into the HUD and picked up "verified" labels along the way (docs/gemini-audit.md). This project has the same conditions plus some more: almost every behavioural input will be ASSUMED (patience, arrival rate, dwell time, party mix, seats per zone, prices), the only Khar wait data point is n=1, and the planned studio-grade 3D scene and tight 95% CIs will look more authoritative than the evidence behind them. A CI from 200 seeded replications measures Monte Carlo noise only. It says nothing about whether mean patience is 20 or 60 min. Shown alone, "walk-away 31.4% ± 0.6" is a misleading statement even though every step to get there was correct. The plan has to separate *stochastic* uncertainty from *parameter* uncertainty and display both. It also has to make every layout or price fact trace back to an allowed source file.

**Risks if ignored:**
- **Critical (integrity):** CIs read as forecast confidence on an ASSUMED-dominated model. A reviewer or examiner concludes the twin "predicts" Khar.
- **Critical (integrity):** Facts leak in from photos, Street View or Gemini (floor level, seat counts, bar position, 8-seat benches) and come back labelled OBSERVED.
- **High (integrity/legal):** Licence-gated scenarios B and C look endorsed once a toggle is ticked. Revenue from them invites a "this is legal and profitable" reading.
- **High (scope):** Fixing honesty after the HUD and 3D are built means a rewrite. It is cheap only if the Phase 1 registry plan contains it.

**Dependencies on other domains:**
- Architect: `params.json` schema with required `tag`, `source` (path into `reference/`), `confidence`, and `range: {low, high}` on every ASSUMED value; a derived-KPI manifest that maps each HUD field to an event-log reducer.
- Craftsman: Vitest provenance lint, a forbidden-literal scan, a published-bundle asset allowlist, and a determinism test (same seed gives the same log).
- Artisan/Advocate: a persistent banner and per-figure tag chips; the "ASSUMED LAYOUT" overlay on the 3D scene; the scenario-gate modal copy.
- Strategist: agree on a "sensitivity sweep" (one-at-a-time low/high on the top ~6 ASSUMED params) as a Phase 1 deliverable, not a stretch goal.

---

## Appendix A: Failure-mode table (honesty and misleading output)

L = likelihood, I = impact (H/M/L). Guard types: **S** = schema rule, **T** = test/lint, **U** = UI, **D** = doc entry.

| # | Failure mode | L | I | Guard (concrete) |
|---|---|---|---|---|
| 1 | Tight 95% CIs presented as forecast confidence on ASSUMED inputs | H | H | **U** label every CI "Monte Carlo noise only (N, seeds)"; show the share of ASSUMED inputs next to each KPI. **S** every ASSUMED param needs `range`. **T/D** a sensitivity tornado (low/high per key param, paired seeds) ships with the headline; the headline is the spread, not just the CI. |
| 2 | 3D scene lends false authority to an unscaled sketch | H | H | **U** permanent "Schematic, not to scale; layout from hand sketch" watermark; ASSUMED LAYOUT geometry rendered in a distinct hatch/colour; no metres or sq m shown anywhere. **D** a scale assumption entry in open-questions. |
| 3 | Layout facts creep in from photos, Street View or Gemini (floor level, bar position, benches, 6th floor) | H | H | **S** `source` must resolve to `reference/layout/*`, `reference/evidence-register.md#ID`, `reference/visit-log.csv`, or `"user-interview-2026-11-14"`; paths in `reference/photos`, `reference/street-view` or `reference/gemini` fail. **T** lint rejects those sources and greps `src/` for "rooftop", "6th", "floor 6", "bench". Photos may justify a `note` only, never a value. |
| 4 | "0-75 seats" over-read as "75 seats" | H | M | **S** encode it as `{tag: OBSERVED, value: null, range: {low: 0?, high: 75}, confidence: low, note: "user recall upper bound"}`; the model value is a separate ASSUMED param that cites it. **U** capacity is always shown as ASSUMED with the bound. Per-zone split: ASSUMED LAYOUT plus an open-question entry. |
| 5 | The n=1 Khar wait (30 min, party 6-7) used to "calibrate" | H | H | **D/S** call it a "sanity check, not calibration"; banned word "calibrated" in UI copy (**T** string lint). Show the observation as a single dot on the wait distribution, labelled n=1. Chembur n=3 is a different venue: tag it ANALOGUE in the note and never use it as a Khar input. |
| 6 | Licence-gated B and C look endorsed after the gate is ticked | M | H | **U** the gate modal cites R7/R8 "Insufficient evidence"; every B/C output carries a red "Hypothetical: licence unconfirmed" stripe that cannot be dismissed, including in screenshots/exports and presenter mode. **S** scenario has `licenceStatus: "UNCONFIRMED"`; **T** test fails if a B/C KPI renders without the stripe. |
| 7 | Prices and revenue with no source (Gemini INR 330 pint) | H | H | **S** `price` and `spend_per_party` must be ASSUMED with `range`, derived and cited from D5/D6 cost-for-two (conflict noted), or "Insufficient evidence". **U** revenue shown as "indicative, from ASSUMED spend". Option: hide revenue by default until a source exists. |
| 8 | Evidence-register conflicts silently resolved (age 21/25, cost for two 1,200/1,500/2,000, hours) | M | M | **S** a `CONFLICT` status allowed in the source; the param then must list all candidate values and the chosen one plus why. **T** lint: any param citing D6/R2/R3 must have `note` populated. Hours: cite D5 "till 1 AM"; opening time = ASSUMED plus open question. |
| 9 | Published site ships reference photos or Street View | M | H | **T** post-build check: walk `dist/`, fail on any file whose hash matches anything under `reference/`, any `.jpg/.png` not in an allowlist, or the strings "street-view"/"photos/". Keep `reference/` outside the Vite root/publicDir; never `import` from it. |
| 10 | Hardcoded numbers in the HUD or presenter-mode script (the exact Gemini bug) | H | H | **T** forbidden-literal lint over `src/ui/**` and presenter text: no numeric literals except 0/1/layout px. Presenter script uses `{{kpi.walkaway.median}}` templating only. **S** a KPI manifest: every displayed field = reducer(eventLog) or params path. A test renders the HUD with a mocked log and asserts that values change. |
| 11 | Queue on public pavement modelled as venue space or capacity | M | M | **S** the `pavement_queue` zone has `ownership: "public"` and `capacity: null` (unbounded, OBSERVED from user and D8). **U** rendered outside the gate line, labelled "public pavement, not venue". No "wait lounge" seats taken from it in A; B's lounge must be inside the boundary and ASSUMED LAYOUT. |
| 12 | Survivorship bias: wait reported for seated parties only | H | H | **T** a KPI test: all-arrival wait includes balked/reneged with censoring at abandon time; seated-only wait, if shown, is labelled. Known-answer test on an M/M/c case. |
| 13 | Paired-seed comparisons broken (scenarios use different random streams) | M | M | **T** per-entity substreams (arrivals, patience, dwell) seeded independently; a test shows that identical params give identical arrivals across A/B/C. |
| 14 | VERIFIED tag inflated (press-only R2 and abstract-only A1-A3 shown as VERIFIED in UI) | M | M | **S** keep `confidence` separate from `tag`; A1-A3 used as *direction* only (note), never as numeric inputs; the UI tooltip shows evidence type (Press/Abstract). |
| 15 | Gemini numbers reappear via "reasonable defaults" (patience 20-34/46-68, 2.4x, 18-seat lounge) | M | H | **T** a blocklist of known Gemini constants grepped in `src/data` and `src/`; any match must cite a non-Gemini source. **D** the gemini-audit list linked from params.json's header note. |

## Appendix B: Edge cases the plan must name (boundary / state)

- Zero arrivals in a window; arrival > capacity for the whole shift; party size > largest table (6-7 party on 2/4-seat tables: needs ASSUMED table-join rule plus open question).
- Patience = 0 (instant balk) and an unbounded queue; replications where no one is seated (median undefined, so show "n/a", never 0).
- Shift-end censoring: parties still queued at close get counted as censored, not as served or walked away.
- Seat total = 0 at the low end of the "0-75" range (the model must reject a value below the minimum table count).
- N < 200 requested via UI: block, or label "below reporting threshold".

**Bottom line:** none of these guards needs app code in Phase 1. Each is a line in the schema spec, a named test in the test plan, or a doc entry. If they are not in the plan now, they will not be in the build.
