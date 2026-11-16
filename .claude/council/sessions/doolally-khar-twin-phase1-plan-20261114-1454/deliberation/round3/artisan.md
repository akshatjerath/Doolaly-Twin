# Artisan Final Position: Phase 1 plan, 3D scene

**Revised recommendation:** Rendering fidelity follows the evidence. User-observed elements are drawn at full fidelity. Unknowns are drawn with a permanent hatched ASSUMED treatment. Unconfirmed items are not drawn at all. One shared `tokens.json` drives tag colours, glyphs and chips in both the HUD and the scene.

**Concessions made:**
- The bar is no longer a full-quality model. It gets the ASSUMED treatment.
- The assumed treatment is always on, not only behind the E-key overlay.
- Metre labels appear only inside the overlay, each marked ASSUMED. The default view shows no m or sq m values.
- Seat counts are ranged ASSUMED params that cite the OBSERVED upper bound ("0-75", value null). The scene never shows "75 seats".
- Photos supply style notes only (materials, furniture types), never values.

All of these concessions follow Skeptic's point that fidelity is itself a claim.

**Non-negotiables:**
- Tag colours are Okabe-Ito, always paired with a glyph and a label. Chips pass AA contrast in a CI test.
- The ASSUMED badge and the "Schematic, not to scale; layout from hand sketch" watermark appear in every capture, every screenshot and presenter mode.
- "Proposed" (scenarios B/C) never looks like "assumed": ghost style plus a non-dismissable "Hypothetical: licence unconfirmed" stripe.
- KPIs never use count-up tweens.
- Reduced motion turns camera flights into 150 ms crossfade cuts, with no auto-tour motion and no rain.

**Implementation notes:**
- Modules under `src/scene/`: layout, geometry, materials, lighting (cosmetic presets), post, props (instanced, generated from params), characters (driven only by the event log), cameras, hotspots, evidence.
- Tests:
  - seats drawn in the scene equal seats in the sim;
  - the presenter tour includes a step showing the bar marked ASSUMED;
  - a string lint rejects floor-level words.
- ASSETS.md lists Poly Haven, ambientCG, Kenney and Quaternius assets with licence and URL.

## Final per-zone table

| Element | Established (by what) | Drawn as ASSUMED LAYOUT | Omitted until confirmed |
|---|---|---|---|
| Entrance / gate | Bottom-left position (user sketch); gate exists, queue outside it (user answer) | Gate width and swing, host podium | Signage, logo, Street View facade details |
| Pavement queue area | Walk-ins stand on pavement outside gate (user answer) | Pavement depth; labelled "public pavement, not venue" | Any queue capacity or seating |
| Outdoor seating | Tall left zone (user sketch); tent roof, plank floor, bar-height pine 2/4-seat tables (photo 1, confirmed by user) | Dimensions, table count and spacing, roof height, open vs enclosed | Communal benches, string lights |
| Steps | Level change exists (user sketch) | Risers, rise height, direction, width | None |
| Large inside hall | Top-right zone (user sketch); glass walls, pendants, fans, cushioned pine tables, bookshelf (photo 2, confirmed by user) | Dimensions, table count/mix, shelf position, solid vs glass walls | Projector (unconfirmed) |
| Lower-right inside room | Exists, "inside" (user sketch, low confidence) | Whole interior (hall material set, hatched) | None |
| Passage | Top-left, bathroom/kitchen (user sketch, user unsure) | Opening only, side assignment | Room interiors |
| Bar | None (user answer: unknown) | Position, length (hatched) | Brew tanks, taps detail |
| Takeaway counter | None (Scenario C, licence unconfirmed) | Not ASSUMED: drawn as proposed ghost, scenario-gated | In base scene |
| Wait lounge | None (Scenario B, licence unconfirmed) | Not ASSUMED: drawn as proposed ghost, scenario-gated, inside the boundary | In base scene |
| Scale | Proportions only (user sketch) | `scale_m_per_px` param; metres shown in overlay only | Default-view dimensions |
| Seat counts | Upper bound of about 75 (user answer, low confidence) | Per-zone table counts, ranged | "75 seats" as a value |
| Ceiling heights | None | Every height | None |
| Floor level | Not established | None | Any cue: skyline, rooftop, storey framing |
