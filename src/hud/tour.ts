import type { ZoneId } from '../data/layout.ts';

// Static copy for the two tours. No figures here: every number on screen comes from the simulation, never from a caption.

/** target = id of the element to outline; tab = which phone tab shows it. */
export interface TourStep { target: string; tab?: 'glance' | 'policies' | 'context' | 'more'; title: string; text: string }

export const ONBOARDING: TourStep[] = [
  { target: 'top', title: 'A simulated evening', text: 'This is one simulated evening at a taproom. Everything you see is model output built on assumed inputs, not a measurement of the real venue.' },
  { target: 'policies', tab: 'policies', title: 'What to show', text: 'As-Is is today\'s way of running the evening. My Fix is the alternative you pick. Two of the alternatives depend on a licence that is not confirmed; they stay locked until you tick the box to see a hypothetical run.' },
  { target: 'stage', title: 'Watch the evening', text: 'People arrive, wait, sit and leave exactly as the event log says. Select a marker to see what is known and what is assumed about that area.' },
  { target: 'glance', tab: 'glance', title: 'Compare at a glance', text: 'These figures are averages over many simulated evenings, shown against today\'s way of running it. Each one carries its tag.' },
  { target: 'context', tab: 'context', title: 'Check the evidence', text: 'Statistics has the full before and after table and the sensitivity check. Evidence and method lists every input, its source and how sure it is.' },
];

/**
 * One presenter-tour scene: where the camera looks (null = the whole venue), which panel is outlined, and the caption.
 * Camera and panels only. A scene has no field that could change time, policy, people or figures.
 */
export interface Scene { zone: ZoneId | null; target: string; text: string }

export const PRESENTER: Scene[] = [
  { zone: null, target: 'top', text: 'One simulated evening at a taproom. Model output on assumed inputs, not measurements.' },
  { zone: 'pavement', target: 'live', text: 'Walk-in parties wait on the public pavement. Some leave on arrival; some give up waiting.' },
  { zone: 'hall', target: 'chain', text: 'Tables turn over through the evening. The service chain counts each stage from the event log.' },
  { zone: 'bar', target: 'more', text: 'Hatched and dashed areas are assumed layout. The bar comes from a rough plan only.' },
  { zone: null, target: 'policies', text: 'There are several ways to run the evening. Two depend on a licence that is unconfirmed.' },
  { zone: null, target: 'glance', text: 'The comparison: averages over the whole batch of evenings, against the baseline, tagged as simulated.' },
];
