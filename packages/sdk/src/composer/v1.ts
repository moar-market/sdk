export function v1() {
  return 'v1'
}

// import type { CallArgument, TransactionComposer } from '@aptos-labs/script-composer-pack'
// import type {
//   AccountAddressInput,
//   AptosConfig,
//   EntryFunctionArgumentTypes,
//   InputGenerateTransactionOptions,
//   MoveFunctionId,
//   // MoveModule,
//   SimpleEntryFunctionArgumentTypes,
//   TypeArgument,
// } from '@aptos-labs/ts-sdk'
// import {
//   AccountAddress,
//   AptosApiType,
//   convertArgument,
//   Deserializer,
//   fetchModuleAbi,
//   generateRawTransaction,
//   getFunctionParts,
//   SimpleTransaction,
//   standardizeTypeTags,
//   TransactionPayloadScript,
// } from '@aptos-labs/ts-sdk'
// import { disableFetchCaching, enableFetchCaching, extractUrl } from '../utils'

// export type { CallArgument, SimpleTransaction } // re-export for convenience

// // TODO: update composer pack to new version with module bytecode caching

// export interface InputBatchedFunctionData {
//   function: MoveFunctionId
//   typeArguments?: Array<TypeArgument>
//   functionArguments: Array<
//     EntryFunctionArgumentTypes | CallArgument | SimpleEntryFunctionArgumentTypes
//   >
//   // moduleAbi: MoveModule
//   // moduleBytecodes?: string[]
// }

// /**
//  * A wrapper class around TransactionComposer, which is a WASM library compiled
//  * from aptos-core/aptos-move/script-composer.
//  * This class allows the SDK caller to build a transaction that invokes multiple Move functions
//  * and allow for arguments to be passed around.
//  */
// export class AptosScriptComposer {
//   private config: AptosConfig

//   private builder?: TransactionComposer

//   private scriptComposerWasm?: any
//   private static transactionComposer?: any
//   static callArgument?: typeof CallArgument

//   constructor(aptosConfig: AptosConfig) {
//     this.config = aptosConfig
//     this.builder = undefined
//   }

//   private getState() {
//     if (!this.builder || !AptosScriptComposer.callArgument) {
//       throw new Error('AptosScriptComposer has not been initialized. Please call and await init() first.')
//     }

//     return {
//       builder: this.builder,
//       callArgument: AptosScriptComposer.callArgument,
//     }
//   }

//   // Initializing the wasm needed for the script composer, must be called
//   // before using the composer.
//   async init(): Promise<void> {
//     if (!AptosScriptComposer.transactionComposer) {
//       const module = await import('@aptos-labs/script-composer-pack')
//       const { TransactionComposer: TC, initSync, ScriptComposerWasm, CallArgument: CA } = module
//       if (!this.scriptComposerWasm) {
//         this.scriptComposerWasm = ScriptComposerWasm
//       }
//       if (!AptosScriptComposer.callArgument) {
//         AptosScriptComposer.callArgument = CA
//       }
//       if (!this.scriptComposerWasm.isInitialized) {
//         this.scriptComposerWasm.init()
//       }
//       initSync({ module: this.scriptComposerWasm.wasm })
//       AptosScriptComposer.transactionComposer = TC
//     }
//     this.builder = AptosScriptComposer.transactionComposer.single_signer()
//   }

//   // Add a move function invocation to the TransactionComposer.
//   //
//   // Similar to how to create an entry function, the difference is that input arguments could
//   // either be a `CallArgument` which represents an abstract value returned from a previous Move call
//   // or the regular entry function arguments.
//   //
//   // The function would also return a list of `CallArgument` that can be passed on to future calls.
//   async addBatchedCall(input: InputBatchedFunctionData, moduleAbi?: any): Promise<CallArgument[]> {
//     const { builder, callArgument } = this.getState() // ensure the composer is initialized
//     const { moduleAddress, moduleName, functionName } = getFunctionParts(input.function)
//     const nodeUrl = this.config.getRequestUrl(AptosApiType.FULLNODE)

//     // Load the calling module into the builder.
//     await builder.load_module(nodeUrl, `${moduleAddress}::${moduleName}`)

