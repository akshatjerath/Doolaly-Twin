# PROMPT FOR CLAUDE CODE: Doolally Khar Digital Twin (EA 2)

Paste everything below the line into Claude Code, run from an empty repo folder.
Before you start, put these in the repo under `/reference/`: your Khar photos (`/reference/photos/`), your layout sketch (`/reference/layout.jpg` or a description in `/reference/layout.md`), `evidence-register.md`, and the two Gemini files (`gemini/doolally_sim_engine.py`, `gemini/twin_v2.html`) as a *prototype to learn from, not to copy*.

---

## ROLE AND GOAL
You are a senior creative technologist. Build a **publishable, high-fidelity 3D interactive digital twin of Doolally Taproom, Khar (Mumbai)**, hosted on GitHub Pages, for a Master of Design assignment on Digital Transformation Strategy. Visual quality target: a polished studio-grade 3D walkthrough (reference: the Mokai Café 3D walkthrough, i.e. first-person + overview modes, hotspots with smart zoom). It is NOT a flat "dashboard with a few boxes". Treat the existing Gemini prototype as a rough sketch to surpass.

## THE BUSINESS CASE (what the twin must prove)
Problem: walk-in parties wait for tables at peak times with poor wait visibility, and some leave (balk/renege). Intervention scenarios:
- **A. Digital waitlist**: a QR/WhatsApp token with a live, single-point wait estimate. No licence dependency.
- **B. Small-pour wait lounge**: waiting guests order ~150 ml pours and snacks. **Licence status UNCONFIRMED** (FL-III rules on serving in waiting areas not found). Mark clearly.
- **C. Takeaway from the same counter** (Effingut 2 Go-style growlers). **Needs separate licensing; UNCONFIRMED.** Mark clearly.
- **Baseline**: current manual queue.
Everything the twin shows must be tagged as one of: `VERIFIED` (source cited), `OBSERVED` (user's own visits), `ASSUMED` (my modelling choice), `SIMULATED` (model output).

## HARD RULES (non-negotiable)
1. **No hardcoded KPIs.** Every number on screen is computed from the simulation or read from `params.json`. The Gemini prototype hardcoded "32% → 4%", "62 → 18 min"; do not repeat that. If a result is unflattering, show it.
2. **One source of truth.** The 3D agents are rendered *from* the simulation state. KPIs come from the same event log. No separate "visual" and "stat" logic.
3. **Parameter registry.** Create `src/data/params.json`; each entry = `{ value, unit, tag, source, confidence, note }`. The UI shows the tag next to every input and output. Use `/reference/evidence-register.md` for tags. Anything not in the register is `ASSUMED`, and must be adjustable with a slider.
4. **No invented facts.** Do not fabricate prices, capacities, laws, studies or quotes. Unknown = "Insufficient evidence" in the UI, not a guess. Known conflicts (age 21/25, cost for two, Khar hours) are shown as conflicts.
5. **Do not label things verified unless they are in the register.** Specifically NOT verified: "FL-III red-ink plan", "1 m BMC corridor", Mug Club +50%, 6th-floor layout, seat counts, MI-match waits, the 2025 Journal of Travel Research paper. Use the register's verified papers (De Vries, Roy & De Koster 2018; Aksin, Gencer & Gunes 2025; Baek 2018) for behavioural claims.
6. **Average wait must not hide walk-aways.** Report: walk-away %, mean wait of ALL arrivals (counting reneged parties' waited time as censored), median and p90 wait, seat utilisation, lounge revenue, takeaway revenue, lost-party count. Show 95% confidence intervals from N >= 200 seeded replications.
7. **Layout comes from the user's reference only.** Read `/reference/layout.*` and the photos. If something (entrance, bar, takeaway counter, waiting space, seat counts) is missing, put a visible `ASSUMED LAYOUT` marker in the scene and list the gaps in `docs/open-questions.md` rather than inventing silently.
8. **Credit and licensing.** Photos are the user's reference from listings/web: use them only as visual reference and credit them in an in-app References panel. Use only CC0 / permissively licensed assets (Poly Haven, Kenney, Quaternius, ambientCG) and record each in `ASSETS.md` with licence + URL. No copyrighted brand assets beyond the venue name used as a case-study label.
9. Never commit secrets. Stage and commit in small logical commits with clear messages; do not push or open PRs until I say "go".

## TECH STACK
- Vite + TypeScript + `three` (npm, current stable; no CDN script tags) + `postprocessing` (pmndrs) + `lil-gui` or a custom React-free HUD built with plain DOM/CSS (keep dependencies small). Optionally React for the HUD only if justified.
- Simulation in a **Web Worker** (`src/sim/`): seeded RNG (mulberry32), discrete-event engine, pure functions, unit-tested with Vitest. Port and FIX the Gemini Python logic: it assumed patience ranges (20-34 vs 46-68 min) with no source; make patience a calibrated, adjustable, tagged parameter with a stated assumption, and add the option to calibrate from the user's observed visit log in `/reference/visit-log.csv` (arrival time, party size, wait, outcome).
- Build to a static site; GitHub Actions workflow to deploy to **GitHub Pages** (correct `base` path), with a build that fails on TypeScript errors.

## GRAPHICS BRIEF (the part that must be exceptional)
Aim for a warm, atmospheric, believable taproom. Concretely:
- **Rendering**: physically based materials (MeshStandard/Physical), ACES filmic tone mapping, sRGB output, soft shadows (PCFSoft or VSM) from key lights, an HDRI environment (Poly Haven) for reflections, subtle fog/volumetric light shafts, warm string-light bulbs with emissive glow.
- **Post-processing**: SMAA, selective bloom on lights, N8AO/SSAO, gentle vignette + colour grade, optional depth-of-field in overview mode. Provide a Quality toggle (High / Medium / Low) with auto-downgrade if frame time > 22 ms.
- **Modelling**: build the room from the layout with believable proportions (wood communal tables and benches, copper/steel brew tanks and taps, chalkboard menus, bookshelf of board games, glass partition, awning/terrace as shown in the photos). Use instancing for repeated objects. Add small details (glassware, plants, signage, wear on materials) so it does not look like primitive boxes. Use real textures (ambientCG/Poly Haven) with normal/roughness maps; compress with KTX2/meshopt if heavy.
- **People**: stylised but well-animated characters (CC0 rigged models, GPU-skinned/instanced), with walk, sit, stand-waiting, drink and gesture states. No floating robot boxes. Party sizes vary. Add queue behaviour that visibly matches the sim state (queue line, leaving guests walking out).
- **Camera**: (1) First-person walkthrough (pointer lock + WASD, touch joystick on mobile) and (2) Overview (smooth orbit, isometric preset). Smooth transitions between modes. **Hotspots** with smart zoom (click to fly to a point of interest: entrance, bar, waiting area, takeaway counter, seating) that open a short info card with its evidence tag.
- **Performance**: 60 fps on a mid-range laptop at High, 30 fps on a mid-range phone at Low. Lazy-load assets, loading screen with progress, draw-call budget < 300, texture budget stated in `docs/performance.md`.
- **Look beyond Three.js defaults**: provide at least 3 time-of-day lighting presets (late afternoon, evening, night) and a rain/monsoon toggle (particles + wet reflections), only as cosmetic modes (do not let them change numbers unless a sim parameter is tied to them and tagged).

## UI / UX
- Minimal, legible HUD. Left: scenario switcher (Baseline / A / B / C). Right: live KPI panel with sparkline + CI + **tags on every figure**. Bottom: timeline scrubber with play/pause and speed.
- **Before -> Intervention -> After** view: side-by-side or toggled comparison of Baseline vs chosen scenario using the *same random seeds* (paired comparison), showing deltas with confidence intervals.
- **Evidence & Method panel**: lists every parameter with tag, source link, confidence; a clear banner "SIMULATED, not measured outcomes".
- **Sensitivity**: sliders for the biggest drivers (arrival rate, party-size mix, patience, dwell time, wait-lounge conversion, takeaway share) and a tornado chart of KPI sensitivity.
- **Licence gate toggle**: B and C run only when the user ticks "assume licence permits"; otherwise they show "Not permitted/unknown, requires Excise confirmation".
- Accessible: keyboard operable, colour-blind-safe palette, reduced-motion setting, readable on mobile. A "Presenter mode" that hides debug and runs a scripted tour for the pitch video.

## DELIVERABLES IN THE REPO
`/src` (app), `/src/sim` (engine + tests), `/src/data/params.json`, `/docs/method.md` (model description, assumptions, limitations), `/docs/open-questions.md`, `ASSETS.md`, `README.md` (run, build, deploy, how to cite results), `.github/workflows/pages.yml`.

## HOW TO WORK (phases with checkpoints; stop and show me after each)
1. **Plan**: read `/reference`, list the layout facts you have vs gaps, propose the module structure and the parameter registry. Wait for "go".
2. **Simulation core + tests**: port/fix the engine, show a table of Baseline/A/B/C results with CIs from N=200, and a note comparing it to the old Gemini output (which gave 60.7% -> 52.5% -> 39.4% walk-aways).
3. **Scene shell**: room geometry, materials, lighting, post-processing, both camera modes, hotspots. Screenshot it for me.
4. **Agents bound to the sim**: people, queue, seating, takeaway counter, scenario switching.
5. **HUD, evidence panel, sensitivity, Before/After**.
6. **Polish and perf pass**, accessibility, quality toggle, loading screen.
7. **Deploy** to GitHub Pages (wait for my "go" before pushing) and write the README.
Verify each phase by running the app, taking screenshots (e.g. with Playwright), and checking the browser console for errors. Report what you actually checked, not what you assume works.

## DEFINITION OF DONE
Looks like a studio-grade 3D scene (not boxes), runs smoothly, every number traceable to a parameter or the event log, every parameter tagged, all unverified licence/legal items flagged, results shown with uncertainty, and a public GitHub Pages link that works on desktop and phone.
