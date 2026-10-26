import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { projectStatusPlugin } from './server/project-status.ts';

const root = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [projectStatusPlugin()],
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
  preview: {
    host: '127.0.0.1',
    port: 4173,
  },
  build: {
    rollupOptions: {
      input: {
        main: resolve(root, 'index.html'),
        dashboard: resolve(root, 'dashboard.html'),
      },
    },
  },
});
