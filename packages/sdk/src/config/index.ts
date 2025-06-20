export interface Config {
  network: string
  networkName: string
  networkId: string
  networkUrl: string
  networkExplorerUrl: string
  DEBUG: boolean
}

// Store the configuration
let config: Config | null = null

/**
 * Set the blockchain configuration
 * @param newConfig The configuration to set
 */
export function setConfig(newConfig: Config): void {
  config = newConfig
}

/**
 * Get the current blockchain configuration
 * @returns The current configuration or null if not set
 */
export function getConfig(): Config {
  if (!config) {
    throw new Error(
      'Configuration not found: config must be initialized by calling setConfig() before accessing configuration values',
    )
  }

  return config
}

export function isDebugEnabled(): boolean {
  return getConfig().DEBUG || false
}
