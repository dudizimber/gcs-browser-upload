import * as errors from './errors';
export interface IChunkUploadData {
    totalBytes: number;
    uploadedBytes: number;
    chunkIndex: number;
    chunkLength: number;
}
export interface IUploadOptions {
    chunkSize?: number;
    storage?: Storage;
    contentType?: string;
    onChunkUpload?: (data: IChunkUploadData) => void;
    id: string;
    url: string;
    file: File;
    metadata?: Map<string, string>;
    location?: string;
}
export declare class Upload {
    static errors: typeof errors;
    private opts;
    private meta;
    private processor;
    private lastResult;
    private finished;
    constructor(args: IUploadOptions, allowSmallChunks?: boolean);
    start(): Promise<any>;
    pause(): void;
    unpause(): void;
    cancel(): void;
}
//# sourceMappingURL=Upload.d.ts.map