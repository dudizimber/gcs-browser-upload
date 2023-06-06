import axios, { AxiosRequestConfig, AxiosResponse, isAxiosError } from "axios";
import { BufferProcessor } from "./BufferProcessor";
import { FileMeta } from "./FileMeta";
import { InMemoryStorage } from "./InMemoryStorage";
import debug from "./debug";
import * as errors from "./errors";
import {
  DifferentChunkError,
  FileAlreadyUploadedError,
  InvalidChunkSizeError,
  MissingOptionsError,
  UnknownResponseError,
  UploadAlreadyFinishedError,
  UploadFailedError,
  UploadIncompleteError,
  UrlNotFoundError,
} from "./errors";

const MIN_CHUNK_SIZE = 262144;

export interface IChunkUploadData {
  totalBytes: number;
  uploadedBytes: number;
  chunkIndex: number;
  chunkLength: number;
}

export interface IBufferUploadOptions {
  chunkSize?: number;
  storage?: Storage;
  contentType?: string;
  onChunkUpload?: (data: IChunkUploadData) => void;
  id: string;
  url: string;
  buffer: ArrayBuffer;
  metadata?: Map<string, string>;
  location?: string;
  skipGoogResumableHeader?: boolean;
}

export class BufferUpload {
  static errors = errors;

  private opts: IBufferUploadOptions;
  private meta: FileMeta;
  private processor: BufferProcessor;
  private lastResult: any;

  private finished = false;

  constructor(args: IBufferUploadOptions, allowSmallChunks = false) {
    const opts: IBufferUploadOptions = {
      chunkSize: MIN_CHUNK_SIZE,
      storage:
        args.storage ??
        (() => {
          try {
            return window?.localStorage;
          } catch (error) {
            return new InMemoryStorage();
          }
        })(),
      contentType: "text/plain",
      onChunkUpload: () => {
        /** */
      },
      id: null,
      url: null,
      buffer: null,
      metadata: null,
      ...args,
    };

    if (
      (opts.chunkSize % MIN_CHUNK_SIZE !== 0 || opts.chunkSize === 0) &&
      !allowSmallChunks
    ) {
      throw new InvalidChunkSizeError(opts.chunkSize);
    }

    if (!opts.id || !opts.url || !opts.buffer) {
      throw new MissingOptionsError();
    }

    debug("Creating new upload instance:");
    debug(` - Url: ${opts.url}`);
    debug(` - Id: ${opts.id}`);
    debug(` - File size: ${opts.buffer.byteLength}`);
    debug(` - Chunk size: ${opts.chunkSize}`);

    this.opts = opts;
    this.meta = new FileMeta(
      opts.id,
      opts.buffer.byteLength,
      opts.chunkSize,
      opts.storage
    );
    this.processor = new BufferProcessor(opts.buffer, opts.chunkSize);
    this.lastResult = null;
  }

