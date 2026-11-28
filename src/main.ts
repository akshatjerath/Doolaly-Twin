import * as THREE from 'three';
import gsap from 'gsap';
import { loadParams, entries } from './data/params.ts';
import presets from './data/presets.json' with { type: 'json' };
import { lockIn, presentView, managerData, type Locked, type ShowMode, type FixId } from './hud/present.ts';
import { layout, zone, floorY, toPx, type ZoneId } from './data/layout.ts';
import { buildRoom } from './scene/room.ts';
import { setupLighting, PRESETS, type PresetId } from './scene/lighting.ts';
import { createView } from './scene/view.ts';
import { createHotspots, zoneShot } from './scene/hotspots.ts';
import { ONBOARDING, PRESENTER } from './hud/tour.ts';
import { placeTables } from './scene/furniture.ts';
import { createSimClient } from './sim/client.ts';
import { SCENARIOS, type Scenario } from './sim/engine.ts';
import { buildTracks, countsAt, chainAt, occupiedTables, patienceUsed, phaseAt, pickFollow, followText, feedBetween, EXIT, type Track, type FeedItem } from './agents/playback.ts';
import { createCrowd } from './agents/crowd.ts';
import { tagChip, type TagName } from './data/tags.ts';
import { renderResults, renderKpiCards, renderTornado, renderSliders, renderEvidence } from './hud/panels.ts';
import { resultsCsv } from './hud/export.ts';
import type { Results, Sweep } from './sim/client.ts';
import type { Overrides } from './sim/worker.ts';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const params = loadParams();
const scene = new THREE.Scene();
const room = buildRoom(params);
scene.add(room.group);

const view = createView($('scene'), scene, room.colliders);
const applyLighting = setupLighting(scene, room);
const updateHotspots = createHotspots($('hotspots'), $('card'), view.camera, view.flyTo);

// The badge counts what is assumed, straight from the layout data.
const assumedCount = layout.zones.filter((z) => z.tag === 'ASSUMED LAYOUT').length;
$('assumed-badge').textContent = `◇ Layout partly assumed: ${assumedCount} of ${layout.zones.length} areas, all sizes`;

$('theme').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('twin-theme', next); } catch { /* storage blocked: the choice lasts for this visit only */ }
});

const setMode = (m: 'overview' | 'walk') => {
  view.setMode(m);
  room.roofs.visible = m === 'walk';
  $('walk-hint').hidden = m !== 'walk';
  document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === m)));
};
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.mode as 'overview' | 'walk')));
document.querySelectorAll<HTMLButtonElement>('[data-preset]').forEach((b) => b.addEventListener('click', () => {
  if (view.getMode() !== 'overview') setMode('overview');
  view.presets[b.dataset.preset as keyof typeof view.presets]();
}));

const lightSel = $<HTMLSelectElement>('lighting');
for (const [id, p] of Object.entries(PRESETS)) lightSel.add(new Option(p.label, id));
const setLighting = (id: PresetId) => { lightSel.value = id; view.setExposure(applyLighting(id)); };
lightSel.addEventListener('change', () => setLighting(lightSel.value as PresetId));

window.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && view.getMode() === 'walk') setMode('overview');
});

setLighting('evening');
view.camera.position.set(-9, 15, 19);
setMode('overview');

$('live-tag').append(tagChip('SIMULATED'));
document.querySelectorAll<HTMLElement>('.legend [data-tag]').forEach((li) => li.prepend(tagChip(li.dataset.tag as TagName)));

