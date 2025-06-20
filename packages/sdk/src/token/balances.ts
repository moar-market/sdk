import type { Address, MoveStructId } from '../types'
import { useSurfClient } from './../clients'

const COIN_ZERO: MoveStructId = '0x1::string::String'
const ADDRESS_ZERO: Address = '0x0'

const FUNGIBLE_BALANCE_ABI = {
  address: '0x1',
  name: 'primary_fungible_store',
  exposed_functions: [{
    name: 'balance',
    visibility: 'public',
    is_entry: false,
    is_view: true,
    generic_type_params: [{ constraints: ['key'] }],
    params: ['address', '0x1::object::Object<T0>'],
    return: ['u64'],
  }],
  friends: [],
  structs: [],
} as const

/**
 * Fetch the balance of a fungible asset type token
 * @param address - The address of the account
 * @param tokenAddress - The address of the token to fetch the balance of
 * @returns The balance of the token
 * Note: Does not throw any errors, returns '0' and logs the error if any error occurs
 */
export async function fetchFungibleBalance(address: Address, tokenAddress: Address): Promise<string> {
  try {
    if (tokenAddress === ADDRESS_ZERO)
      return '0'

    const [amount] = await useSurfClient().useABI(FUNGIBLE_BALANCE_ABI, '0x1').view.balance({
      typeArguments: ['0x1::fungible_asset::Metadata'],
      functionArguments: [address, tokenAddress],
    })

    return amount ?? '0'
  }
  catch (error) {
    console.error(`FungibleBalance: Failed to fetch fungible ${tokenAddress} asset balance`, error)
  }

  return '0'
}

/**
 * Fetch the balance of a coin type token
 * @param address - The address of the account
 * @param coinType - The type of the token (e.g. `0x1::aptos_coin::AptosCoin`)
 * @returns The balance of the token
 * Note: Does not throw any errors, returns '0' and logs the error if any error occurs
 */
export async function fetchCoinBalance(address: Address, coinType: MoveStructId): Promise<string> {
  try {
    if (coinType === COIN_ZERO)
      return '0'

    const { coin } = await useSurfClient().getAccountResource({
      accountAddress: address,
      resourceType: `0x1::coin::CoinStore<${coinType}>`,
    })
    return coin.value ?? '0'
  }
  catch (error: any) {
    if (!error.message.includes('Resource not found')) {
      console.error(`CoinBalance: Failed to fetch ${coinType} coin balance`, error)
    }
  }

  return '0'
}
