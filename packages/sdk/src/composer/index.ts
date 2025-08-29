import type {
  AccountAddressInput,
  AptosConfig,
  EntryFunctionArgumentTypes,
  InputGenerateTransactionOptions,
  MoveFunctionId,
  // MoveModule,
  SimpleEntryFunctionArgumentTypes,
  TypeArgument,
} from '@aptos-labs/ts-sdk'
import { CallArgument, ScriptComposerWasm } from '@aptos-labs/script-composer-pack'
import {
  AccountAddress,
  AptosApiType,
  convertArgument,
  Deserializer,
  fetchModuleAbi,
  generateRawTransaction,
  getFunctionParts,
  SimpleTransaction,
  standardizeTypeTags,
  TransactionPayloadScript,
} from '@aptos-labs/ts-sdk'
import { disableFetchCaching, enableFetchCaching, extractUrl } from '../utils'

export { CallArgument, SimpleTransaction } // re-export for convenience

// TODO: update composer pack to new version with module bytecode caching

export interface InputBatchedFunctionData {
  function: MoveFunctionId
  typeArguments?: Array<TypeArgument>
  functionArguments: Array<
    EntryFunctionArgumentTypes | CallArgument | SimpleEntryFunctionArgumentTypes
  >
  // moduleAbi: MoveModule
  // moduleBytecodes?: string[]
}

/**
 * A wrapper class around TransactionComposer, which is a WASM library compiled
 * from aptos-core/aptos-move/script-composer.
 * This class allows the SDK caller to build a transaction that invokes multiple Move functions
 * and allow for arguments to be passed around.
 */
export class AptosScriptComposer {
  private config: AptosConfig

  private builder?: any

  private static transactionComposer?: any

  constructor(aptosConfig: AptosConfig) {
    this.config = aptosConfig
    this.builder = undefined
  }

  // Initializing the wasm needed for the script composer, must be called
  // before using the composer.
  async init(): Promise<void> {
    if (!AptosScriptComposer.transactionComposer) {
      const module = await import('@aptos-labs/script-composer-pack')
      const { TransactionComposer, initSync } = module
      if (!ScriptComposerWasm.isInitialized) {
        ScriptComposerWasm.init()
      }
      initSync({ module: ScriptComposerWasm.wasm })
      AptosScriptComposer.transactionComposer = TransactionComposer
    }
    this.builder = AptosScriptComposer.transactionComposer.single_signer()
  }

  // Add a move function invocation to the TransactionComposer.
  //
  // Similar to how to create an entry function, the difference is that input arguments could
  // either be a `CallArgument` which represents an abstract value returned from a previous Move call
  // or the regular entry function arguments.
  //
  // The function would also return a list of `CallArgument` that can be passed on to future calls.
  async addBatchedCall(input: InputBatchedFunctionData, moduleAbi?: any): Promise<CallArgument[]> {
    const { moduleAddress, moduleName, functionName } = getFunctionParts(input.function)
    const nodeUrl = this.config.getRequestUrl(AptosApiType.FULLNODE)

    // Load the calling module into the builder.
    await this.builder.load_module(nodeUrl, `${moduleAddress}::${moduleName}`)

    // Load the calling type arguments into the loader.
    if (input.typeArguments !== undefined) {
      for (const typeArgument of input.typeArguments) {
        await this.builder.load_type_tag(nodeUrl, typeArgument.toString())
      }
    }
    const typeArguments = standardizeTypeTags(input.typeArguments)

    // load module abi if not provided
    if (!moduleAbi) {
      moduleAbi = await fetchModuleAbi(moduleAddress, moduleName, this.config)
    }

    if (!moduleAbi) {
      throw new Error(`Could not find module ABI for '${moduleAddress}::${moduleName}'`)
    }

    // Check the type argument count against the ABI
    const functionAbi = moduleAbi.exposed_functions.find((func: any) => func.name === functionName)
    if (!functionAbi) {
      throw new Error(`Could not find function ABI for '${moduleAddress}::${moduleName}::${functionName}'`)
    }

    if (typeArguments.length !== functionAbi.generic_type_params.length) {
      throw new Error(
        `Type argument count mismatch, expected ${functionAbi.generic_type_params.length}, received ${typeArguments.length}`,
      )
    }

    const functionArguments: CallArgument[] = input.functionArguments.map((arg, i) =>
      arg instanceof CallArgument
        ? arg
        : CallArgument.newBytes(
            convertArgument(functionName, moduleAbi, arg, i, typeArguments, { allowUnknownStructs: true }).bcsToBytes(),
          ),
    )

    return this.builder.add_batched_call(
      `${moduleAddress}::${moduleName}`,
      functionName,
      typeArguments.map(arg => arg.toString()),
      functionArguments,
    )
  }

  build(): Uint8Array {
    return this.builder.generate_batched_calls(true)
  }
}

/**
 * Creates a transaction using the script composer
 * @param {object} params - The parameters for creating a transaction
 * @param {AptosConfig} params.config - The Aptos configuration
 * @param {AccountAddressInput} params.sender - The sender account address
 * @param {Function} params.builder - The builder function
 * @param {InputGenerateTransactionOptions} params.options - The transaction options
 * @param {boolean} params.withFeePayer - Whether to include the fee payer in the transaction
 * @returns {Promise<SimpleTransaction>} The transaction object
 */
export async function scriptComposer({
  config,
  sender,
  builder,
  options,
  withFeePayer,
}: {
  config: AptosConfig
  sender: AccountAddressInput
  builder: (builder: AptosScriptComposer) => Promise<AptosScriptComposer>
  options?: InputGenerateTransactionOptions
  withFeePayer?: boolean
}): Promise<SimpleTransaction> {
  enableFetchCaching((req: RequestInfo | URL) => {
    const url = extractUrl(req)
    return url.includes('/accounts/') && url.includes('/module/')
  }) // caches modules and bytecode

  const composer = new AptosScriptComposer(config)
  await composer.init()
  const _builder = await builder(composer)
  const bytes = _builder.build()
  const rawTxn = await generateRawTransaction({
    sender,
    aptosConfig: config,
    payload: TransactionPayloadScript.load(new Deserializer(bytes)),
    options,
  })

  disableFetchCaching()
  return new SimpleTransaction(rawTxn, withFeePayer === true ? AccountAddress.ZERO : undefined)
}

export type ScriptComposer = typeof scriptComposer
