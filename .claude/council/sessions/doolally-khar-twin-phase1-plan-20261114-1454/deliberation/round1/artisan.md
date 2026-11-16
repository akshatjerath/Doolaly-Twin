# Artisan Position: Phase 1 plan, honest studio-grade 3D scene

**Core recommendation:** Build the scene from a `layout.json` derived from the sketch rectangles. Every element in it carries an evidence tag and an open-question id, and the look comes from materials and light seen in the two photos, not from the brief's generic taproom list. Every invented fact is shown in the scene through one shared token system: an evidence overlay, hotspot cards and a persistent "layout partly assumed" badge. Assumptions stay visible without ruining the image.

**Key argument:**
The references give us a strong material and lighting story. They give us almost no geometry. The photos establish:
- pale pine boxy furniture: bar-height 4-seat tables with stools on the awning side, standard 2- and 4-seat tables with white-cushioned chairs in the hall;
- a wood-plank floor and white textured plaster walls;
- a white tent-fabric pitched roof on steel tubes with a scalloped valance;
- frameless glass walls with black corner mullions;
- white dome pendants, ceiling fans, and globe lamps on a low white wall;
- warm LED strips under ledges, a blank chalkboard, planters, a host podium, and a corner library / board-game shelf.

Street View adds the low white wall, the white slatted gate, a black pavement railing and the crowd on the pavement. The references do **not** give scale, seat counts, ceiling heights, the bar, the steps' height, or the floor level.

The brief's own list (copper brew tanks and taps, communal benches, string lights) contradicts the photos. The references win. Brew tanks and benches are left out unless the user confirms them, and the photographed globe and pendant lamps replace string lights.

Because the image is built mostly from observed material cues, the look can be photographic while every dimension is honestly ASSUMED. That only works if the HUD and the scene use one token set for evidence.

**ASSUMED LAYOUT treatment (three layers, one vocabulary):**
1. **Always on (low key).** A small evidence glyph decal on the floor at the base of each assumed element. A corner badge reads "Layout partly assumed: N elements · press E". The badge stays in Presenter mode too, which is non-negotiable so the pitch video cannot pass assumed geometry off as fact.
2. **Evidence overlay (E key / HUD toggle).**
   - Assumed meshes get a dashed screen-space outline in `tag-assumed`, using the postprocessing OutlineEffect with a pattern texture.
   - Assumed dimensions show as dashed dimension lines labelled "~X m ASSUMED".
   - Zone footprints show the sketch rectangle, with a "no scale in source" note.
   - OBSERVED and VERIFIED elements get no outline, so the noise falls on the uncertain elements only.
3. **Hotspot cards.** Each card shows:
   - a title and an evidence chip;
   - "What we know" (with the source file) and "What is assumed";
   - "What would change this", plus the `OQ-xx` link to docs/open-questions.md.

**How specific elements are drawn:**
- **Bar / tap counter:** full-quality model, marked ASSUMED. Its card says "Position unknown (user, 2026-11-14)".
- **Takeaway counter and wait lounge:** these are **proposed** scenario elements (B and C, licence unconfirmed), not assumed ones. They render only when their scenario is on, in a distinct "ghost" material (translucent, blueprint edge), with a "SCENARIO · licence unconfirmed" chip. "Exists, but we don't know where" must never look the same as "doesn't exist".
- **Seat counts:** furniture is placed by a generator from `params.json` zone table counts (ASSUMED) using the OBSERVED table types. It asserts that total seats stay at or below the user's ~75 upper bound, so the scene and the sim cannot disagree.
- **Scale:** one parameter, `layout.scale_m_per_px` (ASSUMED, note: chosen so the observed table types fit the zones at a seat total of 75 or fewer).
- **Ceiling heights:** `layout.ceiling_*` (ASSUMED).

**Scene modules (`src/scene/`):**
- `layout/`: loads `src/data/layout.json` (rect_px, kind, tag, oq_id).
- `geometry/`: floor slabs, walls, glass, steps, awning, gate, pavement; all built from layout data.
- `materials/`: one library keyed by name (pine, plaster, plank floor, tent fabric, glass, brushed steel, chalkboard, pavement).
- `lighting/`: presets for late afternoon, evening, night, plus a rain toggle, all labelled *cosmetic*.
- `post/`: ACES tone mapping, SMAA, bloom limited to emissives, AO, the evidence outline pass.
- `props/`: instanced pine tables, stools and chairs; pendants, globes, fans, planters, shelf, podium.
- `characters/`: driven only by the sim event log.
- `cameras/`: orbit, isometric and first-person modes, plus `flyTo`.
- `hotspots/`
- `evidence/`: overlay, decals, badge, legend.

The furniture in the photos is boxy pine, so procedural geometry matches it better than a downloaded kit.

**CC0 asset plan (each entry recorded in ASSETS.md: file, source, URL, licence, author, use, modified y/n, fetch date):**

| Category | Source |
|---|---|
| Evening and night urban HDRIs; wood and plaster textures | Poly Haven |
| PBR floor, plaster, fabric, metal, concrete, glass-smudge sets | ambientCG |
| HUD and hotspot icons; fallback props | Kenney |
| Low-poly animated people; plants | Quaternius |
| Signage | none. The venue name appears only as a plain text label, with no logo or Marathi signboard. |

**Visual tokens:** one `src/ui/tokens.json` is the single source. It is emitted as CSS variables for the HUD and as `THREE.Color` values for the scene.

