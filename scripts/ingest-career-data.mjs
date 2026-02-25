import { createHash, randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { readFile, writeFile, mkdir, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

const DEFAULT_CACHE_DIR = path.join(projectRoot, '.cache', 'career-data')
const DEFAULT_SOURCE_CONFIG_PATH = path.join(projectRoot, 'seeds', 'career-data', 'source-config.json')
const DEFAULT_STO_SHARED_LINKS_PATH = path.join(
  projectRoot,
  'seeds',
  'career-data',
  'sto-shared-links.json'
)

const VALID_SOURCES = ['onet', 'oasis', 'jobbank', 'sto', 'noc']
const REQUIRED_CAREER_SCHEMA_TABLES = [
  'dataset_sources',
  'occupations',
  'skills',
  'occupation_skills',
  'occupation_requirements',
  'occupation_wages',
  'trade_requirements'
]

function parseArgs(argv) {
  const options = {
    sources: new Set(VALID_SOURCES),
    write: false,
    dryRun: true,
    forceDownload: false,
    cacheDir: DEFAULT_CACHE_DIR,
    sourceConfigPath: DEFAULT_SOURCE_CONFIG_PATH,
    stoSharedLinksPath: DEFAULT_STO_SHARED_LINKS_PATH,
    limit: undefined,
    verbose: false
  }

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      options.help = true
      continue
    }
    if (arg === '--all') {
      options.sources = new Set(VALID_SOURCES)
      continue
    }
    if (arg === '--write') {
      options.write = true
      options.dryRun = false
      continue
    }
    if (arg === '--dry-run') {
      options.dryRun = true
      options.write = false
      continue
    }
    if (arg === '--force-download') {
      options.forceDownload = true
      continue
    }
    if (arg === '--verbose') {
      options.verbose = true
      continue
    }
    if (arg.startsWith('--source=')) {
      options.sources = new Set([arg.slice('--source='.length)])
      continue
    }
    if (arg.startsWith('--sources=')) {
      const values = arg
        .slice('--sources='.length)
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
      options.sources = new Set(values)
      continue
    }
    if (arg.startsWith('--skip-source=')) {
      const value = arg.slice('--skip-source='.length).trim()
      options.sources.delete(value)
      continue
    }
    if (arg.startsWith('--cache-dir=')) {
      options.cacheDir = path.resolve(projectRoot, arg.slice('--cache-dir='.length))
      continue
    }
    if (arg.startsWith('--source-config=')) {
      options.sourceConfigPath = path.resolve(projectRoot, arg.slice('--source-config='.length))
      continue
    }
    if (arg.startsWith('--sto-shared-links=')) {
      options.stoSharedLinksPath = path.resolve(projectRoot, arg.slice('--sto-shared-links='.length))
      continue
    }
    if (arg.startsWith('--limit=')) {
      const parsed = Number.parseInt(arg.slice('--limit='.length), 10)
      if (Number.isFinite(parsed) && parsed > 0) {
        options.limit = parsed
      }
      continue
    }
  }

  const invalid = [...options.sources].filter((source) => !VALID_SOURCES.includes(source))
  if (invalid.length > 0) {
    throw new Error(`Unsupported source(s): ${invalid.join(', ')}`)
  }

  if (options.sources.size === 0) {
    throw new Error('No sources selected. Use --all or --sources=<...>.')
  }

  return options
}

function printHelp() {
  console.log(`Career data ingestion

Usage:
  node scripts/ingest-career-data.mjs [options]

Options:
  --all                          Ingest all supported sources (default)
  --source=<name>               Ingest one source (onet|oasis|jobbank|sto|noc)
  --sources=a,b,c               Ingest selected sources
  --skip-source=<name>          Remove one source from selected set
  --dry-run                     Parse and stage data only (default)
  --write                       Persist staged rows to Supabase
  --limit=<n>                   Limit occupations/trades processed per source
  --force-download              Re-download cached source files
  --cache-dir=<path>            Override cache folder (default .cache/career-data)
  --source-config=<path>        Override source config JSON
  --sto-shared-links=<path>     Override STO shared links JSON
  --verbose                     Extra logs
  --help                        Show this help

Examples:
  node scripts/ingest-career-data.mjs --dry-run --sources=onet,oasis,jobbank,sto
  node scripts/ingest-career-data.mjs --write --all
  node scripts/ingest-career-data.mjs --write --source=sto --limit=20
`)
}

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

async function loadLocalEnvFiles(root) {
  const envFileOrder = ['.env', '.env.local']
  for (const file of envFileOrder) {
    const fullPath = path.join(root, file)
    if (!existsSync(fullPath)) continue

    const parsed = parseEnvFile(await readFile(fullPath, 'utf8'))
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined) {
        process.env[key] = value
      }
    }
  }
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function toIsoDateOrToday(value) {
  if (!value) return todayIsoDate()
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return todayIsoDate()
  }
  return parsed.toISOString().slice(0, 10)
}

