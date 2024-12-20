# CHANGELOG
*versions follow [SemVer](http://semver.org)*

## 3.0.0 - 2024-12-20
* **BREAKING CHANGES**: Converted the code base from CommonJS to ESM. Minimal NodeJS version: >= 14.8
* **BREAKING CHANGES**: By default, `couchdb-bulk2` now generates files with the bulk operations results, unless the stream, `stdout` or `stder`, is already being redirected to a file
* Added a `-q, --quiet` option
* Added a `-o, --output` option

## 2.2.0 - 2021-04-23
* Added a `-s, --sleep <milliseconds>` option

## 2.1.0 - 2021-04-23
* Added a `-l, --batch-length <number>` option

## 2.0.0 - 2020-08-20
forked from [couchdb-bulk](https://github.com/jo/couchdb-bulk), with the following modifications:
* **BREAKING CHANGES**: drops supports for anything else than newline-delimited JSON (1 doc per line), assuming that getting to that data format is the job of another tool, such as [jq](https://stedolan.github.io/jq/)
* **BREAKING CHANGES**: drops supports for the module interface, only the CLI mode remains
* posts 500 docs per bulk request (instead of only 1) when the input is newline-delimited JSON
* modernized code and dependencies