// Phone: one panel at a time in the bottom sheet. On a laptop all four are visible and the tabs are hidden.
const setTab = (tab: string) => {
  document.body.dataset.tab = tab;
  document.querySelectorAll<HTMLButtonElement>('#tabs [data-tab]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tab === tab)));
};
document.querySelectorAll<HTMLButtonElement>('#tabs [data-tab]').forEach((b) => b.addEventListener('click', () => setTab(b.dataset.tab!)));
// The area card opens in the Info panel; on a phone that panel is only visible after the tab switch, so focus it here.
$('hotspots').addEventListener('click', () => { setTab('context'); $('card').focus(); });

// Labels: the name from layout.json on every marker. Off by default at every width.
const setLabels = (on: boolean) => { document.body.classList.toggle('labels', on); $('labels').setAttribute('aria-pressed', String(on)); };
$('labels').addEventListener('click', () => setLabels(!document.body.classList.contains('labels')));
$('open-help').addEventListener('click', () => $<HTMLDialogElement>('help').showModal());

// --- Simulation playback: people are drawn from the worker's event log, nothing else ---
const sim = createSimClient();
const spots = placeTables(params);
const crowd = createCrowd(scene, spots);

// One way to "look there" for the service chain, the event list and the mini-map: press that area's scene marker
// (camera flies there and its card opens), or show the whole venue when there is no single area.
const goTo = (zone: ZoneId | null) => {
  if (view.getMode() !== 'overview') setMode('overview');
  if (zone) document.querySelector<HTMLButtonElement>(`.hotspot[data-zone="${zone}"]`)!.click(); else view.presets.isometric();
};

// Mini-map: the layout.json rectangles in plan, plus one dot per party at the spot where the scene draws it.
const NS = 'http://www.w3.org/2000/svg';
const minimap = document.getElementById('minimap')!;
{
  const xs = layout.zones.flatMap((z) => [z.rect[0], z.rect[2]]), ys = layout.zones.flatMap((z) => [z.rect[1], z.rect[3]]), pad = 40;
  minimap.setAttribute('viewBox', `${Math.min(...xs) - pad} ${Math.min(...ys) - pad} ${Math.max(...xs) - Math.min(...xs) + 2 * pad} ${Math.max(...ys) - Math.min(...ys) + 2 * pad}`);
  for (const z of layout.zones) {
    const r = document.createElementNS(NS, 'rect'), title = document.createElementNS(NS, 'title');
    title.textContent = `${z.label} (${z.tag})`;
    for (const [k, v] of [['x', z.rect[0]], ['y', z.rect[1]], ['width', z.rect[2] - z.rect[0]], ['height', z.rect[3] - z.rect[1]]] as const) r.setAttribute(k, String(v));
    if (z.tag === 'ASSUMED LAYOUT') r.setAttribute('class', 'assumed');
    r.append(title);
    r.addEventListener('click', () => goTo(z.id));
    minimap.append(r);
  }
}
const dots: SVGCircleElement[] = [];
function drawMinimap() {
  let i = 0;
  for (const [id, [x, z]] of crowd.positions()) {
    const d = (dots[i++] ??= minimap.appendChild(document.createElementNS(NS, 'circle')));
    const [px, py] = toPx(x, z);
    d.setAttribute('cx', String(px));
    d.setAttribute('cy', String(py));
    d.setAttribute('r', id === follow?.id ? '30' : '20');
    d.setAttribute('class', id === follow?.id ? 'me' : '');
    d.style.display = '';
  }
  for (; i < dots.length; i++) dots[i].style.display = 'none';
}

// Service chain: buttons are built once per policy; only their counts change while time runs.
let chainVals: HTMLElement[] = [];
function buildChain() {
  const tag = document.createElement('li');
  tag.append(tagChip('SIMULATED'));
  chainVals = [];
  $('chain').replaceChildren(tag, ...chainAt(countsAt(state.tracks, state.t), flags()).map((s) => {
    const li = document.createElement('li'), btn = document.createElement('button'), name = document.createElement('span'), val = document.createElement('b');
    li.className = 'step';
    name.textContent = s.label;
    val.textContent = s.value;
    chainVals.push(val);
    btn.append(name, val);
    btn.addEventListener('click', () => goTo(s.zone));
    li.append(btn);
    return li;
  }));
}
const END = params.arrival_window_min + params.close_after_last_orders_min + EXIT;
// mode and fix are what the viewer chose; scenario is the policy that follows from them; rep = which replication is animated.
const state = { mode: 'asis' as ShowMode, fix: 'A' as FixId, scenario: 'baseline' as Scenario['id'], rep: 0, t: 0, playing: true, speed: 4, tracks: [] as Track[] };
const flags = () => SCENARIOS[state.scenario];

const scrub = $<HTMLInputElement>('scrub');
scrub.max = String(END);
const clockText = (t: number) => {
  const m = Math.floor(params.window_start_min + t);
  return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
};
const figure = (id: string, value: number) => ($(id).textContent = String(value));

// Follow a party: a ring under one party from the event log. It reads the tracks and changes nothing in the run.
const ring = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.15, 48),
  new THREE.MeshBasicMaterial({ color: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim(), side: THREE.DoubleSide, depthTest: false, transparent: true }));
