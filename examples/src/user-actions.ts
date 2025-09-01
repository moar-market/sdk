// oxlint-disable no-unused-vars
// oxlint-disable no-console
/**
 * Example: User Actions
 *
 * Simple example showing how to create/close a credit account, deposit, withdraw, borrow, repay, execute a swap,
 * deposit into hyperion, withdraw from hyperion, claim rewards.
 */

import type { AnyRawTransaction, CommittedTransactionResponse, UserTransactionResponse } from '@aptos-labs/ts-sdk'
import type { Address } from '@moar-market/sdk'
import type { AptosScriptComposer } from '@moar-market/sdk/composer'
import process from 'node:process'
import { Account, Ed25519PrivateKey, PrivateKey, PrivateKeyVariants } from '@aptos-labs/ts-sdk'
import { /* setAptosApiKey, */ setPanoraApiKey, useAptos, useAptosConfig } from '@moar-market/sdk'
import { scriptComposer } from '@moar-market/sdk/composer'
import {
  borrow,
  closeCreditAccount,
  depositCollateral,
  openCreditAccount,
  repay,
  withdrawCollateral,
} from '@moar-market/sdk/composer-strategies'
import {
  addLiquidity as addLiquidityHyperion,
  addLiquidityOptimally as addLiquidityOptimallyHyperion,
  claimReward as claimRewardHyperion,
  removeLiquidity as removeLiquidityHyperion,
} from '@moar-market/sdk/composer-strategies/protocols/hyperion'
import { swap as panoraSwap } from '@moar-market/sdk/composer-strategies/protocols/panora'
import { getAllPositionIds, getOptimalLiquidityAmounts, getPositionInfo } from '@moar-market/sdk/protocols/hyperion'
import { preview_swap_exact } from '@moar-market/sdk/protocols/panora'

const creditAccount: Address = '0x380cbdccc27092d5a767fdc435ecd00e719a6b7c16a47b61be5cd8dd6f69db80'
const usdc_address: Address = '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b'
const apt_address: Address = '0xa'
const null_type = '0x1::string::String'

// set these config once in the beginning of the script
setPanoraApiKey(process.env.PANORA_API_KEY || '') // set panora api key
// setAptosApiKey(process.env.APTOS_API_KEY || '') // set aptos api key

async function getSender() {
  if (!process.env.PRIVATE_KEY)
    throw new Error('PRIVATE_KEY environment variable is not set')
  const pkString = PrivateKey.formatPrivateKey(process.env.PRIVATE_KEY, PrivateKeyVariants.Ed25519)
  const pk = new Ed25519PrivateKey(pkString)
  return Account.fromPrivateKey({ privateKey: pk })
}

async function executeTransaction(transaction: AnyRawTransaction): Promise<CommittedTransactionResponse> {
  const aptos = useAptos()
  // Sign the transaction
  const senderAuthenticator = aptos.transaction.sign({
    signer: await getSender(),
    transaction,
  })
  console.log('Signed the transaction!')

  // Submit the transaction
  const submittedTransaction = await aptos.transaction.submit.simple({
    transaction,
    senderAuthenticator,
  })
  console.log(`Submitted transaction hash: ${submittedTransaction.hash}`)

  // Wait for the transaction to be executed
  const executedTransaction = await aptos.waitForTransaction({ transactionHash: submittedTransaction.hash })
  console.log(executedTransaction.success ? 'Transaction successful' : 'Transaction failed')
  return executedTransaction
}

async function simulateTransaction(transaction: AnyRawTransaction): Promise<UserTransactionResponse> {
  const aptos = useAptos()
  const [response] = await aptos.transaction.simulate.simple({
    transaction,
  })
  return response
}

async function openCloseCreditAccount(): Promise<void> {
  console.log('💰 Credit Account Example\n')

  try {
    const transaction = await scriptComposer({
      config: useAptosConfig(),
      sender: (await getSender()).accountAddress,
      builder: async (builder: AptosScriptComposer) => {
        // Create a credit account
        const creditAccount = await openCreditAccount(builder)

        // Close the credit account
        await closeCreditAccount(builder, creditAccount)

        return builder
      },
    })

    await executeTransaction(transaction)
  }
  catch (error) {
    console.error('Error:', error)
  }
}

