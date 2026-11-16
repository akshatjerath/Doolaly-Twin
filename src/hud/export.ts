import { KPI_META } from '../sim/kpi.ts';
import type { CI } from '../sim/stats.ts';
import type { Results, Sweep } from '../sim/client.ts';

const NO_DATA = 'Insufficient evidence';

/**
 * The statistics table as CSV, from the same replication batch as the screen.
 * Same rule as the screen: a figure that could be computed in under half the evenings is not given as a number.
 */
export function resultsCsv(r: Results, policy: string, isBaseline: boolean, sweep: Sweep | null = null): string {
  const cells = (c: CI | null, d: number) => (c && c.n >= r.n / 2 ? [c.mean.toFixed(d), c.lo.toFixed(d), c.hi.toFixed(d), String(c.n)] : [NO_DATA, '', '', String(c?.n ?? 0)]);
  const cols = (name: string) => [`${name}_mean`, `${name}_lo95`, `${name}_hi95`, `${name}_evenings`];
  const lines = [
    '# Doolally Khar twin. SIMULATED, not measured. Basis of every figure: ASSUMED inputs.',
    `# Policy: ${policy}. ${r.n} seeded evenings. lo95 and hi95 are the run-to-run spread of the mean, not forecast accuracy.`,
    ['kpi', 'label', 'tag', ...cols('baseline'), ...(isBaseline ? [] : [...cols('policy'), ...cols('change')])].join(','),
    ...r.rows.map((row) => {
      const meta = KPI_META.find((m) => m.key === row.key)!;
      return [row.key, `"${meta.label.replace(/"/g, '""')}"`, 'SIMULATED', ...cells(row.base, meta.digits),
        ...(isBaseline ? [] : [...cells(row.scen, meta.digits), ...cells(row.delta, meta.digits)])].join(',');
    }),
  ];
  if (sweep) lines.push('', '# Sensitivity: mean walk-away % with one assumed input at each end of its range', 'input,walkaway_pct_at_min,walkaway_pct_at_max',
    ...sweep.map((s) => [s.param, s.atMin?.toFixed(1) ?? NO_DATA, s.atMax?.toFixed(1) ?? NO_DATA].join(',')));
  return lines.join('\n') + '\n';
}
