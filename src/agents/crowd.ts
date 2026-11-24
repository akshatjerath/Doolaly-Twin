import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { OUTLINE, toWorld, zoneRect, gateSpan, floorY, layout } from '../data/layout.ts';
import type { TableSpot } from '../scene/furniture.ts';
import { phaseAt, queueSlot, type Track } from './playback.ts';

type P2 = [number, number];
// Kenney Mini Characters (CC0, see ASSETS.md). Rigged, with idle / walk / sit clips.
const VARIANTS = ['female-a', 'female-b', 'female-c', 'female-d', 'female-e', 'female-f', 'male-a', 'male-b', 'male-c', 'male-d', 'male-e', 'male-f'];
const SCALE = 1.55; // big-headed stylised figures: scaled so they fit the chairs, not to true adult height (cosmetic)
const SIT_DROP = 0.3; // how far the model's own sit pose lowers the hips, in metres after scaling (tuned by eye)

function along(path: P2[], k: number): P2 {
  const lens = path.slice(1).map((p, i) => Math.hypot(p[0] - path[i][0], p[1] - path[i][1]));
  let d = k * lens.reduce((s, l) => s + l, 0);
  for (let i = 0; i < lens.length; i++) {
    if (d <= lens[i] || i === lens.length - 1) {
      const f = lens[i] ? Math.min(1, d / lens[i]) : 1;
      return [path[i][0] + (path[i + 1][0] - path[i][0]) * f, path[i][1] + (path[i + 1][1] - path[i][1]) * f];
    }
    d -= lens[i];
  }
  return path[path.length - 1];
}

type Clip = 'idle' | 'walk' | 'sit';
interface Person { obj: THREE.Object3D; mixer: THREE.AnimationMixer; actions: Record<Clip, THREE.AnimationAction>; clip: Clip; x: number; z: number; heading: number }

