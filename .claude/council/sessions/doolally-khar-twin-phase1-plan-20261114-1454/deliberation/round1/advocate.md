# Advocate Position — Phase 1 plan: honesty you can read

**Core recommendation:** Phase 1 should treat evidence status as data, not decoration. Every parameter, metric, scenario and layout element gets display and provenance fields now, so in Phase 5 the HUD can be generated from data, and the honest version is also the easy one to build.

**Key argument:**
There are three users. *The presenter* (student) has about 3 minutes in a pitch video and needs a scripted tour that cannot stray into an unflagged number. *The assessor* will spot-check one figure ("where does 18 min come from?") and should reach its source in two clicks. *The sceptical operator* will look for the one figure that is overclaimed and stop trusting the rest. Walk the journey. The assessor opens the page. A thin, non-dismissable banner reads "SIMULATED, not measured. N runs, seeded. X of Y inputs ASSUMED". X, Y and N are computed from params.json and the run config, never typed in by hand. They pick Scenario A. KPIs show "Running 0/200…" (a polite live region), never "0". Results appear as compact **figure chips**: `18 min [15–21] (S)`. The tag is a letter inside a distinct shape (V circle, O square, A triangle, S diamond), so it never depends on colour alone. Focusing or tapping a chip opens a provenance popover with label, description, tag, register ID (e.g. D5) and confidence, plus "how computed" for outputs. That is two levels: glance and inspect. Tags stay visible on every figure, and the popover keeps them from becoming a wall of text. Then they pick Scenario B. It is *not* greyed out (greying out hides the reason). It opens a gate card: "Licence status: Insufficient evidence (register R8). Serving in waiting areas under FL-III is not confirmed. Requires Excise confirmation." A checkbox follows: "Assume licence permits (hypothetical)". Before ticking, the panel shows no numbers. After ticking, the results run, but every B/C figure, the Before/After view, the tornado chart and any export carry a persistent hatched stripe and the text "HYPOTHETICAL: licence unconfirmed". Presenter mode cannot remove that stripe. Unticking hides the results again.

**Unknowns and conflicts:**
- "Insufficient evidence" is its own value state (`status: "insufficient"`). It renders as italic muted text, never as 0, a blank or a dash, and it is excluded from computed totals.
- Conflicts are a list of candidates, each with its own source. Cost for two is shown as "Rs 1,200 / 1,500 / 2,000 (CONFLICT)" with each source in the popover. If the model must use one, the chosen value is tagged ASSUMED and says which candidate it is. On age: the register lists beer 21 and spirits 25 as VERIFIED (press only), and wine age as the real CONFLICT (R3). Phase 1 should record that nuance and not flatten it.

**Before/After:** Use paired seeds. Each KPI row shows Baseline, Scenario, and the paired Δ with its 95% CI. Direction is given in words plus an arrow plus a sign ("4.1 pts fewer walk-aways"), not by red or green. Each metric declares `better_direction`. If the CI crosses zero, the label says "No clear difference", and an unflattering result is shown just as plainly. Walk-away % sits first, before mean wait, so an average cannot hide the lost parties.

**Accessibility and modes:**
- Keyboard: keys 1–4 switch scenarios, Space plays or pauses, ? opens help, and there is a skip link past the canvas. Every 3D hotspot also exists as a DOM button list, so pointer lock is never required.
- Visible focus rings, AA contrast, and the Okabe-Ito palette for series.
- Reduced motion follows `prefers-reduced-motion` plus an in-app toggle: camera fly-tos become cuts, the tour advances manually, and sparklines do not animate.
- Mobile (<768 px): Overview camera by default. The HUD becomes a bottom sheet with tabs (Scenario / Results / Evidence) and 44 px targets.
- Presenter mode hides debug and drives a tour defined in data. It can hide controls but never tags, the banner, gate stripes or ASSUMED LAYOUT markers.

**Risks if ignored:**
- Tags get hand-placed in Phase 5, a few are missed, and the operator finds the one bare number. Trust in the whole twin collapses, which is exactly the failure of the Gemini prototype.
- Licence-gated results circulate as screenshots without the flag. That is a reputational and assessment risk.
- Missing values show as 0 or "–" and read as measured zeros. Colour-only tags fail for about 8% of men (colour-vision deficiency) and for greyscale print.
- Wait figures for B/C appear without censoring context, so the averages flatter the scenario.

**Dependencies on other domains:**
- Architect: the registry schema below. Worker progress events (`run_progress`, `run_done`) for the loading states. A metrics registry alongside params.
- Alchemist / Prover: paired-difference CIs and censored all-arrival wait, exposed per metric with an `n_runs` field.
- Skeptic / Guardian: wording for the licence gate card and banner.
- Artisan: tokens for the tag shapes, hatch pattern and Okabe-Ito mapping.
- Chronicler: stable register IDs (R8, D5…) that the popovers link to.

## Appendix: fields needed now

**params.json (each entry):** `id`, `label`, `short_label` (≤14 chars), `description` (≤140), `unit`, `format` (precision/pattern), `value` (or `null`), `status` (`ok` | `insufficient` | `conflict`), `candidates[]` (`{value, source_id, note}`; used when status is `conflict`), `selected_candidate`, `tag`, `source_ids[]` (register refs), `confidence`, `note`, `adjustable`, `min`, `max`, `step`, `slider_group`, `sensitivity_driver` (bool), `applies_to[]` (scenario ids), `licence_dependent` (bool).

**Metrics registry (in params.json under `metrics`, or `src/data/metrics.json`):** `id`, `label`, `short_label`, `description`, `unit`, `format`, `better_direction` (`lower` | `higher` | `none`), `order`, `ci_level`, `censoring_note`, `how_computed`.

**Scenarios:** `id`, `label`, `description`, `licence_dependent`, `licence_status` (`insufficient`), `licence_source_ids` (R8), `gate_text`, `hypothetical_badge_text`.

**Layout data file (each element):** `id`, `label`, `accessible_name`, `tag` (`OBSERVED` | `ASSUMED LAYOUT`), `source` (sketch/photo/user interview), `open_question_id`, `hotspot` (`{title, card_text, camera_preset}`), `tour_order`.

**Presenter tour:** an ordered list of steps (`hotspot_id`, `scenario`, `caption`, `duration_s`). It must not include a B/C step unless the gate is ticked during the tour.

Verification note: these are UX specs only. No contrast ratios were measured, because there is no UI yet.
