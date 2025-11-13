import type { Address, MoveStructId } from '../types'
import { useAptos } from './../clients'
import { useMoarApi, usePkgsConfig } from './../config'

export function getCreditManagerEventTypes() {
  const pkg = usePkgsConfig()

  return {
    accountCreated: `${pkg.moar}::credit_manager::CreditAccountCreated`,
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

    // panora swap events // needed for trade
    panoraSwapEvent: `${pkg.moar_strategies}::panora_adapter::PanoraSwapEvent`,
    // dex swap events // needed for trade
    dexSwapEvent: `${pkg.moar_strategies}::dex_swap_adapter::SwapEvent`,

    // hyperion events
    hyperionAddLiquidity: `${pkg.moar_strategies}::hyperion_adapter::AddLiquidityEvent`,
    hyperionAddLiquidityOptimally: `${pkg.moar_strategies}::hyperion_adapter::AddLiquidityOptimallyEvent`,
    hyperionRemoveLiquidity: `${pkg.moar_strategies}::hyperion_adapter::RemoveLiquidityEvent`,

    // thala v2 LP Strategy Events
    thalaV2AddLiquidity: `${pkg.moar_strategies}::thala_v2_adapter::AddLiquidityEventV2`,
    thalaV2RemoveLiquidity: `${pkg.moar_strategies}::thala_v2_adapter::RemoveLiquidityEventV2`,

    // thala v2 LSD Strategy Events
    thalaV2LSDStake: `${pkg.moar_strategies}::thala_v2_adapter::StakeAPTAndThAPTEvent`,
    thalaV2LSDUnstake: `${pkg.moar_strategies}::thala_v2_adapter::UnstakeThAPTEvent`,
  } as const
}

export type CreditManagerEventTypeMap = ReturnType<typeof getCreditManagerEventTypes>
export type CreditManagerEventKey = keyof CreditManagerEventTypeMap
export type CreditManagerEventType = CreditManagerEventTypeMap[CreditManagerEventKey]

/**
 * Fetches all events of a specified type for a given creditAccount.
 *
 * @param {Address} creditAccount - The address of the credit account.
 * @param {CreditManagerEventKey | MoveStructId} eventType - The event type key or address::module::event_name.
 * @param {AccountEventsOptions} [options] - Optional pagination options.
 * @returns {Promise<EventBaseResponse<T>[]>} The matching credit account events.
 * @throws {Error} If the fetch fails.
 */
export async function fetchAccountEvent<T>(
  creditAccount: Address,
  eventType: CreditManagerEventKey | MoveStructId,
  options?: AccountEventsOptions,
): Promise<EventBaseResponse<T>[]> {
  // If eventType is a key, map it to the real Move struct ID
  const eventTypes = getCreditManagerEventTypes()
  const typeStr = eventType in eventTypes ? eventTypes[eventType as CreditManagerEventKey] : eventType

  const queryString = buildEventQueryFromParams(creditAccount, typeStr, options)

  const url = `${useMoarApi()}/events/fe-account-test?${queryString}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch event type ${eventType}: ${res.status} ${res.statusText}`)
  }
  const eventsRes = (await res.json()).events as EventBaseResponse<T>[]

  return sortEvents(eventsRes)
}

/**
 * Fetches all common events for a specified credit account.
 * common events are: `borrowed`, `repaid`, `accountClosed`, `strategyExecuted`, `liquidated`, `badDebtLiquidated`,
 * `assetAdded`, `collateralDeposited`, `assetWithdrawn`, `panoraSwapEvent`, `dexSwapEvent`
 *
 * @param {Address} creditAccount - The address of the credit account.
 * @returns {Promise<EventBaseResponse<CreditAccountEventData>[]>} The sorted list of common credit account events.
 * @throws {Error} If the fetch operation fails.
 */
