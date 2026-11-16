import type { SimParams } from '../data/params.ts';
import { zoneRect, type Rect } from '../data/layout.ts';
import { buildTables } from '../sim/engine.ts';

export interface Seat { x: number; z: number; rot: number }
export interface TableSpot {
  zone: 'outdoor' | 'hall' | 'small';
  x: number;
  z: number;
  seats: number;
  /** Bar-height table with stools (outdoor, per listing photo 1). */
  high: boolean;
  /** True when the long side runs along z. */
  alongZ: boolean;
  chairs: Seat[];
}

/** Table-top length for a seat count: guests sit along the two long sides. */
export const tableLength = (seats: number) => (seats <= 2 ? 0.7 : 0.62 * (seats / 2) + 0.05);

function grid(r: Rect, n: number): { x: number; z: number; alongZ: boolean }[] {
  if (n <= 0) return [];
  const w = r.x1 - r.x0, d = r.z1 - r.z0;
  const cols = Math.max(1, Math.min(n, Math.round(Math.sqrt((n * w) / d))));
  const rows = Math.ceil(n / cols);
  const alongZ = d / rows > w / cols;
  return Array.from({ length: n }, (_, i) => ({
    x: r.x0 + (w * ((i % cols) + 0.5)) / cols,
    z: r.z0 + (d * (Math.floor(i / cols) + 0.5)) / rows,
    alongZ,
  }));
}

/**
 * Every table and chair drawn in the scene. The list comes from the simulation's own
 * table list, in the same order, so a logged table index points at this furniture.
 */
export function placeTables(p: SimParams): TableSpot[] {
  const sim = buildTables(p);
  const out: TableSpot[] = [];
  for (const zone of ['outdoor', 'hall', 'small'] as const) {
    const r = zoneRect(zone), pad = 0.4;
    const mine = sim.filter((t) => t.zone === zone);
    const cells = grid({ x0: r.x0 + pad, z0: r.z0 + pad, x1: r.x1 - pad, z1: r.z1 - pad }, mine.length);
    mine.forEach((t, i) => {
      const g = cells[i], perSide = Math.max(1, t.seats / 2), chairs: Seat[] = [];
      for (const side of [-1, 1]) for (let k = 0; k < perSide; k++) {
        const a = (k - (perSide - 1) / 2) * 0.62, off = side * 0.62;
        chairs.push(g.alongZ ? { x: g.x + off, z: g.z + a, rot: side > 0 ? -Math.PI / 2 : Math.PI / 2 } : { x: g.x + a, z: g.z + off, rot: side > 0 ? Math.PI : 0 });
      }
      out.push({ zone, x: g.x, z: g.z, seats: t.seats, high: zone === 'outdoor', alongZ: g.alongZ, chairs });
    });
  }
  return out;
}
