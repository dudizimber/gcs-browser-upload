import * as errors from "./errors";
export interface IFileChunkUploadData {
    totalBytes: number;
    uploadedBytes: number;
    chunkIndex: number;
    chunkLength: number;
}
export interface IFileUploadOptions {
    chunkSize?: number;
    storage?: Storage;
    contentType?: string;
    onChunkUpload?: (data: IFileChunkUploadData) => void;
    id: string;
    url: string;
    file: File;
    metadata?: Map<string, string>;
    location?: string;
    skipGoogResumableHeader?: boolean;
}
export declare class FileUpload {
    static errors: typeof errors;
    private opts;
    private meta;
    private processor;
    private lastResult;
    private finished;
    constructor(args: IFileUploadOptions, allowSmallChunks?: boolean);
    start(): Promise<any>;
    pause(): void;
    unpause(): void;
    cancel(): void;
}
//# sourceMappingURL=FileUpload.d.ts.map