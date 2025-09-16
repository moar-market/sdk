import { swap } from './../protocols/panora'
import {
  getClosePosition,
  getDecreasePosition,
  getIncreasePosition,
  getOpenPosition,
  getSwapInCreditAccount,
} from './factory'

export type {
  ClosePositionParams,
  CreditAccountSwapParams,
  DecreasePositionParams,
  IncreasePositionParams,
  OpenPositionParams,
} from './factory'

/**
 * Executes a swap within a credit account
 * Swaps between debt assets and allowed collateral in strategy
 * @param {CreditAccountSwapParams} params - The parameters for the swap
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export const swapInCreditAccount = getSwapInCreditAccount(swap)

/**
 * Opens a new position by creating a credit account, depositing collateral, borrowing assets and executing swaps
 * @param {OpenPositionParams} params - The parameters for opening a position
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export const openPosition = getOpenPosition(swap)

/**
 * Increases an existing position by depositing more collateral, borrowing additional assets and executing swaps
 * @param {IncreasePositionParams} params - The parameters for increasing a position
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export const increasePosition = getIncreasePosition(swap)

/**
 * Decreases an existing position by optionally depositing collateral, executing swaps and repaying borrowed assets
 * @param {DecreasePositionParams} params - The parameters for decreasing a position
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export const decreasePosition = getDecreasePosition(swap)

/**
 * Closes an existing position by optionally depositing collateral, executing swaps, repaying borrowed assets and closing the credit account
 * @param {ClosePositionParams} params - The parameters for closing a position
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export const closePosition = getClosePosition(swap)
