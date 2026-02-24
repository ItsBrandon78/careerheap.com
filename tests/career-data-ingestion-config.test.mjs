import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const sourceConfig = JSON.parse(
  readFileSync(path.resolve(__dirname, '../seeds/career-data/source-config.json'), 'utf8')
)
const stoSharedLinks = JSON.parse(
  readFileSync(path.resolve(__dirname, '../seeds/career-data/sto-shared-links.json'), 'utf8')
)
const ingestScript = readFileSync(
  path.resolve(__dirname, '../scripts/ingest-career-data.mjs'),
  'utf8'
)

test('career data source config includes required package IDs and source endpoints', () => {
  assert.equal(sourceConfig.oasis.packageId, '10ce43bd-fb58-4969-806b-4bffebc87bec')
  assert.equal(sourceConfig.jobBankWages.packageId, 'adad580f-76b0-4502-bd05-20c125de9116')
  assert.equal(sourceConfig.noc.packageId, '1feee3b5-8068-4dbb-b361-180875837593')
  assert.match(sourceConfig.onet.indexUrl, /onetcenter\.org\/database\.html/)
  assert.match(sourceConfig.skilledTradesOntario.listingUrl, /skilledtradesontario\.ca/)
})

test('sto shared links include official apprenticeship and certificate resources', () => {
  const urls = stoSharedLinks.map((entry) => entry.url)
  assert.ok(urls.some((url) => /finishing-an-apprenticeship/.test(url)))
  assert.ok(urls.some((url) => /provisional-certificate-of-qualification/.test(url)))
  assert.ok(urls.some((url) => /certificate-of-qualification/.test(url)))
  assert.ok(urls.some((url) => /exam-eligibility/.test(url)))
})

test('ingestion script covers required source handlers and destination tables', () => {
  assert.match(ingestScript, /ingestOnet/)
  assert.match(ingestScript, /ingestOasis/)
  assert.match(ingestScript, /ingestJobBankWages/)
  assert.match(ingestScript, /ingestSto/)
  assert.match(ingestScript, /dataset_sources/)
  assert.match(ingestScript, /occupation_skills/)
  assert.match(ingestScript, /occupation_wages/)
  assert.match(ingestScript, /trade_requirements/)
})
