import * as THREE from 'three';
import type { SimParams } from '../data/params.ts';
import { OUTLINE, toWorld, zoneRect, platformY, gateSpan, layout, type Rect } from '../data/layout.ts';
import { placeTables } from './furniture.ts';
import { pbr, hatchTexture } from './textures.ts';

export interface Room {
  group: THREE.Group;
  /** Roofs and ceilings: shown only in walk mode so the overview can see in. */
  roofs: THREE.Group;
  /** Emissive lamp materials and point lights, driven by the lighting preset. */
  lampMaterials: THREE.MeshStandardMaterial[];
  lampLights: THREE.PointLight[];
  /** Footprints the walk-through camera cannot enter. */
  colliders: Rect[];
  /** Ghost geometry for the licence-dependent proposals; shown only while that scenario is active. */
  /** Ghost shapes for proposed items, by layout.json id. */
  proposed: Record<string, THREE.Group>;
}

const size = (r: Rect) => ({ w: r.x1 - r.x0, d: r.z1 - r.z0, cx: (r.x0 + r.x1) / 2, cz: (r.z0 + r.z1) / 2 });

export function buildRoom(p: SimParams): Room {
  const group = new THREE.Group();
  const roofs = new THREE.Group();
  const H = platformY();
  const outline = toWorld(OUTLINE);
  const outdoor = zoneRect('outdoor'), hall = zoneRect('hall');
  const entrance = zoneRect('entrance'), steps = zoneRect('steps'), passage = zoneRect('passage'), kitchen = zoneRect('kitchen');
  const bar = zoneRect('bar'), pavement = zoneRect('pavement');

  const colliders: Rect[] = [];
  // Pine colour follows the listing photos; the Poly Haven set supplies grain relief and roughness only (its colour is walnut).
  const grain = pbr('wood_table_001', 1, 1, false);
  const pine = new THREE.MeshStandardMaterial({ color: 0xdcab63, normalMap: grain.normalMap, roughnessMap: grain.roughnessMap });
  const pineDark = new THREE.MeshStandardMaterial({ color: 0xbd8848, normalMap: grain.normalMap, roughnessMap: grain.roughnessMap });
  const cushion = new THREE.MeshStandardMaterial({ color: 0xe9e2d2, roughness: 0.95 });
  const wallWhite = (len: number, h: number) => new THREE.MeshStandardMaterial({ ...pbr('white_plaster_02', Math.max(1, len / 2.5), Math.max(1, h / 2.5), false), color: 0xf1ebde });
  const metal = new THREE.MeshStandardMaterial({ color: 0x2c2f33, roughness: 0.35, metalness: 0.8 });
  const glass = new THREE.MeshPhysicalMaterial({ color: 0xdff1f5, transparent: true, opacity: 0.14, roughness: 0.02, metalness: 0, envMapIntensity: 2.5, side: THREE.DoubleSide, depthWrite: false });
  const hatch = (r: Rect) => new THREE.MeshBasicMaterial({ map: hatchTexture(Math.max(1, Math.round(Math.max(r.x1 - r.x0, r.z1 - r.z0) / 1.5))), transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide });
  const assumedSolid = new THREE.MeshStandardMaterial({ color: 0xcfc8ba, roughness: 1, transparent: true, opacity: 0.7 });

  const add = (mesh: THREE.Object3D, parent: THREE.Object3D = group) => { parent.add(mesh); return mesh; };
  const slab = (r: Rect, top: number, thick: number, mat: THREE.Material) => {
    const s = size(r);
    const m = new THREE.Mesh(new THREE.BoxGeometry(s.w, thick, s.d), mat);
    m.position.set(s.cx, top - thick / 2, s.cz);
    m.receiveShadow = true;
    return add(m);
  };
  const overlay = (r: Rect, y: number) => {
    const s = size(r);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.d), hatch(r));
    m.rotation.x = -Math.PI / 2;
    m.position.set(s.cx, y + 0.012, s.cz);
    return add(m);
  };
  /** Vertical wall as a one-sided plane facing (nx, nz): seen from inside, see-through from outside (dollhouse cutaway). */
  const wall = (x0: number, z0: number, x1: number, z1: number, yBase: number, h: number, mat: THREE.Material | ((len: number, h: number) => THREE.Material), nx: number, nz: number, parent: THREE.Object3D = group) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, h), typeof mat === 'function' ? mat(len, h) : mat);
    if (mat === glass) {
      // Slim metal rails so the glass reads as a wall.
      for (const y of [yBase + 0.04, yBase + h - 0.04]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(Math.abs(x1 - x0) + 0.06, 0.07, Math.abs(z1 - z0) + 0.06), metal);
        rail.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
        add(rail, parent);
      }
    }
    m.position.set((x0 + x1) / 2, yBase + h / 2, (z0 + z1) / 2);
    m.rotation.y = Math.atan2(nx, nz);
    m.receiveShadow = true;
    return add(m, parent);
  };

  // --- Ground: street, public pavement, venue floor ---
  const street = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), new THREE.MeshStandardMaterial({ color: 0x2b2d31, roughness: 1 }));
  street.rotation.x = -Math.PI / 2;
  street.position.y = -0.12;
  street.receiveShadow = true;
  add(street);
  const floorMat = (name: string, r: Rect, tile: number, color = 0xffffff) => new THREE.MeshStandardMaterial({ ...pbr(name, (r.x1 - r.x0) / tile, (r.z1 - r.z0) / tile), color });
  const walk = { x0: outline.x0 - 1, z0: outline.z1, x1: outline.x1 + 1, z1: pavement.z1 + 0.6 };
  slab(walk, -0.02, 0.1, floorMat('concrete_pavers', walk, 2));
  overlay(pavement, -0.02);
  slab(outline, 0, 0.12, floorMat('laminate_floor_02', outline, 2.8, 0xffd9a8));

  // Inside floor. The Chembur plans show no level change, so H is 0 and no raised slab is needed (stepCount 0 in layout.json).
  const blockA = hall;
  if (H > 0) slab(blockA, H, H, floorMat('laminate_floor_02', blockA, 2.4));

  // Steps up, at the position marked in the sketch.
  const n = layout.stepCount.value, rise = layout.stepRiseM.value;
  const st = size(steps);
  for (let i = 0; i < n; i++) {
    const depth = st.d / n;
    const m = new THREE.Mesh(new THREE.BoxGeometry(st.w, rise * (n - i), depth), pineDark);
    m.position.set(st.cx, (rise * (n - i)) / 2, steps.z0 + depth * (i + 0.5));
    m.castShadow = m.receiveShadow = true;
    add(m);
  }

  // --- Walls ---
  const lowH = 1.2, tallH = 3.1;
  const gate = gateSpan();
  const thin = (x0: number, z0: number, x1: number, z1: number): Rect => ({ x0: Math.min(x0, x1) - 0.1, z0: Math.min(z0, z1) - 0.1, x1: Math.max(x0, x1) + 0.1, z1: Math.max(z0, z1) + 0.1 });
  // Open-air side: low white boundary wall with a gate gap on the street edge (main-road door) and a gap where the passage to the indoor door starts.
  wall(outdoor.x0, outdoor.z0, outdoor.x0, outdoor.z1, 0, lowH, wallWhite, 1, 0);
  wall(outdoor.x0, outdoor.z0, outdoor.x1, outdoor.z0, 0, lowH, wallWhite, 0, 1);
  wall(outdoor.x0, outdoor.z1, gate.x0, outdoor.z1, 0, lowH, wallWhite, 0, -1);
  wall(gate.x1, outdoor.z1, outdoor.x1, outdoor.z1, 0, lowH, wallWhite, 0, -1);
  wall(outdoor.x1, outdoor.z0, outdoor.x1, steps.z0, 0, lowH, wallWhite, -1, 0);
  wall(outdoor.x1, steps.z1, outdoor.x1, outdoor.z1, 0, lowH, wallWhite, -1, 0);
  colliders.push(thin(outdoor.x0, outdoor.z0, outdoor.x0, outdoor.z1), thin(outdoor.x0, outdoor.z0, outdoor.x1, outdoor.z0), thin(outdoor.x0, outdoor.z1, gate.x0, outdoor.z1), thin(gate.x1, outdoor.z1, outdoor.x1, outdoor.z1),
    thin(outdoor.x1, outdoor.z0, outdoor.x1, steps.z0), thin(outdoor.x1, steps.z1, outdoor.x1, outdoor.z1), thin(steps.x0, steps.z0, steps.x1, steps.z0), thin(steps.x0, steps.z1, steps.x1, steps.z1));
  const gateWhite = new THREE.MeshStandardMaterial({ color: 0xf2efe8, roughness: 0.6 });
  for (let x = gate.x0; x <= gate.x1 + 0.01; x += 0.22) {
    const barM = new THREE.Mesh(new THREE.BoxGeometry(0.05, 1.5, 0.05), gateWhite);
    barM.position.set(x, 0.75, outdoor.z1 + 0.6 * ((x - gate.x0) / (gate.x1 - gate.x0)));
    barM.castShadow = true;
    add(barM); // gate drawn ajar
  }
  // Passage between the outdoor door and the indoor door: low side walls.
  wall(steps.x0, steps.z0, steps.x1, steps.z0, 0, lowH, wallWhite, 0, 1);
  wall(steps.x0, steps.z1, steps.x1, steps.z1, 0, lowH, wallWhite, 0, -1);
  // Inside block: solid outer walls (material ASSUMED), with a door gap on the side that meets the passage.
  wall(hall.x0, hall.z0, hall.x1, hall.z0, H, tallH, wallWhite, 0, 1);
  wall(hall.x1, hall.z0, hall.x1, hall.z1, H, tallH, wallWhite, -1, 0);
  wall(hall.x0, hall.z1, hall.x1, hall.z1, H, tallH, wallWhite, 0, -1);
  wall(hall.x0, hall.z0, hall.x0, steps.z0, H, tallH, wallWhite, 1, 0);
  wall(hall.x0, steps.z1, hall.x0, hall.z1, H, tallH, wallWhite, 1, 0);
  colliders.push(thin(hall.x0, hall.z0, hall.x0, steps.z0), thin(hall.x0, steps.z1, hall.x0, hall.z1));

  // --- Roofs (walk mode only) ---
  const tent = new THREE.MeshStandardMaterial({ color: 0xf6f1e6, roughness: 0.95, side: THREE.DoubleSide });
  const od = size(outdoor);
  for (const side of [-1, 1]) {
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(od.w / 2 + 0.2, od.d), tent);
    panel.rotation.x = -Math.PI / 2;
    panel.rotation.y = side * 0.22;
    panel.position.set(od.cx + (side * od.w) / 4, 3.0, od.cz);
    add(panel, roofs);
  }
  for (const b of [blockA]) {
    const s = size(b);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.d), new THREE.MeshStandardMaterial({ color: 0xf3ead8, roughness: 1 }));
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(s.cx, H + tallH, s.cz);
    add(ceil, roofs);
  }
  roofs.visible = false;
  add(roofs);

  // --- Furniture: instanced, generated from the same params as the simulation ---
  const tables = placeTables(p);
  const chairs = tables.flatMap((t) => t.chairs.map((c) => ({ ...c, high: t.high, y: t.zone === 'outdoor' ? 0 : H })));
  const dummy = new THREE.Object3D();
  const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, count: number, place: (i: number) => void) => {
    const m = new THREE.InstancedMesh(geo, mat, count);
    for (let i = 0; i < count; i++) {
      dummy.position.set(0, 0, 0); dummy.rotation.set(0, 0, 0); dummy.scale.set(1, 1, 1);
      place(i);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    }
    m.castShadow = m.receiveShadow = true;
    return add(m);
  };
  for (const t of tables) {
    const l = t.len / 2 + 0.1, w = t.wid / 2 + 0.45, hx = t.alongZ ? w : l, hz = t.alongZ ? l : w;
    colliders.push({ x0: t.x - hx, z0: t.z - hz, x1: t.x + hx, z1: t.z + hz });
  }
  const tableH = (high: boolean) => (high ? 1.05 : 0.75);
  const baseY = (zone: string) => (zone === 'outdoor' ? 0 : H);
  const topSize = (t: (typeof tables)[number]) => [t.len, t.wid];
  inst(new THREE.BoxGeometry(1, 0.05, 1), pine, tables.length, (i) => {
    const t = tables[i], [l, w] = topSize(t);
    dummy.position.set(t.x, baseY(t.zone) + tableH(t.high), t.z);
    dummy.scale.set(t.alongZ ? w : l, 1, t.alongZ ? l : w);
  });
  inst(new THREE.BoxGeometry(0.07, 1, 0.07), pineDark, tables.length * 4, (i) => {
    const t = tables[i >> 2], [l, w] = topSize(t);
    const sx = (i & 1 ? 1 : -1) * ((t.alongZ ? w : l) / 2 - 0.07), sz = (i & 2 ? 1 : -1) * ((t.alongZ ? l : w) / 2 - 0.07);
    const h = tableH(t.high);
    dummy.position.set(t.x + sx, baseY(t.zone) + h / 2, t.z + sz);
    dummy.scale.set(1, h, 1);
  });
  const seatH = (high: boolean) => (high ? 0.75 : 0.46);
  inst(new THREE.BoxGeometry(0.4, 0.05, 0.4), pine, chairs.length, (i) => {
    const c = chairs[i];
    dummy.position.set(c.x, c.y + seatH(c.high), c.z);
    dummy.rotation.y = c.rot;
  });
  inst(new THREE.BoxGeometry(0.36, 0.04, 0.36), cushion, chairs.length, (i) => {
    const c = chairs[i];
    dummy.position.set(c.x, c.y + seatH(c.high) + 0.045, c.z);
    dummy.rotation.y = c.rot;
  });
  inst(new THREE.BoxGeometry(0.045, 1, 0.045), pineDark, chairs.length * 4, (i) => {
    const c = chairs[i >> 2], h = seatH(c.high);
    dummy.position.set(c.x + (i & 1 ? 0.17 : -0.17), c.y + h / 2, c.z + (i & 2 ? 0.17 : -0.17));
    dummy.scale.set(1, h, 1);
  });
  // Low backrest on the side away from the table.
  inst(new THREE.BoxGeometry(0.4, 0.3, 0.04), pine, chairs.length, (i) => {
    const c = chairs[i];
    dummy.position.set(c.x - Math.sin(c.rot) * 0.19, c.y + seatH(c.high) + 0.2, c.z - Math.cos(c.rot) * 0.19);
    dummy.rotation.y = c.rot;
  });

  // Table-top details: napkin box and cutlery holder on each inside table.
  const insideTables = tables.filter((t) => t.zone !== 'outdoor');
  inst(new THREE.BoxGeometry(0.13, 0.08, 0.13), cushion, insideTables.length, (i) => dummy.position.set(insideTables[i].x - 0.1, H + 0.815, insideTables[i].z));
  inst(new THREE.CylinderGeometry(0.045, 0.045, 0.13, 12), metal, insideTables.length, (i) => dummy.position.set(insideTables[i].x + 0.1, H + 0.84, insideTables[i].z + 0.05));

  // --- Lamps: pendants inside (photo 2), globe lamps on the boundary wall (photo 1) ---
  const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc878, emissiveIntensity: 1.5 });
  const shadeMat = new THREE.MeshStandardMaterial({ color: 0xf4f0e8, roughness: 0.6, side: THREE.DoubleSide });
  const inside = tables.filter((t) => t.zone !== 'outdoor');
  inst(new THREE.ConeGeometry(0.26, 0.22, 20, 1, true), shadeMat, inside.length, (i) => dummy.position.set(inside[i].x, H + 2.25, inside[i].z));
  inst(new THREE.SphereGeometry(0.07, 12, 8), lampMat, inside.length, (i) => dummy.position.set(inside[i].x, H + 2.17, inside[i].z));
  inst(new THREE.CylinderGeometry(0.008, 0.008, 0.75), metal, inside.length, (i) => dummy.position.set(inside[i].x, H + 2.72, inside[i].z));
  const globes: [number, number][] = [];
  for (let z = outline.z0 + 1; z < outline.z1; z += 2.6) globes.push([outline.x0 + 0.08, z]);
  inst(new THREE.SphereGeometry(0.13, 16, 12), lampMat, globes.length, (i) => dummy.position.set(globes[i][0], lowH + 0.16, globes[i][1]));

  const lampLights: THREE.PointLight[] = [];
  const hs = size(hall), os = size(outdoor);
  for (const [x, y, z] of [[hs.cx - hs.w / 4, H + 2.1, hs.cz], [hs.cx + hs.w / 4, H + 2.1, hs.cz], [os.cx - os.w / 4, 2.3, os.cz], [os.cx + os.w / 4, 2.3, os.cz]]) {
    const l = new THREE.PointLight(0xffc27a, 30, 14, 2);
    l.position.set(x, y, z);
    lampLights.push(l);
    add(l);
  }

  // --- Props (positions ASSUMED) ---
  const leaf = new THREE.MeshStandardMaterial({ color: 0x3f7d4a, roughness: 0.9 });
  const pot = new THREE.MeshStandardMaterial({ color: 0xa6603a, roughness: 0.9 });
  const plants: [number, number][] = [[gate.x1 + 0.5, outline.z1 - 0.5], [gate.x0 - 0.5, outline.z1 - 0.5], [outline.x0 + 0.5, entrance.z0 + 0.4], [outdoor.x1 - 0.5, outdoor.z1 - 0.6]];
  inst(new THREE.CylinderGeometry(0.2, 0.15, 0.35, 12), pot, plants.length, (i) => dummy.position.set(plants[i][0], 0.175, plants[i][1]));
  inst(new THREE.IcosahedronGeometry(0.38, 1), leaf, plants.length, (i) => dummy.position.set(plants[i][0], 0.72, plants[i][1]));

  // Host stand near the gate (visible in photo 1; exact position ASSUMED).
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.05, 0.5), pine);
  stand.position.set(gate.x0 - 0.9, 0.525, outline.z1 - 1.4);
  stand.castShadow = true;
  add(stand);

  // Bar, kitchen, washrooms: known from the rough floor plan only, so plain hatched blocks (ASSUMED LAYOUT). The bar is counter height.
  for (const [r, base, h] of [[bar, H, 1.1], [kitchen, H, tallH], [passage, 0, 2.6]] as const) {
    const s = size(r);
    const block = new THREE.Mesh(new THREE.BoxGeometry(s.w, h, s.d), assumedSolid);
    block.position.set(s.cx, base + h / 2, s.cz);
    add(block);
    const skin = new THREE.Mesh(new THREE.BoxGeometry(s.w + 0.02, h + 0.02, s.d + 0.02), hatch(r));
    skin.position.copy(block.position);
    add(skin);
  }

  colliders.push(bar, kitchen, passage,
    { x0: stand.position.x - 0.45, z0: stand.position.z - 0.3, x1: stand.position.x + 0.45, z1: stand.position.z + 0.3 });

  // --- Proposed (scenario B / C) elements: white ghost style, deliberately unlike the amber "assumed" hatch. ---
  const proposed: Record<string, THREE.Group> = {};
  for (const z of layout.proposed) {
    const g = new THREE.Group();
    const r = toWorld(z.rect), s = size(r);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.d), new THREE.MeshBasicMaterial({ map: hatchTexture(2, '#ffffff'), transparent: true, opacity: 0.55, depthWrite: false }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(s.cx, 0.02, s.cz);
    const h = z.id === 'lounge' ? 0.5 : z.id === 'kiosk' ? 1.3 : 1.05;
    const box = new THREE.BoxGeometry(s.w, h, s.d);
    const shell = new THREE.Mesh(box, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: z.id === 'lounge' ? 0.06 : 0.28, depthWrite: false }));
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(box), new THREE.LineBasicMaterial({ color: 0xffffff }));
    shell.position.set(s.cx, h / 2, s.cz);
    edges.position.copy(shell.position);
    g.add(floor, shell, edges);
    g.visible = false;
    proposed[z.id] = g;
    add(g);
  }

  return { group, roofs, lampMaterials: [lampMat], lampLights, colliders, proposed };
}
