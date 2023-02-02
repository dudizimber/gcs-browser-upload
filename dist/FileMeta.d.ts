export default class FileMeta {
    id: string;
    fileSize: number;
    chunkSize: number;
    storage: Storage;
    constructor(id: string, fileSize: number, chunkSize: number, storage: Storage);
    getMeta(): any;
    setMeta(meta: any): void;
    isResumable(): boolean;
    getResumeIndex(): any;
    getFileSize(): any;
    addChecksum(index: number, checksum: string): void;
    getChecksum(index: number): any;
    reset(): void;
}
//# sourceMappingURL=FileMeta.d.ts.map