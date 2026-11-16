## Skeptic Final Position: Phase 1 plan

**Revised recommendation:** The plan is acceptable once the guards below are written into the registry spec, test plan and docs. Honesty must be enforced by schema and tests, not by good intentions. Scene fidelity, worker topology and the KPI maths as agreed in Round 2 are sound.

**Concessions made:**
- Studio-grade scene accepted (the brief requires it). Full fidelity only for user-observed elements; hatched treatment for unknowns is enough.
- Revenue may be hidden from the HUD headline by default (Alchemist), on condition that it is *always* present in the results/report panel. The brief requires revenues to be reported, so "hidden" must not mean "absent".
- Correction accepted: R2 (beer 21 / spirits 25) is press-verified, not a conflict. Conflicts are R3 (wine age) and D5/D6 (cost for two).
- A one-at-a-time tornado is enough for Phase 1; global sensitivity analysis is deferred.
- Items already conceded by Artisan/Alchemist (null = "Insufficient evidence", ranged ASSUMED params, censored KM wait, CRN streams, hero = rep 0 test, 75 as upper bound, omitted benches/tanks/signage) are not repeated below.

**Non-negotiables (final list):**
1. Facts leaking from photos/Street View/Gemini -> `source` must cite `reference/layout/*`, a register row id, a visit-log row, or the user interview; other paths are rejected -> registry rule + Vitest.
2. Reference images shipped -> post-build check: no file in `dist/` may match a `reference/` hash or a non-allowlisted image -> test (CI).
3. Hardcoded KPIs in the HUD/presenter -> no numeric literals in `src/ui/**` or the presenter script; KPI manifest maps every field to an event-log reducer or params path -> lint + test.
4. A strong-looking tag on weak inputs -> output tag carries its basis, "SIMULATED (basis: ASSUMED)", derived from the weakest input -> registry rule + test.
5. CI read as forecast confidence -> every CI labelled "sampling noise only"; the parameter-sweep band is shown with it -> UI element.
6. B/C read as endorsed -> red "Hypothetical: licence unconfirmed" stripe on every B/C output, including presenter mode and exports -> UI element + render test.
7. Assumed layout lost in captures -> "Layout partly assumed: N" badge composited into every capture/export path -> UI element + test.
8. Scene and sim disagree on seats -> instanced seat count == `total_seats`, and total ≤ 75 -> test.
9. n=1 wait passed off as calibration -> calibration status "Insufficient evidence"; the word "calibrated" is banned in UI copy -> doc (`method.md`) + string lint.
10. Pavement treated as venue space -> `pavement_queue` zone `ownership: public`, drawn outside the gate line -> registry/layout rule + UI label.

**Implementation notes:**
- C price: ASSUMED with `source: D1, E2` and a note "historical/analogue, undated; Khar availability unverified".
- Range bounds need a `note` giving their origin, or "illustrative".
- Track each guard as a test id or doc anchor in `docs/open-questions.md` / the test plan, so Phase 2 can check them off.
