## Alchemist Response to Skeptic

**Their position:** Revenue inputs are ASSUMED (D1 is undated and not about Khar, E2 is a competitor's 2020 launch price, D6 is a CONFLICT row). A 95% CI only measures Monte Carlo noise, so every ASSUMED input needs a range and a sweep. "0-75" is a bound, not a value.

**My response:** Modify. I accept every point.

**Reasoning:** I was wrong to tag the parameter value VERIFIED. Rows D1 and E2 verify what a source said; they say nothing about the Khar price today. I split each revenue input into an evidence row and a model value.

- **Takeaway price per litre:** ASSUMED, with range from E2 (Rs 499) to D1 (Rs 500). The note reads "undated (D1) / competitor 2020 (E2); not Khar". Litres per order is ASSUMED with `value: null`.
- **Dine-in spend per two:** ASSUMED, `sourceStatus: CONFLICT`. The range covers all three candidates (Rs 1,200 / 1,500 / 2,000 from D5 and D6), and the note says why the chosen value was picked. These are platform estimates, not observed spend.
- **Lounge spend:** `value: null`, "Insufficient evidence".
- **Seats:** `seat_cap_recall` is OBSERVED with `value: null, range.high: 75`. `total_seats` is a separate ASSUMED parameter, kept between the minimum table count and 75.

**UI behaviour:** If any input to a revenue KPI is null, the reducer returns null. The HUD then shows "Insufficient evidence: needs <param id>" instead of a figure or a 0, and count KPIs stay visible. Revenue is hidden by default. Once the user enters values, it shows as "indicative, SIMULATED from ASSUMED spend". B and C outputs carry the licence stripe.

**Uncertainty:** Each KPI shows two layers.
1. The Monte Carlo 95% CI (N ≥ 200, paired seeds), labelled "Monte Carlo noise only".
2. A parameter band: the minimum and maximum of the KPI across the one-at-a-time low/high sweep of every ASSUMED parameter, using the same seeds. The tornado chart ranks what drives that band.

The headline figure is the band, with the CI inside it. Each KPI also shows how many of its inputs are ASSUMED. The band is not a probability interval. Calling it a forecast range needs a joint (Latin hypercube) sweep, which is deferred.
