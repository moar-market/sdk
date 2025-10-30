import type { Address, MoveStructId, StrategyIdentifier } from '../types'
import { moar_credit_manager_abi } from './../abis'
import { useAptos, useSurfClient } from './../clients'
import { getModuleAddress } from './../config'

function CreditManager() {
  return useSurfClient().useABI(moar_credit_manager_abi, getModuleAddress('moar_credit_manager'))
}

/**
 * Gets all active credit accounts owned by a user
 * @param userAddress The user's address
 * @returns Array of credit account addresses owned by the user
 */
export async function getCreditAccounts(userAddress: Address): Promise<Address[]> {
  const [accounts] = await CreditManager().view.get_user_active_credit_accounts({
    typeArguments: [],
    functionArguments: [userAddress],
  })

  return accounts
}

/**
 * Gets all(active and inactive) credit accounts owned by a user
 * @param userAddress The user's address
 * @returns Array of credit account addresses owned by the user
 */
export async function getAllCreditAccounts(userAddress: Address): Promise<Address[]> {
  const [accounts] = await CreditManager().view.get_user_credit_accounts({
    typeArguments: [],
    functionArguments: [userAddress],
  })

  return accounts
}

export interface CreditAccountResource {
  assets: Array<{
    inner: Address
  }>
  debt_pools: string[]
  is_active: boolean
  last_reward_claim_time: string
  liquidators: Address[]
  owner: Address
  signer_cap: {
    account: Address
  }
  strategies: Array<{
    adapter_id: number
    sub_type: Address
    type: number
  }>
}

/**
 * Retrieves the owner address of a given credit account.
 * @param creditAccount - The address of the credit account.
 * @returns A promise that resolves to the owner's address of the credit account.
 */
export async function getCreditAccountOwner(creditAccount: Address): Promise<Address> {
  const creditManager = getModuleAddress('moar_credit_manager')
  const resourceType = `${creditManager}::credit_manager::CreditAccount` as MoveStructId
  const resource = await useAptos().getAccountResource({
    accountAddress: creditAccount,
    resourceType,
  }) as CreditAccountResource
  return resource.owner
}

/**
 * Checks if a credit account is healthy
 * @param creditAccount The credit account address
 * @returns True if the account is healthy, false otherwise
 */
export async function isAccountHealthy(creditAccount: Address): Promise<boolean> {
  const [isHealthy] = await CreditManager().view.is_position_healthy({
    typeArguments: [],
    functionArguments: [creditAccount],
  })

  return isHealthy
}

/**
 * Checks if a credit account is in bad debt
 * @param creditAccount The credit account address
 * @returns True if the account is in bad debt, false otherwise
 */
export async function isAccountInBadDebt(creditAccount: Address): Promise<boolean> {
  const [isInBadDebt] = await CreditManager().view.is_bad_debt({
    typeArguments: [],
    functionArguments: [creditAccount],
  })

  return isInBadDebt
}

interface AccountStrategyResponse {
  type: number
  adapter_id: number
  sub_type: Address
}

/**
 * Retrieves the strategies associated with a given credit account.
 * @param creditAccount The address of the credit account.
 * @returns An array of strategy objects, each containing adapterId, strategyId, and strategySubType.
 */
export async function getCreditAccountsStrategies(creditAccount: Address): Promise<StrategyIdentifier[]> {
  const [strategies] = await CreditManager().view.get_credit_account_strategies({
    typeArguments: [],
    functionArguments: [creditAccount],
  }) as unknown as [AccountStrategyResponse[]]

  return strategies.map(({ type, adapter_id, sub_type }): StrategyIdentifier => ({
    adapterId: Number(adapter_id),
    strategyId: Number(type),
    strategySubType: sub_type as Address,
  }))
}

/**
 * Gets the assets and debts associated with a credit account
 * @param creditAccount The credit account address
 * @returns Object containing arrays of asset addresses and debt asset addresses
 */
export async function getAccountAssets(creditAccount: Address): Promise<Address[]> {
  const [, assets] = await CreditManager().view.get_credit_account_debt_pools_and_assets({
    typeArguments: [],
    functionArguments: [creditAccount],
  })

  return assets.map(({ inner }) => inner) as Address[]
}

/**
 * Represents the net asset value and unrealized PnL for a credit account.
 * @member netAssetValue - The current net asset value of the account, as a string.
 * @member unrealizedPnL - The unrealized profit or loss for the account, as a string.
 * @member totalPnL - The total profit or loss for the account, as a string. (Total PnL - Total Liquidation Losses)
 * Negative value indicates a loss, positive value indicates a profit.
 */
export interface AccountNetAssetsAndPnLs {
  netAssetValue: string
  unrealizedPnL: string
  totalPnL: string
}

/**
 * Get total PnL for a credit account.
 * @param creditAccount Credit account address
 * @returns Total PnL as a string (negative if loss, positive if profit)
 */
export async function getAccountNetAssetsAndPnLs(creditAccount: Address): Promise<AccountNetAssetsAndPnLs> {
  const [[netAssetValue, unrealizedPnL, isUnrealizedNegative], [totalPnL, isTotalNegative]] = await Promise.all([
    CreditManager().view.get_net_asset_value_and_unrealized_pnl({
      typeArguments: [],
      functionArguments: [creditAccount],
    }),
    CreditManager().view.get_total_pnl({
      typeArguments: [],
      functionArguments: [creditAccount],
    }),
  ])

  return {
    netAssetValue,
    unrealizedPnL: isUnrealizedNegative ? `-${unrealizedPnL}` : unrealizedPnL,
    totalPnL: isTotalNegative ? `-${totalPnL}` : totalPnL,
  }
}

/**
 * Retrieves all active credit accounts from the credit manager
 *
 * @returns Promise resolving to an array of credit account addresses
 */
export async function getAllActiveCreditAccounts(): Promise<Address[]> {
  const [accounts] = await CreditManager().view.get_all_credit_accounts({
    typeArguments: [],
    functionArguments: [],
  })

  return accounts
}

/**
 * Retrieves all users from the credit manager
 *
 * @returns Promise resolving to an array of user addresses
 */
export async function getAllUsers(): Promise<Address[]> {
  const [users] = await CreditManager().view.get_all_users({
    typeArguments: [],
    functionArguments: [],
  })

  return users
}