ring.rotation.x = -Math.PI / 2;
ring.renderOrder = 10;
ring.visible = false;
scene.add(ring);
let follow: Track | null = null;
const followStatus = (text: string | null) => { $('follow-status').textContent = text ?? ''; $('follow-status').hidden = !text; };
const setFollow = (tr: Track | null, note: string | null = null) => {
  follow = tr;
  ring.visible = false;
  $('follow').setAttribute('aria-pressed', String(!!tr));
  followStatus(tr ? followText(tr, state.t) : note);
};
$('follow').addEventListener('click', () => {
  if (follow) return setFollow(null);
  const pick = pickFollow(state.tracks, state.t);
  setFollow(pick, pick ? null : 'No party is on screen right now');
});

// Live feed. Throttling rule: events are collected while time plays forward and shown at most once every 2 real seconds;
// one event gets its own line, several are batched into one count line; at most 3 lines on screen, 6 seconds each.
// Scrubbing, or a jump of more than 30 simulated minutes, shows nothing for the stretch that was skipped.
// Each line is also kept in the "Recent events" list (the newest 5); selecting one looks at where it happened:
// the table's area for a seating, the entrance for a party that left on arrival, the pavement queue otherwise.
const FEED = { everyMs: 2000, liveMs: 6000, max: 3, maxJumpMin: 30, keep: 5 };
const KIND_WORDS: Record<FeedItem['kind'], string> = { seated: 'seated', balked: 'left on arrival', gave_up: 'gave up waiting', unserved: 'still waiting at closing' };
let feedT = 0, feedDue = 0, pendingFeed: FeedItem[] = [];
function flushFeed(now: number) {
  if (!pendingFeed.length || now < feedDue) return;
  feedDue = now + FEED.everyMs;
  const text = pendingFeed.length === 1 ? pendingFeed[0].text
    : (Object.keys(KIND_WORDS) as FeedItem['kind'][]).map((k) => [pendingFeed.filter((i) => i.kind === k).length, k] as const)
      .filter(([n]) => n).map(([n, k]) => `${n} ${n === 1 ? 'party' : 'parties'} ${KIND_WORDS[k]}`).join(' · ');
  const last = pendingFeed[pendingFeed.length - 1], line = `${clockText(last.t)} ${text}`;
  const zone: ZoneId = last.table !== null ? spots[last.table].zone : last.kind === 'balked' ? 'entrance' : 'pavement';
  const item = document.createElement('li'), btn = document.createElement('button');
  btn.textContent = line;
  btn.addEventListener('click', () => goTo(zone));
  item.append(btn);
  $('alerts').prepend(item);
  while ($('alerts').children.length > FEED.keep) $('alerts').lastElementChild!.remove();
  const el = document.createElement('p');
  el.className = 'toast';
  el.append(tagChip('SIMULATED'), ` ${line}`);
  pendingFeed = [];
  $('feed').append(el);
  while ($('feed').children.length > FEED.max) $('feed').firstElementChild!.remove();
  setTimeout(() => el.remove(), FEED.liveMs);
}

// Each licence-dependent policy has its own "assume the licence permits this" box.
const licenceFor = (id: Scenario['id']) => document.querySelector<HTMLInputElement>(`[data-licence="${id}"]`)?.checked ?? false;
$('t-start').textContent = clockText(0);
$('t-end').textContent = clockText(END);

