import type { Address, CommonSwapPreview, PreviewSwapExact, TokenData } from '../types'
import { logger } from '../logger'
import { preview_swap_exact as defaultPreviewSwapExact } from '../protocols/default-swap' // default if not provided

const ZERO = BigInt(0)
const ADDRESS_ZERO = '0x0'
const debugLabel = 'RepayDebtsWithSwaps'

/**
 * Calculates the required swaps to repay all outstanding debts using available surpluses.
 *
 * For each token with remaining debt, attempts to use available surpluses from other tokens
 * to generate swap previews that can cover the debt. If a surplus is sufficient to fully
 * repay a debt, a single swap is created. If not, as much debt as possible is repaid with
 * the available surplus, and the process continues with other surpluses.
 *
 * If any debt remains unresolved after exhausting all surpluses, a warning is logged.
 *
 * @param params - Parameters for swap calculation.
 * @param params.tokens - List of tokens with their debt and surplus information.
 * @param params.toAddress - Address to receive swapped tokens. Defaults to zero address.
 * @param params.slippage - Slippage tolerance for swaps. Defaults to 0.2.
 * @param params.includeSources - List of swap sources to include.
 * @param params.excludeSources - List of swap sources to exclude.
 * @param params.preview_swap_exact - Function to preview swap quotes. Defaults to the dex_swap preview_swap_exact.
 * @returns Promise resolving to an array of CommonSwapPreview objects representing the swaps needed to repay debts.
 * @throws {Error} If any of the swap previews fail.
 */
export async function getRequiredSwapsToPayDebt(
  {
    tokens,
    toAddress = ADDRESS_ZERO,
    slippage = 0.2,
    includeSources = [],
    excludeSources = [],
    preview_swap_exact = defaultPreviewSwapExact,
  }: GetRequiredSwapsToPayDebtParams,
): Promise<CommonSwapPreview[]> {
  const swaps: CommonSwapPreview[] = []
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
          amount: remainingDebt,
          isExactIn: false,
          slippage,
          toAddress,
          includeSources,
          excludeSources,
        })

        // 1. if surplus token is enough to pay full remaining debt
        if (swap.amountIn < surplus) {
          swaps.push(swap)
          remainingDebt = ZERO
          surplus -= swap.amountIn
          break
        }

        // 2. if surplus token is not enough to pay full remaining debt we use surplus to pay as much as possible
        else if (swap.amountIn >= surplus) {
          const swap = await preview_swap_exact({
            assetIn: surplusToken.address,
            assetOut: debtToken.address,
            amount: surplus, // full surplus balance
            isExactIn: true, // for exact amountIn
            slippage,
            toAddress,
            includeSources,
            excludeSources,
          })

          swaps.push(swap)
          remainingDebt -= swap.amountOut
          surplus = ZERO
          if (remainingDebt <= ZERO) {
            break
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

export interface GetRequiredSwapsToPayDebtParams {
  tokens: TokenData[]
  toAddress?: Address
  slippage?: number
  includeSources?: string[]
  excludeSources?: string[]
  preview_swap_exact?: PreviewSwapExact
}
