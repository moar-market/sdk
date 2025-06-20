import type { LedgerVersionArg, MoveStructId, MoveValue } from '@aptos-labs/ts-sdk'
import type { ViewPayload } from '@thalalabs/surf'
import type { Address } from '../types'
import { createSurfClient } from '@thalalabs/surf'
import { useChainConfig } from './../config'
import { useAptos } from './aptos'

let ledgerVersion: number | undefined
let surfClient: ReturnType<typeof createSurfClient>
let chainId: number

// Define an interface for the return type
export interface SurfClientInterface {
  view: <TReturn extends MoveValue[]>(args: {
    payload: ViewPayload<TReturn>
    options?: LedgerVersionArg
  }) => Promise<TReturn>
  getAccountResource: (args: {
    accountAddress: Address
    resourceType: MoveStructId
    options?: LedgerVersionArg
  }) => Promise<any>
  simulateTransaction: ReturnType<typeof createSurfClient>['simulateTransaction']
  fetchABI: ReturnType<typeof createSurfClient>['fetchABI']
  useABI: ReturnType<typeof createSurfClient>['useABI']
  submitTransaction: ReturnType<typeof createSurfClient>['submitTransaction']
  getLedgerVersion: () => number | undefined
  setLedgerVersion: (value: number | undefined) => void
}

export function useSurfClient(): SurfClientInterface {
  // after changing the chain in config at runtime, we need to recreate the surf client
  if (!surfClient || chainId !== useChainConfig().chainId) {
    chainId = useChainConfig().chainId
    surfClient = createSurfClient(useAptos())
  }

  async function view<TReturn extends MoveValue[]>(args: {
    payload: ViewPayload<TReturn>
    options?: LedgerVersionArg
  }): Promise<TReturn> {
    return await surfClient.view({
      payload: args.payload,
      options: args.options ? args.options : { ledgerVersion },
    })
  }

  async function getAccountResource(args: {
    accountAddress: Address
    resourceType: MoveStructId
    options?: LedgerVersionArg
  }) {
    return await useAptos().getAccountResource({
      accountAddress: args.accountAddress,
      resourceType: args.resourceType,
      options: args.options ? args.options : { ledgerVersion },
    })
  }

  return {
    view, // view function with ledger version
    getAccountResource, // get account resource with ledger version

    simulateTransaction: surfClient.simulateTransaction,
    fetchABI: surfClient.fetchABI,
    useABI: surfClient.useABI,
    submitTransaction: surfClient.submitTransaction,

    getLedgerVersion: () => ledgerVersion,
    setLedgerVersion: (value: number | undefined) => { ledgerVersion = value },
  }
}
