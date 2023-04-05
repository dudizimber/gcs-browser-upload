"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Upload = void 0;
const axios_1 = __importStar(require("axios"));
const FileMeta_1 = require("./FileMeta");
const FileProcessor_1 = require("./FileProcessor");
const debug_1 = __importDefault(require("./debug"));
const errors_1 = require("./errors");
const errors = __importStar(require("./errors"));
const MIN_CHUNK_SIZE = 262144;
class Upload {
    constructor(args, allowSmallChunks = false) {
        this.finished = false;
        const opts = Object.assign({ chunkSize: MIN_CHUNK_SIZE, storage: window.localStorage, contentType: 'text/plain', onChunkUpload: () => { }, id: null, url: null, file: null, metadata: null }, args);
        if ((opts.chunkSize % MIN_CHUNK_SIZE !== 0 || opts.chunkSize === 0) && !allowSmallChunks) {
            throw new errors_1.InvalidChunkSizeError(opts.chunkSize);
        }
        if (!opts.id || !opts.url || !opts.file) {
            throw new errors_1.MissingOptionsError();
        }
        (0, debug_1.default)('Creating new upload instance:');
        (0, debug_1.default)(` - Url: ${opts.url}`);
        (0, debug_1.default)(` - Id: ${opts.id}`);
        (0, debug_1.default)(` - File size: ${opts.file.size}`);
        (0, debug_1.default)(` - Chunk size: ${opts.chunkSize}`);
        this.opts = opts;
        this.meta = new FileMeta_1.FileMeta(opts.id, opts.file.size, opts.chunkSize, opts.storage);
        this.processor = new FileProcessor_1.FileProcessor(opts.file, opts.chunkSize);
        this.lastResult = null;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            const { meta, processor, opts, finished } = this;
            const resumeUpload = () => __awaiter(this, void 0, void 0, function* () {
                const localResumeIndex = meta.getResumeIndex();
                const remoteResumeIndex = yield getRemoteResumeIndex();
                const resumeIndex = Math.min(localResumeIndex, remoteResumeIndex);
                (0, debug_1.default)(`Validating chunks up to index ${resumeIndex}`);
                (0, debug_1.default)(` - Remote index: ${remoteResumeIndex}`);
                (0, debug_1.default)(` - Local index: ${localResumeIndex}`);
                try {
                    yield processor.run(validateChunk, 0, resumeIndex);
                }
                catch (e) {
                    (0, debug_1.default)('Validation failed, starting from scratch');
                    (0, debug_1.default)(` - Failed chunk index: ${e.chunkIndex}`);
                    (0, debug_1.default)(` - Old checksum: ${e.originalChecksum}`);
                    (0, debug_1.default)(` - New checksum: ${e.newChecksum}`);
                    yield processor.run(uploadChunk);
                    return;
                }
                (0, debug_1.default)('Validation passed, resuming upload');
                yield processor.run(uploadChunk, resumeIndex);
            });
            const uploadChunk = (checksum, index, chunk) => __awaiter(this, void 0, void 0, function* () {
                const total = opts.file.size;
                const start = index * opts.chunkSize;
                const end = index * opts.chunkSize + chunk.byteLength - 1;
                const headers = {
                    'Content-Type': opts.contentType,
                    'Content-Range': `bytes ${start}-${end}/${total}`,
                    'x-goog-resumable': 'start'
                };
                if (opts.metadata) {
                    for (const h of (opts.metadata.entries ? opts.metadata.entries() : [])) {
                        headers[`x-goog-meta-${h[0]}`] = h[1];
                    }
                }
                (0, debug_1.default)(`Uploading chunk ${index}:`);
                (0, debug_1.default)(` - Chunk length: ${chunk.byteLength}`);
                (0, debug_1.default)(` - Start: ${start}`);
                (0, debug_1.default)(` - End: ${end}`);
                const res = yield safePut(opts.location ? opts.location : opts.url, chunk, { headers });
                this.lastResult = res;
                checkResponseStatus(res, opts, [200, 201, 308]);
                (0, debug_1.default)(`Chunk upload succeeded, adding checksum ${checksum}`);
                meta.addChecksum(index, checksum);
                opts.onChunkUpload({
                    totalBytes: total,
                    uploadedBytes: end + 1,
                    chunkIndex: index,
                    chunkLength: chunk.byteLength
                });
            });
            const validateChunk = (newChecksum, index) => __awaiter(this, void 0, void 0, function* () {
                const originalChecksum = meta.getChecksum(index);
                const isChunkValid = originalChecksum === newChecksum;
                if (!isChunkValid) {
                    meta.reset();
                    throw new errors_1.DifferentChunkError(index, originalChecksum, newChecksum);
                }
            });
            const getRemoteResumeIndex = () => __awaiter(this, void 0, void 0, function* () {
                const headers = {
                    'Content-Range': `bytes */${opts.file.size}`
                };
                (0, debug_1.default)('Retrieving upload status from GCS');
                const res = yield safePut(opts.url, null, { headers });
                checkResponseStatus(res, opts, [308]);
                const header = res.headers['range'];
                (0, debug_1.default)(`Received upload status from GCS: ${header}`);
                const range = header.match(/(\d+?)-(\d+?)$/);
                const bytesReceived = parseInt(range[2]) + 1;
                return Math.floor(bytesReceived / opts.chunkSize);
            });
            if (finished) {
                throw new errors_1.UploadAlreadyFinishedError();
            }
            if (meta.isResumable() && meta.getFileSize() === opts.file.size) {
                (0, debug_1.default)('Upload might be resumable');
                yield resumeUpload();
            }
            else {
                (0, debug_1.default)('Upload not resumable, starting from scratch');
                const headers = {
                    'x-goog-resumable': 'start',
                    'Content-Type': opts.contentType,
                };
                if (opts.metadata) {
                    for (const h of (opts.metadata.entries ? opts.metadata.entries() : [])) {
                        headers[`x-goog-meta-${h[0]}`] = h[1];
                    }
                }
                const res = yield safePost(opts.url, null, { headers: headers });
                opts.location = res.headers.location;
                yield processor.run(uploadChunk);
            }
            (0, debug_1.default)('Upload complete, resetting meta');
            meta.reset();
            this.finished = true;
            return this.lastResult;
        });
    }
    pause() {
        this.processor.pause();
        (0, debug_1.default)('Upload paused');
    }
    unpause() {
        this.processor.unpause();
        (0, debug_1.default)('Upload unpaused');
    }
    cancel() {
        this.processor.pause();
        this.meta.reset();
        (0, debug_1.default)('Upload cancelled');
    }
}
exports.Upload = Upload;
Upload.errors = errors;
function checkResponseStatus(res, opts, allowed = []) {
    console.log('checkResponseStatus', res.status);
    const { status } = res;
    if (allowed.indexOf(status) > -1) {
        return true;
    }
    switch (status) {
        case 308:
            throw new errors_1.UploadIncompleteError();
        case 201:
        case 200:
            throw new errors_1.FileAlreadyUploadedError(opts.id, opts.url);
        case 404:
            throw new errors_1.UrlNotFoundError(opts.url);
        case 500:
        case 502:
        case 503:
        case 504:
            throw new errors_1.UploadFailedError(status);
        default:
            throw new errors_1.UnknownResponseError(res);
    }
}
function safePut(url, data, config) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield axios_1.default.put(url, data, config);
        }
        catch (e) {
            if ((0, axios_1.isAxiosError)(e)) {
                return e.response;
            }
            if (e instanceof Error) {
                throw e;
            }
        }
    });
}
function safePost(url, data, config) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('safePost', url, data, config);
            const d = yield axios_1.default.post(url, data, config);
            console.log('safePost d', d);
            return d;
        }
        catch (e) {
            console.log('safePost error', e);
            if ((0, axios_1.isAxiosError)(e)) {
                return e.response;
            }
            if (e instanceof Error) {
                throw e;
            }
        }
    });
}
