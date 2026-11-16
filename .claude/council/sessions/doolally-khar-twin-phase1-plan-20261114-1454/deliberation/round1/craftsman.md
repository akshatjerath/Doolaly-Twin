## Craftsman Position — Phase 1 plan: making the hard rules mechanical

**Core recommendation:** Every hard rule in CLAUDE.md gets one cheap, automated check that fails CI, set up in the Phase 2 scaffold before any engine or scene code exists. Rules enforced by review alone will drift by Phase 4. The minimum set is about 12 Vitest files, 1 Node script and 1 Playwright spec. No coverage percentage target.

**Key argument:**
The brief's hard rules are claims about data flow ("numbers only come from the event log or params.json", "every figure is tagged"). We can make those rules structural instead of checking them by eye.

(1) **One type for everything shown.** Put a single `Figure` type in `src/sim/figure.ts`:

```ts
export type Tag = 'VERIFIED' | 'OBSERVED' | 'ASSUMED' | 'SIMULATED';
export type Figure =
  | { kind: 'value'; value: number; unit: string; tag: Tag; source: string; ci95?: [number, number]; n?: number }
  | { kind: 'insufficient'; reason: string };   // renders "Insufficient evidence"
```

The HUD gets exactly one numeric renderer, `renderFigure(el, f: Figure)`. KPI functions return `Figure`, never `number`. An untagged number then cannot reach the screen without a type error.

(2) **params.json is validated at load and in a test.** A hand-written guard (no new dependency) checks that every entry has `{value, unit, tag, source, confidence, note}`. It also checks that `tag` is in the enum and that a `VERIFIED` tag cites a source id found in `reference/evidence-register.md`. The parsed register gives a set of ids, and the test fails on any id it cannot find.

(3) **A literal-ban test.** `tests/rules/no-hud-literals.test.ts` reads `src/hud/**/*.ts` and fails on a numeric literal outside a small allowlist (0, 1, CSS px in `*.css` only). This is the cheapest check that stops the Gemini "32% -> 4%" pattern from coming back.

(4) **A dist hygiene script.** `scripts/check-dist.mjs` runs after `vite build`. It fails if any file in `dist/` matches a hash or filename from `reference/photos`, `reference/street-view` or `reference/gemini`, or if the bundle contains the old Gemini KPI strings (`60.7`, `52.5`, `39.4`, `"verified"` in lower case).

The sim core gets the most tests because it is pure and every KPI rests on it. The known-answer checks matter most. The DES must reproduce M/M/c (Erlang C) mean wait within its CI when patience is infinite and there is one seat type. It must reproduce the M/M/c+M abandonment fraction against a closed form or a 1e6-arrival reference run, within tolerance. Without these, a nice-looking scene could sit on top of a broken engine.

**Sim-core test plan (Vitest, `src/sim/__tests__/`, all under ~3 s total):**

| File | What it guards |
|---|---|
| `rng.test.ts` | mulberry32 gives the same sequence from the same seed. Separate streams per replication do not collide. |
| `determinism.test.ts` | Same params and seed give a byte-identical event log (hash compare). Running in the worker and inline gives the same result. |
| `conservation.test.ts` | Property test over 50 random seeds: arrivals = seated + reneged + balked + waiting at close. Seats in use never exceed capacity. Event times never decrease. |
| `censoring.test.ts` | A hand-built 5-party log with a known answer. Reneged parties count their time waited (censored) in the all-arrival mean. Parties still waiting at close are censored at close time. A seated-only mean is computed separately and asserted to be *different*. This is a regression guard against the Gemini survivorship bug. |
| `queue-known-answer.test.ts` | Erlang C mean wait and M/M/c+M abandonment, each inside the 95% CI from N=200. |
| `stats.test.ts` | Median, p90 and t-based 95% CI on fixed arrays with hand-checked values. N < 200 is rejected in the reported-results path. |
| `paired.test.ts` | Baseline and scenario use seed i for replication i. With an identical scenario config, the deltas are exactly 0 and the CI is [0, 0]. |
| `gating.test.ts` | Scenarios B and C return `insufficient` / "requires Excise confirmation" unless `licenceAssumed` is true. |
| `params.test.ts` | Schema guard plus the VERIFIED-cites-register check. |
| `calibration.test.ts` | Parsing `visit-log.csv` handles the empty date column and tags the output `OBSERVED`. |

