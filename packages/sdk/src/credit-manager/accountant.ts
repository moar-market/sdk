import type { Address } from '../types'
import { moar_accountant_abi } from '../abis'
import { useSurfClient } from '../clients'
import { getModuleAddress } from '../config'

function Accountant() {
  return useSurfClient().useABI(moar_accountant_abi, getModuleAddress('moar_accountant'))
}

/**
 * Get total collateral value for a credit account.
 * @param creditAccount The credit account address
 * @returns string
 */
export async function getAccountCollateralValue(creditAccount: Address): Promise<string> {
  const [totalCollateralValue] = await Accountant().view.get_total_collateral_value({
    typeArguments: [],
    functionArguments: [creditAccount],
  })

  return totalCollateralValue
}

/**
 * Get collateral amount for an asset in a credit account.
 * @param creditAccount The credit account address
 * @param asset The asset address
 * @returns string
 */
export async function getCollateralAmount(creditAccount: Address, asset: Address): Promise<string> {
  const [amount] = await Accountant().view.get_collateral_amount({
    typeArguments: [],
    functionArguments: [creditAccount, asset],
  })

  return amount
}

/**
 * Get total liquidation loss for a credit account.
 * @param creditAccount The credit account address
 * @returns string
 */
export async function getAccountLiquidationLoss(creditAccount: Address): Promise<string> {
  const [liquidationLoss] = await Accountant().view.get_liquidation_loss({
    typeArguments: [],
    functionArguments: [creditAccount],
  })

  return liquidationLoss
}

/**
 * Get total realized PnL for a credit account.
 * @param creditAccount The credit account address
 * @returns string
 */
export async function getAccountTotalRealizedPnL(creditAccount: Address): Promise<string> {
  const [amount, isNegative] = await Accountant().view.get_total_realized_pnl({
    typeArguments: [],
    functionArguments: [creditAccount],
  })

  return isNegative ? `-${amount}` : amount
}

/**
 * Get principal borrowed for a pool in a credit account.
 * @param creditAccount The credit account address
 * @param poolId Pool ID
 * @returns string
 */
export async function getAccountPrincipalBorrowed(creditAccount: Address, poolId: number): Promise<string> {
  const [principalBorrowed] = await Accountant().view.get_principal_borrowed({
    typeArguments: [],
    functionArguments: [creditAccount, poolId],
  })

  return principalBorrowed
}
