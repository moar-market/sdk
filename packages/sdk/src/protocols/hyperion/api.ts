import type { Address } from './../../types'

export interface HyperionFarm {
  poolId: Address
  rewardFa: Address
  emissionsPerSecond: string
}

export interface HyperionTokenInfo {
  assetType: Address
  bridge: string | null
  coinMarketcapId: string
  coinType: string | null
  coingeckoId: string
  decimals: number
  faType: Address
  hyperfluidSymbol: string
  logoUrl: string
  name: string
  symbol: string
  tags: string[]
  isBanned: boolean
  websiteUrl: string
}

export interface HyperionPool {
  currentTick: number
  feeRate: string
  feeTier: number
  poolId: Address
  senderAddress: Address
  sqrtPrice: string
  token1: Address
  token2: Address
  isOfficial: boolean
  hasDrips: boolean
  farm: HyperionFarm[]
}

export interface HyperionPoolData {
  id: Address
  feeAPR: string
  farmAPR: string
  pool: HyperionPool
  dailyVolumeUSD: string
  feesUSD: string
  tvlUSD: string
  totalVolumeUSD: string
}

export interface HyperionReward {
  amount: string
  amountUSD: string
  token: Address
}

export interface HyperionPositionRewards {
  claimed: HyperionReward[]
  unclaimed: HyperionReward[]
}

export interface HyperionPosition {
  objectId: Address
  poolId: Address
  tickLower: number
  tickUpper: number
  createdAt: string
  pool: HyperionPool
}

export interface HyperionPositionStats {
  isActive: boolean
  value: string
  feeAPR: string
  farmAPR: string
  farm: HyperionPositionRewards
  fees: HyperionPositionRewards
  position: HyperionPosition
}

const HYPERION_API = 'https://api.hyperion.xyz/v1/graphql'

export async function getPoolData(poolId: Address): Promise<HyperionPoolData> {
  const poolQuery = {
    query: `
      query queryPoolById($poolId: String = "") {
        api {
          getPoolStat(poolId: $poolId) {
            dailyVolumeUSD
            totalVolumeUSD
            feesUSD
            tvlUSD
            feeAPR
            farmAPR
            pool {
              currentTick
              feeRate
              feeTier
              poolId
              senderAddress
              sqrtPrice
              token1
              token2
              isOfficial
              hasDrips
              farm {
                poolId
                rewardFa
                emissionsPerSecond
              }
            }
          }
        }
      }
    `,
    variables: { poolId },
    operationName: 'queryPoolById',
  }
  const { data: { api: { getPoolStat: [pool] } } } = await queryGraph(poolQuery)
  return pool
}

export async function getAllPositions(
  poolId: Address | string,
  user: Address | string,
): Promise<HyperionPositionStats[]> {
  const allPositionQuery = {
    query: `
      query queryAllPositionByAddress($address: String = "", $poolId: String = "") {
        api {
          getPositionStatsByAddress(address: $address, poolId: $poolId) {
            isActive
            value
            feeAPR
            farmAPR
            farm {
              claimed {
                amount
                amountUSD
                token
              }
              unclaimed {
                amount
                amountUSD
                token
              }
            }
            fees {
              claimed {
                amount
                amountUSD
                token
              }
              unclaimed {
                amount
                amountUSD
                token
              }
            }
            position {
              objectId
              poolId
              tickLower
              tickUpper
              createdAt
              pool {
                currentTick
                feeRate
                feeTier
                poolId
                senderAddress
                sqrtPrice
                token1
                token2
                isOfficial
                hasDrips
                farm {
                  poolId
                  rewardFa
                  emissionsPerSecond
                }
              }
            }
          }
        }
      }
    `,
    variables: { address: user, poolId },
    operationName: 'queryAllPositionByAddress',
  }
  const { data: { api: { getPositionStatsByAddress: positions } } } = await queryGraph(allPositionQuery)
  return positions
}

export async function getPositionLPAmount(position_v3: Address): Promise<string> {
  const positionLPAmountQuery = {
    query: `query queryObjectBalance($objectId: String = "") {
      liquidityStatementAggregate(where: { objectId: { _eq: $objectId } }) {
        aggregate {
          sum {
            lpAmount
          }
        }
      }
    }`,
    variables: { objectId: position_v3 },
    operationName: 'queryObjectBalance',
  }
  const { data: { liquidityStatementAggregate: { aggregate: { sum: {
    lpAmount,
  } } } } } = await queryGraph(positionLPAmountQuery)
  return lpAmount
}

export interface HyperionPositionAPRParams {
  poolId: Address
  tickLower: number
  tickUpper: number
  token1Amount: string
  token2Amount: string
}

export interface HyperionPositionAPR {
  dailyVolume: string
  farmAPR: string
  feeAPR: string
  lpAmount: string
  poolActiveLPAmountALL: string
  poolActiveLPAmountExclude: string
  value: string
}

export async function getPositionAPR(
  { poolId, tickLower, tickUpper, token1Amount, token2Amount }: HyperionPositionAPRParams,
): Promise<HyperionPositionAPR> {
  const positionAPRQuery = {
    query: `query fetchPositionAPR(
      $poolId: String = ""
      $tickLower: Float = 1.5
      $tickUpper: Float = 1.5
      $token1Amount: String = ""
      $token2Amount: String = ""
    ) {
      api {
        getPositionAPR(
          poolId: $poolId
          tickLower: $tickLower
          tickUpper: $tickUpper
          token1Amount: $token1Amount
          token2Amount: $token2Amount
        ) {
          dailyVolume
          farmAPR
          feeAPR
          lpAmount
          poolActiveLPAmountALL
          poolActiveLPAmountExclude
          value
        }
      }
    }`,
    variables: { poolId, tickLower, tickUpper, token1Amount, token2Amount },
    operationName: 'fetchPositionAPR',
  }

  const { data: { api: { getPositionAPR } } } = await queryGraph(positionAPRQuery)
  return getPositionAPR
}

export async function queryGraph(query: any) {
  return fetch(HYPERION_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  }).then(res => res.json())
}
