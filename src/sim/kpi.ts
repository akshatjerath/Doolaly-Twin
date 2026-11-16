import type { SimParams } from '../data/params.ts';
import { totalSeats, type SimEvent } from './engine.ts';
import { kmQuantile } from './stats.ts';

/** One evening's KPIs. null means "not estimable" or "insufficient evidence", never zero. */
export interface Kpis {
  arrivals: number;
  seated: number;
  balked: number;
  reneged: number;
  unserved_close: number;
  walkaway_pct: number;
  lost_parties: number;
  mean_wait_all_min: number;
  /** Mean wait of parties who joined the queue and then left without a table. null when nobody did. */
  mean_wait_left_min: number | null;
  mean_wait_seated_min: number | null;
  median_wait_min: number | null;
  p90_wait_min: number | null;
  utilisation_pct: number;
  dinein_persons: number;
  dinein_revenue: number;
  lounge_persons: number;
  lounge_revenue: number | null;
  takeaway_orders: number;
  takeaway_litres: number;
  takeaway_revenue: number;
}

/** Every KPI is computed from the event log. Nothing here is a constant. */
export function computeKpis(log: SimEvent[], p: SimParams): Kpis {
  const count = (type: SimEvent['type']) => log.filter((e) => e.type === type).length;
  const arrivals = count('arrive');
  const seats = log.filter((e) => e.type === 'seat');
  const balked = count('balk');
  const reneges = log.filter((e) => e.type === 'renege');
  const unserved = log.filter((e) => e.type === 'unserved_close');

  // Wait of ALL arrivals: balked parties waited 0; reneged and unserved waited until they left.
  const waited = [...seats, ...reneges, ...unserved].reduce((s, e) => s + e.wait!, 0);
  const obs = [
    ...seats.map((e) => ({ t: e.wait!, seated: true })),
    ...reneges.map((e) => ({ t: e.wait!, seated: false })),
    ...unserved.map((e) => ({ t: e.wait!, seated: false })),
    ...Array.from({ length: balked }, () => ({ t: 0, seated: false })),
  ];

  // Person-minutes at table during the arrival window, over seat-minutes available.
  const window = p.arrival_window_min;
  const seatedAt = new Map(seats.map((e) => [e.party, e.t]));
  let personMin = 0;
  for (const e of log) {
    if (e.type !== 'depart') continue;
    const from = seatedAt.get(e.party)!;
    personMin += e.size * Math.max(0, Math.min(e.t, window) - Math.min(from, window));
  }

  const dineinPersons = seats.reduce((s, e) => s + e.size, 0);
  const loungePersons = log.filter((e) => e.type === 'lounge_order').reduce((s, e) => s + e.size, 0);
  const takeaways = log.filter((e) => e.type === 'takeaway');
  const litres = takeaways.reduce((s, e) => s + e.litres!, 0);

  return {
    arrivals,
    seated: seats.length,
    balked,
    reneged: reneges.length,
    unserved_close: unserved.length,
    walkaway_pct: arrivals ? (100 * (balked + reneges.length)) / arrivals : 0,
    lost_parties: balked + reneges.length + unserved.length,
    mean_wait_all_min: arrivals ? waited / arrivals : 0,
    mean_wait_left_min: reneges.length + unserved.length ? [...reneges, ...unserved].reduce((s, e) => s + e.wait!, 0) / (reneges.length + unserved.length) : null,
    mean_wait_seated_min: seats.length ? seats.reduce((s, e) => s + e.wait!, 0) / seats.length : null,
    median_wait_min: kmQuantile(obs, 0.5),
    p90_wait_min: kmQuantile(obs, 0.9),
    utilisation_pct: (100 * personMin) / (totalSeats(p) * window),
    dinein_persons: dineinPersons,
    dinein_revenue: (dineinPersons * p.dinein_spend_per_two) / 2,
    lounge_persons: loungePersons,
    lounge_revenue: loungePersons === 0 ? 0 : p.B_pour_spend === null ? null : loungePersons * p.B_pour_spend,
    takeaway_orders: takeaways.length,
    takeaway_litres: litres,
    takeaway_revenue: litres * p.C_price_per_litre,
  };
}

/** Display metadata for the results panel. Labels only; every value comes from computeKpis. */
export const KPI_META: { key: keyof Kpis; label: string; digits: number; better: 'lower' | 'higher' | 'none' }[] = [
  { key: 'walkaway_pct', label: 'Walk-away % (balked + gave up)', digits: 1, better: 'lower' },
  { key: 'lost_parties', label: 'Lost parties per evening', digits: 1, better: 'lower' },
  { key: 'mean_wait_all_min', label: 'Mean wait, all arrivals incl. those who left (min)', digits: 1, better: 'lower' },
  { key: 'mean_wait_left_min', label: 'Mean wait before leaving (min)', digits: 1, better: 'none' },
  { key: 'median_wait_min', label: 'Median wait to be seated (min)', digits: 1, better: 'lower' },
  { key: 'p90_wait_min', label: 'p90 wait to be seated (min)', digits: 1, better: 'lower' },
  { key: 'utilisation_pct', label: 'Seat utilisation %', digits: 1, better: 'none' },
  { key: 'dinein_revenue', label: 'Dine-in revenue (INR)', digits: 0, better: 'higher' },
  { key: 'lounge_revenue', label: 'Lounge revenue (INR)', digits: 0, better: 'higher' },
  { key: 'takeaway_revenue', label: 'Takeaway revenue (INR)', digits: 0, better: 'higher' },
];
