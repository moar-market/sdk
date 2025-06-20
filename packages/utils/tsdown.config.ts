import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: {
    sourcemap: true,
  },
  sourcemap: true,
  tsconfig: 'tsconfig.json',
  target: 'esnext',
  format: ['esm'],
  entry: [
    // root
    './src/index.ts',
  ],
})
