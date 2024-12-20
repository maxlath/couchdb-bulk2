import { createWriteStream } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { Agent as httpAgent } from 'node:http'
import { Agent as httpsAgent } from 'node:https'
import { tmpdir } from 'node:os'
// Use node-fetch to keep the agent option, not available in native fetch
// See https://stackoverflow.com/a/76069981
import fetch from 'node-fetch'
import { red, green, grey, yellow } from 'tiny-chalk'
import { name } from './package.js'

export async function bulkPostFactory (url) {
  const { protocol, origin, username, password, host, pathname } = new URL(url)
  const urlWithoutCredentials = `${origin}${pathname}`

  const Agent = protocol === 'https' ? httpsAgent : httpAgent
  const agent = new Agent({ keepAlive: true })

  const cookie = await getSessionCookie({ origin, username, password, agent })
  const headers = {
    'content-type': 'application/json',
    cookie,
  }

  const timestamp = new Date().toISOString()
  const outputDir = `${tmpdir()}/${name}_${host}-${pathname.slice(1)}_${timestamp}`

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
    const res = await fetch(`${urlWithoutCredentials}/_bulk_docs`, { method: 'post', agent, headers, body })
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
      const stdoutLineCountColorFn = stdoutLineCount > 0 ? green : yellow
      const stderrLineCountColorFn = stderrLineCount > 0 ? red : grey
      // Do not polute stderr if it is not a TTY
      if (stdoutFile) process.stderr.write(grey(`stdout saved to ${stdoutFile}`) + stdoutLineCountColorFn(` ${stdoutLineCount} doc(s) successfully saved`)  + '\n')
      process.stderr.write(grey(`stderr saved to ${stderrFile}`) + stderrLineCountColorFn(` ${stderrLineCount} error(s)`)  + '\n')
    }
  }

  return { bulkPost, onClose }
}

async function getSessionCookie ({ origin, username, password, agent }) {
  const res = await fetch(`${origin}/_session`, {
    method: 'post',
    headers: {
      'content-type': 'application/json',
      // Required by old CouchDB (ex: v1.6.1)
      authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    },
    // Required by newer CouchDB
    body: JSON.stringify({ name: username, password }),
    agent,
  })
  return res.headers.get('set-cookie')
}
