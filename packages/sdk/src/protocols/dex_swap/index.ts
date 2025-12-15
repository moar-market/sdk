import type { Address, CommonSwapParams, CommonSwapPreview, CommonSwapQuote, ThalaV2SwapPreview } from '../../types'
import { decreaseByPercent, increaseByPercent, scale } from '@itsmnthn/big-utils'
import { createViewPayload } from '@thalalabs/surf'
import { moarStrategies_dex_swap_adapter_abi } from './../../abis'
import { useSurfClient } from './../../clients'
import { findHyperionPoolConfig, findThalaV2PoolConfig, findTokenConfig, getModuleAddress } from './../../config'
import { logger } from './../../logger'

const debugLabel = 'DexSwapAdapter'

export async function preview_swap_exact_hyperion(
  { assetIn, assetOut, amount, isExactIn, slippage = 0.2 }: CommonSwapParams,
): Promise<CommonSwapPreview> {
  const pool = findHyperionPoolConfig(assetIn as Address, assetOut as Address)
  const tokenIn = findTokenConfig(assetIn as Address)
  const tokenOut = findTokenConfig(assetOut as Address)

  if (!pool || !tokenIn || !tokenOut) {
    const cause = `Hyperion pool not found with assets ${assetIn} and ${assetOut}`
    console.error(debugLabel, cause)
    throw new Error('Failed to preview swap', { cause })
  }

  try {
    logger.debug(
      debugLabel,
      'payload:  pool, assetIn, assetOut, amount, isExactIn',
      pool.address,
      assetIn,
      assetOut,
      amount,
      isExactIn,
      slippage,
    )

    amount = scale(amount, isExactIn ? tokenIn.decimals : tokenOut.decimals)

    const moduleAddress = getModuleAddress('moarStrategies_dex_swap_adapter')
    const views = useSurfClient().useABI(moarStrategies_dex_swap_adapter_abi, moduleAddress).view
    const previewFunction = isExactIn
      ? views.preview_hyperion_swap_exact_in
      : views.preview_hyperion_swap_exact_out

    const [result] = await previewFunction({
      typeArguments: [],
      functionArguments: [[pool.address], assetIn as Address, amount, assetOut as Address],
    })

    let amountIn: bigint
    let amountOut: bigint
    let maxFromTokenAmount: bigint
    let minToTokenAmount: bigint
    if (isExactIn) {
      amountIn = BigInt(amount)
      amountOut = BigInt(result)
      maxFromTokenAmount = amountIn
      minToTokenAmount = decreaseByPercent(BigInt(amountOut), slippage)
    }
    else {
      amountIn = BigInt(result)
      amountOut = BigInt(amount)
      maxFromTokenAmount = increaseByPercent(BigInt(amountIn), slippage)
      minToTokenAmount = amountOut
    }

    const MIN_SQRT_PRICE = '4295048016' // Minimum sqrt price (x64 fixed-point)
    const MAX_SQRT_PRICE = '79226673515401279992447579055' // Maximum sqrt price (x64 fixed-point)

    // Only support single pool swap for now
    const deadline = Math.floor(100 * 365 * 24 * 60 * 60 + Date.now() / 1e3) // 100 years from now by default
    let sqrtPriceLimit: string

    // if token 0 -> token 1 use min sqrt price, if token 1 -> token 0 use max sqrt price
    if (tokenIn.address.toLocaleLowerCase() === pool.coinAddresses[0].toLocaleLowerCase()) {
      sqrtPriceLimit = MIN_SQRT_PRICE
    }
    else {
      sqrtPriceLimit = MAX_SQRT_PRICE
    }

    const swapParams = createViewPayload(moarStrategies_dex_swap_adapter_abi, {
      function: 'create_hyperion_single_pool_swap_inputs',
      functionArguments: [
        pool.feeTierIndex,
        assetIn as Address,
        isExactIn ? amountIn : maxFromTokenAmount,
        assetOut as Address,
        isExactIn ? minToTokenAmount : amountOut,
        sqrtPriceLimit,
        deadline,
        isExactIn,
        false, // is_trade
      ],
      typeArguments: [],
    })

    // Create quote structure similar to panora
    const quote: CommonSwapQuote = {
      fromTokenAmount: amountIn, // base amount without slippage
      toTokenAmount: amountOut, // base amount without slippage
      maxFromTokenAmount, // with slippage applied
      minToTokenAmount, // with slippage applied
      slippagePercentage: slippage.toString(),
      feeAmount: '0', // Default value, should be calculated properly
      priceImpact: '0', // Default value, should be calculated properly
      feeToken: {
        tokenType: assetIn,
        name: '',
        symbol: '',
        decimals: 0,
      },
    }

    return {
      assetIn,
      assetOut,
      amountIn,
      amountOut,
      isExactIn,
      swapParams: {
        function: swapParams.function,
        arguments: swapParams.functionArguments as any[],
        type_arguments: swapParams.typeArguments as any[],
      },
      quote,
    }
  }
  catch (error) {
    console.error(debugLabel, 'error previewing hyperion swap', error)
    throw new Error('Failed to preview swap', { cause: error })
  }
}

