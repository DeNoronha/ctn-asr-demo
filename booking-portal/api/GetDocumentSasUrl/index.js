"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storage_blob_1 = require("@azure/storage-blob");
const auth_1 = require("../shared/auth");
// Environment variables
const STORAGE_ACCOUNT_NAME = process.env.STORAGE_ACCOUNT_NAME;
const STORAGE_ACCOUNT_KEY = process.env.STORAGE_ACCOUNT_KEY;
const STORAGE_CONTAINER_NAME = process.env.STORAGE_CONTAINER_NAME || 'documents';
const httpTrigger = async function (context, req) {
    context.log('GetDocumentSasUrl triggered');
    try {
        // Authenticate user
        const user = await (0, auth_1.getUserFromRequest)(context, req);
        if (!user) {
            context.res = {
                status: 401,
                body: { error: 'Unauthorized', message: 'Valid authentication token required' }
            };
            return;
        }
        context.log(`Authenticated user: ${user.email}`);
        const documentId = context.bindingData.documentId;
        if (!documentId) {
            context.res = {
                status: 400,
                body: { error: 'Bad request', message: 'Document ID required' }
            };
            return;
        }
        // Validate environment variables
        if (!STORAGE_ACCOUNT_NAME || !STORAGE_ACCOUNT_KEY) {
            throw new Error('Storage Account credentials not configured');
        }
        // Generate SAS URL
        const blobName = `${documentId}.pdf`;
        const sharedKeyCredential = new storage_blob_1.StorageSharedKeyCredential(STORAGE_ACCOUNT_NAME, STORAGE_ACCOUNT_KEY);
        // Set SAS token to expire in 1 hour
        const expiresOn = new Date();
        expiresOn.setHours(expiresOn.getHours() + 1);
        const sasOptions = {
            containerName: STORAGE_CONTAINER_NAME,
            blobName: blobName,
            permissions: storage_blob_1.BlobSASPermissions.parse("r"), // Read-only
            startsOn: new Date(),
            expiresOn: expiresOn,
        };
        const sasToken = (0, storage_blob_1.generateBlobSASQueryParameters)(sasOptions, sharedKeyCredential).toString();
        const sasUrl = `https://${STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${STORAGE_CONTAINER_NAME}/${blobName}?${sasToken}`;
        context.log(`Generated SAS URL for document ${documentId}, expires at ${expiresOn.toISOString()}`);
        context.res = {
            status: 200,
            body: {
                documentId,
                sasUrl,
                expiresOn: expiresOn.toISOString()
            },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
    catch (error) {
        context.log.error('Error in GetDocumentSasUrl:', error);
        context.res = {
            status: 500,
            body: { error: 'Internal server error', message: error.message },
            headers: {
                'Content-Type': 'application/json'
            }
        };
    }
};
exports.default = httpTrigger;
//# sourceMappingURL=index.js.map