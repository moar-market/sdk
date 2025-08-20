/**
 * Extends the type arguments array to the specified length, adding given nullType if necessary
 * @param {string[]} typeArguments - The array of type arguments
 * @param {number} length - The desired length of the array
 * @param {string} nullType - The type to add if the array is shorter than the desired length
 * @returns {string[]} - The extended array of type arguments
 */
export function extendTypeArguments(
  typeArguments: string[],
  length: number,
  nullType: string = '0x1::string::String',
): string[] {
  for (let i = typeArguments.length; i < length; i++) {
    typeArguments.push(nullType)
  }
  return typeArguments
}