// --- Present. Everything below is drawn from the locked set (see hud/present.ts): choosing a mode or a policy never runs
// the simulation. The one later call is free run, which plays further evenings of the same batch under the locked settings. ---
let locked: Locked | null = null;
let runSeq = 0;
function setTracks(tracks: Track[]) {
  state.tracks = tracks;
  crowd.setTracks(tracks);
  setFollow(null); // the old party is not in this evening
  pendingFeed = [];
  $('feed').replaceChildren();
  $('alerts').replaceChildren();
}
// What the statistics screen is showing right now; the exports write exactly this.
let shown: { r: Results; name: string; plain: boolean } | null = null, shownSweep: Sweep | null = null;
function present() {
  if (!locked) return;
  runSeq++;
  const v = presentView(locked, state.mode, state.fix, licenceFor), sc = SCENARIOS[v.policy];
  state.scenario = v.policy;
  state.rep = 0;
  document.querySelectorAll<HTMLButtonElement>('[data-show]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.show === state.mode)));
  document.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach((b) => b.setAttribute('aria-pressed', String(state.mode === 'fix' && b.dataset.scenario === state.fix)));
  $('fix-pick').hidden = state.mode !== 'fix';
  $('asis-note').hidden = state.mode !== 'asis';
  $('stripe').hidden = !(v.evening && sc.licenceDependent);
  for (const z of layout.proposed) room.proposed[z.id].visible = v.objects.includes(z.id);
  $('kiosk-note').hidden = !v.objects.includes('kiosk');
  $('run-no').textContent = freeRun ? `Evening 1 of ${params.replications}` : '';
  buildChain();
  setTracks(v.evening?.tracks ?? []); // gated: show nothing rather than an unlicensed result
  shown = shownSweep = null;
  $('tornado').replaceChildren();
  const out = $('results-body'), kpis = $('kpis');
  if (!v.evening) {
    out.textContent = kpis.textContent = 'Not permitted / unknown: no results are shown for this policy until its licence assumption is ticked.';
    return;
  }
  const plain = v.policy === 'baseline';
  renderResults(out, v.evening.results, sc.label, plain);
  shown = { r: v.evening.results, name: sc.label, plain };
  renderKpiCards(kpis, v.evening.results, { baseline: plain, lounge: sc.lounge, takeaway: sc.takeaway });
}
const show = (mode: ShowMode, fix: FixId = state.fix) => { state.mode = mode; state.fix = fix; present(); };

/** Free run only: another evening of the locked batch, simulated under the locked settings. */
async function loadRep() {
  if (!locked) return;
  const mine = ++runSeq, v = presentView(locked, state.mode, state.fix, licenceFor);
  $('run-no').textContent = freeRun ? `Evening ${state.rep + 1} of ${params.replications}` : '';
  if (!v.evening) return;
  const tracks = state.rep === 0 ? v.evening.tracks : buildTracks((await sim.hero(v.policy, true, locked.settings, { rep: state.rep })).log);
  if (mine === runSeq) setTracks(tracks); // otherwise a newer choice won the race
}

$('run-sweep').addEventListener('click', async () => {
  if (!locked || !shown) return;
  $('tornado').textContent = 'Running sensitivity check...';
  const mine = runSeq, sweep = await sim.sweep(state.scenario, true, locked.settings);
  if (mine !== runSeq) return; // the view changed while it ran
  renderTornado($('tornado'), (shownSweep = sweep));
});

// Exports. CSV comes from the batch data; PNG is a drawing of the table as it reads on screen, with the same warnings.
function download(name: string, blob: Blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
const exportNote = (text: string) => ($('export-note').textContent = text);
$('export-csv').addEventListener('click', () => {
  if (!shown) return exportNote('Nothing to export yet.');
  download('doolally-statistics.csv', new Blob([resultsCsv(shown.r, shown.name, shown.plain, shownSweep)], { type: 'text/csv' }));
  exportNote(shownSweep ? 'CSV saved, with the sensitivity check.' : 'CSV saved. Run the sensitivity check first to include it.');
});
$('export-png').addEventListener('click', () => {
  const table = $('results-body').querySelector('table');
  if (!shown || !table) return exportNote('Nothing to export yet.');
  const css = getComputedStyle(document.documentElement), colour = (v: string) => css.getPropertyValue(v).trim();
  const rows = [...table.rows].map((tr) => [...tr.cells].map((c) => c.innerText.split('\n')[0].trim()));
  const lines = ['Doolally Chembur twin: statistics', `Policy: ${shown.name}`,
    `SIMULATED, not measured. Mean [run-to-run spread, 95%] over ${shown.r.n} seeded evenings. Basis of every figure: ASSUMED inputs.`];
  const notes = [...table.querySelectorAll('small')].map((s) => s.textContent!.trim());
  const pad = 24, lh = 30, first = 520, other = 310, scale = 2;
  const w = pad * 2 + first + other * (rows[0].length - 1), h = pad * 2 + lh * (lines.length + rows.length + notes.length + 1);
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  const g = canvas.getContext('2d')!;
  g.scale(scale, scale);
  g.fillStyle = colour('--bg');
  g.fillRect(0, 0, w, h);
  g.textBaseline = 'middle';
  let y = pad + lh / 2;
  const text = (s: string, x: number, bold: boolean, max: number) => { g.font = `${bold ? 700 : 400} 14px ${colour('--font')}`; g.fillStyle = colour('--fg'); g.fillText(s, x, y, max); };
  for (const [i, l] of lines.entries()) { text(l, pad, i === 0, w - 2 * pad); y += lh; }
  y += lh / 2;
  for (const [i, row] of rows.entries()) {
    g.fillStyle = colour('--line');
    g.fillRect(pad, y - lh / 2, w - 2 * pad, 1);
    row.forEach((cell, c) => text(cell, pad + (c ? first + other * (c - 1) : 0), i === 0 || c === 0, (c ? other : first) - 12));
    y += lh;
  }
  for (const n of notes) { text(n, pad, false, w - 2 * pad); y += lh; }
  canvas.toBlob((b) => { if (b) download('doolally-statistics.png', b); exportNote(b ? 'PNG saved.' : 'The PNG could not be made.'); });
});
$('open-stats').addEventListener('click', () => $<HTMLDialogElement>('stats').showModal());
// --- Explore: a draft of the inputs. Nothing here reaches the main screen until "Lock in". ---
const EXPLORE_IDS = ['arrival_scale', 'dwell_median_min', 'stepout_share', 'washroom_share', 'remake_share', 'remake_delay_min', 'patience_median_min', 'B_lounge_conversion', 'C_takeaway_share', 'B_pour_spend'];
let draft: Overrides = {}, draftName = presets.presets[0].label;
const lockStatus = (text: string) => ($('lock-status').textContent = text);
function drawSliders() {
  $('sliders').replaceChildren();
  draft = {};
  renderSliders($('sliders'), EXPLORE_IDS, (o) => {
    draft = o;
    draftName = 'Custom';
    lockStatus('These sliders are not locked in yet. The main screen still shows the last locked values.');
  });
}
drawSliders();
$('presets-note').append(tagChip('ASSUMED'), ` ${presets.note}`);
for (const pr of presets.presets) {
  const b = document.createElement('button');
  b.textContent = pr.label;
  b.addEventListener('click', () => {
    drawSliders(); // back to registry values, then this bundle on top
    for (const [id, v] of Object.entries(pr.values)) {
      const input = $('sliders').querySelector<HTMLInputElement>(`[data-param="${id}"]`)!;
      input.value = String(v);
      input.dispatchEvent(new Event('input'));
    }
    draftName = pr.label;
    lockStatus(`"${pr.label}" is set on the sliders but not locked in yet.`);
  });
  $('presets').append(b);
}
async function lock() {
  const btn = $<HTMLButtonElement>('lock-in');
  btn.disabled = true;
  lockStatus(`Running ${params.replications} simulated evenings for each policy...`);
  try {
    locked = await lockIn(sim, draft, draftName);
  } catch (err) {
    lockStatus(`Lock in failed (${(err as Error).message}). The main screen still shows the last locked values.`);
    return;
  } finally {
    btn.disabled = false;
  }
  const changed = Object.entries(locked.settings).filter(([k, v]) => v !== entries[k].value).map(([k, v]) => `${entries[k].label}: ${v}`);
  const text = `Locked in: ${locked.preset}. ${changed.length ? changed.join('; ') : 'Every input at its registry value'}.`;
  lockStatus(`${text} The main screen shows these.`);
  $('locked-note').replaceChildren(tagChip('ASSUMED'), ` ${text}`);
  present();
}
$('lock-in').addEventListener('click', lock);
$('open-explore').addEventListener('click', () => $<HTMLDialogElement>('explore').showModal());

// "Manager's full data" stays off until a real data file exists at src/data/manager-data.json.
const manager = managerData(import.meta.glob('./data/manager-data.json', { eager: true }));
$<HTMLButtonElement>('mode-manager').disabled = !manager.enabled;
$('manager-why').textContent = manager.enabled ? '' : `Manager's full data: ${manager.reason}`;

renderEvidence($('evidence-body'));
$('open-evidence').addEventListener('click', () => $<HTMLDialogElement>('evidence').showModal());
document.querySelectorAll<HTMLButtonElement>('[data-show]').forEach((b) => b.addEventListener('click', () => {
  show(b.dataset.show as ShowMode);
  if (b.dataset.show === 'manager') $<HTMLDialogElement>('stats').showModal(); // before/after and the full table
}));
document.querySelectorAll<HTMLButtonElement>('[data-scenario]').forEach((b) => b.addEventListener('click', () => show('fix', b.dataset.scenario as FixId)));
// Ticking a policy's box selects that policy; unticking hides whatever it was showing.
document.querySelectorAll<HTMLInputElement>('[data-licence]').forEach((c) => c.addEventListener('change', () => (c.checked ? show('fix', c.dataset.licence as FixId) : present())));

// Single-key shortcuts can be switched off (Help), for people whose speech or switch input would trigger them by accident.
const keysOn = $<HTMLInputElement>('keys-on');
try { keysOn.checked = localStorage.getItem('twin-keys') !== 'off'; } catch { /* storage blocked: shortcuts stay on */ }
keysOn.addEventListener('change', () => { try { localStorage.setItem('twin-keys', keysOn.checked ? 'on' : 'off'); } catch { /* lasts for this visit only */ } });

const playBtn = $('play');
const setPlaying = (on: boolean) => { state.playing = on; playBtn.textContent = on ? 'Pause' : 'Play'; };
playBtn.addEventListener('click', () => setPlaying(!state.playing));
// Speed steps: 1x is 4 simulated minutes per real second; the buttons carry the rate.
document.querySelectorAll<HTMLButtonElement>('[data-speed]').forEach((b) => b.addEventListener('click', () => {
  state.speed = Number(b.dataset.speed);
  document.querySelectorAll('[data-speed]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
}));

// Free run: when an evening ends, play the next replication of the same batch instead of stopping. Off = the scripted evening (replication 0).
let freeRun = false;
$('free-run').addEventListener('click', () => {
  freeRun = !freeRun;
  $('free-run').setAttribute('aria-pressed', String(freeRun));
  if (!freeRun && state.rep) { state.rep = 0; state.t = 0; }
  loadRep();
});

// Overlays, both read from the event-log tracks. Seats in use: a disc on every table with a party at it.
// Patience used: a bar over each waiting party that fills as its patience (an assumed input, drawn per party) runs out.
const overlay = $<HTMLSelectElement>('overlay');
const OVERLAY_KEY: Record<string, string> = {
  seats: ' Disc = a table with a party at it',
  patience: ' Bar = share of a waiting party\'s patience used; full means it gives up. Patience is an assumed input.',
};
overlay.addEventListener('change', () => {
  $('overlay-key').hidden = !overlay.value;
  $('overlay-key').replaceChildren(...(overlay.value ? [tagChip('SIMULATED'), OVERLAY_KEY[overlay.value]] : []));
});
const discMat = new THREE.MeshBasicMaterial({ color: ring.material.color, transparent: true, opacity: 0.55, depthTest: false });
const seatDiscs = spots.map((s) => {
  const m = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32), discMat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(s.x, floorY(s.x, s.z) + 0.06, s.z);
  m.renderOrder = 9;
  m.visible = false;
  scene.add(m);
  return m;
});
const bars: HTMLElement[] = [];
const barAt = new THREE.Vector3();
function drawOverlay() {
  const mode = view.getMode() === 'overview' ? overlay.value : '';
  const occupied = mode === 'seats' ? occupiedTables(state.tracks, state.t) : null;
  seatDiscs.forEach((m, i) => (m.visible = !!occupied?.has(i)));
  let n = 0;
  if (mode === 'patience') for (const tr of state.tracks) {
    const used = patienceUsed(tr, state.t), at = crowd.at(tr.id);
    if (used === null || !at) continue;
    barAt.set(at[0], floorY(at[0], at[1]) + 2.4, at[1]).project(view.camera);
    if (barAt.z >= 1 || Math.abs(barAt.x) > 1 || Math.abs(barAt.y) > 1) continue;
    let el = bars[n];
    if (!el) { el = bars[n] = document.createElement('div'); el.className = 'pbar'; el.append(document.createElement('i')); $('bars').append(el); }
    n++;
    el.style.display = '';
    el.style.transform = `translate(-50%,-50%) translate(${((barAt.x + 1) / 2) * $('bars').clientWidth}px, ${((1 - barAt.y) / 2) * $('bars').clientHeight}px)`;
    (el.firstChild as HTMLElement).style.width = `${used * 100}%`;
  }
  for (; n < bars.length; n++) bars[n].style.display = 'none';
}
scrub.addEventListener('input', () => { state.t = Number(scrub.value); });
window.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  if (e.ctrlKey || e.metaKey || e.altKey || document.querySelector('dialog[open]') || view.getMode() !== 'overview') return;
  if (e.code !== 'Escape' && !keysOn.checked) return; // single-key shortcuts can be turned off in Help
  // Space on a focused button or summary must press that control, not the play button.
  const onControl = e.target instanceof HTMLButtonElement || (e.target as HTMLElement).tagName === 'SUMMARY';
  if (e.code === 'Space' && !onControl) { e.preventDefault(); setPlaying(!state.playing); }
  // 1 is As-Is; 2 to 4 are My Fix with that policy. A licence-locked one shows its lock message and nothing else.
  const pick = ({ Digit2: 'A', Digit3: 'B', Digit4: 'C' } as Record<string, FixId>)[e.code];
  if (e.code === 'Digit1') show('asis');
  if (pick) show('fix', pick);
  const key = e.key.toLowerCase();
  if (key === 'l') $('labels').click();
  if (key === 'p') $('follow').click();
  if (key === 's') $<HTMLDialogElement>('stats').showModal();
  if (key === 't') presenter();
  if (key === 'e') $<HTMLDialogElement>('evidence').showModal();
  if (key === '?') $<HTMLDialogElement>('help').showModal();
  if (key === 'f') {
    const selected = document.querySelector<HTMLButtonElement>('.hotspot[aria-pressed="true"]');
    if (selected) selected.click(); else view.presets.isometric();
  }
  if (e.code === 'Escape') {
    if (tourStop) endTour();
    else if (!$('card').hidden) $('card').querySelector('button')?.click();
    else if (follow) setFollow(null);
  }
});

