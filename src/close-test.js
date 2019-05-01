/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
chai.use(require('chai-checkmark'))
const { expect } = chai
const pair = require('it-pair/duplex')
const pipe = require('it-pipe')
const { consume } = require('streaming-iterables')
const Tcp = require('libp2p-tcp')
const multiaddr = require('multiaddr')

const mh = multiaddr('/ip4/127.0.0.1/tcp/10000')

async function closeAndWait (stream) {
  await pipe([], stream, consume)
  expect(true).to.be.true.mark()
}

const infiniteRandom = {
  [Symbol.asyncIterator]: async function * () {
    while (true) {
      yield new Promise(resolve => {
        setTimeout(() => resolve(Buffer.from(Math.random().toString())), 10)
      })
    }
  }
}

module.exports = (common) => {
  describe('close', () => {
    let Muxer

    beforeEach(async () => {
      Muxer = await common.setup()
    })

    it('closing underlying socket closes streams (tcp)', async () => {
      const tcp = new Tcp()
      const tcpListener = tcp.createListener(conn => {
        const listener = new Muxer(stream => pipe(stream, stream))
        pipe(conn, listener, conn)
      })

      await tcpListener.listen(mh)
      const dialerConn = await tcp.dial(mh)
      const dialerMuxer = new Muxer()

      pipe(dialerConn, dialerMuxer, dialerConn)

      const s1 = dialerMuxer.newStream()
      const s2 = dialerMuxer.newStream()

      // close the listener in a bit
      setTimeout(() => tcpListener.close(), 50)

      // test is complete when all muxed streams have closed with error
      await Promise.all([s1, s2].map(stream => {
        return (async () => {
          try {
            await pipe(infiniteRandom, stream, consume)
          } catch (err) {
            return expect(err).to.exist.mark()
          }
          throw new Error('stream did not throw')
        })()
      }))
    })

    it('closing one of the muxed streams doesn\'t close others', (done) => {
      const p = pair()
      const dialer = new Muxer()
      const listener = new Muxer(stream => {
        expect(stream).to.exist.mark()
        pipe(stream, stream)
      })

      pipe(p[0], dialer, p[0])
      pipe(p[1], listener, p[1])

      expect(2).checks(done)

      const streams = []

      for (let i = 0; i < 5; i++) {
        streams.push(dialer.newStream())
      }

      closeAndWait(streams[0])

      streams.slice(1).forEach(async stream => {
        await pipe(infiniteRandom, stream, consume)
        throw new Error('should not end')
      })
    })
  })
}
