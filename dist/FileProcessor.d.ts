declare class FileProcessor {
    private paused;
    private file;
    private chunkSize;
    private unpauseHandlers;
    constructor(file: File, chunkSize: number);
    run(fn: (checksum?: string, index?: number, chunk?: ArrayBuffer) => any, startIndex?: number, endIndex?: number): Promise<void>;
    pause(): void;
    unpause(): void;
}
export default FileProcessor;
//# sourceMappingURL=FileProcessor.d.ts.map