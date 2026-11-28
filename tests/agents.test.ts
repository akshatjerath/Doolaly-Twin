import { describe, it, expect, vi, beforeAll } from 'vitest';
import presets from '../src/data/presets.json';
import { lockIn, presentView, managerData, type Locked } from '../src/hud/present.ts';
import raw from '../src/data/layout.json';
import { layout, toWorld, toPx } from '../src/data/layout.ts';
import { markerName } from '../src/scene/hotspots.ts';
import { loadParams, entries } from '../src/data/params.ts';
import { buildTables, simulate, generateParties, SCENARIOS } from '../src/sim/engine.ts';
import { computeKpis } from '../src/sim/kpi.ts';
import { runHero, runScenario } from '../src/sim/replicate.ts';
import { placeTables } from '../src/scene/furniture.ts';
import { buildTracks, phaseAt, queueSlot, countsAt, pickFollow, followText, feedBetween, chainAt, occupiedTables, patienceUsed } from '../src/agents/playback.ts';

const p = loadParams();
const lic = { licenceAssumed: true };

describe('hero run', () => {
  it('is replication 0 of the reported batch', () => {
    for (const id of ['baseline', 'A', 'B', 'C'] as const)
      expect(computeKpis(runHero(p, id, lic).log, p)).toEqual(runScenario(p, id, lic)[0]);
  });
  it('is licence-gated like the batch', () => expect(() => runHero(p, 'B')).toThrow('LICENCE_GATED'));
});

