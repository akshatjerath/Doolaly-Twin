## Skeptic Response to Alchemist

**Their position:**
- Takeaway price comes from D1/E2 and is tagged VERIFIED.
- Dine-in spend uses the cost-for-two proxy (D5/D6, CONFLICT) as a slider.
- Lounge spend is `null`.
- `range` is required on every ASSUMED value.
- A one-at-a-time tornado runs on CRN seeds.
- Revenue outputs are tagged SIMULATED with a caveat.

**My response:** Modify. Report revenue as the brief requires, but change the tags and how revenue is presented.

**Reasoning:** The contract is good. The null-until-sourced rule, the exclusion of Gemini defaults, and censored KM p90 cover most of my concerns. Three problems remain.

(1) `C_price_per_litre` is tagged VERIFIED, but D1 shows only that Doolally *once* offered 1 L PET "from Rs 500". It is undated, post-lockdown, and Khar takeaway itself is UNVERIFIED (D3). E2 is a competitor's 2020 price. VERIFIED applies to the historical claim, not to the model input.

(2) Cost-for-two is a platform estimate. It is not a measured spend per head, and it probably mixes food, drink and tax. Shown as one SIMULATED point with a tight CI, revenue looks measured, which is my failure mode #1.

(3) A bare SIMULATED tag hides the fact that every rupee rests on ASSUMED inputs.

**Minimum guards I would accept:**
1. Tag `C_price_per_litre` as ASSUMED with `source: D1, E2`. Note it as "historical/analogue price, undated; Khar availability unverified".
2. Make output tags carry their basis: "SIMULATED (basis: ASSUMED)". A lint derives the basis from the weakest input tag, so no revenue output can claim a stronger basis than its inputs.
3. Show dine-in and lost revenue as a band: one run at each end of D5..D6 (paired seeds), not a single point estimate. The MC CI is a secondary detail labelled "noise only".
4. Range bounds on ASSUMED sliders are themselves assumptions. `note` must say where each bound came from, or "illustrative".
5. Tornado label: "one-at-a-time; ignores interactions".
6. Presenter mode leads with counts (walk-away %, lost parties). Revenue appears only with its band and basis tag.

Withholding revenue is not needed, and the brief requires it.
