import { createWriteStream } from 'node:fs'
import { mkdir, rm } from 'node:fs/promises'
import { Agent as httpAgent } from 'node:http'
import { Agent as httpsAgent } from 'node:https'
import { tmpdir } from 'node:os'
// Use node-fetch to keep the agent option, not available in native fetch
// See https://stackoverflow.com/a/76069981
import fetch from 'node-fetch'
import { red, green, grey, yellow } from 'tiny-chalk'
import { name } from './package.js'

export async function bulkPostFactory ({ url, output }) {
  const { protocol, origin, username, host, password, pathname } = new URL(url)
  const urlWithoutCredentials = `${origin}${pathname}`

  const Agent = protocol === 'https' ? httpsAgent : httpAgent
  const agent = new Agent({ keepAlive: true })

  const cookie = await getSessionCookie({ origin, username, password, agent })
  const headers = {
    'content-type': 'application/json',
    cookie,
  }

  const outputDir = output || getDefaultOutputDir({ host, pathname })

  let successesFile, errorsFile, stdoutFileStream, stderrFileStream
  let successesCount = 0
  let errorsCount = 0

  if (process.stdout.isTTY) successesFile = `${outputDir}/successes`
  if (process.stderr.isTTY) errorsFile = `${outputDir}/errors`
  if (successesFile || errorsFile) await mkdir(outputDir, { recursive: true })
  if (successesFile) stdoutFileStream = createWriteStream(successesFile)
  if (errorsFile) stderrFileStream = createWriteStream(errorsFile)

  async function bulkPost (batch) {
    if (!batch || batch.length === 0) return

    const body = `{ "docs": [ ${batch.join(',')} ] }`
    const res = await fetch(`${urlWithoutCredentials}/_bulk_docs`, { method: 'post', agent, headers, body })
    const resBody = await res.text()

    if (res.status < 400) {
      const resData = JSON.parse(resBody)
      for (const docRes of resData) {
        if (docRes.error != null) {
          errorsCount++
          const output = JSON.stringify(docRes) + '\n'
          process.stderr.write(output)
          if (stderrFileStream) stderrFileStream.write(output)
        } else {
          successesCount++
          const output = JSON.stringify(docRes) + '\n'
          process.stdout.write(JSON.stringify(docRes) + '\n')
          if (stdoutFileStream) stdoutFileStream.write(output)
        }
      }
    } else {
      throw new Error(`${res.status}: ${resBody}`)
    }
  }

  async function onClose ({ quiet = false }) {
    if (errorsFile && !quiet) {
      // Do not polute stderr if it is not a TTY
      if (successesFile) {
        const successesCountColorFn = successesCount > 0 ? green : yellow
        process.stderr.write(grey(`Successful updates responses saved to ${successesFile}`) + successesCountColorFn(` ${successesCount} doc(s) successfully saved`)  + '\n')
      }
      if (errorsCount > 0) {
        process.stderr.write(grey(`Errors saved to ${errorsFile}`) + red(` ${errorsCount} error(s)`)  + '\n')
      } else {
        await rm(errorsFile)
      }
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

export function getDefaultOutputDir ({ host, pathname } = {}) {
  const timestamp = new Date().toISOString()
  if (host && pathname) {
    return `${tmpdir()}/${name}_${host}_${pathname.slice(1)}_${timestamp}`
  } else {
    return `${tmpdir()}/${name}_{host}_{pathname}_{timestamp}`
  }
}
