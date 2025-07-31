import { createSurfClient } from '@thalalabs/surf'
import { useChainConfig } from './../config'
import { useAptos } from './aptos'

let surfClient: ReturnType<typeof createSurfClient>
let chainId: number

export function useSurfClient() {
  // after changing the chain in config at runtime, we need to recreate the surf client
  if (!surfClient || chainId !== useChainConfig().chainId) {
    chainId = useChainConfig().chainId
    surfClient = createSurfClient(useAptos())
  }

  return surfClient
}
