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
    exports: cjsModule.exports
  })
  vm.runInContext(transpiled, context)
  return cjsModule.exports
}

const parserPath = path.resolve(__dirname, '../lib/planner/skillsPaste.ts')
const skillsInputPath = path.resolve(
  __dirname,
  '../components/career-switch-planner/CareerSwitchPlannerComponents.tsx'
)
const skillsInputSource = readFileSync(skillsInputPath, 'utf8')

test('comma-separated paste parses into deduped skills', () => {
  const parser = loadTranspiledTsModule(parserPath)
  const { buildSkillIndex, extractSkillsFromPastedText } = parser

  const skillIndex = buildSkillIndex([
    'Electrical Safety',
    'Lockout / Tagout (LOTO)',
    'Working at Heights'
  ])

  const extraction = extractSkillsFromPastedText({
    text: 'Electrical safety, lockout / tagout (loto), Working at Heights, electrical-safety',
    skillIndex
  })
  const extractedSkills = Array.from(extraction.skills)

  assert.equal(extraction.requiresReview, false)
  assert.deepEqual(extractedSkills, [
    'Electrical Safety',
    'Lockout / Tagout (LOTO)',
    'Working at Heights'
  ])
})

test('bullet and slash-separated paste splits into expected tokens', () => {
  const parser = loadTranspiledTsModule(parserPath)
  const { splitPastedText } = parser

  const tokens = Array.from(
    splitPastedText(`• Electrical Safety\n• Lockout Tagout\n• WHMIS / Working at Heights`)
  )

  assert.deepEqual(tokens, ['Electrical Safety', 'Lockout Tagout', 'WHMIS', 'Working at Heights'])
})

test('large resume-like paste requires review and caps detected skills', () => {
  const parser = loadTranspiledTsModule(parserPath)
  const { buildSkillIndex, extractSkillsFromPastedText } = parser

  const dataset = Array.from({ length: 80 }, (_, index) => `Skill ${index + 1}`)
  const skillIndex = buildSkillIndex(dataset)
  const resumeLikeBlock = `${'Professional Summary and Impact. '.repeat(20)}\n${dataset.join(', ')}`

  const extraction = extractSkillsFromPastedText({
    text: resumeLikeBlock,
    skillIndex,
    maxCandidates: 40
  })
  const extractedSkills = Array.from(extraction.skills)

  assert.equal(extraction.requiresReview, true)
  assert.equal(extractedSkills.length, 40)
  assert.deepEqual(extractedSkills.slice(0, 3), ['Skill 1', 'Skill 2', 'Skill 3'])
})

test('skills input wires paste handler and large-block detection UI copy', () => {
  assert.match(skillsInputSource, /onPaste=\{handlePaste\}/)
  assert.match(skillsInputSource, /We detected \{pendingPasteCandidates\.length\} skills from pasted text\./)
  assert.match(skillsInputSource, /Add all/)
  assert.match(skillsInputSource, /Review/)
})
