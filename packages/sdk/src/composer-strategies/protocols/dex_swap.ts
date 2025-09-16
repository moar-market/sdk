import type { AptosScriptComposer, CallArgument } from './../../composer'
import type { Address, SwapParams } from './../../types'
import { moarStrategies_dex_swap_adapter_abi } from './../../abis'
import { getModuleAddress, useAdapterStrategiesConfig } from './../../config'
import { executeStrategy } from './../shared'

const functionNames = {
  hyperionSinglePoolSwap: 'create_hyperion_single_pool_swap_inputs',
  hyperionMultiPoolSwap: 'create_hyperion_multi_pool_swap_inputs',
  thalaSwap: 'create_thala_v2_swap_inputs',
} as const

export async function swap(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  swaps: SwapParams[],
): Promise<void> {
  const adapterStrategies = useAdapterStrategiesConfig()

  for (const swap of swaps) {
    let strategyId: number
    let adapterId: number
    let functionName: (typeof functionNames)[keyof typeof functionNames]

    if (swap.function.includes(functionNames.hyperionSinglePoolSwap)) {
      functionName = functionNames.hyperionSinglePoolSwap
      const strategyConfig = adapterStrategies.dex_hyperion_single_pool_swap
      if (!strategyConfig)
        throw new Error('Dex swap hyperion single pool strategy not available or configured')
      adapterId = strategyConfig.adapterId
      strategyId = strategyConfig.strategyId
    }
    else if (swap.function.includes(functionNames.hyperionMultiPoolSwap)) {
      functionName = functionNames.hyperionMultiPoolSwap
      const strategyConfig = adapterStrategies.dex_hyperion_multi_pool_swap
      if (!strategyConfig)
        throw new Error('Dex swap hyperion multi pool strategy not available or configured')
      adapterId = strategyConfig.adapterId
      strategyId = strategyConfig.strategyId
    }
    else if (swap.function.includes(functionNames.thalaSwap)) {
      functionName = functionNames.thalaSwap
      const strategyConfig = adapterStrategies.dex_thala_v2_swap
      if (!strategyConfig)
        throw new Error('Dex swap thala v2 strategy not available or configured')
      adapterId = strategyConfig.adapterId
      strategyId = strategyConfig.strategyId
    }
    else {
      throw new Error(`Unsupported protocol: ${swap.function}`)
    }

    // If swap has is_trade, override the last argument with its value
    const functionArguments = Array.isArray(swap.arguments) ? [...swap.arguments] : []
    if ('isTrade' in swap) {
      if (functionArguments.length > 0) {
        functionArguments[functionArguments.length - 1] = Boolean(swap.isTrade) // is_trade true for trade swaps
      }
    }

    const [, swapInput] = await builder.addBatchedCall({
      function: `${getModuleAddress('moarStrategies_dex_swap_adapter')}::dex_swap_adapter::${functionName}`,
      functionArguments,
      typeArguments: swap.type_arguments,
    }, moarStrategies_dex_swap_adapter_abi)

    await executeStrategy(
      builder,
      builder.copyIfCallArgument(creditAccount),
      adapterId,
      strategyId,
      swapInput,
      swap.type_arguments,
    )
  }
}
