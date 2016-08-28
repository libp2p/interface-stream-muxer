'use strict'

const expect = require('chai').expect

const pair = require('stream-pair')
const pull = require('pull-stream')
const toPull = require('stream-to-pull-stream')
const generate = require('pull-generate')
const timesLimit = require('async/timesLimit')

module.exports = (muxer, nStreams, nMsg, done) => {
  const p = pair.create()
  const dialerSocket = toPull.duplex(p)
  const listenerSocket = toPull.duplex(p.other)

  const check = marker((6 * nStreams) + (nStreams * nMsg), done)

  // debug values
  let msgSent = 0
  let msgReceived = 0
  let endStreams = 0
  let i
  let j = 0
  let collectStreams = 0

  setTimeout(() => {
    console.log('\n # nStreams:', nStreams, 'nMsg', nMsg)
    console.log('streamsCreated', i)
    console.log('streamsReceived', j)
    console.log('endStreams', endStreams)
    console.log('collectStreams', collectStreams)
    console.log('msgSent', msgSent)
    console.log('msgReceived', msgReceived)
  }, 2000)

  const msg = 'simple msg'

  const listener = muxer.listen(listenerSocket)
  const dialer = muxer.dial(dialerSocket)

  listener.on('stream', (stream) => {
    j++
    expect(stream).to.exist
    check()
    pull(
      stream,
      pull.through((chunk) => {
        msgReceived++
        expect(chunk).to.exist
        check()
      }),
      pull.onEnd((err) => {
        endStreams++
        expect(err).to.not.exist
        check()
        pull(pull.empty(), stream)
      })
    )
  })

  const nParallelStreams = 100

  timesLimit(nStreams, nParallelStreams, (n, cb) => {
    const stream = dialer.newStream((err) => {
      expect(err).to.not.exist
      check()
      expect(stream).to.exist
      check()

      pull(
        generate(0, (state, cb) => {
          cb(state === nMsg ? true : null, msg, state + 1)
        }),
        pull.through(() => {
          msgSent++
        }),
        stream,
        pull.collect((err, res) => {
          collectStreams++
          expect(err).to.not.exist
          check()
          expect(res).to.be.eql([])
          check()
          cb()
        })
      )
    })
  }, () => {})
}

function marker (n, done) {
  let i = 0
  return (err) => {
    i++

    if (err) {
      console.error('Failed after %s iterations', i)
      return done(err)
    }

    if (i === n) {
      done()
    }
  }
}
