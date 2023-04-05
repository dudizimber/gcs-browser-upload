import SparkMD5 from 'spark-md5'
import debug from './debug'

export class FileProcessor {

  private paused: boolean
  private file: File
  private chunkSize: number

  private unpauseHandlers: ((val?: any) => void)[]


  constructor(file: File, chunkSize: number) {
    this.paused = false
    this.file = file
    this.chunkSize = chunkSize
    this.unpauseHandlers = []
  }

  async run(fn: (checksum?: string, index?: number, chunk?: ArrayBuffer) => any, startIndex = 0, endIndex?: number) {
    const { file, chunkSize } = this
    const totalChunks = Math.ceil(file.size / chunkSize)
    let spark = new SparkMD5.ArrayBuffer()

    debug('Starting run on file:')
    debug(` - Total chunks: ${totalChunks}`)
    debug(` - Start index: ${startIndex}`)
    debug(` - End index: ${endIndex || totalChunks}`)

    const processIndex = async (index: number) => {
      if (index === totalChunks || index === endIndex) {
        debug('File process complete')
        return true
      }
      if (this.paused) {
        await waitForUnpause()
      }

      const start = index * chunkSize
      const section = file.slice(start, start + chunkSize)
      const chunk = await getData(file, section)
      const checksum = getChecksum(spark, chunk)

      const shouldContinue = await fn(checksum, index, chunk)
      if (shouldContinue !== false) {
        return processIndex(index + 1)
      }
      return false
    }

    const waitForUnpause = () => {
      return new Promise((resolve) => {
        this.unpauseHandlers.push(resolve)
      })
    }

    await processIndex(startIndex)
  }

  pause() {
    this.paused = true
  }

  unpause() {
    this.paused = false
    this.unpauseHandlers.forEach((fn: () => any) => fn())
    this.unpauseHandlers = []
  }
}

function getChecksum(spark: { append: (arg0: any) => void; getState: () => any; end: () => any; setState: (arg0: any) => void }, chunk: unknown) {
  spark.append(chunk)
  const state = spark.getState()
  const checksum = spark.end()
  spark.setState(state)
  return checksum
}

async function getData(file: any, blob: Blob) {
  return new Promise<ArrayBuffer>((resolve, reject) => {
    let reader = new window.FileReader()
    reader.onload = () => resolve(reader.result as ArrayBuffer)
    reader.onerror = reject
    reader.readAsArrayBuffer(blob)
  })
}

