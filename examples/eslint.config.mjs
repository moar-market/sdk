import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    typescript: true,
  },
  {
    rules: {
      'unused-imports/no-unused-vars': 'off',
      'no-unused-vars': 'off',
      // Allow console statements in examples
      'no-console': 'off',
      // Examples don't need strict JSDoc
      'jsdoc/require-jsdoc': 'off',
      'ts/explicit-function-return-type': 'off',
    },
  },
)
