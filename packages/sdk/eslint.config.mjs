import antfu from '@antfu/eslint-config'
import oxlint from 'eslint-plugin-oxlint'

export default antfu(
  {
    stylistic: true,
    typescript: true,
    markdown: true,
    ignores: ['./dist', './src/abis', 'node_modules', 'dist'],
  },
  ...oxlint.configs['flat/recommended'],
)
