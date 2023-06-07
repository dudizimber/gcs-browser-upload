import * as errors from "./errors";
export interface IBufferChunkUploadData {
    totalBytes: number;
    uploadedBytes: number;
    chunkIndex: number;
    chunkLength: number;
}
export interface IBufferUploadOptions {
    chunkSize?: number;
    storage?: Storage;
    contentType?: string;
    onChunkUpload?: (data: IBufferChunkUploadData) => void;
    id: string;
    url: string;
    buffer: ArrayBuffer;
    metadata?: Map<string, string>;
    location?: string;
    skipGoogResumableHeader?: boolean;
}
export declare class BufferUpload {
    static errors: typeof errors;
    private opts;
    private meta;
    private processor;
    private lastResult;
    private finished;
    constructor(args: IBufferUploadOptions, allowSmallChunks?: boolean);
    start(): Promise<any>;
    pause(): void;
    unpause(): void;
    cancel(): void;
}
//# sourceMappingURL=BufferUpload.d.ts.map