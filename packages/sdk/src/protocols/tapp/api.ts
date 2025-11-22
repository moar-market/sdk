import type { Address } from './../../types'

const TAPP_API_URL = 'https://api.tapp.exchange/api/v1' as const

interface JsonRpcRequest<TParams = unknown> {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: TParams
}

interface JsonRpcError {
  code: number
  message: string
  data?: unknown
}

interface JsonRpcResponse<TResult = unknown> {
  jsonrpc: '2.0'
  id: number
  result?: TResult
  error?: JsonRpcError
}

async function tappRpc<TResult = unknown>(
  method: string,
  params?: unknown,
  { signal }: { signal?: AbortSignal } = {},
): Promise<TResult> {
  const payload: JsonRpcRequest = {
    jsonrpc: '2.0',
    id: Math.abs(Date.now() ^ Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
    method,
    ...(params !== undefined ? { params } : {}),
  }
  const response = await fetch(
    TAPP_API_URL,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal,
    },
  )
  const body = await response.json() as JsonRpcResponse<TResult>
  if (!response.ok || body.error) {
    const errorMessage = body.error?.message || `HTTP ${response.status}`
    const error = new Error(`Tapp RPC ${method} failed: ${errorMessage}`);
    (error as any).code = body.error?.code;
    (error as any).data = body.error?.data
    throw error
  }
  return body.result as TResult
}

export interface PoolStatsQuery {
  query: {
    poolId: Address
    [key: string]: unknown
  }
}

export interface PositionQuery {
  query: {
    nftAddrs?: (Address)[]
    page?: number
    pageSize?: number
    [key: string]: unknown
  }
}

export async function getPoolStats(
  params: PoolStatsQuery,
  options?: { signal?: AbortSignal },
): Promise<TappPoolStatsResponse> {
  return await tappRpc<TappPoolStatsResult>('public/pool_stats', params, options || {})
}

export async function getPositions(
  params: PositionQuery,
  options?: { signal?: AbortSignal },
): Promise<TappPositionResponse> {
  return await tappRpc<TappPositionResult>('public/position', params, options || {})
}

// --- Tapp Position Response Types ---

export interface TappPositionAprCampaign {
  aprPercentage: string
  campaignIdx: string
  token: {
    addr: string
    color: string
    decimals: number
    img: string
    symbol: string
    verified: boolean
  }
}

export interface TappPositionApr {
  boostedAprPercentage: string
  campaignAprs: TappPositionAprCampaign[]
  feeAprPercentage: string
  totalAprPercentage: string
}

export interface TappPositionToken {
  addr: string
  amount: string
  color: string
  decimals: number
  idx: number
  img: string
  symbol: string
  usd: string
  verified: boolean
}

export interface TappPositionData {
  apr: TappPositionApr
  collectedFees: string
  createdAt: string
  estimatedCollectFees: TappPositionToken[]
  estimatedIncentives: TappPositionToken[]
  estimatedWithdrawals: TappPositionToken[]
  feeTier: string
  initialDeposits: TappPositionToken[]
  max: string
  min: string
  mintedShare: string
  parent?: string
  poolId: string
  poolType: string
  positionAddr: string
  positionIdx: string
  shareOfPool: string
  sqrtPrice: string
  timeWeightedTvl: string
  totalEarnings: TappPositionToken[]
  tvl: string
  userAddr: string
}

export interface TappPositionResult {
  data: TappPositionData[]
  total: number
}

export type TappPositionResponse = TappPositionResult

// --- Tapp Pool Stats Types ---

export interface TappPoolStatsAprCampaign {
  aprPercentage: number
  campaignIdx: number
  token: {
    addr: string
    color: string
    decimals: number
    img: string
    symbol: string
    verified: boolean
  }
}

export interface TappPoolStatsApr {
  boostedAprPercentage: number
  campaignAprs: TappPoolStatsAprCampaign[]
  feeAprPercentage: number
  totalAprPercentage: number
}

export interface TappPoolStatsToken {
  addr: string
  amount: number
  color: string
  idx: number
  img: string
  symbol: string
  verified: boolean
}

export interface TappPoolStatsResult {
  apr: TappPoolStatsApr
  fee24h: string | null
  feeTier: string
  poolId: string
  poolType: string
  tokens: TappPoolStatsToken[]
  tvl: string
  volume24h: string | null
}

export type TappPoolStatsResponse = TappPoolStatsResult