describe('playback shows only what the event log says', () => {
  const { log } = runHero(p, 'B', lic);
  const tracks = buildTracks(log);
  const k = computeKpis(log, p);

  it('has one track per arrival with the logged outcome', () => {
    expect(tracks.length).toBe(k.arrivals);
    expect(tracks.filter((t) => t.outcome === 'seat').length).toBe(k.seated);
    expect(tracks.filter((t) => t.outcome === 'balk').length).toBe(k.balked);
    expect(tracks.filter((t) => t.outcome === 'renege').length).toBe(k.reneged);
    expect(tracks.filter((t) => t.outcome === 'unserved').length).toBe(k.unserved_close);
  });

  it('at every minute, people drawn waiting and seated match the log', () => {
    for (let t = 0; t <= p.arrival_window_min + p.close_after_last_orders_min; t += 1) {
      const inQueue = log.filter((e) => e.type === 'queue' && e.t <= t).length
        - log.filter((e) => (e.type === 'renege' || e.type === 'unserved_close' || (e.type === 'seat' && e.wait! > 0)) && e.t <= t).length;
      const seated = log.filter((e) => e.type === 'seat' && e.t <= t).reduce((s, e) => s + e.size, 0)
        - log.filter((e) => e.type === 'depart' && e.t <= t).reduce((s, e) => s + e.size, 0);
      const c = countsAt(tracks, t);
      expect(c.waitingParties).toBe(inQueue);
      expect(c.seatedPersons).toBe(seated);
      const waitingPhases = tracks.filter((tr) => ['queue', 'lounge'].includes(phaseAt(tr, t)?.phase ?? '')).length;
      expect(waitingPhases).toBe(inQueue);
    }
  });

  it('at every minute, tokens and takeaway litres match the log', () => {
    const c = runHero(p, 'C', lic).log, tr = buildTracks(c);
    expect(c.some((e) => e.type === 'takeaway')).toBe(true);
    for (let t = 0; t <= p.arrival_window_min + p.close_after_last_orders_min; t += 1) {
      const n = countsAt(tr, t);
      expect(n.tokens).toBe(c.filter((e) => e.type === 'queue' && e.t <= t).length);
      expect(n.takeawayLitres).toBeCloseTo(c.filter((e) => e.type === 'takeaway' && e.t <= t).reduce((s, e) => s + e.litres!, 0));
    }
  });

  it('the service chain shows the top bar counts, plus parties who left after a table, all from the log', () => {
    const n = (x: number) => `${x} ${x === 1 ? 'party' : 'parties'}`;
    for (const id of ['baseline', 'C'] as const) {
      const l = runHero(p, id, lic).log, tr = buildTracks(l);
      for (let t = 0; t <= p.arrival_window_min + p.close_after_last_orders_min; t += 5) {
        const c = countsAt(tr, t), steps = chainAt(c, { waitlist: id !== 'baseline', takeaway: id === 'C' });
        expect(c.finished).toBe(l.filter((e) => e.type === 'depart' && e.t <= t).length);
        expect(steps.map((s) => s.id)).toEqual(['arrive', 'queue', 'wait', 'seated', 'leave', ...(id === 'C' ? ['takeaway'] : [])]);
        expect(steps.slice(0, 5).map((s) => s.value)).toEqual([n(c.arrived), n(c.tokens), n(c.waitingParties), `${c.seatedPersons} people`, `${c.finished} after a table · ${c.walkedAway} without`]);
      }
    }
  });

  it('the mini-map puts a point back on the sketch pixel it came from, and a seating in the feed names a real table', () => {
    for (const z of layout.zones) {
      const w = toWorld(z.rect), [x, y] = toPx(w.x0, w.z0);
      expect(x).toBeCloseTo(z.rect[0]);
      expect(y).toBeCloseTo(z.rect[1]);
    }
    const spots = placeTables(p);
    for (const i of feedBetween(tracks, -1, 1e9)) expect(i.kind === 'seated' ? !!spots[i.table!] : i.table === null).toBe(true);
  });

  it('follow-a-party picks an on-screen party from the tracks, the same one every time, with no randomness', () => {
    const random = vi.spyOn(Math, 'random');
    expect(pickFollow(tracks, -5)).toBeNull();
    for (let t = 0; t <= p.arrival_window_min; t += 7) {
      const pick = pickFollow(tracks, t);
      expect(pickFollow(tracks, t)).toBe(pick);
      if (!pick) continue;
      expect(tracks).toContain(pick);
      expect(phaseAt(pick, t)).not.toBeNull();
      expect(followText(pick, t)).toContain(`Party of ${pick.size}`);
    }
    expect(tracks.some((tr, i) => pickFollow(tracks, tr.arrive + 0.5) !== null && i >= 0)).toBe(true);
    expect(random).not.toHaveBeenCalled();
    random.mockRestore();
  });

  it('the live feed reports each logged outcome exactly once, however the evening is sliced', () => {
    const end = p.arrival_window_min + p.close_after_last_orders_min + 1;
    const whole = feedBetween(tracks, -1, end);
    const n = (kind: string) => whole.filter((i) => i.kind === kind).length;
    expect([n('seated'), n('balked'), n('gave_up'), n('unserved')]).toEqual([k.seated, k.balked, k.reneged, k.unserved_close]);
    const sliced = [];
    for (let t = -1; t < end; t += 0.37) sliced.push(...feedBetween(tracks, t, Math.min(end, t + 0.37)));
    expect(sliced.length).toBe(whole.length);
    for (const e of log.filter((x) => x.type === 'seat')) expect(whole.some((i) => i.kind === 'seated' && i.t === e.t && i.text.startsWith(`Party of ${e.size} `))).toBe(true);
  });

  it('scene marker names come from layout.json; a marker with no name shows its tag', () => {
    for (const z of layout.zones) expect(markerName(z)).toBe(raw.zones.find((r) => r.id === z.id)!.label);
    expect(markerName({ label: '', tag: 'ASSUMED LAYOUT' })).toBe('ASSUMED LAYOUT');
  });

  it('gives waiting parties distinct places in line', () => {
    const t = 150;
    for (const lounge of [false, true]) {
      const waiting = tracks.filter((tr) => tr.lounge === lounge && tr.tQueue !== null && tr.tQueue <= t && t < tr.tLeaveQueue!);
      const slots = waiting.map((tr) => queueSlot(tracks, tr, t)).sort((a, b) => a - b);
      expect(slots).toEqual(waiting.map((_, i) => i));
    }
  });

  it('ends with nobody on screen', () => {
    const end = p.arrival_window_min + p.close_after_last_orders_min + 10;
    expect(tracks.every((tr) => phaseAt(tr, end) === null)).toBe(true);
  });
});