function normalizeWhitespace(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function stripHtmlTags(value) {
  return normalizeWhitespace(String(value ?? '').replace(/<[^>]*>/g, ' '))
}

function decodeHtmlEntities(value) {
  const named = {
    amp: '&',
    lt: '<',
    gt: '>',
    quot: '"',
    apos: "'",
    nbsp: ' '
  }

  return String(value ?? '')
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x([a-fA-F0-9]+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&([a-zA-Z]+);/g, (full, name) => named[name] ?? full)
}

function sanitizeText(value) {
  return normalizeWhitespace(decodeHtmlEntities(stripHtmlTags(value)))
}

function parseNumber(value) {
  if (value === null || value === undefined) return null
  const normalized = String(value).replace(/,/g, '').trim()
  if (!normalized || normalized.toUpperCase() === 'NA' || normalized.toUpperCase() === 'N/A') {
    return null
  }
  const parsed = Number.parseFloat(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeSkillKey(name) {
  return normalizeWhitespace(name).toLowerCase()
}

function hashKey(parts) {
  return createHash('sha1').update(parts.join('||')).digest('hex')
}

function mergeJsonCodes(baseCodes, nextCodes) {
  const merged = { ...(baseCodes ?? {}) }
  for (const [key, value] of Object.entries(nextCodes ?? {})) {
    if (value === null || value === undefined || value === '') continue
    const current = merged[key]
    if (Array.isArray(current) || Array.isArray(value)) {
      const mergedArray = new Set([
        ...(Array.isArray(current) ? current : current ? [current] : []),
        ...(Array.isArray(value) ? value : [value])
      ])
      merged[key] = [...mergedArray]
      continue
    }
    merged[key] = value
  }
  return merged
}

function choosePreferredText(current, next) {
  const currentValue = normalizeWhitespace(current)
  const nextValue = normalizeWhitespace(next)
  if (!currentValue) return nextValue
  if (!nextValue) return currentValue
  return nextValue.length > currentValue.length ? nextValue : currentValue
}

function roundWeight(value) {
  const clamped = Math.max(0, Math.min(1, value))
  return Math.round(clamped * 10000) / 10000
}

function createStore() {
  return {
    occupations: new Map(),
    skills: new Map(),
    occupationSkills: new Map(),
    occupationRequirements: new Map(),
    occupationWages: new Map(),
    tradeRequirements: new Map(),
    datasetSources: new Map(),
    warnings: []
  }
}

function registerDatasetSource(store, source) {
  const existing = store.datasetSources.get(source.id)
  if (!existing) {
    store.datasetSources.set(source.id, source)
    return
  }

  store.datasetSources.set(source.id, {
    ...existing,
    ...source,
    notes: choosePreferredText(existing.notes, source.notes),
    last_synced_at: source.last_synced_at ?? existing.last_synced_at
  })
}

function ensureOccupation(store, key, occupation) {
  const existing = store.occupations.get(key)
  if (!existing) {
    store.occupations.set(key, {
      key,
      ...occupation,
      title: sanitizeText(occupation.title),
      description: sanitizeText(occupation.description),
      codes: occupation.codes ?? {}
    })
    return
  }

  store.occupations.set(key, {
    ...existing,
    title: choosePreferredText(existing.title, occupation.title),
    description: choosePreferredText(existing.description, occupation.description),
    codes: mergeJsonCodes(existing.codes, occupation.codes),
    source: choosePreferredText(existing.source, occupation.source),
    source_url: choosePreferredText(existing.source_url, occupation.source_url),
    last_updated: occupation.last_updated ?? existing.last_updated
  })
}

function ensureSkill(store, name, aliases = []) {
  const key = normalizeSkillKey(name)
  if (!key) return null

  const aliasSet = new Set(
    [name, ...aliases]
      .map((value) => normalizeWhitespace(value))
      .filter(Boolean)
  )
  const existing = store.skills.get(key)
  if (!existing) {
    store.skills.set(key, {
      key,
      name: normalizeWhitespace(name),
      aliases: [...aliasSet]
    })
    return key
  }

  const mergedAliases = new Set([...existing.aliases, ...aliasSet])
  store.skills.set(key, {
    ...existing,
    name: choosePreferredText(existing.name, name),
    aliases: [...mergedAliases]
  })
  return key
}

function addOccupationSkill(store, record) {
  if (!record.occupationKey || !record.skillKey) return
  const uniqueKey = `${record.occupationKey}|${record.skillKey}`
  const existing = store.occupationSkills.get(uniqueKey)

  if (!existing) {
    store.occupationSkills.set(uniqueKey, {
      ...record,
      weight: roundWeight(record.weight ?? 0)
    })
    return
  }

  store.occupationSkills.set(uniqueKey, {
    ...existing,
    weight: Math.max(existing.weight, roundWeight(record.weight ?? 0)),
    source: choosePreferredText(existing.source, record.source),
    source_url: choosePreferredText(existing.source_url, record.source_url),
    last_updated: record.last_updated ?? existing.last_updated
  })
}

function addOccupationRequirement(store, record) {
  if (!record.occupationKey) return
  const uniqueKey = hashKey([
    record.occupationKey,
    normalizeWhitespace(record.source),
    normalizeWhitespace(record.education),
    JSON.stringify(record.certs_licenses ?? []),
    normalizeWhitespace(record.notes)
  ])

  store.occupationRequirements.set(uniqueKey, {
    ...record,
    certs_licenses: Array.isArray(record.certs_licenses) ? record.certs_licenses : []
  })
}

function addOccupationWage(store, record) {
  if (!record.occupationKey) return
  const uniqueKey = [
    record.occupationKey,
    record.region,
    record.source,
    record.last_updated
  ].join('|')
  store.occupationWages.set(uniqueKey, record)
}

function addTradeRequirement(store, record) {
  const key = `${record.province}|${record.trade_code}`
  const existing = store.tradeRequirements.get(key)
  if (!existing) {
    store.tradeRequirements.set(key, record)
    return
  }

  const linkByUrl = new Map()
  for (const link of [...(existing.official_links ?? []), ...(record.official_links ?? [])]) {
    if (!link?.url) continue
    linkByUrl.set(link.url, {
      label: choosePreferredText(linkByUrl.get(link.url)?.label, link.label),
      url: link.url
    })
  }

  const mergedLevels = new Set([...(existing.levels ?? []), ...(record.levels ?? [])])
  store.tradeRequirements.set(key, {
    ...existing,
    hours: existing.hours ?? record.hours,
    exam_required: existing.exam_required || record.exam_required,
    notes: choosePreferredText(existing.notes, record.notes),
    levels: [...mergedLevels],
    official_links: [...linkByUrl.values()],
    source_url: choosePreferredText(existing.source_url, record.source_url),
    last_updated: record.last_updated ?? existing.last_updated
  })
}

function parseDelimited(text, delimiter = ',') {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  const source = text.replace(/^\uFEFF/, '')
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]

    if (char === '"') {
      const next = source[index + 1]
      if (inQuotes && next === '"') {
        field += '"'
        index += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }

    if (char === delimiter && !inQuotes) {
      row.push(field)
      field = ''
      continue
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && source[index + 1] === '\n') {
        index += 1
      }
      row.push(field)
      field = ''
      if (row.some((value) => value !== '')) {
        rows.push(row)
      }
      row = []
      continue
    }

    field += char
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  if (rows.length === 0) return []

  const header = rows[0].map((value) => normalizeWhitespace(value))
  return rows.slice(1).map((values) => {
    const record = {}
    for (let index = 0; index < header.length; index += 1) {
      record[header[index]] = values[index] ?? ''
    }
    return record
  })
}

async function readJsonFile(filePath) {
  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'careerheap-data-ingestor/1.0'
    }
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch JSON ${url}: HTTP ${response.status}`)
  }
  return response.json()
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'careerheap-data-ingestor/1.0'
    }
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}`)
  }
  return response.text()
}

async function downloadFile(url, destinationPath, forceDownload = false) {
  if (!forceDownload && existsSync(destinationPath)) {
    return
  }

  await mkdir(path.dirname(destinationPath), { recursive: true })
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'careerheap-data-ingestor/1.0'
    }
  })

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: HTTP ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  await writeFile(destinationPath, Buffer.from(arrayBuffer))
}

async function runCommand(command, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      stdio: 'inherit',
      shell: false
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve(undefined)
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
    })
  })
}

async function extractZip(zipPath, destinationDir, forceDownload = false) {
  await mkdir(destinationDir, { recursive: true })
  const entries = await readdir(destinationDir)
  if (!forceDownload && entries.length > 0) {
    return
  }

  if (process.platform === 'win32') {
    await runCommand('powershell', [
      '-NoProfile',
      '-Command',
      `Expand-Archive -Path '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destinationDir.replace(/'/g, "''")}' -Force`
    ])
    return
  }

  await runCommand('unzip', ['-o', zipPath, '-d', destinationDir])
}

