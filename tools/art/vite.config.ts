// The art sheet's build: one self-contained HTML file in tools/art/dist/ (fonts inlined).
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  root: 'tools/art',
  base: './',
  publicDir: false,
  plugins: [viteSingleFile()],
  build: { outDir: 'dist', emptyOutDir: true },
});
