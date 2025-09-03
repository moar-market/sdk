import type { Config } from '../config'
import type { Address, ChainConfig, HyperionPoolConfig, LendPoolConfig, Modules, MoveStructId, ThalaV2PoolConfig } from '../types'

const COIN_ZERO: MoveStructId = '0x1::string::String'

export const MOAR_API = 'https://no.moar.market'

export const CHAIN: ChainConfig = {
  isMainnet: true,
  chainId: 1,
  name: 'mainnet',
  fullname: 'Aptos Mainnet',
  rpc: 'https://fullnode.mainnet.aptoslabs.com/v1',
  indexer: 'https://api.mainnet.aptoslabs.com/v1/graphql',
  explorerBaseUrl: 'https://explorer.aptoslabs.com',
  explorerSuffix: '?network=mainnet',
}

export const ADAPTERS = {
  THALA_V2: 1,
  PANORA: 2,
  HYPERION: 3,
  TAPP: 4,
  DEX_SWAP: 5,
}

export const ADAPTER_STRATEGIES = {
  // swaps and trades
  panora_swap: { adapterId: ADAPTERS.PANORA, strategyId: 1 },
  dex_hyperion_single_pool_swap: { adapterId: ADAPTERS.DEX_SWAP, strategyId: 1 },
  dex_hyperion_multi_pool_swap: { adapterId: ADAPTERS.DEX_SWAP, strategyId: 2 },
  dex_thala_v2_swap: { adapterId: ADAPTERS.DEX_SWAP, strategyId: 3 },

  // thala v2 - 1st strategy was swap and now removed
  thala_v2_add_liquidity: { adapterId: ADAPTERS.THALA_V2, strategyId: 2 },
  thala_v2_remove_liquidity: { adapterId: ADAPTERS.THALA_V2, strategyId: 3 },
  thala_v2_stake_apt: { adapterId: ADAPTERS.THALA_V2, strategyId: 4 },
  thala_v2_stake_thapt: { adapterId: ADAPTERS.THALA_V2, strategyId: 5 },
  thala_v2_stake_apt_and_thapt: { adapterId: ADAPTERS.THALA_V2, strategyId: 6 },
  thala_v2_unstake_thapt: { adapterId: ADAPTERS.THALA_V2, strategyId: 7 },

  // hyperion - clmm
  hyperion_add_liquidity: { adapterId: ADAPTERS.HYPERION, strategyId: 1 },
  hyperion_remove_liquidity: { adapterId: ADAPTERS.HYPERION, strategyId: 2 },
  hyperion_add_liquidity_optimally: { adapterId: ADAPTERS.HYPERION, strategyId: 3 },
  hyperion_rebalance: { adapterId: ADAPTERS.HYPERION, strategyId: 4 },
}

export const PKGS = {
  // moar
  moar: '0xa3afc59243afb6deeac965d40b25d509bb3aebc12f502b8592c283070abc2e07' as Address,
  moar_lens: '0xfa3d17dfdf5037ed9b68c2c85976f899155048fdf96bc77b57ef1ad206c5b007' as Address,
  moar_strategies: '0xc9613ed6276f7c70a5eabdef237dc57ea07a72f563d15cd998dc31ebe6cc0db5' as Address,
  moar_oracle: '0xd74401951a74141b1c0b2a7285fb7e060bf56be829f9e34182819f9c5546e90b' as Address,
  moar_composer_utils: '0x1f7f4df57110ef5870da9738c0c85b814e52828858a3203a8e92e934458e948d' as Address,

  // thala
  thala_v1: '0x48271d39d0b05bd6efca2278f22277d6fcc375504f9839fd73f74ace240861af' as Address,
  thala_v1_farming: '0x6b3720cd988adeaf721ed9d4730da4324d52364871a68eac62b46d21e4d2fa99' as Address,
  thala_v2: '0x007730cd28ee1cdc9e999336cbc430f99e7c44397c0aa77516f6f23a78559bb5' as Address,
  thala_v2_lsd: '0xfaf4e633ae9eb31366c9ca24214231760926576c7b625313b3688b5e900731f6' as Address,
  thala_lpt: '0xbab780b31d9cb1d61a47d3a09854c765e6b04e493f112c63294fabf8376d86a1' as Address,

  // panora
  panora: '0x1c3206329806286fd2223647c9f9b130e66baeb6d7224a18c1f642ffe48f3b4c' as Address,

  // hyperion
  hyperion: '0x8b4a2c4bb53857c718a04c020b98f8c2e1f99a68b0f57389a8bf5434cd22e05c' as Address,
}

