import antfu from '@antfu/eslint-config'
import oxlint from 'eslint-plugin-oxlint'

export default antfu(
  {
    formatters: true,
    typescript: true,
    pnpm: true,
    markdown: true,
  },
  {
    ignores: [
      'public',
      'chain.config.ts',
      'config/abis',
      'certs',
      'node_modules',
      'dist',
    ],
  },
  ...oxlint.configs['flat/recommended'],
)
