import type { Party, SimEvent, Scenario } from './engine.ts';
import type { ResultRow } from './replicate.ts';
import type { Overrides } from './worker.ts';

export interface Hero { parties: Party[]; log: SimEvent[] }
export interface Results { n: number; rows: ResultRow[] }
/** Optional extras: which replication to animate (free run) and a mid-run policy switch. */
export interface Extra { rep?: number; change?: { t: number; to: Scenario['id'] } }
export type Sweep = { param: string; atMin: number | null; atMax: number | null }[];

/** Main-thread handle to the simulation worker. Rejects with 'LICENCE_GATED' for B/C without the licence assumption. */
export function createSimClient() {
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  const pending = new Map<number, { resolve: (v: never) => void; reject: (e: Error) => void }>();
  let seq = 0;
  worker.onmessage = (e: MessageEvent<{ id: number; ok: boolean; result: never; error: string }>) => {
    const p = pending.get(e.data.id);
    pending.delete(e.data.id);
    if (e.data.ok) p?.resolve(e.data.result);
    else p?.reject(new Error(e.data.error));
  };
  const call = <T>(type: 'hero' | 'results' | 'sweep', scenario: Scenario['id'], licenceAssumed: boolean, overrides: Overrides, extra: Extra = {}) =>
    new Promise<T>((resolve, reject) => {
      const id = seq++;
      pending.set(id, { resolve: resolve as (v: never) => void, reject });
      worker.postMessage({ id, type, scenario, licenceAssumed, overrides, ...extra });
    });
  return {
    hero: (s: Scenario['id'], lic: boolean, o: Overrides, x?: Extra) => call<Hero>('hero', s, lic, o, x),
    results: (s: Scenario['id'], lic: boolean, o: Overrides, x?: Extra) => call<Results>('results', s, lic, o, x),
    sweep: (s: Scenario['id'], lic: boolean, o: Overrides, x?: Extra) => call<Sweep>('sweep', s, lic, o, x),
  };
}
