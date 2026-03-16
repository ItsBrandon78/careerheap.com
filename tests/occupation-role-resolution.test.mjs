import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

function loadTranspiledTsModule(filePath) {
  const source = readFileSync(filePath, 'utf8')
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    },
    fileName: filePath
  }).outputText

  const cjsModule = { exports: {} }
  const context = vm.createContext({
    module: cjsModule,
    exports: cjsModule.exports,
    require: (specifier) => {
      if (specifier === '@/lib/supabase/admin') {
        return { createAdminClient: () => ({}) }
      }
      if (specifier === '@/lib/occupations/canonicalRoleRegistry') {
        return loadTranspiledTsModule(path.resolve(__dirname, '../lib/occupations/canonicalRoleRegistry.ts'))
      }
      throw new Error(`Unexpected require: ${specifier}`)
    }
  })
  vm.runInContext(transpiled, context)
  return cjsModule.exports
}

const occupationResolverPath = path.resolve(__dirname, '../lib/occupations/resolveOccupation.ts')
const careerDataPath = path.resolve(__dirname, '../lib/server/careerData.ts')

const INDEX = [
  {
    id: 'ca-hr',
    title: 'Human Resources Specialists',
    region: 'CA',
    source: 'noc',
    codes: { noc: '11200', aliases: ['HR Coordinator', 'Human Resources Coordinator'] }
  },
  {
    id: 'ca-hr-manager',
    title: 'Human resources managers',
    region: 'CA',
    source: 'noc',
    codes: { noc: '10011', aliases: ['HR Manager'] }
  },
  {
    id: 'ca-hr-officer',
    title: 'Human resources and recruitment officers',
    region: 'CA',
    source: 'noc',
    codes: { noc: '11200', aliases: ['Human Resources Officer'] }
  },
  {
    id: 'ca-admin-assistant',
    title: 'Administrative assistants',
    region: 'CA',
    source: 'noc',
    codes: { noc: '13110', aliases: ['Office Assistant'] }
  },
  {
    id: 'ca-personnel-clerk',
    title: 'Personnel clerks',
    region: 'CA',
    source: 'noc',
    codes: { noc: '14103', aliases: ['Human resources clerk'] }
  },
  {
    id: 'ca-nursing-coordinator',
    title: 'Nursing coordinators and supervisors',
    region: 'CA',
    source: 'noc',
    codes: { noc: '31300', aliases: ['Nursing Supervisor'] }
  },
  {
    id: 'ca-logistics-coordinator',
    title: 'Production and transportation logistics coordinators',
    region: 'CA',
    source: 'noc',
    codes: { noc: '13201', aliases: ['Logistics Coordinator'] }
  },
  {
    id: 'ca-lpn',
    title: 'Licensed Practical Nurses',
    region: 'CA',
    source: 'noc',
    codes: { noc: '32101', aliases: ['Licensed Practical Nurse', 'Practical Nurse', 'LPN'] }
  },
  {
    id: 'ca-rn',
    title: 'Registered Nurses and registered psychiatric nurses',
    region: 'CA',
    source: 'noc',
    codes: { noc: '31301', aliases: ['Registered Nurse', 'RN'] }
  },
  {
    id: 'ca-dental-hygienist',
    title: 'Dental hygienists and dental therapists',
    region: 'CA',
    source: 'noc',
    codes: { noc: '32111', aliases: ['Dental Hygienist'] }
  },
  {
    id: 'ca-pharmacy-tech',
    title: 'Pharmacy technical assistants and pharmacy assistants',
    region: 'CA',
    source: 'noc',
    codes: { noc: '33103', aliases: ['Pharmacy Technician', 'Pharmacy Tech'] }
  },
  {
    id: 'ca-accountant',
    title: 'Accountants',
    region: 'CA',
    source: 'noc',
    codes: { noc: '11100', aliases: ['Accountant'] }
  },
  {
    id: 'ca-ux-designer',
    title: 'Web designers',
    region: 'CA',
    source: 'noc',
    codes: { noc: '21233', aliases: ['UX Designer', 'UI Designer', 'Product Designer'] }
  },
  {
    id: 'ca-computer-engineers',
    title: 'Computer engineers (except software engineers and designers)',
    region: 'CA',
    source: 'noc',
    codes: { noc: '21311', aliases: ['Computer Engineer'] }
  },
  {
    id: 'ca-operations-coordinator',
    title: 'Operations coordinators',
    region: 'CA',
    source: 'internal',
    codes: { code: 'operations-coordinator', aliases: ['Operations Coordinator', 'Project Coordinator'] }
  },
  {
    id: 'ca-facility-maintenance-manager',
    title: 'Facility operation and maintenance managers',
    region: 'CA',
    source: 'noc',
    codes: { noc: '70012', aliases: ['Facility Maintenance Manager'] }
  },
  {
    id: 'ca-customer-success-manager',
    title: 'Customer success managers',
    region: 'CA',
    source: 'internal',
    codes: { code: 'customer-success-manager', aliases: ['Customer Success Manager', 'Client Success Manager'] }
  },
  {
    id: 'ca-financial-customer-supervisor',
    title: 'Customer service representatives supervisors - financial services',
    region: 'CA',
    source: 'noc',
    codes: { noc: '62010', aliases: ['Financial Services Supervisor'] }
  }
]

