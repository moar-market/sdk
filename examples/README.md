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
pnpm examples views

# Historical balance
pnpm examples historical-balance

# Token prices
pnpm examples user-actions

```

## Examples

### 1. Views ([`views.ts`](./src/views.ts))
Shows how to:
- Fetch all available lending pools
- View total deposits and borrows
- Calculate utilization rates

### 2. Composer Strategies ([`user-actions.ts`](./src/user-actions.ts))
Demonstrates how to:
- Create/close a credit account
- Deposit/withdraw collateral
- Borrow/repay debt
- Execute a swap
- Deposit into hyperion
- Withdraw from hyperion
- Claim rewards

## Configuration

The SDK uses the Aptos mainnet configuration by default. You can customize the configuration if needed:

## Environment Variables (optional)

For advanced usage, you may need:
- `PANORA_API_KEY` - For Panora protocol integration
- `APTOS_API_KEY` - For enhanced RPC access

```typescript
import process from 'node:process'
import { setAptosApiKey, setPanoraApiKey } from '@moar-market/sdk'

// set these config once in the beginning of the script
setAptosApiKey(process.env.APTOS_API_KEY || '') // set aptos api key
setPanoraApiKey(process.env.PANORA_API_KEY || '') // set panora api key if using panora swap
```
