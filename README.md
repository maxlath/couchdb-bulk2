# couchdb-bulk2

This is a little command line tool meant to eat newline-delimited JSON (CouchDB documents) on stdin and `POST`ing them to the [`_bulk_docs`](http://docs.couchdb.org/en/stable/api/database/bulk-api.html#db-bulk-docs) endpoint of a [CouchDB](https://couchdb.apache.org/) server.

This is a fork from [couchdb-bulk](https://github.com/jo/couchdb-bulk), with the following modifications:
* posts 1000 docs per bulk request (instead of only 1) when the input is newline-delimited JSON
* drops supports for anything else than newline-delimited JSON (1 doc per line), assuming that getting to that data format is the job of another tool, such as [jq](https://stedolan.github.io/jq/)
* drops supports for the module interface, only the CLI mode remains
* modernized code and dependencies

## Installation

```sh
npm install -g couchdb-bulk2
```

## CLI

```sh
couchdb-bulk2 url [file]
```

The `[file]` argument is optional, if its missing (or if its '-'), input is expected to be piped via stdin

Example:

```sh
cat ./test/fixtures/docs.ndjson | couchdb-bulk2 http://localhost:5984/testdb
// OR
couchdb-bulk2 http://localhost:5984/testdb ./test/fixtures/docs.ndjson
```

`couchdb-bulk2` expects the input to be newline-delimited JSON.

See http://jsonlines.org for more info on this format.

Each line should be a single doc:
```json
{ "_id": "one" }
{ "_id": "two" }
{ "_id": "three" }
```

This newline-delimited JSON format can easily be obtained from a JSON document containing an array of docs using a tool such as [`jq`](https://stedolan.github.io/jq/)
```sh
cat view_reponse.json | jq -c '.docs[]' | couchdb-bulk2 http://localhost:5984/testdb
```