/** Rigged people, drawn only from the simulation's event-log tracks. Nothing here decides anything. */
export function createCrowd(scene: THREE.Scene, spots: TableSpot[]) {
  const outline = toWorld(OUTLINE), gate = gateSpan(), steps = zoneRect('steps');
  const gx = (gate.x0 + gate.x1) / 2;
  const gateOut: P2 = [gx, outline.z1 + 0.9], gateIn: P2 = [gx, outline.z1 - 0.9];
  const midZ = (steps.z0 + steps.z1) / 2, stepsLow: P2 = [steps.x0 - 0.4, midZ], stepsHigh: P2 = [steps.x1 + 0.4, midZ]; // the passage between the outdoor and indoor doors
  const lounge = toWorld(layout.proposed.find((z) => z.id === 'lounge')!.rect);
  const counter = toWorld(layout.proposed.find((z) => z.id === 'takeaway')!.rect);
  const counterPt: P2 = [counter.x1 + 0.6, (counter.z0 + counter.z1) / 2];

  const spawn = (id: number): P2 => (id % 2 ? [outline.x0 - 5, outline.z1 + 1.8] : [gate.x1 + 13, outline.z1 + 2.0]);
  const queuePt = (i: number): P2 => [gate.x1 + 1.2 + (i % 7) * 1.3, outline.z1 + 1.0 + Math.floor(i / 7) * 1.1];
  const loungePt = (i: number): P2 => [lounge.x0 + 0.5 + (i % 2) * 1.2, lounge.z0 + 0.5 + (Math.floor(i / 2) % 3) * 0.75];
  const tablePt = (tr: Track): P2 => [spots[tr.tables[0]].x, spots[tr.tables[0]].z];
  const toTable = (tr: Track): P2[] => [gateOut, gateIn, ...(spots[tr.tables[0]].zone === 'outdoor' ? [] : [stepsLow, stepsHigh]), tablePt(tr)];
  const waitPt = (tr: Track, t: number): P2 => (tr.lounge ? loungePt : queuePt)(queueSlot(tracks, tr, t));

  // Load each variant once; people are skinned clones of these.
  const sources: ({ scene: THREE.Object3D; clips: THREE.AnimationClip[]; scale: number } | null)[] = VARIANTS.map(() => null);
  const loader = new GLTFLoader();
  VARIANTS.forEach((name, i) => loader.load(`./assets/characters/character-${name}.glb`, (g) => {
    g.scene.traverse((o) => { o.castShadow = true; o.frustumCulled = false; });
    sources[i] = { scene: g.scene, clips: g.animations, scale: SCALE };
  }, undefined, (e) => console.error(`character ${name} failed to load`, e)));

  let tracks: Track[] = [];
  const people = new Map<string, Person>();
  const where = new Map<number, P2>(); // where each on-screen party is this frame, for the follow ring
  const drop = (key: string) => { const p = people.get(key); if (p) { scene.remove(p.obj); people.delete(key); } };

  function person(key: string, seed: number, x: number, z: number): Person | null {
    const have = people.get(key);
    if (have) return have;
    const src = sources[seed % VARIANTS.length];
    if (!src) return null; // model still loading
    const obj = cloneSkinned(src.scene);
    obj.scale.setScalar(src.scale * (0.95 + ((seed * 37) % 10) / 100));
    const mixer = new THREE.AnimationMixer(obj);
    const act = (n: Clip) => mixer.clipAction(THREE.AnimationClip.findByName(src.clips, n)!);
    const p: Person = { obj, mixer, actions: { idle: act('idle'), walk: act('walk'), sit: act('sit') }, clip: 'idle', x, z, heading: 0 };
    p.actions.idle.play();
    mixer.update(seed % 3); // desynchronise idles
    scene.add(obj);
    people.set(key, p);
    return p;
  }

  function update(t: number, dtReal: number) {
    const seen = new Set<string>();
    where.clear();
    for (const tr of tracks) {
      const ph = phaseAt(tr, t);
      if (!ph) continue;
      // Where the party as a whole is right now.
      let at: P2;
      const waitedAt = tr.tQueue !== null ? waitPt(tr, tr.tLeaveQueue! - 1e-6) : gateOut;
      if (ph.phase === 'approach') at = along([spawn(tr.id), tr.tQueue !== null ? waitPt(tr, tr.arrive) : gateOut], ph.k);
      else if (ph.phase === 'queue' || ph.phase === 'lounge') at = waitPt(tr, t);
      else if (ph.phase === 'to_table') at = along([waitedAt, ...toTable(tr)], ph.k);
      else if (ph.phase === 'seated') at = tablePt(tr);
      else if (ph.phase === 'takeaway') at = along([waitedAt, gateOut, gateIn, counterPt], Math.min(1, ph.k * 3));
      else if (tr.outcome === 'seat') at = along([...toTable(tr).reverse(), spawn(tr.id + 1)], ph.k);
      else at = along([...(tr.takeaway ? [counterPt, gateIn, gateOut] : [waitedAt]), spawn(tr.id + 1)], ph.k);

      where.set(tr.id, at);
      const chairs = tr.tables.flatMap((i) => spots[i].chairs.map((c) => ({ ...c, high: spots[i].high })));
      for (let m = 0; m < tr.size; m++) {
        const key = `${tr.id}:${m}`, seed = tr.id * 7 + m * 13;
        const chair = chairs[m % Math.max(1, chairs.length)];
        const sitting = !!chair && (ph.phase === 'seated' || (ph.phase === 'to_table' && ph.k > 0.92));
        const tx = sitting ? chair.x : at[0] + ((m % 2) - 0.5) * 0.6, tz = sitting ? chair.z : at[1] + Math.floor(m / 2) * 0.55;
        const p = person(key, seed, tx, tz);
        if (!p) continue;
        seen.add(key);
        const f = Math.min(1, dtReal * 7), dx = tx - p.x, dz = tz - p.z;
        const moving = Math.hypot(dx, dz) > 0.05;
        p.x += dx * f;
        p.z += dz * f;
        // Face the direction of travel; face the table when seated; face the venue when queuing.
        const want = sitting ? chair.rot : moving ? Math.atan2(dx, dz) : ph.phase === 'queue' ? Math.PI : p.heading;
        p.heading += Math.atan2(Math.sin(want - p.heading), Math.cos(want - p.heading)) * Math.min(1, dtReal * 9);

        const clip: Clip = sitting ? 'sit' : moving ? 'walk' : 'idle';
        if (clip !== p.clip) {
          p.actions[clip].reset().fadeIn(0.2).play();
          p.actions[p.clip].fadeOut(0.2);
          p.clip = clip;
        }
        const seatY = sitting ? (chair.high ? 0.75 : 0.46) + 0.05 - SIT_DROP : 0;
        p.obj.position.set(p.x, floorY(p.x, p.z) + seatY, p.z);
        p.obj.rotation.y = p.heading;
        p.mixer.update(dtReal);
      }
    }
    for (const key of [...people.keys()]) if (!seen.has(key)) drop(key);
    return people.size;
  }

  return {
    setTracks: (t: Track[]) => { tracks = t; for (const key of [...people.keys()]) drop(key); },
    update,
    at: (trackId: number) => where.get(trackId) ?? null,
    positions: (): ReadonlyMap<number, P2> => where,
  };
}
