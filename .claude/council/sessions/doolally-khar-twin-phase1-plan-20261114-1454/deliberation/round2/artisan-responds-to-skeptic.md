# Artisan Response to Skeptic

**Their position:** A polished 3D scene gives an unscaled sketch false authority; "0-75 seats" is an upper bound, not a value; photos, Street View and Gemini may justify notes only, never layout values.

**My response:** Modify

**Reasoning:** Skeptic is right that fidelity is itself a claim, so I am tying rendering fidelity to evidence instead of polishing everything evenly.

**Full fidelity: only elements whose existence the user has OBSERVED.** That means the three seating zones, the entrance, the steps, the pink passage (drawn as an opening only), and the gate with the pavement queue outside it (user, 2026-11-14). Materials and furniture *types* (pine 2/4-seat tables, bar-height on the awning side, tent roof, glass hall, pendants, bookshelf) are treated as style notes from the user-confirmed photos. They carry no values: every count, size and position stays ASSUMED.

**Visibly different "assumed" treatment, always on (no longer only behind the E-key toggle):** hatched orange-edged geometry for:
- the bar (I drop my "full-quality model");
- the lower-right zone's interior;
- the host podium;
- the step risers;
- ceiling heights.

The scene also gets a permanent watermark: "Schematic, not to scale; layout from hand sketch."

**Changes I accept:**
- I withdraw the "~X m" dimension labels. No metres or sq m appear anywhere; scale lives only in params.json as ASSUMED.
- The seat generator takes per-zone table counts as ASSUMED params, each with a `range`. Those counts cite the OBSERVED upper bound (`value: null`, high 75). Nothing is drawn as "75 seats".

**Scenario elements:** the lounge and takeaway counter keep a separate translucent blueprint style, plus Skeptic's non-dismissable "Hypothetical: licence unconfirmed" stripe.

**Omitted until the user confirms:**
- brew tanks;
- communal benches;
- string lights;
- signage or logo;
- any floor-level cue (no skyline, no street-level framing beyond the pavement).

The presenter tour still shows the badge and the watermark.