// --- Tours. Both only outline a panel and show a caption; the presenter tour also moves the camera. Neither touches time, policy, people or figures. ---
const tourBox = $('tour');
let tourStop: (() => void) | null = null; // set while a tour is running
const mark = (id: string | null) => {
  document.querySelectorAll('.tour-target').forEach((el) => el.classList.remove('tour-target'));
  if (id) $(id).classList.add('tour-target');
};
function tourCard(title: string, text: string, count: string, buttons: [string, () => void][], focus: boolean) {
  const h = document.createElement('h3'), p = document.createElement('p'), n = document.createElement('p'), row = document.createElement('div');
  h.textContent = title;
  p.textContent = text;
  n.textContent = count;
  n.className = 'fine';
  row.className = 'row';
  row.append(...buttons.map(([name, act]) => { const b = document.createElement('button'); b.textContent = name; b.addEventListener('click', act); return b; }));
  tourBox.replaceChildren(h, p, n, row);
  tourBox.hidden = false;
  if (focus) row.querySelector('button')!.focus();
}
function endTour() {
  tourStop?.();
  tourStop = null;
  mark(null);
  tourBox.hidden = true;
  try { localStorage.setItem('twin-tour-seen', '1'); } catch { /* storage blocked: the introduction shows again next visit */ }
}

