import type { Address, MoveStructId } from './common'

export interface SwapParams {
  function: MoveStructId
  arguments: any[]
  type_arguments: any[]
  /** Whether this is a trade swap */
  isTrade?: boolean
}

// This is panora like interface to be able to swap dex or panora or hyperion or thala v2 as needed

export interface CommonSwapParams {
  assetIn: Address
  assetOut: Address
  amount: number | string | bigint
  isExactIn: boolean
  slippage?: number
  toAddress?: Address
  includeSources?: string[]
  excludeSources?: string[]
}

export interface CommonSwapToken {
  tokenType: string
  name: string
  symbol: string
  decimals: number
}

export interface CommonSwapQuote {
  fromTokenAmount: bigint
  toTokenAmount: bigint
  maxFromTokenAmount: bigint
  minToTokenAmount: bigint
  slippagePercentage: string
  feeAmount: string
  priceImpact: string
  feeToken: CommonSwapToken
  // some props are not defined here
}

export interface CommonSwapPreview {
  assetIn: Address
  assetOut: Address
  amountIn: bigint
  amountOut: bigint
  isExactIn: boolean
  swapParams: SwapParams
  quote: CommonSwapQuote
}

export type PreviewSwapExact = (params: CommonSwapParams) => Promise<CommonSwapPreview | undefined>

export interface ThalaV2SwapPreview {
  amount_in: string
  amount_in_post_fee: string
  amount_out: string
  amount_normalized_in: string
  amount_normalized_out: string
  total_fee_amount: string
  protocol_fee_amount: string
  idx_in: string
  idx_out: string
  swap_fee_bps: string
}
