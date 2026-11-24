import raw from './params.json' with { type: 'json' };

export type Tag = 'VERIFIED' | 'OBSERVED' | 'ASSUMED' | 'SIMULATED';

export interface ParamEntry {
  label: string;
  value: unknown;
  unit: string;
  tag: Tag;
  source: string;
  confidence: string;
  note: string;
  range?: { min: number; max: number; step: number };
  candidates?: { value: number; source: string }[];
  gate?: 'B' | 'C';
}

/** Plain values the engine reads. Keys match params.json ids. */
export interface SimParams {
  window_start_min: number;
  arrival_window_min: number;
  close_after_last_orders_min: number;
  arrival_rate_per_hour: number[];
  arrival_scale: number;
  party_size_pmf: Record<string, number>;
  indoor_2tops: number;
  indoor_3tops: number;
  indoor_4tops: number;
  indoor_high4: number;
  outdoor_2tops: number;
  outdoor_3tops: number;
  outdoor_4tops: number;
  outdoor_high6: number;
  outdoor_high8: number;
  allow_table_join: boolean;
  balk_per_queued_party: number;
  patience_median_min: number;
  patience_sigma: number;
  dwell_median_min: number;
  dwell_sigma: number;
  A_balk_mult: number;
  A_patience_mult: number;
  B_lounge_capacity: number;
  B_lounge_conversion: number;
  B_lounge_patience_mult: number;
  B_pour_spend: number | null;
  C_takeaway_share: number;
  C_litres_per_order: number;
  C_price_per_litre: number;
  dinein_spend_per_two: number;
  stepout_share: number;
  washroom_share: number;
  remake_share: number;
  remake_delay_min: number;
  replications: number;
  base_seed: number;
}

// Register row ids (D5), visit-log rows, the layout folder, or the dated user interview.
// Photos, Street View and the Gemini prototype are deliberately not valid sources.
const SOURCE_OK = /^([A-Z]\d+(, [A-Z]\d+)*|visit-log\.csv#row\d+|reference\/layout\/\S+|user-interview-\d{4}-\d{2}-\d{2})$/;
const TAGS: Tag[] = ['VERIFIED', 'OBSERVED', 'ASSUMED', 'SIMULATED'];

/** Returns a list of problems; empty means the registry is valid. */
export function validateParams(entries: Record<string, ParamEntry>): string[] {
  const errs: string[] = [];
  for (const [id, e] of Object.entries(entries)) {
    for (const f of ['label', 'unit', 'tag', 'source', 'confidence', 'note'] as const)
      if (typeof e[f] !== 'string' || !e[f]) errs.push(`${id}: missing ${f}`);
    if (!TAGS.includes(e.tag)) errs.push(`${id}: bad tag ${e.tag}`);
    if (e.source !== 'none' && !SOURCE_OK.test(e.source)) errs.push(`${id}: source not allowed: ${e.source}`);
    if ((e.tag === 'VERIFIED' || e.tag === 'OBSERVED') && e.source === 'none') errs.push(`${id}: ${e.tag} needs a source`);
    if (e.value === null && !(e.tag === 'ASSUMED' && e.note.startsWith('Insufficient evidence')))
      errs.push(`${id}: null value must be ASSUMED with an "Insufficient evidence" note`);
    if (e.tag === 'ASSUMED' && (typeof e.value === 'number' || e.value === null)) {
      if (!e.range) errs.push(`${id}: ASSUMED number needs a range`);
      else if (typeof e.value === 'number' && (e.value < e.range.min || e.value > e.range.max))
        errs.push(`${id}: value outside range`);
    }
    if (/^[BC]_/.test(id) && e.gate !== id[0]) errs.push(`${id}: needs gate "${id[0]}"`);
  }
  return errs;
}

export const entries = raw as unknown as Record<string, ParamEntry>;

export function loadParams(): SimParams {
  const errs = validateParams(entries);
  if (errs.length) throw new Error('params.json invalid:\n' + errs.join('\n'));
  return Object.fromEntries(Object.entries(entries).map(([k, e]) => [k, e.value])) as unknown as SimParams;
}
