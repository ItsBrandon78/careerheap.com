export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
export const PDF_TEXT_MIN_CHARS = 80
export const PDF_LOW_TEXT_FALLBACK_MIN_CHARS = 24

const DOCX_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword'
])

const PDF_MIME_TYPES = new Set(['application/pdf'])

export class ResumeParseError extends Error {
  /**
   * @param {string} code
   * @param {string} message
   * @param {number} status
   */
  constructor(code, message, status = 400) {
    super(message)
    this.name = 'ResumeParseError'
    this.code = code
    this.status = status
  }
}

/**
 * @param {string} value
 */
export function normalizeWhitespace(value) {
  return value
    .replace(/\u0000/g, '')
    .replace(/\f/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/**
 * @param {string} value
 */
export function countMeaningfulChars(value) {
  const matches = value.match(/[a-z0-9]/gi)
  return matches?.length ?? 0
}

/**
 * @param {{ fileName: string; mimeType: string | null }} args
 * @returns {'pdf' | 'docx' | null}
 */
export function detectResumeFileType(args) {
  const fileName = args.fileName || ''
  const mimeType = (args.mimeType || '').toLowerCase()
  const extension = fileName.split('.').pop()?.toLowerCase() || ''

  if (extension === 'pdf' || PDF_MIME_TYPES.has(mimeType)) {
    return 'pdf'
  }

  if (extension === 'docx' || DOCX_MIME_TYPES.has(mimeType)) {
    return 'docx'
  }

  return null
}

/**
 * @param {string} text
 */
function detectSections(text) {
  const haystack = text.toLowerCase()
  return {
    experience: /experience|employment|work history|professional background/.test(haystack),
    skills: /skills|technical skills|core competencies|toolkit/.test(haystack),
    education: /education|university|college|degree|certification/.test(haystack)
  }
}

/**
 * @param {{
 *   fileName: string
 *   mimeType: string | null
 *   size: number
 *   buffer: Buffer
 *   deps: {
 *     extractDocxText: (buffer: Buffer) => Promise<string>
 *     extractPdfText: (buffer: Buffer) => Promise<string>
 *     extractPdfOcrText?: (buffer: Buffer) => Promise<string>
 *     log?: (data: { source: 'docx' | 'pdf' | 'pdf-ocr'; textLength: number; ocrUsed: boolean }) => void
 *   }
 * }} args
 */
export async function parseResumeUpload(args) {
  const { fileName, mimeType, size, buffer, deps } = args

  if (!buffer || size <= 0) {
    throw new ResumeParseError('NO_FILE', 'No file uploaded. Use form key "file".', 400)
  }

  if (size > MAX_FILE_SIZE_BYTES) {
    throw new ResumeParseError('FILE_TOO_LARGE', 'File exceeds 10MB limit.', 413)
  }

  const fileType = detectResumeFileType({ fileName, mimeType })
  if (!fileType) {
    throw new ResumeParseError('UNSUPPORTED_TYPE', 'Only PDF and DOCX files are supported.', 415)
  }

  if (fileType === 'docx') {
    const docxText = normalizeWhitespace(await deps.extractDocxText(buffer))
    const meaningfulChars = countMeaningfulChars(docxText)

    deps.log?.({
      source: 'docx',
      textLength: docxText.length,
      ocrUsed: false
    })

    return {
      ok: true,
      source: 'docx',
      text: docxText,
      detected: detectSections(docxText),
      stats: { meaningfulChars }
    }
  }

  const pdfTextRaw = await deps.extractPdfText(buffer).catch(() => '')
  const pdfText = normalizeWhitespace(pdfTextRaw)
  const pdfMeaningfulChars = countMeaningfulChars(pdfText)

  if (pdfMeaningfulChars >= PDF_TEXT_MIN_CHARS) {
    deps.log?.({
      source: 'pdf',
      textLength: pdfText.length,
      ocrUsed: false
    })

    return {
      ok: true,
      source: 'pdf',
      text: pdfText,
      detected: detectSections(pdfText),
      stats: { meaningfulChars: pdfMeaningfulChars }
    }
  }

  const lowTextFallback = () => ({
    ok: true,
    source: 'pdf',
    text: pdfText,
    warning:
      'Scanned PDF suspected. OCR is unavailable or failed, so we used limited extracted text. Review before generating.',
    detected: detectSections(pdfText),
    stats: { meaningfulChars: pdfMeaningfulChars }
  })

  if (!deps.extractPdfOcrText) {
    if (pdfMeaningfulChars >= PDF_LOW_TEXT_FALLBACK_MIN_CHARS) {
      deps.log?.({
        source: 'pdf',
        textLength: pdfText.length,
        ocrUsed: false
      })
      return lowTextFallback()
    }

    throw new ResumeParseError(
      'PDF_SCANNED_OCR_FAILED',
      'Scanned PDF detected, but OCR is unavailable. Upload DOCX or paste your experience.',
      422
    )
  }

  const ocrTextRaw = await deps.extractPdfOcrText(buffer).catch((error) => {
    if (pdfMeaningfulChars >= PDF_LOW_TEXT_FALLBACK_MIN_CHARS) {
      return null
    }

    const message =
      error instanceof Error
        ? error.message
        : 'Scanned PDF detected. OCR failed. Upload DOCX or paste your experience.'

    throw new ResumeParseError('PDF_SCANNED_OCR_FAILED', message, 422)
  })

  if (ocrTextRaw === null) {
    deps.log?.({
      source: 'pdf',
      textLength: pdfText.length,
      ocrUsed: false
    })
    return lowTextFallback()
  }

  const ocrText = normalizeWhitespace(ocrTextRaw)
  const ocrMeaningfulChars = countMeaningfulChars(ocrText)
  if (ocrMeaningfulChars < PDF_TEXT_MIN_CHARS) {
    throw new ResumeParseError(
      'PDF_SCANNED_OCR_FAILED',
      'Scanned PDF detected but OCR returned too little text. Upload DOCX or paste your experience.',
      422
    )
  }

  deps.log?.({
    source: 'pdf-ocr',
    textLength: ocrText.length,
    ocrUsed: true
  })

  return {
    ok: true,
    source: 'pdf-ocr',
    text: ocrText,
    warning: 'Scanned PDF detected - OCR used (may take a few seconds).',
    detected: detectSections(ocrText),
    stats: { meaningfulChars: ocrMeaningfulChars }
  }
}

