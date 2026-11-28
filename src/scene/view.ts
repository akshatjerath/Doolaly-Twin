import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect, VignetteEffect, ToneMappingEffect, ToneMappingMode } from 'postprocessing';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';
import { N8AOPostPass } from 'n8ao';
import { OUTLINE, toWorld, zoneRect, platformY, type Rect } from '../data/layout.ts';

export type Mode = 'overview' | 'walk';
const EYE = 1.6;
const BODY = 0.25;

export function createView(container: HTMLElement, scene: THREE.Scene, colliders: Rect[]) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // Neutral studio environment for reflections; generated in code, no HDRI file.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  // Swap in the Poly Haven HDRI once it has loaded (CC0, see ASSETS.md).
  new HDRLoader().load('./assets/potsdamer_platz_1k.hdr', (hdr) => {
    scene.environment = pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
  });

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
  const orbit = new OrbitControls(camera, renderer.domElement);
  orbit.enableDamping = true;
  orbit.maxPolarAngle = Math.PI / 2.15;
  orbit.minDistance = 4;
  orbit.maxDistance = 45;
  const look = new PointerLockControls(camera, renderer.domElement);

  const tone = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));
  const ao = new N8AOPostPass(scene, camera);
  Object.assign(ao.configuration, { aoRadius: 0.9, distanceFalloff: 1, intensity: 2.2, halfRes: true });
  composer.addPass(ao);
  composer.addPass(new EffectPass(camera, new BloomEffect({ luminanceThreshold: 1.0, luminanceSmoothing: 0.2, intensity: 0.55, mipmapBlur: true }), new VignetteEffect({ darkness: 0.42, offset: 0.3 }), tone));
  composer.addPass(new EffectPass(camera, new SMAAEffect()));

  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    renderer.setSize(w, h);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(container); // the scene is a layout cell: it resizes without the window resizing

  let mode: Mode = 'overview';
  const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let fly: { p0: THREE.Vector3; p1: THREE.Vector3; t0: THREE.Vector3; t1: THREE.Vector3; t: number } | null = null;
  const lookTarget = new THREE.Vector3();

  /** Smooth camera move; a plain cut when the user prefers reduced motion. */
  function flyTo(pos: THREE.Vector3, target: THREE.Vector3) {
    if (reducedMotion()) {
      camera.position.copy(pos);
      orbit.target.copy(target);
      camera.lookAt(target);
      return;
    }
    fly = { p0: camera.position.clone(), p1: pos, t0: orbit.target.clone(), t1: target, t: 0 };
  }

  // Pull the camera back on narrow (phone, portrait) screens so the whole venue stays in frame.
  const fit = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).multiplyScalar(Math.max(1, 1.5 / camera.aspect));
  type Shot = [THREE.Vector3, THREE.Vector3]; // camera position, look-at point
  const SHOT = {
    overview: (): Shot => [fit(-9, 15, 19), new THREE.Vector3(0, 0, 0.5)],
    isometric: (): Shot => [fit(17, 20, 17), new THREE.Vector3(0, 0, 0)],
    top: (): Shot => [fit(0, 30, 0.01), new THREE.Vector3(0, 0, 0)],
  };
  const PRESET = {
    overview: () => flyTo(...SHOT.overview()),
    isometric: () => flyTo(...SHOT.isometric()),
    top: () => flyTo(...SHOT.top()),
  };

  function setMode(m: Mode) {
    mode = m;
    orbit.enabled = m === 'overview';
    if (m === 'walk') {
      const e = zoneRect('entrance');
      const start = new THREE.Vector3((e.x0 + e.x1) / 2, EYE, e.z1 - 1.0);
      flyTo(start, new THREE.Vector3(start.x + 2, EYE - 0.1, start.z - 6));
    } else {
      if (look.isLocked) look.unlock();
      PRESET.overview();
    }
  }

  const keys = new Set<string>();
  window.addEventListener('keydown', (e) => keys.add(e.code));
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  // Mouse look uses pointer lock where the browser allows it; dragging always works (touch, embedded previews).
  const dom = renderer.domElement;
  dom.addEventListener('click', () => {
    if (mode === 'walk' && !look.isLocked) (dom.requestPointerLock() as unknown as Promise<void> | undefined)?.catch(() => {});
  });
  const euler = new THREE.Euler(0, 0, 0, 'YXZ');
  dom.addEventListener('pointermove', (e) => {
    if (mode !== 'walk' || look.isLocked || !(e.buttons & 1) || fly) return;
    euler.setFromQuaternion(camera.quaternion);
    euler.y -= e.movementX * 0.004;
    euler.x = THREE.MathUtils.clamp(euler.x - e.movementY * 0.004, -1.2, 1.2);
    camera.quaternion.setFromEuler(euler);
  });

  const bounds = toWorld(OUTLINE);
  const hall = zoneRect('hall'), steps = zoneRect('steps');
  // With no level change (platformY 0) every point is ground level and nothing is gated by steps.
  const onPlatform = (x: number, z: number) => platformY() > 0 && x > hall.x0 && z < hall.z1;
  const onSteps = (x: number, z: number) => platformY() > 0 && x > steps.x0 && x < steps.x1 && z >= steps.z0 && z < steps.z1;
  const level = (x: number, z: number) => (onPlatform(x, z) ? 'up' : onSteps(x, z) ? 'steps' : 'ground');
  const floorY = (x: number, z: number) => {
    const l = level(x, z);
    return l === 'up' ? platformY() : l === 'steps' ? (platformY() * (steps.z1 - z)) / (steps.z1 - steps.z0) : 0;
  };
  /** The raised floor is reached only by the steps; furniture and walls block. */
  const free = (x: number, z: number, fromX: number, fromZ: number) => {
    const a = level(fromX, fromZ), b = level(x, z);
    if ((a === 'ground' && b === 'up') || (a === 'up' && b === 'ground')) return false;
    return !colliders.some((r) => x > r.x0 - BODY && x < r.x1 + BODY && z > r.z0 - BODY && z < r.z1 + BODY);
  };

  function update(dt: number) {
    if (fly) {
      fly.t = Math.min(1, fly.t + dt / 1.1);
      const k = fly.t * fly.t * (3 - 2 * fly.t);
      camera.position.lerpVectors(fly.p0, fly.p1, k);
      lookTarget.lerpVectors(fly.t0, fly.t1, k);
      orbit.target.copy(lookTarget);
      camera.lookAt(lookTarget);
      if (fly.t === 1) fly = null;
    } else if (mode === 'overview') {
      orbit.update();
    } else {
      const f = Number(keys.has('KeyW') || keys.has('ArrowUp')) - Number(keys.has('KeyS') || keys.has('ArrowDown'));
      const r = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
      const px = camera.position.x, pz = camera.position.z;
      look.moveForward(f * 2.2 * dt);
      look.moveRight(r * 2.2 * dt);
      const tx = THREE.MathUtils.clamp(camera.position.x, bounds.x0 + 0.3, bounds.x1 - 0.3);
      const tz = THREE.MathUtils.clamp(camera.position.z, bounds.z0 + 0.3, bounds.z1 + 3);
      // Try each axis on its own so the camera slides along obstacles instead of sticking.
      camera.position.x = free(tx, pz, px, pz) ? tx : px;
      camera.position.z = free(camera.position.x, tz, camera.position.x, pz) ? tz : pz;
      camera.position.y += (floorY(camera.position.x, camera.position.z) + EYE - camera.position.y) * Math.min(1, dt * 10);
    }
  }

  return {
    renderer, camera, orbit, flyTo, setMode, update, presets: PRESET, shots: SHOT, free, floorY,
    getMode: () => mode,
    setExposure: (e: number) => { renderer.toneMappingExposure = e; },
    render: (dt: number) => composer.render(dt),
  };
}
