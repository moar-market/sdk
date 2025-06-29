import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    typescript: true,
  },
  {
    rules: {
      // Allow console statements in examples
      'no-console': 'off',
      // Examples don't need strict JSDoc
      'jsdoc/require-jsdoc': 'off',
      'indent': 'off',
    },
  },
  {
    ignores: ['./src'],
  },
)