describe('step 5 engine options change nothing unless used', () => {
  const parties = generateParties(p, p.base_seed, 0);
  const close = p.arrival_window_min + p.close_after_last_orders_min;

  it('a policy change to the same policy, or after closing, reproduces the plain run exactly', () => {
    for (const id of ['baseline', 'A', 'B', 'C'] as const) {
      const plain = simulate(p, SCENARIOS[id], parties);
      expect(simulate(p, SCENARIOS[id], parties, { t: 120, to: SCENARIOS[id] })).toEqual(plain);
      expect(simulate(p, SCENARIOS[id], parties, { t: close + 1, to: SCENARIOS.A })).toEqual(plain);
    }
  });

  it('a change at minute 0 equals a clean run of the new policy; a later change leaves everything before it untouched', () => {
    expect(simulate(p, SCENARIOS.baseline, parties, { t: 0, to: SCENARIOS.A })).toEqual(simulate(p, SCENARIOS.A, parties));
    const base = simulate(p, SCENARIOS.baseline, parties), switched = simulate(p, SCENARIOS.baseline, parties, { t: 150, to: SCENARIOS.C });
    expect(switched.filter((e) => e.t < 150)).toEqual(base.filter((e) => e.t < 150));
    expect(switched).not.toEqual(base);
  });

  it('free run: evening r is replication r of the reported batch, with or without a policy change, and the change is licence-gated', () => {
    expect(computeKpis(runHero(p, 'A', { rep: 7 }).log, p)).toEqual(runScenario(p, 'A')[7]);
    const change = { t: 150, to: 'A' as const };
    expect(computeKpis(runHero(p, 'baseline', { rep: 3, change }).log, p)).toEqual(runScenario(p, 'baseline', { change })[3]);
    expect(() => runHero(p, 'baseline', { change: { t: 150, to: 'B' } })).toThrow('LICENCE_GATED');
  });

  it('patience in the log is the patience the engine acted on, and the KPIs do not read it', () => {
    const { log } = runHero(p, 'B', lic);
    expect(computeKpis(log.map(({ patience: _, ...e }) => e), p)).toEqual(computeKpis(log, p));
    for (const tr of buildTracks(log)) {
      if (tr.tQueue === null) { expect(tr.patience).toBeNull(); expect(patienceUsed(tr, tr.arrive)).toBeNull(); continue; }
      const waited = tr.tLeaveQueue! - tr.tQueue;
      if (tr.outcome === 'renege') expect(waited).toBeCloseTo(tr.patience!);
      else expect(waited).toBeLessThanOrEqual(tr.patience! + 1e-9);
      expect(patienceUsed(tr, tr.tQueue)).toBe(0);
      expect(patienceUsed(tr, tr.tLeaveQueue!)).toBeNull();
    }
  });

  it('seats-in-use overlay marks exactly the tables the log says are taken', () => {
    const { log } = runHero(p, 'baseline');
    const tr = buildTracks(log);
    for (let t = 0; t <= close; t += 10) {
      const gone = new Set(log.filter((e) => e.type === 'depart' && e.t <= t).map((e) => e.party));
      const want = new Set(log.filter((e) => e.type === 'seat' && e.t <= t && !gone.has(e.party)).flatMap((e) => e.tables!));
      expect(occupiedTables(tr, t)).toEqual(want);
    }
  });
});

