import { NextResponse } from 'next/server'
import mammoth from 'mammoth'

export const runtime = 'nodejs'

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024
const ACCEPTED_EXTENSIONS = new Set(['pdf', 'docx'])

function getExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

function normalizeText(rawText: string) {
  return rawText.replace(/\u0000/g, '').replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

function detectSections(text: string) {
  const haystack = text.toLowerCase()
  return {
    experience:
      /experience|employment|work history|professional background/.test(haystack),
    skills: /skills|technical skills|core competencies|toolkit/.test(haystack),
    education: /education|university|college|degree|certification/.test(haystack)
  }
}

async function extractPdfText(fileBuffer: Buffer) {
  const { PDFParse } = await import('pdf-parse')
  const parser = new PDFParse({ data: fileBuffer })
  try {
    const result = await parser.getText()
    return result.text ?? ''
  } finally {
    await parser.destroy()
  }
}

async function extractDocxText(fileBuffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer: fileBuffer })
  return result.value ?? ''
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: 'INVALID_FILE', message: 'Please upload a PDF or DOCX file.' },
        { status: 400 }
      )
    }

    const extension = getExtension(file.name)
    if (!ACCEPTED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: 'UNSUPPORTED_FILE', message: 'Only PDF and DOCX files are supported.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        { error: 'FILE_TOO_LARGE', message: 'File too large. Max 10MB allowed.' },
        { status: 400 }
      )
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const rawText =
      extension === 'docx'
        ? await extractDocxText(fileBuffer)
        : await extractPdfText(fileBuffer)
    const text = normalizeText(rawText)

    if (text.length < 140) {
      return NextResponse.json(
        {
          error: 'LOW_TEXT',
          message:
            'This PDF looks scanned or protected. Upload a DOCX or paste your experience.'
        },
        { status: 400 }
      )
    }

    const detected = detectSections(text)

    return NextResponse.json({
      text,
      detected
    })
  } catch (error) {
    console.error('Resume parse error:', error)
    return NextResponse.json(
      {
        error: 'PARSE_FAILED',
        message:
          'We could not extract text from that file. Upload a DOCX or paste your experience instead.'
      },
      { status: 500 }
    )
  }
}
