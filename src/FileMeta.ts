const STORAGE_KEY = '__gcsBrowserUpload'

export class FileMeta {
  id: string
  fileSize: number
  chunkSize: number
  storage: Storage

  constructor(id: string, fileSize: number, chunkSize: number, storage: Storage) {
    this.id = id
    this.fileSize = fileSize
    this.chunkSize = chunkSize
    this.storage = storage
  }

  getMeta() {
    const meta = this.storage.getItem(`${STORAGE_KEY}.${this.id}`)
    if (meta) {
      return JSON.parse(meta)
    } else {
      return {
        checksums: [],
        chunkSize: this.chunkSize,
        started: false,
        fileSize: this.fileSize
      }
    }
  }

  setMeta(meta: any) {
    const key = `${STORAGE_KEY}.${this.id}`
    if (meta) {
      this.storage.setItem(key, JSON.stringify(meta))
    } else {
      this.storage.removeItem(key)
    }
  }

  isResumable() {
    let meta = this.getMeta()
    return meta.started && this.chunkSize === meta.chunkSize
  }

  getResumeIndex() {
    return this.getMeta().checksums.length
  }

  getFileSize() {
    return this.getMeta().fileSize
  }

  addChecksum(index: number, checksum: string) {
    let meta = this.getMeta()
    meta.checksums[index] = checksum
    meta.started = true
    this.setMeta(meta)
  }

  getChecksum(index: number) {
    return this.getMeta().checksums[index]
  }

  reset() {
    this.setMeta(null)
  }
}
