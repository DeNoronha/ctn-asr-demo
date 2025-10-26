/**
 * BlobStorageService - Handle Azure Blob Storage operations
 *
 * Responsibilities:
 * - Upload documents to blob storage
 * - Retrieve blob URLs
 * - Manage blob containers
 */

import { BlobServiceClient, ContainerClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";

export interface BlobUploadResult {
    url: string;
    fileName: string;
}

export class BlobStorageService {
    private containerClient: ContainerClient;

    constructor(
        storageAccountName: string,
        containerName: string,
        credential: DefaultAzureCredential = new DefaultAzureCredential()
    ) {
        if (!storageAccountName) {
            throw new Error('Storage account name is required');
        }

        const blobServiceClient = new BlobServiceClient(
            `https://${storageAccountName}.blob.core.windows.net`,
            credential
        );

        this.containerClient = blobServiceClient.getContainerClient(containerName);
    }

    /**
     * Ensure the container exists (creates if missing)
     */
    async ensureContainerExists(): Promise<void> {
        await this.containerClient.createIfNotExists();
    }

    /**
     * Upload a document to blob storage
     *
     * @param fileName - Name of the file in storage
     * @param buffer - File buffer to upload
     * @param contentType - MIME type of the file
     * @returns Upload result with URL and file name
     */
    async uploadDocument(
        fileName: string,
        buffer: Buffer,
        contentType: string = 'application/pdf'
    ): Promise<BlobUploadResult> {
        const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);

        await blockBlobClient.upload(buffer, buffer.length, {
            blobHTTPHeaders: { blobContentType: contentType }
        });

        return {
            url: blockBlobClient.url,
            fileName
        };
    }

    /**
     * Get blob URL for a specific file
     *
     * @param fileName - Name of the file in storage
     * @returns Blob URL
     */
    getBlobUrl(fileName: string): string {
        const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
        return blockBlobClient.url;
    }

    /**
     * Check if a blob exists
     *
     * @param fileName - Name of the file in storage
     * @returns True if blob exists
     */
    async blobExists(fileName: string): Promise<boolean> {
        const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
        return await blockBlobClient.exists();
    }
}
