"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryStorage = void 0;
class InMemoryStorage {
    constructor() {
        this.store = {};
        this.clear();
    }
    clear() {
        this.store = {};
    }
    getItem(key) {
        var _a;
        return (_a = this.store[key]) !== null && _a !== void 0 ? _a : null;
    }
    key(index) {
        var _a;
        const keys = Object.keys(this.store);
        return (_a = keys[index]) !== null && _a !== void 0 ? _a : null;
    }
    removeItem(key) {
        delete this.store[key];
    }
    setItem(key, value) {
        this.store[key] = value;
    }
    get length() {
        return Object.keys(this.store).length;
    }
}
exports.InMemoryStorage = InMemoryStorage;
