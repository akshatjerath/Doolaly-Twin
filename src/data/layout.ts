import raw from './layout.json' with { type: 'json' };

export type ZoneId = 'entrance' | 'pavement' | 'outdoor' | 'steps' | 'hall' | 'passage' | 'bar' | 'kitchen';

export interface Zone {
  id: ZoneId;
  label: string;
  rect: number[];
  tag: 'OBSERVED' | 'ASSUMED LAYOUT';
  note: string;
  assumed: string;
  openQuestion: string;
}

/** Rectangle in metres on the ground plane (x right, z towards the street). */
export interface Rect { x0: number; z0: number; x1: number; z1: number }

export const layout = raw as unknown as {
  metresPerPx: { value: number; tag: string; note: string };
  stepCount: { value: number; tag: string; note: string };
  stepRiseM: { value: number; tag: string; note: string };
  tableTypes: Record<string, { seats: number; w: number; h: number; high: boolean }>;
  tables: { id: string; zone: 'outdoor' | 'hall'; type: string; cx: number; cy: number; rot?: number }[];
  proposed: { id: 'kiosk' | 'lounge' | 'takeaway'; scenario: 'A' | 'B' | 'C'; label: string; rect: number[]; note: string }[];
  zones: Zone[];
};

// Sketch outline in pixels; the scene is centred on it.
export const OUTLINE = [0, 0, 4200, 1440];
const CX = (OUTLINE[0] + OUTLINE[2]) / 2;
const CY = (OUTLINE[1] + OUTLINE[3]) / 2;

export function toWorld(rectPx: number[]): Rect {
  const s = layout.metresPerPx.value;
  return { x0: (rectPx[0] - CX) * s, z0: (rectPx[1] - CY) * s, x1: (rectPx[2] - CX) * s, z1: (rectPx[3] - CY) * s };
}

/** Ground-plane metres back to sketch pixels (the inverse of toWorld), for the plan-view mini-map. */
export const toPx = (x: number, z: number): [number, number] => [x / layout.metresPerPx.value + CX, z / layout.metresPerPx.value + CY];

export const zone = (id: ZoneId): Zone => layout.zones.find((z) => z.id === id)!;
export const zoneRect = (id: ZoneId): Rect => toWorld(zone(id).rect);

/** Height of the raised inside floor above the entrance level. */
export const platformY = () => layout.stepCount.value * layout.stepRiseM.value;

/** Gate opening on the street edge, inside the entrance zone. */
export function gateSpan() {
  const e = zoneRect('entrance');
  return { x0: e.x0 + 0.3, x1: e.x1 - 0.3 };
}

/** Floor height at a point. The Chembur plans show no level change, so the floor is flat unless the step count is raised. */
export function floorY(x: number, z: number): number {
  const hall = zoneRect('hall'), steps = zoneRect('steps');
  if (platformY() <= 0) return 0;
  if (x > hall.x0) return platformY();
  if (x > steps.x0 && x < steps.x1 && z >= steps.z0 && z < steps.z1) return (platformY() * (steps.z1 - z)) / (steps.z1 - steps.z0);
  return 0;
}
