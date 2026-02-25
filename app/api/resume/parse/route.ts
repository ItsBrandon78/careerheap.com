import { spawn } from 'node:child_process'
import { access, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import mammoth from 'mammoth'
import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAuthenticatedUserFromRequest, getUsageSummaryForUser } from '@/lib/server/toolUsage'
import {
  normalizeWhitespace,
  parseResumeUpload,
  ResumeParseError
} from '@/lib/server/resumeParseCore.mjs'
import { hasDomMatrixAvailable, isBinaryAvailable } from '@/lib/server/ocrRuntime'
import { extractStructuredResumeData } from '@/lib/server/resumeStructuredExtract'

export const runtime = 'nodejs'

const OCR_MAX_PAGES = 5
const OCR_TIMEOUT_MS = 20_000
let pdfParseWorkerConfigured = false

async function getPdfParseClass() {
  const { PDFParse } = await import('pdf-parse')

  if (!pdfParseWorkerConfigured) {
    const workerCandidates = [
      path.join(process.cwd(), 'node_modules', 'pdf-parse', 'dist', 'pdf-parse', 'cjs', 'pdf.worker.mjs'),
      path.join(process.cwd(), 'node_modules', 'pdf-parse', 'dist', 'pdf-parse', 'esm', 'pdf.worker.mjs'),
      path.join(process.cwd(), 'node_modules', 'pdf-parse', 'dist', 'pdf-parse', 'web', 'pdf.worker.mjs')
    ]

    for (const candidate of workerCandidates) {
      try {
        await access(candidate)
        PDFParse.setWorker(pathToFileURL(candidate).href)
        pdfParseWorkerConfigured = true
        break
      } catch {
        // Try next candidate.
      }
    }
  }

  return PDFParse
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(timeoutMessage))
    }, timeoutMs)

    promise
      .then((value) => {
        clearTimeout(timeout)
        resolve(value)
      })
      .catch((error) => {
        clearTimeout(timeout)
        reject(error)
      })
  })
}

function runProcess(
  command: string,
  args: string[],
  options?: { timeoutMs?: number; cwd?: string }
) {
  return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const timeoutMs = options?.timeoutMs ?? 10_000
    const child = spawn(command, args, {
      cwd: options?.cwd,
      windowsHide: true
    })

    let stdout = ''
    let stderr = ''
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString()
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    child.on('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    })

    child.on('close', (code) => {
      clearTimeout(timeout)
      if (timedOut) {
        reject(new Error(`${command} timed out after ${timeoutMs}ms`))
        return
      }

      if ((code ?? 0) !== 0) {
        reject(new Error(`${command} failed (${code}): ${stderr || stdout}`))
        return
      }

      resolve({ stdout, stderr })
    })
  })
}

function extractPageNumber(fileName: string) {
  const match = fileName.match(/-(\d+)\.png$/i)
  return match ? Number(match[1]) : Number.POSITIVE_INFINITY
}

async function extractDocxText(fileBuffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer: fileBuffer })
  return result.value ?? ''
}

async function extractPdfText(fileBuffer: Buffer) {
  const PDFParse = await getPdfParseClass()
  const parser = new PDFParse({ data: fileBuffer })
  try {
    const result = await parser.getText({
      lineEnforce: true,
      itemJoiner: ' '
    })
    return result.text ?? ''
  } finally {
    await parser.destroy()
  }
}

async function ocrWithTesseractCli(imagePaths: string[], deadlineAt: number) {
  const chunks: string[] = []

  for (const imagePath of imagePaths) {
    const remaining = deadlineAt - Date.now()
    if (remaining <= 0) {
      throw new Error('OCR timed out after 20 seconds.')
    }

    const { stdout } = await runProcess(
      'tesseract',
      [imagePath, 'stdout', '--psm', '6'],
      { timeoutMs: remaining }
    )
    chunks.push(stdout)
  }

  return normalizeWhitespace(chunks.join('\n'))
}

async function ocrWithTesseractJs(imagePaths: string[], deadlineAt: number) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng')

  try {
    const chunks: string[] = []
    for (const imagePath of imagePaths) {
      const remaining = deadlineAt - Date.now()
      if (remaining <= 0) {
        throw new Error('OCR timed out after 20 seconds.')
      }

      const result = await withTimeout(worker.recognize(imagePath), remaining, 'OCR timed out after 20 seconds.')
      chunks.push(result.data?.text ?? '')
    }
    return normalizeWhitespace(chunks.join('\n'))
  } finally {
    await worker.terminate()
  }
}

async function renderPdfPagesToImagesWithPdfParse(fileBuffer: Buffer, tempDir: string) {
  const PDFParse = await getPdfParseClass()
  const parser = new PDFParse({ data: fileBuffer })

  try {
    const screenshotResult = await parser.getScreenshot({
      first: OCR_MAX_PAGES,
      imageBuffer: true,
      imageDataUrl: false
    })

    const pages = Array.isArray(screenshotResult?.pages) ? screenshotResult.pages : []
    const imagePaths: string[] = []

    for (const page of pages) {
      const pageNumber =
        typeof page?.pageNumber === 'number' && Number.isFinite(page.pageNumber)
          ? page.pageNumber
          : imagePaths.length + 1
      const pageData: unknown = page?.data
      if (!pageData) continue
      let bytes: Buffer
      if (Buffer.isBuffer(pageData)) {
        bytes = pageData
      } else if (pageData instanceof Uint8Array) {
        bytes = Buffer.from(pageData)
      } else if (typeof pageData === 'object' && pageData instanceof ArrayBuffer) {
        bytes = Buffer.from(pageData)
      } else {
        const numericBytes = Object.keys(pageData)
          .map((key) => Number(key))
          .filter((index) => Number.isInteger(index) && index >= 0)
          .sort((a, b) => a - b)
          .map((index) => Number((pageData as Record<number, unknown>)[index] ?? 0) & 0xff)
        bytes = Buffer.from(numericBytes)
      }
      if (bytes.length === 0) continue

      const target = path.join(tempDir, `page-${pageNumber}.png`)
      await writeFile(target, bytes)
      imagePaths.push(target)
    }

    return imagePaths
  } finally {
    await parser.destroy()
  }
}

