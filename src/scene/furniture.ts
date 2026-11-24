import type { SimParams } from '../data/params.ts';
import { layout, toWorld } from '../data/layout.ts';
import { buildTables } from '../sim/engine.ts';

export interface Seat { x: number; z: number; rot: number }
export interface TableSpot {
  zone: 'outdoor' | 'hall';
  /** Floor-plan table id from layout.json. */
  id: string;
  x: number;
  z: number;
  seats: number;
  /** High table with stools (the plan's HT types). */
  high: boolean;
  /** True when the long side runs along z (a table drawn rotated 90 degrees). */
  alongZ: boolean;
  /** Table-top length along its long side and width across it, in metres. */
  len: number;
  wid: number;
  chairs: Seat[];
}

// Plan geometry (px): the footprint includes chairs; chairs sit 17 px in from the footprint edge, the table top starts 41 px in.
const SEAT_INSET = 17, EDGE = 41;

/**
 * Every table and chair drawn in the scene. Tables come from the simulation's own table list, in the same order,
 * so a logged table index points at this furniture. Positions are the floor-plan positions in layout.json.
 */
export function placeTables(p: SimParams): TableSpot[] {
  const s = layout.metresPerPx.value;
  return buildTables(p).map((t) => {
    const def = layout.tables.find((x) => x.id === t.id)!, type = layout.tableTypes[def.type];
    const alongZ = def.rot === 90;
    const c = toWorld([def.cx, def.cy, def.cx, def.cy]);
    const long = type.w, across = type.h;
    const a = type.seats === 3 ? 2 : Math.ceil(type.seats / 2);
    const chairs: Seat[] = [];
    [a, type.seats - a].forEach((n, side) => {
      for (let k = 0; k < n; k++) {
        const along = ((k + 0.5) / n - 0.5) * long * s, off = (side === 0 ? -1 : 1) * (across / 2 - SEAT_INSET) * s;
        chairs.push(alongZ ? { x: c.x0 + off, z: c.z0 + along, rot: side ? -Math.PI / 2 : Math.PI / 2 } : { x: c.x0 + along, z: c.z0 + off, rot: side ? Math.PI : 0 });
      }
    });
    return { zone: t.zone, id: t.id, x: c.x0, z: c.z0, seats: type.seats, high: type.high, alongZ, len: long * s, wid: (across - 2 * EDGE) * s, chairs };
  });
}
