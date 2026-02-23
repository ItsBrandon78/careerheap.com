import assert from 'node:assert/strict'
import test from 'node:test'
import {
  MAX_FILE_SIZE_BYTES,
  parseResumeUpload,
  ResumeParseError
} from '../lib/server/resumeParseCore.mjs'

test('DOCX extraction returns parsed text', async () => {
  const result = await parseResumeUpload({
    fileName: 'resume.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 128,
    buffer: Buffer.from('docx'),
    deps: {
      extractDocxText: async () =>
        'Experience: Managed onboarding and improved retention across customer accounts.',
      extractPdfText: async () => ''
    }
  })

  assert.equal(result.ok, true)
  assert.equal(result.source, 'docx')
  assert.match(result.text, /onboarding/i)
})

test('Text-based PDF extraction returns text without OCR', async () => {
  let ocrCalled = false
  const result = await parseResumeUpload({
    fileName: 'resume.pdf',
    mimeType: 'application/pdf',
    size: 256,
    buffer: Buffer.from('pdf'),
    deps: {
      extractDocxText: async () => '',
      extractPdfText: async () =>
        'Experience education skills '.repeat(8),
      extractPdfOcrText: async () => {
        ocrCalled = true
        return ''
      }
    }
  })

  assert.equal(result.ok, true)
  assert.equal(result.source, 'pdf')
  assert.equal(ocrCalled, false)
})

test('Scanned PDF path triggers OCR and returns OCR text', async () => {
  let ocrCalled = false
  const result = await parseResumeUpload({
    fileName: 'scanned.pdf',
    mimeType: 'application/pdf',
    size: 512,
    buffer: Buffer.from('pdf'),
    deps: {
      extractDocxText: async () => '',
      extractPdfText: async () => 'too short',
      extractPdfOcrText: async () => {
        ocrCalled = true
        return 'Experience skills education projects achievements '.repeat(4)
      }
    }
  })

  assert.equal(ocrCalled, true)
  assert.equal(result.ok, true)
  assert.equal(result.source, 'pdf-ocr')
  assert.match(result.warning, /ocr used/i)
})

test('Low-text PDF falls back gracefully when OCR fails but some text exists', async () => {
  const result = await parseResumeUpload({
    fileName: 'resume.pdf',
    mimeType: 'application/pdf',
    size: 512,
    buffer: Buffer.from('pdf'),
    deps: {
      extractDocxText: async () => '',
      extractPdfText: async () => 'Experience with SQL and customer support tickets across teams.',
      extractPdfOcrText: async () => {
        throw new Error('pdftoppm not installed')
      }
    }
  })

  assert.equal(result.ok, true)
  assert.equal(result.source, 'pdf')
  assert.match(result.warning, /ocr is unavailable or failed/i)
})

test('Oversize and unsupported files reject with clean error codes', async () => {
  await assert.rejects(
    () =>
      parseResumeUpload({
        fileName: 'resume.txt',
        mimeType: 'text/plain',
        size: 64,
        buffer: Buffer.from('text'),
        deps: {
          extractDocxText: async () => '',
          extractPdfText: async () => ''
        }
      }),
    (error) =>
      error instanceof ResumeParseError &&
      error.code === 'UNSUPPORTED_TYPE'
  )

  await assert.rejects(
    () =>
      parseResumeUpload({
        fileName: 'resume.pdf',
        mimeType: 'application/pdf',
        size: MAX_FILE_SIZE_BYTES + 1,
        buffer: Buffer.from('pdf'),
        deps: {
          extractDocxText: async () => '',
          extractPdfText: async () => ''
        }
      }),
    (error) =>
      error instanceof ResumeParseError &&
      error.code === 'FILE_TOO_LARGE'
  )
})