async function openHyperionPoisition(creditAccount: Address) {
  const config = useAptosConfig()
  const sender = (await getSender()).accountAddress
  // Deposit collateral
  const amount = BigInt(5e6) // 5 USDC
  let tx = await scriptComposer({
    config,
    sender,
    builder: async (builder: AptosScriptComposer) => {
      await depositCollateral(builder, creditAccount, [{
        type: null_type,
        metadata: usdc_address,
        amount,
      }])
      return builder
    },
  })
  await executeTransaction(tx)
  console.log('Deposited collateral')

  // Borrow from APT and USDC pools
  const borrows = [
    {
      pool: 0, // APT pool
      amount: BigInt(1e8), // 1 APT
      metadata: apt_address,
    },
    {
      pool: 1, // USDC pool
      amount: BigInt(5e6), // 5 USDC
      metadata: usdc_address,
    },
  ]
  tx = await scriptComposer({
    config,
    sender,
    builder: async (builder: AptosScriptComposer) => {
      await borrow(builder, creditAccount, borrows)
      return builder
    },
  })
  await executeTransaction(tx)
  console.log('Borrowed from APT and USDC pools')

  // Calculate optimal amounts of tokenA and tokenB for add liquidity operation in Hyperion pools
  const addLiquidityParams = {
    tickLower: 4294936546,
    tickUpper: 4294937546,
    tokenA: apt_address,
    tokenB: usdc_address,
    feeTier: 1,
    amountA: BigInt(1e8),
    amountB: BigInt(5e6),
    minAmountA: BigInt(0), // add slippage here
    minAmountB: BigInt(0), // add slippage here
  }
  const optimalAmounts = await getOptimalLiquidityAmounts(addLiquidityParams)
  console.log('Optimal amounts of tokenA and tokenB for add liquidity operation in Hyperion pools', optimalAmounts)

  if (optimalAmounts) {
    addLiquidityParams.amountA = optimalAmounts.optimalAmountA
    addLiquidityParams.amountB = optimalAmounts.optimalAmountB
  }
  else {
    console.log('No optimal amounts of tokenA and tokenB for add liquidity operation in Hyperion pools')
    return
  }

  // Deposit into Hyperion
  tx = await scriptComposer({
    config,
    sender,
    builder: async (builder: AptosScriptComposer) => {
      await addLiquidityHyperion(builder, creditAccount, addLiquidityParams)
      return builder
    },
  })
  await executeTransaction(tx)
  console.log('Deposited into Hyperion')
}

async function swapCreditAccountAssets(creditAccount: Address) {
  const config = useAptosConfig()
  const sender = (await getSender()).accountAddress

  const swapParams = await preview_swap_exact({
    assetIn: apt_address,
    assetOut: usdc_address,
    amount: 0.5,
    isExactIn: true,
    slippage: 0.5,
  })
  console.log('Amount in', swapParams?.amountIn)
  console.log('Amount out', swapParams?.amountOut)

  if (!swapParams) {
    console.log('No swap params available')
    return
  }

  const tx = await scriptComposer({
    config,
    sender,
    builder: async (builder: AptosScriptComposer) => {
      await panoraSwap(builder, creditAccount, [swapParams.swapParams])
      return builder
    },
  })
  await executeTransaction(tx)
  console.log('Swapped credit account assets')
}

async function claimRewards(creditAccount: Address) {
  const config = useAptosConfig()
  const sender = (await getSender()).accountAddress

  const tx = await scriptComposer({
    config,
    sender,
    builder: async (builder: AptosScriptComposer) => {
      await claimRewardHyperion(builder, creditAccount)
      return builder
    },
  })
  await executeTransaction(tx)
  console.log('Claimed rewards')
}

async function removeLiquidityFromHyperion(creditAccount: Address) {
  const config = useAptosConfig()
  const sender = (await getSender()).accountAddress

  const positions = await getAllPositionIds(creditAccount)
  const position_info = await getPositionInfo(positions[0].positionId, positions[0].poolAddress)

  const removeLiquidityParams = {
    position_v3: positions[0].positionId,
    liquidityDelta: position_info.liquidity,
    tokenA: apt_address,
    tokenB: usdc_address,
    feeTier: 1,
    minAmountA: BigInt(0), // add slippage here
    minAmountB: BigInt(0), // add slippage here
  }

  const tx = await scriptComposer({
    config,
    sender,
    builder: async (builder: AptosScriptComposer) => {
      await removeLiquidityHyperion(builder, creditAccount, removeLiquidityParams)
      return builder
    },
  })
  await executeTransaction(tx)
  console.log('Removed liquidity from Hyperion')
}

async function addLiquidityOptimallyToHyperion(creditAccount: Address) {
  const config = useAptosConfig()
  const sender = (await getSender()).accountAddress

  const addLiquidityParams = {
    tickLower: 4294936546,
    tickUpper: 4294937546,
    tokenA: apt_address,
    tokenB: usdc_address,
    feeTier: 1,
    amountA: BigInt(0),
    amountB: BigInt(7e6),
    minAmountA: BigInt(0), // add slippage here
    minAmountB: BigInt(0), // add slippage here
  }

  const tx = await scriptComposer({
    config,
    sender,
    builder: async (builder: AptosScriptComposer) => {
      await addLiquidityOptimallyHyperion(builder, creditAccount, addLiquidityParams)
      return builder
    },
  })
  await executeTransaction(tx)
  console.log('Added liquidity optimally to Hyperion')
}

async function repayDebt(creditAccount: Address) {
  const config = useAptosConfig()
  const sender = (await getSender()).accountAddress

  // repay all debt
  const tx = await scriptComposer({
    config,
    sender,
    builder: async (builder: AptosScriptComposer) => {
      await repay(builder, creditAccount, [{ pool: 1 }])
      return builder
    },
  })
  await executeTransaction(tx)
  console.log('Repaid debt')
}

async function withdrawFunds(creditAccount: Address) {
  const config = useAptosConfig()
  const sender = (await getSender()).accountAddress
  // withdraw all APT and some USDC
  const withdrawParams = [
    {
      metadata: usdc_address,
      amount: BigInt(1e6),
      receiver: sender.toString(),
    },
    {
      metadata: apt_address,
      receiver: sender.toString(),
    },
  ]

  const tx = await scriptComposer({
    config,
    sender,
    builder: async (builder: AptosScriptComposer) => {
      await withdrawCollateral(builder, creditAccount, withdrawParams)
      return builder
    },
  })
  await executeTransaction(tx)
  console.log('Withdrew collateral')
}

// withdraw collateral
withdrawFunds(creditAccount).catch(console.error)
