import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import stringPlugin from 'vite-plugin-string';

export default defineConfig({
  plugins: [
    tsconfigPaths(),
    stringPlugin({ include: ['**/*.vert', '**/*.frag'] })
  ],
  server: { host: true }
});