import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import process from 'node:process'

const EXAMPLES_DIR = resolve('src')
const fileArg = process.argv[2]

function getAllTsFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      return getAllTsFiles(fullPath)
    }
    if (entry.isFile() && entry.name.endsWith('.ts')) {
      return [relative(EXAMPLES_DIR, fullPath).replace(/\\/g, '/')]
    }
    return []
  })
}

function printUsageAndExit() {
  const files = getAllTsFiles(EXAMPLES_DIR).map(f => f.replace(/\.ts$/, ''))

  console.info(`ℹ  Run a specific example script from /examples/src/.

Usage:
  pnpm examples <example-file-name>

Where <example-file-name> is the name of a TypeScript file (without the .ts extension) in /examples/src/.

Examples:
  pnpm examples views
  pnpm examples user-actions
  pnpm examples inner-dir/inner-file

Available examples:
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
