import * as THREE from 'three';
import type { Room } from './room.ts';

// Cosmetic only: lighting presets never change any simulated number.
export const PRESETS = {
  afternoon: { label: 'Late afternoon', sky: 0xbcd6ee, sun: 0xfff0d8, sunI: 2.6, sunPos: [-10, 14, 8], hemiI: 0.5, env: 0.9, lamp: 0.6, lampLight: 2, exposure: 1.0 },
  evening: { label: 'Evening', sky: 0x2c3358, sun: 0xff9a52, sunI: 1.6, sunPos: [-14, 6, 7], hemiI: 0.4, env: 0.7, lamp: 2.4, lampLight: 9, exposure: 1.0 },
  night: { label: 'Night', sky: 0x080a14, sun: 0x8fa3d8, sunI: 0.12, sunPos: [6, 12, -8], hemiI: 0.04, env: 0.1, lamp: 3.2, lampLight: 16, exposure: 1.0 },
} as const;
export type PresetId = keyof typeof PRESETS;

export function setupLighting(scene: THREE.Scene, room: Room) {
  const hemi = new THREE.HemisphereLight(0xdfe9ff, 0x6b5a48, 1);
  const sun = new THREE.DirectionalLight(0xffffff, 1);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  const c = sun.shadow.camera;
  c.left = -16; c.right = 16; c.top = 14; c.bottom = -14; c.near = 1; c.far = 60;
  scene.add(hemi, sun, sun.target);
  scene.fog = new THREE.Fog(0x000000, 35, 95);

  return (id: PresetId): number => {
    const p = PRESETS[id];
    scene.background = new THREE.Color(p.sky);
    (scene.fog as THREE.Fog).color.set(p.sky);
    sun.color.set(p.sun);
    sun.intensity = p.sunI;
    sun.position.set(p.sunPos[0], p.sunPos[1], p.sunPos[2]);
    hemi.intensity = p.hemiI;
    scene.environmentIntensity = p.env;
    room.lampMaterials.forEach((m) => (m.emissiveIntensity = p.lamp));
    room.lampLights.forEach((l) => (l.intensity = p.lampLight));
    return p.exposure;
  };
}
