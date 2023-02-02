"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadAlreadyFinishedError = exports.InvalidChunkSizeError = exports.UploadIncompleteError = exports.MissingOptionsError = exports.UnknownResponseError = exports.UploadFailedError = exports.UrlNotFoundError = exports.FileAlreadyUploadedError = exports.DifferentChunkError = void 0;
class DifferentChunkError extends Error {
    constructor(chunkIndex, originalChecksum, newChecksum) {
        super(`Chunk at index '${chunkIndex}' is different to original`);
        this.chunkIndex = chunkIndex;
        this.originalChecksum = originalChecksum;
        this.newChecksum = newChecksum;
    }
}
exports.DifferentChunkError = DifferentChunkError;
class FileAlreadyUploadedError extends Error {
    constructor(id, url) {
        super(`File '${id}' has already been uploaded to unique url '${url}'`);
    }
}
exports.FileAlreadyUploadedError = FileAlreadyUploadedError;
class UrlNotFoundError extends Error {
    constructor(url) {
        super(`Upload URL '${url}' has either expired or is invalid`);
    }
}
exports.UrlNotFoundError = UrlNotFoundError;
class UploadFailedError extends Error {
    constructor(status) {
        super(`HTTP status ${status} received from GCS, consider retrying`);
    }
}
exports.UploadFailedError = UploadFailedError;
class UnknownResponseError extends Error {
    constructor(res) {
        super('Unknown response received from GCS');
        this.res = res;
    }
}
exports.UnknownResponseError = UnknownResponseError;
class MissingOptionsError extends Error {
    constructor() {
        super('Missing options for Upload');
    }
}
exports.MissingOptionsError = MissingOptionsError;
class UploadIncompleteError extends Error {
    constructor() {
        super('Upload is not complete');
    }
}
exports.UploadIncompleteError = UploadIncompleteError;
class InvalidChunkSizeError extends Error {
    constructor(chunkSize) {
        super(`Invalid chunk size ${chunkSize}, must be a multiple of 262144`);
    }
}
exports.InvalidChunkSizeError = InvalidChunkSizeError;
class UploadAlreadyFinishedError extends Error {
    constructor() {
        super('Upload instance has already finished');
    }
}
exports.UploadAlreadyFinishedError = UploadAlreadyFinishedError;
