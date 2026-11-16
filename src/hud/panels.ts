import register from '../../reference/evidence-register.md?raw';
import { entries } from '../data/params.ts';
import { layout } from '../data/layout.ts';
import { tagChip, type TagName } from '../data/tags.ts';
import { KPI_META, type Kpis } from '../sim/kpi.ts';
import type { CI } from '../sim/stats.ts';
import type { Results, Sweep } from '../sim/client.ts';
import type { Overrides } from '../sim/worker.ts';

type Child = string | Node;
function h<K extends keyof HTMLElementTagNameMap>(tag: K, attrs: Record<string, string> = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  el.append(...children);
  return el;
}

const NO_DATA = 'Insufficient evidence';
// A figure that could be computed in under half the evenings is not reported as a number.
let total = 1;
const fmt = (c: CI | null, d: number) => (c && c.n >= total / 2 ? `${c.mean.toFixed(d)} [${c.lo.toFixed(d)}, ${c.hi.toFixed(d)}]${c.n < total ? ` (estimable in ${c.n}/${total})` : ''}` : NO_DATA);

const ok = (c: CI | null): c is CI => !!c && c.n >= total / 2;
const NO_CHANGE = 'No clear difference';
/** Paired change vs baseline in words; "clear" means the interval excludes zero. null = not estimable. */
function changeWord(d: CI | null, better: 'lower' | 'higher' | 'none'): string | null {
  if (!ok(d)) return null;
  if (d.lo <= 0 && d.hi >= 0) return NO_CHANGE;
  const verdict = better === 'none' ? '' : (d.mean < 0) === (better === 'lower') ? ' (better)' : ' (worse)';
  return `${d.mean < 0 ? '↓ lower' : '↑ higher'}${verdict}`;
}

// Plain-language names for the glance cards; the model terms stay in the full table and the evidence panel.
const CARDS: { key: keyof Kpis; label: string; unit: string; tip: string }[] = [
  { key: 'walkaway_pct', label: 'Guests who leave', unit: '% of parties', tip: 'Share of parties who see the queue and go, or give up waiting' },
  { key: 'median_wait_min', label: 'Typical wait (seated parties)', unit: 'min', tip: 'Half of seated parties waited less than this; guests who left are counted separately' },
  { key: 'utilisation_pct', label: 'Seats in use', unit: '%', tip: 'Share of seat-time occupied during the evening' },
];
const inr = (x: number) => Math.round(Math.abs(x)).toLocaleString('en-IN');
const signed = (x: number) => `${x < 0 ? '−' : '+'}${inr(x)}`;

/** Four glance cards. Every number comes from the same replication batch as the full table. */
export function renderKpiCards(el: HTMLElement, r: Results, sc: { baseline: boolean; lounge: boolean; takeaway: boolean }) {
  total = r.n;
  const base = sc.baseline;
  const row = (k: keyof Kpis) => r.rows.find((x) => x.key === k)!;
  const cells = CARDS.map(({ key, label, unit, tip }) => {
    const x = row(key), meta = KPI_META.find((m) => m.key === key)!, v = base ? x.base : x.scen;
    const word = changeWord(x.delta, meta.better);
    // Before and after as a pair, so the scenario figure is never read without the baseline it is compared to.
    const was = ok(x.base) ? ` · baseline ${x.base.mean.toFixed(0)}` : '';
    const change = base ? 'Baseline' : !word ? NO_DATA : (word === NO_CHANGE ? word : `${word} by ${Math.abs(x.delta!.mean).toFixed(1)}`) + was;
    return h('div', { class: 'kpi', title: tip, 'data-figure': key }, h('h3', {}, label),
      h('p', { class: 'kpi-value' }, ...(ok(v) ? [v.mean.toFixed(0), h('span', {}, ` ${unit}`)] : [NO_DATA])),
      h('p', { class: 'kpi-change' }, change), tagChip('SIMULATED'));
  });

  // Revenue is a band, never a point: the cost-for-two figure conflicts between sources.
  const rev = row('dinein_revenue'), spend = entries.dinein_spend_per_two;
  const across = (x: number) => spend.candidates!.map((c) => (x * c.value) / (spend.value as number));
  const band = base ? (ok(rev.base) ? across(rev.base.mean) : null) : ok(rev.delta) ? [...across(rev.delta.lo), ...across(rev.delta.hi)] : null;
  const show = base ? inr : signed;
  const extra = (k: keyof Kpis, name: string) => { const s = row(k).scen; return `${name}: ${ok(s) && s.mean > 0 ? `${signed(s.mean)} INR` : NO_DATA}`; };
  cells.push(h('div', { class: 'kpi', title: `Dine-in revenue across the cost-for-two conflict (${spend.source})`, 'data-figure': 'dinein_revenue' }, h('h3', {}, 'Revenue vs today'),
    h('p', { class: 'kpi-value band' }, ...(band ? [`${show(Math.min(...band))} to ${show(Math.max(...band))}`, h('span', {}, ' INR')] : [NO_DATA])),
    h('p', { class: 'kpi-change' }, base ? 'Baseline dine-in, per evening' : 'Dine-in change, per evening',
      ...(sc.lounge ? [h('br'), extra('lounge_revenue', 'Lounge')] : []), ...(sc.takeaway ? [h('br'), extra('takeaway_revenue', 'Takeaway')] : [])),
    tagChip('SIMULATED'), h('span', { class: 'fine' }, ' basis: ASSUMED')));
  el.replaceChildren(...cells);
}

