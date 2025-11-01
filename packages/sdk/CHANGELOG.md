# Changelog

## v0.3.0

[compare changes](https://github.com/moar-market/sdk/compare/v0.2.0...v0.3.0)

### 🚀 Enhancements

- Add performance fee rate to GoblinVaultConfig for mainnet vaults ([078a053](https://github.com/moar-market/sdk/commit/078a053))
- New util isEqualAddress ([1c0c977](https://github.com/moar-market/sdk/commit/1c0c977))
- Enhance example scripts to support additional arguments and add token constants ([bb4033c](https://github.com/moar-market/sdk/commit/bb4033c))
- Optimize price fetching with chunks ([0619bf8](https://github.com/moar-market/sdk/commit/0619bf8))
- Tapp config ([b035ab5](https://github.com/moar-market/sdk/commit/b035ab5))
- Tapp stable pool composer strategy ([64db873](https://github.com/moar-market/sdk/commit/64db873))
- Add preview function for stable LP token calculations and refactor response types ([6a69950](https://github.com/moar-market/sdk/commit/6a69950))
- **tapp:** View for preview remove ratio & current lp amount ([8d07a99](https://github.com/moar-market/sdk/commit/8d07a99))
- Accountant view fns & update abis ([3fcbdd9](https://github.com/moar-market/sdk/commit/3fcbdd9))
- Add pnl component view fn ([4c0718c](https://github.com/moar-market/sdk/commit/4c0718c))
- **tapp:** Position info view fn & update abis ([dfb97f7](https://github.com/moar-market/sdk/commit/dfb97f7))
- **composer:** Upgrade to new version ([4de42f2](https://github.com/moar-market/sdk/commit/4de42f2))

### 🩹 Fixes

- Export tapp ([33f0068](https://github.com/moar-market/sdk/commit/33f0068))

### 🏡 Chore

- Tapp fn renames ([c80e3fc](https://github.com/moar-market/sdk/commit/c80e3fc))
- Upgrade deps ([4736ef3](https://github.com/moar-market/sdk/commit/4736ef3))
- **sdk:** Add .npmignore to exclude source maps from published package ([6b18135](https://github.com/moar-market/sdk/commit/6b18135))
- Release v0.3.0 ([596a044](https://github.com/moar-market/sdk/commit/596a044))

## [0.1.0](https://github.com/moar-market/sdk/releases/tag/v0.1.0) (2025-09-16)

### Features
- Add farming module with `entry` and `view` functions (`packages/sdk/src/farming/*`).
- Introduce script-composer utility with `AptosScriptComposer` and `scriptComposer` for multi-call transactions.
- Add default swap routing and Panora as default swap provider; new protocol adapters for `dex_swap`, `panora`, `hyperion`, and `thala_v2`.
- Add composer strategies for credit manager and swaps, including factory-based trade execution.
- Extend SDK exports: `config`, `helpers`, `utils`, `types`, `farming`, `credit-manager`, `lend-pool`.
- Add two's complement, tick-price, and sqrtPrice high-precision utilities with tests.
- Add Thala V2 protocol support (liquidity preview, XLPT, STHAPT APR, views).
- Add new ABIs and upgrade existing ABIs.

### Fixes
- Handle undefined `CallArgument` after first call in composer.
- Resolve error for single debt pool and non-convergence in liquidation.
- Adapt to `@itsmnthn/big-utils` breaking changes for percent helpers.

### Refactors
- Consolidate credit manager into `entry` and `view`; remove legacy split files.
- Consolidate lend pool entry interfaces; remove deprecated unbond/position/pools modules.
- Replace external `@moar-market/utils` by moving utilities into SDK and refactor imports.
- Use big-utils math primitives for improved liquidation price precision.
- Batch oracle price fetch; fall back to individual fetch on failure.

### Breaking Changes
- Node.js engines requirement is now `>=22.19` at workspace level.
- Credit Manager API reshaped:
  - Use `getCollateralDepositPayload`, `getCollateralWithdrawPayload`, `getBorrowDebtPayload`, `getRepayDebtPayload`, `getCloseCreditAccountPayload` from `credit-manager/entry`.
  - Removed legacy `close.ts`, `collateral-deposit.ts`, `collateral-withdraw.ts`, `repay-debt.ts` files.
- Lend Pool API updates:
  - Use `lend-pool/entry` and `lend-pool/view` exports; removed `unbond`, `withdraw`, `position`, and `pools` legacy modules.
- Default swap provider changed to Panora; routing behavior may differ unless explicitly overridden.
- `tickToPrice` and `priceToTick` now default to `scale = 18` and no longer accept implicit defaults for `scale` (pass explicitly if you rely on different precision).
- Project utilities migrated into `packages/sdk/src/utils/*` and re-exported via `@moar-market/sdk/utils`.

### Chores
- Update dependencies and ABIs; introduce type-aware linting with `oxlint-tsgolint`.
- Update examples package and scripts.

## [0.0.4](https://github.com/moar-market/sdk/releases/tag/v0.0.4) (2025-07-09)

### Features
- Rebalance position for hyperion
- Panora Preview Swap with slippage & exclude & include source

### Breaking Changes
- Hyperion `AddLiquidityOptimallyParams` is now merged with `AddLiquidityParams`
- `preview_swap_exact` now takes an object with the following properties:
  - `assetIn`
  - `assetOut`
  - `amount`
  - `isExactIn`
  - `slippage`
  - `toAddress`
  - `includeSources`
  - `excludeSources`

## [0.0.3](https://github.com/moar-market/sdk/releases/tag/v0.0.3) (2025-07-04)

### Initial release
