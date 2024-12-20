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
cat ./test/fixtures/docs.ndjson | couchdb-bulk2 http://username:password@localhost:5984/testdb
// OR
couchdb-bulk2 http://username:password@localhost:5984/testdb ./test/fixtures/docs.ndjson
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
cat view_reponse.json | jq -c '.docs[]' | couchdb-bulk2 http://username:password@localhost:5984/testdb
```

By default, `couchdb-bulk2` generates files with the bulk operations results, unless the stream, `stdout` or `stder`, is already being redirected to a file. To override that behavior, you can redirect those streams yourself:
```sh
cat view_reponse.json | jq -c '.docs[]' | couchdb-bulk2 http://username:password@localhost:5984/testdb > ./stdout 2> ./stderr
```

### Options
* `-l, --batch-length <number>`: Set the number of documents to be sent in bulk to CouchDB per batch (Default: 1000)
* `-s, --sleep <milliseconds>`: Defines the amount of time (in milliseconds) to wait once a batch was sent before sending a new one (Default: 0)
* `-o, --output <path>`: Customize output directory for the stdout or stderr streams that are not already redirected to a file
* `-q, --quiet`: Do not log output files and operations statistics (Default: false')

## See also
* `couchdb-bulk2` works great in combinaison with [`ndjson-apply`](https://github.com/maxlath/ndjson-apply): see [data transformation workflow in the Inventaire project](https://github.com/inventaire/inventaire/blob/master/docs/data_transformation.md#data-transformation)
