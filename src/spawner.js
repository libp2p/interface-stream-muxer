'use strict'

const chai = require('chai')
chai.use(require('chai-checkmark'))
const expect = chai.expect

const pair = require('pull-pair/duplex')
const pull = require('pull-stream')

module.exports = (muxer, nStreams, nMsg, done) => {
  const p = pair()
  const dialerSocket = p[0]
  const listenerSocket = p[1]

  const checks = (6 * nStreams) + (nStreams * nMsg)
  expect(checks).checks(done)

  const msg = 'simple msg'

  const listener = muxer.listen(listenerSocket)
  const dialer = muxer.dial(dialerSocket)

  listener.on('stream', (stream) => {
    expect(stream).to.exist.mark()
    pull(
      stream,
      pull.through((chunk) => {
        expect(chunk).to.exist.mark()
      }),
      pull.onEnd((err) => {
        expect(err).to.not.exist.mark()
        pull(pull.empty(), stream)
      })
    )
  })

  for (let i = 0; i < nStreams; i++) {
    const stream = dialer.newStream((err) => {
      expect(err).to.not.exist.mark()
    })

    expect(stream).to.exist.mark()

    pull(
      pull.infinite(() => msg),
      pull.take(nMsg),
      stream,
      pull.collect((err, res) => {
        expect(err).to.not.exist.mark()
        expect(res).to.be.eql([]).mark()
      })
    )
  }
}
