import { entries, type SimParams } from '../data/params.ts';
import { SCENARIOS, generateParties, simulate, type Scenario, type Party, type SimEvent } from './engine.ts';
import { computeKpis, KPI_META, type Kpis } from './kpi.ts';
import { ci95, type CI } from './stats.ts';

export const MIN_REPLICATIONS = 200;

export interface RunOptions {
  n?: number;
  seed?: number;
  /** Scenarios B and C only run when the user explicitly assumes the licence permits them. */
  licenceAssumed?: boolean;
  /** Which replication the animated evening is (default 0). Used by free run. */
  rep?: number;
  /** Optional mid-run policy switch; the target policy is licence-gated like any other. */
  change?: { t: number; to: Scenario['id'] };
}

const changeOf = (opts: RunOptions) => opts.change && { t: opts.change.t, to: gated(opts.change.to, opts) };

function gated(id: Scenario['id'], opts: RunOptions): Scenario {
  const sc = SCENARIOS[id];
  if (sc.licenceDependent && !opts.licenceAssumed) throw new Error('LICENCE_GATED');
  return sc;
}

/** The animated evening: one replication of the batch (0 unless free run asks for another), so what is shown is one of the runs that is reported. */
export function runHero(p: SimParams, id: Scenario['id'], opts: RunOptions = {}): { parties: Party[]; log: SimEvent[] } {
  const sc = gated(id, opts);
  const parties = generateParties(p, opts.seed ?? p.base_seed, opts.rep ?? 0);
  return { parties, log: simulate(p, sc, parties, changeOf(opts)) };
}

/** Replication r uses the same arrivals and guest draws in every scenario (paired comparison). */
export function runScenario(p: SimParams, id: Scenario['id'], opts: RunOptions = {}): Kpis[] {
  const n = opts.n ?? p.replications;
  const seed = opts.seed ?? p.base_seed;
  if (n < MIN_REPLICATIONS) throw new Error(`Need at least ${MIN_REPLICATIONS} replications, got ${n}`);
  const sc = gated(id, opts), change = changeOf(opts);
  const rows: Kpis[] = [];
  for (let r = 0; r < n; r++) rows.push(computeKpis(simulate(p, sc, generateParties(p, seed, r), change), p));
  return rows;
}

export function summarise(rows: Kpis[], key: keyof Kpis): CI | null {
  return ci95(rows.map((r) => r[key]));
}

/** Per-replication difference b - a. Rows where either side is null are skipped. */
export function pairedDelta(a: Kpis[], b: Kpis[], key: keyof Kpis): CI | null {
  return ci95(a.map((ra, i) => (ra[key] === null || b[i][key] === null ? null : (b[i][key] as number) - (ra[key] as number))));
}

/**
 * One-at-a-time sweep: each ASSUMED number is moved to its range min and max in turn.
 * Returns the mean of `key` at each end. This shows input uncertainty, which the
 * Monte Carlo interval does not.
 */
export function sweep(p: SimParams, id: Scenario['id'], key: keyof Kpis, opts: RunOptions = {}) {
  const out: { param: string; atMin: number | null; atMax: number | null }[] = [];
  for (const [param, e] of Object.entries(entries)) {
    if (e.tag !== 'ASSUMED' || !e.range || typeof e.value !== 'number') continue;
    const at = (v: number) => summarise(runScenario({ ...p, [param]: v }, id, opts), key)?.mean ?? null;
    out.push({ param, atMin: at(e.range.min), atMax: at(e.range.max) });
  }
  return out;
}

export interface ResultRow { key: keyof Kpis; base: CI | null; scen: CI | null; delta: CI | null }

/** Baseline vs one scenario on the same seeds: what the results panel shows. */
export function results(p: SimParams, id: Scenario['id'], opts: RunOptions = {}): { n: number; rows: ResultRow[] } {
  const base = runScenario(p, 'baseline', { ...opts, change: undefined }); // the comparison is always the plain baseline
  const scen = id === 'baseline' && !opts.change ? base : runScenario(p, id, opts);
  return { n: base.length, rows: KPI_META.map(({ key }) => ({ key, base: summarise(base, key), scen: summarise(scen, key), delta: pairedDelta(base, scen, key) })) };
}