// before first _ is the protocol/abi directory name, after first _ is the module name
export const MODULES: Modules = {
  // moar modules
  moar_credit_manager: PKGS.moar,
  moar_oracle: PKGS.moar,
  moar_pool: PKGS.moar,
  moar_farming: PKGS.moar,
  moar_risk_manager: PKGS.moar,
  moar_lens: PKGS.moar_lens,
  moar_hyperion_lens: PKGS.moar_lens,
  moar_interest_rate_model: PKGS.moar,

  // composer utils
  composerUtils_fe: PKGS.moar_composer_utils,

  // moar strategies or moar adapters
  moarStrategies_router: PKGS.moar_strategies,
  moarStrategies_panora_adapter: PKGS.moar_strategies,
  moarStrategies_thala_v2_adapter: PKGS.moar_strategies,
  moarStrategies_hyperion_adapter: PKGS.moar_strategies,
  moarStrategies_dex_swap_adapter: PKGS.moar_strategies,

  moarTiered_tiered_oracle: PKGS.moar_oracle,

  // generic modules
  generic_primary_fungible_store: '0x1',
  generic_copyable_any: '0x1',

  // thala modules
  thalaV1_stable_pool_scripts: PKGS.thala_v1,
  thalaV1_farming: PKGS.thala_v1_farming,
  thalaV2_pool: PKGS.thala_v2,
  thalaV2_staking: PKGS.thala_v2_lsd,
  thalaV2_staked_lpt: PKGS.thala_lpt,

  // hyperion modules
  hyperion_pool_v3: PKGS.hyperion,
  hyperion_router_v3: PKGS.hyperion,
}

