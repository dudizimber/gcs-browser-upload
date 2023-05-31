export declare class InMemoryStorage implements Storage {
    private store;
    constructor();
    clear(): void;
    getItem(key: string): string | null;
    key(index: number): string | null;
    removeItem(key: string): void;
    setItem(key: string, value: string): void;
    get length(): number;
}
//# sourceMappingURL=InMemoryStorage.d.ts.map