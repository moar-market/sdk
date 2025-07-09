# Changelog

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
