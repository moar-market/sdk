# @moar-market/sdk

The main SDK for interacting with Moar Market on the Aptos blockchain.
Provides configuration management, logging, and type-safe interfaces
for blockchain operations.

## 🚀 Quick Start

```bash
pnpm add @moar-market/sdk
```

```typescript
import { getConfig, logger, setConfig } from '@moar-market/sdk'

// Configure the SDK
setConfig({
  network: 'mainnet',
  networkName: 'Aptos Mainnet',
  networkId: '1',
  networkUrl: 'https://fullnode.mainnet.aptoslabs.com/v1',
  networkExplorerUrl: 'https://explorer.aptoslabs.com',
  DEBUG: false
})

// Use the logger
logger.debug('SDK initialized:', getConfig())
