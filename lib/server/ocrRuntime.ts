import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'
import path from 'node:path'

const PROCESS_CHECK_TIMEOUT_MS = 2_000
const processAvailability = new Map<string, boolean>()
let tesseractJsAvailable: boolean | null = null

function runProcessCheck(command: string, args: string[], timeoutMs = PROCESS_CHECK_TIMEOUT_MS) {
  return new Promise<void>((resolve, reject) => {
    let settled = false
    const settleResolve = () => {
      if (settled) return
      settled = true
      resolve()
    }
    const settleReject = (error: Error) => {
      if (settled) return
      settled = true
      reject(error)
    }

    const child = spawn(command, args, {
      windowsHide: true
    })

    const timeout = setTimeout(() => {
      try {
        child.kill('SIGKILL')
      } catch {
        // Ignore kill errors and return timeout status.
      }
      settleReject(new Error(`${command} timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    child.on('error', (error) => {
      clearTimeout(timeout)
      settleReject(error)
    })

    child.on('close', (code) => {
      clearTimeout(timeout)
      if ((code ?? 0) !== 0) {
        settleReject(new Error(`${command} failed`))
        return
      }

      settleResolve()
    })
  })
}

export async function isBinaryAvailable(command: string, args: string[]) {
  const cacheKey = `${command}::${args.join(' ')}`
  if (processAvailability.has(cacheKey)) {
    return processAvailability.get(cacheKey) ?? false
  }

  try {
    await runProcessCheck(command, args)
    processAvailability.set(cacheKey, true)
    return true
  } catch {
    processAvailability.set(cacheKey, false)
    return false
  }
}

export async function hasTesseractJsAvailable() {
  if (tesseractJsAvailable !== null) {
    return tesseractJsAvailable
  }

  try {
    await access(path.join(process.cwd(), 'node_modules', 'tesseract.js', 'package.json'))
    tesseractJsAvailable = true
  } catch {
    tesseractJsAvailable = false
  }

  return tesseractJsAvailable
}

export type ResumeOcrCapabilities = {
  available: boolean
  mode: 'native' | 'fallback' | 'unavailable'
  hasPdftoppm: boolean
  hasTesseractCli: boolean
  hasTesseractJs: boolean
  maxPages: number
  timeoutMs: number
}

export async function getResumeOcrCapabilities() {
  const [hasPdftoppm, hasTesseractCli, hasTesseractJs] = await Promise.all([
    isBinaryAvailable('pdftoppm', ['-v']),
    isBinaryAvailable('tesseract', ['--version']),
    hasTesseractJsAvailable()
  ])

  const available = hasTesseractCli || hasTesseractJs
  const mode: ResumeOcrCapabilities['mode'] =
    hasPdftoppm && hasTesseractCli
      ? 'native'
      : available
        ? 'fallback'
        : 'unavailable'

  return {
    available,
    mode,
    hasPdftoppm,
    hasTesseractCli,
    hasTesseractJs,
    maxPages: 5,
    timeoutMs: 20_000
  } satisfies ResumeOcrCapabilities
}
