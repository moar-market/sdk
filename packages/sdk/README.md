# @moar-market/sdk

The main SDK for interacting with Moar Market on the Aptos blockchain.
Provides configuration management, logging, and type-safe interfaces
for blockchain operations.

## 📦 Installation
```bash
pnpm add @moar-market/sdk
```

## 🔧 Configuration
```typescript
import { setAptosApiKey, setPanoraApiKey } from '@moar-market/sdk'

// set these config once in the beginning of the script
// setAptosApiKey(process.env.APTOS_API_KEY || '') // set aptos api key
// setPanoraApiKey(process.env.PANORA_API_KEY || '') // set panora api key

console.log('SDK initialized:')
```

## 📝 Examples

See [examples](./../../examples/src/user-actions.ts) for more detailed examples.
