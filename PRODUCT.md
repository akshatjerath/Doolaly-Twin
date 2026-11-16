# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Primary:** a first-time viewer of a Master of Design assignment (Digital Transformation Strategy, EA 2): a faculty assessor, a client-style reviewer, or a classmate. They arrive cold, have a few minutes, and must understand the twin in about 10 seconds and use it without instructions.
- **Presenter:** the student, who runs it live and records a pitch video.

## Product Purpose
An interactive 3D digital twin of Doolally Taproom, Khar (Mumbai), used as a case study. It shows a simulated evening in which walk-in parties wait for tables and some leave, and lets the viewer compare four ways of running the queue: the current manual queue, a digital waitlist, a small-pour wait lounge, and a takeaway counter.

Success: a viewer can state what the model shows, try a scenario, and tell which figures are evidence and which are assumptions.

## Positioning
An honest what-if model. Every number comes from the simulation's event log or a tagged parameter file, and every figure carries one of four tags: VERIFIED, OBSERVED, ASSUMED, SIMULATED. Unknowns read "Insufficient evidence". It does not claim measured outcomes.

## Operating Context
- Shown on a laptop during assessment and in a recorded pitch video; also opened on phones from a public GitHub Pages link.
- Not affiliated with the venue. The venue name is a case-study label only.

## Capabilities and Constraints
- Seeded discrete-event simulation; 200 paired evenings per scenario; results with run-to-run intervals and an input-uncertainty sweep.
- 3D scene, people and live counters are all played back from the same event log.
- The small-pour lounge and the takeaway counter depend on licence questions that are unconfirmed. They stay locked until the viewer ticks an explicit assumption, and their results stay marked hypothetical.
- Layout comes from the user's sketch and rough floor plan, plus assumptions marked ASSUMED LAYOUT. The 60 indicative seats and the plan scale are assumptions.
- Listing photos and Street View frames are visual reference only and are not included in the built site.
- The repository should stay private, or `reference/photos` and `reference/street-view` must be gitignored, because a public repository would publish them.
- The simulation logic is fixed except for four isolated, optional changes: the mid-run policy switch, reservations with lateness and no-shows, service-time multipliers, and guest interruptions (smoke or phone step-outs, washroom trips, wrong-order remakes; rates default 0). Each needs a unit test proving that neutral settings reproduce the previous results exactly.
- Terminology shown to viewers is plain language ("guests who leave", "typical wait"); model terms appear only in tooltips and the evidence panel.

## Evidence on Hand
- `reference/evidence-register.md`: sourced claims with status and confidence.
- `reference/visit-log.csv`: the user's own visits, three kinds of observation, each n=1:
  - Khar walk-in: about 30 minutes' wait (n=1).
  - Khar booked party of 18: about 0 minutes' wait, 5 to 10 minutes to join tables (n=1).
  - Chembur: 1 to 2 hours on busy evenings (n=1; the same recollection logged for three visits).
- `reference/layout/`: the user's sketch, rough floor plan and notes.
- `src/data/params.json`: every model input with tag, source, confidence and note.
- Absent, and not to be fabricated: arrival counts, party sizes, table-turn times, walk-away counts, any Khar price for a small pour, any confirmation of licence terms, any real dimension of the venue.

## Product Principles
1. Honest before impressive: an unflattering result is shown as it is.
2. One source of truth: what is drawn and what is counted come from the same log.
3. Evidence is always one step away: every figure shows its tag, and its source is reachable.
4. Understandable cold: plain words, few choices at a time, detail on demand.
5. Assumptions stay visible, including in screenshots and the presenter tour.

## Accessibility & Inclusion
WCAG AA contrast; fully keyboard operable; colour-blind-safe, with meaning never carried by colour alone; touch targets at least 44 px; all motion off under reduced-motion; usable on a phone.
