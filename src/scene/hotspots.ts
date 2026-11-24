import * as THREE from 'three';
import { layout, toWorld, platformY, type Zone } from '../data/layout.ts';
import { tagChip } from '../data/tags.ts';

const RAISED = new Set(['hall', 'bar', 'kitchen']);

/** A marker's on-screen name: the label in layout.json. With no label it shows its tag, never invented text. */
export const markerName = (z: Pick<Zone, 'label' | 'tag'>): string => z.label || z.tag;

/** Camera position and look-at point that frame one area. Shared by the markers and the presenter tour. */
export function zoneShot(z: Zone): [THREE.Vector3, THREE.Vector3] {
  const r = toWorld(z.rect), y = RAISED.has(z.id) ? platformY() : 0;
  const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, span = Math.max(r.x1 - r.x0, r.z1 - r.z0);
  return [new THREE.Vector3(cx - span * 0.35, y + 3 + span * 0.45, cz + 3 + span * 0.55), new THREE.Vector3(cx, y + 0.6, cz)];
}

/** Hotspots are real DOM buttons (keyboard reachable), positioned over the scene each frame. */
export function createHotspots(layer: HTMLElement, card: HTMLElement, camera: THREE.Camera, flyTo: (pos: THREE.Vector3, target: THREE.Vector3) => void) {
  const spots = layout.zones.map((z: Zone) => {
    const r = toWorld(z.rect);
    const y = RAISED.has(z.id) ? platformY() : 0;
    const centre = new THREE.Vector3((r.x0 + r.x1) / 2, y + 1.2, (r.z0 + r.z1) / 2);
    const btn = document.createElement('button');
    btn.className = 'hotspot' + (z.tag === 'ASSUMED LAYOUT' ? ' assumed' : '');
    const name = document.createElement('span');
    name.className = 'name'; // shown when the Labels toggle is on
    name.textContent = markerName(z);
    btn.append(z.tag === 'ASSUMED LAYOUT' ? '◇' : '●', name);
    btn.setAttribute('aria-label', `${markerName(z)} (${z.tag})`);
    btn.setAttribute('aria-pressed', 'false');
    btn.title = markerName(z);
    btn.dataset.zone = z.id; // lets the service chain, event list and mini-map open this marker
    btn.addEventListener('click', () => {
      layer.querySelectorAll('[aria-pressed="true"]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      btn.setAttribute('aria-pressed', 'true');
      flyTo(...zoneShot(z));
      card.replaceChildren();
      const h = document.createElement('h2');
      h.textContent = z.label;
      const note = document.createElement('p');
      note.textContent = z.note;
      const assumed = document.createElement('p');
      assumed.innerHTML = '<strong>Assumed here:</strong> ';
      assumed.append(z.assumed);
      card.append(h, tagChip(z.tag), note, assumed);
      if (z.openQuestion) {
        const q = document.createElement('p');
        q.innerHTML = '<strong>Open question:</strong> ';
        q.append(z.openQuestion);
        card.append(q);
      }
      const close = document.createElement('button');
      close.textContent = 'Close';
      close.addEventListener('click', () => {
        card.hidden = true;
        btn.setAttribute('aria-pressed', 'false');
        btn.focus(); // back to where the viewer was
      });
      card.append(close);
      card.hidden = false;
      card.tabIndex = -1;
      card.focus({ preventScroll: false }); // inspect = move focus to the area's card
    });
    layer.appendChild(btn);
    return { btn, centre };
  });

  const v = new THREE.Vector3();
  return (visible: boolean) => {
    for (const s of spots) {
      v.copy(s.centre).project(camera);
      const show = visible && v.z < 1 && Math.abs(v.x) < 1 && Math.abs(v.y) < 1;
      s.btn.style.display = show ? '' : 'none';
      if (show) s.btn.style.transform = `translate(-50%,-50%) translate(${((v.x + 1) / 2) * layer.clientWidth}px, ${((1 - v.y) / 2) * layer.clientHeight}px)`;
    }
  };
}
