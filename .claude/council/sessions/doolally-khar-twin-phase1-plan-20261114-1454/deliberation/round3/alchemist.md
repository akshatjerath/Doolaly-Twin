## Alchemist Final Position: Parameter registry and DES model

**Revised recommendation:** `params.json` is a lint-checked contract. The event log is the only fact table, and every KPI is a reducer over the log. Revenue is **reported, never hidden** (brief rule 6). Each revenue row is always on screen, tagged "SIMULATED (basis: ASSUMED)", and shows a parameter band with the Monte Carlo CI inside it. Where an input is null, the row reads "Insufficient evidence: needs <id>" next to its volume driver (orders, litres, pours), so the row is still reported.

**Concessions made:**
- **Revenue rows:** I give up hiding revenue by default. Skeptic is right that rule 6 requires lounge and takeaway revenue to be shown.
- **Dine-in revenue:** shown as a band across the D5..D6 candidate values, never as one number.
- **Prices:** none is tagged VERIFIED. A register row is cited as evidence for the range, not as the value.
- **Uncertainty:** the headline is the parameter-sweep band. The Monte Carlo CI is labelled "sampling noise only".

**Non-negotiables:**
- **Censoring:** all-arrival wait includes balked and reneged parties. Median and p90 come from Kaplan-Meier with right-censoring; when p90 cannot be estimated, the UI says "not estimable", never 0.
- **CRN:** separate RNG streams per process. A test asserts that identical params give identical arrivals across scenarios.
- **No sourceless prices:** a price with no source stays `null`. Lounge spend is null until the user types a value. Litres per order is a quantity, not a price, so it may get an ASSUMED default and range in Phase 2.
- **A1-A3 papers:** used as direction only, enforced through range bounds. No effect sizes from them.
- **n=1 Khar walk-in:** a sanity check, not a calibration.

**Implementation notes:**
- **Reducers:** `revenue(kpi) = null` if any input is null. Band = minimum and maximum over the one-at-a-time low/high sweep, using the same seeds.
- **Run limits:** N ≥ 200, enforced in the UI.
- **Seat count:** `total_seats` must be at least the minimum table count and at most `seat_cap_recall.range.high`.

### FINAL entry schema

```
{ id, group, value|null, unit, tag, source, confidence, note,   // required on every entry
  range?: {low, high}, slider?: bool, gate?: "B"|"C",
  sourceStatus?: "CONFLICT", candidates?: [..] }
```

| Rule | Applies when |
|---|---|
| `source` must be a register row (`D5`), `visit-log.csv#rowN`, `reference/layout/*`, or `user-interview-2026-11-14`. Paths under photos, street-view or gemini fail the lint. | tag = VERIFIED or OBSERVED |
| `range` and `slider: true` are required, and `range` must contain `value`. A null value is allowed only with note "Insufficient evidence". | tag = ASSUMED |
| `candidates` (all values) are required, and `note` must say why one was chosen. | sourceStatus = CONFLICT |
| `gate` is required. | Scenario B or C parameters |
| Allowed only for run settings. | tag = SIMULATED |

### FINAL parameter list (defaults set in Phase 2)

| id | group | unit | tag | row | slider |
|---|---|---|---|---|---|
| close_time | hours | clock | VERIFIED | D5 | no |
| open_time / sim_window | hours | clock / min | ASSUMED | none | yes |
| walkin_arrival_profile | demand | parties/h per 15 min | ASSUMED | none | yes |
| booked_share | demand | fraction | ASSUMED | D5 (existence only) | yes |
| party_size_mix | demand | pmf | ASSUMED | none | yes |
| seat_cap_recall | capacity | seats (bound, value null) | OBSERVED | user-interview | no |
| total_seats | capacity | seats | ASSUMED | none | yes |
| zone_seat_split | capacity | seats/zone | ASSUMED LAYOUT | none | yes |
| table_size_set | capacity | seats/table | OBSERVED (note only, photos) | user-interview | no |
| table_counts | capacity | tables | ASSUMED | none | yes |
| allow_table_join | seating | bool | ASSUMED | visit-log#3 | toggle |
| table_join_time | seating | min | OBSERVED n=1 | visit-log#3 | yes |
| balk_fn | behaviour | prob vs queue | ASSUMED | none | yes |
| patience_dist | behaviour | min | ASSUMED | visit-log#2 (sanity) | yes |
| dwell_dist | behaviour | min by size | ASSUMED | A1 (direction) | yes |
| A_balk_mult | scenario A | ratio ≤ 1 | ASSUMED | A3 | yes |
| A_patience_mult | scenario A | ratio ≥ 1 | ASSUMED | A2 | yes |
| A_quote_format | scenario A | enum | ASSUMED | A3 | toggle |
| B_lounge_capacity | B (gate) | persons | ASSUMED LAYOUT | R8 | yes |
| B_lounge_conversion | B (gate) | fraction | ASSUMED | E5 (analogue) | yes |
| B_lounge_patience_mult | B (gate) | ratio ≥ 1 | ASSUMED | E5 (analogue) | yes |
| B_pour_spend | B (gate) | INR/pour | ASSUMED, null | none | user entry |
| C_takeaway_share | C (gate) | fraction | ASSUMED | D3 | yes |
| C_price_per_litre | C (gate) | INR/L | ASSUMED | D1, E2 | yes |
| C_litres_per_order | C (gate) | L | ASSUMED | none | yes |
| C_service_time | C (gate) | min | ASSUMED | E3 (analogue) | yes |
| dinein_spend_per_two | revenue | INR | ASSUMED, CONFLICT | D5, D6 | yes |
| replications_N | run | count ≥ 200 | SIMULATED | none | yes |
| base_seed | run | int | SIMULATED | none | yes |