/** Results + before/after. Every number shown comes from the worker's replication batch. */
export function renderResults(el: HTMLElement, r: Results, scenarioLabel: string, isBaseline: boolean) {
  total = r.n;
  const table = h('table', {}, h('thead', {}, h('tr', {},
    h('th', { scope: 'col' }, 'KPI'), h('th', { scope: 'col' }, 'Before: baseline'),
    ...(isBaseline ? [] : [h('th', { scope: 'col' }, `After: ${scenarioLabel}`), h('th', { scope: 'col' }, 'Change (same seeds)')]))));
  const body = h('tbody');
  for (const row of r.rows) {
    const meta = KPI_META.find((m) => m.key === row.key)!;
    const tr = h('tr', { 'data-figure': row.key }, h('th', { scope: 'row' }, meta.label, ' ', tagChip('SIMULATED')), h('td', {}, fmt(row.base, meta.digits)));
    if (!isBaseline) {
      tr.append(h('td', {}, fmt(row.scen, meta.digits)));
      const word = changeWord(row.delta, meta.better);
      tr.append(h('td', {}, word ? `${word}: ${fmt(row.delta, meta.digits)}` : NO_DATA));
    }
    if (row.key === 'dinein_revenue' && row.base) {
      const spend = entries.dinein_spend_per_two;
      const band = spend.candidates!.map((c) => Math.round((row.base!.mean * c.value) / (spend.value as number)));
      tr.firstElementChild!.append(h('small', {}, ` Baseline band across the cost-for-two conflict (${spend.source}): ${Math.min(...band)} to ${Math.max(...band)}`));
    }
    body.append(tr);
  }
  table.append(body);
  el.replaceChildren(
    h('p', { class: 'fine' }, `Mean [run-to-run spread, a 95% interval] over ${r.n} seeded evenings. The spread is how much the average moves between simulated evenings, not forecast accuracy; input uncertainty is far larger (run the sensitivity check). "Mean wait before leaving" covers parties who queued and then left. Basis of every figure: ASSUMED inputs.`),
    table,
  );
}

/** Tornado chart: how far walk-away % moves when each assumed input goes to the ends of its range. */
export function renderTornado(el: HTMLElement, sweep: Sweep) {
  const rows = sweep.filter((s) => s.atMin !== null && s.atMax !== null).map((s) => ({ ...s, lo: Math.min(s.atMin!, s.atMax!), hi: Math.max(s.atMin!, s.atMax!) }))
    .sort((a, b) => b.hi - b.lo - (a.hi - a.lo)).slice(0, 8);
  const max = Math.max(...rows.map((r) => r.hi), 1);
  const all = rows.flatMap((r) => [r.lo, r.hi]);
  el.replaceChildren(
    h('p', {}, tagChip('SIMULATED'), ` Input uncertainty: walk-away % ranges from ${Math.min(...all).toFixed(1)} to ${Math.max(...all).toFixed(1)} when one assumed input at a time moves across its range.`),
    ...rows.map((r) => {
      const bar = h('div', { class: 'bar-fill' });
      bar.style.marginLeft = `${(r.lo / max) * 100}%`;
      bar.style.width = `${Math.max(0.5, ((r.hi - r.lo) / max) * 100)}%`;
      return h('div', { class: 'tornado-row' }, h('span', {}, entries[r.param].label), h('div', { class: 'track' }, bar), h('span', {}, `${r.atMin!.toFixed(1)} → ${r.atMax!.toFixed(1)}`));
    }),
  );
}

