import { defineConfig } from 'vitest/config';

// Relative base so the build works under any GitHub Pages repo path.
// test.css: the contrast test reads the real token file; without this Vitest replaces CSS imports with ''.
export default defineConfig({ base: './', test: { css: true } });