const LEND_POOLS: LendPoolConfig[] = [
  {
    id: 0,
    borrow_cap: '16400000000000',
    deposit_cap: '100000000000000000',
    fee_on_interest_bps: '2000',
    interest_accrued: '3490251',
    interest_rate: '3083813',
    is_paused: false,
    name: 'APT',
    origination_fee_bps: '0',
    pool_owner: '0x2dd08646923a012b8384a437fb15964896a8ba0c9f660f3510be0e8466685bce',
    total_borrow_shares: '2289863033043',
    total_borrows: '2296217529946',
    total_deposited: '18538182592200',
    total_lp_token_supply: '18532935279672',
    unbond_period: 86400,
    underlying_asset: '0xa',
    withdraw_period: 172800,
    address: '0x7b11a1658b4f36214b60a51d02dd35d3b5703f1552f8b7e4d045c0a13f8259c3',
    kinks: [
      { rate: 2, util: 0 },
      { rate: 9, util: 80 },
      { rate: 96, util: 100 },
      { rate: 96, util: 100 },
    ],
    ltvs: [
      {
        address: '0xa',
        ltv: '91666670',
      },
      {
        address: '0xa9ce1bddf93b074697ec5e483bc5050bc64cff2acd31e1ccfd8ac8cae5e4abe',
        ltv: '87500000',
      },
      {
        address: '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
        ltv: '80000000',
      },
      {
        address: '0x94ed76d3d66cb0b6e7a3ab81acf830e3a50b8ae3cfb9edc0abea635a11185ff4',
        ltv: '80000000',
      },
      {
        address: '0xb30a694a344edee467d9f82330bbe7c3b89f440a1ecd2da1f3bca266560fce69',
        ltv: '0',
      },
      {
        address: '0x377adc4848552eb2ea17259be928001923efe12271fef1667e2b784f04a7cf3a',
        ltv: '50000000',
      },
      {
        address: '0xb4a8b8462b4423780d6ee256f3a9a3b9ece5d9440d614f7ab2bfa4556aa4f69d',
        ltv: '0',
      },
      {
        address: '0x15b6b3396e883afa0fd10e82b964d09d562657ee3a583c12e65e2385521fcd69',
        ltv: '0',
      },
      {
        address: '0xa928222429caf1924c944973c2cd9fc306ec41152ba4de27a001327021a4dff7',
        ltv: '0',
      },
      {
        address: '0x81214a80d82035a190fcb76b6ff3c0145161c3a9f33d137f2bbaee4cfec8a387',
        ltv: '75000000',
      },
      {
        address: '0xa0d9d647c5737a5aed08d2cfeb39c31cf901d44bc4aa024eaa7e5e68b804e011',
        ltv: '90000000',
      },
      {
        address: '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b',
        ltv: '80000000',
      },
    ],
    reduceLeverage: {
      '0xa9ce1bddf93b074697ec5e483bc5050bc64cff2acd31e1ccfd8ac8cae5e4abe': 5,
    },
  },
  {
    id: 1,
    borrow_cap: '470000000000',
    deposit_cap: '100000000000000000',
    fee_on_interest_bps: '2000',
    interest_accrued: '1252565',
    interest_rate: '9783310',
    is_paused: false,
    name: 'USDC',
    origination_fee_bps: '0',
    pool_owner: '0x2dd08646923a012b8384a437fb15964896a8ba0c9f660f3510be0e8466685bce',
    total_borrow_shares: '354424170455',
    total_borrows: '357875570756',
    total_deposited: '528882139789',
    total_lp_token_supply: '526200426862',
    unbond_period: 86400,
    underlying_asset: '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b',
    withdraw_period: 172800,
    address: '0x22dbe22abf689d8a0f751cab7a32fe5570c49b53fcccd4e5d709b269efda554a',
    kinks: [
      { rate: 3.5, util: 0 },
      { rate: 10, util: 70 },
      { rate: 20, util: 90 },
      { rate: 50, util: 100 },
      { rate: 50, util: 100 },
    ],
    ltvs: [
      {
        address: '0xa',
        ltv: '80000000',
      },
      {
        address: '0xa9ce1bddf93b074697ec5e483bc5050bc64cff2acd31e1ccfd8ac8cae5e4abe',
        ltv: '0',
      },
      {
        address: '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
        ltv: '91666600',
      },
      {
        address: '0x94ed76d3d66cb0b6e7a3ab81acf830e3a50b8ae3cfb9edc0abea635a11185ff4',
        ltv: '91666600',
      },
      {
        address: '0xb30a694a344edee467d9f82330bbe7c3b89f440a1ecd2da1f3bca266560fce69',
        ltv: '0',
      },
      {
        address: '0x377adc4848552eb2ea17259be928001923efe12271fef1667e2b784f04a7cf3a',
        ltv: '0',
      },
      {
        address: '0xc3c4cbb3efcd3ec1b6679dc0ed45851486920dba0e86e612e80a79041a6cf1a3',
        ltv: '0',
      },
      {
        address: '0xf0f717f660d36bb0f0f76dcbe30737baf54fab5404691f7086f2e88d3822d8b9',
        ltv: '0',
      },
      {
        address: '0xb4a8b8462b4423780d6ee256f3a9a3b9ece5d9440d614f7ab2bfa4556aa4f69d',
        ltv: '0',
      },
      {
        address: '0x15b6b3396e883afa0fd10e82b964d09d562657ee3a583c12e65e2385521fcd69',
        ltv: '0',
      },
      {
        address: '0xa928222429caf1924c944973c2cd9fc306ec41152ba4de27a001327021a4dff7',
        ltv: '0',
      },
      {
        address: '0x81214a80d82035a190fcb76b6ff3c0145161c3a9f33d137f2bbaee4cfec8a387',
        ltv: '75000000',
      },
      {
        address: '0xa0d9d647c5737a5aed08d2cfeb39c31cf901d44bc4aa024eaa7e5e68b804e011',
        ltv: '0',
      },
      {
        address: '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b',
        ltv: '91666600',
      },
      {
        address: '0x5b07f08f0c43104b1dcb747273c5fc13bd86074f6e8e591bf0d8c5b08720cbd4',
        ltv: '0',
      },
      {
        address: '0x2ced9638b769c72ff2f4dd063346ef514c737206146628dc443efe098418d739',
        ltv: '0',
      },
      {
        address: '0xce9e3b2437fd2cddc5c14f6c4259fc7d3cef160b820837591aa48170bb509368',
        ltv: '0',
      },
      {
        address: '0x35c3e420fa4fd925628366f1977865d62432c8856a2db147a1cb13f7207f6a79',
        ltv: '0',
      },
    ],
  },
]