| Tag | Colour (Okabe-Ito) | Glyph | Line style |
|---|---|---|---|
| VERIFIED | blue #0072B2 | filled circle + check | solid |
| OBSERVED | bluish green #009E73 | diamond | solid |
| ASSUMED | orange #E69F00 | triangle | dashed |
| SIMULATED | reddish purple #CC79A7 | hexagon | dotted |
| Insufficient evidence | neutral grey #8A8A8A | hollow square | hatched |

- Colour is never the only cue: a glyph and the text label are always present.
- Chip text uses near-black on the three light tags and white on VERIFIED. A CI contrast test enforces at least 4.5:1, and a deuteranopia/protanopia simulation check runs on the legend.
- Spacing: 4 px base (4/8/12/16/24/32).
- Type: one sans for the UI and one tabular-figure mono for numbers; scale 12/14/16/20/28.
- Light and dark HUD surfaces are both semantic tokens.

**Motion:**
- Every motion answers "where am I / what changed".
- HUD durations: 120 ms micro, 200 ms panels, ease-out on enter and ease-in on exit.
- Camera `flyTo`: 900 ms ease-in-out. This is a deliberate exception to the 500 ms cap, because spatial orientation needs it.
- KPI numbers **never count up**: a tween would display values that never existed in the event log.
- Characters move only on event-log timestamps, with no decorative idle wander.
- Under reduced motion:
  - camera flights become a 150 ms crossfade cut;
  - no auto-orbit or presenter auto-tour motion; the tour steps on keypress;
  - rain is off and bloom does not flicker;
  - characters still update position (they are data) but snap rather than glide.

**Risks if ignored:**
- Hierarchy breakdown: a polished render reads as surveyed fact, and judges or users trust geometry that is invented.
- Accessibility failure: red/green tag colours or colour-only tags are unreadable for about 8% of men. A light-green chip with white text fails AA.
- Design-system debt: separate HUD and scene colour constants drift, and the overlay shows different tag colours from the cards.

**Dependencies on other domains:**
- **Architect:** the `layout.json` schema (rect_px, tag, oq_id) and params fields `layout.scale_m_per_px`, `layout.ceiling_*` and `zone.*.tables_{2,4}`.
- **Alchemist / sim:** an event-log format with per-party positions and timestamps to drive characters, and a seat-total param shared with the scene.
- **Advocate:** keyboard and focus order for hotspots and the overlay, and mobile HUD layout.
- **Tuner:** texture budget (2K maximum, KTX2), shadow-map size, a mobile tier that drops AO and bloom.
- **Guardian:** confirm that ASSETS.md licence fields and the References panel credit wording are sufficient.
- **Strategist:** the weather and time-of-day presets are V1-optional polish; the evidence overlay is not.

## Appendix: per-zone established vs assumed

| Zone | Established by references (tag) | Must be invented (ASSUMED LAYOUT + OQ) |
|---|---|---|
| Entrance (red) | Bottom-left position in sketch (OBSERVED, user). White low wall, white slatted gate, globe lamps on wall posts, black pavement railing, scalloped awning edge (OBSERVED, street view frames). Walk-ins wait on pavement outside gate (OBSERVED, user). | Gate width and swing, pavement depth, orientation to the street, host podium position (a podium is seen in photo 1 near a white gate, but the matching is unconfirmed). Floor level is **not** established, even though street view suggests a street-level terrace. |
| Outdoor / awning seating (left, tall) | Photo 1 confirmed as this zone (user). Tent-fabric pitched roof on steel tubes, scalloped valance, plank floor, white plaster wall, bar-height pine 4-seat tables + stools, 2-seat tables along the wall, chalkboard, planters, warm under-ledge LED, glass window into an inner room (OBSERVED, photo). | Zone dimensions, roof height and pitch, table count and spacing, whether it is fully open-air or partly enclosed (OQ 1), what the inner room behind the glass is. |
| Inside hall (top-right, large) | Photo 2 confirmed (user). Frameless glass walls with black mullion, the awning visible beyond the glass, white dome pendants, ceiling fans, standard-height pine tables with white-cushioned chairs, corner library / board-game shelf, ceiling-mounted device (brief calls it a projector; unconfirmed) (OBSERVED, photo). | Dimensions, ceiling height, table count and 2/4 mix, shelf position within the hall, which walls are glass vs solid. |
| Inside lower-right (bottom-right) | Exists and is "inside" per user key (OBSERVED, low confidence: "confirm"). | Everything visual: materials, furniture type, enclosure, seats. Default to the hall's material set, fully marked. |
| Steps (yellow) | A level change exists between the entrance side and the hall (OBSERVED, sketch). | Number of risers, rise height, direction (up or down), width. |
| Passage to bathroom / kitchen (pink) | Exists top-left, partly outside the outline (OBSERVED, user unsure). | Which side is bathroom vs kitchen; render as a door or opening only, with no interior. |
| Bar / tap counter | Nothing (user: unknown). | Position, length, back-bar; full model with an ASSUMED outline. No brew tanks unless confirmed. |
| Takeaway counter (Scenario C) | Nothing; licence unconfirmed. | Proposed ghost element, scenario-gated, never in the base scene. |
| Wait lounge (Scenario B) | Nothing; licence unconfirmed. | Proposed ghost element, scenario-gated. The base scene's queue stands on the pavement only. |
| Global | Proportions from sketch pixel rectangles (OBSERVED). Total seats at most ~75, low confidence (OBSERVED, user recall). | Scale (m/px), all ceiling heights, exits, per-zone seat split. |