async function findDirectoryContainingFile(rootDir, fileName) {
  const stack = [rootDir]
  while (stack.length > 0) {
    const current = stack.pop()
    const entries = await readdir(current, { withFileTypes: true })
    const hasFile = entries.some((entry) => entry.isFile() && entry.name === fileName)
    if (hasFile) return current
    for (const entry of entries) {
      if (entry.isDirectory()) {
        stack.push(path.join(current, entry.name))
      }
    }
  }
  return null
}

function occupationKeyForOnet(code) {
  return `US|onet_soc:${code}`
}

function occupationKeyForNoc(nocCode) {
  return `CA|noc_2021:${nocCode}`
}

function normalizeOasisProfileCode(rawCode) {
  const normalized = normalizeWhitespace(rawCode).replace(',', '.')
  const match = normalized.match(/^(\d{5})\.(\d{2})$/)
  if (!match) return null
  return {
    profileCode: `${match[1]}.${match[2]}`,
    nocCode: match[1]
  }
}

function pickLatestOnetTextZipUrl(html) {
  const matches = [...html.matchAll(/https:\/\/www\.onetcenter\.org\/dl_files\/database\/db_(\d+)_(\d+)_text\.zip/g)]
  if (matches.length === 0) return null

  const parsed = matches.map((match) => ({
    url: match[0],
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10)
  }))

  parsed.sort((a, b) => {
    if (a.major !== b.major) return b.major - a.major
    return b.minor - a.minor
  })

  return parsed[0]
}

