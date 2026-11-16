import { describe, it, expect } from 'vitest';
import css from '../src/styles/tokens.css?raw';

// WCAG 2.x contrast for every colour pair index.html uses, in both themes.
// text 4.5:1, ui (control borders, focus ring, chart marks) 3:1. "info" rows are reported, not enforced:
// decorative lines, and tag borders whose meaning is carried by glyph + word.
type Kind = 'text' | 'ui' | 'info';
const PAIRS: [fg: string, bg: string, kind: Kind, use: string][] = [
  ['fg', 'bg', 'text', 'Body text on panels and dialog'],
  ['fg', 'bg-raised', 'text', 'Button and select text; party dots on mini-map areas'],
  ['fg-muted', 'bg', 'text', 'Secondary text, fine print, watermark'],
  ['fg-muted', 'bg-raised', 'text', 'Step name inside a service-chain button'],
  ['on-accent', 'accent', 'text', 'Active (pressed) button, text selection'],
  ['on-warn', 'warn', 'text', 'Hypothetical stripe, light band'],
  ['on-warn', 'warn-deep', 'text', 'Hypothetical stripe, dark band'],
  ['control-line', 'bg', 'ui', 'Button (also when active), select, gate and hotspot border against the panel'],
  ['control-line', 'bg-raised', 'ui', 'Button border against its own fill'],
  ['accent-line', 'bg', 'ui', 'Focus ring, slider and checkbox fill'],
  ['tag-simulated', 'bg', 'ui', 'Sensitivity bar against its track'],
  ['accent', 'bg', 'info', 'Active button fill against the panel (boundary is the control-line border)'],
  ['line', 'bg', 'info', 'Decorative: panel edge, table rules'],
  ['tag-verified', 'bg', 'info', 'Tag chip border (glyph + word carry meaning)'],
  ['tag-observed', 'bg', 'info', 'Tag chip border, hotspot inner ring'],
  ['tag-assumed', 'bg', 'info', 'Tag chip border, badge, hotspot inner ring'],
  ['tag-simulated', 'bg', 'info', 'Tag chip border, banner border'],
];

const block = (selector: string) => {
  const body = css.slice(css.indexOf(selector)).match(/\{([^}]*)\}/)![1];
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]));
};
const dark = block(':root {');
const themes = { dark, light: { ...dark, ...block(':root[data-theme="light"]') } };

const lum = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a: string, b: string) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
const NEED = { text: 4.5, ui: 3, info: 0 };

describe('theme contrast', () => {
  it('known values: black on white is 21, white on white is 1', () => {
    expect(ratio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(ratio('#ffffff', '#ffffff')).toBe(1);
  });
  for (const [name, t] of Object.entries(themes)) {
    it(`${name}: every text pair reaches 4.5:1 and every control boundary 3:1`, () => {
      const rows = PAIRS.map(([fg, bg, kind, use]) => ({ fg, bg, kind, use, r: ratio(t[fg], t[bg]) }));
      console.log([`\n${name}`, '| Foreground | Background | Ratio | Need | Use |', '|---|---|---|---|---|',
        ...rows.map((x) => `| ${x.fg} ${t[x.fg]} | ${x.bg} ${t[x.bg]} | ${x.r.toFixed(2)} | ${NEED[x.kind] || 'none'} | ${x.use} |`)].join('\n'));
      for (const x of rows) expect(x.r, `${name}: ${x.fg} on ${x.bg} (${x.use})`).toBeGreaterThanOrEqual(NEED[x.kind]);
    });
  }
  it('user rules: Slate is not a text or control colour; tag colours are unchanged', () => {
    for (const [fg, , kind] of PAIRS) if (fg === 'line') expect(kind).toBe('info');
    expect([dark['tag-verified'], dark['tag-observed'], dark['tag-assumed'], dark['tag-simulated']]).toEqual(['#009E73', '#56B4E9', '#E69F00', '#CC79A7']);
  });
});
