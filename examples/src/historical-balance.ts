// oxlint-disable no-console
import { fetchFungibleBalance, useAptos } from '@moar-market/sdk'

async function main() {
  const aptos = useAptos()

  const userAddress = '0xd03d34771b9d22c94b9ed15f401240bc323f69b24da2f7d11de0e52a806978b9'
  const aptosFA = '0xa'

  const ledgerVersion = 3151821422 // historical balance at this ledger version

  const [currentBalance, { ledger_version: latestLedgerVersion }] = await Promise.all([
    fetchFungibleBalance(userAddress, aptosFA),
    aptos.getLedgerInfo(),
  ])
  // this sets the global ledger version for all future calls after this even outside of this function in same runtime

  aptos.setLedgerVersion?.(ledgerVersion)
  const historicalBalances = await fetchFungibleBalance(userAddress, aptosFA)

  console.log({
    currentBalance: {
      amount: Number(currentBalance) / 1e8,
      ledgerVersion: Number(latestLedgerVersion),
    },
    historicalBalances: {
      amount: Number(historicalBalances) / 1e8,
      ledgerVersion: aptos.getLedgerVersion?.(),
    },
  })

  // this resets the global ledger version for all future calls after this even outside of this function in same runtime
  aptos.setLedgerVersion?.(undefined)
}

main()
