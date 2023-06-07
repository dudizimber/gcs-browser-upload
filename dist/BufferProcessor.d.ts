export declare class BufferProcessor {
    private paused;
    private buffer;
    private chunkSize;
    private unpauseHandlers;
    constructor(buffer: ArrayBuffer, chunkSize: number);
    run(fn: (checksum?: string, index?: number, chunk?: ArrayBuffer) => any, startIndex?: number, endIndex?: number): Promise<void>;
    pause(): void;
    unpause(): void;
}
//# sourceMappingURL=BufferProcessor.d.ts.map