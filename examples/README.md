# Moar Market SDK Examples

Simple examples demonstrating how to use the Moar Market SDK to interact with the Moar lending protocol on Aptos.

## Overview

Moar Market is a lending protocol on Aptos that allows users to supply assets to lending pools and borrow against collateral.

## Getting Started

### Installation

From the workspace root:
```bash
pnpm install
```

### Running Examples

```bash
# Pool information
pnpm example pool-info

# Token prices
pnpm example token-prices

# Main example (both)
pnpm example start
```

## Examples

### 1. Pool Information (`pool-info.ts`)
Shows how to:
- Fetch all available lending pools
- View total deposits and borrows
- Calculate utilization rates

### 2. Token Prices (`token-prices.ts`)
Demonstrates how to:
- Fetch single token prices from oracle
- Get multiple token prices at once
- Format price data

### 3. Main Example (`index.ts`)
Quick overview showing both pool info and token prices

## Configuration

The SDK uses the Aptos mainnet configuration by default. You can customize the configuration if needed:

```typescript
import { setConfig } from '@moar-market/sdk'

// Use custom configuration
setConfig(customConfig)
```

## Environment Variables

For advanced usage, you may need:
- `PANORA_API_KEY` - For Panora protocol integration
- `APTOS_API_KEY` - For enhanced RPC access

## Documentation

For more detailed documentation, see:
- [SDK Documentation](../packages/sdk/README.md)
- [Moar Market Protocol](https://moar.market)
