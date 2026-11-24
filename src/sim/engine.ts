import type { SimParams } from '../data/params.ts';
import { layout } from '../data/layout.ts';
import { mulberry32, mix, normal } from './rng.ts';

export interface Scenario {
  id: 'baseline' | 'A' | 'B' | 'C';
  label: string;
  waitlist: boolean;
  lounge: boolean;
  takeaway: boolean;
  licenceDependent: boolean;
}

// ASSUMED structure: B and C are built on top of the digital waitlist (A).
export const SCENARIOS: Record<Scenario['id'], Scenario> = {
  baseline: { id: 'baseline', label: 'Baseline: manual queue', waitlist: false, lounge: false, takeaway: false, licenceDependent: false },
  A: { id: 'A', label: 'A: digital waitlist', waitlist: true, lounge: false, takeaway: false, licenceDependent: false },
  B: { id: 'B', label: 'B: waitlist + small-pour lounge', waitlist: true, lounge: true, takeaway: false, licenceDependent: true },
  C: { id: 'C', label: 'C: waitlist + takeaway counter', waitlist: true, lounge: false, takeaway: true, licenceDependent: true },
};

/** A walk-in party with every random draw fixed up front, so all scenarios face the same guests. */
export interface Party {
  id: number;
  t: number;
  size: number;
  uBalk: number;
  zPatience: number;
  zDwell: number;
  uLounge: number;
  uTakeaway: number;
  /** Guest interruptions, from their own random stream: whether each happens (compared with its share) and when during the stay (0..1). */
  uStepOut: number;
  uWashroom: number;
  uRemake: number;
  whenStepOut: number;
  whenWashroom: number;
  whenRemake: number;
}

export type EventType = 'arrive' | 'balk' | 'queue' | 'lounge_order' | 'renege' | 'seat' | 'depart' | 'takeaway' | 'unserved_close' | Interruption;
/** Optional guest interruptions, each logged against a seated party. All are off (share 0) by default. */
export type Interruption = 'step_out' | 'washroom' | 'remake';

export interface SimEvent {
  t: number;
  type: EventType;
  party: number;
  size: number;
  /** Minutes waited so far: on seat, renege and unserved_close. */
  wait?: number;
  /** Table indices: on seat. */
  tables?: number[];
  /** On takeaway. */
  litres?: number;
  /** On queue: minutes this party is willing to wait, as the engine drew it. Data only; nothing reads it back. */
  patience?: number;
}

/** Optional mid-run policy switch: from minute t the evening runs under `to`. Parties already waiting keep the patience they were given. */
export interface PolicyChange { t: number; to: Scenario }

export interface Table {
  zone: 'outdoor' | 'hall';
  seats: number;
  party: number;
  /** Floor-plan table id (layout.json), so the scene draws this table where the plan puts it. */
  id: string;
}

/** Which table type and zone each seating parameter controls. A slider of n takes the first n plan tables of that type in that zone. */
export const TABLE_PARAMS: [keyof SimParams, 'outdoor' | 'hall', string][] = [
  ['indoor_2tops', 'hall', 'T2'], ['indoor_3tops', 'hall', 'T3'], ['indoor_4tops', 'hall', 'T4'], ['indoor_high4', 'hall', 'HT4'],
  ['outdoor_2tops', 'outdoor', 'T2'], ['outdoor_3tops', 'outdoor', 'T3'], ['outdoor_4tops', 'outdoor', 'T4'], ['outdoor_high6', 'outdoor', 'HT6'], ['outdoor_high8', 'outdoor', 'HT8'],
];

export function buildTables(p: SimParams): Table[] {
  const out: Table[] = [];
  // Outdoor first, then indoor: the order the tables are tried in is the order they are listed.
  for (const zone of ['outdoor', 'hall'] as const) {
    for (const [key, z, type] of TABLE_PARAMS) {
      if (z !== zone) continue;
      layout.tables.filter((t) => t.zone === z && t.type === type).slice(0, Math.max(0, Math.floor(Number(p[key]) || 0)))
        .forEach((t) => out.push({ zone, seats: layout.tableTypes[type].seats, party: -1, id: t.id }));
    }
  }
  return out;
}

export const totalSeats = (p: SimParams) => buildTables(p).reduce((s, t) => s + t.seats, 0);

