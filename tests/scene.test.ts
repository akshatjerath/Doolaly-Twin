import { describe, it, expect } from 'vitest';
import doc from '../docs/open-questions.md?raw';
import { loadParams } from '../src/data/params.ts';
import { layout, zoneRect } from '../src/data/layout.ts';
import { totalSeats, buildTables } from '../src/sim/engine.ts';
import { placeTables } from '../src/scene/furniture.ts';

const p = loadParams();

describe('scene matches the simulation', () => {
  it('draws exactly the seats and tables the simulation uses', () => {
    const spots = placeTables(p);
    expect(spots.length).toBe(buildTables(p).length);
    expect(spots.reduce((s, t) => s + t.chairs.length, 0)).toBe(totalSeats(p));
    for (const zone of ['outdoor', 'hall', 'small'] as const)
      expect(spots.filter((t) => t.zone === zone).reduce((s, t) => s + t.seats, 0))
        .toBe(buildTables(p).filter((t) => t.zone === zone).reduce((s, t) => s + t.seats, 0));
  });

  it('follows slider changes to table counts', () => {
    const q = { ...p, lower_6tops: 6, outdoor_2tops: 3 };
    expect(placeTables(q).reduce((s, t) => s + t.chairs.length, 0)).toBe(totalSeats(q));
  });

  it('keeps every table inside its zone', () => {
    for (const t of placeTables(p)) {
      const r = zoneRect(t.zone);
      expect(t.x).toBeGreaterThan(r.x0);
      expect(t.x).toBeLessThan(r.x1);
      expect(t.z).toBeGreaterThan(r.z0);
      expect(t.z).toBeLessThan(r.z1);
    }
  });
});

describe('layout data', () => {
  it('tags every zone, and every assumed zone has an open question listed in docs', () => {
    for (const z of layout.zones) {
      expect(['OBSERVED', 'ASSUMED LAYOUT']).toContain(z.tag);
      expect(z.assumed.length).toBeGreaterThan(0);
      if (z.tag === 'ASSUMED LAYOUT') expect(z.openQuestion.length).toBeGreaterThan(0);
    }
    for (const z of layout.zones) if (z.tag === 'ASSUMED LAYOUT') expect(doc).toContain(z.label);
  });

  it('implies no floor level or rooftop', () => {
    const text = JSON.stringify(layout).toLowerCase();
    for (const word of ['rooftop', '6th', 'sixth floor', 'terrace']) expect(text).not.toContain(word);
  });
});