test('resolveOccupation preserves HR domain anchors instead of drifting into nursing coordinator roles', async () => {
  const { resolveOccupation } = loadTranspiledTsModule(occupationResolverPath)

  const resolution = await resolveOccupation('HR Coordinator', 'Ontario, Canada', {
    region: 'CA',
    providedIndex: INDEX
  })

  assert.equal(resolution.title, 'Human Resources Specialists')
  assert.equal(resolution.code, '11200')
  assert.ok(resolution.alternatives.every((item) => !/nursing coordinators/i.test(item.title)))
})

test('role search suggestions use domain anchors to keep closest matches in family', () => {
  const { resolveOccupationInputFromIndex } = loadTranspiledTsModule(careerDataPath)

  const resolution = resolveOccupationInputFromIndex({
    input: 'HR Coordinator',
    limit: 5,
    index: INDEX
  })

  assert.equal(resolution.bestMatch?.title, 'Human Resources Specialists')
  assert.ok(resolution.suggestions.some((item) => item.title === 'Human Resources Specialists'))
  assert.ok(resolution.suggestions.every((item) => !/nursing coordinators/i.test(item.title)))
})

test('partial human resources prefixes still rank HR roles first', () => {
  const { resolveOccupationInputFromIndex } = loadTranspiledTsModule(careerDataPath)

  const resolution = resolveOccupationInputFromIndex({
    input: 'human resour',
    limit: 5,
    index: INDEX
  })

  assert.ok(/human resources/i.test(resolution.suggestions[0]?.title ?? ''))
  assert.ok(resolution.suggestions.every((item) => !/administrative assistants/i.test(item.title)))
})

test('human resources intent suppresses broad non-HR titles when HR titles exist', () => {
  const { resolveOccupationInputFromIndex } = loadTranspiledTsModule(careerDataPath)

  const resolution = resolveOccupationInputFromIndex({
    input: 'human resources',
    limit: 6,
    index: INDEX
  })

  assert.ok(resolution.suggestions.length > 0)
  assert.ok(
    resolution.suggestions.every((item) => /human resources/i.test(item.title)),
    `Unexpected titles: ${resolution.suggestions.map((item) => item.title).join(', ')}`
  )
})

test('licensed practical nurse keeps the healthcare-family best match', () => {
  const { resolveOccupationInputFromIndex } = loadTranspiledTsModule(careerDataPath)

  const resolution = resolveOccupationInputFromIndex({
    input: 'Licensed Practical Nurse',
    limit: 5,
    index: INDEX
  })

  assert.equal(resolution.bestMatch?.title, 'Licensed Practical Nurses')
  assert.ok(resolution.suggestions.every((item) => !/human resources/i.test(item.title)))
})

test('registered nurse keeps the healthcare-family best match', async () => {
  const { resolveOccupation } = loadTranspiledTsModule(occupationResolverPath)

  const resolution = await resolveOccupation('Registered Nurse', 'Ontario, Canada', {
    region: 'CA',
    providedIndex: INDEX
  })

  assert.ok(/registered nurses/i.test(resolution.title))
  assert.ok(resolution.alternatives.every((item) => !/human resources|facility operation/i.test(item.title)))
})

