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

    // composer
    './src/composer/index.ts',

    // token
    './src/token/index.ts',

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

    // script composer protocols building blocks
    './src/composer-strategies/protocols/panora.ts',
    './src/composer-strategies/protocols/hyperion.ts',
    // './src/composer-strategies/protocols/thala_v2.ts', // not available deprecated
    // './src/composer-strategies/protocols/thala_v2_lsd.ts', // not available deprecated

    // strategies building blocks
    './src/composer-strategies/shared.ts', // shared script composer functions across strategies

    // assembled trade strategies(router)
    './src/composer-strategies/trade/panora.ts',
    // './src/composer-strategies/trade/thala_v2.ts', // not available deprecated

    // lsd strategies
    // './src/composer-strategies/trade/thala_v2_lsd.ts', // not available deprecated

    // assembled hyperion clmm strategies(router)
    './src/composer-strategies/hyperion.ts',
  ],
})
