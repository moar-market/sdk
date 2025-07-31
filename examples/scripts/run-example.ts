import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

const EXAMPLES_DIR = resolve('src')
const fileArg = process.argv[2]

function printUsageAndExit() {
  const files = readdirSync(EXAMPLES_DIR)
    .filter(f => f.endsWith('.ts'))
    .map(f => f.replace(/\.ts$/, ''))

  console.info(`ℹ  Please provide a valid example file name from /examples/src/.

Usage:
  pnpm examples <file>

Examples:
  pnpm examples views
  pnpm examples user-actions
  pnpm examples historical-balance

Available files:
${files.map(f => `  - ${f}`).join('\n')}
`)
  process.exit(1)
}

if (!fileArg) {
  printUsageAndExit()
}

const fileName = fileArg.endsWith('.ts') ? fileArg : `${fileArg}.ts`
const fullPath = resolve(EXAMPLES_DIR, fileName)

if (!existsSync(fullPath)) {
  console.error(`❌ File not found: src/${fileName}\n`)
  printUsageAndExit()
}

spawn('tsx', [fullPath], {
  stdio: 'inherit',
  cwd: process.cwd(),
})
