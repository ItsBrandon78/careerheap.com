import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

function parseEnvFile(content) {
  const result = {}
  const lines = content.split(/\r?\n/)

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()
    if (!key) continue

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }

    result[key] = value
  }

  return result
}

function loadLocalEnvFiles() {
  const root = process.cwd()
  const envFileOrder = ['.env', '.env.local']

  for (const file of envFileOrder) {
    const fullPath = path.join(root, file)
    if (!existsSync(fullPath)) continue

    const parsed = parseEnvFile(readFileSync(fullPath, 'utf8'))
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  }
}

loadLocalEnvFiles()

const subcommand = process.argv[2]
if (!subcommand) {
  console.error('Usage: node scripts/sanity-runner.mjs <dev|deploy|...args>')
  process.exit(1)
}

const binName = process.platform === 'win32' ? 'sanity.cmd' : 'sanity'
const sanityBinPath = path.join(process.cwd(), 'node_modules', '.bin', binName)
const args = process.argv.slice(2)

const child =
  process.platform === 'win32'
    ? spawn('cmd.exe', ['/c', sanityBinPath, ...args], {
        stdio: 'inherit',
        env: process.env,
      })
    : spawn(sanityBinPath, args, {
        stdio: 'inherit',
        env: process.env,
      })

child.on('exit', (code) => {
  process.exit(code ?? 1)
})

child.on('error', (error) => {
  console.error(error)
  process.exit(1)
})
