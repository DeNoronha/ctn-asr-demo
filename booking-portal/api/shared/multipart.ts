/**
 * Multipart form data parser for Azure Functions
 */

import { HttpRequest } from "@azure/functions";
import Busboy from "busboy";
import { Readable } from "stream";

export interface FileUpload {
    buffer: Buffer;
    filename: string;
    mimeType: string;
}

/**
 * Parse multipart form-data from Azure Function HTTP request
 */
export async function parseMultipartForm(req: HttpRequest): Promise<FileUpload | null> {
    return new Promise((resolve, reject) => {
        const contentType = req.headers['content-type'] || req.headers['Content-Type'];

        if (!contentType || !contentType.includes('multipart/form-data')) {
            resolve(null);
            return;
        }

        const busboy = Busboy({ headers: { 'content-type': contentType } });
        let fileData: FileUpload | null = null;

        // Handle file upload
        busboy.on('file', (fieldname: string, file: any, info: any) => {
            const { filename, encoding, mimeType } = info;
            const chunks: Buffer[] = [];

            file.on('data', (chunk: Buffer) => {
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
        busboy.on('error', (error: Error) => {
            reject(error);
        });

        // Convert request body to stream and pipe to busboy
        const body = req.body;
        if (Buffer.isBuffer(body)) {
            // Body is already a buffer (with dataType: "binary")
            const stream = Readable.from(body);
            stream.pipe(busboy);
        } else if (typeof body === 'string') {
            // Body is a string, convert to buffer
            const stream = Readable.from(Buffer.from(body, 'utf-8'));
            stream.pipe(busboy);
        } else {
            reject(new Error('Unsupported body type'));
        }
    });
}
