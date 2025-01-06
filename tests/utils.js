import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import config from 'config'

const { protocol, hostname, port, username, password } = config.couchdb
const couchdbOrigin = `${protocol}://${hostname}:${port}`

const execAsync = promisify(exec)

export async function shellExec (cmd) {
  let { stdout, stderr } = await execAsync(cmd)
  stdout = stdout.trim()
  stderr = stderr.trim()
  return { stdout, stderr }
}

async function dbOp (method, dbName) {
  await fetch(`${couchdbOrigin}/${dbName}`, {
    method,
    headers: {
      'content-type': 'application/json',
      authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
    },
  })
}

export const createDb = dbOp.bind(null, 'put')
export const deleteDb = dbOp.bind(null, 'delete')

export function shouldNotBeCalled (res) {
  console.error(res, 'undesired positive res')
  const err = new Error('function was expected not to be called')
  err.context = { res }
  throw err
}
