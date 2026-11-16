// Prints the Phase 2 results table. Run: npm run report
import { loadParams, entries } from '../data/params.ts';
import { SCENARIOS, totalSeats, type Scenario } from './engine.ts';
import type { Kpis } from './kpi.ts';
import { runScenario, summarise, pairedDelta, sweep } from './replicate.ts';

const p = loadParams();
const ids = Object.keys(SCENARIOS) as Scenario['id'][];
const opts = { licenceAssumed: true };
const runs = Object.fromEntries(ids.map((id) => [id, runScenario(p, id, opts)])) as Record<Scenario['id'], Kpis[]>;

const fmt = (key: keyof Kpis, id: Scenario['id'], digits = 1) => {
  const c = summarise(runs[id], key);
  if (!c) return 'Insufficient evidence';
  const s = `${c.mean.toFixed(digits)} [${c.lo.toFixed(digits)}, ${c.hi.toFixed(digits)}]`;
  return c.n < runs[id].length ? `${s} (estimable in ${c.n}/${runs[id].length})` : s;
};

const rows: [string, keyof Kpis, number][] = [
  ['Arrivals (parties)', 'arrivals', 1],
  ['Walk-away % (balked + reneged)', 'walkaway_pct', 1],
  ['Lost parties (incl. unserved at last orders)', 'lost_parties', 1],
  ['Mean wait, all arrivals (min)', 'mean_wait_all_min', 1],
  ['Mean wait, seated only (min) - biased, for comparison', 'mean_wait_seated_min', 1],
  ['Median wait to be seated (min)', 'median_wait_min', 1],
  ['p90 wait to be seated (min)', 'p90_wait_min', 1],
  ['Seat utilisation %', 'utilisation_pct', 1],
  ['Dine-in revenue (INR)', 'dinein_revenue', 0],
  ['Lounge orders (persons)', 'lounge_persons', 1],
  ['Lounge revenue (INR)', 'lounge_revenue', 0],
  ['Takeaway orders', 'takeaway_orders', 1],
  ['Takeaway revenue (INR)', 'takeaway_revenue', 0],
];

console.log(`SIMULATED, not measured. N=${p.replications} seeded replications, seed ${p.base_seed}, ${totalSeats(p)} seats (ASSUMED).`);
console.log('Mean [95% interval]. The interval is sampling noise only; see the sweep for input uncertainty.\n');
console.log(`| KPI | ${ids.map((id) => SCENARIOS[id].label).join(' | ')} |`);
console.log(`|---|${ids.map(() => '---').join('|')}|`);
for (const [label, key, d] of rows) console.log(`| ${label} | ${ids.map((id) => fmt(key, id, d)).join(' | ')} |`);

console.log('\nPaired difference vs baseline (same seeds), walk-away percentage points:');
for (const id of ids.slice(1)) {
  const d = pairedDelta(runs.baseline, runs[id], 'walkaway_pct')!;
  const clear = d.lo > 0 || d.hi < 0 ? '' : '  -> no clear difference';
  console.log(`  ${id}: ${d.mean.toFixed(1)} [${d.lo.toFixed(1)}, ${d.hi.toFixed(1)}]${clear}`);
}

const spend = entries.dinein_spend_per_two;
const base = summarise(runs.baseline, 'dinein_revenue')!.mean;
const band = spend.candidates!.map((c) => Math.round((base * c.value) / p.dinein_spend_per_two));
console.log(`\nBaseline dine-in revenue across the cost-for-two conflict (${spend.candidates!.map((c) => c.value).join(' / ')}): INR ${Math.min(...band)} to ${Math.max(...band)}`);

console.log('\nInput-uncertainty sweep, walk-away % (each ASSUMED number moved to its range min and max, one at a time):');
for (const id of ids) {
  const s = sweep(p, id, 'walkaway_pct', opts);
  const all = s.flatMap((x) => [x.atMin!, x.atMax!]);
  const top = [...s].sort((a, b) => Math.abs(b.atMax! - b.atMin!) - Math.abs(a.atMax! - a.atMin!)).slice(0, 4);
  console.log(`  ${id}: ${Math.min(...all).toFixed(1)} to ${Math.max(...all).toFixed(1)}; biggest drivers: ${top.map((x) => `${x.param} (${x.atMin!.toFixed(1)} -> ${x.atMax!.toFixed(1)})`).join(', ')}`);
}
