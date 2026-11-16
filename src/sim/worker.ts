// Web Worker: runs the simulation off the main thread, enforces the licence gate and re-checks slider values.
import { loadParams, entries, type SimParams } from '../data/params.ts';
import { runHero, results, sweep } from './replicate.ts';
import { SCENARIOS, type Scenario } from './engine.ts';

const base = loadParams();

export type Overrides = Record<string, number | null>;
export interface Request { id: number; type: 'hero' | 'results' | 'sweep'; scenario: Scenario['id']; licenceAssumed: boolean; overrides: Overrides; rep?: number; change?: { t: number; to: Scenario['id'] } }

/** Only ranged registry entries may be overridden, and only within their range. */
function withOverrides(o: Overrides): SimParams {
  const p = { ...base } as unknown as Record<string, unknown>;
  for (const [k, v] of Object.entries(o)) {
    const e = entries[k];
    if (!e?.range) throw new Error(`BAD_OVERRIDE ${k}`);
    if (v === null) { if (e.value !== null) throw new Error(`BAD_OVERRIDE ${k}`); continue; }
    if (typeof v !== 'number' || Number.isNaN(v)) throw new Error(`BAD_OVERRIDE ${k}`);
    p[k] = Math.min(e.range.max, Math.max(e.range.min, v));
  }
  return p as unknown as SimParams;
}

self.onmessage = (e: MessageEvent<Request>) => {
  const { id, type, scenario, licenceAssumed, overrides, rep = 0, change } = e.data;
  try {
    const p = withOverrides(overrides);
    if (!Number.isInteger(rep) || rep < 0 || rep >= p.replications) throw new Error('BAD_REP');
    if (change && !(Number.isFinite(change.t) && Object.hasOwn(SCENARIOS, change.to))) throw new Error('BAD_CHANGE');
    const opts = { licenceAssumed, rep, change };
    const result = type === 'hero' ? runHero(p, scenario, opts) : type === 'results' ? results(p, scenario, opts) : sweep(p, scenario, 'walkaway_pct', opts);
    postMessage({ id, ok: true, result });
  } catch (err) {
    postMessage({ id, ok: false, error: (err as Error).message });
  }
};
