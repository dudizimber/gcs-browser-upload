import { AxiosResponse } from 'axios';
export declare class DifferentChunkError extends Error {
    chunkIndex: number;
    originalChecksum: string;
    newChecksum: string;
    constructor(chunkIndex: number, originalChecksum: string, newChecksum: string);
}
export declare class FileAlreadyUploadedError extends Error {
    constructor(id: string, url: string);
}
export declare class UrlNotFoundError extends Error {
    constructor(url: string);
}
export declare class UploadFailedError extends Error {
    constructor(status: number);
}
export declare class UnknownResponseError extends Error {
    res: AxiosResponse<any, any>;
    constructor(res: AxiosResponse<any, any>);
}
export declare class MissingOptionsError extends Error {
    constructor();
}
export declare class UploadIncompleteError extends Error {
    constructor();
}
export declare class InvalidChunkSizeError extends Error {
    constructor(chunkSize: number);
}
export declare class UploadAlreadyFinishedError extends Error {
    constructor();
}
//# sourceMappingURL=errors.d.ts.map