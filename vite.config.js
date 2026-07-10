import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        v2: resolve(__dirname, 'v2/index.html'),
        sylWalkableShip: resolve(__dirname, 'experiments/syl-walkable-ship/index.html')
      }
    }
  }
});
