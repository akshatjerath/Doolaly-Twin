# Alchemist Position: Parameter registry and DES model design

**Core recommendation:** Treat `params.json` as a validated data contract and the event log as the only fact table. Every KPI is a pure function of (params hash, seed, scenario, event log). Almost every behavioural and capacity input is ASSUMED with a slider. Revenue outputs return `null` / "Insufficient evidence" whenever an input they need has no source and the user has not entered a value.

**Key argument:**
Grain first. (1) `event`: one row = one state change for one party in one replication (`rep, scenario, seed, t_min, party_id, type ∈ {ARRIVE, BALK, QUEUE, SEAT, RENEGE, DEPART, LOUNGE_JOIN, TAKEAWAY_ORDER, TAKEAWAY_DONE, HORIZON_CENSOR}, table_id, pax`). (2) `party`: one row = one party per rep per scenario. It holds `arrival, outcome, wait_min, censored(0/1)`, and every random draw is made at arrival. (3) `rep_kpi`: one row = one rep × one scenario. (4) `run_manifest`: params hash, engine version, base seed, N. The UI reads `rep_kpi` aggregates. A full event log is kept only for the replication being animated. The other replications keep only party and KPI rows (order of 10^5 rows; size depends on the ASSUMED arrival rate).

Registry contract. The brief's fields are `{value, unit, tag, source, confidence, note}`. I propose two optional fields: `range: [lo, hi]` (required when tag = ASSUMED, because this is what the slider uses) and `gate: "B" | "C"` for licence-unconfirmed scenarios. A Vitest check rejects the file if any of these hold: a tag is outside the enum; VERIFIED/OBSERVED has no register row id (e.g. `D5`); ASSUMED has no range; a price field has a value with no source. A number with no evidence is stored as `value: null, tag: "ASSUMED", note: "Insufficient evidence"` until the user sets it. Gemini's defaults (8-seat benches, 20-34 / 46-68 min patience, Rs 680/head, 72% conversion, 24% mug club, +38% match nights, 18-guest permit lounge) are excluded.

**Behavioural papers A1-A3 (direction only).** A2: relative-progress information reduces reneging. A3: point estimates reduce balking compared with intervals, and coarse intervals raise reneging. A1: longer waits go with reneging and shorter dining. We encode these only as sign constraints on scenario-A multipliers. The balk multiplier must sit in a range with upper bound 1.0. The patience multiplier must sit in a range with lower bound 1.0. The null effect (1.0) is always inside the slider. A1's percentages (15%, 7.5%, 7.7%) are about another venue. They must not appear as defaults or as targets. At most, `docs/method.md` cites them as context.

**KPIs (all computed per rep, then aggregated across reps):**
- Walk-away % = (balked + reneged walk-ins) / walk-in arrivals. Booked parties are reported separately.
- Lost parties = balked + reneged. Lost covers = their pax.
- All-arrival wait: W_i = min(seat, renege, horizon_end) − arrival. Balkers have W = 0 and are flagged. A party is censored if it reneged or was still queued at horizon end. The mean over all arrivals is labelled "lower bound (censored)".
- Median and p90 time-to-seat come from a Kaplan-Meier estimate with reneged and unfinished parties right-censored. If the survival curve never falls to 0.1, show p90 as "> X min (not estimable)" and never as a number.
- Utilisation = occupied seat-minutes / (total seats × open minutes). Also report seat-fit = occupied seats / seats at occupied tables, because 2- and 4-tops waste seats on odd-sized parties.
- CIs: N ≥ 200 reps. Report the t-interval of per-rep KPIs; use a bootstrap for p90.
- Paired comparison with common random numbers: each process (arrival, size, booking, patience, balk-uniform, dwell, lounge, takeaway) gets its own mulberry32 stream seeded from hash(base_seed, rep, stream). All draws for a party happen at arrival in a fixed order, so changing the scenario never shifts the arrival stream. Report the mean of d_r = KPI_scn − KPI_base with its CI, plus the share of reps where d_r < 0.

**Calibration (honest scope).** For Khar, one walk-in row (party of 6-7, about 30 min, seated) gives one right-censored observation: that party's patience was at least 30 min. That is a consistency check, not a calibration. The UI should report "share of simulated 6-7 parties in the evening seated within 30 min" and set calibration status to "Insufficient evidence". The booked row (party of 18) gives an OBSERVED table-join time of 5-10 min (n = 1). The Chembur rows are a different outlet with unknown outcomes, so they are excluded by default. Build `calibrate()` as a censored-likelihood fit that only switches on above a stated minimum n, ready for the fieldwork listed in register section E.

**Sensitivity.** Run a one-at-a-time tornado over the slider range of each ASSUMED parameter, holding the others at default. Use the same CRN seeds and N = 200 per end. Plot the KPI delta with its CI and grey out bars whose CI crosses 0. Run it in the worker, after the main run. Global methods (LHS / Sobol) are deferred.