function pickOpenCanadaResource(resources, patterns) {
  const normalizedPatterns = patterns.map((pattern) => pattern.toLowerCase())
  const scored = resources
    .map((resource) => {
      const name = String(resource.name ?? '').toLowerCase()
      const url = String(resource.url ?? '').toLowerCase()
      const format = String(resource.format ?? '').toLowerCase()
      const score = normalizedPatterns.reduce((acc, pattern) => {
        let points = acc
        if (name.includes(pattern)) points += 2
        if (url.includes(pattern)) points += 3
        return points
      }, 0)
      const englishPenalty = url.includes('-fr') || url.includes('_sipec_') ? -100 : 0
      const csvBonus = format.includes('csv') ? 1 : 0
      return { resource, score: score + englishPenalty + csvBonus }
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)

  return scored[0]?.resource ?? null
}

function findColumnName(headers, patterns) {
  const lowered = headers.map((header) => header.toLowerCase())
  const patternList = patterns.map((pattern) => pattern.toLowerCase())
  for (const pattern of patternList) {
    const index = lowered.findIndex((header) => header.includes(pattern))
    if (index !== -1) {
      return headers[index]
    }
  }
  return null
}

async function ingestOnet(store, config, options) {
  const sourceName = config.onet.sourceName
  const onetHtml = await fetchText(config.onet.indexUrl)
  const latestZip = pickLatestOnetTextZipUrl(onetHtml)
  if (!latestZip) {
    throw new Error('Unable to locate O*NET text database zip URL.')
  }

  const versionLabel = `${latestZip.major}.${latestZip.minor}`
  const sourceId = `${config.onet.sourceIdPrefix}_${latestZip.major}_${latestZip.minor}`
  registerDatasetSource(store, {
    id: sourceId,
    name: sourceName,
    region: 'US',
    source_url: latestZip.url,
    version_label: versionLabel,
    last_synced_at: todayIsoDate(),
    notes: 'Ingested from O*NET text database distribution.'
  })

  const onetCacheDir = path.join(options.cacheDir, 'onet')
  const zipPath = path.join(onetCacheDir, path.basename(latestZip.url))
  const extractDir = path.join(onetCacheDir, `db_${latestZip.major}_${latestZip.minor}_text_extract`)
  await downloadFile(latestZip.url, zipPath, options.forceDownload)
  await extractZip(zipPath, extractDir, options.forceDownload)

  const dataDir = await findDirectoryContainingFile(extractDir, 'Occupation Data.txt')
  if (!dataDir) {
    throw new Error('Unable to find O*NET extracted data directory containing Occupation Data.txt')
  }

  const occupationRows = parseDelimited(
    await readFile(path.join(dataDir, 'Occupation Data.txt'), 'utf8'),
    '\t'
  )

  const codes = occupationRows.map((row) => row['O*NET-SOC Code']).filter(Boolean)
  const allowedCodes = options.limit ? new Set(codes.slice(0, options.limit)) : null

  for (const row of occupationRows) {
    const onetCode = row['O*NET-SOC Code']
    if (!onetCode) continue
    if (allowedCodes && !allowedCodes.has(onetCode)) continue
    const title = row['Title']
    const description = row['Description']
    ensureOccupation(store, occupationKeyForOnet(onetCode), {
      region: 'US',
      title,
      description,
      codes: { onet_soc: onetCode },
      source: `${sourceName} ${versionLabel}`,
      source_url: latestZip.url,
      last_updated: todayIsoDate()
    })
  }

  const onetSkillFiles = ['Skills.txt', 'Knowledge.txt']
  for (const fileName of onetSkillFiles) {
    const rows = parseDelimited(await readFile(path.join(dataDir, fileName), 'utf8'), '\t')
    for (const row of rows) {
      const onetCode = row['O*NET-SOC Code']
      if (!onetCode) continue
      if (allowedCodes && !allowedCodes.has(onetCode)) continue
      if (row['Scale ID'] !== 'IM') continue
      const value = parseNumber(row['Data Value'])
      if (value === null) continue
      const skillName = sanitizeText(row['Element Name'])
      if (!skillName) continue

      const skillKey = ensureSkill(store, skillName, [row['Element ID']])
      addOccupationSkill(store, {
        occupationKey: occupationKeyForOnet(onetCode),
        skillKey,
        weight: value / 5,
        source: `${sourceName} ${versionLabel}`,
        source_url: latestZip.url,
        last_updated: todayIsoDate()
      })
    }
  }

  const taskRows = parseDelimited(await readFile(path.join(dataDir, 'Task Statements.txt'), 'utf8'), '\t')
  const topTasksByCode = new Map()
  for (const row of taskRows) {
    const onetCode = row['O*NET-SOC Code']
    if (!onetCode) continue
    if (allowedCodes && !allowedCodes.has(onetCode)) continue
    const bucket = topTasksByCode.get(onetCode) ?? []
    if (bucket.length >= 6) continue
    const taskText = sanitizeText(row['Task'])
    if (!taskText) continue
    bucket.push(taskText)
    topTasksByCode.set(onetCode, bucket)
  }

  const categoryRows = parseDelimited(
    await readFile(path.join(dataDir, 'Education, Training, and Experience Categories.txt'), 'utf8'),
    '\t'
  )
  const educationCategoryMap = new Map()
  for (const row of categoryRows) {
    if (row['Element ID'] !== '2.D.1' || row['Scale ID'] !== 'RL') continue
    educationCategoryMap.set(row['Category'], sanitizeText(row['Category Description']))
  }

  const educationRows = parseDelimited(
    await readFile(path.join(dataDir, 'Education, Training, and Experience.txt'), 'utf8'),
    '\t'
  )
  const topEducationByCode = new Map()
  for (const row of educationRows) {
    const onetCode = row['O*NET-SOC Code']
    if (!onetCode) continue
    if (allowedCodes && !allowedCodes.has(onetCode)) continue
    if (row['Element ID'] !== '2.D.1' || row['Scale ID'] !== 'RL') continue
    const value = parseNumber(row['Data Value'])
    if (value === null) continue
    const existing = topEducationByCode.get(onetCode)
    if (!existing || value > existing.value) {
      topEducationByCode.set(onetCode, {
        category: row['Category'],
        value
      })
    }
  }

  for (const onetCode of allowedCodes ?? codes) {
    const topEducation = topEducationByCode.get(onetCode)
    const educationLabel = topEducation
      ? `${educationCategoryMap.get(topEducation.category) ?? 'Unknown education level'} (${topEducation.value.toFixed(1)}%)`
      : null
    const tasks = topTasksByCode.get(onetCode) ?? []
    const notes = tasks.length > 0 ? `Top tasks: ${tasks.join('; ')}` : null

    if (!educationLabel && !notes) continue
    addOccupationRequirement(store, {
      occupationKey: occupationKeyForOnet(onetCode),
      education: educationLabel,
      certs_licenses: [],
      notes,
      source: `${sourceName} ${versionLabel}`,
      source_url: latestZip.url,
      last_updated: todayIsoDate()
    })
  }
}

async function getOpenCanadaPackage(config, packageId) {
  const url = `${config.openCanada.apiBase}/package_show?id=${packageId}`
  const payload = await fetchJson(url)
  if (!payload?.success || !payload?.result) {
    throw new Error(`Open Canada package lookup failed for ${packageId}`)
  }
  return payload.result
}

async function ingestOasis(store, config, options) {
  const oasisPackage = await getOpenCanadaPackage(config, config.oasis.packageId)

  const skillsResource = pickOpenCanadaResource(
    oasisPackage.resources,
    config.oasis.resourceMatchers.skills
  )
  const leadResource = pickOpenCanadaResource(
    oasisPackage.resources,
    config.oasis.resourceMatchers.leadStatements
  )
  const requirementsResource = pickOpenCanadaResource(
    oasisPackage.resources,
    config.oasis.resourceMatchers.employmentRequirements
  )
  const dutiesResource = pickOpenCanadaResource(
    oasisPackage.resources,
    config.oasis.resourceMatchers.mainDuties
  )
  const titlesResource = pickOpenCanadaResource(
    oasisPackage.resources,
    config.oasis.resourceMatchers.exampleTitles
  )

  if (!skillsResource || !leadResource || !requirementsResource || !dutiesResource) {
    throw new Error('Unable to resolve all required OaSIS resources from Open Canada package.')
  }

  const versionMatch = `${oasisPackage.title}`.match(/(20\d{2})\s+Version\s+([0-9.]+)/i)
  const yearLabel = versionMatch?.[1] ?? 'latest'
  const versionLabel = versionMatch ? `${versionMatch[1]} v${versionMatch[2]}` : 'latest'
  registerDatasetSource(store, {
    id: `ca_oasis_${String(yearLabel).replace(/\D/g, '')}`,
    name: config.oasis.sourceName,
    region: 'CA',
    source_url: `https://open.canada.ca/data/en/dataset/${config.oasis.packageId}`,
    version_label: versionLabel,
    last_synced_at: todayIsoDate(),
    notes: `Resolved resources from package ${config.oasis.packageId}.`
  })

  const oasisDir = path.join(options.cacheDir, 'oasis')
  await mkdir(oasisDir, { recursive: true })

  const skillsPath = path.join(oasisDir, path.basename(new URL(skillsResource.url).pathname))
  const leadPath = path.join(oasisDir, path.basename(new URL(leadResource.url).pathname))
  const reqPath = path.join(oasisDir, path.basename(new URL(requirementsResource.url).pathname))
  const dutiesPath = path.join(oasisDir, path.basename(new URL(dutiesResource.url).pathname))
  const titlesPath = titlesResource
    ? path.join(oasisDir, path.basename(new URL(titlesResource.url).pathname))
    : null

  await downloadFile(skillsResource.url, skillsPath, options.forceDownload)
  await downloadFile(leadResource.url, leadPath, options.forceDownload)
  await downloadFile(requirementsResource.url, reqPath, options.forceDownload)
  await downloadFile(dutiesResource.url, dutiesPath, options.forceDownload)
  if (titlesResource && titlesPath) {
    await downloadFile(titlesResource.url, titlesPath, options.forceDownload)
  }

  const skillsRows = parseDelimited(await readFile(skillsPath, 'utf8'), ';')
  const leadRows = parseDelimited(await readFile(leadPath, 'utf8'), ',')
  const requirementRows = parseDelimited(await readFile(reqPath, 'utf8'), ',')
  const dutiesRows = parseDelimited(await readFile(dutiesPath, 'utf8'), ',')
  const titleRows = titlesPath && existsSync(titlesPath)
    ? parseDelimited(await readFile(titlesPath, 'utf8'), ',')
    : []

  const profileMeta = new Map()
  const profileSkillMap = new Map()
  const leadByProfile = new Map()
  const requirementsByProfile = new Map()
  const dutiesByProfile = new Map()
  const aliasesByProfile = new Map()

  for (const row of skillsRows) {
    const rawCode = row['OaSIS 2021 Codes']
    const parsedCode = normalizeOasisProfileCode(rawCode)
    if (!parsedCode) continue

    const label = sanitizeText(row['OaSIS 2021 Labels'])
    profileMeta.set(parsedCode.profileCode, {
      nocCode: parsedCode.nocCode,
      profileCode: parsedCode.profileCode,
      label
    })

    const rowSkillMap = profileSkillMap.get(parsedCode.profileCode) ?? new Map()
    for (const [column, rawValue] of Object.entries(row)) {
      if (column === 'OaSIS 2021 Codes' || column === 'OaSIS 2021 Labels') continue
      const numeric = parseNumber(rawValue)
      if (numeric === null || numeric <= 0) continue
      const skillName = sanitizeText(column)
      if (!skillName) continue
      rowSkillMap.set(skillName, Math.max(rowSkillMap.get(skillName) ?? 0, numeric))
    }
    profileSkillMap.set(parsedCode.profileCode, rowSkillMap)
  }

  for (const row of leadRows) {
    const parsedCode = normalizeOasisProfileCode(row['OaSIS profile code'])
    if (!parsedCode) continue
    const statement = sanitizeText(row['Lead statement'])
    if (!statement) continue
    const bucket = leadByProfile.get(parsedCode.profileCode) ?? []
    bucket.push(statement)
    leadByProfile.set(parsedCode.profileCode, bucket)
  }

  for (const row of requirementRows) {
    const parsedCode = normalizeOasisProfileCode(row['OaSIS profile code'])
    if (!parsedCode) continue
    const requirement = sanitizeText(row['Employment requirement'])
    if (!requirement) continue
    const bucket = requirementsByProfile.get(parsedCode.profileCode) ?? []
    bucket.push(requirement)
    requirementsByProfile.set(parsedCode.profileCode, bucket)
  }

  for (const row of dutiesRows) {
    const parsedCode = normalizeOasisProfileCode(row['OaSIS profile code'])
    if (!parsedCode) continue
    const duty = sanitizeText(row['Main duties'])
    if (!duty) continue
    const bucket = dutiesByProfile.get(parsedCode.profileCode) ?? []
    bucket.push(duty)
    dutiesByProfile.set(parsedCode.profileCode, bucket)
  }

  for (const row of titleRows) {
    const parsedCode = normalizeOasisProfileCode(row['OaSIS profile code'])
    if (!parsedCode) continue
    const title = sanitizeText(row['Job title text'])
    if (!title) continue
    const bucket = aliasesByProfile.get(parsedCode.profileCode) ?? new Set()
    bucket.add(title)
    aliasesByProfile.set(parsedCode.profileCode, bucket)
  }

  const occupationsByNoc = new Map()
  for (const [profileCode, meta] of profileMeta.entries()) {
    const aggregate = occupationsByNoc.get(meta.nocCode) ?? {
      nocCode: meta.nocCode,
      profiles: new Set(),
      profileTitles: new Map(),
      leads: [],
      requirements: [],
      duties: [],
      aliases: new Set(),
      skills: new Map()
    }

    aggregate.profiles.add(profileCode)
    aggregate.profileTitles.set(profileCode, meta.label)
    for (const lead of leadByProfile.get(profileCode) ?? []) aggregate.leads.push(lead)
    for (const req of requirementsByProfile.get(profileCode) ?? []) aggregate.requirements.push(req)
    for (const duty of dutiesByProfile.get(profileCode) ?? []) aggregate.duties.push(duty)
    for (const alias of aliasesByProfile.get(profileCode) ?? []) aggregate.aliases.add(alias)

    const profileSkills = profileSkillMap.get(profileCode) ?? new Map()
    for (const [skillName, score] of profileSkills.entries()) {
      const skillAggregate = aggregate.skills.get(skillName) ?? { sum: 0, count: 0, max: 0 }
      skillAggregate.sum += score
      skillAggregate.count += 1
      skillAggregate.max = Math.max(skillAggregate.max, score)
      aggregate.skills.set(skillName, skillAggregate)
    }

    occupationsByNoc.set(meta.nocCode, aggregate)
  }

  const selectedNocCodes = [...occupationsByNoc.keys()].sort()
  const limitedNocCodes = options.limit ? selectedNocCodes.slice(0, options.limit) : selectedNocCodes
  const certRegex = /\b(certificate|certification|licen[sc]e|designation|red seal|exam)\b/i
  const educationRegex = /\b(degree|diploma|education|apprenticeship|training|school)\b/i

  for (const nocCode of limitedNocCodes) {
    const aggregate = occupationsByNoc.get(nocCode)
    if (!aggregate) continue

    const profileZeroTitle = aggregate.profileTitles.get(`${nocCode}.00`)
    const fallbackTitle = [...aggregate.profileTitles.values()][0]
    const occupationTitle = profileZeroTitle || fallbackTitle || `NOC ${nocCode}`
    const description = aggregate.leads[0] ?? null
    const occupationKey = occupationKeyForNoc(nocCode)

    ensureOccupation(store, occupationKey, {
      region: 'CA',
      title: occupationTitle,
      description,
      codes: {
        noc_2021: nocCode,
        oasis_profiles: [...aggregate.profiles].sort(),
        aliases: [...aggregate.aliases]
      },
      source: `${config.oasis.sourceName} ${versionLabel}`,
      source_url: `https://open.canada.ca/data/en/dataset/${config.oasis.packageId}`,
      last_updated: todayIsoDate()
    })

    for (const [skillName, stat] of aggregate.skills.entries()) {
      const skillKey = ensureSkill(store, skillName)
      const average = stat.count > 0 ? stat.sum / stat.count : stat.max
      addOccupationSkill(store, {
        occupationKey,
        skillKey,
        weight: average / 5,
        source: `${config.oasis.sourceName} ${versionLabel}`,
        source_url: skillsResource.url,
        last_updated: todayIsoDate()
      })
    }

    const requirements = [...new Set(aggregate.requirements)].slice(0, 24)
    const duties = [...new Set(aggregate.duties)].slice(0, 12)
    const educationLine = requirements.find((line) => educationRegex.test(line)) ?? null
    const certs = requirements.filter((line) => certRegex.test(line))
    const notesParts = []
    if (duties.length > 0) {
      notesParts.push(`Main duties: ${duties.join('; ')}`)
    }
    if (requirements.length > 0) {
      notesParts.push(`Employment requirements: ${requirements.join('; ')}`)
    }

    addOccupationRequirement(store, {
      occupationKey,
      education: educationLine,
      certs_licenses: certs,
      notes: notesParts.join('\n'),
      source: `${config.oasis.sourceName} ${versionLabel}`,
      source_url: requirementsResource.url,
      last_updated: todayIsoDate()
    })
  }
}

function pickLatestWageResource(resources) {
  const parsed = resources
    .map((resource) => {
      const fromName = String(resource.name ?? '').match(/(20\d{2})\s+Wages/i)
      const fromUrl = String(resource.url ?? '').match(/wage(20\d{2})/i)
      const year = Number.parseInt(fromName?.[1] ?? fromUrl?.[1] ?? '0', 10)
      return { resource, year }
    })
    .filter((entry) => Number.isFinite(entry.year) && entry.year > 0)
    .sort((a, b) => b.year - a.year)

  return parsed[0] ?? null
}

function buildCanadaRegionKey(row) {
  const province = normalizeWhitespace(row.prov || row.PROV || row.Province || 'NAT')
  const regionCode = normalizeWhitespace(row.ER_Code_Code_RE || row.ER_Code || '')
  if (province === 'NAT' || regionCode === 'ER00') {
    return 'CA-NAT'
  }
  if (regionCode) return `CA-${province}-${regionCode}`
  return `CA-${province}`
}

function hasInvalidWageOrder(wageLow, wageMedian, wageHigh) {
  if (wageLow !== null && wageMedian !== null && wageLow > wageMedian) return true
  if (wageMedian !== null && wageHigh !== null && wageMedian > wageHigh) return true
  if (wageLow !== null && wageHigh !== null && wageLow > wageHigh) return true
  return false
}

async function ingestJobBankWages(store, config, options) {
  const wagesPackage = await getOpenCanadaPackage(config, config.jobBankWages.packageId)
  const latest = pickLatestWageResource(wagesPackage.resources)
  if (!latest?.resource?.url) {
    throw new Error('Unable to find a Job Bank wages resource URL.')
  }

  const sourceYear = String(latest.year)
  registerDatasetSource(store, {
    id: `ca_jobbank_wages_${sourceYear}`,
    name: `${config.jobBankWages.sourceName} ${sourceYear}`,
    region: 'CA',
    source_url: latest.resource.url,
    version_label: sourceYear,
    last_synced_at: todayIsoDate(),
    notes: `Latest wages resource from package ${config.jobBankWages.packageId}.`
  })

  const wagesDir = path.join(options.cacheDir, 'jobbank')
  await mkdir(wagesDir, { recursive: true })
  const wagesPath = path.join(wagesDir, path.basename(new URL(latest.resource.url).pathname))
  await downloadFile(latest.resource.url, wagesPath, options.forceDownload)

  const wageRows = parseDelimited(await readFile(wagesPath, 'utf8'), ',')
  const headers = wageRows.length > 0 ? Object.keys(wageRows[0]) : []
  const nocColumn = findColumnName(headers, ['noc_cnp'])
  const titleColumn = findColumnName(headers, ['noc_title_eng'])
  const lowColumn = findColumnName(headers, ['low_wage'])
  const medianColumn = findColumnName(headers, ['median_wage'])
  const highColumn = findColumnName(headers, ['high_wage'])
  const revisionDateColumn = findColumnName(headers, ['revision_date'])

  let processed = 0
  for (const row of wageRows) {
    const nocRaw = row[nocColumn]
    const nocMatch = String(nocRaw ?? '').match(/(\d{5})/)
    if (!nocMatch) continue
    const nocCode = nocMatch[1]
    if (options.limit && processed >= options.limit * 200) {
      break
    }
    processed += 1

    const title = sanitizeText(row[titleColumn] ?? `NOC ${nocCode}`)
    const occupationKey = occupationKeyForNoc(nocCode)
    ensureOccupation(store, occupationKey, {
      region: 'CA',
      title,
      description: '',
      codes: { noc_2021: nocCode },
      source: `${config.jobBankWages.sourceName} ${sourceYear}`,
      source_url: latest.resource.url,
      last_updated: toIsoDateOrToday(row[revisionDateColumn])
    })

    const wageLow = parseNumber(row[lowColumn])
    const wageMedian = parseNumber(row[medianColumn])
    const wageHigh = parseNumber(row[highColumn])
    if (wageLow === null && wageMedian === null && wageHigh === null) continue
    if (hasInvalidWageOrder(wageLow, wageMedian, wageHigh)) {
      const regionKey = buildCanadaRegionKey(row)
      store.warnings.push(
        `Skipped invalid wage row from ${config.jobBankWages.sourceName} ${sourceYear} for NOC ${nocCode} (${regionKey}); values low=${wageLow}, median=${wageMedian}, high=${wageHigh}.`
      )
      continue
    }

    addOccupationWage(store, {
      occupationKey,
      region: buildCanadaRegionKey(row),
      wage_low: wageLow,
      wage_median: wageMedian,
      wage_high: wageHigh,
      currency: 'CAD',
      source: `${config.jobBankWages.sourceName} ${sourceYear}`,
      source_url: latest.resource.url,
      last_updated: toIsoDateOrToday(row[revisionDateColumn])
    })
  }
}

function parseStoTotalPages(firstPageHtml) {
  const matches = [...firstPageHtml.matchAll(/trades-information\/page\/(\d+)\//g)]
  const highest = matches.reduce((max, match) => {
    const value = Number.parseInt(match[1], 10)
    return Number.isFinite(value) ? Math.max(max, value) : max
  }, 1)
  return Math.max(1, highest)
}

function parseStoListingRows(html) {
  const pattern =
    /<td data-heading="Trade Name">(?<name>[\s\S]*?)<p><\/p><\/td>\s*<td data-heading="Code">(?<code>[\s\S]*?)<\/td>\s*<td data-heading="Classification">(?<classification>[\s\S]*?)<\/td>\s*<td data-heading="Exam Required">(?<exam>[\s\S]*?)<\/td>\s*<td data-heading="Red Seal">(?<redSeal>[\s\S]*?)<\/td>\s*<td data-heading="Training"><a href="(?<link>https:\/\/www\.skilledtradesontario\.ca\/trade-information\/[^"]+)"/g

  const results = []
  for (const match of html.matchAll(pattern)) {
    results.push({
      name: sanitizeText(match.groups?.name ?? ''),
      code: sanitizeText(match.groups?.code ?? ''),
      classification: sanitizeText(match.groups?.classification ?? ''),
      exam_required: /^yes$/i.test(sanitizeText(match.groups?.exam ?? '')),
      red_seal: /red[_\-\s]*seal|Red Seal/i.test(match.groups?.redSeal ?? ''),
      detail_url: sanitizeText(match.groups?.link ?? '')
    })
  }
  return results
}

function parseStoDetail(detailHtml, listingRecord, sharedLinks) {
  const titleMatch = detailHtml.match(/<h3>([\s\S]*?)<\/h3>/i)
  const title = sanitizeText(titleMatch?.[1] ?? listingRecord.name)

  const summaryMatch = detailHtml.match(/<h3>[\s\S]*?<\/h3>\s*<p>([\s\S]*?)<\/p>/i)
  const summary = sanitizeText(summaryMatch?.[1] ?? '')

  const modifiedMatch = detailHtml.match(/article:modified_time" content="([^"]+)"/i)
  const lastUpdated = toIsoDateOrToday(modifiedMatch?.[1])

  let hours = null
  const hoursPatternMatches = [
    detailHtml.match(/set the hours of apprenticeship training[^.]*?at ([\d,]+)/i),
    detailHtml.match(/at ([\d,]{3,})\s*\(approximately/i)
  ]
  for (const match of hoursPatternMatches) {
    if (!match?.[1]) continue
    const parsed = Number.parseInt(match[1].replace(/,/g, ''), 10)
    if (Number.isFinite(parsed) && parsed > 0) {
      hours = parsed
      break
    }
  }

  const listItemMatches = [...detailHtml.matchAll(/<li><span>([\s\S]*?)<\/span><\/li>/g)]
  const levels = listItemMatches
    .map((match) => sanitizeText(match[1]))
    .filter((value) => /\blevel\b/i.test(value))
    .slice(0, 12)

  const anchorMatches = [...detailHtml.matchAll(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)]
  const officialLinks = []
  const seen = new Set()
  const keywordPattern =
    /\b(apprenticeship|training standard|curriculum|certificate|provisional|exam|trade report|red seal|building opportunities)\b/i

  for (const match of anchorMatches) {
    const url = sanitizeText(match[1])
    const label = sanitizeText(match[2])
    if (!url || !label) continue
    if (!/^https?:\/\//i.test(url) && !url.startsWith('/')) continue
    const absoluteUrl = url.startsWith('/')
      ? new URL(url, 'https://www.skilledtradesontario.ca').toString()
      : url
    if (!/skilledtradesontario\.ca|red-seal\.ca|ontario\.ca/i.test(absoluteUrl)) continue
    if (!keywordPattern.test(label) && !/red-seal\.ca|ontario\.ca/i.test(absoluteUrl)) continue
    if (seen.has(absoluteUrl)) continue
    seen.add(absoluteUrl)
    officialLinks.push({ label, url: absoluteUrl })
  }

  for (const shared of sharedLinks) {
    if (!shared?.url || seen.has(shared.url)) continue
    seen.add(shared.url)
    officialLinks.push({ label: shared.label, url: shared.url })
  }

  if (!seen.has(listingRecord.detail_url)) {
    officialLinks.unshift({ label: `${title} - Trade details`, url: listingRecord.detail_url })
  }

  const notesParts = [
    summary,
    `Classification: ${listingRecord.classification}.`,
    `Exam required: ${listingRecord.exam_required ? 'Yes' : 'No'}.`,
    `Red Seal: ${listingRecord.red_seal ? 'Yes' : 'No'}.`
  ]

  return {
    title,
    hours,
    levels,
    official_links: officialLinks,
    notes: notesParts.filter(Boolean).join(' '),
    last_updated: lastUpdated
  }
}

async function ingestSto(store, config, options, sharedLinks) {
  registerDatasetSource(store, {
    id: 'on_skilled_trades_ontario',
    name: config.skilledTradesOntario.sourceName,
    region: 'CA',
    source_url: config.skilledTradesOntario.listingUrl,
    version_label: 'live',
    last_synced_at: todayIsoDate(),
    notes: 'Scraped from public STO trade information listing and detail pages.'
  })

  const firstPage = await fetchText(config.skilledTradesOntario.listingUrl)
  const totalPages = parseStoTotalPages(firstPage)
  const listing = []
  const seenCodes = new Set()
  for (let page = 1; page <= totalPages; page += 1) {
    const pageUrl =
      page === 1
        ? config.skilledTradesOntario.listingUrl
        : `${config.skilledTradesOntario.listingUrl.replace(/\/$/, '')}/page/${page}/`
    const html = page === 1 ? firstPage : await fetchText(pageUrl)
    for (const trade of parseStoListingRows(html)) {
      if (!trade.code || seenCodes.has(trade.code)) continue
      seenCodes.add(trade.code)
      listing.push(trade)
    }
  }

  const limitedListing = options.limit ? listing.slice(0, options.limit) : listing
  for (const trade of limitedListing) {
    const detailHtml = await fetchText(trade.detail_url)
    const detail = parseStoDetail(detailHtml, trade, sharedLinks)
    addTradeRequirement(store, {
      trade_code: trade.code,
      province: config.skilledTradesOntario.province,
      occupation_id: null,
      hours: detail.hours,
      levels: detail.levels,
      exam_required: trade.exam_required,
      official_links: detail.official_links,
      notes: detail.notes,
      source: config.skilledTradesOntario.sourceName,
      source_url: trade.detail_url,
      last_updated: detail.last_updated
    })
  }
}

async function ingestNocMetadata(store, config) {
  const nocPackage = await getOpenCanadaPackage(config, config.noc.packageId)
  const versionMatch = `${nocPackage.title}`.match(/(20\d{2}).*Version\s*([0-9.]+)/i)
  const versionLabel = versionMatch ? `${versionMatch[1]} v${versionMatch[2]}` : 'latest'

  registerDatasetSource(store, {
    id: 'ca_noc_2021_v1_0',
    name: config.noc.sourceName,
    region: 'CA',
    source_url: `https://open.canada.ca/data/en/dataset/${config.noc.packageId}`,
    version_label: versionLabel,
    last_synced_at: todayIsoDate(),
    notes: 'Metadata anchor for NOC 2021 package; occupation coverage primarily from OaSIS + Job Bank joins.'
  })
}

function chunkArray(values, size) {
  const chunks = []
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size))
  }
  return chunks
}

async function fetchAllRows(supabase, table, columns) {
  const pageSize = 1000
  const rows = []
  let from = 0

  while (true) {
    const to = from + pageSize - 1
    const { data, error } = await supabase.from(table).select(columns).range(from, to)
    if (error) throw error
    if (!data || data.length === 0) break
    rows.push(...data)
    if (data.length < pageSize) break
    from += pageSize
  }

  return rows
}

function occupationKeysFromDbRecord(row) {
  const keys = []
  const codes = row.codes ?? {}
  if (row.region === 'US' && typeof codes.onet_soc === 'string') {
    keys.push(occupationKeyForOnet(codes.onet_soc))
  }
  if (row.region === 'CA' && typeof codes.noc_2021 === 'string') {
    keys.push(occupationKeyForNoc(codes.noc_2021))
  }
  if (row.region === 'CA' && Array.isArray(codes.oasis_profiles)) {
    for (const profile of codes.oasis_profiles) {
      const parsed = normalizeOasisProfileCode(profile)
      if (parsed) keys.push(occupationKeyForNoc(parsed.nocCode))
    }
  }
  return [...new Set(keys)]
}

async function upsertChunks(supabase, table, rows, onConflict = null, chunkSize = 300) {
  for (const chunk of chunkArray(rows, chunkSize)) {
    const query = supabase.from(table).upsert(chunk, onConflict ? { onConflict } : undefined)
    const { error } = await query
    if (error) throw error
  }
}

async function insertChunks(supabase, table, rows, chunkSize = 300) {
  for (const chunk of chunkArray(rows, chunkSize)) {
    const { error } = await supabase.from(table).insert(chunk)
    if (error) throw error
  }
}

function isMissingTableError(error) {
  if (!error) return false
  const message = String(error.message ?? '')
  return error.code === 'PGRST205' || /could not find the table/i.test(message)
}

function buildMissingSchemaErrorMessage(missingTables) {
  const tableList = missingTables.join(', ')
  return [
    'Career data schema is not fully available in this Supabase project.',
    `Missing table(s): ${tableList}`,
    'Apply SQL migrations in order up through `migrations/005_career_map_planner_core.sql`, then rerun ingestion.',
    'Supabase Dashboard -> SQL Editor -> New query -> paste migration SQL -> Run.'
  ].join('\n')
}

async function assertCareerSchemaReady(supabase) {
  const missingTables = []
  for (const table of REQUIRED_CAREER_SCHEMA_TABLES) {
    const { error } = await supabase.from(table).select('*').limit(1)
    if (error && isMissingTableError(error)) {
      missingTables.push(table)
      continue
    }
    if (error) {
      throw error
    }
  }

  if (missingTables.length > 0) {
    throw new Error(buildMissingSchemaErrorMessage(missingTables))
  }
}

async function writeStoreToSupabase(store) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAdminKey =
    process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !supabaseAdminKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or admin key env (SUPABASE_SECRET_KEY or SUPABASE_SERVICE_ROLE_KEY) in environment.'
    )
  }

  const supabase = createClient(supabaseUrl, supabaseAdminKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  await assertCareerSchemaReady(supabase)

  const datasetRows = [...store.datasetSources.values()]
  await upsertChunks(supabase, 'dataset_sources', datasetRows, 'id')

  const existingSkills = await fetchAllRows(supabase, 'skills', 'id,name,aliases')
  const skillIdByKey = new Map(
    existingSkills.map((skill) => [normalizeSkillKey(skill.name), skill.id])
  )

  const skillRows = []
  for (const [skillKey, skill] of store.skills.entries()) {
    const id = skillIdByKey.get(skillKey) ?? randomUUID()
    skillIdByKey.set(skillKey, id)
    skillRows.push({
      id,
      name: skill.name,
      aliases: skill.aliases
    })
  }
  await upsertChunks(supabase, 'skills', skillRows, 'id')

  const existingOccupations = await fetchAllRows(
    supabase,
    'occupations',
    'id,region,codes,title,description,source,source_url,last_updated'
  )
  const occupationIdByKey = new Map()
  for (const occupation of existingOccupations) {
    for (const key of occupationKeysFromDbRecord(occupation)) {
      if (!occupationIdByKey.has(key)) {
        occupationIdByKey.set(key, occupation.id)
      }
    }
  }

  const occupationRows = []
  for (const [occupationKey, occupation] of store.occupations.entries()) {
    const id = occupationIdByKey.get(occupationKey) ?? randomUUID()
    occupationIdByKey.set(occupationKey, id)
    occupationRows.push({
      id,
      title: occupation.title,
      region: occupation.region,
      codes: occupation.codes,
      description: occupation.description || null,
      source: occupation.source || null,
      source_url: occupation.source_url || null,
      last_updated: occupation.last_updated || todayIsoDate()
    })
  }
  await upsertChunks(supabase, 'occupations', occupationRows, 'id')

  const occupationSkillRows = []
  for (const edge of store.occupationSkills.values()) {
    const occupationId = occupationIdByKey.get(edge.occupationKey)
    const skillId = skillIdByKey.get(edge.skillKey)
    if (!occupationId || !skillId) continue
    occupationSkillRows.push({
      occupation_id: occupationId,
      skill_id: skillId,
      weight: edge.weight,
      source: edge.source || null,
      source_url: edge.source_url || null,
      last_updated: edge.last_updated || todayIsoDate()
    })
  }
  await upsertChunks(supabase, 'occupation_skills', occupationSkillRows, 'occupation_id,skill_id')

  const requirementRows = []
  for (const requirement of store.occupationRequirements.values()) {
    const occupationId = occupationIdByKey.get(requirement.occupationKey)
    if (!occupationId) continue
    requirementRows.push({
      id: randomUUID(),
      occupation_id: occupationId,
      education: requirement.education || null,
      certs_licenses: requirement.certs_licenses ?? [],
      notes: requirement.notes || null,
      source: requirement.source,
      source_url: requirement.source_url || null,
      last_updated: requirement.last_updated || todayIsoDate()
    })
  }

  const requirementSources = [...new Set(requirementRows.map((row) => row.source))]
  for (const sourceChunk of chunkArray(requirementSources, 20)) {
    if (sourceChunk.length === 0) continue
    const { error } = await supabase.from('occupation_requirements').delete().in('source', sourceChunk)
    if (error) throw error
  }
  await insertChunks(supabase, 'occupation_requirements', requirementRows)

  const wageRows = []
  for (const wage of store.occupationWages.values()) {
    const occupationId = occupationIdByKey.get(wage.occupationKey)
    if (!occupationId) continue
    wageRows.push({
      occupation_id: occupationId,
      region: wage.region,
      wage_low: wage.wage_low,
      wage_median: wage.wage_median,
      wage_high: wage.wage_high,
      currency: wage.currency,
      source: wage.source,
      source_url: wage.source_url || null,
      last_updated: wage.last_updated || todayIsoDate()
    })
  }
  await upsertChunks(
    supabase,
    'occupation_wages',
    wageRows,
    'occupation_id,region,source,last_updated'
  )

  const tradeRows = []
  for (const trade of store.tradeRequirements.values()) {
    tradeRows.push({
      trade_code: trade.trade_code,
      province: trade.province,
      occupation_id: null,
      hours: trade.hours,
      levels: trade.levels ?? [],
      exam_required: Boolean(trade.exam_required),
      official_links: trade.official_links ?? [],
      notes: trade.notes || null,
      source: trade.source,
      source_url: trade.source_url || null,
      last_updated: trade.last_updated || todayIsoDate()
    })
  }
  await upsertChunks(supabase, 'trade_requirements', tradeRows, 'trade_code,province')
}

