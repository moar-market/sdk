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
  external: ['@aptos-labs/ts-sdk', '@thalalabs/surf'],
  entry: [
    // root
    './src/index.ts',

    // abis
    './src/abis/index.ts',
  ],
})