export async function preview_swap_exact_thala_v2(
  { assetIn, assetOut, amount, isExactIn, slippage = 0.2 }: CommonSwapParams,
): Promise<CommonSwapPreview> {
  const pool = findThalaV2PoolConfig(assetIn as Address, assetOut as Address)
  const tokenIn = findTokenConfig(assetIn as Address)
  const tokenOut = findTokenConfig(assetOut as Address)

  if (!pool || !tokenIn || !tokenOut) {
    const cause = `Thala V2 pool not found with assets ${assetIn} and ${assetOut}`
    console.error(debugLabel, cause)
    throw new Error('Failed to preview swap', { cause })
  }

  try {
    logger.debug(
      debugLabel,
      'payload:  pool, assetIn, assetOut, amount, isExactIn',
      pool.address,
      assetIn,
      assetOut,
      amount,
      isExactIn,
      slippage,
    )

    amount = scale(amount, isExactIn ? tokenIn.decimals : tokenOut.decimals)

    const moduleAddress = getModuleAddress('moarStrategies_dex_swap_adapter')

    const [result] = await useSurfClient().useABI(
      moarStrategies_dex_swap_adapter_abi,
      moduleAddress,
    ).view.preview_thala_v2_swap({
      typeArguments: [],
      functionArguments: [
        pool.address,
        assetIn as Address,
        amount,
        assetOut as Address,
        isExactIn,
        undefined,
      ],
    }) as [ThalaV2SwapPreview]

    let amountIn: bigint
    let amountOut: bigint
    let maxFromTokenAmount: bigint
    let minToTokenAmount: bigint
    if (isExactIn) {
      amountIn = BigInt(amount)
      amountOut = BigInt(result.amount_out)
      maxFromTokenAmount = amountIn
      minToTokenAmount = decreaseByPercent(BigInt(amountOut), slippage)
    }
    else {
      amountIn = BigInt(result.amount_in)
      amountOut = BigInt(amount)
      maxFromTokenAmount = increaseByPercent(BigInt(amountIn), slippage)
      minToTokenAmount = amountOut
    }

    // Only support single pool swap for now
    const swapParams = createViewPayload(moarStrategies_dex_swap_adapter_abi, {
      function: 'create_thala_v2_swap_inputs',
      functionArguments: [
        pool.address,
        assetIn as Address,
        isExactIn ? amountIn : maxFromTokenAmount,
        assetOut as Address,
        isExactIn ? minToTokenAmount : amountOut,
        isExactIn,
        false, // is_trade
      ],
      typeArguments: [],
    })

    // Create quote structure similar to panora
    const quote: CommonSwapQuote = {
      fromTokenAmount: amountIn, // base amount without slippage
      toTokenAmount: amountOut, // base amount without slippage
      maxFromTokenAmount, // with slippage applied
      minToTokenAmount, // with slippage applied
      slippagePercentage: slippage.toString(),
      feeAmount: result.total_fee_amount.toString(),
      priceImpact: '0', // Default value, should be calculated properly
      feeToken: {
        tokenType: tokenIn.address,
        name: tokenIn.name,
        symbol: tokenIn.symbol,
        decimals: tokenIn.decimals,
      },
    }

    return {
      assetIn,
      assetOut,
      amountIn,
      amountOut,
      isExactIn,
      swapParams: {
        function: swapParams.function,
        arguments: swapParams.functionArguments as any[],
        type_arguments: swapParams.typeArguments as any[],
      },
      quote,
    }
  }
  catch (error) {
    console.error(debugLabel, 'error previewing thala v2 swap', error)
    throw new Error('Failed to preview swap', { cause: error })
  }
}

export async function preview_swap_exact({
  assetIn,
  assetOut,
  amount,
  isExactIn,
  slippage = 0.2,
  toAddress: _toAddress,
  includeSources = [],
  excludeSources = [],
}: CommonSwapParams): Promise<CommonSwapPreview> {
  const include = includeSources.map(s => s.toLowerCase())
  const exclude = excludeSources.map(s => s.toLowerCase())

  const canUseHyperion = (
    (include.length === 0 || include.includes('hyperion'))
    && !exclude.includes('hyperion')
  )
  const canUseThalaV2 = (
    (include.length === 0 || include.includes('thalav2'))
    && !exclude.includes('thalav2')
  )

  if (canUseHyperion) {
    return await preview_swap_exact_hyperion({
      assetIn,
      assetOut,
      amount,
      isExactIn,
      slippage,
    })
  }

  if (canUseThalaV2) {
    return await preview_swap_exact_thala_v2({
      assetIn,
      assetOut,
      amount,
      isExactIn,
      slippage,
    })
  }

  throw new Error('No swap preview found for the specified sources')
}