describe('step 9a guest interruptions: off by default, isolated when on', () => {
  const fnv = (s: string) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193); return (h >>> 0).toString(16); };
  const NEW = ['step_out', 'washroom', 'remake'];
  const parties = generateParties(p, p.base_seed, 0);
  const plain = simulate(p, SCENARIOS.baseline, parties);
  const seatOf = new Map(plain.filter((e) => e.type === 'seat').map((e) => [e.party, e.t])), departOf = new Map(plain.filter((e) => e.type === 'depart').map((e) => [e.party, e.t]));

  // Fingerprints of the event logs (replications 0 to 9) and of all 200 KPI rows, recorded from the code as it stood before step 9a.
  // They must only change if params.json values are changed on purpose; then re-record them.
  const BEFORE = { baseline: ['ada93cc6', '23d8911e'], A: ['ff244d2b', 'fc2635a4'], B: ['cd938004', '90d9ab44'], C: ['468dc034', '46cb1ded'] }; // re-recorded 2026-11-24 for the Chembur 81-seat layout (params changed on purpose)
  it('with all three shares at 0 (the default), every policy reproduces the pre-9a event logs and KPI rows exactly', () => {
    expect([p.stepout_share, p.washroom_share, p.remake_share, p.remake_delay_min]).toEqual([0, 0, 0, 0]);
    for (const id of ['baseline', 'A', 'B', 'C'] as const) {
      const logs = Array.from({ length: 10 }, (_, r) => simulate(p, SCENARIOS[id], generateParties(p, p.base_seed, r)));
      expect(logs.flat().some((e) => NEW.includes(e.type))).toBe(false);
      expect([fnv(JSON.stringify(logs)), fnv(JSON.stringify(runScenario(p, id, lic)))]).toEqual(BEFORE[id]);
    }
  });

  it('step-outs and washroom trips are logged for seated parties during their stay and change nothing else', () => {
    const on = simulate({ ...p, stepout_share: 1, washroom_share: 0.5 }, SCENARIOS.baseline, parties);
    expect(on.filter((e) => !NEW.includes(e.type))).toEqual(plain);
    expect(on.filter((e) => e.type === 'step_out').length).toBe(seatOf.size);
    const trips = on.filter((e) => e.type === 'washroom');
    expect(trips.length).toBeGreaterThan(0);
    expect(trips.length).toBeLessThan(seatOf.size);
    for (const e of on.filter((x) => NEW.includes(x.type))) {
      expect(e.t).toBeGreaterThanOrEqual(seatOf.get(e.party)!);
      expect(e.t).toBeLessThanOrEqual(departOf.get(e.party)!);
    }
    expect(on.map((e) => e.t)).toEqual(on.map((e) => e.t).sort((a, b) => a - b));
  });

  it('a remake adds exactly the assumed delay to that party\'s time at table, and only when a delay is set', () => {
    const noDelay = simulate({ ...p, remake_share: 1 }, SCENARIOS.baseline, parties);
    expect(noDelay.filter((e) => e.type !== 'remake')).toEqual(plain);
    const delayed = simulate({ ...p, remake_share: 1, remake_delay_min: 10 }, SCENARIOS.baseline, parties);
    const first = plain.find((e) => e.type === 'seat')!.party, close = p.arrival_window_min + p.close_after_last_orders_min;
    expect(delayed.find((e) => e.type === 'depart' && e.party === first)!.t).toBeCloseTo(Math.min(departOf.get(first)! + 10, close));
    expect(computeKpis(delayed, p)).not.toEqual(computeKpis(plain, p));
  });

  it('each kind has its own draws: turning one on does not move another, or the guests', () => {
    const remakes = (extra: object) => simulate({ ...p, remake_share: 0.3, ...extra }, SCENARIOS.baseline, parties).filter((e) => e.type === 'remake');
    expect(remakes({ stepout_share: 1, washroom_share: 1 })).toEqual(remakes({}));
    const keep = ({ id, t, size, uBalk, zPatience, zDwell, uLounge, uTakeaway }: (typeof parties)[number]) => ({ id, t, size, uBalk, zPatience, zDwell, uLounge, uTakeaway });
    expect(generateParties({ ...p, stepout_share: 1, washroom_share: 1, remake_share: 0.5 }, p.base_seed, 0).map(keep)).toEqual(parties.map(keep));
  });
});