/** Arrivals for one replication: non-homogeneous Poisson by thinning. Independent of scenario. */
export function generateParties(p: SimParams, seed: number, rep: number): Party[] {
  const profile = p.arrival_rate_per_hour.map((r) => r * p.arrival_scale);
  const maxRate = Math.max(...profile);
  const sizes = Object.entries(p.party_size_pmf);
  const pmfTotal = sizes.reduce((s, [, w]) => s + w, 0);
  const parties: Party[] = [];
  if (maxRate <= 0) return parties;
  const arr = mulberry32(mix(seed, rep, 1));
  let t = 0;
  for (;;) {
    t += -Math.log(1 - arr()) / (maxRate / 60);
    if (t >= p.arrival_window_min) break;
    const rate = profile[Math.min(Math.floor(t / 60), profile.length - 1)];
    if (arr() * maxRate > rate) continue;
    const id = parties.length;
    const r = mulberry32(mix(seed, rep, 2, id));
    let u = r() * pmfTotal;
    let size = Number(sizes[sizes.length - 1][0]);
    for (const [s, w] of sizes) {
      if (u < w) { size = Number(s); break; }
      u -= w;
    }
    const x = mulberry32(mix(seed, rep, 3, id)); // interruptions draw from stream 3, so the draws above never move
    parties.push({ id, t, size, uBalk: r(), zPatience: normal(r(), r()), zDwell: normal(r(), r()), uLounge: r(), uTakeaway: r(),
      uStepOut: x(), uWashroom: x(), uRemake: x(), whenStepOut: x(), whenWashroom: x(), whenRemake: x() });
  }
  return parties;
}

/** Smallest single free table that fits; otherwise join free tables within one zone (least wasted seats). */
export function findTables(tables: Table[], size: number, allowJoin: boolean): number[] | null {
  let best = -1;
  tables.forEach((t, i) => {
    if (t.party < 0 && t.seats >= size && (best < 0 || t.seats < tables[best].seats)) best = i;
  });
  if (best >= 0) return [best];
  if (!allowJoin) return null;
  let pick: number[] | null = null;
  let pickSeats = Infinity;
  for (const zone of ['outdoor', 'hall'] as const) {
    const free = tables.map((t, i) => ({ t, i })).filter((x) => x.t.zone === zone && x.t.party < 0).sort((a, b) => b.t.seats - a.t.seats);
    const chosen: number[] = [];
    let seats = 0;
    for (const x of free) {
      if (seats >= size) break;
      chosen.push(x.i);
      seats += x.t.seats;
    }
    if (seats >= size && seats < pickSeats) { pick = chosen; pickSeats = seats; }
  }
  return pick;
}

type Pending = { t: number; seq: number; kind: 'arrive' | 'renege' | 'depart' | 'last_orders' | 'policy' | Interruption; party: number };

