# CHANGELOG
*versions follow [SemVer](http://semver.org)*

## 2.1.0 - 2021-04-23
* Added a `-l, --batch-length <number>` option

## 2.0.0 - 2020-08-20
forked from [couchdb-bulk](https://github.com/jo/couchdb-bulk), with the following modifications:
* **BREAKING CHANGES**: drops supports for anything else than newline-delimited JSON (1 doc per line), assuming that getting to that data format is the job of another tool, such as [jq](https://stedolan.github.io/jq/)
* **BREAKING CHANGES**: drops supports for the module interface, only the CLI mode remains
* posts 500 docs per bulk request (instead of only 1) when the input is newline-delimited JSON
* modernized code and dependencies
