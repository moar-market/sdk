import type { Config } from '../config'
import type { Address, ChainConfig, LendPoolConfig, Modules } from '../types'

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
}

export const ADAPTER_STRATEGIES = {
  panora_swap: { adapterId: ADAPTERS.PANORA, strategyId: 1 },

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

export const config: Config = {
  DEBUG: false,
  PANORA_API_KEY: process.env.PANORA_API_KEY || '',

  CHAIN,

  PKGS,

  MODULES,

  LEND_POOLS,

  ADAPTERS,
  ADAPTER_STRATEGIES,

  MOAR_MODULE_SETTINGS: {
    min_borrow_usd: '100000000',
    min_debt_usd: '100000000',
  },
}
