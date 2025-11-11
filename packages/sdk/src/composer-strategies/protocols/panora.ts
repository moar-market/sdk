import type { MoveModule } from '@aptos-labs/ts-sdk'
import type { AptosScriptComposer, CallArgument } from './../../composer'
import type { Address, SwapParams } from './../../types'
import { moarStrategies_panora_adapter_abi } from './../../abis'
import { getModuleAddress, useAdapterStrategiesConfig } from './../../config'
import { executeStrategy } from './../shared'

/**
 * Executes one or more swaps through the Panora protocol
 * @param builder - Script composer instance to add the swap operations to
 * @param creditAccount - Credit account address or argument to execute the swaps from
 * @param swaps - Array of swap parameters defining the swap operations to execute
 * @throws {Error} If Panora swap strategy is not configured or swap inputs creation fails
 */
export async function swap(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  swaps: SwapParams[],
): Promise<void> {
  const panora_swap = useAdapterStrategiesConfig().panora_swap
  if (!panora_swap)
    throw new Error('Panora swap strategy not available or configured')

  for (const swap of swaps) {
    // remove first two arg if length is 20 (will be added by execute_strategy_public)
    const functionArguments = swap.arguments.length === 20 ? swap.arguments.slice(2) : swap.arguments
    functionArguments.push(Boolean(swap.isTrade)) // is_trade true for trade swaps

    const [, swapInput] = await builder.addBatchedCall({
      function: `${getModuleAddress('moarStrategies_panora_adapter')}::panora_adapter::create_swap_inputs`,
      functionArguments,
      typeArguments: [],
      moduleAbi: moarStrategies_panora_adapter_abi as unknown as MoveModule,
    })

    if (!swapInput)
      throw new Error('Failed to create panora swap inputs')

    await executeStrategy(
      builder,
      builder.copyIfCallArgument(creditAccount),
      panora_swap.adapterId,
      panora_swap.strategyId,
      swapInput,
      swap.type_arguments,
    )
  }
}
