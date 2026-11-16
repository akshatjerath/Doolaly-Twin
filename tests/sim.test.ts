import { describe, it, expect } from 'vitest';
import { loadParams, validateParams, entries, type ParamEntry } from '../src/data/params.ts';
import { SCENARIOS, generateParties, simulate, buildTables, findTables, totalSeats } from '../src/sim/engine.ts';
import { computeKpis } from '../src/sim/kpi.ts';
import { ci95, kmQuantile } from '../src/sim/stats.ts';
import { runScenario, pairedDelta, summarise } from '../src/sim/replicate.ts';

const p = loadParams();
const night = (id: keyof typeof SCENARIOS, rep = 0, q = p) => simulate(q, SCENARIOS[id], generateParties(q, q.base_seed, rep));

describe('params registry', () => {
  it('shipped params.json is valid', () => expect(validateParams(entries)).toEqual([]));

  const good: ParamEntry = { label: 'x', value: 1, unit: 'u', tag: 'ASSUMED', source: 'none', confidence: 'low', note: 'n', range: { min: 0, max: 2, step: 1 } };
  const bad = (patch: Partial<ParamEntry>, id = 'x') => validateParams({ [id]: { ...good, ...patch } }).length > 0;
  it('rejects photos, street view and Gemini as sources', () => {
    expect(bad({ source: 'reference/photos/interior-01.png' })).toBe(true);
    expect(bad({ source: 'reference/street-view/entrance-01.png' })).toBe(true);
    expect(bad({ source: 'reference/gemini/handoff.md' })).toBe(true);
    expect(bad({ source: 'D5' })).toBe(false);
  });
  it('requires a source for VERIFIED and a range for ASSUMED numbers', () => {
    expect(bad({ tag: 'VERIFIED' })).toBe(true);
    expect(bad({ range: undefined })).toBe(true);
    expect(bad({ value: 5 })).toBe(true);
  });
  it('allows null only as flagged insufficient evidence, and requires a gate on B/C inputs', () => {
    expect(bad({ value: null })).toBe(true);
    expect(bad({ value: null, note: 'Insufficient evidence: no price' })).toBe(false);
    expect(bad({}, 'B_thing')).toBe(true);
    expect(bad({ gate: 'B' }, 'B_thing')).toBe(false);
  });
});

describe('engine', () => {
  it('is deterministic for a seed', () => expect(night('baseline')).toEqual(night('baseline')));

  it('gives every scenario the same guests (common random numbers)', () => {
    const arrivals = (id: keyof typeof SCENARIOS) => night(id, 3).filter((e) => e.type === 'arrive');
    expect(arrivals('A')).toEqual(arrivals('baseline'));
    expect(arrivals('B')).toEqual(arrivals('baseline'));
  });

  it('accounts for every arrival and never overfills tables', () => {
    for (const id of ['baseline', 'A', 'B', 'C'] as const)
      for (let rep = 0; rep < 20; rep++) {
        const log = night(id, rep);
        const k = computeKpis(log, p);
        expect(k.seated + k.balked + k.reneged + k.unserved_close).toBe(k.arrivals);
        const tables = buildTables(p);
        let occupied = 0;
        for (const e of log) {
          if (e.type === 'seat') {
            const cap = e.tables!.reduce((s, i) => s + tables[i].seats, 0);
            expect(cap).toBeGreaterThanOrEqual(e.size);
            occupied += e.size;
          }
          if (e.type === 'depart') occupied -= e.size;
          expect(occupied).toBeLessThanOrEqual(totalSeats(p));
        }
        expect(occupied).toBe(0);
      }
  });

  it('with ample tables nobody waits or walks away', () => {
    const k = computeKpis(night('baseline', 0, { ...p, lower_6tops: 200 }), { ...p, lower_6tops: 200 });
    expect(k.walkaway_pct).toBe(0);
    expect(k.mean_wait_all_min).toBe(0);
  });

  it('with no tables nobody is seated and all are counted as lost', () => {
    const q = { ...p, outdoor_4tops: 0, outdoor_2tops: 0, hall_8tops: 0, hall_6tops: 0, lower_6tops: 0 };
    const k = computeKpis(night('baseline', 0, q), q);
    expect(k.seated).toBe(0);
    expect(k.lost_parties).toBe(k.arrivals);
    expect(k.median_wait_min).toBeNull();
  });

  it('joins tables in one zone for a large party, or refuses when joining is off', () => {
    const tables = buildTables(p);
    expect(findTables(tables, 2, true)).toHaveLength(1);
    expect(findTables(tables, 7, true)).toHaveLength(1);
    const joined = findTables(tables, 10, true)!;
    expect(joined.length).toBeGreaterThan(1);
    expect(new Set(joined.map((i) => tables[i].zone)).size).toBe(1);
    expect(findTables(tables, 10, false)).toBeNull();
  });
});

