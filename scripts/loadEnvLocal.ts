import fs from 'node:fs'
import path from 'node:path'

function normalizeEnvValue(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''

  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    const unwrapped = trimmed.slice(1, -1)
    return trimmed.startsWith('"')
      ? unwrapped.replace(/\\n/g, '\n').replace(/\\r/g, '\r')
      : unwrapped
  }

  return trimmed
}

function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const match = trimmed.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (!match) continue

    const [, key, rawValue] = match
    if (process.env[key]?.trim()) continue
    process.env[key] = normalizeEnvValue(rawValue)
  }
}

const repoRoot = path.resolve(__dirname, '..')
loadEnvFile(path.join(repoRoot, '.env.local'))
loadEnvFile(path.join(repoRoot, '.env'))
