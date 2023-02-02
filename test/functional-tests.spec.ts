import localStorage from 'localStorage'
import { expect } from 'chai'
import randomString from 'random-string'
import Upload from '../src/Upload'
import { start, resetServer, stop, getRequests } from './lib/server'
import makeFile from './lib/makeFile'
import waitFor from './lib/waitFor'

require('babel-core/register')
require('babel-polyfill')

import chai from 'chai';

beforeAll(() => {

  global.window = {
    FileReader: require('filereader'),
    localStorage: require('localStorage')
  } as any;

  chai.use(require('sinon-chai'))
  chai.use(require('chai-as-promised'))
  chai.use(require('chai-subset'))

  process.on('unhandledRejection', function (err) {
    throw err
  })

});

let url = '';

describe('Functional', () => {
  beforeAll(() => start().then((u) => url = u))
  afterAll(stop)

  let upload: Upload | null = null;
  let file: any | null = null
  let requests: any[] = [];

  async function doUpload(length?: number, path?: string) {
    console.log('doUpload', length, path, url);

    if (!!length) {
      file = randomString({ length })
    }
    upload = new Upload({
      id: 'foo',
      url: url + (path || '/file'),
      chunkSize: 256,
      file: makeFile(file) as any,
    }, true)
    await upload.start()

    requests = getRequests()
    console.log('doUpload done', requests);
    return upload
  }

  function reset() {
    localStorage.clear()
    resetServer()
    if (upload) {
      upload.cancel()
      upload = null
    }
  }

  describe('a single-chunk upload', () => {
    beforeAll(() => doUpload(256))
    afterAll(reset)

    it('should only upload one chunk', () => {
      expect(requests).to.have.length(1)
    })

    it('should make a PUT request to the right URL', () => {
      expect(requests[0].method).to.equal('PUT')
      expect(requests[0].url).to.equal('/file')
    })

    it('should send the correct headers', () => {
      expect(requests[0].headers['content-length']).to.equal('256');
      expect(requests[0].headers['content-range']).to.equal('bytes 0-255/256');
    })

    it('should send the file in the body', () => {
      expect(requests[0].body).to.equal(file)
    })
  })

  describe('a multi-chunk upload', () => {
    beforeAll(() => doUpload(700))
    afterAll(reset)

    it('should upload multiple chunks', () => {
      expect(requests).to.have.length(3)
    })

    it('should make multiple PUT requests to the right URL', () => {
      requests.forEach((request) => {
        expect(request.method).to.equal('PUT')
        expect(request.url).to.equal('/file')
      })
    })

    it('should send the correct headers', () => {
      expect(requests[0].headers['content-length']).to.equal('256');
      expect(requests[0].headers['content-range']).to.equal('bytes 0-255/700');

      expect(requests[1].headers['content-length']).to.equal('256');
      expect(requests[1].headers['content-range']).to.equal('bytes 256-511/700');

      expect(requests[2].headers['content-length']).to.equal('188');
      expect(requests[2].headers['content-range']).to.equal('bytes 512-699/700');

    })

    it('should send a total content length identical to the upload file size', () => {
      const totalSize = requests.reduce((result, request) => {
        return result + parseInt(request.headers['content-length'])
      }, 0)
      expect(totalSize).to.equal(700)
    })

    it('should send the file in the body', () => {
      expect(requests[0].body).to.equal(file.substring(0, 256))
      expect(requests[1].body).to.equal(file.substring(256, 512))
      expect(requests[2].body).to.equal(file.substring(512, 701))
    })
  })

  describe('a paused then resumed upload', () => {
    afterAll(reset)

    let size = 0;
    it('should stop uploading after being paused', async () => {
      doUpload(500)
      await (() => new Promise((resolve) => setTimeout(resolve, 20)))();
      upload?.pause()
      console.log('paused');

      await waitFor(() => {
        requests = getRequests()
        return requests.length > 0 && requests.length < 3
      })
      size = requests.length;
      expect(size).to.lt(3)
      expect(size).to.gt(0)
      expect(requests[0].body).to.equal(file.substring(0, 256))
    })

    it('should check the server for status before resuming', async () => {
      await doUpload()
      console.log('resume', JSON.stringify(requests, null, 2));

      expect(requests[size].body).to.deep.equal({})
    })

    it('should send the rest of the chunks after being resumed', () => {
      expect(requests).to.have.length(3)
      expect(requests[requests.length - 1].body).to.equal(file.substring(256, 501))
    })
  })


  describe('an upload to a url that doesn\'t exist', () => {
    it('should throw a UrlNotFoundError', async () => {
      const res = await doUpload(200, '/notfound').catch(e => e)
      return expect(res).to.be.an.instanceof(Upload.errors.UrlNotFoundError)
    })
  })

  describe('an upload that results in a server error', () => {
    it('should throw an UploadFailedError', async () => {
      const res = await doUpload(200, '/file/fail').catch(e => e)
      return expect(res).to.be.an.instanceof(Upload.errors.UploadFailedError)
    })
  })
})
