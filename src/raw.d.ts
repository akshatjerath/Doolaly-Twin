declare module 'n8ao' {
  import type { Pass } from 'postprocessing';
  import type { Scene, Camera } from 'three';
  export class N8AOPostPass extends Pass {
    constructor(scene: Scene, camera: Camera, width?: number, height?: number);
    configuration: Record<string, unknown>;
  }
}

// Vite's file glob, typed by hand because tsconfig loads no ambient type packages.
interface ImportMeta { glob(pattern: string, options: { eager: true }): Record<string, unknown> }

declare module '*?raw' {
  const text: string;
  export default text;
}