export const tokens = {
  usdc: {
    address: '0xbae207659db88bea0cbead6da0ed00aac12edcdda169e591cd41c94180b46f3b',
    name: 'USDC',
    symbol: 'USDC',
    decimals: 6,
    coinType: COIN_ZERO,
  },
  usdt: {
    address: '0x357b0b74bc833e95a115ad22604854d6b0fca151cecd94111770e5d6ffc9dc2b',
    name: 'Tether USDT',
    symbol: 'USDT',
    decimals: 6,
    coinType: COIN_ZERO,
  },
  apt: {
    address: '0xa',
    name: 'Aptos',
    symbol: 'APT',
    decimals: 8,
    coinType: '0x1::aptos_coin::AptosCoin',
  },
  sUSDe: {
    address: '0xb30a694a344edee467d9f82330bbe7c3b89f440a1ecd2da1f3bca266560fce69',
    name: 'Staked USDe',
    symbol: 'sUSDe',
    decimals: 6,
    coinType: COIN_ZERO,
  },
  xBTC: {
    address: '0x81214a80d82035a190fcb76b6ff3c0145161c3a9f33d137f2bbaee4cfec8a387',
    name: 'OKX BTC',
    symbol: 'xBTC',
    decimals: 8,
    coinType: COIN_ZERO,
  },
  wbtc: {
    address: '0x68844a0d7f2587e726ad0579f3d640865bb4162c08a4589eeda3f9689ec52a3d',
    name: 'Wrapped BTC',
    symbol: 'WBTC',
    decimals: 8,
    coinType: COIN_ZERO,
  },
  stkAPT: {
    address: '0x42556039b88593e768c97ab1a3ab0c6a17230825769304482dff8fdebe4c002b',
    name: 'Staked Kofi APT',
    symbol: 'stkAPT',
    decimals: 8,
    coinType: COIN_ZERO,
  },
  thAPT: {
    address: '0xa0d9d647c5737a5aed08d2cfeb39c31cf901d44bc4aa024eaa7e5e68b804e011',
    name: 'Thala APT',
    symbol: 'thAPT',
    decimals: 8,
    coinType: '0xfaf4e633ae9eb31366c9ca24214231760926576c7b625313b3688b5e900731f6::staking::ThalaAPT',
  },
  sthAPT: {
    address: '0xa9ce1bddf93b074697ec5e483bc5050bc64cff2acd31e1ccfd8ac8cae5e4abe',
    name: 'Staked Thala APT',
    symbol: 'sthAPT',
    decimals: 8,
    coinType: '0xfaf4e633ae9eb31366c9ca24214231760926576c7b625313b3688b5e900731f6::staking::StakedThalaAPT',
  },
} as const

export enum HYPERION_FEE_INDEX {
  'PER_0.01_SPACING_1' = 0,
  'PER_0.05_SPACING_5' = 1,
  'PER_0.3_SPACING_60' = 2,
  'PER_1_SPACING_200' = 3,
}

