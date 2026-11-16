import type { SimEvent } from '../sim/engine.ts';
import type { ZoneId } from '../data/layout.ts';

// On-screen durations in simulated minutes. Cosmetic only: they never feed back into the model.
export const WALK = 1;
export const EXIT = 1.5;
export const TAKEAWAY_STOP = 3;

/** One party's evening, read straight from the event log. */
export interface Track {
  id: number;
  size: number;
  arrive: number;
  tQueue: number | null;
  tLeaveQueue: number | null;
  outcome: 'seat' | 'balk' | 'renege' | 'unserved';
  tSeat: number | null;
  tDepart: number | null;
  tables: number[];
  lounge: boolean;
  takeaway: boolean;
  litres: number;
  /** Minutes the party was willing to wait, from the queue event. null = never queued. */
  patience: number | null;
}

export function buildTracks(log: SimEvent[]): Track[] {
  const m = new Map<number, Track>();
  for (const e of log) {
    if (e.type === 'arrive')
      m.set(e.party, { id: e.party, size: e.size, arrive: e.t, tQueue: null, tLeaveQueue: null, outcome: 'balk', tSeat: null, tDepart: null, tables: [], lounge: false, takeaway: false, litres: 0, patience: null });
    const tr = m.get(e.party)!;
    if (e.type === 'queue') { tr.tQueue = e.t; tr.patience = e.patience ?? null; }
    else if (e.type === 'lounge_order') tr.lounge = true;
    else if (e.type === 'renege') { tr.outcome = 'renege'; tr.tLeaveQueue = e.t; }
    else if (e.type === 'unserved_close') { tr.outcome = 'unserved'; tr.tLeaveQueue = e.t; }
    else if (e.type === 'seat') { tr.outcome = 'seat'; tr.tSeat = e.t; tr.tables = e.tables!; if (tr.tQueue !== null) tr.tLeaveQueue = e.t; }
    else if (e.type === 'depart') tr.tDepart = e.t;
    else if (e.type === 'takeaway') { tr.takeaway = true; tr.litres = e.litres ?? 0; }
  }
  return [...m.values()];
}

export type Phase = 'approach' | 'queue' | 'lounge' | 'to_table' | 'seated' | 'takeaway' | 'leaving';

/** What a party is doing at time t, with progress k in 0..1 through that phase. null = not on screen. */
export function phaseAt(tr: Track, t: number): { phase: Phase; k: number } | null {
  const seg = (from: number, dur: number) => Math.min(1, Math.max(0, (t - from) / dur));
  if (t < tr.arrive - WALK) return null;
  if (t < tr.arrive) return { phase: 'approach', k: seg(tr.arrive - WALK, WALK) };
  if (tr.tQueue !== null && t < tr.tLeaveQueue!) return { phase: tr.lounge ? 'lounge' : 'queue', k: seg(tr.tQueue, WALK) };
  if (tr.outcome === 'seat') {
    if (t < tr.tSeat! + WALK) return { phase: 'to_table', k: seg(tr.tSeat!, WALK) };
    if (t < tr.tDepart!) return { phase: 'seated', k: 1 };
    return t < tr.tDepart! + EXIT ? { phase: 'leaving', k: seg(tr.tDepart!, EXIT) } : null;
  }
  const left = tr.tLeaveQueue ?? tr.arrive;
  if (tr.takeaway && t < left + TAKEAWAY_STOP) return { phase: 'takeaway', k: seg(left, TAKEAWAY_STOP) };
  const start = left + (tr.takeaway ? TAKEAWAY_STOP : 0);
  return t < start + EXIT ? { phase: 'leaving', k: seg(start, EXIT) } : null;
}

/** Position in line (0 = front) among parties waiting in the same place at time t. */
export function queueSlot(tracks: Track[], tr: Track, t: number): number {
  let n = 0;
  for (const o of tracks) {
    if (o === tr || o.lounge !== tr.lounge || o.tQueue === null || o.tQueue > t || t >= o.tLeaveQueue!) continue;
    if (o.tQueue < tr.tQueue! || (o.tQueue === tr.tQueue && o.id < tr.id)) n++;
  }
  return n;
}

/** Live counts for the HUD, from the same tracks the people are drawn from. */
export function countsAt(tracks: Track[], t: number) {
  const c = { arrived: 0, waitingParties: 0, seatedPersons: 0, walkedAway: 0, unserved: 0, finished: 0, tokens: 0, takeawayLitres: 0 };
  for (const tr of tracks) {
    if (tr.arrive > t) continue;
    c.arrived++;
    if (tr.tQueue !== null && tr.tQueue <= t) c.tokens++; // parties that joined the queue; shown as tokens under the waitlist
    if (tr.takeaway && (tr.tLeaveQueue ?? tr.arrive) <= t) c.takeawayLitres += tr.litres;
    if (tr.tQueue !== null && t < tr.tLeaveQueue!) c.waitingParties++;
    else if (tr.outcome === 'seat') { if (t >= tr.tDepart!) c.finished++; else if (t >= tr.tSeat!) c.seatedPersons += tr.size; }
    else if (tr.outcome === 'unserved') c.unserved++;
    else c.walkedAway++;
  }
  return c;
}

