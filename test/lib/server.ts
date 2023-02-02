import axios from 'axios'
import express from 'express'
import getPort from 'get-port'
import pify from 'pify'
import bodyParser from 'body-parser'

let server: any = null
let requests: any[] = []
let file: any | null = null
const router = express.Router();

router.use(bodyParser.text())

router.use((req, res, next) => {
  console.log('router.use', req.method, req.url, req.headers, req.body);
  next()
})

router.use((req, res, next) => {
  const range = req.headers['content-range'];
  const matchKnown = range?.match(/^bytes (\d+?)-(\d+?)\/(\d+?)$/)
  const matchUnknown = range?.match(/^bytes \*\/(\d+?)$/)

  if (req.method === 'POST') {
    next()
    return;
  }

  if (matchUnknown) {
    req.range = {
      known: false,
      total: parseInt(matchUnknown[1])
    } as any;
    next()
  } else if (matchKnown) {
    req.range = {
      known: true,
      start: parseInt(matchKnown[1]),
      end: parseInt(matchKnown[2]),
      total: parseInt(matchKnown[3])
    } as any;
    console.log('req.range', req.range);
    next()
  } else {
    res.status(400).send('No valid content-range header provided')
  }
})


router.post('/', (req, res) => {

  res.header('location', '/file')

  res.send();

});

router.use((req, res, next) => {
  requests.push({
    method: req.method,
    url: req.originalUrl,
    headers: req.headers,
    body: req.body
  })
  next()
})

router.put('/', (req, res) => {
  if (!file) {
    file = {
      total: (req.range as any).total,
      index: 0
    }
  }

  if ((req.range as any).known) {
    file.index = (req.range as any).end
  }
  res.set('range', `bytes=0-${file.index}`)
  if (file.index + 1 === file.total) {
    res.send(200).send('OK')
  } else {
    res.status(308).send('Resume Incomplete')
  }
})

router.put('/fail', (req, res) => {
  res.status(500).send('Internal Server Error')
})

router.use('**', (req, res) => { res.status(404).send('Not Found') })

export async function start() {
  return new Promise<string>(async (res) => {
    const port = await getPort()
    const app = express()
    app.use('/file', router)
    server = app.listen(port, () => {
      console.log('Server started on port', port);
      axios.defaults.baseURL = `http://localhost:${port}`;
      res(`http://localhost:${port}`)
    })

    server.on('error', (err: any) => { console.error('Server error', err) })
  })
}

export function resetServer() {
  requests = []
  file = null
}

export function stop() {
  if (server) {
    server.close()
    server = null
  }
}

export function getRequests() {
  return requests
}