**CI (`.github/workflows/ci.yml`, separate from `pages.yml`):** `npm ci` -> `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) -> `vitest run` -> `vite build` -> `node scripts/check-dist.mjs`. `pages.yml` deploys only after these pass. The checks are fast, so developers will actually run them locally.

**Playwright (`tests/e2e/smoke.spec.ts`, one spec, run after each phase and in CI against `vite preview`):** it loads the page and fails on any `console.error` or `pageerror`. It waits for a `data-ready` attribute that the HUD sets after the first worker result. It asserts that every `[data-figure]` element has a `[data-tag]` child with a valid tag. It saves a screenshot artifact. No pixel diffing in Phase 3 or 4: WebGL output differs between machines, and baselines would cause flaky failures. Screenshots are for human review. Use `--use-gl=swiftshader` so CI renders headless.

**Module boundaries (one small PR each, each testable alone):**
`sim/rng` -> `sim/engine` (pure, no DOM) -> `sim/kpi` (event log -> `Figure`) -> `sim/replicate` (N seeds, paired) -> `sim/worker` (thin message shim) -> `data/params` (load + guard) -> `hud/*` (only consumes `Figure`) -> `scene/*` (reads layout config, never KPIs). Lint rule or test: `src/sim/**` must not import `three` or `src/hud`. `src/scene/**` must not import `sim/kpi`.

**Risks if ignored:**
- Maintenance or regression: a refactor of the engine silently goes back to seated-only waits. With no censoring fixture, nobody notices because the headline number goes *down*.
- DX or velocity: with no determinism test, any bug report about a "weird number" cannot be reproduced. Debugging the worker turns into guesswork.
- Pattern drift: a second ad-hoc number formatter appears in the HUD, bypasses tags, and the "every figure tagged" rule quietly fails on one panel.

**Dependencies on other domains:**
- Architect: confirm the event-log schema (event types: arrive, balk, renege, seat, depart, close) so the conservation and censoring tests target a stable shape.
- Prover/Skeptic: agree on the exact invariant list and the tolerance for the known-answer tests.
- Advocate: decide how `insufficient` and licence-gated states render, so the Playwright tag check has a stable DOM contract.
- Operator: Pages base path and whether CI runs the Playwright smoke test on every push or only on PRs.

---

### Appendix: hard rule -> enforcing check

| Hard rule | Enforcing check | Fails where |
|---|---|---|
| No hardcoded KPIs | `Figure` type as the only HUD input. `no-hud-literals.test.ts`. `check-dist.mjs` bans the Gemini KPI strings | tsc / Vitest / post-build |
| Every figure tagged, unknown = "Insufficient evidence" | `Figure` union with an `insufficient` variant. Playwright asserts `[data-tag]` on every `[data-figure]` | tsc / e2e |
| Do not mark things VERIFIED unless they are in the register | `params.test.ts` cross-checks VERIFIED sources against evidence-register ids | Vitest |
| Layout only from reference/layout, plus ASSUMED LAYOUT markers | Layout config entries carry `tag` and `openQuestionId`. A test asserts each ASSUMED id exists as a heading in `docs/open-questions.md` | Vitest |
| Photos / street-view / gemini never published | `check-dist.mjs` file-hash and filename scan of `dist/` | post-build |
| Walk-away %, censored all-arrival wait, median, p90, CIs from N>=200 | `censoring.test.ts`, `stats.test.ts` (rejects N<200), `queue-known-answer.test.ts` | Vitest |
| Paired seeds across scenarios | `paired.test.ts` (identical config gives zero delta) | Vitest |
| B/C licence-gated | `gating.test.ts` plus a Playwright check that the toggle is off by default | Vitest / e2e |
| Reproducibility | `determinism.test.ts` (event-log hash) | Vitest |
| TS errors fail the build | `tsc --noEmit` step before `vite build` in CI | CI |
| Verify each phase (screenshot + console) | `smoke.spec.ts`: zero console errors, screenshot artifact | e2e |
