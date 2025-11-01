import type { CallArgument, TransactionComposer } from '@aptos-labs/script-composer-pack'
import type {
  AccountAddressInput,
  AptosConfig,
  EntryFunctionArgumentTypes,
  InputGenerateTransactionOptions,
  LedgerVersionArg,
  MoveFunctionId,
  MoveModule,
  MoveModuleBytecode,
  SimpleEntryFunctionArgumentTypes,
  TypeArgument,
  TypeTag,
  TypeTagStruct,
} from '@aptos-labs/ts-sdk'
import {
  AccountAddress,
  convertArgument,
  Deserializer,
  fetchModuleAbi,
  generateRawTransaction,
  getAptosFullNode,
  getFunctionParts,
  Hex,
  parseTypeTag,
  SimpleTransaction,
  standardizeTypeTags,
  TransactionPayloadScript,
} from '@aptos-labs/ts-sdk'
import { disableFetchCaching, enableFetchCaching, extractUrl } from '../utils'

export type { CallArgument, SimpleTransaction } // re-export for convenience

export interface InputBatchedFunctionData {
  function: MoveFunctionId
  typeArguments?: Array<TypeArgument>
  functionArguments: Array<
    EntryFunctionArgumentTypes | CallArgument | SimpleEntryFunctionArgumentTypes
  >
  moduleAbi?: MoveModule
  moduleBytecodes?: string[]
  options?: {
    /** @default true - Automatically fetch missing modules from the chain */
    allowFetch?: boolean
  }
}

type TransactionComposerClass = typeof import('@aptos-labs/script-composer-pack').TransactionComposer
type CallArgumentClass = typeof import('@aptos-labs/script-composer-pack').CallArgument

/**
 * A wrapper class around TransactionComposer, which is a WASM library compiled
 * from aptos-core/aptos-move/script-composer.
 * This class allows the SDK caller to build a transaction that invokes multiple Move functions
 * and allow for arguments to be passed around.
 */
export class AptosScriptComposer {
  private config: AptosConfig

  private builder?: TransactionComposer

  private storedModulesMap: Set<string> = new Set()

  private static initPromise?: Promise<void>
  private static transactionComposer?: TransactionComposerClass
  private static callArgument?: CallArgumentClass
  private static loadedModulesCache: Map<string, MoveModuleBytecode> = new Map()

  constructor(aptosConfig: AptosConfig) {
    this.config = aptosConfig
  }

  private getState() {
    if (!this.builder || !AptosScriptComposer.callArgument) {
      throw new Error('AptosScriptComposer has not been initialized. Please call and await init() first.')
    }

    return {
      builder: this.builder,
      callArgument: AptosScriptComposer.callArgument,
    }
  }

  private static async ensureComposerLoaded(): Promise<void> {
    if (AptosScriptComposer.transactionComposer) {
      return
    }

    if (!AptosScriptComposer.initPromise) {
      AptosScriptComposer.initPromise = (async () => {
        const module = await import('@aptos-labs/script-composer-pack')
        const { TransactionComposer: TC, initSync, wasmModule, CallArgument: CA } = module
        initSync({ module: wasmModule })
        AptosScriptComposer.transactionComposer = TC
        AptosScriptComposer.callArgument = CA
      })()
    }

    await AptosScriptComposer.initPromise
  }

  // Initializing the wasm needed for the script composer, must be called
  // before using the composer.
  async init(): Promise<void> {
    await AptosScriptComposer.ensureComposerLoaded()
    this.builder = AptosScriptComposer.transactionComposer!.single_signer()
  }

  storeModule(module: MoveModuleBytecode, moduleName?: string): void {
    const { builder } = this.getState()
    if (!moduleName && !module.abi) {
      throw new Error('Module ABI or module name is required')
    }
    const moduleId = moduleName || `${module.abi?.address}::${module.abi?.name}`
    if (moduleId && !AptosScriptComposer.loadedModulesCache.has(moduleId)) {
      AptosScriptComposer.loadedModulesCache.set(moduleId, module)
    }
    if (moduleId && this.storedModulesMap.has(moduleId)) {
      return
    }
    if (moduleId) {
      this.storedModulesMap.add(moduleId)
    }
    builder.store_module(Hex.fromHexInput(module.bytecode).toUint8Array())
  }

