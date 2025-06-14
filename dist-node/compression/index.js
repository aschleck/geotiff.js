"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.preferWorker = exports.getDecoder = exports.addDecoder = void 0;
const registry = new Map();
const preferWorkerMap = new Map();
/**
 * Either a number or undefined.
 * @typedef {(number|undefined)} NumberOrUndefined
 */
/**
 * Register a decoder for a specific compression method or a range of compressions
 * @param {(NumberOrUndefined|(NumberOrUndefined[]))} cases ids of the compression methods to register for
 * @param {function():Promise} importFn the function to import the decoder
 * @param {boolean} preferWorker_ Whether to prefer running the decoder in a worker
 */
function addDecoder(cases, importFn, preferWorker_ = true) {
    if (!Array.isArray(cases)) {
        cases = [cases]; // eslint-disable-line no-param-reassign
    }
    cases.forEach((c) => {
        registry.set(c, importFn);
        preferWorkerMap.set(c, preferWorker_);
    });
}
exports.addDecoder = addDecoder;
/**
 * Get a decoder for a specific file directory
 * @param {object} fileDirectory the file directory of the image
 * @returns {Promise<Decoder>}
 */
async function getDecoder(fileDirectory) {
    const importFn = registry.get(fileDirectory.Compression);
    if (!importFn) {
        throw new Error(`Unknown compression method identifier: ${fileDirectory.Compression}`);
    }
    const Decoder = await importFn();
    return new Decoder(fileDirectory);
}
exports.getDecoder = getDecoder;
/**
 * Whether to prefer running the decoder in a worker
 * @param {object} fileDirectory the file directory of the image
 * @returns {boolean}
 */
function preferWorker(fileDirectory) {
    return preferWorkerMap.get(fileDirectory.Compression);
}
exports.preferWorker = preferWorker;
// Add default decoders to registry (end-user may override with other implementations)
addDecoder([undefined, 1], () => Promise.resolve().then(() => __importStar(require('./raw.js'))).then((m) => m.default), false);
addDecoder(5, () => Promise.resolve().then(() => __importStar(require('./lzw.js'))).then((m) => m.default));
addDecoder(6, () => {
    throw new Error('old style JPEG compression is not supported.');
});
addDecoder(7, () => Promise.resolve().then(() => __importStar(require('./jpeg.js'))).then((m) => m.default));
addDecoder([8, 32946], () => Promise.resolve().then(() => __importStar(require('./deflate.js'))).then((m) => m.default));
addDecoder(32773, () => Promise.resolve().then(() => __importStar(require('./packbits.js'))).then((m) => m.default));
addDecoder(34887, () => Promise.resolve().then(() => __importStar(require('./lerc.js'))).then(async (m) => {
    await m.zstd.init();
    return m;
})
    .then((m) => m.default));
addDecoder(50001, () => Promise.resolve().then(() => __importStar(require('./webimage.js'))).then((m) => m.default), false);
//# sourceMappingURL=index.js.map