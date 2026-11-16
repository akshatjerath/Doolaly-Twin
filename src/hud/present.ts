import { layout } from '../data/layout.ts';
import { SCENARIOS, type Scenario } from '../sim/engine.ts';
import { buildTracks, type Track } from '../agents/playback.ts';
import type { Hero, Results } from '../sim/client.ts';
import type { Overrides } from '../sim/worker.ts';

// Explore / Present split. Explore edits a draft of the inputs; "Lock in" simulates every policy once under that draft and
// freezes the outcome. Present is drawn only from that frozen set, so its numbers cannot drift while sliders are moved.

type Id = Scenario['id'];
export type ShowMode = 'asis' | 'fix' | 'manager';
export type FixId = Exclude<Id, 'baseline'>;
export interface Evening { tracks: Track[]; results: Results }
export interface Locked { readonly settings: Readonly<Overrides>; readonly preset: string; readonly evenings: Readonly<Record<Id, Evening>> }

/** What lock-in needs from the simulation worker. */
export interface Runner {
  hero: (s: Id, licence: boolean, o: Overrides) => Promise<Hero>;
  results: (s: Id, licence: boolean, o: Overrides) => Promise<Results>;
}

/**
 * Simulate today's policy and each alternative once, under a private copy of the draft settings, and freeze the lot.
 * The licence-dependent policies are computed here too, but stay hidden until their licence box is ticked (see presentView).
 */
export async function lockIn(run: Runner, draft: Overrides, preset: string): Promise<Locked> {
  const settings = Object.freeze({ ...draft });
  const evenings = {} as Record<Id, Evening>;
  for (const id of Object.keys(SCENARIOS) as Id[])
    evenings[id] = { tracks: buildTracks((await run.hero(id, true, settings)).log), results: await run.results(id, true, settings) };
  return Object.freeze({ settings, preset, evenings: Object.freeze(evenings) });
}

/**
 * Everything Present shows for a mode. It is given the locked set and nothing else: there is no path from a slider to here.
 * evening = null means "show nothing" (licence not assumed). objects = ids of proposed layout items to draw.
 */
export function presentView(locked: Locked, mode: ShowMode, fix: FixId, licence: (id: Id) => boolean) {
  const policy: Id = mode === 'fix' ? fix : 'baseline';
  const sc = SCENARIOS[policy];
  const gated = sc.licenceDependent && !licence(policy);
  // A proposed item is drawn only for the policy actually selected (the kiosk for any waitlist policy), never for the tab alone.
  const objects = gated ? [] : layout.proposed.filter((z) => z.scenario === policy || (z.scenario === 'A' && sc.waitlist)).map((z) => z.id);
  return { policy, gated, evening: gated ? null : locked.evenings[policy], objects };
}

/** "Manager's full data" is switched on only by a real data file; with none it is disabled and says why. */
export function managerData(files: Record<string, unknown>) {
  const enabled = Object.keys(files).length > 0;
  return { enabled, reason: enabled ? '' : 'Needs a real data file from the venue. None is loaded, so this is switched off.' };
}
