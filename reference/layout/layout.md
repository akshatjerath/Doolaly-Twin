# Doolally Taproom, Khar: layout reference

Updated 2026-11-15. Describes `src/data/layout.json`.

Tag rule: OBSERVED is used only for what the user saw on their visits or confirmed in chat. Anything that comes from the rough floor plan alone is ASSUMED LAYOUT until the user confirms it.

## Sources (nothing here comes from the Gemini prototype)
1. `layout-sketch.png`: the user's first sketch, with a verbal key. Entrance bottom-left, open-air seating on the left, two inside seating areas on the right, steps between the entrance side and the inside hall, a passage at the top-left towards bathroom or kitchen.
2. `layout-rough-v2.webp`: a rough floor plan supplied by the user. It keeps the same arrangement and adds a bar, a kitchen, washrooms and a games-and-books shelf. The user says its table and seat counts are indicative, not literal.
   Origin of the rough floor plan: to be confirmed by the user.
3. User answers in chat: walk-ins wait on the pavement outside the gate; the steps go up, about 3 to 4 steps; both listing photos are of Khar (photo 1 = outdoor seating, photo 2 = inside hall).

No scale and no dimensions exist in either drawing.

## What the layout data contains
Coordinates are pixels in `layout-rough-v2.webp` (building outline x 15-1290, y 40-950), used for proportions only.

| Area | Position | Tag | Basis |
|---|---|---|---|
| Entrance and gate | Street edge, bottom-left | OBSERVED | User sketch |
| Pavement queue | Outside the gate; public space | OBSERVED | User answer in chat |
| Outdoor seating | Left side | OBSERVED | User sketch |
| Steps | Between the entrance side and the inside hall, going up. 3 to 4 steps, 4 used in the model | OBSERVED (that they exist and go up) | User sketch and chat |
| Indoor seating | Right side, upper part | OBSERVED | User sketch |
| Indoor seating, street side | Right side, lower part | OBSERVED | User sketch (second inside box) |
| Bar with stools | Along the back of the inside hall | ASSUMED LAYOUT | Rough floor plan only |
| Kitchen | Top-right | ASSUMED LAYOUT | Rough floor plan only; interior not modelled |
| Washrooms | Top-left | ASSUMED LAYOUT | Rough floor plan only (the sketch has "passage to bathroom or kitchen" here); interior not modelled |
| Games-and-books shelf | Along the side wall | ASSUMED LAYOUT | Rough floor plan only |

Details taken from the listing photos (tagged "listing photo, user-confirmed as Khar", not OBSERVED):
- Outdoor: tent roof, plank floor, bar-height pine tables with stools (photo 1).
- Inside: glass walls, pendant lamps, standard-height pine tables, a shelf of board games (photo 2).

## ASSUMED LAYOUT (not established by any source)
- **Scale:** 0.0165 m per plan pixel. Implied footprint about 21 m by 15 m, about 315 square metres. Insufficient evidence that this matches the real venue.
- **Step count:** 4 used in the model; the user recalls 3 to 4.
- **Step rise:** 0.15 m per step.
- **Bar:** position, length, number of taps and stools. Bar stools are not counted as seats.
- **Kitchen and washrooms:** positions from the rough plan; interiors not modelled.
- **Landing below the steps:** the plan shows it walled on all sides; the model assumes it opens onto the outdoor side.
- **Gate width, wall heights, ceiling and roof heights, host stand position.**
- **Table counts and arrangement:** 4 outdoor four-seat tables; indoors one eight-seat and two six-seat tables at the back, four six-seat tables on the street side: 60 seats, indicative. Seat count is among the most sensitive inputs. The sensitivity sweep varies it one table group at a time: outdoor four-seat tables 2 to 6, outdoor two-seat tables 0 to 4, indoor eight-seat tables 0 to 2, indoor six-seat tables at the back 1 to 4, on the street side 2 to 6. In the current sweep only time at table and arrival rate move the walk-away share more.
- **Positions of plants, chalkboard and lamps.**
- **Scenario B wait lounge and scenario C takeaway counter:** neither exists; where they would sit is a design proposal.
- **Floor level:** not established. Nothing in the scene implies a storey or rooftop.

## Open questions (also in `docs/open-questions.md`)
1. Who made the rough floor plan, and from what?
2. Are there 3 or 4 steps?
3. Is the outdoor area covered all year?
4. Where would the scenario B lounge and the scenario C counter sit? (Both ASSUMED LAYOUT.)
5. Is the bar where the plan shows it? Do walk-in parties use the bar stools?
6. How do guests reach the landing below the steps?
7. Real table and seat counts per area.
8. Any real dimension, to fix the scale.