describe('KPIs', () => {
  it('all-arrival wait counts those who left; seated-only wait hides them', () => {
    const log = [
      { t: 0, type: 'arrive' as const, party: 0, size: 2 },
      { t: 0, type: 'seat' as const, party: 0, size: 2, wait: 0, tables: [0] },
      { t: 1, type: 'arrive' as const, party: 1, size: 2 },
      { t: 1, type: 'queue' as const, party: 1, size: 2 },
      { t: 41, type: 'renege' as const, party: 1, size: 2, wait: 40 },
      { t: 60, type: 'depart' as const, party: 0, size: 2 },
    ];
    const k = computeKpis(log, p);
    expect(k.mean_wait_seated_min).toBe(0);
    expect(k.mean_wait_all_min).toBe(20);
    expect(k.walkaway_pct).toBe(50);
  });

  it('Kaplan-Meier treats leavers as censored and returns null when not estimable', () => {
    const obs = [
      { t: 5, seated: true }, { t: 10, seated: false }, { t: 20, seated: true }, { t: 30, seated: false },
    ];
    // S(5) = 3/4; S(20) = 3/4 * 1/2 = 3/8 -> median is 20; 0.9 is never reached.
    expect(kmQuantile(obs, 0.5)).toBe(20);
    expect(kmQuantile(obs, 0.9)).toBeNull();
  });

  it('lounge revenue is null (insufficient evidence) until a price is supplied', () => {
    expect(computeKpis(night('B'), p).lounge_revenue).toBeNull();
    const q = { ...p, B_pour_spend: 100 };
    const k = computeKpis(night('B', 0, q), q);
    expect(k.lounge_revenue).toBe(k.lounge_persons * 100);
  });
});

describe('replication', () => {
  it('computes a 95% interval and skips nulls', () => {
    const c = ci95([1, 2, 3, null])!;
    expect(c.n).toBe(3);
    expect(c.mean).toBe(2);
    expect(c.hi - c.mean).toBeCloseTo(1.96 / Math.sqrt(3), 10);
  });

  it('refuses fewer than 200 replications', () => expect(() => runScenario(p, 'baseline', { n: 199 })).toThrow());

  it('licence-dependent scenarios are gated', () => {
    expect(() => runScenario(p, 'B')).toThrow('LICENCE_GATED');
    expect(() => runScenario(p, 'C')).toThrow('LICENCE_GATED');
    expect(runScenario(p, 'C', { licenceAssumed: true })).toHaveLength(p.replications);
  });

  it('paired difference of a scenario with itself is exactly zero', () => {
    const a = runScenario(p, 'A');
    const d = pairedDelta(a, runScenario(p, 'A'), 'walkaway_pct')!;
    expect([d.mean, d.lo, d.hi]).toEqual([0, 0, 0]);
  });

  it('takeaway does not change who walks away, and neutral multipliers make A equal baseline', () => {
    const lic = { licenceAssumed: true };
    expect(summarise(runScenario(p, 'C', lic), 'walkaway_pct')).toEqual(summarise(runScenario(p, 'A'), 'walkaway_pct'));
    const neutral = { ...p, A_balk_mult: 1, A_patience_mult: 1 };
    expect(runScenario(neutral, 'A')).toEqual(runScenario(neutral, 'baseline'));
  });
});