**Risks if ignored:**
- Data integrity: a seated-only wait or an uncensored mean repeats Gemini's survivorship bias and makes waits look better than they are.
- Reliability: unsynchronised RNG streams turn scenario deltas into noise. Without CRN, 200 reps may not separate A from Baseline.
- Credibility: made-up rupee spend or effect sizes, once shown with CIs, look measured. One reviewer question sinks the project.

**Dependencies:**
- Architect: approve `range` and `gate` as fields; worker message schema for `rep_kpi`.
- Guardian/conductor: whether photo-derived table sizes (2/4 seats) may be cited as OBSERVED when the photos themselves are not published.
- Advocate/Artisan: how to render `null` revenue and "not estimable" p90.
- Skeptic: review the slider ranges set in Phase 2.

## Appendix: proposed parameters

| id | unit | tag | source | confidence | slider |
|---|---|---|---|---|---|
| horizon_open_close | clock time | VERIFIED (close 1 AM); open time ASSUMED | D5 | Medium | open time yes |
| sim_window | minutes | ASSUMED default, to be set in Phase 2 | none | Low | yes |
| walkin_arrival_rate_profile | parties/hour by 15 min slot | ASSUMED, Insufficient evidence | none (register E fieldwork) | Low | yes |
| booked_share | fraction of parties | ASSUMED (reservations exist: D5) | D5 for existence only | Low | yes |
| party_size_mix | pmf over 1..8+ | ASSUMED | none (D7 anecdotes only) | Low | yes |
| total_seats | seats | ASSUMED; upper bound 75 OBSERVED (user recall "0-75") | interview 2026-11-14 | Low | yes, max 75 |
| zone_seat_split | seats per zone | ASSUMED LAYOUT | none | Low | yes |
| table_sizes | seats per table | OBSERVED {2,4}; counts ASSUMED | user-confirmed photos (unpublished) | Low-Medium | counts yes |
| allow_table_join | bool | ASSUMED | D7 / visit-log row 3 | Low | toggle |
| table_join_time | minutes | OBSERVED 5-10, n=1 | visit-log row 3 | Low | yes |
| balk_fn (prob vs visible queue / quoted wait) | probability | ASSUMED | none | Low | yes |
| patience_dist (family + mean) | minutes | ASSUMED; censored check: patience ≥ 30 for one party | visit-log row 2 | Low | yes |
| dwell_dist by party size | minutes | ASSUMED | none (A1 direction only) | Low | yes |
| A_balk_multiplier | ratio, range upper bound 1.0 | ASSUMED magnitude; direction VERIFIED | A3 (abstract) | Low | yes |
| A_patience_multiplier | ratio, range lower bound 1.0 | ASSUMED magnitude; direction VERIFIED | A2 (abstract) | Low | yes |
| A_quote_format | enum point/interval | ASSUMED default | A3 | Medium (direction) | toggle |
| B_lounge_capacity (gate B) | persons | ASSUMED LAYOUT; licence Insufficient evidence | R8 | Low | yes |
| B_lounge_conversion (gate B) | fraction of queued | ASSUMED | E5 analogue only | Low | yes |
| B_lounge_patience_multiplier (gate B) | ratio | ASSUMED | E5 analogue only | Low | yes |
| B_small_pour_spend (gate B) | INR/person | Insufficient evidence (`null`) | none | n/a | user entry |
| C_takeaway_share (gate C) | fraction of arrivals | ASSUMED; Khar availability UNVERIFIED | D3 | Low | yes |
| C_price_per_litre (gate C) | INR/L | VERIFIED Rs 500 from (Doolally, undated); Rs 499 (Effingut 2020) | D1, E2 | Medium | yes |
| C_litres_per_order (gate C) | L | ASSUMED | none | Low | yes |
| C_service_time (gate C) | minutes | ASSUMED; 15-min concept is an analogue | E3 | Low | yes |
| dinein_spend_proxy | INR per two | CONFLICT: Rs 1,200 / 1,500 / 2,000 "cost for two" (platform estimate, not spend) | D5, D6 | Low | yes, range = D5..D6 |
| replications_N | count | SIMULATED setting, min 200 | brief | n/a | yes, ≥ 200 |
| base_seed | int | SIMULATED setting | n/a | n/a | yes |

How revenue outputs behave: dine-in revenue and lost revenue are tagged SIMULATED, with the caveat that they rest on a "cost-for-two proxy (CONFLICT)". Takeaway revenue is SIMULATED (price VERIFIED but undated; litres ASSUMED). Lounge revenue stays "Insufficient evidence" until the user enters a spend; it is then SIMULATED from a user-entered ASSUMED input. Count KPIs (lounge joins, takeaway orders) are always shown.
