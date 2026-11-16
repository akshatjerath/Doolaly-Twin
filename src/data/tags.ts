// Okabe-Ito colours (colour-blind safe). A tag is never shown by colour alone: always glyph + word.
export const TAGS = {
  VERIFIED: { color: '#009E73', glyph: '✓' },
  OBSERVED: { color: '#56B4E9', glyph: '●' },
  ASSUMED: { color: '#E69F00', glyph: '◇' },
  'ASSUMED LAYOUT': { color: '#E69F00', glyph: '◇' },
  SIMULATED: { color: '#CC79A7', glyph: '∿' },
} as const;

export type TagName = keyof typeof TAGS;

export function tagChip(tag: TagName): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = 'tag';
  el.style.borderColor = TAGS[tag].color;
  el.textContent = `${TAGS[tag].glyph} ${tag}`;
  return el;
}
