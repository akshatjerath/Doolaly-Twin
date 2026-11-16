# UI plan: Doolally twin interface redesign

## Current state (2026-11-14)
**Rule: nothing is committed or pushed without the user's "go". Work is staged only.**

Decisions made by the user:
- Plan approved. All substitutions in "Where the brief asks for things the model cannot honestly show" are accepted.
- Revenue vs baseline stays a band tagged SIMULATED (basis: ASSUMED). The lounge price reads "Insufficient evidence" until a source exists.
- Four isolated, optional simulation changes are allowed: the mid-run policy switch, reservations with lateness and no-shows, service-time multipliers, and guest interruptions (smoke or phone step-outs, washroom trips, wrong-order remakes; rates default 0). Each needs a unit test proving that neutral settings reproduce the previous results exactly.
- Borders that identify a control on the dark theme must reach 3:1 contrast. Slate is allowed only for decorative lines. Measure and report the contrast of every border colour in both themes.
- Keys 1 to 4 on a licence-locked policy show the lock message and do not run it.
- After step 1 is reported: realism controls (Part C of the user's 2026-11-15 message: bookings with lateness and no-shows, table-joining delay, service-time multiplier, settings drawer with honesty rules, Simulated / Observed data modes, annoyance alerts). Engine work first, then the interface inside the layout shell and interaction steps.
- Theme: Modern Minimalist base, mustard `#f4a900` as the single accent, dark default plus high-contrast light theme. Evidence-tag colours unchanged.
- Font: self-host DejaVu Sans; record its licence in `ASSETS.md`.
- Icons: Lucide as inline SVG, about a dozen. GSAP approved for the presenter tour and panel motion only; it must never drive people, the queue or KPI numbers.
- Order of work: theme, then interaction pass, then presenter tour.
- In build step 1, measure the contrast of every colour pair in both themes and report the numbers.

Files already in place:
- App: `src/` (simulation, scene, people, HUD panels), `index.html`, `public/assets/`, tests in `tests/` (32 passing).
- Docs: this plan, `PRODUCT.md`, `docs/method.md`, `docs/open-questions.md`, `ASSETS.md`, `reference/layout/layout.md` (updated to match `src/data/layout.json`).

Build step 1 is done and staged (2026-11-15), waiting for the user's go:
- Tokens for both themes in `src/styles/tokens.css`; `index.html` styles use only tokens. Theme switch in the title panel, remembered in `localStorage` (`twin-theme`), dark by default.
- Chosen: `--control-line` `#a9b4bd` dark (4.69:1 on panel, 3.67:1 on button fill), Charcoal `#36454f` light (9.90 / 6.61). `--bg-raised` dark `#44555f`. `--on-accent` `#1f2a30`. `--accent-line` (focus ring, slider fill) is mustard on dark and Charcoal on light, because mustard on White is 2.00:1.
- `tests/contrast.test.ts` measures every pair in both themes, enforces 4.5:1 text and 3:1 control boundaries, and prints the table. 36 tests pass.
- DejaVu Sans self-hosted as unmodified TTF (about 1.4 MB for two weights); licence in `ASSETS.md`. Subsetting to WOFF2 is an open follow-up.
- Bar re-tagged ASSUMED LAYOUT and drawn as a hatched block.
- Not yet done: the phone layout still overlaps (step 2 replaces it with the bottom sheet); KPI card naming belongs to step 2.

Build step 2 is done and staged (2026-11-15), waiting for the user's go:
- Shell: top bar (title, SIMULATED label, clock and day-part, speed, theme) with the live resource bar; left column (policy cards, legend); the scene as its own grid cell; right column (four KPI cells, context panel); timeline bar with play, scrubber and camera controls.
- Phone (760 px and narrower): scene on top, tabs Glance / Run it / Info / More over a bottom sheet, timeline at the bottom. Selecting a scene marker opens Info.
- Policy cards replace the scenario buttons. Each licence-dependent policy has its own "assume permitted" box; ticking it selects that policy.
- KPI cells: Guests who leave, Typical wait (seated parties) beside it, Seats in use, Revenue vs today (a band across the cost-for-two conflict; lounge reads "Insufficient evidence"). All from the same 200-evening batch as the full table.
- Resource bar adds "Tokens issued" (parties that joined the queue; "not used" in baseline) and "Takeaway" litres ("not used" outside the takeaway policy), both from the event log, with a test.
- New token `--bg-page` (dark `#27323a`, light `#d3d3d3`): page behind the panels; no text sits on it.
- The full results table, sensitivity check and evidence dialog are kept, in the context panel.
- Known limits: the left column scrolls on short laptop screens; speed is still the old select (speed steps are step 5); scene markers crowd each other on a phone (step 3 reworks click-to-inspect).

Build step 3 is done and staged (2026-11-15), waiting for the user's go:
- Labels toggle (timeline bar, key L): each scene marker shows its `label` from `src/data/layout.json`; with no label it shows its tag. Off by default at every width, phone included (user decision, 2026-11-15).
- Click-to-inspect: a marker opens its area card in the Context / Info panel, takes focus there, and is shown as selected; Close or Esc returns focus to the marker.
- Follow a party (timeline bar, key P): a mustard ring under one party plus a status line over the scene. The party is the latest arrival on screen that joins the queue or gets a table. Read from the event-log tracks; no new simulation state.
- Live feed: toasts over the scene from the event log. Throttle: shown at most once every 2 real seconds; one event gets its own line, several are batched into one count line; at most 3 on screen, 6 seconds each; scrubbing or a jump of more than 30 simulated minutes shows nothing for the skipped stretch.
- KPI cells show the baseline figure beside the scenario figure.
- Keyboard: Space, 1 to 4, L, P, F, E, Esc, ?. Help dialog from the top bar. Space on a focused button now presses that button.
- Decided: keys 1 to 4 always choose a policy, and a locked one is selected and shows its lock message without running; L, P, F work whatever policy is selected. Tag chips, the banner and the badge get a thin outer line in the control colour (3:1 in both themes) while the tag colours stay fixed. KPI labels are 14 px, legend text stays 12 px. Font files stay unmodified TTF.
- Tab order (source order): top bar, phone tabs, policy cards, legend panel, scene markers, context panel, timeline bar.
- Known limits: with Labels on, names overlap each other, badly on a phone; the camera does not track the followed party, only the ring does.

Build step 4 is done and staged (2026-11-15), waiting for the user's go:
- Service chain (row above the timeline): Arrived, Joined the queue (or Took a token under a waitlist), Waiting now, Seated now, Left (after a table · without), plus Takeaway under the takeaway policy. Same event-log counts as the top bar; "left after a table" is new and counts `depart` events. A step opens its area's marker (entrance or pavement queue) or shows the whole venue.
- Recent events (Context panel): the newest 5 live-feed lines, kept after the toast fades. Selecting one looks at the table's area for a seating, the entrance for a party that left on arrival, the pavement queue otherwise.
- Mini-map (bottom left of the scene): `layout.json` rectangles in plan, dashed for assumed layout, one dot per party at the spot the scene draws it; the followed party is the larger mustard dot. Clicking an area opens its marker.
- Not built: threshold alerts ("queue is long"). No threshold exists in `params.json`, and they belong with the parked annoyance alerts in Part C.
- Known limits: chain and mini-map are hidden at phone width; mini-map areas are mouse-only (the scene markers are the keyboard route); the proposed lounge and takeaway counter are not drawn on the mini-map; the timeline bar is one row taller, so the scene is shorter on a small laptop.

Build step 5 is done and staged (2026-11-15), waiting for the user's go:
- Speed steps: 1x, 2x, 4x, 8x buttons replace the select. 1x is 4 simulated minutes per second (the old default); the old 1 and 40 min/s settings are gone.
- Free run (timeline bar): at the end of an evening the next replication of the same batch plays, shown as "Evening N of 200". Off returns to the scripted evening (replication 0). The KPI cards do not change, because the batch is the same.
- Mid-run policy change (engine addition 1 of the 4 allowed): tick "Change policy from the current time" and choose a policy; the evening so far is kept and the engine switches at that minute. One switch per evening; a further choice restarts cleanly. Parties already waiting keep the patience they were given. The KPI cards and results table then show the batch run with the same switch against the plain baseline, with a note "SIMULATED; not comparable to a clean restart". The target policy is licence-gated like any other.
- Patience is written on the queue event in the log (data only; nothing in the engine or the KPIs reads it).
- Overlays (select in the camera row): "Seats in use" puts a disc on each table with a party at it; "Patience used" puts a bar over each waiting party that fills as its patience runs out. Both carry a SIMULATED caption over the scene.
- Tests: a switch to the same policy or after closing reproduces the plain run exactly; a switch at minute 0 equals a clean run of the new policy; events before a switch are untouched; evening r of free run is replication r of the batch; KPIs are identical with the patience field stripped.
- Not built: flow lines (the walking paths are cosmetic animation, not model output) and queue heat (the patience bar shows the same thing with the party's own patience).
- Known limits: at 1366 px wide the timeline bar is three rows and the scene is 436 px high; on a phone Labels, Follow, Free run, camera and overlay controls are under More in a row that scrolls sideways; the people pop for a frame when a mid-run switch reloads the evening.

Build step 6 is done and staged (2026-11-15), waiting for the user's go:
- Statistics dialog (button in the Context panel, key S): the full before/after table, the sensitivity check and the two exports. The table and sensitivity chart moved here from the Context panel.
- New KPI "Mean wait before leaving (min)": mean wait of parties who joined the queue and then left; not a number when nobody did. "Mean wait, all arrivals" is relabelled "incl. those who left". The interval is described as run-to-run spread, not forecast accuracy.
- Export CSV: one row per KPI with mean, interval ends and evenings used for baseline, policy and change; SIMULATED tag column; two comment lines with the policy and the warning; the sensitivity check is appended if it has been run. Figures computed in under half the evenings read "Insufficient evidence".
- Export PNG: a drawing of the table as it reads on screen, in the current theme, with the policy name, the SIMULATED warning and the revenue band note.
- Known limits: the PNG is the table only, not the sensitivity chart; the exports use fixed file names.

Build step 7 is done and staged (2026-11-15), waiting for the user's go:
- Introduction: 5 steps (simulated evening, ways to run it, the scene, at a glance, evidence). Each outlines one part of the page and shows a caption card with Next, Back and Skip. Shown once on a first visit (`twin-tour-seen` in localStorage); replayable from Help; Esc skips. On a phone each step switches to the tab that holds its panel.
- Presenter tour (Help, or key T): 6 scenes of 7 seconds. One GSAP timeline moves the camera, fades the caption card and draws the outline on a panel. It has no access to time, policy, people or figures: the evening keeps playing as it was. Orbit control is held during the tour and returned after; Esc or "Stop tour" ends it; under reduced motion the camera cuts instead of moving.
- Copy lives in `src/hud/tour.ts` and contains no figures (tested). Camera stops come from the `layout.json` areas, with the same framing as the scene markers.
- GSAP 3 added as a dependency and credited in `ASSETS.md`.
- Known limits: the tour does not pause or restart the evening, so a recording should start the tour at the moment wanted; the caption card can cover part of the mini-map; the presenter tour's camera stops are not pulled back for a phone screen.

Build step 8 is done and staged (2026-11-15). All eight build steps are complete.
- Checked on the running page at 1366x768, 375x812 and 320x640, on every phone tab: every button, select, checkbox and slider has an accessible name and a hit area of at least 44 px; no duplicate ids; headings run h1, h2, h3 in order; no sideways page scroll. Light theme viewed.
- Fixed: the two side columns and the area card are labelled regions; the 3D scene is announced as an image with its description; the live counts are a labelled group; tour captions are announced; single-key shortcuts can be switched off in Help (Esc always works), remembered in `twin-keys`; on phones under 700 px tall the title is hidden visually and the sheet is shorter, so the scene is 184 px high at 320x640 instead of 67 px; one more contrast pair is tested (step name inside a chain button: 5.18 dark, 6.73 light).
- Design detector: panels no longer carry a shadow as well as a border (that also cleared the nested-cards finding). Left standing, nothing suppressed: the border-plus-shadow advisory on the three dialogs and the tour card (they float, one at a time) and the stripes advisory (the "Hypothetical" stripe and the hatch swatch carry meaning).
- Not fixed, known: KPI explanations are hover tooltips only (not reachable by keyboard or touch); mini-map areas are mouse-only (the scene markers are the keyboard route); the patience overlay has no text equivalent beyond "Follow a party"; the live feed announces up to one line every 2 seconds, which may be chatty with a screen reader; no screen reader was run.

Step 9a is done and staged (2026-11-16), engine only, nothing in the scene or HUD:
- Guest interruptions (engine addition 4 of the 4 allowed). Three new event types in the log, each with party and time: `step_out`, `washroom`, `remake`.
- Four new `params.json` entries, all value 0, tagged ASSUMED, source "none", confidence low, with a range: `stepout_share`, `washroom_share`, `remake_share` (share of seated parties, at most one of each kind per party) and `remake_delay_min`.
- Effect on the model: a step-out or washroom trip is logged part-way through the party's stay and changes nothing else; the table is kept. A remake adds `remake_delay_min` to that party's time at table (capped at closing). With the delay at 0 a remake is logged only.
- Draws come from their own per-party stream (stream 3), so arrivals and every earlier draw are untouched whether the shares are on or off.
- Tests: with the defaults, every policy reproduces fingerprints of the event logs (replications 0 to 9) and all 200 KPI rows recorded before the change; step-outs and washroom trips leave every other event identical; a remake moves departure by exactly the delay; one kind does not move another.
- Side effects to know: the four entries are listed in the Evidence table (it lists every parameter) but have no sliders; the sensitivity check now also runs them, with no visible effect because each is swept alone (a share with no delay, or a delay with no share, changes nothing).
- Of the four allowed engine additions, the mid-run switch and guest interruptions exist in code. Reservations and service-time multipliers are approved but not built.

Step 9b is done and staged (2026-11-17): the Explore / Present split, from `docs/ideas/explore-present-split.md`.
- Explore (dialog, opened from the left panel): sliders for arrival rate, time at table (the service-time control; the model has no service-time multiplier), the three step-9a shares and the remake delay, plus the four older assumption sliders. Four illustrative situations in `src/data/presets.json`, tagged ASSUMED, source none, every value inside its registry range.
- Lock in: simulates today's policy and all three alternatives once under a frozen copy of the sliders. The first lock-in runs at page load with registry values. The left panel always states what is locked in.
- Present: the policy cards are replaced by As-Is / My Fix / Manager's full data. As-Is is the baseline; My Fix holds the three policy cards with the licence boxes and stripe unchanged. Choosing a mode or policy only reads the locked set (`src/hud/present.ts`); it never runs the simulation. Keys: 1 As-Is, 2 to 4 My Fix with that policy.
- Manager's full data is disabled with its reason shown until a file exists at `src/data/manager-data.json`. No screen for real data is built, because no data format exists yet; with a file present the button only opens the existing statistics table.
- Waitlist kiosk: a new `proposed` entry in `layout.json`, drawn in the ghost style just inside the gate, shown only while a waitlist policy is the selected and permitted one, with an ASSUMED LAYOUT note in the panel and an entry in `docs/open-questions.md`. There are no real 3D models for the kiosk, bar, kitchen or washrooms.
- Removed from the screen: the "change policy from the current time" box (it needs a live run, which Present may not do; the engine option and its tests remain) and the live assumption sliders in the More panel (now in Explore).
- Still runs the simulation after lock-in, always under the locked settings: free run (further evenings of the same batch) and the sensitivity check.
- Not built: a camera move per mode; the three new event types in the scene, feed or overlays; a phone layout for Explore.

Next: nothing queued. Part C (realism controls) is still waiting for the user's word on when to start.

---

Status (2026-11-15): plan approved. Build steps 1 to 3 complete and staged.
Mode: Operate (a tool people use), so the craft goes into clarity, precision and restraint, not decoration.

## Who it is for, and the 10-second test
A faculty member, client or classmate opens the page cold. Within 10 seconds they should be able to say: "This is a simulated evening at a taproom; some guests give up waiting; I can try four ways of running it; these are model results, not measurements."

## Three reading levels

| Level | What is on screen | How you get there |
|---|---|---|
| Glance | 4 KPI cards, the live resource bar, the "simulated, not measured" label | Always visible |
| Explore | A compact info card for whatever you click in the 3D scene or mini-map | Click a table, the queue, a counter, a guest party, or a service-chain step |
| Evidence | Sources, tags, assumptions, intervals, sensitivity, the register | "Evidence" button or the E key |

## Wireframe: laptop (1280 wide and up)

```
+--------------------------------------------------------------------------------------+
| Doolally Khar twin   [SIMULATED, not measured]   20:55 Evening   || 1x 2x 4x 8x  (?) |
| Waiting 6 parties | Seated 36 people | Left 15 parties | Tokens 9 | Takeaway 0 L     |
+----------------------+-------------------------------------------+-------------------+
| HOW TO RUN IT        |                                           | AT A GLANCE       |
| [ Baseline        ]  |                                           | Guests who leave  |
| [ Digital waitlist]  |                                           |   47% of parties  |
| [ Small-pour lounge  |              3D scene                     | Typical wait      |
|   Licence unconfirmed|        (click anything to inspect)        |   12 min          |
|   [ ] assume ok   ]  |                                           | Seats in use      |
| [ Takeaway counter   |                                           |   55%             |
|   Licence unconfirmed|                                           | Revenue vs today  |
|   [ ] assume ok   ]  |                                           |   band, INR       |
|                      |                                           +-------------------+
| LEGEND               |                                           | CONTEXT           |
| tags, hatch = assumed|                               [mini-map]  | info card / alerts|
+----------------------+-------------------------------------------+-------------------+
| Arrive > Queue/token > Wait > Seated > Leave        (service chain, live counts)     |
| |<  > play   ------o---------------------------  18:00 .. 01:00   [Overlays v]       |
+--------------------------------------------------------------------------------------+
```
Illustrative, not model output.

## Wireframe: phone (portrait)

```
+------------------------------+
| Doolally twin  SIMULATED (?) |
| 20:55 Evening     || 1x  >   |
| Wait 6 | Seat 36 | Left 15   |   <- resource bar scrolls sideways
+------------------------------+
|                              |
|          3D scene            |
|                              |
+------------------------------+
| [Glance][Run it][Info][More] |   <- bottom sheet tabs, 44 px targets
| 4 KPI cards, 2 x 2           |
+------------------------------+
| > play  ----o-------  20:55  |
+------------------------------+
```
Illustrative, not model output.

## Components

| Component | Level | Data source | Notes |
|---|---|---|---|
| Resource bar | Glance | Event log up to the current time | Counters tick, never tween to invented values |
| KPI card x4 | Glance | Replication batch (200 evenings) | Value, unit, plain label, change vs baseline as word + arrow, tag chip. "Typical wait (seated parties)" sits beside "Guests who leave" so a short wait is never read without the share who left |
| Policy cards | Glance | `scenarios`, licence gate | Replace the scenario buttons; locked cards show "Licence unconfirmed" |
| Clock, day-part, speed | Glance | Playback time + `window_start_min` | Pause, 1x, 2x, 4x, 8x |
| Timeline scrubber | Glance | Playback time | Scripted evening / free run switch |
| Service chain | Glance to Explore | Event log | Click a step to fly the camera there |
| Info card | Explore | Event log track or layout zone | One card at a time, in the right panel |
| Notification feed | Explore | Event log thresholds | Throttled; click flies to the cause |
| Mini-map | Explore | Layout rectangles + playback positions | Plan view with guest dots |
| Overlay menu | Explore | Event log | Seat occupancy, queue heat, flow lines, patience bars |
| Evidence panel | Evidence | Registry, layout, register | Existing content, restyled |
| Statistics screen | Evidence | Replication batch | Before/after, intervals, sensitivity, export PNG and CSV. Also shows p90 wait, mean wait of all arrivals (including those who left, counted up to the time they left) and wait-before-leaving |
| Onboarding tour | - | Static copy | 5 steps, skippable, replayable from Help |
| Presenter tour | - | GSAP timeline over camera and panels only | Never drives people, queue or numbers |
| Legend | Glance | Static | Tags, hatch, ghost outlines |

## Plain-language labels

| Model term | Shown as | Tooltip |
|---|---|---|
| Walk-away % | Guests who leave | Share of parties who see the queue and go, or give up waiting |
| Balk | Left on arrival | Saw the queue and did not join |
| Renege | Gave up waiting | Joined the queue, then left before a table |
| Median wait | Typical wait (seated parties) | Half of seated parties waited less than this; guests who left are counted separately |
| Utilisation | Seats in use | Share of seat-time occupied during the evening |
| 95% interval | Run-to-run spread | How much the average moves between simulated evenings; not forecast accuracy |

## Design tokens

Two themes. Dark is the default.

| Token | Dark | Light (high contrast) | Use |
|---|---|---|---|
| `--bg` | Charcoal `#36454f` | White `#ffffff` | Panel background |
| `--bg-raised` | Charcoal, lighter step | Light Gray `#d3d3d3` | Cards |
| `--fg` | White `#ffffff` | Charcoal `#36454f` | Text |
| `--fg-muted` | Light Gray `#d3d3d3` | Chocolate `#4a403a` | Secondary text |
| `--line` | Slate `#708090` | Slate `#708090` | Decorative lines only, never text on Charcoal |
| `--control-line` | to be chosen in step 1 | to be chosen in step 1 | Borders that identify a control; must reach 3:1 against the surface, measured and reported |
| `--accent` | Mustard `#f4a900` | Mustard `#f4a900` | Active policy, focus ring, primary button; fill with dark text, never text on White |
| `--tag-verified` | `#009E73` | same | Fixed, with glyph and word |
| `--tag-observed` | `#56B4E9` | same | Fixed |
| `--tag-assumed` | `#E69F00` | same | Fixed |
| `--tag-simulated` | `#CC79A7` | same | Fixed |
| `--warn` | Stripe red, existing | same | "Hypothetical" stripe only |

| Scale | Values |
|---|---|
| Type | 12 / 14 / 16 / 20 / 28 px; KPI value 28, labels 12-14; `font-variant-numeric: tabular-nums` |
| Typeface | DejaVu Sans, falling back to Verdana, then system sans (one family, two weights) |
| Spacing | 4 / 8 / 12 / 16 / 24 / 32 px |
| Radius | 4 (chips) / 8 (controls) / 12 (panels) px |
| Elevation | 0 flat / 1 panel shadow / 2 dialog shadow |
| Motion | 120 ms (state), 200 ms (panel), 900 ms (camera); all off under reduced motion |
| Target size | 44 px minimum |

Tag chips keep their border colour and take text from `--fg`, so tag colours never have to carry text contrast.

## Keyboard
Space play/pause, 1-4 policies (on a licence-locked policy the key shows the lock message and does not run it), E evidence, F frame the selected item (or the whole venue), Esc close, ? help.

## Where the brief asks for things the model cannot honestly show

| Asked for | What exists | Proposal |
|---|---|---|
| "Litres poured" counter | Only takeaway litres are simulated; drinks at tables are not | Show "Takeaway litres"; no dine-in litres |
| "Order" and "Pay" steps in the service chain | Not modelled | Chain is Arrive, Queue or token, Wait, Seated, Leave, plus Takeaway in scenario C |
| "Tokens issued" | Parties joining the queue under the waitlist | Shown in A, B, C; "not used" in baseline |
| "Revenue lost or gained" | Dine-in revenue rests on a conflicting cost-for-two figure; lounge has no price | Show as a band vs baseline, tagged SIMULATED (basis: ASSUMED); lounge reads "Insufficient evidence" |
| "Queue spilling onto pavement" alert | The queue is always on the pavement | Alert reads "Queue has passed N parties", N from a tagged display setting |
| Wait-time contours overlay | No spatial wait field exists | Drop it; colour waiting parties by time waited instead |
| Per-guest patience bars | Patience is drawn per party but not in the log | Expose it in the log (data only, no logic change) |
| Change policy mid-run | Engine runs one policy per evening | Needs one engine addition: a switch time. Results labelled SIMULATED, "not comparable to a clean restart" |
| Free-run sandbox | One seeded evening is animated | Free run plays evening after evening, each a numbered replication from the same batch |

## Build order (each step: run, screenshot at laptop and phone size, check console, report)
1. Tokens and both themes; restyle existing panels; theme switch.
2. Layout shell: resource bar, policy cards, KPI cards, context panel, timeline; phone bottom sheet.
3. Interaction pass: states, loading feedback, click-to-inspect info cards, shortcuts, legend, help.
4. Service chain, notification feed, mini-map.
5. Overlays; speed steps; free run; mid-run policy change.
6. Statistics screen and export.
7. Onboarding tour, then presenter tour with GSAP.
8. Accessibility pass and design detector run; report findings.

## Decisions needed before building
1. The honesty substitutions in the table above.
2. Font: use DejaVu Sans only if the viewer has it (Verdana otherwise), or self-host it (one download, free licence, listed in ASSETS.md).
3. Icons: Lucide (open licence) as inline SVG, a dozen icons.
4. GSAP as a new dependency for the presenter tour and panel motion.
5. A short PRODUCT.md capturing audience and purpose, written from this brief, which the design skill asks for before a redesign.