/** The 5-step introduction: shown once, skippable, replayable from Help. */
function onboarding(i = 0) {
  endTour();
  const s = ONBOARDING[i], last = i === ONBOARDING.length - 1;
  if (s.tab) setTab(s.tab);
  mark(s.target);
  tourStop = () => {};
  tourCard(s.title, s.text, `Step ${i + 1} of ${ONBOARDING.length}`, [
    [last ? 'Done' : 'Next', () => (last ? endTour() : onboarding(i + 1))],
    ...(i ? [['Back', () => onboarding(i - 1)] as [string, () => void]] : []),
    ...(last ? [] : [['Skip', endTour] as [string, () => void]]),
  ], true);
}

/** Presenter tour: one GSAP timeline over the camera, the caption card and the outlined panel. Cuts instead of moves under reduced motion. */
const SCENE_SECONDS = 7;
function presenter() {
  endTour();
  const quick = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fromWalk = view.getMode() !== 'overview';
  if (fromWalk) setMode('overview');
  view.orbit.enabled = false; // the timeline holds the camera until the tour ends
  const tl = gsap.timeline({ delay: fromWalk ? 1.2 : 0, onComplete: endTour });
  PRESENTER.forEach((s, i) => {
    const [pos, look] = s.zone ? zoneShot(zone(s.zone)) : view.shots.isometric();
    const at = i * SCENE_SECONDS, move = { duration: quick ? 0 : 2.4, ease: 'power2.inOut' };
    tl.call(() => { mark(s.target); tourCard('Presenter tour', s.text, `Scene ${i + 1} of ${PRESENTER.length}`, [['Stop tour', endTour]], i === 0); }, undefined, at)
      .to(view.camera.position, { x: pos.x, y: pos.y, z: pos.z, ...move }, at)
      .to(view.orbit.target, { x: look.x, y: look.y, z: look.z, ...move }, at)
      .fromTo(tourBox, { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: quick ? 0 : 0.2 }, at)
      .fromTo($(s.target), { outlineOffset: -14 }, { outlineOffset: -3, duration: quick ? 0 : 0.4 }, at);
  });
  tl.set({}, {}, PRESENTER.length * SCENE_SECONDS); // hold the last scene as long as the others
  tourStop = () => {
    tl.kill();
    view.orbit.enabled = view.getMode() === 'overview';
    tourBox.removeAttribute('style');
    PRESENTER.forEach((s) => ($(s.target).style.outlineOffset = ''));
  };
}
const fromHelp = (start: () => void) => () => { $<HTMLDialogElement>('help').close(); start(); };
$('replay-tour').addEventListener('click', fromHelp(() => onboarding()));
$('presenter-tour').addEventListener('click', fromHelp(presenter));

