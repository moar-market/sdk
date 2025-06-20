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

    // config
    './src/config/index.ts',

    // abis
    './src/abis/index.ts',

    // clients
    './src/clients/index.ts',

    // lend-pool
    './src/lend-pool/index.ts',

    // credit-manager
    './src/credit-manager/index.ts',

    // logger
    './src/logger/index.ts',

    // types
    './src/types/index.ts',

    // protocols
    './src/protocols/panora/index.ts',
    './src/protocols/hyperion/index.ts',
  ],
})
