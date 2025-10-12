import {
  BlobServiceClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential
} from '@azure/storage-blob';

export class BlobStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerName = 'kvk-documents';
  private accountName: string;
  private accountKey: string;

  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);

    // Parse connection string to extract account name and key for SAS generation
    const accountNameMatch = connectionString.match(/AccountName=([^;]+)/);
    const accountKeyMatch = connectionString.match(/AccountKey=([^;]+)/);

    if (!accountNameMatch || !accountKeyMatch) {
      throw new Error('Invalid Azure Storage connection string');
    }

    this.accountName = accountNameMatch[1];
    this.accountKey = accountKeyMatch[1];
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
    try {
      // Parse the blob URL to extract blob name
      const url = new URL(blobUrl);
      const pathParts = url.pathname.split('/');
      const blobName = pathParts.slice(2).join('/'); // Remove /container-name/

      // Create shared key credential
      const sharedKeyCredential = new StorageSharedKeyCredential(
        this.accountName,
        this.accountKey
      );

      // Define SAS permissions (read only)
      const permissions = BlobSASPermissions.parse('r');

      // Set expiry time
      const startsOn = new Date();
      const expiresOn = new Date(startsOn.getTime() + expiryMinutes * 60 * 1000);

      // Generate SAS token
      const sasToken = generateBlobSASQueryParameters(
        {
          containerName: this.containerName,
          blobName: blobName,
          permissions: permissions,
          startsOn: startsOn,
          expiresOn: expiresOn,
        },
        sharedKeyCredential
      ).toString();

      // Return URL with SAS token
      return `${blobUrl}?${sasToken}`;
    } catch (error) {
      console.error('Error generating SAS URL:', error);
      throw new Error('Failed to generate secure document URL');
    }
  }
}