//     // Load the calling type arguments into the loader.
//     if (input.typeArguments !== undefined) {
//       for (const typeArgument of input.typeArguments) {
//         await builder.load_type_tag(nodeUrl, typeArgument.toString())
//       }
//     }
//     const typeArguments = standardizeTypeTags(input.typeArguments)

//     // load module abi if not provided
//     if (!moduleAbi) {
//       moduleAbi = await fetchModuleAbi(moduleAddress, moduleName, this.config)
//     }

//     if (!moduleAbi) {
//       throw new Error(`Could not find module ABI for '${moduleAddress}::${moduleName}'`)
//     }

//     // Check the type argument count against the ABI
//     const functionAbi = moduleAbi.exposed_functions.find((func: any) => func.name === functionName)
//     if (!functionAbi) {
//       throw new Error(`Could not find function ABI for '${moduleAddress}::${moduleName}::${functionName}'`)
//     }

//     if (typeArguments.length !== functionAbi.generic_type_params.length) {
//       throw new Error(
//         `Type argument count mismatch, expected ${functionAbi.generic_type_params.length}, received ${typeArguments.length}`,
//       )
//     }

//     const functionArguments: CallArgument[] = input.functionArguments.map((arg, i) => {
//       if (arg instanceof callArgument) {
//         return arg
//       }
//       return callArgument.newBytes(
//         convertArgument(
//           functionName,
//           moduleAbi,
//           arg as EntryFunctionArgumentTypes | SimpleEntryFunctionArgumentTypes,
//           i,
//           typeArguments,
//           { allowUnknownStructs: true },
//         ).bcsToBytes(),
//       )
//     })

//     return builder.add_batched_call(
//       `${moduleAddress}::${moduleName}`,
//       functionName,
//       typeArguments.map(arg => arg.toString()),
//       functionArguments,
//     )
//   }

//   /**
//    * Utility function to handle CallArgument copying
//    * @template T - The type parameter for non-CallArgument values
//    * @param {CallArgument | T} arg - The argument to potentially copy
//    * @returns {CallArgument | T} A copy of the CallArgument if arg is a CallArgument, otherwise returns arg as-is
//    */
//   copyIfCallArgument<T>(arg: CallArgument | T): CallArgument | T {
//     const { callArgument } = this.getState() // ensure the composer is initialized
//     return arg instanceof callArgument ? (arg as CallArgument).copy() : arg
//   }

//   getNewSigner(id: number): CallArgument {
//     const { callArgument } = this.getState() // ensure the composer is initialized
//     return callArgument.newSigner(id)
//   }

//   build(): Uint8Array {
//     const { builder } = this.getState() // ensure the composer is initialized
//     return builder.generate_batched_calls(true)
//   }
// }

// /**
//  * Creates a transaction using the script composer
//  * @param {object} params - The parameters for creating a transaction
//  * @param {AptosConfig} params.config - The Aptos configuration
//  * @param {AccountAddressInput} params.sender - The sender account address
//  * @param {Function} params.builder - The builder function
//  * @param {InputGenerateTransactionOptions} params.options - The transaction options
//  * @param {boolean} params.withFeePayer - Whether to include the fee payer in the transaction
//  * @returns {Promise<SimpleTransaction>} The transaction object
//  */
// export async function scriptComposer({
//   config,
//   sender,
//   builder,
//   options,
//   withFeePayer,
// }: {
//   config: AptosConfig
//   sender: AccountAddressInput
//   builder: (builder: AptosScriptComposer) => Promise<AptosScriptComposer>
//   options?: InputGenerateTransactionOptions
//   withFeePayer?: boolean
// }): Promise<SimpleTransaction> {
//   enableFetchCaching((req: RequestInfo | URL) => {
//     const url = extractUrl(req)
//     return url.includes('/accounts/') && url.includes('/module/')
//   }) // caches modules and bytecode

//   const composer = new AptosScriptComposer(config)
//   await composer.init()
//   const _builder = await builder(composer)
//   const bytes = _builder.build()
//   const rawTxn = await generateRawTransaction({
//     sender,
//     aptosConfig: config,
//     payload: TransactionPayloadScript.load(new Deserializer(bytes)),
//     options,
//   })

//   disableFetchCaching()
//   return new SimpleTransaction(rawTxn, withFeePayer === true ? AccountAddress.ZERO : undefined)
// }

// export type ScriptComposer = typeof scriptComposer
