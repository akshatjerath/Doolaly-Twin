# Advocate Final Position — Phase 1 plan

**Revised recommendation:** The HUD is generated from data and is honest by default. Every figure is a chip: value, tag (a letter plus a shape), a Monte Carlo CI labelled "sampling noise", and a parameter-sweep band beside it labelled "input uncertainty". Revenue is reported, not hidden. It is tagged "SIMULATED (basis: ASSUMED)", and dine-in revenue is shown as a band spanning the D5..D6 cost-for-two conflict, never as a single number.

**Concessions made:**
- I drop the full per-parameter display set (short_label, format, slider_group, how_computed text). The HUD can derive these or hand-write them per panel in Phase 5.
- Conflicts reduce to a short `candidates` list. Only D5/D6 and R3 (wine age) need it now.
- Both uncertainty layers appear on hover or focus. At a glance the chip shows the band only, to keep it readable.

**Non-negotiables:**
- Every figure keeps its tag visible. "Insufficient evidence" is shown as text, never 0 or a blank.
- B and C open a gate card citing R8. After ticking "assume licence permits", their results carry a "HYPOTHETICAL: licence unconfirmed" stripe in every view, capture and tour step.
- The banner, gate stripes, and the always-on hatched ASSUMED treatment in the scene survive presenter mode and screenshots. The tour includes a step showing the bar as ASSUMED.
- Before/After uses paired deltas with CI, labelled "No clear difference" when the CI crosses zero. Walk-away % is listed first. Direction is given by word and arrow, not colour.
- Keyboard: 1–4, Space, ?, and a skip link. Hotspots are mirrored as DOM buttons. Okabe-Ito palette, reduced motion turns fly-tos into cuts, and mobile uses a bottom sheet with 44 px targets.

**Implementation notes:** Worker progress events drive "Running k/200" in a polite live region. KPIs before the first run show "Not yet run".

## Final extra fields

**params.json (per entry)**
- `label`: human name for sliders and popovers.
- `description`: one-line popover text (≤140 chars).
- `status`: `ok` | `insufficient` | `conflict`; drives the render state.
- `candidates[]`: `{value, source_id}` for conflicts and revenue bands.
- `source_ids[]`: register refs (D5, R8) for popover links.
- `min`, `max`, `step`: slider bounds and the sweep range.
- `licence_dependent`: marks inputs used only by B and C.

**params.json `metrics` block (per KPI)**
- `label`, `unit`: display.
- `better_direction`: `lower` | `higher` | `none`; drives the delta wording.
- `basis_tag`: e.g. ASSUMED for revenue, giving "SIMULATED (basis: ASSUMED)".

**params.json `scenarios` block**
- `licence_dependent`, `licence_source_ids`, `gate_text`: drive the gate card and stripe.

**layout.json (per element)**
- `label`: accessible name and hotspot title.
- `tag`: `OBSERVED` | `ASSUMED LAYOUT`; drives the hatch and badge.
- `open_question_id`: link to docs/open-questions.md.
- `tour_order`: presenter tour sequence (null if excluded).
