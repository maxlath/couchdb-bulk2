#!/usr/bin/env node
const fs = require('fs')
const split = require('split')

const [ url, file ] = process.argv.slice(2)

if (url == null || !url.startsWith('http')) {
  console.log(`Usage: \ncouchdb-bulk url [file]'

    Notes:

      The [file] argument is optional, if its missing (or if its '-'),
      input is expected to be piped via stdin. The tool
      is intended to be used in a command chain like
      cat docs.ndjson | couchdb-bulk

      couchdb-bulk expects input to be line seperated JSON.
      See http://jsonlines.org for more info on this format.

      Each line should be a single doc:
      { "_id": "one" }

      This newline-delimited JSON format can easily be obtained from a JSON document
      containing an array of docs using a tool such as jq https://stedolan.github.io/jq/

      cat view_reponse.json | jq -c '.docs[]'
  `)

  process.exit()
}

const inStream = (!process.stdin.isTTY || file === '-' || !file)
  ? process.stdin
  : fs.createReadStream(file)

const bulkPost = require('./bulk_post')(url)

const batch = []

inStream
  .pipe(split())
  .on('data', async function (line) {
    // weed empty lines
    if (line === '') return

    batch.push(line)

    if (batch.length >= 500) {
      this.pause()
      await bulkPost(batch)
      batch = []
      this.resume()
    }
  })
  .on('close', () => bulkPost(batch))
  .on('error', console.error)
