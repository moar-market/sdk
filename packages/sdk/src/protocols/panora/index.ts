import type { Address, MoveStructId } from './../../types'
import { scale, unScale } from '@itsmnthn/big-utils'
import { usePanoraApiKey } from './../../config'
import { logger } from './../../logger'

const ZERO = BigInt(0)
const ADDRESS_ZERO = '0x0'
const debugLabel = 'PanoraAdapter'

export interface PanoraSwapParams {
  assetIn: MoveStructId | Address
  assetOut: MoveStructId | Address
  amount: number | string
  isExactIn: boolean
  slippage?: number // default's to auto slippage
  toAddress?: Address
  includeSources?: string[]
  excludeSources?: string[]
}

export async function preview_swap_exact({
  assetIn,
  assetOut,
  amount,
  isExactIn,
  slippage,
  toAddress = ADDRESS_ZERO,
  includeSources = [],
  excludeSources = [],
}: PanoraSwapParams): Promise<PanoraSwapPreview | undefined> {
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
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': X_API_KEY,
    },
  })
  const res = await response.json()
  logger.debug(debugLabel, 'preview swap exact', isExactIn ? 'in' : 'out', 'result', res)

  const quote = res.quotes?.[0]
  if (res && quote) {
    const amountIn = isExactIn ? res.fromTokenAmount : quote.fromTokenAmount
    const amountInMax = isExactIn ? res.fromTokenAmount : quote.maxFromTokenAmount
    const amountOut = isExactIn ? quote.toTokenAmount : res.toTokenAmount
    const amountOutMin = isExactIn ? quote.minToTokenAmount : res.toTokenAmount
    return {
      swapParams: quote.txData as SwapParams,
      assetIn,
      assetOut,
      amountIn: scale(isExactIn ? amountIn : amountInMax, res.fromToken.decimals),
      amountOut: scale(isExactIn ? amountOutMin : amountOut, res.toToken.decimals),
      isExactIn,
      quote: {
        ...quote,
        fromTokenAmount: scale(amountIn || ZERO, res.fromToken.decimals), // without slippage
        toTokenAmount: scale(amountOut || ZERO, res.toToken.decimals), // without slippage
        maxFromTokenAmount: scale(amountInMax, res.fromToken.decimals), // with slippage
        minToTokenAmount: scale(amountOutMin, res.toToken.decimals), // with slippage
      },
    }
  }
}

interface Params {
  fromTokenAddress: MoveStructId | Address
  toTokenAddress: MoveStructId | Address
  toWalletAddress: Address
  slippagePercentage?: number
  fromTokenAmount?: string
  toTokenAmount?: string
  includeSources?: string[]
  excludeSources?: string[]
}

export interface SwapParams {
  function: MoveStructId
  arguments: any[]
  type_arguments: any[]
}

export interface PanoraSwapToken {
  tokenType: string
  name: string
  symbol: string
  decimals: number
}

export interface PanoraSwapQuote {
  fromTokenAmount: bigint
  toTokenAmount: bigint
  maxFromTokenAmount: bigint
  minToTokenAmount: bigint
  slippagePercentage: string
  feeAmount: string
  priceImpact: string
  feeToken: PanoraSwapToken
  // some props are not defined here
}

export interface PanoraSwapPreview {
  assetIn: MoveStructId | Address
  assetOut: MoveStructId | Address
  amountIn: bigint
  amountOut: bigint
  isExactIn: boolean
  swapParams: SwapParams
  quote: PanoraSwapQuote
}

export interface TokenData {
  symbol: string
  address: MoveStructId | Address
  decimals: number
  balance: bigint
  debt: bigint
  extra: bigint
  effectiveBalance: bigint
  remainingDebt: bigint
  surplus: bigint
  estimatedInterest: bigint
};

export async function getRequiredSwapsToPayDebt(
  tokens: TokenData[],
  toAddress: Address = ADDRESS_ZERO,
  slippage: number = 0.2,
  includeSources: string[] = [],
  excludeSources: string[] = [],
): Promise<PanoraSwapPreview[]> {
  const swaps: PanoraSwapPreview[] = []
  const debts = tokens.filter(d => d.remainingDebt > ZERO)

  for (const debtToken of debts) { // tokens needs to be repaid
    let remainingDebt = debtToken.remainingDebt
    const surpluses = tokens.filter(d => d.surplus > ZERO) // tokens with surplus balance

    for (const surplusToken of surpluses) {
      let surplus = surplusToken.surplus
      // if there is debt
      if (remainingDebt > ZERO) {
        const swap = await preview_swap_exact({
          assetIn: surplusToken.address,
          assetOut: debtToken.address,
          amount: unScale(remainingDebt, debtToken.decimals),
          isExactIn: false,
          slippage,
          toAddress,
          includeSources,
          excludeSources,
        })

        // 1. if surplus token is enough to pay full remaining debt
        if (swap && swap.amountIn < surplus) {
          swaps.push(swap)
          remainingDebt = ZERO
          surplus -= swap.amountIn
          break
        }

        // 2. if surplus token is not enough to pay full remaining debt we use surplus to pay as much as possible
        else if (swap && swap.amountIn >= surplus) {
          const swap = await preview_swap_exact({
            assetIn: surplusToken.address,
            assetOut: debtToken.address,
            amount: unScale(surplus, surplusToken.decimals), // full surplus balance
            isExactIn: true, // for exact amountIn
            slippage,
            toAddress,
            includeSources,
            excludeSources,
          })
          if (swap) {
            swaps.push(swap)
            remainingDebt -= swap.amountOut
            surplus = ZERO
            if (remainingDebt <= ZERO) {
              break
            }
          }
        }
      }
    }

    if (remainingDebt > ZERO) {
      logger.warn(
        debugLabel,
        `Unable to fully resolve debt for token: ${debtToken.address}, remaining debt: ${remainingDebt}`,
      )
    }
  }

  return swaps
}
