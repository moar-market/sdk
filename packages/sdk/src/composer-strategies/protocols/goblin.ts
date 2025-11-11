import type { MoveModule } from '@aptos-labs/ts-sdk'
import type { AptosScriptComposer, CallArgument } from './../../composer'
import type { Address } from './../../types'
import { extendTypeArguments } from '../../utils'
import { composerUtils_fe_abi, moarStrategies_goblin_vault_adapter_abi } from './../../abis'
import { getModuleAddress, useAdapterStrategiesConfig } from './../../config'
import { claimRewards, executeStrategy } from './../shared'

interface CommonAddParams {
  vaultAddress: Address
  rewardPoolId?: number
  isStake?: boolean
}

export interface DepositWithPairParams extends CommonAddParams {
  amountADesired: bigint
  amountBDesired: bigint
  amountAMin: bigint
  amountBMin: bigint
  type: 'pair'
}

export interface DepositWithSingleParams extends CommonAddParams {
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
      function: `${getModuleAddress('moarStrategies_goblin_vault_adapter')}::goblin_vault_adapter::create_deposit_with_pair_inputs_v2`,
      functionArguments: [
        params.vaultAddress,
        params.amountADesired,
        params.amountBDesired,
        params.amountAMin,
        params.amountBMin,
        params.isStake ?? false,
        params.rewardPoolId,
      ],
      typeArguments: [],
      moduleAbi: moarStrategies_goblin_vault_adapter_abi as unknown as MoveModule,
    })

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
      function: `${getModuleAddress('moarStrategies_goblin_vault_adapter')}::goblin_vault_adapter::create_deposit_with_single_inputs_v2`,
      functionArguments: [
        params.vaultAddress,
        params.metadataIn,
        params.useThala,
        params.thalaPoolAddress,
        params.amountIn,
        params.amountInMin,
        params.isStake ?? false,
        params.rewardPoolId,
      ],
      typeArguments: [],
      moduleAbi: moarStrategies_goblin_vault_adapter_abi as unknown as MoveModule,
    })

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

interface CommonRemoveParams {
  vaultAddress: Address
  shareAmount?: bigint
  isUnstake?: boolean
  rewardPoolId?: number
}

export interface RemoveAsPairParams extends CommonRemoveParams {
  amountAMin: bigint
  amountBMin: bigint
  type: 'pair'
}

export interface RemoveAsSingleParams extends CommonRemoveParams {
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
      function: `${getModuleAddress('moarStrategies_goblin_vault_adapter')}::goblin_vault_adapter::create_remove_as_pair_inputs_v2`,
      functionArguments: [
        params.vaultAddress,
        params.shareAmount ?? null,
        params.amountAMin,
        params.amountBMin,
        params.isUnstake ?? false,
        params.rewardPoolId,
      ],
      typeArguments: [],
      moduleAbi: moarStrategies_goblin_vault_adapter_abi as unknown as MoveModule,
    })

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
      function: `${getModuleAddress('moarStrategies_goblin_vault_adapter')}::goblin_vault_adapter::create_remove_as_single_inputs_v2`,
      functionArguments: [
        params.vaultAddress,
        params.shareAmount ?? null,
        params.useThala,
        params.thalaPoolAddress,
        params.metadataOut,
        params.amountOutMin,
        params.isUnstake ?? false,
        params.rewardPoolId,
      ],
      typeArguments: [],
      moduleAbi: moarStrategies_goblin_vault_adapter_abi as unknown as MoveModule,
    })

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

/**
 * Claims rewards from a Goblin vault
 * @param builder - Script composer instance to add the claim reward operations to
 * @param creditAccount - Credit account address or argument to execute the claim reward operations from
 * @param rewardPoolId - The reward pool id
 */
export async function claimReward(
  builder: AptosScriptComposer,
  creditAccount: CallArgument | Address,
  rewardPoolId: number,
): Promise<void> {
  const [claimRewardsInput] = await builder.addBatchedCall({
    function: `${getModuleAddress('moarStrategies_goblin_vault_adapter')}::goblin_vault_adapter::create_claim_rewards_inputs`,
    functionArguments: [rewardPoolId],
    typeArguments: [],
    moduleAbi: moarStrategies_goblin_vault_adapter_abi as unknown as MoveModule,
  })

  const [calldata_vec] = await builder.addBatchedCall({
    function: `${getModuleAddress('composerUtils_fe')}::fe::any_singleton`,
    functionArguments: [claimRewardsInput],
    typeArguments: [],
    moduleAbi: composerUtils_fe_abi as unknown as MoveModule,
  })

  await claimRewards(builder, builder.copyIfCallArgument(creditAccount), {
    typeArguments: extendTypeArguments([], 4),
    calldata: calldata_vec,
    nullType: '',
  })
}
