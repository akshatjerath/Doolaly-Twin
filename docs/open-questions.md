# Open questions (answer these to remove ASSUMED LAYOUT markers)

## Chembur layout v1 (2026-11-24): the layout now in the model
Source: two digital floor plans and two hand sketches of Doolally Taproom, Chembur, supplied by the user. Not visited. The plans carry no scale, so every dimension is ASSUMED (0.0068 m per px). The Khar sections below are kept as history only; they no longer drive the layout.
- Seats read from the plans: 23 tables, 81 seats (50 outdoor on 13 tables, 31 indoor on 10 tables). Bar stools are not drawn, so none are counted.

Zones, each ASSUMED LAYOUT, with its open question:
- Entrance from main road: door width and where the host stands.
- Pavement queue (public space): where does the line form on a busy night?
- Outdoor seating: real outdoor dimensions, covering and table sizes.
- Passage between outdoor and indoor: how do guests get from the outdoor seating to the indoor door? The plans show two doors but not the link; no steps are drawn.
- Indoor seating: real indoor dimensions, pillars (not modelled) and table sizes.
- Bar: are there bar stools, and do walk-ins use them?
- Kitchen entry: the interior is not modelled.
- Bathroom entrance: the interior is not modelled.

Other open points:
1. Table I-10 (the only indoor four-seat table) is a "Server station" on the hand sketch. It is counted as a table; confirm.
2. Evidence still from Khar: the visit log, register entries and the notes in `params.json` (arrival counts, wait times, patience) describe Khar, not Chembur. They are not Chembur evidence; the Chembur visit is not yet done.
3. Proposed kiosk, lounge and takeaway positions are design proposals, not observed.
4. Licence: can the venue serve small pours in a waiting area or sell takeaway? (register R8)

## Superseded: Khar history (2026-11-14)
## Answered by the user (2026-11-14). Tag: OBSERVED, user recall, low confidence
- Both photos in `reference/photos` are of Khar. Photo 1 = left open-air zone; photo 2 = large inside hall.
- Waiting walk-ins stand on the pavement outside the gate.
- Steps go **up** from the entrance side to the inside hall, about 3-4 steps.
- Seats: left outdoor tables hold about 20-30 people; inside "not sure, go with 40" (a guess, so ASSUMED); the small section about 15-20.
- Kitchen and bar stop taking orders at 12 midnight; the bar closes at 1 AM (matches register D5 "till 1 AM").
- Bar / tap counter position: unknown. Stays ASSUMED LAYOUT.
- Test devices: not decided; "bare minimum".

## Table check from the photos (visual reference only, counts are of what is visible)
- Photo 1 (outdoor): 4 bar-height four-seat tables in a row plus about 5 two-seat tables along the wall, about 26 seats in frame. Consistent with the user's 20-30.
- Photo 2 (inside hall): partial view, at least 5 standard-height tables of about four seats. Not a full count; cannot confirm 40.
- Neither photo shows communal benches, brew tanks or string lights; these are left out of the scene.

## Still open
1. "Small outside section, 15-20": is this the lower-right box? The sketch notes call that box inside. Until confirmed it is modelled as the lower-right zone with its open/enclosed state marked ASSUMED LAYOUT.
2. Seat totals conflict: zones add up to about 75-90, the earlier total was "0-75". Both are kept as ranges; no single seat count is shown.
3. Where are the bar/tap counter, POS counter and any takeaway counter?
4. Seats or tables in the large inside hall (currently the user's guess of 40).
5. Which way does the entrance face the street? What is behind the passage (bathroom or kitchen side)?
6. Dates and times of the Khar and Chembur visits (fill `reference/visit-log.csv`).
7. Licence: can a restaurant licence serve small pours in a waiting area or sell takeaway? (Excise office / consultant)
8. A price for a small pour, if any source exists. Otherwise lounge revenue reads "Insufficient evidence".
9. Which laptop and phone to test on.

## Update: rough floor plan from the user (2026-11-14, `reference/layout/layout-rough-v2.webp`)
This plan supersedes the first sketch. The user says its table and seat counts are indicative, not literal.
- Now placed from the plan (OBSERVED, low confidence): entrance, outdoor seating, steps, one indoor hall, board games and books shelf.
- Bar: position from the plan only; fittings not modelled (ASSUMED LAYOUT).
- Kitchen: position from the plan; interior not modelled (ASSUMED LAYOUT).
- Washrooms: position from the plan; interior not modelled (ASSUMED LAYOUT).
- The earlier "small section" is the street-side part of the same indoor hall.
- Model seats: 60 at tables (16 outdoor, 44 indoor). Bar stools are not counted as seats.

Still open after this plan:
1. Do walk-in parties use the bar stools?
2. How do guests reach the landing below the steps? The plan shows it walled; the model assumes it opens onto the outdoor side.
3. Real table and seat counts per area.
4. Scale: no dimension is known. The assumed scale implies about 21 m by 15 m (about 315 square metres); insufficient evidence that this matches the real venue.
5. Who made the rough floor plan, and from what?
6. Are there 3 or 4 steps? (4 used in the model.)
7. Is the outdoor area covered all year?
8. Where would the scenario B lounge and the scenario C counter sit? (Both ASSUMED LAYOUT.)
9. Bar: is it where the rough plan shows it? (ASSUMED LAYOUT until confirmed.)
10. Waitlist kiosk (proposed, step 9b): where would it stand, and is it a kiosk at all rather than a host with a tablet? Drawn just inside the gate, left side. (ASSUMED LAYOUT.)
