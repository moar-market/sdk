import type { AptosScriptComposer, CallArgument } from './../../composer'
import type { Address } from './../../types'
import { moarStrategies_goblin_vault_adapter_abi } from './../../abis'
import { getModuleAddress, useAdapterStrategiesConfig } from './../../config'
import { executeStrategy } from './../shared'

export interface DepositWithPairParams {
  vaultAddress: Address
  amountADesired: bigint
  amountBDesired: bigint
  amountAMin: bigint
  amountBMin: bigint
  type: 'pair'
}

export interface DepositWithSingleParams {
  vaultAddress: Address
  metadataIn: string
  useThala: boolean
  thalaPoolAddress: Address
  amountIn: bigint
  amountInMin: bigint
  type: 'single'
}

export type DepositParams = DepositWithPairParams | DepositWithSingleParams

/**
 * Deposits tokens into a Goblin vault as a pair or single asset.
 * @param builder - Script composer instance to add the deposit operations to
 * @param creditAccount - Credit account address or argument to execute the deposit operations from
 * @param params - Parameters for depositing (pair or single)
 * @throws {Error} If deposit inputs creation fails
 */
export async function deposit(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  params: DepositParams,
): Promise<void> {
  if (params.type === 'pair') {
    const goblin_vault_add_pair = useAdapterStrategiesConfig().goblin_vault_add_pair
    if (!goblin_vault_add_pair)
      throw new Error('Goblin adapter not available or configured')

    const [, depositWithPairInput] = await builder.addBatchedCall({
      function: `${getModuleAddress('goblinStrategies_adapter')}::goblin_vault_adapter::create_deposit_with_pair_inputs`,
      functionArguments: [
        params.vaultAddress,
        params.amountADesired,
        params.amountBDesired,
        params.amountAMin,
        params.amountBMin,
      ],
      typeArguments: [],
    }, moarStrategies_goblin_vault_adapter_abi)

    if (!depositWithPairInput)
      throw new Error('Failed to create goblin deposit with pair inputs')

    await executeStrategy(
      builder,
      builder.copyIfCallArgument(creditAccount),
      goblin_vault_add_pair.adapterId,
      goblin_vault_add_pair.strategyId,
      depositWithPairInput,
    )
  }
  else if (params.type === 'single') {
    const goblin_vault_add_single = useAdapterStrategiesConfig().goblin_vault_add_single
    if (!goblin_vault_add_single)
      throw new Error('Goblin adapter not available or configured')

    const [, depositWithSingleInput] = await builder.addBatchedCall({
      function: `${getModuleAddress('goblinStrategies_adapter')}::goblin_vault_adapter::create_deposit_with_single_inputs`,
      functionArguments: [
        params.vaultAddress,
        params.metadataIn,
        params.useThala,
        params.thalaPoolAddress,
        params.amountIn,
        params.amountInMin,
      ],
      typeArguments: [],
    }, moarStrategies_goblin_vault_adapter_abi)

    if (!depositWithSingleInput)
      throw new Error('Failed to create goblin deposit with single inputs')

    await executeStrategy(
      builder,
      builder.copyIfCallArgument(creditAccount),
      goblin_vault_add_single.adapterId,
      goblin_vault_add_single.strategyId,
      depositWithSingleInput,
    )
  }
  else {
    throw new Error('Invalid deposit type')
  }
}

export interface RemoveAsPairParams {
  vaultAddress: Address
  shareAmount?: bigint
  amountAMin: bigint
  amountBMin: bigint
  type: 'pair'
}

export interface RemoveAsSingleParams {
  vaultAddress: Address
  shareAmount?: bigint
  useThala: boolean
  thalaPoolAddress: Address
  metadataOut: string
  amountOutMin: bigint
  type: 'single'
}

export type RemoveParams = RemoveAsPairParams | RemoveAsSingleParams

/**
 * Removes liquidity from a Goblin vault as a pair or single asset.
 * @param builder - Script composer instance to add the remove operations to
 * @param creditAccount - Credit account address or argument to execute the remove operations from
 * @param params - Parameters for removing (pair or single)
 * @throws {Error} If remove inputs creation fails
 */
export async function remove(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  params: RemoveParams,
): Promise<void> {
  if (params.type === 'pair') {
    const goblin_vault_remove_pair = useAdapterStrategiesConfig().goblin_vault_remove_pair
    if (!goblin_vault_remove_pair)
      throw new Error('Goblin adapter not available or configured')

    const [, removeAsPairInput] = await builder.addBatchedCall({
      function: `${getModuleAddress('goblinStrategies_adapter')}::goblin_vault_adapter::create_remove_as_pair_inputs`,
      functionArguments: [
        params.vaultAddress,
        params.shareAmount ?? null,
        params.amountAMin,
        params.amountBMin,
      ],
      typeArguments: [],
    }, moarStrategies_goblin_vault_adapter_abi)

    if (!removeAsPairInput)
      throw new Error('Failed to create goblin remove as pair inputs')

    await executeStrategy(
      builder,
      builder.copyIfCallArgument(creditAccount),
      goblin_vault_remove_pair.adapterId,
      goblin_vault_remove_pair.strategyId,
      removeAsPairInput,
    )
  }
  else if (params.type === 'single') {
    const goblin_vault_remove_single = useAdapterStrategiesConfig().goblin_vault_remove_single
    if (!goblin_vault_remove_single)
      throw new Error('Goblin adapter not available or configured')

    const [, removeAsSingleInput] = await builder.addBatchedCall({
      function: `${getModuleAddress('goblinStrategies_adapter')}::goblin_vault_adapter::create_remove_as_single_inputs`,
      functionArguments: [
        params.vaultAddress,
        params.shareAmount ?? null,
        params.useThala,
        params.thalaPoolAddress,
        params.metadataOut,
        params.amountOutMin,
      ],
      typeArguments: [],
    }, moarStrategies_goblin_vault_adapter_abi)

    if (!removeAsSingleInput)
      throw new Error('Failed to create goblin remove as single inputs')

    await executeStrategy(
      builder,
      builder.copyIfCallArgument(creditAccount),
      goblin_vault_remove_single.adapterId,
      goblin_vault_remove_single.strategyId,
      removeAsSingleInput,
    )
  }
  else {
    throw new Error('Invalid remove type')
  }
}
