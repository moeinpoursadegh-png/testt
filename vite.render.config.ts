import { defineConfig } from 'vite';
// Static-ish server for frame capture: no HMR, no file watching, so edits can't reload a running render.
export default defineConfig({ server: { hmr: false, watch: { ignored: ['**/*'] } } });
