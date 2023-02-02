import { AxiosResponse } from 'axios'

export class DifferentChunkError extends Error {

  chunkIndex: number
  originalChecksum: string
  newChecksum: string

  constructor(chunkIndex: number, originalChecksum: string, newChecksum: string) {
    super(`Chunk at index '${chunkIndex}' is different to original`)
    this.chunkIndex = chunkIndex
    this.originalChecksum = originalChecksum
    this.newChecksum = newChecksum
  }
}

export class FileAlreadyUploadedError extends Error {
  constructor(id: string, url: string) {
    super(`File '${id}' has already been uploaded to unique url '${url}'`)
  }
}

export class UrlNotFoundError extends Error {
  constructor(url: string) {
    super(`Upload URL '${url}' has either expired or is invalid`)
  }
}

export class UploadFailedError extends Error {
  constructor(status: number) {
    super(`HTTP status ${status} received from GCS, consider retrying`)
  }
}

export class UnknownResponseError extends Error {

  res: AxiosResponse<any, any>

  constructor(res: AxiosResponse<any, any>) {
    super('Unknown response received from GCS')
    this.res = res
  }
}

export class MissingOptionsError extends Error {
  constructor() {
    super('Missing options for Upload')
  }
}

export class UploadIncompleteError extends Error {
  constructor() {
    super('Upload is not complete')
  }
}

export class InvalidChunkSizeError extends Error {
  constructor(chunkSize: number) {
    super(`Invalid chunk size ${chunkSize}, must be a multiple of 262144`)
  }
}

export class UploadAlreadyFinishedError extends Error {
  constructor() {
    super('Upload instance has already finished')
  }
}