describe('step 9b Explore / Present', () => {
  let calls = 0, locked: Locked;
  const withDraft = (o: object) => ({ ...p, ...o }) as typeof p;
  const draft: Record<string, number> = { arrival_scale: 1.3 };
  beforeAll(async () => {
    locked = await lockIn({
      hero: async (s, licenceAssumed, o) => { calls++; return runHero(withDraft(o), s, { licenceAssumed }); },
      results: async (s, licenceAssumed, o) => { calls++; return results(withDraft(o), s, { licenceAssumed }); },
    }, draft, 'test');
  });

  it('Present reads only what was locked: later slider changes cannot reach it, and choosing modes runs nothing', () => {
    const ran = calls;
    draft.arrival_scale = 0.6; // the sliders move after lock-in
    draft.dwell_median_min = 150;
    expect(locked.settings).toEqual({ arrival_scale: 1.3 });
    expect([locked, locked.settings, locked.evenings].every(Object.isFrozen)).toBe(true);
    const asIs = presentView(locked, 'asis', 'A', () => false), fix = presentView(locked, 'fix', 'A', () => false);
    expect(asIs.evening!.results).toEqual(results(withDraft({ arrival_scale: 1.3 }), 'baseline'));
    expect(fix.evening!.results).toEqual(results(withDraft({ arrival_scale: 1.3 }), 'A'));
    expect(fix.evening!.tracks).toEqual(buildTracks(runHero(withDraft({ arrival_scale: 1.3 }), 'A').log));
    for (const id of ['A', 'B', 'C'] as const) presentView(locked, 'fix', id, () => true);
    expect(calls).toBe(ran);
  });

  it('a proposed scene item shows only for the policy actually selected, not for the My Fix tab alone', () => {
    const objects = (mode: 'asis' | 'fix', id: 'A' | 'B' | 'C', licence: boolean) => presentView(locked, mode, id, () => licence).objects.sort();
    expect(objects('asis', 'A', true)).toEqual([]);
    expect(objects('fix', 'A', false)).toEqual(['kiosk']);
    expect(objects('fix', 'B', false)).toEqual([]); // My Fix is open, the licence is not assumed: nothing is drawn or shown
    expect(presentView(locked, 'fix', 'B', () => false).evening).toBeNull();
    expect(objects('fix', 'B', true)).toEqual(['kiosk', 'lounge']);
    expect(objects('fix', 'C', true)).toEqual(['kiosk', 'takeaway']);
    expect(raw.proposed.find((z) => z.id === 'kiosk')!.note).toContain('ASSUMED LAYOUT');
  });

  it('Manager\'s full data stays disabled while no data file exists', () => {
    const none = managerData(import.meta.glob('../src/data/manager-data.json', { eager: true }));
    expect(none.enabled).toBe(false);
    expect(none.reason).toMatch(/data file/);
    expect(html).toMatch(/id="mode-manager"[^>]*disabled/);
    expect(managerData({ 'manager-data.json': {} }).enabled).toBe(true);
  });

  it('situation presets are ASSUMED bundles that stay inside the registry ranges', () => {
    expect([presets.tag, presets.source]).toEqual(['ASSUMED', 'none']);
    for (const pr of presets.presets) for (const [k, v] of Object.entries(pr.values)) {
      expect(entries[k].range, `${pr.id}: ${k}`).toBeDefined();
      expect(v).toBeGreaterThanOrEqual(entries[k].range!.min);
      expect(v).toBeLessThanOrEqual(entries[k].range!.max);
    }
  });
});

