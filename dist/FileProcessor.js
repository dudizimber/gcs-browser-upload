"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const spark_md5_1 = __importDefault(require("spark-md5"));
const debug_1 = __importDefault(require("./debug"));
class FileProcessor {
    constructor(file, chunkSize) {
        this.paused = false;
        this.file = file;
        this.chunkSize = chunkSize;
        this.unpauseHandlers = [];
    }
    run(fn, startIndex = 0, endIndex) {
        return __awaiter(this, void 0, void 0, function* () {
            const { file, chunkSize } = this;
            const totalChunks = Math.ceil(file.size / chunkSize);
            let spark = new spark_md5_1.default.ArrayBuffer();
            (0, debug_1.default)('Starting run on file:');
            (0, debug_1.default)(` - Total chunks: ${totalChunks}`);
            (0, debug_1.default)(` - Start index: ${startIndex}`);
            (0, debug_1.default)(` - End index: ${endIndex || totalChunks}`);
            const processIndex = (index) => __awaiter(this, void 0, void 0, function* () {
                if (index === totalChunks || index === endIndex) {
                    (0, debug_1.default)('File process complete');
                    return true;
                }
                if (this.paused) {
                    yield waitForUnpause();
                }
                const start = index * chunkSize;
                const section = file.slice(start, start + chunkSize);
                const chunk = yield getData(file, section);
                const checksum = getChecksum(spark, chunk);
                const shouldContinue = yield fn(checksum, index, chunk);
                if (shouldContinue !== false) {
                    return processIndex(index + 1);
                }
                return false;
            });
            const waitForUnpause = () => {
                return new Promise((resolve) => {
                    this.unpauseHandlers.push(resolve);
                });
            };
            yield processIndex(startIndex);
        });
    }
    pause() {
        this.paused = true;
    }
    unpause() {
        this.paused = false;
        this.unpauseHandlers.forEach((fn) => fn());
        this.unpauseHandlers = [];
    }
}
function getChecksum(spark, chunk) {
    spark.append(chunk);
    const state = spark.getState();
    const checksum = spark.end();
    spark.setState(state);
    return checksum;
}
function getData(file, blob) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            let reader = new window.FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsArrayBuffer(blob);
        });
    });
}
exports.default = FileProcessor;
