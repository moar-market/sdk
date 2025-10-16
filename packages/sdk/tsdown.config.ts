import { defineConfig } from 'tsdown'

export default defineConfig({
  clean: true,
  dts: {
    sourcemap: true,
  },
  exports: {
    all: true,
    // automatically generate exports for all entry points
    customExports: (exports) => {
      const newExports: Record<string, { types: string, import: string, development: { import: string } }> = {}

      for (const key in exports) {
        // Filter out the wildcard export
        if (key === './*') {
          continue
        }

        const value = exports[key]
        if (key === './package.json') {
          newExports[key] = value
          continue
        }

        // remove '/index' from the end. e.g. ./composer-strategies/index -> ./composer-strategies
        const newKey = key.endsWith('/index') ? key.slice(0, -6) : key

        newExports[newKey] = {
          types: value.replace(/\.js$/, '.d.ts'),
          development: { import: value.replace(/\.js$/, '.ts').replace('./dist', './src') }, // export source for development
          import: value,
        }
      }

      return newExports
    },
  },
  sourcemap: true,
  tsconfig: 'tsconfig.json',
  target: 'esnext',
  format: ['esm'],
  external: ['@aptos-labs/ts-sdk'],
  entry: [
    // root
    './src/index.ts',

    // utils
    './src/utils/index.ts',

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

    // farming
    './src/farming/index.ts',

    // credit-manager
    './src/credit-manager/index.ts',

    // logger
    './src/logger/index.ts',

    // types
    './src/types/index.ts',

    // protocols
    './src/protocols/panora/index.ts',
    './src/protocols/hyperion/index.ts',
    './src/protocols/thala/v2/index.ts',
    './src/protocols/dex_swap/index.ts',
    './src/protocols/default-swap.ts',
    './src/protocols/goblin/index.ts',
    './src/protocols/tapp/index.ts',

    // individual script composer actions
    './src/composer-strategies/index.ts',
    './src/composer-strategies/credit-manager.ts',

    // script composer protocols building blocks
    './src/composer-strategies/protocols/panora.ts',
    './src/composer-strategies/protocols/hyperion.ts',
    './src/composer-strategies/protocols/dex_swap.ts',
    './src/composer-strategies/protocols/default-swap.ts', // default swap protocol dex_swap or panora
    './src/composer-strategies/protocols/thala_v2.ts',
    './src/composer-strategies/protocols/goblin.ts',
    './src/composer-strategies/protocols/tapp.ts',

    // assembled trade strategies(router)
    './src/composer-strategies/trade/panora.ts',
    './src/composer-strategies/trade/dex_swap.ts',
    './src/composer-strategies/trade/default.ts', // default swap trade router dex_swap or panora

    // assembled thala v2 strategies (router)
    './src/composer-strategies/thala_v2.ts',
    './src/composer-strategies/thala_v2_lsd.ts',

    // assembled hyperion clmm strategies(router)
    './src/composer-strategies/hyperion.ts',

    // assembled goblin vault strategies(router)
    './src/composer-strategies/goblin.ts',

    // assembled tapp stable strategies(router)
    './src/composer-strategies/tapp-stable.ts',
  ],
})
