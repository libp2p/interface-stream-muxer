/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('chai-checkmark'))
const expect = chai.expect

const pair = require('pull-pair/duplex')
const pull = require('pull-stream')

module.exports = (common) => {
  describe('base', () => {
    let muxer

    beforeEach((done) => {
      common.setup((err, _muxer) => {
        if (err) return done(err)
        muxer = _muxer
        done()
      })
    })

    it('Open a stream from the dialer', (done) => {
      const p = pair()
      const dialer = muxer.dial(p[0])
      const listener = muxer.listen(p[1])

      expect(3).checks(done)

      listener.on('stream', (stream) => {
        expect(stream).to.exist.mark()
        pull(pull.empty(), stream)
      })

      const conn = dialer.newStream((err) => {
        expect(err).to.not.exist.mark()
      })

      pull(
        pull.empty(),
        conn,
        pull.onEnd((err) => {
          expect(err).to.not.exist.mark()
        })
      )
    })

    it('Open a stream from the listener', (done) => {
      const p = pair()
      const dialer = muxer.dial(p[0])
      const listener = muxer.listen(p[1])

      expect(3).check(done)

      dialer.on('stream', (stream) => {
        expect(stream).to.exist.mark()
      })

      const conn = listener.newStream((err) => {
        expect(err).to.not.exist.mark()
      })

      pull(
        pull.empty(),
        conn,
        pull.onEnd((err) => {
          expect(err).to.not.exist.mark()
        })
      )
    })

    it('Open a stream on both sides', (done) => {
      const p = pair()
      const dialer = muxer.dial(p[0])
      const listener = muxer.listen(p[1])

      expect(6).check(done).mark()

      dialer.on('stream', (stream) => {
        expect(stream).to.exist.mark()
      })

      const listenerConn = listener.newStream((err) => {
        expect(err).to.not.exist.mark()
      })

      listener.on('stream', (stream) => {
        expect(stream).to.exist.mark()
      })

      const dialerConn = dialer.newStream((err) => {
        expect(err).to.not.exist.mark()
      })

      pull(
        pull.empty(),
        dialerConn,
        pull.onEnd((err) => {
          expect(err).to.not.exist.mark()
        })
      )
      pull(
        pull.empty(),
        listenerConn,
        pull.onEnd((err) => {
          expect(err).to.not.exist.mark()
        })
      )
    })

    it('Open a stream on one side, write, open a stream in the other side', (done) => {
      const p = pair()
      const dialer = muxer.dial(p[0])
      const listener = muxer.listen(p[1])

      expect(6).check(done).mark()

      const dialerConn = dialer.newStream((err) => {
        expect(err).to.not.exist.mark()
      })

      pull(
        pull.values(['hey']),
        dialerConn
      )

      listener.on('stream', (stream) => {
        pull(
          stream,
          pull.collect((err, chunks) => {
            expect(err).to.not.exist.mark()
            expect(chunks).to.be.eql([Buffer('hey')]).mark()
          })
        )

        const listenerConn = listener.newStream((err) => {
          expect(err).to.not.exist.mark()
        })

        pull(
          pull.values(['hello']),
          listenerConn
        )

        dialer.on('stream', onDialerStream)
        function onDialerStream (stream) {
          pull(
            stream,
            pull.collect((err, chunks) => {
              expect(err).to.not.exist.mark()
              expect(chunks).to.be.eql([Buffer('hello')]).mark()
            })
          )
        }
      })
    })
  })
}