export async function fetchCommonAccountEvents(
  creditAccount: Address,
): Promise<EventBaseResponse<CreditAccountEventData>[]> {
  const ledgerVersion = useAptos().getLedgerVersion?.()
  let url = `${useMoarApi()}/events/fe-account-test?credit_account=${creditAccount}`
  if (ledgerVersion) {
    url += `&version_end=${ledgerVersion}`
  }

  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch common events: ${res.status} ${res.statusText}`)
  }
  const eventsRes = (await res.json()).events as EventBaseResponse<CreditAccountEventData>[]

  return sortEvents(eventsRes)
}

/**
 * Fetches all events of a given types for a given creditAccount.
 *
 * @param {Address} creditAccount - The address of the credit account.
 * @param {(CreditManagerEventKey | MoveStructId)[]} eventTypes - The event types to fetch.
 * @param {AccountEventsOptions} [options] - Optional pagination options.
 * @returns {Promise<EventBaseResponse<T>[]>} The matching credit account events.
 * @throws {Error} If the fetch fails.
 */
export async function fetchAccountEvents<T = CreditAccountEventData>(
  creditAccount: Address,
  eventTypes: (CreditManagerEventKey | MoveStructId)[],
  options?: AccountEventsOptions,
): Promise<EventBaseResponse<T>[]> {
  // If eventType is a key, map it to the real Move struct ID
  const eventTypeMap = getCreditManagerEventTypes()
  const resolvedEventTypes = eventTypes.map(
    type => type in eventTypeMap ? eventTypeMap[type as CreditManagerEventKey] : type,
  )

  const queryString = buildEventQueryFromParams(creditAccount, resolvedEventTypes.join(','), options)

  const url = `${useMoarApi()}/events?${queryString}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch events: ${res.status} ${res.statusText}`)
  }
  const eventsRes = (await res.json()).events

  return sortEvents(eventsRes)
}

/**
 * Options for paginated event queries.
 */
export interface AccountEventsOptions {
  page_number?: number | string
  page_size?: number | string
  version_start?: number | string
  version_end?: number | string | 'latest'
  block_height_start?: number | string
  block_height_end?: number | string
}

/**
 * Builds a query string for fetching events based on the provided credit account, event type, and optional pagination or filtering options.
 *
 * @param {Address} creditAccount - The address of the credit account to filter events for.
 * @param {string} indexedType - The event type(s) to filter, as a comma-separated string.
 * @param {AccountEventsOptions} [options] - Optional parameters for pagination and filtering, such as page number, page size, version range, and block height range.
 * @returns {string} The constructed query string for the events API endpoint.
 */
function buildEventQueryFromParams(
  creditAccount: Address,
  indexedType: string,
  options?: AccountEventsOptions,
): string {
  const endLedgerVersion = useAptos().getLedgerVersion?.()
  const params: Record<string, string> = {
    credit_account: creditAccount,
    indexed_type: indexedType,
  }

  if (options) {
    const {
      page_number,
      page_size,
      version_start,
      version_end,
      block_height_start,
      block_height_end,
    } = options

    if (page_number !== undefined)
      params.page_number = String(page_number)
    if (page_size !== undefined)
      params.page_size = String(page_size)
    if (version_start !== undefined)
      params.version_start = String(version_start)

    // Prefer explicit version_end from options, otherwise fallback to latestLedgerVersion if available
    if (version_end !== undefined && version_end !== 'latest') {
      params.version_end = String(version_end)
    }
    // explicitly set to latest we don't want to use the global endLedgerVersion
    else if (endLedgerVersion !== undefined && version_end !== 'latest') {
      params.version_end = String(endLedgerVersion)
    }

    if (block_height_start !== undefined)
      params.block_height_start = String(block_height_start)
    if (block_height_end !== undefined)
      params.block_height_end = String(block_height_end)
  }
  else if (endLedgerVersion !== undefined) {
    // If no options provided, still set version_end if available
    params.version_end = String(endLedgerVersion)
  }

  return Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&')
}

/**
 * Sorts an array of event responses by transaction version and index, and maps them to CreditAccountEvent objects.
 *
 * @template T - The type of the event data.
 * @param {EventBaseResponse<T>[]} eventsRes - The array of event responses to sort and map.
 * @returns {EventBaseResponse<T>[]} The sorted and mapped array of CreditAccountEvent objects.
 */
export function sortEvents<T>(eventsRes: EventBaseResponse<T>[]): EventBaseResponse<T>[] {
  return eventsRes.sort((a, b) => {
    if (a.transaction_version !== b.transaction_version) {
      return a.transaction_version - b.transaction_version
    }
    return a.index - b.index
  })
}

/**
 * Finds the first event in the array that matches the specified indexed_type.
 *
 * @template T - The type of the event data.
 * @param {EventBaseResponse<any>[]} events - The array of event objects to search.
 * @param {MoveStructId} indexed_type - The Move struct ID to match.
 * @returns {(EventBaseResponse<T> | undefined)} The first matching event, or undefined if not found.
 */
export function findEventByType<T>(
  events: EventBaseResponse<any>[],
  indexed_type: MoveStructId,
): EventBaseResponse<T> | undefined {
  return events.find(e => e.indexed_type === indexed_type)
}

/**
 * Finds all events in the array that match the specified indexed_type.
 *
 * @template T - The type of the event data.
 * @param {EventBaseResponse<any>[]} events - The array of event objects to search.
 * @param {MoveStructId} indexed_type - The Move struct ID to match.
 * @returns {EventBaseResponse<T>[]} An array of all matching events.
 */
export function findEventsByType<T>(
  events: EventBaseResponse<any>[],
  indexed_type: MoveStructId,
): EventBaseResponse<T>[] {
  return events.filter(e => e.indexed_type === indexed_type)
}

export interface EventBaseResponse<T> {
  data: T
  index: number
  indexed_type: MoveStructId
  timestamp: string
  transaction_version: number
}

export interface Metadata {
  inner: Address
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

export interface AssetAddedEvent {
  user: Address
  credit_account_address: Address
  asset: Metadata
}

export interface CollateralDepositedEvent {
  user: Address
  credit_account_address: Address
  asset: Metadata
  amount: string
}

export interface AssetWithdrawnEvent {
  user: Address
  credit_account_address: Address
  receiver: Address
  amount: string
  asset: Metadata
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

export interface StrategyExecutedEvent {
  user: Address
  credit_account_address: Address
  adapter_id: number
  strategy: number
  calldata: unknown
}

export interface LiquidationStartedEvent {
  credit_account_address: Address
  liquidator: Address
  debt_data: unknown[]
  asset_data: unknown[]
  debt_repaid_value: string
  asset_seized_value: string
  fee_assets: unknown[]
  fee_amounts: string[]
}

export interface LiquidatedEvent {
  credit_account_address: Address
  liquidator: Address
  debt_data: unknown[]
  asset_data: unknown[]
  debt_repaid_value: string
  asset_seized_value: string
  fee_assets: unknown[]
  fee_amounts: string[]
}

export interface BadDebtLiquidationStartedEvent {
  credit_account_address: Address
  liquidator: Address
  debt_data: unknown[]
  asset_data: unknown[]
  debt_repaid_value: string
  asset_seized_value: string
  bad_debt_value: string
  fee_assets: unknown[]
  fee_amounts: string[]
}

export interface BadDebtLiquidatedEvent {
  credit_account_address: Address
  liquidator: Address
  debt_data: unknown[]
  asset_data: unknown[]
  debt_repaid_value: string
  asset_seized_value: string
  bad_debt_value: string
  fee_assets: unknown[]
  fee_amounts: string[]
}

export interface PanoraSwapEvent {
  credit_account_address: Address
  asset_metadata_in: Address
  amount_in: string
  asset_metadata_out: Address
  amount_out: string
  is_trade: boolean
  trade_value: string
}

export interface DexSwapEvent {
  dex_id: number
  credit_account_address: Address
  from_token: Address
  amount_in: string
  to_token: Address
  amount_out: string
  trade_value: string
  is_trade: boolean
}

export interface HyperionAddLiquidityEvent {
  credit_account_address: Address
  pool: Address
  position_object: Address
  is_stake: boolean
}

export interface HyperionAddLiquidityOptimallyEvent {
  credit_account_address: Address
  pool: Address
  position_object: Address
  token_a_metadata: Address
  token_b_metadata: Address
  amount_a_in: string
  amount_b_in: string
  amount_a_added: string
  amount_b_added: string
  amount_a_left: string
  amount_b_left: string
  is_stake: boolean
  loop_count: string
}

export interface HyperionRemoveLiquidityEvent {
  credit_account_address: Address
  pool: Address
  position_object: Address
  liquidity_amount: string
  is_unstake: boolean
}

export type CreditAccountEventData = CreditAccountCreatedEvent
  | CreditAccountClosedEvent
  | AssetAddedEvent
  | CollateralDepositedEvent
  | AssetWithdrawnEvent
  | BorrowedEvent
  | RepaidEvent
  | StrategyExecutedEvent
  | LiquidationStartedEvent
  | LiquidatedEvent
  | BadDebtLiquidationStartedEvent
  | BadDebtLiquidatedEvent
  // panora swap or panora trade events
  | PanoraSwapEvent
  // dex swap or dex trade events
  | DexSwapEvent
  // hyperion events
  | HyperionAddLiquidityEvent
  | HyperionAddLiquidityOptimallyEvent
  | HyperionRemoveLiquidityEvent
  // thala events
// | ThalaSwapEvent
// | ThalaV1AddLiquidityEvent
// | ThalaV1RemoveLiquidityEvent
// | ThalaV2AddLiquidityEvent
// | ThalaV2RemoveLiquidityEvent
// | ThalaV2LSDStakeEvent
// | ThalaV2LSDUnstakeEvent
