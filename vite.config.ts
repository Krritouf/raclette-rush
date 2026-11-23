// npm run build        -> dist/: the folder build, for shipping (itch.io, a website)
// npm run build:single -> dist-single/index.html: one file with everything
//                         inlined, which every check opens from disk
// Vitest reads the test block; Playwright has its own config.
import { defineConfig } from 'vitest/config';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => ({
  // Relative paths, so the build works from any folder, itch.io included.
  base: './',
  // Assets are imported in the code (new URL('../assets/x.png', import.meta.url)),
  // so Vite hashes them and the single file inlines them. public/ holds only what a
  // web app added to the home screen needs (the manifest and its icons): copied to
  // dist/, and left out of the single file with the page's tags that name them
  // (data-web-app), since a page opened from disk cannot load a manifest.
  publicDir: mode === 'single' ? false : 'public',
  plugins: mode === 'single'
    ? [viteSingleFile(), { name: 'no-web-app', transformIndexHtml: (html: string) => html.replace(/^.*data-web-app.*\r?\n/gm, '') }]
    : [],
  // The game's page only: other pages in the project (one-shots in prototypes/)
  // are not scanned for packages.
  optimizeDeps: { entries: ['index.html'] },
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    emptyOutDir: true,
  },
  test: {
    include: ['tests/unit/**/*.test.ts'],
  },
}));
