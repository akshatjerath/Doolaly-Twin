import * as THREE from 'three';

THREE.Cache.enabled = true;
const loader = new THREE.TextureLoader();

/** CC0 Poly Haven texture set from public/assets (see ASSETS.md). Repeat is in tiles across the surface. */
export function pbr(name: string, rx: number, ry: number, withColour = true) {
  const load = (kind: string, srgb: boolean) => {
    const t = loader.load(`./assets/${name}_${kind}_1k.jpg`);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = 8;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    return t;
  };
  return { map: withColour ? load('diff', true) : null, normalMap: load('nor_gl', false), roughnessMap: load('rough', false) };
}

function canvasTexture(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void, repeat = 1): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

/** Diagonal amber hatch: the always-on marker for anything that is ASSUMED LAYOUT. */
export function hatchTexture(repeat: number, color = '#E69F00'): THREE.CanvasTexture {
  return canvasTexture(128, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    ctx.strokeStyle = color;
    ctx.lineWidth = 14;
    for (let i = -s; i < s * 2; i += 48) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + s, s);
      ctx.stroke();
    }
  }, repeat);
}
