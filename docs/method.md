# Method (Phase 2: simulation core)

**Everything this model outputs is SIMULATED, not measured.** Almost every input is ASSUMED (see `src/data/params.json`); only the last-orders-to-close gap is OBSERVED.

## Model
A discrete-event simulation of one evening of walk-in parties at Doolally Khar.

1. **Arrivals.** Parties arrive by a time-varying Poisson process over the arrival window (ends at last orders). Party size is drawn from a fixed mix.
2. **Seating.** Tables of 4, 6 and 8 seats in the outdoor and indoor areas. A party takes the smallest free table that fits; a larger party may join free tables within one zone. The host seats any waiting party that fits (first come, first served, skipping parties that do not fit).
3. **Balking.** If no table fits on arrival, the party leaves at once with a probability that grows with the number of parties already waiting.
4. **Reneging.** A party that joins the queue has a patience time (lognormal). If not seated by then, it leaves.
5. **Dwell.** A seated party stays for a lognormal dwell time, cut off at closing.
6. **Last orders.** Nobody is seated after last orders. Parties still waiting are recorded as "unserved at last orders", separate from walk-aways.

## Scenarios
| Scenario | What changes | Licence |
|---|---|---|
| Baseline | Manual queue | none needed |
| A | Digital waitlist: lower balking, longer patience | none needed |
| B | A plus a small-pour lounge: some waiting parties order and wait longer | UNCONFIRMED (register R8) |
| C | A plus a takeaway counter: some walk-aways buy takeaway | UNCONFIRMED (register R8) |

B and C are built on A; this is a modelling assumption. They only run with `licenceAssumed: true`. The papers A2 and A3 support only the direction of A's effects; the sizes are assumed.

## KPIs (all computed from the event log)
- **Walk-away %**: (balked + reneged) / arrivals.
- **Lost parties**: balked + reneged + unserved at last orders.
- **Mean wait, all arrivals**: balked parties count as 0 minutes, parties who left count the time they waited. The seated-only mean is also printed to show how much it understates.
- **Median and p90 wait to be seated**: Kaplan-Meier, with parties who left treated as right-censored. Shown as "not estimable" when the curve does not reach the quantile.
- **Seat utilisation**: person-minutes at table during the arrival window over seat-minutes available.
- **Revenue**: dine-in uses the cost-for-two figure, reported as a band across the conflicting platform values. Lounge revenue is "Insufficient evidence" until a pour price is supplied. Takeaway uses an assumed historical price.

## Uncertainty
- 200 seeded replications (mulberry32). Every scenario faces the same guests in replication *r*, so differences are paired.
- The 95% interval shows **sampling noise only**.
- The one-at-a-time sweep moves each ASSUMED number to the ends of its range. This band is far wider than the interval and is the honest statement of what is known.

## Limitations
- No arrival, party-size, dwell or walk-away data exists for Khar. The visit log has one Khar walk-in row; it is used as a sanity check, not for calibration.
- Seat counts are indicative, from the user's rough floor plan: 60 seats at tables (16 outdoor, 44 indoor). Bar stools are not counted. Parties do not share long tables.
- Bookings, table-joining time, staff and kitchen limits, and takeaway counter queues are not modelled.
- Kaplan-Meier assumes people who leave are otherwise like those who stay. Impatient guests leave first, so the median and p90 are approximate.
- Ranges marked "illustrative" are not evidence.
- Not checked against a closed-form queue formula.

## Reproduce
`npm test` then `npm run report`.