async function extractPdfOcrText(fileBuffer: Buffer) {
  const hasPdftoppm = await isBinaryAvailable('pdftoppm', ['-v'])
  const hasDomMatrix = hasDomMatrixAvailable()

  const tempDir = await mkdtemp(path.join(os.tmpdir(), 'careerheap-resume-'))
  const pdfPath = path.join(tempDir, 'input.pdf')
  const outputPrefix = path.join(tempDir, 'page')
  const deadlineAt = Date.now() + OCR_TIMEOUT_MS

  try {
    let imageFiles: string[] = []
    if (hasPdftoppm) {
      await writeFile(pdfPath, fileBuffer)

      const convertTimeout = Math.max(1_000, deadlineAt - Date.now())
      await runProcess(
        'pdftoppm',
        ['-f', '1', '-l', String(OCR_MAX_PAGES), '-png', pdfPath, outputPrefix],
        { timeoutMs: convertTimeout }
      )

      imageFiles = (await readdir(tempDir))
        .filter((file) => /^page-\d+\.png$/i.test(file))
        .sort((a, b) => extractPageNumber(a) - extractPageNumber(b))
        .slice(0, OCR_MAX_PAGES)
        .map((file) => path.join(tempDir, file))
    } else {
      if (!hasDomMatrix) {
        throw new ResumeParseError(
          'PDF_SCANNED_OCR_FAILED',
          'Scanned PDF OCR is unavailable in this runtime. Upload DOCX or paste your experience.',
          422
        )
      }
      imageFiles = await renderPdfPagesToImagesWithPdfParse(fileBuffer, tempDir)
    }

    if (imageFiles.length === 0) {
      throw new Error(
        'Scanned PDF detected but pages could not be rendered for OCR. Install Poppler + Tesseract, or upload DOCX/paste your experience.'
      )
    }

    const hasTesseractCli = await isBinaryAvailable('tesseract', ['--version'])
    if (hasTesseractCli) {
      return await ocrWithTesseractCli(imageFiles, deadlineAt)
    }

    return await ocrWithTesseractJs(imageFiles, deadlineAt)
  } finally {
    await rm(tempDir, { recursive: true, force: true }).catch(() => null)
  }
}

function toUserMessage(error: unknown) {
  if (error instanceof ResumeParseError) {
    return error
  }

  const message = error instanceof Error ? error.message : 'Resume parsing failed.'
  const lower = message.toLowerCase()
  if (lower.includes('dommatrix')) {
    return new ResumeParseError(
      'PDF_SCANNED_OCR_FAILED',
      'Scanned PDF OCR is unavailable in this runtime. Upload DOCX or paste your experience.',
      422
    )
  }
  if (lower.includes('ocr') || lower.includes('scanned pdf') || lower.includes('tesseract')) {
    return new ResumeParseError('PDF_SCANNED_OCR_FAILED', message, 422)
  }
  return new ResumeParseError('PARSE_FAILED', message, 500)
}

function logParseMeta(data: { source: 'docx' | 'pdf' | 'pdf-ocr'; textLength: number; ocrUsed: boolean }) {
  if (process.env.NODE_ENV === 'production') return
  console.info('[resume-parse]', data)
}

export async function POST(req: Request) {
  try {
    const user = await getAuthenticatedUserFromRequest(req)
    if (!user) {
      return NextResponse.json(
        {
          ok: false,
          error: 'AUTH_REQUIRED',
          message: 'Sign in to parse a resume.'
        },
        { status: 401 }
      )
    }

    const usage = await getUsageSummaryForUser(user)
    if (usage.plan === 'free') {
      return NextResponse.json(
        {
          ok: false,
          error: 'PRO_REQUIRED',
          message: 'Resume parsing is available on Pro.'
        },
        { status: 402 }
      )
    }

    const form = await req.formData()
    const file = form.get('file')
    const regionHintRaw = form.get('regionHint')
    const regionHint =
      typeof regionHintRaw === 'string' && (regionHintRaw === 'US' || regionHintRaw === 'CA')
        ? regionHintRaw
        : undefined

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          ok: false,
          error: 'NO_FILE',
          message: 'No file uploaded. Use form key "file".'
        },
        { status: 400 }
      )
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const parsed = await parseResumeUpload({
      fileName: file.name,
      mimeType: file.type || null,
      size: file.size,
      buffer: fileBuffer,
      deps: {
        extractDocxText,
        extractPdfText,
        extractPdfOcrText,
        log: logParseMeta
      }
    })

    const structured = await extractStructuredResumeData({
      text: parsed.text,
      regionHint
    })

    const admin = createAdminClient()
    let resumeRow: { id?: string } | null = null
    try {
      const { data } = await admin
        .from('resumes')
        .insert({
          user_id: user.id,
          raw_text: parsed.text,
          parsed_data: structured
        })
        .select('id')
        .maybeSingle()
      resumeRow = data ?? null
    } catch {
      resumeRow = null
    }

    return NextResponse.json({
      ...parsed,
      structured,
      resumeId: resumeRow?.id ?? null
    })
  } catch (error) {
    const known = error instanceof ResumeParseError ? error : toUserMessage(error)
    return NextResponse.json(
      {
        ok: false,
        error: known.code,
        message: known.message
      },
      { status: known.status }
    )
  }
}
