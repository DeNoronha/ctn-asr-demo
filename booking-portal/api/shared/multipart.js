"use strict";
/**
 * Multipart form data parser for Azure Functions
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseMultipartForm = parseMultipartForm;
const busboy_1 = __importDefault(require("busboy"));
const stream_1 = require("stream");
/**
 * Parse multipart form-data from Azure Function HTTP request
 */
async function parseMultipartForm(req) {
    return new Promise((resolve, reject) => {
        const contentType = req.headers['content-type'] || req.headers['Content-Type'];
        if (!contentType || !contentType.includes('multipart/form-data')) {
            resolve(null);
            return;
        }
        const busboy = (0, busboy_1.default)({ headers: { 'content-type': contentType } });
        let fileData = null;
        // Handle file upload
        busboy.on('file', (fieldname, file, info) => {
            const { filename, encoding, mimeType } = info;
            const chunks = [];
            file.on('data', (chunk) => {
                chunks.push(chunk);
            });
            file.on('end', () => {
                fileData = {
                    buffer: Buffer.concat(chunks),
                    filename,
                    mimeType
                };
            });
        });
        // Handle completion
        busboy.on('finish', () => {
            resolve(fileData);
        });
        // Handle errors
        busboy.on('error', (error) => {
            reject(error);
        });
        // Convert request body to stream and pipe to busboy
        const body = req.body;
        if (Buffer.isBuffer(body)) {
            // Body is already a buffer (with dataType: "binary")
            const stream = stream_1.Readable.from(body);
            stream.pipe(busboy);
        }
        else if (typeof body === 'string') {
            // Body is a string, convert to buffer
            const stream = stream_1.Readable.from(Buffer.from(body, 'utf-8'));
            stream.pipe(busboy);
        }
        else {
            reject(new Error('Unsupported body type'));
        }
    });
}
//# sourceMappingURL=multipart.js.map