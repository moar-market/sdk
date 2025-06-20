import type { Address, MoveStructId } from '../types'
import { useAptos, useSurfClient } from './../clients'
import { usePkgsConfig } from './../config'

// TODO: use our indexer for this
export function getCreditManagerEventTypes() {
  const pkg = usePkgsConfig()

  return {
    // accountCreated: `${pkg.moar}::credit_manager::CreditAccountCreated`,
    accountClosed: `${pkg.moar}::credit_manager::CreditAccountClosed`,
    collateralDeposited: `${pkg.moar}::credit_manager::CollateralDeposited`,
    assetAdded: `${pkg.moar}::credit_manager::AssetAdded`,
    borrowed: `${pkg.moar}::credit_manager::Borrowed`,
    repaid: `${pkg.moar}::credit_manager::Repaid`,
    assetWithdrawn: `${pkg.moar}::credit_manager::AssetWithdrawn`,

    // liquidation events
    liquidationStarted: `${pkg.moar}::credit_manager::LiquidationStarted`,
    liquidated: `${pkg.moar}::credit_manager::LiquidationEnded`,
    badDebtLiquidationStarted: `${pkg.moar}::credit_manager::BadDebtLiquidationStarted`,
    badDebtLiquidated: `${pkg.moar}::credit_manager::BadDebtLiquidationEnded`,

    // strategy events
    strategyExecuted: `${pkg.moar}::credit_manager::StrategyExecuted`,

    // panora swap events
    panoraSwapEvent: `${pkg.moar_strategies}::panora_adapter::PanoraSwapEvent`,

    // thala swap events
    thalaSwapEvent: `${pkg.moar_strategies}::thala_v2_adapter::SwapEvent`,

    // thala v2 LP Strategy Events
    thalaV2AddLiquidity: `${pkg.moar_strategies}::thala_v2_adapter::AddLiquidityEventV2`,
    thalaV2RemoveLiquidity: `${pkg.moar_strategies}::thala_v2_adapter::RemoveLiquidityEventV2`,

    // thala v2 LSD Strategy Events
    thalaV2LSDStake: `${pkg.moar_strategies}::thala_v2_adapter::StakeAPTAndThAPTEvent`,
    thalaV2LSDUnstake: `${pkg.moar_strategies}::thala_v2_adapter::UnstakeThAPTEvent`,
  } as const
}

export async function getAccountEvents(creditAccount: Address): Promise<CreditAccountEvent<CreditAccountEventData>[]> {
  const ledgerVersion = useSurfClient().getLedgerVersion()
  const eventTypes = getCreditManagerEventTypes()
  const events = (await useAptos().getEvents({
    options: {
      where: {
        indexed_type: { _in: Object.values(eventTypes) },
        data: { _contains: { credit_account_address: creditAccount } },
        transaction_version: ledgerVersion ? { _lte: ledgerVersion } : undefined,
      },
    },
  })).sort((a, b) => {
    if (a.transaction_block_height !== b.transaction_block_height) {
      return a.transaction_block_height - b.transaction_block_height
    }
    return a.event_index - b.event_index
  }).map((event) => {
    return {
      data: event.data as CreditAccountEventData,
      event_index: event.event_index as number,
      transaction_block_height: event.transaction_block_height as number,
      transaction_version: event.transaction_version as number,
      indexed_type: event.indexed_type as MoveStructId,
      type: event.type as string,
    }
  })

  return events as CreditAccountEvent<CreditAccountEventData>[]
}

/**
 * Type definitions for credit account event data
 */

export interface CreditAccountCreatedEvent {
  user: Address
  credit_account_address: Address
}

export interface CreditAccountClosedEvent {
  user: Address
  credit_account_address: Address
}

export interface CollateralDepositedEvent {
  user: Address
  credit_account_address: Address
  asset: { inner: string }
  amount: string
}

export interface BorrowedEvent {
  user: Address
  credit_account_address: Address
  pool_id: string
  amount: string
}

export interface RepaidEvent {
  user: Address
  credit_account_address: Address
  pool_id: string
  amount: string
}

export interface LiquidatedEvent {
  credit_account_address: Address
  liquidator: Address
  debt_data: any[]
  asset_data: any[]
  debt_repaid_value: string
  asset_seized_value: string
  fee_assets: any[]
  fee_amounts: string[]
}

export interface BadDebtLiquidatedEvent {
  credit_account_address: Address
  liquidator: Address
  debt_data: any[]
  asset_data: any[]
  debt_repaid_value: string
  asset_seized_value: string
  bad_debt_value: string
  fee_assets: any[]
  fee_amounts: string[]
}

export interface StrategyExecutedEvent {
  user: Address
  credit_account_address: Address
  adapter_id: number
  strategy: number
  calldata: any
}

export interface AssetWithdrawnEvent {
  user: Address
  credit_account_address: Address
  receiver: Address
  amount: string
  asset: { inner: string }
}

export interface AssetAddedEvent {
  user: Address
  credit_account_address: Address
  asset: { inner: string }
}

export interface LiquidationStartedEvent {
  credit_account_address: Address
  liquidator: Address
  debt_data: any[]
  asset_data: any[]
  debt_repaid_value: string
  asset_seized_value: string
  fee_assets: any[]
  fee_amounts: string[]
}

export interface BadDebtLiquidationStartedEvent {
  credit_account_address: Address
  liquidator: Address
  debt_data: any[]
  asset_data: any[]
  debt_repaid_value: string
  asset_seized_value: string
  bad_debt_value: string
  fee_assets: any[]
  fee_amounts: string[]
}

export type CreditAccountEventData
  = | CreditAccountCreatedEvent
    | CollateralDepositedEvent
    | BorrowedEvent
    | RepaidEvent
    | LiquidatedEvent
    | BadDebtLiquidatedEvent
    | StrategyExecutedEvent
    | AssetWithdrawnEvent
    | AssetAddedEvent
    | LiquidationStartedEvent
    | BadDebtLiquidationStartedEvent
// | PanoraSwapEvent | ThalaSwapEvent | ThalaV1AddLiquidityEvent | ThalaV1RemoveLiquidityEvent | ThalaV2AddLiquidityEvent | ThalaV2RemoveLiquidityEvent | ThalaV2LSDStakeEvent | ThalaV2LSDUnstakeEvent

/**
 * Type for a processed credit account event with typed data
 */
export interface CreditAccountEvent<T> {
  data: T
  event_index: number
  transaction_block_height: number
  transaction_version: number
  indexed_type: MoveStructId
  type: string
}

/**
 * First event whose indexed_type is exactly CREDIT_MANAGER_EVENT_TYPES[K]
 */
export function getEventByType<T extends CreditAccountEventData>(
  events: CreditAccountEvent<CreditAccountEventData>[],
  indexed_type: string,
) {
  return events.find(e => e.indexed_type === indexed_type) as CreditAccountEvent<T> | undefined
}

/**
 * All events whose indexed_type is exactly CREDIT_MANAGER_EVENT_TYPES[K]
 */
export function getEventsByType<T extends CreditAccountEventData>(
  events: CreditAccountEvent<CreditAccountEventData>[],
  indexed_type: string,
) {
  return events.filter(e => e.indexed_type === indexed_type) as CreditAccountEvent<T>[]
}
