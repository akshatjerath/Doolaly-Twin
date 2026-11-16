# Explore/Present Split

## Problem Statement
How might AJ get an Explore surface that responsibly stands in for ground data he doesn't
have yet (crowd rate, serving time, break/remake rates), and a Present surface that reads as
fast and clearly as Gemini's 3-mode build — without breaking the seeded, evidence-tagged
simulation already built across steps 1-8.

## Recommended Direction
Two surfaces sharing one engine, not two engines or one overloaded screen.

**Explore** (new, sovereign posture — AJ's own tool, long sessions, dense controls fine):
sliders for arrival rate, service time, and the step-9a realism rates (smoke/phone breaks,
washroom trips, wrong-order remakes), plus seeded situation-type presets (fixed parameter
bundles, e.g. "Fri-Sat Peak Rush: λ=42/hr, 22m patience" — never true randomness; a "God
Mode" that injects unseeded chaos is explicitly rejected, it breaks the reproducibility tests
the engine depends on). When AJ locks in a set of values, both evenings (current state and
the selected policy) are simulated once at that moment — not re-run live — and the results
are frozen for Present to read.

**Present** (the existing built app, restyled — transient posture, demo surface): the
policy-card screen is replaced by a 3-mode switcher — "As-Is" / "My Fix" / "Manager's full
data" — that only changes which KPIs, camera framing, and scene elements are shown from
whatever Explore last locked in. Switching modes never re-runs the sim.

- **As-Is**: baseline policy, current scene only.
- **My Fix**: AJ's chosen alternate policy (Waitlist/Lounge/Takeaway — the old policy cards
  now live here as the sub-choice). Selecting a licence-dependent policy shows its
  corresponding object appearing in the 3D scene (e.g. a kiosk near the entry for the
  waitlist-kiosk policy), sourced from layout.json the same way existing markers are, tagged
  ASSUMED since its real position isn't confirmed. The object only appears when its policy is
  actually selected — not just because the "My Fix" tab is open.
- **Manager's full data**: before/after comparison + full results table. Disabled (not
  broken, not empty) until a real data file backs it — a poka-yoke, not a placeholder screen.

## Key Assumptions to Validate
- [ ] Doolally staff/bar/kitchen/bathroom/kiosk assets exist as usable 3D models in
      `Assests/`, or need building — check before promising any visual pass
- [ ] The mode-switch "preset bundle" mechanic can reuse the existing policy-card + scenario
      data model rather than inventing a parallel state shape — check `src/data/params.ts`
      and `src/hud/panels.ts` first
- [ ] Two weeks is enough for: Explore screen + step-9a realism extensions (test-gated) +
      Present restyle. If not, any new 3D asset work is the first thing to cut

## MVP Scope
**In:** Explore screen (sliders + seeded situation presets, ASSUMED-tagged, locks in a frozen
pair of evening results); Present restyled around the 3-mode switcher reading only those
locked values; smoke/phone/washroom/wrong-order as a fourth test-gated engine extension
(step 9a) with a reproducibility test proving neutral settings reproduce the current 36/51
test results exactly; the proposed-kiosk scene object tied to policy selection, not tab
selection.

**Out of this round:** a stock-out slider (would need its own fifth engine extension — parked,
not dropped); a "God Mode" that injects unseeded/non-reproducible events; a second simulation
engine for "Manager's view"; new 3D asset builds beyond what already exists in `Assests/`;
mobile layout for Explore (desktop-first; Present already has the phone layout from step 2).

## Not Doing (and Why)
- **True nondeterministic God Mode** — breaks the seeded-reproducibility contract the whole
  evidence system depends on.
- **Live-recomputing Present on every slider nudge** — the whole point of freezing at
  lock-in is that numbers can't drift mid-demo; a live-linked Present would silently
  reintroduce that risk.
- **A second "manager" engine** — one engine, three readings of it; a second engine doubles
  the honesty-tagging and bug surface for no real gain.

## Open Questions
- Do bar/kitchen/bathroom/kiosk assets already exist in the repo, or does someone need to
  source/build them?
- Should Explore ship in the submitted deliverable at all, or stay AJ's private tool with only
  Present handed in?
