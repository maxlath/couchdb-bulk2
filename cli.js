#!/usr/bin/env node
import { createReadStream } from 'node:fs'
import { setTimeout } from 'node:timers/promises'
import { program } from 'commander'
import split from 'split'
import { bulkPostFactory, getDefaultOutputDir } from './lib/bulk_post.js'
import { name, version } from './lib/package.js'

program
.name(name)
.arguments('<url> [file]')
.option('-l, --batch-length <number>', 'Set the number of documents to be sent in bulk to CouchDB per batch (Default: 1000)')
.option('-s, --sleep <milliseconds>', 'Defines the amount of time (in milliseconds) to wait once a batch was sent before sending a new one (Default: 0)')
.option('-o, --output <path>', `Customize output directory for the stdout or stderr streams that are not already redirected to a file (Default: ${getDefaultOutputDir()})`)
.option('-q, --quiet', 'Do not log output files and operations statistics (Default: false')
.version(version)

program.addHelpText('after', `
Notes:

  The [file] argument is optional, if its missing (or if its '-'),
  input is expected to be piped via stdin. The tool
  is intended to be used in a command chain like
  cat docs.ndjson | couchdb-bulk

  couchdb-bulk2 expects input to be newline-delimited JSON.
  See http://jsonlines.org for more info on this format.

  Each line should be a single doc:
  { "_id": "one" }

  This newline-delimited JSON format can easily be obtained from a JSON document
  containing an array of docs using a tool such as jq https://stedolan.github.io/jq/

  cat view_reponse.json | jq -c '.docs[]'
`)

program.parse(process.argv)

const [ url, file ] = program.args

// Lowest end of the recommended range
// See https://docs.couchdb.org/en/stable/maintenance/performance.html#network
let docsPerBulk = 1000
const { batchLength, sleep, quiet, output } = program.opts()
if (batchLength) {
  docsPerBulk = parseInt(batchLength)
}

function logErrorAndExit (errMessage) {
  console.error(errMessage)
  process.exit(1)
}

if (!url) logErrorAndExit('missing url')
if (!url.startsWith('http')) logErrorAndExit(`invalid url: ${url}`)

const inStream = (!process.stdin.isTTY || file === '-' || !file)
  ? process.stdin
  : createReadStream(file)

const { bulkPost, onClose } = await bulkPostFactory({ url, output })

let batch = []

async function exit (label, err) {
  console.error(label, err)
  await onClose({ quiet })
  process.exit(1)
}

inStream
  .pipe(split())
  .on('data', async function (line) {
    // weed empty lines
    if (line === '') return

    batch.push(line)

    if (batch.length >= docsPerBulk) {
      try {
        this.pause()
        const batchToPost = batch
        batch = []
        await bulkPost(batchToPost)
        if (sleep) await setTimeout(sleep)

        this.resume()
      } catch (err) {
        await exit('bulk error', err)
      }
    }
  })
  .on('close', async () => {
    try {
      await bulkPost(batch)
    } catch (err) {
      await exit('bulk error on close', err)
    }
    try {
      await onClose({ quiet })
    } catch (err) {
      await exit('onClose error', err)
    }
  })
  .on('error', async err => {
    await exit('stream error', err)
  })
