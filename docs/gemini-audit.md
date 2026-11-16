# Audit of the Gemini prototype (2026-11-14)

- HUD KPIs are hardcoded in `updateHUD` of `twin_v2.html` (baseline wait 62 min, walk-away `32 + reneged*2`, then 9% / 4%, revenue `max(8400, 9600 + ...)`). They are not produced by the simulation.
- Running `doolally_sim_engine.py` (100 runs) gives: walk-away 60.7% / 52.5% / 39.4%; mean wait of seated parties 21.9 / 47.4 / 41.3 min; net profit per shift INR 83,075 / 85,353 / 105,784. These contradict the handoff text.
- Mean wait of seated parties is biased low in the baseline because impatient guests leave. Report all-arrival wait with censoring, plus p90.
- Patience inputs (20-34 vs 46-68 min) and the "2.4x" drain claim are assumptions; code actually uses 1.15 vs 0.35 (about 3.3x).
- Not verified anywhere: Journal of Travel Research (2025) claim, FL-III red-ink plan, 1 m BMC corridor, Zomato INR 330 pint, MI-match waits, Mug Club +50%, 6th-floor layout, 48 bench seats, 18-seat lounge.
