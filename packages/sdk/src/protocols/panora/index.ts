import type { Address, CommonSwapParams, CommonSwapPreview, SwapParams } from './../../types'
import { scale } from '@itsmnthn/big-utils'
import { usePanoraApiKey } from './../../config'
import { logger } from './../../logger'

const ZERO = BigInt(0)
const ADDRESS_ZERO = '0x0'
const debugLabel = 'PanoraAdapter'

export async function preview_swap_exact({
  assetIn,
  assetOut,
  amount,
  isExactIn,
  slippage,
  toAddress = ADDRESS_ZERO,
  includeSources = [],
  excludeSources = [],
}: CommonSwapParams): Promise<CommonSwapPreview | undefined> {
  const X_API_KEY = usePanoraApiKey()

  if (!X_API_KEY) {
    console.error(debugLabel, 'Panora API key is not set')
    return undefined
  }

  const params: Params = {
    fromTokenAddress: assetIn,
    toTokenAddress: assetOut,
    toWalletAddress: toAddress,
  }

  if (slippage) {
    params.slippagePercentage = slippage
  }

  if (includeSources.length > 0) {
    params.includeSources = includeSources
  }
  if (excludeSources.length > 0) {
    params.excludeSources = excludeSources
  }

  if (isExactIn)
    params.fromTokenAmount = amount.toString()
  else
    params.toTokenAmount = amount.toString()

  logger.debug(debugLabel, 'preview swap exact', isExactIn ? 'in' : 'out', 'params', isExactIn, params)
  const queryString = new URLSearchParams(params as unknown as Record<string, string>).toString()

  const response = await fetch(`https://api.panora.exchange/swap?${queryString}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': X_API_KEY },
  })
  const data = await response.json() as PanoraSwapResponse
  logger.debug(debugLabel, 'preview swap exact', isExactIn ? 'in' : 'out', 'result', data)

  const quote = data.quotes?.[0]
  if (data && quote) {
    const amountIn = isExactIn ? data.fromTokenAmount : quote.fromTokenAmount
    const amountInMax = isExactIn ? data.fromTokenAmount : quote.maxFromTokenAmount
    const amountOut = isExactIn ? quote.toTokenAmount : data.toTokenAmount
    const amountOutMin = isExactIn ? quote.minToTokenAmount : data.toTokenAmount
    return {
      swapParams: quote.txData as SwapParams,
      assetIn,
      assetOut,
      amountIn: scale(isExactIn ? amountIn : amountInMax, data.fromToken.decimals),
      amountOut: scale(isExactIn ? amountOutMin : amountOut, data.toToken.decimals),
      isExactIn,
      quote: {
        ...quote,
        fromTokenAmount: scale(amountIn || ZERO, data.fromToken.decimals), // without slippage
        toTokenAmount: scale(amountOut || ZERO, data.toToken.decimals), // without slippage
        maxFromTokenAmount: scale(amountInMax, data.fromToken.decimals), // with slippage
        minToTokenAmount: scale(amountOutMin, data.toToken.decimals), // with slippage
      },
    }
  }
}

interface Params {
  fromTokenAddress: Address
  toTokenAddress: Address
  toWalletAddress: Address
  slippagePercentage?: number
  fromTokenAmount?: string
  toTokenAmount?: string
  includeSources?: string[]
  excludeSources?: string[]
}

interface PanoraSwapToken {
  tokenType: string
  name: string
  symbol: string
  decimals: number
}

interface PanoraSwapQuote {
  fromTokenAmount: bigint
  toTokenAmount: bigint
  maxFromTokenAmount: bigint
  minToTokenAmount: bigint
  slippagePercentage: string
  feeAmount: string
  priceImpact: string
  feeToken: PanoraSwapToken
  txData: SwapParams
  // some props are not defined here
}

interface PanoraSwapResponse {
  fromTokenAmount: string
  toTokenAmount: string
  maxFromTokenAmount: string
  minToTokenAmount: string
  fromToken: PanoraSwapToken
  toToken: PanoraSwapToken
  quotes: PanoraSwapQuote[]
}