test('dental hygienist keeps dental-family best match and avoids nursing drift', async () => {
  const { resolveOccupation } = loadTranspiledTsModule(occupationResolverPath)

  const resolution = await resolveOccupation('Dental Hygienist', 'Ontario, Canada', {
    region: 'CA',
    providedIndex: INDEX
  })

  assert.ok(/dental hygienists/i.test(resolution.title))
  assert.ok(resolution.alternatives.every((item) => !/nursing coordinators/i.test(item.title)))
})

test('pharmacy technician keeps pharmacy-family best match and avoids financial drift', async () => {
  const { resolveOccupation } = loadTranspiledTsModule(occupationResolverPath)

  const resolution = await resolveOccupation('Pharmacy Technician', 'Ontario, Canada', {
    region: 'CA',
    providedIndex: INDEX
  })

  assert.ok(/pharmacy technical assistants|pharmacy assistants/i.test(resolution.title))
  assert.ok(resolution.alternatives.every((item) => !/financial services/i.test(item.title)))
})

test('UX Designer family constraint blocks computer engineer drift', async () => {
  const { resolveOccupation } = loadTranspiledTsModule(occupationResolverPath)

  const resolution = await resolveOccupation('UX Designer', 'Ontario, Canada', {
    region: 'CA',
    providedIndex: INDEX
  })

  assert.ok(/web designers/i.test(resolution.title))
  assert.ok(resolution.alternatives.every((item) => !/computer engineers/i.test(item.title)))
})

test('Operations Coordinator family constraint blocks facility maintenance manager drift', async () => {
  const { resolveOccupation } = loadTranspiledTsModule(occupationResolverPath)

  const resolution = await resolveOccupation('Operations Coordinator', 'Ontario, Canada', {
    region: 'CA',
    providedIndex: INDEX
  })

  assert.ok(/operations coordinators/i.test(resolution.title))
  assert.ok(resolution.alternatives.every((item) => !/facility operation and maintenance managers/i.test(item.title)))
})

test('Customer Success Manager family constraint blocks financial-services supervisor drift', async () => {
  const { resolveOccupation } = loadTranspiledTsModule(occupationResolverPath)

  const resolution = await resolveOccupation('Customer Success Manager', 'Ontario, Canada', {
    region: 'CA',
    providedIndex: INDEX
  })

  assert.ok(/customer success managers/i.test(resolution.title))
  assert.ok(resolution.alternatives.every((item) => !/financial services/i.test(item.title)))
})

test('search suggestions keep UX input inside design family', () => {
  const { resolveOccupationInputFromIndex } = loadTranspiledTsModule(careerDataPath)

  const resolution = resolveOccupationInputFromIndex({
    input: 'UX Designer',
    limit: 5,
    index: INDEX
  })

  assert.ok(resolution.suggestions.length > 0)
  assert.ok(/web designers/i.test(resolution.suggestions[0].title))
  assert.ok(resolution.suggestions.every((item) => !/computer engineers/i.test(item.title)))
})

test('search suggestions keep Customer Success Manager input outside financial-services supervisor track', () => {
  const { resolveOccupationInputFromIndex } = loadTranspiledTsModule(careerDataPath)

  const resolution = resolveOccupationInputFromIndex({
    input: 'Customer Success Manager',
    limit: 5,
    index: INDEX
  })

  assert.ok(resolution.suggestions.length > 0)
  assert.ok(/customer success managers/i.test(resolution.suggestions[0].title))
  assert.ok(resolution.suggestions.every((item) => !/financial services/i.test(item.title)))
})

test('search suggestions keep Operations Coordinator input outside facility maintenance track', () => {
  const { resolveOccupationInputFromIndex } = loadTranspiledTsModule(careerDataPath)

  const resolution = resolveOccupationInputFromIndex({
    input: 'Operations Coordinator',
    limit: 5,
    index: INDEX
  })

  assert.ok(resolution.suggestions.length > 0)
  assert.ok(/operations coordinators/i.test(resolution.suggestions[0].title))
  assert.ok(resolution.suggestions.every((item) => !/facility operation and maintenance managers/i.test(item.title)))
})