describe('scene tables line up with simulation tables', () => {
  it('same order, zone and size, so a logged table index points at the right furniture', () => {
    const sim = buildTables(p), spots = placeTables(p);
    expect(spots.map((s) => [s.zone, s.seats])).toEqual(sim.map((t) => [t.zone, t.seats]));
  });
  it('a seated party always has at least as many chairs as people', () => {
    const spots = placeTables(p);
    for (const tr of buildTracks(runHero(p, 'baseline').log))
      if (tr.outcome === 'seat') expect(tr.tables.reduce((s, i) => s + spots[i].chairs.length, 0)).toBeGreaterThanOrEqual(tr.size);
  });
});

import { results } from '../src/sim/replicate.ts';
import { KPI_META } from '../src/sim/kpi.ts';
import { resultsCsv } from '../src/hud/export.ts';
import html from '../index.html?raw';
import { ONBOARDING, PRESENTER } from '../src/hud/tour.ts';

describe('tours', () => {
  it('the introduction has 5 steps and every tour step points at something on the page', () => {
    expect(ONBOARDING.length).toBe(5);
    for (const s of [...ONBOARDING, ...PRESENTER]) expect(html).toContain(`id="${s.target}"`);
  });
  it('captions carry no figures, and presenter scenes can only name a real area, a panel and a caption', () => {
    for (const s of [...ONBOARDING, ...PRESENTER]) expect(s.text + ('title' in s ? s.title : '')).not.toMatch(/\d/);
    for (const s of PRESENTER) {
      expect(Object.keys(s).sort()).toEqual(['target', 'text', 'zone']);
      if (s.zone) expect(layout.zones.some((z) => z.id === s.zone)).toBe(true);
    }
  });
});

describe('statistics screen', () => {
  it('mean wait before leaving is the mean wait of parties who queued and then left, and is not a number when nobody did', () => {
    const { log } = runHero(p, 'baseline');
    const left = log.filter((e) => e.type === 'renege' || e.type === 'unserved_close');
    expect(left.length).toBeGreaterThan(0);
    expect(computeKpis(log, p).mean_wait_left_min).toBeCloseTo(left.reduce((s, e) => s + e.wait!, 0) / left.length);
    expect(computeKpis(log.filter((e) => e.type !== 'renege' && e.type !== 'unserved_close'), p).mean_wait_left_min).toBeNull();
  });

  it('CSV export carries the same batch figures as the table, the tags, and no number where evidence is missing', () => {
    const r = results(p, 'B', lic), csv = resultsCsv(r, 'B', false).trim().split('\n');
    expect(csv[0]).toContain('SIMULATED, not measured');
    expect(csv.length).toBe(3 + KPI_META.length);
    for (const [i, meta] of KPI_META.entries()) {
      const row = r.rows[i], cells = csv[3 + i].split(',');
      expect(cells[0]).toBe(meta.key);
      expect(cells).toContain('SIMULATED');
      if (row.base && row.base.n >= r.n / 2) expect(cells).toContain(row.base.mean.toFixed(meta.digits));
    }
    expect(csv.find((l) => l.startsWith('lounge_revenue'))).toContain('Insufficient evidence');
    expect(resultsCsv(results(p, 'baseline'), 'Baseline', true).split('\n')[2]).not.toContain('policy_mean');
    expect(resultsCsv(r, 'B', false, [{ param: 'arrival_scale', atMin: 21.64, atMax: null }])).toContain('arrival_scale,21.6,Insufficient evidence');
  });
});

describe('results panel data', () => {
  it('has one row per KPI, zero change for baseline vs itself, and no lounge revenue without a price', () => {
    const base = results(p, 'baseline');
    expect(base.rows.map((r) => r.key)).toEqual(KPI_META.map((m) => m.key));
    expect(base.rows.every((r) => r.delta === null || r.delta.mean === 0)).toBe(true);
    const b = results(p, 'B', lic).rows.find((r) => r.key === 'lounge_revenue')!;
    expect(b.scen === null || b.scen.n < 100).toBe(true);
    expect(() => results(p, 'C')).toThrow('LICENCE_GATED');
  });
});