/** Overlay "Seats in use": indices of tables with a party at them at time t (seat event up to depart event). */
export function occupiedTables(tracks: Track[], t: number): Set<number> {
  const out = new Set<number>();
  for (const tr of tracks) if (tr.tSeat !== null && t >= tr.tSeat && t < tr.tDepart!) tr.tables.forEach((i) => out.add(i));
  return out;
}

/** Overlay "Patience used": share of its patience a waiting party has used at time t, 0..1. null = not waiting. */
export function patienceUsed(tr: Track, t: number): number | null {
  if (tr.tQueue === null || tr.patience === null || t < tr.tQueue || t >= tr.tLeaveQueue!) return null;
  return Math.min(1, (t - tr.tQueue) / tr.patience);
}

export interface ChainStep { id: string; label: string; value: string; zone: ZoneId | null }
/** The service chain: the same live counts as the top bar, in the order a party goes through them. zone = where a click looks (null = whole venue). */
export function chainAt(c: ReturnType<typeof countsAt>, sc: { waitlist: boolean; takeaway: boolean }): ChainStep[] {
  const parties = (n: number) => `${n} ${n === 1 ? 'party' : 'parties'}`;
  return [
    { id: 'arrive', label: 'Arrived', value: parties(c.arrived), zone: 'entrance' },
    { id: 'queue', label: sc.waitlist ? 'Took a token' : 'Joined the queue', value: parties(c.tokens), zone: 'pavement' },
    { id: 'wait', label: 'Waiting now', value: parties(c.waitingParties), zone: 'pavement' },
    { id: 'seated', label: 'Seated now', value: `${c.seatedPersons} people`, zone: null },
    { id: 'leave', label: 'Left', value: `${c.finished} after a table · ${c.walkedAway} without`, zone: 'entrance' },
    ...(sc.takeaway ? [{ id: 'takeaway', label: 'Takeaway', value: `${+c.takeawayLitres.toFixed(1)} L`, zone: null }] : []),
  ];
}

/** The party to follow at time t: the latest arrival on screen that joins the queue or gets a table (else any on screen). Read from the log; no randomness. */
export function pickFollow(tracks: Track[], t: number): Track | null {
  const onScreen = tracks.filter((tr) => tr.arrive <= t && phaseAt(tr, t));
  const stays = onScreen.filter((tr) => tr.outcome !== 'balk');
  return (stays.length ? stays : onScreen).reduce<Track | null>((best, tr) => (!best || tr.arrive > best.arrive ? tr : best), null);
}

/** What the followed party is doing at time t, in plain words. null = no longer on screen. */
export function followText(tr: Track, t: number): string | null {
  const ph = phaseAt(tr, t);
  if (!ph) return null;
  const min = (from: number) => `${Math.max(0, Math.round(t - from))} min`;
  const doing = {
    approach: 'arriving', queue: `waiting, ${min(tr.tQueue ?? t)} so far`, lounge: `waiting in the lounge, ${min(tr.tQueue ?? t)} so far`,
    to_table: 'walking to a table', seated: `seated, ${min(tr.tSeat ?? t)} at the table`, takeaway: 'at the takeaway counter', leaving: 'leaving',
  }[ph.phase];
  return `Party of ${tr.size}: ${doing}`;
}

/** table = index of the table the party was seated at (null if it never got one), so a click can look at the right place. */
export interface FeedItem { t: number; kind: 'seated' | 'balked' | 'gave_up' | 'unserved'; text: string; table: number | null }
/** Things that happened to parties in (t0, t1], straight from the tracks. Feeds the on-screen toasts. */
export function feedBetween(tracks: Track[], t0: number, t1: number): FeedItem[] {
  const out: FeedItem[] = [];
  const hit = (t: number | null): t is number => t !== null && t > t0 && t <= t1;
  for (const tr of tracks) {
    const who = `Party of ${tr.size}`;
    if (tr.outcome === 'seat' && hit(tr.tSeat)) {
      const wait = Math.round(tr.tSeat - (tr.tQueue ?? tr.tSeat));
      out.push({ t: tr.tSeat, kind: 'seated', table: tr.tables[0] ?? null, text: `${who} seated ${wait >= 1 ? `after ${wait} min` : 'straight away'}` });
    } else if (tr.outcome === 'balk' && hit(tr.arrive)) out.push({ t: tr.arrive, kind: 'balked', table: null, text: `${who} left on arrival` });
    else if (tr.outcome === 'renege' && hit(tr.tLeaveQueue)) out.push({ t: tr.tLeaveQueue, kind: 'gave_up', table: null, text: `${who} gave up after ${Math.round(tr.tLeaveQueue - tr.tQueue!)} min` });
    else if (tr.outcome === 'unserved' && hit(tr.tLeaveQueue)) out.push({ t: tr.tLeaveQueue, kind: 'unserved', table: null, text: `${who} still waiting at closing` });
  }
  return out.sort((a, b) => a.t - b.t);
}
