import { spawn } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import path from 'node:path'

const port = Number(process.env.LH_PORT || 4173)
const baseUrl = `http://127.0.0.1:${port}`
const useExistingServer = process.env.LH_USE_EXISTING_SERVER === '1'
const skipBuild = process.env.LH_SKIP_BUILD === '1'

const targets = [
  { route: '/', output: 'lighthouse-home.json' },
  { route: '/tools/career-switch-planner', output: 'lighthouse-tool.json' },
  { route: '/pricing', output: 'lighthouse-pricing.json' },
  { route: '/blog', output: 'lighthouse-blog.json' }
]

function spawnCommand(command, args, options = {}) {
  const child =
    process.platform === 'win32'
      ? spawn('cmd.exe', ['/c', command, ...args], {
          stdio: 'inherit',
          ...options
        })
      : spawn(command, args, {
          stdio: 'inherit',
          shell: false,
          ...options
        })

  return new Promise((resolve, reject) => {
    child.on('exit', (code) => {
      if (code === 0) resolve(undefined)
      else reject(new Error(`${command} ${args.join(' ')} exited with code ${code}`))
    })
    child.on('error', reject)
  })
}

async function fetchWithTimeout(url, timeoutMs = 3000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { signal: controller.signal })
  } finally {
    clearTimeout(timeout)
  }
}

async function waitForHealthyRoute(route, timeoutMs = 90000) {
  const url = `${baseUrl}${route}`
  const start = Date.now()

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetchWithTimeout(url, 2500)
      if (response.ok) {
        return
      }
    } catch {
      // Keep polling until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(`Server did not become healthy for ${url} within ${timeoutMs}ms`)
}

async function isHealthyRoute(route) {
  try {
    const response = await fetchWithTimeout(`${baseUrl}${route}`, 1500)
    return response.ok
  } catch {
    return false
  }
}

async function hasHealthyServer() {
  const pricingOk = await isHealthyRoute('/pricing')
  if (!pricingOk) return false
  const blogOk = await isHealthyRoute('/blog')
  return blogOk
}

async function assertNoRuntimeError(outputPath) {
  const fullPath = path.resolve(process.cwd(), outputPath)
  const raw = await readFile(fullPath, 'utf8')
  const report = JSON.parse(raw)
  if (report.runtimeError?.code) {
    throw new Error(
      `${outputPath} failed with runtimeError=${report.runtimeError.code}: ${report.runtimeError.message || 'unknown'}`
    )
  }
}

async function runLighthouseForTarget(target) {
  const url = `${baseUrl}${target.route}`
  const npx = 'npx'
  const args = [
    'lighthouse',
    url,
    '--quiet',
    '--output=json',
    `--output-path=${target.output}`,
    '--chrome-flags=--headless=new --no-sandbox --disable-dev-shm-usage --ignore-certificate-errors',
    '--max-wait-for-load=45000'
  ]

  await spawnCommand(npx, args, { cwd: process.cwd() })
  await assertNoRuntimeError(target.output)
}

async function main() {
  let devServer
  let startedServer = false

  try {
    const healthyExistingServer = await hasHealthyServer()
    const shouldUseExisting = useExistingServer || healthyExistingServer

    if (!shouldUseExisting) {
      if (!skipBuild) {
        const npm = 'npm'
        await spawnCommand(npm, ['run', 'build'], { cwd: process.cwd() })
      }

      if (process.platform === 'win32') {
        devServer = spawn(
          'cmd.exe',
          ['/c', 'npm', 'run', 'start', '--', '--hostname', '127.0.0.1', '--port', String(port)],
          {
            cwd: process.cwd(),
            stdio: 'inherit'
          }
        )
      } else {
        devServer = spawn(
          'npm',
          ['run', 'start', '--', '--hostname', '127.0.0.1', '--port', String(port)],
          {
            cwd: process.cwd(),
            stdio: 'inherit'
          }
        )
      }
      startedServer = true
    }

    // Fail fast before kicking off Lighthouse runs.
    await waitForHealthyRoute('/pricing')
    await waitForHealthyRoute('/blog')

    for (const target of targets) {
      await waitForHealthyRoute(target.route)
      await runLighthouseForTarget(target)
    }
  } finally {
    if (startedServer && devServer && !devServer.killed) {
      if (process.platform === 'win32' && devServer.pid) {
        await spawnCommand('taskkill', ['/PID', String(devServer.pid), '/T', '/F']).catch(() => null)
      } else {
        devServer.kill('SIGTERM')
      }
    }
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