export const HYPERION_POOLS = {
  apt_usdc: {
    name: 'APT-USDC',
    address: '0x925660b8618394809f89f8002e2926600c775221f43bf1919782b297a79400d8',
    coinAddresses: [tokens.apt.address, tokens.usdc.address],
    feeTierIndex: 1,
    priceDecimals: 8,
    weights: [50, 50],
    isWeighted: true,
  } as HyperionPoolConfig,
  usdt_usdc: {
    name: 'USDT-USDC',
    address: '0xd3894aca06d5f42b27c89e6f448114b3ed6a1ba07f992a58b2126c71dd83c127',
    coinAddresses: [tokens.usdt.address, tokens.usdc.address],
    feeTierIndex: 0,
    priceDecimals: 4,
    weights: [50, 50],
    isWeighted: false,
  } as HyperionPoolConfig,
  xbtc_usdc: {
    name: 'xBTC-USDC',
    address: '0xff5a013a4676f724714aec0082403fad822972c56348ba08e0405d08e533325e',
    coinAddresses: [tokens.xBTC.address, tokens.usdc.address],
    feeTierIndex: 1,
    priceDecimals: 8,
    weights: [50, 50],
    isWeighted: true,
  } as HyperionPoolConfig,
  wbtc_usdc: {
    name: 'WBTC-USDC',
    address: '0xa7bb8c9b3215e29a3e2c2370dcbad9c71816d385e7863170b147243724b2da58',
    coinAddresses: [tokens.wbtc.address, tokens.usdc.address],
    feeTierIndex: 1,
    priceDecimals: 8,
    weights: [50, 50],
    isWeighted: true,
  } as HyperionPoolConfig,
  apt_usdt: {
    name: 'APT-USDT',
    address: '0x18269b1090d668fbbc01902fa6a5ac6e75565d61860ddae636ac89741c883cbc',
    coinAddresses: [tokens.apt.address, tokens.usdt.address],
    feeTierIndex: 1,
    priceDecimals: 8,
    weights: [50, 50],
    isWeighted: true,
  } as HyperionPoolConfig,
  wbtc_xbtc: {
    name: 'WBTC-xBTC',
    address: '0x0a5002fbf45627d0769a1448d7ec2e022390b1ed4cf00a62b65ce51ff6030271',
    coinAddresses: [tokens.wbtc.address, tokens.xBTC.address],
    feeTierIndex: 0,
    priceDecimals: 8,
    weights: [50, 50],
    isWeighted: false,
  } as HyperionPoolConfig,
  apt_sthapt: {
    name: 'APT-sthAPT',
    address: '0x9866e9ee75969c0274804231b55ed077c0c5c952268e3dc3df333614308f3f63',
    coinAddresses: [tokens.apt.address, tokens.sthAPT.address],
    feeTierIndex: 0,
    priceDecimals: 8,
    weights: [50, 50],
    isWeighted: false,
  } as HyperionPoolConfig,
  apt_thapt: {
    name: 'APT-thAPT',
    address: '0x692ba87730279862aa1a93b5fef9a175ea0cccc1f29dfc84d3ec7fbe1561aef3',
    coinAddresses: [tokens.apt.address, tokens.thAPT.address],
    feeTierIndex: 0,
    priceDecimals: 8,
    weights: [50, 50],
    isWeighted: false,
  } as HyperionPoolConfig,
  apt_stkapt: {
    name: 'APT-stkAPT',
    address: '0x9878b6f039b1fce27240fd51f536fceefac939268ecaa8dd6c84b7640177abe4',
    coinAddresses: [tokens.apt.address, tokens.stkAPT.address],
    feeTierIndex: 0,
    priceDecimals: 8,
    weights: [50, 50],
    isWeighted: false,
  } as HyperionPoolConfig,
  apt_xbtc: {
    name: 'APT-xBTC',
    address: '0xd8609fb7a2446b1e343de45decc9651d4402b967439d352849a422b55327516f',
    coinAddresses: [tokens.apt.address, tokens.xBTC.address],
    feeTierIndex: 1,
    priceDecimals: 8,
    weights: [50, 50],
    isWeighted: true,
  } as HyperionPoolConfig,
  apt_wbtc: {
    name: 'APT-WBTC',
    address: '0x6df8340de848eb3a43eaef4b090d365c8e88e79b3044f11964c9de7b213914e9',
    coinAddresses: [tokens.apt.address, tokens.wbtc.address],
    feeTierIndex: 1,
    priceDecimals: 8,
    weights: [50, 50],
    isWeighted: true,
  } as HyperionPoolConfig,
} as const