  // Add a move function invocation to the TransactionComposer.
  //
  // Similar to how to create an entry function, the difference is that input arguments could
  // either be a `CallArgument` which represents an abstract value returned from a previous Move call
  // or the regular entry function arguments.
  //
  // The function would also return a list of `CallArgument` that can be passed on to future calls.
  //
  // Validation behavior:
  // - If allowFetch is true (default): Validates that the function exists in the provided ABI (if any)
  // - If allowFetch is false: Requires both moduleAbi and moduleBytecodes to be provided
  // - Automatically fetches missing modules from the chain when allowFetch is enabled
  //
  // Note: The function will throw an error if the module is not found in the global cache and autoFetch is disabled.
  //       The caller should ensure that the module is loaded before calling this function.
  async addBatchedCall(input: InputBatchedFunctionData): Promise<CallArgument[]> {
    const { builder, callArgument } = this.getState() // ensure the composer is initialized
    const { moduleAddress, moduleName, functionName } = getFunctionParts(input.function)
    const module = input.moduleAbi
    const moduleBytecode = input.moduleBytecodes
    const autoFetch = input.options?.allowFetch ?? true

    // Validation logic based on auto-fetch option
    if (autoFetch) {
      // Auto-fetch mode: Check if function exists in ABI
      if (module) {
        const functionAbi = module.exposed_functions.find(func => func.name === functionName)
        if (!functionAbi) {
          throw new Error(
            `Function '${functionName}' not found in provided ABI for module '${moduleAddress}::${moduleName}'`,
          )
        }
      }
    }
    else {
      // Manual mode: Check if both ABI and bytecode are provided
      if (!module) {
        throw new Error(
          `Module ABI is required when auto-fetch is disabled for '${moduleAddress}::${moduleName}'`,
        )
      }
      if (!moduleBytecode || moduleBytecode.length === 0) {
        throw new Error(
          `Module bytecode is required when auto-fetch is disabled for '${moduleAddress}::${moduleName}'`,
        )
      }
    }

    moduleBytecode?.forEach((rawModule) => {
      builder.store_module(Hex.fromHexInput(rawModule).toUint8Array())
    })

    const moduleId = `${moduleAddress}::${moduleName}`
    const isModuleLoaded = AptosScriptComposer.loadedModulesCache.has(moduleId)
    const isModuleStored = this.storedModulesMap.has(moduleId)

    // If the module is not loaded in the global cache (isModuleLoaded) or not stored in the local map (isModuleStored),
    // and autoFetch is enabled, we need to fetch and store the module.
    // This ensures that the module is available both globally and locally for execution.
    if ((!isModuleLoaded || !isModuleStored) && autoFetch) {
      // If the module is not loaded, we can fetch it.
      const fetchedModule = await getModuleInner({
        aptosConfig: this.config,
        accountAddress: moduleAddress,
        moduleName: moduleName.toString(),
      })
      if (fetchedModule) {
        this.storeModule(fetchedModule, moduleId)
      }
      else {
        throw new Error(
          `Module '${moduleAddress}::${moduleName}' could not be fetched. Please ensure it exists on the chain.`,
        )
      }
    }

    if (input.typeArguments !== undefined) {
      for (const typeArgument of input.typeArguments) {
        const typeTag = parseTypeTag(typeArgument.toString())
        const requiredModules = await this.collectRequiredModulesFromTypeTag(typeTag, input.options)
        requiredModules.forEach((id) => {
          if (!AptosScriptComposer.loadedModulesCache.has(id)) {
            throw new Error(
              `Module '${id}' is not loaded in the cache. Please load it before using it in a batched call.`,
            )
          }
          if (!this.storedModulesMap.has(id)) {
            const cachedModule = AptosScriptComposer.loadedModulesCache.get(id)
            if (cachedModule) {
              this.storeModule(cachedModule, id)
            }
            else {
              throw new Error(
                `Module '${id}' could not be found in the cache. Please ensure it is loaded.`,
              )
            }
          }
        })
      }
    }

    const typeArguments = standardizeTypeTags(input.typeArguments)
    let moduleAbi: MoveModule | undefined
    if (!module) {
      moduleAbi = await fetchModuleAbi(moduleAddress, moduleName, this.config)
      if (!moduleAbi) {
        throw new Error(`Could not find module ABI for '${moduleAddress}::${moduleName}'`)
      }
    }
    else {
      moduleAbi = module
    }

    const functionAbi = moduleAbi.exposed_functions.find(func => func.name === functionName)
    if (!functionAbi) {
      throw new Error(
        `Could not find function ABI for '${moduleAddress}::${moduleName}::${functionName}'`,
      )
    }

    if (typeArguments.length !== functionAbi.generic_type_params.length) {
      throw new Error(
        `Type argument count mismatch, expected ${functionAbi.generic_type_params.length}, received ${typeArguments.length}`,
      )
    }

    const functionArguments: CallArgument[] = input.functionArguments.map((arg, i) =>
      arg instanceof callArgument
        ? arg
        : callArgument.newBytes(
            convertArgument(functionName, moduleAbi, arg, i, typeArguments, {
              allowUnknownStructs: true,
            }).bcsToBytes(),
          ),
    )

    return builder.add_batched_call(
      `${moduleAddress}::${moduleName}`,
      functionName,
      typeArguments.map(arg => arg.toString()),
      functionArguments,
    )
  }

