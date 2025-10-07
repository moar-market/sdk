import type { TokenConfig } from '@moar-market/sdk'

export const tokens = {
  // stables
  usdc: {
    address: '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b',
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6,
  } as unknown as TokenConfig,

  usdt: {
    address: '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
    name: 'Tether USDT',
    symbol: 'USDT',
    decimals: 6,
  } as unknown as TokenConfig,

  sUSDe: {
    address: '0xb30a694a344edee467d9f82330bbe7c3b89f440a1ecd2da1f3bca266560fce69',
    name: 'Staked USDe',
    symbol: 'sUSDe',
    decimals: 6,
  } as unknown as TokenConfig,

  // apt & variants
  apt: {
    address: '0xa',
    name: 'Aptos',
    symbol: 'APT',
    decimals: 8,
    coinType: '0x1::aptos_coin::AptosCoin',
  } as unknown as TokenConfig,

  kAPT: {
    address: '0x821c94e69bc7ca058c913b7b5e6b0a5c9fd1523d58723a966fb8c1f5ea888105',
    name: 'Kofi APT',
    symbol: 'kAPT',
    decimals: 8,
  } as unknown as TokenConfig,

  thAPT: {
    address: '0xa0d9d647c5737a5aed08d2cfeb39c31cf901d44bc4aa024eaa7e5e68b804e011',
    name: 'Thala APT',
    symbol: 'thAPT',
    decimals: 8,
    coinType: '0xfaf4e633ae9eb31366c9ca24214231760926576c7b625313b3688b5e900731f6::staking::ThalaAPT',
  } as unknown as TokenConfig,

  stkAPT: {
    address: '0x42556039b88593e768c97ab1a3ab0c6a17230825769304482dff8fdebe4c002b',
    name: 'Staked Kofi APT',
    symbol: 'stkAPT',
    decimals: 8,
  } as unknown as TokenConfig,

  sthAPT: {
    address: '0xa9ce1bddf93b074697ec5e483bc5050bc64cff2acd31e1ccfd8ac8cae5e4abe',
    name: 'Staked Thala APT',
    symbol: 'sthAPT',
    decimals: 8,
    coinType: '0xfaf4e633ae9eb31366c9ca24214231760926576c7b625313b3688b5e900731f6::staking::StakedThalaAPT',
  } as unknown as TokenConfig,

  // btc variants
  xBTC: {
    address: '0x81214a80d82035a190fcb76b6ff3c0145161c3a9f33d137f2bbaee4cfec8a387',
    name: 'OKX BTC',
    symbol: 'xBTC',
    decimals: 8,
  } as unknown as TokenConfig,

  wbtc: {
    address: '0x68844a0d7f2587e726ad0579f3d640865bb4162c08a4589eeda3f9689ec52a3d',
    name: 'Wrapped BTC',
    symbol: 'WBTC',
    decimals: 8,
  } as unknown as TokenConfig,
} as const
