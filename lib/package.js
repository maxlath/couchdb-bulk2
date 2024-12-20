#!/usr/bin/env node
import { readFile } from 'node:fs/promises'

const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url)))

export const name = pkg.name
export const version = pkg.version
