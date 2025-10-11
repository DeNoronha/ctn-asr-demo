import { BlobServiceClient } from '@azure/storage-blob';

export class BlobStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerName = 'kvk-documents';

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  }

  async uploadDocument(
    legalEntityId: string,
    fileName: string,
    fileBuffer: Buffer,
    contentType: string
  ): Promise<string> {
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    
    // Ensure container exists with private access (no public access)
    await containerClient.createIfNotExists();

    // Create unique blob name
    const blobName = `${legalEntityId}/${Date.now()}-${fileName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload with metadata
    await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
      metadata: {
        legalEntityId: legalEntityId,
        uploadedAt: new Date().toISOString(),
      },
    });

    return blockBlobClient.url;
  }

  async deleteDocument(blobUrl: string): Promise<void> {
    const url = new URL(blobUrl);
    const pathParts = url.pathname.split('/');
    const blobName = pathParts.slice(2).join('/'); // Remove /container-name/
    
    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);
    
    await blockBlobClient.deleteIfExists();
  }

  async getDocumentSasUrl(blobUrl: string, expiryMinutes: number = 60): Promise<string> {
    // For now, return the URL as-is (public access)
    // TODO: Implement SAS token generation for secure access
    return blobUrl;
  }
}