const ThalaV2LPT_COIN_TYPE = '0x7ca61cf9aa2239412154145e863823814b9fec37ef34b469718c5f690919e69e::coins::Coin2'
const thAPT_REWARD_ID = '@0xa0d9d647c5737a5aed08d2cfeb39c31cf901d44bc4aa024eaa7e5e68b804e011' // thAPT
// const apt_REWARD_ID = '@0xa' // apt
export const THALA_V2_POOLS = {
  usdc_usdt: {
    name: 'USDC-USDT',
    address: '0xc3c4cbb3efcd3ec1b6679dc0ed45851486920dba0e86e612e80a79041a6cf1a3',
    poolId: 23,
    poolType: '0xc3c4cbb3efcd3ec1b6679dc0ed45851486920dba0e86e612e80a79041a6cf1a3',
    lptAddress: '0xc3c4cbb3efcd3ec1b6679dc0ed45851486920dba0e86e612e80a79041a6cf1a3',
    xlptAddress: '0x5b07f08f0c43104b1dcb747273c5fc13bd86074f6e8e591bf0d8c5b08720cbd4',
    lptCoinType: ThalaV2LPT_COIN_TYPE,
    coinAddresses: [tokens.usdt.address, tokens.usdc.address],
    rewardIds: [thAPT_REWARD_ID],
    isWeighted: false,
    nullType: '', // THALA_V1_NULL_TYPE,
    weights: [50, 50], // will be dynamic fetch from module when required
    minSlippage: 0.6,
  } as ThalaV2PoolConfig,
  apt_usdc_2: {
    name: 'APT-USDC',
    address: '0xa928222429caf1924c944973c2cd9fc306ec41152ba4de27a001327021a4dff7',
    poolId: 0,
    poolType: '0xa928222429caf1924c944973c2cd9fc306ec41152ba4de27a001327021a4dff7',
    lptAddress: '0xa928222429caf1924c944973c2cd9fc306ec41152ba4de27a001327021a4dff7',
    lptCoinType: ThalaV2LPT_COIN_TYPE,
    coinAddresses: [tokens.apt.address, tokens.usdc.address],
    rewardIds: [],
    isWeighted: true,
    weights: [50, 50], // will be dynamic fetch from module when required
    nullType: '', // THALA_V1_NULL_TYPE,
    minSlippage: 0.6,
  } as ThalaV2PoolConfig,
  apt_usdc: {
    name: 'APT-USDC',
    address: '0xb4a8b8462b4423780d6ee256f3a9a3b9ece5d9440d614f7ab2bfa4556aa4f69d',
    poolId: 25,
    poolType: '0xb4a8b8462b4423780d6ee256f3a9a3b9ece5d9440d614f7ab2bfa4556aa4f69d',
    lptAddress: '0xb4a8b8462b4423780d6ee256f3a9a3b9ece5d9440d614f7ab2bfa4556aa4f69d',
    xlptAddress: '0x15b6b3396e883afa0fd10e82b964d09d562657ee3a583c12e65e2385521fcd69',
    lptCoinType: ThalaV2LPT_COIN_TYPE,
    coinAddresses: [tokens.apt.address, tokens.usdc.address],
    rewardIds: [thAPT_REWARD_ID],
    isWeighted: true,
    weights: [50, 50], // will be dynamic fetch from module when required
    nullType: '', // THALA_V1_NULL_TYPE,
    minSlippage: 0.6,
  } as ThalaV2PoolConfig,
  apt_usdt: {
    name: 'APT-USDT',
    address: '0x99d34f16193e251af236d5a5c3114fa54e22ca512280317eda2f8faf1514c395',
    poolId: -1, // not correct
    poolType: '0x99d34f16193e251af236d5a5c3114fa54e22ca512280317eda2f8faf1514c395',
    lptAddress: '0x99d34f16193e251af236d5a5c3114fa54e22ca512280317eda2f8faf1514c395',
    xlptAddress: '0x15b6b3396e883afa0fd10e82b964d09d562657ee3a583c12e65e2385521fcd69',
    lptCoinType: ThalaV2LPT_COIN_TYPE,
    coinAddresses: [tokens.apt.address, tokens.usdt.address],
    rewardIds: [thAPT_REWARD_ID],
    isWeighted: true,
    weights: [50, 50], // will be dynamic fetch from module when required
    nullType: '', // THALA_V1_NULL_TYPE,
    minSlippage: 0.6,
  } as ThalaV2PoolConfig,
  wbtc_usdc: {
    name: 'WBTC-USDC',
    address: '0xb64243d319b686130cf5a11d027589373106acf8d1bcce1531b860e92dbe70fe',
    poolId: -1, // not correct
    poolType: '0xb64243d319b686130cf5a11d027589373106acf8d1bcce1531b860e92dbe70fe',
    lptAddress: '0xb64243d319b686130cf5a11d027589373106acf8d1bcce1531b860e92dbe70fe',
    xlptAddress: '0x15b6b3396e883afa0fd10e82b964d09d562657ee3a583c12e65e2385521fcd69',
    lptCoinType: ThalaV2LPT_COIN_TYPE,
    coinAddresses: [tokens.wbtc.address, tokens.usdc.address],
    rewardIds: [thAPT_REWARD_ID],
    isWeighted: true,
    weights: [50, 50], // will be dynamic fetch from module when required
    nullType: '', // THALA_V1_NULL_TYPE,
    minSlippage: 0.6,
  } as ThalaV2PoolConfig,
  susde_usdc: {
    name: 'sUSDe-USDC',
    address: '0xce9e3b2437fd2cddc5c14f6c4259fc7d3cef160b820837591aa48170bb509368',
    poolId: 27,
    poolType: '0xce9e3b2437fd2cddc5c14f6c4259fc7d3cef160b820837591aa48170bb509368',
    lptAddress: '0xce9e3b2437fd2cddc5c14f6c4259fc7d3cef160b820837591aa48170bb509368',
    xlptAddress: '0x35c3e420fa4fd925628366f1977865d62432c8856a2db147a1cb13f7207f6a79',
    lptCoinType: ThalaV2LPT_COIN_TYPE,
    coinAddresses: [tokens.sUSDe.address, tokens.usdc.address],
    rewardIds: [thAPT_REWARD_ID],
    isWeighted: false,
    isMetastable: true,
    weights: [50, 50], // will be dynamic fetch from module when required
    nullType: '', // THALA_V1_NULL_TYPE,
    minSlippage: 0.6,
  } as ThalaV2PoolConfig,
} as const

export const config: Config = {
  DEBUG: false,
  MOAR_API,
  PANORA_API_KEY: '',
  CACHE_VIEW: true,

  CHAIN,

  PKGS,

  MODULES,

  LEND_POOLS,

  ADAPTERS,
  ADAPTER_STRATEGIES,

  TOKENS: Object.values(tokens),
  HYPERION_POOLS: Object.values(HYPERION_POOLS),
  THALA_V2_POOLS: Object.values(THALA_V2_POOLS),

  MOAR_MODULE_SETTINGS: {
    min_borrow_usd: '100000000',
    min_debt_usd: '100000000',
  },
}
