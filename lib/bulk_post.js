import { Agent as httpAgent } from 'node:http'
import { Agent as httpsAgent } from 'node:https'
import { tmpdir } from 'node:os'
import { name } from './package.js'
import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import { red, green } from 'tiny-chalk'

const headers = {
  'content-type': 'application/json',
}

export async function bulkPostFactory (url) {
  const { protocol, host, pathname } = new URL(url)
  const Agent = protocol === 'https' ? httpsAgent : httpAgent
  const agent = new Agent({ keepAlive: true })
  const timestamp = new Date().toISOString()
  const outputDir = `${tmpdir()}/${name}-${host}${pathname}-${timestamp}`

  let stdoutFile, stderrFile, stdoutFileStream, stderrFileStream
  let stdoutLineCount = 0
  let stderrLineCount = 0

  if (process.stdout.isTTY) stdoutFile = `${outputDir}/stdout`
  if (process.stderr.isTTY) stderrFile = `${outputDir}/stderr`
  if (stdoutFile || stderrFile) await mkdir(outputDir, { recursive: true })
  if (stdoutFile) stdoutFileStream = createWriteStream(stdoutFile)
  if (stderrFile) stderrFileStream = createWriteStream(stderrFile)

  async function bulkPost (batch) {
    if (!batch || batch.length === 0) return

    const body = `{ "docs": [ ${batch.join(',')} ] }`
    const res = await fetch(`${url}/_bulk_docs`, { method: 'post', agent, headers, body })
    const resBody = await res.text()

    if (res.status < 400) {
      const resData = JSON.parse(resBody)
      for (const docRes of resData) {
        if (docRes.error != null) {
          stderrLineCount++
          const output = JSON.stringify(docRes) + '\n'
          process.stderr.write(output)
          if (stderrFileStream) stderrFileStream.write(output)
        } else {
          stdoutLineCount++
          const output = JSON.stringify(docRes) + '\n'
          process.stdout.write(JSON.stringify(docRes) + '\n')
          if (stdoutFileStream) stdoutFileStream.write(output)
        }
      }
    } else {
      throw new Error(`${res.status}: ${resBody}`)
    }
  }

  function onClose () {
    if (stderrFile) {
      // Do not polute stderr if it is not a TTY
      if (stdoutFile) console.error(`stdout saved to ${getFileUrl(stdoutFile)} (${stdoutLineCount} line(s))`)
      if (stderrLineCount > 0) console.error(red(`${stderrLineCount} error(s)`))
      else console.error(green('0 error'))
      console.error(`stderr saved to ${getFileUrl(stderrFile)} (${stderrLineCount} line(s))`)
    }
  }

  return { bulkPost, onClose }
}

function getFileUrl (path) {
  return pathToFileURL(path).href
}