  /**
   * Utility function to handle CallArgument copying
   * @template T - The type parameter for non-CallArgument values
   * @param {CallArgument | T} arg - The argument to potentially copy
   * @returns {CallArgument | T} A copy of the CallArgument if arg is a CallArgument, otherwise returns arg as-is
   */
  copyIfCallArgument<T>(arg: CallArgument | T): CallArgument | T {
    const { callArgument } = this.getState() // ensure the composer is initialized
    return arg instanceof callArgument ? (arg as CallArgument).copy() : arg
  }

  getNewSigner(id: number): CallArgument {
    const { callArgument } = this.getState() // ensure the composer is initialized
    return callArgument.newSigner(id)
  }

  build(): Uint8Array {
    const { builder } = this.getState() // ensure the composer is initialized
    return builder.generate_batched_calls(true)
  }

  build_payload(): TransactionPayloadScript {
    return TransactionPayloadScript.load(new Deserializer(this.build()))
  }

  async collectRequiredModulesFromTypeTag(
    typeTag: TypeTag,
    options?: { allowFetch?: boolean },
  ): Promise<Set<string>> {
    const modules = new Set<string>()
    if (typeTag.isStruct()) {
      const structTag = typeTag as TypeTagStruct
      const moduleId = `${structTag.value.address}::${structTag.value.moduleName.identifier.toString()}`
      modules.add(moduleId)
      const autoFetch = options?.allowFetch ?? true
      if (!AptosScriptComposer.loadedModulesCache.has(moduleId)) {
        if (autoFetch) {
          const module = await getModuleInner({
            aptosConfig: this.config,
            accountAddress: structTag.value.address,
            moduleName: structTag.value.moduleName.identifier.toString(),
          })
          if (module) {
            this.storeModule(module, moduleId)
          }
          else {
            throw new Error(
              `Module '${moduleId}' could not be fetched. Please ensure it exists on the chain.`,
            )
          }
        }
        else {
          throw new Error(
            `Module '${moduleId}' is not loaded in the cache. Please load it before using it in a batched call.`,
          )
        }
      }
      for (const ty of structTag.value.typeArgs) {
        const result = await this.collectRequiredModulesFromTypeTag(ty, options)
        for (const module of result) {
          modules.add(module)
        }
      }
    }
    else if (typeTag.isVector()) {
      const result = await this.collectRequiredModulesFromTypeTag(typeTag.value, options)
      for (const module of result) {
        modules.add(module)
      }
    }
    return modules
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
  }) // caches fetch requests for modules and bytecode

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

export async function getModuleInner(args: {
  aptosConfig: AptosConfig
  accountAddress: AccountAddressInput
  moduleName: string
  options?: LedgerVersionArg
}): Promise<MoveModuleBytecode> {
  const { aptosConfig, accountAddress, moduleName, options } = args

  const { data } = await getAptosFullNode<object, MoveModuleBytecode>({
    aptosConfig,
    originMethod: 'getModule',
    path: `accounts/${AccountAddress.from(accountAddress).toString()}/module/${moduleName}`,
    params: { ledger_version: options?.ledgerVersion },
  })
  return data
}
