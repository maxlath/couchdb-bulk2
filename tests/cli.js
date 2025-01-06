import 'should'
import config from 'config'
import { createDb, deleteDb, shellExec, shouldNotBeCalled } from './utils.js'
import { tmpdir } from 'node:os'

const { testDbNameBase } = config
const { protocol, hostname, port, username, password } = config.couchdb

const couchdbOrigin = `${protocol}://${username}:${password}@${hostname}:${port}`

describe('couchdb-bulk2', () => {
  it('should reject posting to a non-existing database', async () => {
    await shellExec(`./cli.js ${couchdbOrigin}/not-existing < ./tests/fixtures/docs.ndjson`)
    .then(shouldNotBeCalled)
    .catch(err => {
      err.message.should.containEql('Database does not exist')
    })
  })

  it('should load new documents', async () => {
    const dbName = `${testDbNameBase}-${Date.now()}`
    const dbUrl = `${couchdbOrigin}/${dbName}`
    await createDb(dbName)
    try {
      const { stdout, stderr } = await shellExec(`./cli.js ${dbUrl} < ./tests/fixtures/docs.ndjson`)
      stderr.should.equal('')
      const results = stdout.split('\n').map(line => JSON.parse(line))
      results.length.should.equal(3)
      results.forEach((result, index) => {
        result.ok.should.be.true()
        result.id.should.equal(`test${index + 1}`)
        result.rev.should.startWith('1-')
      })
    } finally {
      await deleteDb(dbName)
    }
  })

  it('should update existing documents', async () => {
    const dbName = `${testDbNameBase}-${Date.now()}`
    const dbUrl = `${couchdbOrigin}/${dbName}`
    await createDb(dbName)
    try {
      const { stdout } = await shellExec(`./cli.js ${dbUrl} < ./tests/fixtures/docs.ndjson`)
      const results = stdout.split('\n').map(line => JSON.parse(line))
      const updateBatch = []
      results.forEach(({ id, rev }, index) => {
        updateBatch.push({
          _id: id,
          _rev: rev,
          newkey: index + 1
        })
      })
      const stringifiedUpdateBatch = updateBatch.map(doc => JSON.stringify(doc)).join('\n')
      const { stdout: stdout2, stderr: stderr2 } = await shellExec(`echo '${stringifiedUpdateBatch}' | ./cli.js ${dbUrl}`)
      stderr2.should.equal('')
      const results2 = stdout2.split('\n').map(line => JSON.parse(line))
      results2.length.should.equal(3)
      results2.forEach((result, index) => {
        result.ok.should.be.true()
        result.id.should.equal(`test${index + 1}`)
        result.rev.should.startWith('2-')
      })
    } finally {
      await deleteDb(dbName)
    }
  })
})
