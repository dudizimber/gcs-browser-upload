
export class InMemoryStorage implements Storage {

    private store: { [key: string]: string } = {}
    
    constructor() {
        this.clear()
    }
    
    clear(): void {
        this.store = {}
    }
    
    getItem(key: string): string | null {
        return this.store[key] ?? null
    }
    
    key(index: number): string | null {
        const keys = Object.keys(this.store)
        return keys[index] ?? null
    }
    
    removeItem(key: string): void {
        delete this.store[key]
    }
    
    setItem(key: string, value: string): void {
        this.store[key] = value
    }
    
    get length(): number {
        return Object.keys(this.store).length
    }

}