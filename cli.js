#!/usr/bin/env node
const fs = require('fs')
const split = require('split')
const { program } = require('commander')
const { version } = require('./package.json')

program
.arguments('<url> [file]')
.option('-l, --batch-length <number>', 'set the number of documents to be sent in bulk to CouchDB per batch (default: 1000)')
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
const { batchLength } = program.opts()
if (batchLength) {
  docsPerBulk = parseInt(batchLength)
}

const logErrorAndExit = (errMessage) => {
  console.error(errMessage)
  process.exit(1)
}

if (!url) logErrorAndExit('missing url')
if (!url.startsWith('http')) logErrorAndExit(`invalid url: ${url}`)

const inStream = (!process.stdin.isTTY || file === '-' || !file)
  ? process.stdin
  : fs.createReadStream(file)

const bulkPost = require('./bulk_post')(url)

let batch = []

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
        this.resume()
      } catch (err) {
        console.error('bulk error', err)
        process.exit(1)
      }
    }
  })
  .on('close', () => bulkPost(batch))
  .on('error', console.error)
