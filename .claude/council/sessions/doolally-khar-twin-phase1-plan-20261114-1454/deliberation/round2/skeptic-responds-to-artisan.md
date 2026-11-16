## Skeptic Response to Artisan

**Their position:** Render a studio-grade scene. Materials and light come from observed cues, and all geometry comes from `layout.json` and is tagged. The bar is fully modelled and tagged ASSUMED. Seats come from a generator capped at about 75. Low-key decals are always on, a badge stays in Presenter mode, and B/C elements render as scenario-gated ghosts.

**My response:** Modify

**Reasoning:** The approach is sound and I accept studio grade because the brief requires it. The three-layer vocabulary and the ghost-versus-assumed distinction are better than what I proposed. Two gaps remain.

First, the fully modelled bar at one fixed spot is the most authoritative-looking invented fact in the scene. Its dashed outline only appears behind the E key, so a screenshot or video shows a polished bar with only a floor decal near it.

Second, the badge is presumably DOM. `canvas.toDataURL` exports and the WebGL frame lose it, and decals are easy to miss at presenter camera distances.

Two smaller points. The seat generator enforces only the upper bound and is not cross-checked against the sim. Dimension labels in metres ("~X m") make an invented scale look like it was measured.

**Minimum guards I would accept:**
1. Draw the badge text into the WebGL frame as well, or composite it onto every export path, so captures always carry "Layout partly assumed: N".
2. Put a Presenter-tour step that looks at the bar with its outline forced on and its card open.
3. Bar card note: "position illustrative, one of several plausible". Add a "relocate bar" param, even with a single default, so it reads as a variable.
4. A Vitest scene/sim agreement test: instanced seat count == `total_seats` param; total ≤ 75; total ≥ the minimum the table types allow.
5. Metre labels only inside the overlay, always suffixed ASSUMED. No scale bar in the default view.
6. Show nothing above or below the venue (no building storeys or stairwell context), so the render does not imply a floor level.
7. Lighting presets keep their "cosmetic" label in the legend.

I would not block anything else.