/** One evening. Returns the append-only event log, the single source for KPIs and animation. */
export function simulate(p: SimParams, start: Scenario, parties: Party[], change?: PolicyChange): SimEvent[] {
  let sc = start;
  const log: SimEvent[] = [];
  const tables = buildTables(p);
  const lastOrders = p.arrival_window_min;
  const close = lastOrders + p.close_after_last_orders_min;
  const queue: number[] = [];
  const inLounge = new Set<number>();
  let loungeOcc = 0;

  // Small binary heap ordered by (time, insertion order) so ties are deterministic.
  const heap: Pending[] = [];
  let seq = 0;
  const before = (a: Pending, b: Pending) => a.t < b.t || (a.t === b.t && a.seq < b.seq);
  const push = (t: number, kind: Pending['kind'], party: number) => {
    heap.push({ t, seq: seq++, kind, party });
    for (let i = heap.length - 1; i > 0; ) {
      const up = (i - 1) >> 1;
      if (!before(heap[i], heap[up])) break;
      [heap[i], heap[up]] = [heap[up], heap[i]];
      i = up;
    }
  };
  const pop = (): Pending => {
    const top = heap[0];
    const last = heap.pop()!;
    if (heap.length) {
      heap[0] = last;
      for (let i = 0; ; ) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < heap.length && before(heap[l], heap[m])) m = l;
        if (r < heap.length && before(heap[r], heap[m])) m = r;
        if (m === i) break;
        [heap[i], heap[m]] = [heap[m], heap[i]];
        i = m;
      }
    }
    return top;
  };

  const leaveLounge = (id: number) => {
    if (inLounge.delete(id)) loungeOcc -= parties[id].size;
  };
  const seat = (pt: Party, t: number, idx: number[]) => {
    idx.forEach((i) => (tables[i].party = pt.id));
    leaveLounge(pt.id);
    log.push({ t, type: 'seat', party: pt.id, size: pt.size, wait: t - pt.t, tables: idx });
    const remake = pt.uRemake < p.remake_share;
    const dwell = p.dwell_median_min * Math.exp(p.dwell_sigma * pt.zDwell) + (remake ? p.remake_delay_min : 0);
    const leave = Math.min(t + dwell, close);
    push(leave, 'depart', pt.id);
    // Interruptions happen part-way through the stay. The table is kept; only a remake changes anything, by the delay added above.
    // With every share at 0 nothing is pushed, so the order of all other events is untouched.
    if (pt.uStepOut < p.stepout_share) push(t + pt.whenStepOut * (leave - t), 'step_out', pt.id);
    if (pt.uWashroom < p.washroom_share) push(t + pt.whenWashroom * (leave - t), 'washroom', pt.id);
    if (remake) push(t + pt.whenRemake * (leave - t), 'remake', pt.id);
  };
  const walkAway = (pt: Party, t: number) => {
    if (sc.takeaway && pt.uTakeaway < p.C_takeaway_share)
      log.push({ t, type: 'takeaway', party: pt.id, size: pt.size, litres: p.C_litres_per_order });
  };

  for (const pt of parties) push(pt.t, 'arrive', pt.id);
  push(lastOrders, 'last_orders', -1);
  if (change) push(change.t, 'policy', -1); // pushed last, so without a change nothing about event order moves

  while (heap.length) {
    const ev = pop();
    const t = ev.t;
    if (ev.kind === 'policy') { sc = change!.to; continue; }
    if (ev.kind === 'step_out' || ev.kind === 'washroom' || ev.kind === 'remake') { log.push({ t, type: ev.kind, party: ev.party, size: parties[ev.party].size }); continue; }
    if (ev.kind === 'arrive') {
      const pt = parties[ev.party];
      log.push({ t, type: 'arrive', party: pt.id, size: pt.size });
      // Host seats any party that fits (first-come-first-served, skipping parties that do not fit).
      const fit = findTables(tables, pt.size, p.allow_table_join);
      if (fit) { seat(pt, t, fit); continue; }
      const balkP = Math.min(1, p.balk_per_queued_party * queue.length * (sc.waitlist ? p.A_balk_mult : 1));
      if (pt.uBalk < balkP) {
        log.push({ t, type: 'balk', party: pt.id, size: pt.size });
        walkAway(pt, t);
        continue;
      }
      let patience = p.patience_median_min * Math.exp(p.patience_sigma * pt.zPatience) * (sc.waitlist ? p.A_patience_mult : 1);
      const joined: SimEvent = { t, type: 'queue', party: pt.id, size: pt.size };
      log.push(joined);
      if (sc.lounge && pt.uLounge < p.B_lounge_conversion && loungeOcc + pt.size <= p.B_lounge_capacity) {
        inLounge.add(pt.id);
        loungeOcc += pt.size;
        patience *= p.B_lounge_patience_mult;
        log.push({ t, type: 'lounge_order', party: pt.id, size: pt.size });
      }
      joined.patience = patience;
      queue.push(pt.id);
      push(t + patience, 'renege', pt.id);
    } else if (ev.kind === 'renege') {
      const qi = queue.indexOf(ev.party);
      if (qi < 0) continue; // already seated or turned away at last orders
      const pt = parties[ev.party];
      queue.splice(qi, 1);
      leaveLounge(pt.id);
      log.push({ t, type: 'renege', party: pt.id, size: pt.size, wait: t - pt.t });
      walkAway(pt, t);
    } else if (ev.kind === 'depart') {
      const pt = parties[ev.party];
      tables.forEach((tb) => { if (tb.party === pt.id) tb.party = -1; });
      log.push({ t, type: 'depart', party: pt.id, size: pt.size });
      if (t < lastOrders) {
        for (let i = 0; i < queue.length; ) {
          const q = parties[queue[i]];
          const fit = findTables(tables, q.size, p.allow_table_join);
          if (fit) { queue.splice(i, 1); seat(q, t, fit); } else i++;
        }
      }
    } else {
      // Last orders: nobody else is seated; those still waiting are recorded, not dropped.
      for (const id of queue) {
        const pt = parties[id];
        leaveLounge(id);
        log.push({ t, type: 'unserved_close', party: id, size: pt.size, wait: t - pt.t });
      }
      queue.length = 0;
    }
  }
  return log;
}
