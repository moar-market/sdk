const originalParse = JSON.parse

/**
 * Monkey patch BigInt toJSON and JSON.parse to support BigInt
 * @example
 * monkeyPatchBigInt() // JSON.parse will support BigInt
 */
export function monkeyPatchBigInt() {
  // browser only check
  if (typeof window === 'undefined') {
    return
  }

  //  JSON Serializer for BigInt
  if (!Object.prototype.hasOwnProperty.call(BigInt.prototype, 'toJSON')) {
  // eslint-disable-next-line no-extend-native
    Object.defineProperty(BigInt.prototype, 'toJSON', {
      value() {
        return `${this.toString()}n`
      },
    })
  }

  // JSON Parser Reviver for BigInt
  function bigIntReviver(_key: string, value: any) {
    if (typeof value === 'string' && value.endsWith('n') && /^\d+n$/.test(value)) {
      return BigInt(value.slice(0, -1))
    }
    return value
  }

  /**
   * Converts a JavaScript Object Notation (JSON) string into an object.
   * @param text A valid JSON string.
   * @param reviver A function that transforms the results. This function is called for each member of the object.
   * If a member contains nested objects, the nested objects are transformed before the parent object is.
   */
  JSON.parse = (text: string, reviver?: (key: string, value: any) => any) => {
    return originalParse(text, (key: string, value: any) => {
      const processedValue = bigIntReviver(key, value)
      return reviver ? reviver(key, processedValue) : processedValue
    })
  }
}

export default monkeyPatchBigInt