const clock = new THREE.Clock();
let hudTimer = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  if (state.playing) {
    state.t += dt * state.speed; // speed = simulated minutes per real second
    if (state.t >= END) {
      if (freeRun) { state.rep = (state.rep + 1) % params.replications; state.t = 0; loadRep(); } // next evening of the same batch
      else { state.t = END; setPlaying(false); }
    }
  }
  const moved = state.t - feedT;
  if (moved > 0 && moved <= FEED.maxJumpMin) pendingFeed.push(...feedBetween(state.tracks, feedT, state.t));
  feedT = state.t;
  flushFeed(performance.now());
  view.update(dt);
  crowd.update(state.t, dt);
  if (follow) {
    const at = crowd.at(follow.id);
    if (!phaseAt(follow, state.t)) setFollow(null, 'The party you were following has left');
    else if (at) { ring.position.set(at[0], floorY(at[0], at[1]) + 0.08, at[1]); ring.visible = true; }
  }
  drawMinimap();
  drawOverlay();
  updateHotspots(view.getMode() === 'overview');
  view.render(dt);
  if ((hudTimer += dt) > 0.2) {
    hudTimer = 0;
    scrub.value = String(state.t);
    $('clock').textContent = clockText(state.t);
    const c = countsAt(state.tracks, state.t);
    figure('f-arrived', c.arrived);
    figure('f-waiting', c.waitingParties);
    figure('f-seated', c.seatedPersons);
    figure('f-left', c.walkedAway);
    if (follow) followStatus(followText(follow, state.t));
    const sc = flags(), hour = Math.floor((params.window_start_min + state.t) / 60) % 24;
    chainAt(c, sc).forEach((s, i) => { chainVals[i].textContent = s.value; });
    $('f-tokens').textContent = sc.waitlist ? String(c.tokens) : 'not used';
    $('f-litres').textContent = sc.takeaway ? `${+c.takeawayLitres.toFixed(1)} L` : 'not used';
    $('daypart').textContent = hour < 5 ? 'After midnight' : hour < 17 ? 'Day' : hour < 21 ? 'Evening' : 'Late evening';
  }
  requestAnimationFrame(frame);
}
buildChain(); // the frame loop writes into the chain, so it must exist before the first lock-in returns
lock(); // first lock-in: every input at its registry value
frame();
try { if (!localStorage.getItem('twin-tour-seen')) onboarding(); } catch { /* storage blocked: no introduction */ }

// For screenshots and debugging only.
Object.assign(window, { twin: { setMode, setLighting, show, lock, view, state } });