function printSummary(store, options) {
  console.log('\nIngestion summary')
  console.log(`- mode: ${options.write ? 'write' : 'dry-run'}`)
  console.log(`- sources: ${[...options.sources].join(', ')}`)
  console.log(`- occupations staged: ${store.occupations.size}`)
  console.log(`- skills staged: ${store.skills.size}`)
  console.log(`- occupation_skills staged: ${store.occupationSkills.size}`)
  console.log(`- occupation_requirements staged: ${store.occupationRequirements.size}`)
  console.log(`- occupation_wages staged: ${store.occupationWages.size}`)
  console.log(`- trade_requirements staged: ${store.tradeRequirements.size}`)
  console.log(`- dataset_sources staged: ${store.datasetSources.size}`)
  if (store.warnings.length > 0) {
    console.log(`- warnings: ${store.warnings.length}`)
    for (const warning of store.warnings.slice(0, 12)) {
      console.log(`  - ${warning}`)
    }
  }
}

function formatIngestError(error) {
  if (!error) return 'Unknown error'
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return JSON.stringify(error, null, 2)
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    printHelp()
    return
  }

  await loadLocalEnvFiles(projectRoot)
  const config = await readJsonFile(options.sourceConfigPath)
  const stoSharedLinks = await readJsonFile(options.stoSharedLinksPath)
  const store = createStore()

  await mkdir(options.cacheDir, { recursive: true })

  if (options.sources.has('onet')) {
    console.log('[ingest] O*NET: start')
    await ingestOnet(store, config, options)
    console.log('[ingest] O*NET: done')
  }
  if (options.sources.has('oasis')) {
    console.log('[ingest] OaSIS: start')
    await ingestOasis(store, config, options)
    console.log('[ingest] OaSIS: done')
  }
  if (options.sources.has('jobbank')) {
    console.log('[ingest] Job Bank wages: start')
    await ingestJobBankWages(store, config, options)
    console.log('[ingest] Job Bank wages: done')
  }
  if (options.sources.has('sto')) {
    console.log('[ingest] Skilled Trades Ontario: start')
    await ingestSto(store, config, options, stoSharedLinks)
    console.log('[ingest] Skilled Trades Ontario: done')
  }
  if (options.sources.has('noc')) {
    console.log('[ingest] NOC metadata: start')
    await ingestNocMetadata(store, config)
    console.log('[ingest] NOC metadata: done')
  }

  printSummary(store, options)

  if (options.write) {
    console.log('[ingest] writing staged rows to Supabase...')
    await writeStoreToSupabase(store)
    console.log('[ingest] write complete')
  }
}

main().catch((error) => {
  console.error('\n[ingest] failed')
  console.error(formatIngestError(error))
  process.exit(1)
})
