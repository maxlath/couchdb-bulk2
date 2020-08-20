const fetch = require('node-fetch')
const headers = {
  'content-type': 'application/json'
}

module.exports = url => {
  const protocol = url.split('://')[0]
  const { Agent } = require(protocol)
  const agent = new Agent({ keepAlive: true })

  return async batch => {
    if (!batch || batch.length === 0) return

    const body = `{ "docs": [ ${batch.join(',')} ] }`
    const res = await fetch(`${url}/_bulk_docs`, { method: 'POST', agent, headers, body })
    const resBody = await res.text()

    if (res.status < 400) {
      const resData = JSON.parse(resBody)
      for (docRes of resData) {
        if (docRes.error != null) {
          process.stderr.write(JSON.stringify(docRes) + '\n')
        } else {
          process.stdout.write(JSON.stringify(docRes) + '\n')
        }
      }
    } else {
      throw new Error(`${res.status}: ${resBody}`)
    }
  }
}
