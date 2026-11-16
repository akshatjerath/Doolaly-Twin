export interface CI { mean: number; lo: number; hi: number; n: number }

/** Mean with a normal-approximation 95% interval. Nulls ("not estimable") are skipped; n says how many were used. */
export function ci95(values: (number | null)[]): CI | null {
  const xs = values.filter((v): v is number => v !== null);
  const n = xs.length;
  if (n === 0) return null;
  const mean = xs.reduce((s, x) => s + x, 0) / n;
  const sd = n > 1 ? Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : 0;
  const half = (1.96 * sd) / Math.sqrt(n);
  return { mean, lo: mean - half, hi: mean + half, n };
}

/**
 * Kaplan-Meier quantile of time-to-seat. `seated: false` rows are right-censored
 * (the party left or was turned away before being seated). Returns null when the
 * curve never reaches the quantile: "not estimable", never 0.
 */
export function kmQuantile(obs: { t: number; seated: boolean }[], q: number): number | null {
  const sorted = [...obs].sort((a, b) => a.t - b.t || Number(b.seated) - Number(a.seated));
  let atRisk = sorted.length;
  let surv = 1;
  for (let i = 0; i < sorted.length; ) {
    const t = sorted[i].t;
    let events = 0, leaving = 0;
    for (; i < sorted.length && sorted[i].t === t; i++) {
      leaving++;
      if (sorted[i].seated) events++;
    }
    if (events) {
      surv *= 1 - events / atRisk;
      if (surv <= 1 - q) return t;
    }
    atRisk -= leaving;
  }
  return null;
}