/** Sliders generated from the registry; each shows its tag. Calls back with the full override set. */
export function renderSliders(el: HTMLElement, ids: string[], onChange: (o: Overrides) => void) {
  const overrides: Overrides = {};
  for (const id of ids) {
    const e = entries[id];
    const out = h('output', {}, e.value === null ? NO_DATA : String(e.value));
    const input = h('input', { type: 'range', min: String(e.range!.min), max: String(e.range!.max), step: String(e.range!.step), value: String(e.value ?? e.range!.min), 'aria-label': e.label, 'data-param': id });
    input.addEventListener('input', () => {
      overrides[id] = Number(input.value);
      out.textContent = input.value;
      onChange({ ...overrides });
    });
    el.append(h('label', { class: 'slider', title: e.note }, h('span', {}, e.label, ' ', tagChip(e.tag as TagName), e.gate ? ` scenario ${e.gate}` : ''), input, out, h('small', {}, e.unit)));
  }
}

/** Evidence & Method: every parameter with tag, source, confidence and note, straight from the registry. */
export function renderEvidence(el: HTMLElement) {
  const params = h('table', {}, h('thead', {}, h('tr', {}, ...['Parameter', 'Value', 'Tag', 'Source', 'Confidence', 'Note'].map((t) => h('th', { scope: 'col' }, t)))));
  const pb = h('tbody');
  for (const e of Object.values(entries)) {
    const value = e.value === null ? NO_DATA : typeof e.value === 'object' ? JSON.stringify(e.value) : String(e.value);
    const conflict = e.candidates ? ` Conflict: ${e.candidates.map((c) => `${c.value} (${c.source})`).join(', ')}.` : '';
    pb.append(h('tr', {}, h('th', { scope: 'row' }, e.label), h('td', {}, `${value} ${e.unit}`), h('td', {}, tagChip(e.tag as TagName)), h('td', {}, e.source), h('td', {}, e.confidence), h('td', {}, e.note + conflict + (e.gate ? ' Licence-dependent.' : ''))));
  }
  params.append(pb);
  const areas = h('ul', {}, ...layout.zones.map((z) => h('li', {}, tagChip(z.tag), ` ${z.label}: ${z.note} Assumed: ${z.assumed}`)),
    ...layout.proposed.map((z) => h('li', {}, `Proposed (scenario ${z.scenario}): ${z.label}. ${z.note}`)));
  el.replaceChildren(
    h('p', { class: 'banner' }, 'SIMULATED, not measured outcomes. This is a what-if model built almost entirely on assumed inputs.'),
    h('h3', {}, 'Method'),
    h('p', {}, 'A seeded discrete-event simulation of one evening of walk-in parties: arrivals, balking, waiting with limited patience, seating at tables, and departure. Each scenario faces the same simulated guests, so differences are paired. Waits of people who left are counted, not dropped. Scenarios B and C depend on licence questions that are unconfirmed.'),
    h('h3', {}, 'Parameters'), params,
    h('h3', {}, 'Layout'),
    h('p', {}, `Scale: ${layout.metresPerPx.note} Steps: ${layout.stepCount.note}`), areas,
    h('h3', {}, 'References'),
    h('p', {}, 'Source ids above (for example D5, R8, A2) refer to rows in the evidence register below. Interior listing photos and Street View frames were used as visual reference only and are not shown or redistributed here. 3D assets are credited in ASSETS.md.'),
    h('details', {}, h('summary', {}, 'Evidence register (full text)'), h('pre', {}, register)),
  );
}