  async start() {
    const { meta, processor, opts, finished } = this;

    const resumeUpload = async () => {
      const localResumeIndex = meta.getResumeIndex();
      const remoteResumeIndex = await getRemoteResumeIndex();

      const resumeIndex = Math.min(localResumeIndex, remoteResumeIndex);
      debug(`Validating chunks up to index ${resumeIndex}`);
      debug(` - Remote index: ${remoteResumeIndex}`);
      debug(` - Local index: ${localResumeIndex}`);

      try {
        await processor.run(validateChunk, 0, resumeIndex);
      } catch (e) {
        debug("Validation failed, starting from scratch");
        debug(` - Failed chunk index: ${e.chunkIndex}`);
        debug(` - Old checksum: ${e.originalChecksum}`);
        debug(` - New checksum: ${e.newChecksum}`);

        await processor.run(uploadChunk);
        return;
      }

      debug("Validation passed, resuming upload");
      await processor.run(uploadChunk, resumeIndex);
    };

    const uploadChunk = async (
      checksum: string,
      index: number,
      chunk: ArrayBuffer
    ) => {
      const total = opts.buffer.byteLength;
      const start = index * opts.chunkSize;
      const end = index * opts.chunkSize + chunk.byteLength - 1;

      const headers = {
        "Content-Type": opts.contentType,
        "Content-Range": `bytes ${start}-${end}/${total}`,
        "x-goog-resumable": "start",
      };
      if (opts.skipGoogResumableHeader) {
        delete headers["x-goog-resumable"];
      }

      if (opts.metadata) {
        for (const h of opts.metadata.entries ? opts.metadata.entries() : []) {
          headers[`x-goog-meta-${h[0]}`] = h[1];
        }
      }

      debug(`Uploading chunk ${index}:`);
      debug(` - Chunk length: ${chunk.byteLength}`);
      debug(` - Start: ${start}`);
      debug(` - End: ${end}`);

      const res = await safePut(
        opts.location ? opts.location : opts.url,
        chunk,
        { headers }
      );
      this.lastResult = res;
      checkResponseStatus(res, opts, [200, 201, 308]);
      debug(`Chunk upload succeeded, adding checksum ${checksum}`);
      meta.addChecksum(index, checksum);

      opts.onChunkUpload({
        totalBytes: total,
        uploadedBytes: end + 1,
        chunkIndex: index,
        chunkLength: chunk.byteLength,
      });
    };

    const validateChunk = async (newChecksum: string, index: number) => {
      const originalChecksum = meta.getChecksum(index);
      const isChunkValid = originalChecksum === newChecksum;
      if (!isChunkValid) {
        meta.reset();
        throw new DifferentChunkError(index, originalChecksum, newChecksum);
      }
    };

    const getRemoteResumeIndex = async () => {
      const headers = {
        "Content-Range": `bytes */${opts.buffer.byteLength}`,
      };
      debug("Retrieving upload status from GCS");
      const res = await safePut(opts.url, null, { headers });

      checkResponseStatus(res, opts, [308]);
      const header = res.headers["range"];
      debug(`Received upload status from GCS: ${header}`);
      const range = header.match(/(\d+?)-(\d+?)$/);
      const bytesReceived = parseInt(range[2]) + 1;
      return Math.floor(bytesReceived / opts.chunkSize);
    };

    if (finished) {
      throw new UploadAlreadyFinishedError();
    }

    if (meta.isResumable() && meta.getFileSize() === opts.buffer.byteLength) {
      debug("Upload might be resumable");
      await resumeUpload();
    } else {
      debug("Upload not resumable, starting from scratch");
      const headers = {
        "x-goog-resumable": "start",
        "Content-Type": opts.contentType,
      };
      if (opts.skipGoogResumableHeader) {
        delete headers["x-goog-resumable"];
      }

      if (opts.metadata) {
        for (const h of opts.metadata.entries ? opts.metadata.entries() : []) {
          headers[`x-goog-meta-${h[0]}`] = h[1];
        }
      }
      const res = await safePost(opts.url, null, { headers: headers });
      opts.location = res.headers.location;
      await processor.run(uploadChunk);
    }
    debug("Upload complete, resetting meta");
    meta.reset();
    this.finished = true;
    return this.lastResult;
  }

  pause() {
    this.processor.pause();
    debug("Upload paused");
  }

  unpause() {
    this.processor.unpause();
    debug("Upload unpaused");
  }

  cancel() {
    this.processor.pause();
    this.meta.reset();
    debug("Upload cancelled");
  }
}

function checkResponseStatus(
  res: AxiosResponse,
  opts: IBufferUploadOptions,
  allowed = []
) {
  console.log("checkResponseStatus", res.status);

  const { status } = res;
  if (allowed.indexOf(status) > -1) {
    return true;
  }

  switch (status) {
    case 308:
      throw new UploadIncompleteError();

    case 201:
    case 200:
      throw new FileAlreadyUploadedError(opts.id, opts.url);

    case 404:
      throw new UrlNotFoundError(opts.url);

    case 500:
    case 502:
    case 503:
    case 504:
      throw new UploadFailedError(status);

    default:
      throw new UnknownResponseError(res);
  }
}

async function safePut(url: string, data: any, config: AxiosRequestConfig) {
  try {
    return await axios.put(url, data, config);
  } catch (e) {
    if (isAxiosError(e)) {
      return e.response;
    }
    if (e instanceof Error) {
      throw e;
    }
  }
}

async function safePost(url: string, data: any, config: AxiosRequestConfig) {
  try {
    console.log("safePost", url, data, config);

    const d = await axios.post(url, data, config);
    console.log("safePost d", d);
    return d;
  } catch (e) {
    console.log("safePost error", e);

    if (isAxiosError(e)) {
      return e.response;
    }
    if (e instanceof Error) {
      throw e;
    }
  }
}
