import { NextResponse } from 'next/server'
import { getResumeOcrCapabilities } from '@/lib/server/ocrRuntime'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const ocr = await getResumeOcrCapabilities()
    return NextResponse.json(
      {
        ok: true,
        ocr
      },
      {
        headers: {
          'Cache-Control': 'no-store'
        }
      }
    )
  } catch {
    return NextResponse.json(
      {
        ok: false,
        error: 'CAPABILITY_CHECK_FAILED',
        message: 'Unable to detect OCR capability status.'
      },
      { status: 500 }
    )
  }
}
