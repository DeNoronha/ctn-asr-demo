import {
  BlobServiceClient,
  BlobSASPermissions,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential
} from '@azure/storage-blob';
import { TIMEOUT_CONFIG, createTimeoutSignal } from '../utils/timeoutConfig';

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
    await containerClient.createIfNotExists({
      abortSignal: createTimeoutSignal(TIMEOUT_CONFIG.BLOB_STORAGE_MS)
    });

    // Create unique blob name
    const blobName = `${legalEntityId}/${Date.now()}-${fileName}`;
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Upload with metadata and timeout
    await blockBlobClient.upload(fileBuffer, fileBuffer.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
      metadata: {
        legalEntityId: legalEntityId,
        uploadedAt: new Date().toISOString(),
      },
      abortSignal: createTimeoutSignal(TIMEOUT_CONFIG.BLOB_STORAGE_MS)
    });

    return blockBlobClient.url;
  }

  async deleteDocument(blobUrl: string): Promise<void> {
    const url = new URL(blobUrl);
    const pathParts = url.pathname.split('/');
    const blobName = pathParts.slice(2).join('/'); // Remove /container-name/

    const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    await blockBlobClient.deleteIfExists({
      abortSignal: createTimeoutSignal(TIMEOUT_CONFIG.BLOB_STORAGE_MS)
    });
  }

  async getDocumentSasUrl(blobUrl: string, expiryMinutes: number = 60): Promise<string> {
    try {
      // Parse the blob URL to extract blob name
      const url = new URL(blobUrl);

      // Remove leading slash and split path
      const pathname = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
      const pathParts = pathname.split('/');

      // Extract blob name: everything after container name
      // Path format: container-name/blob/path/to/file.pdf
      if (pathParts.length < 2) {
        throw new Error(`Invalid blob URL format: ${blobUrl}`);
      }

      // First part is container name, rest is blob name
      const containerFromUrl = pathParts[0];
      const blobName = pathParts.slice(1).join('/');

      console.log('SAS URL generation:', {
        originalUrl: blobUrl,
        pathname: url.pathname,
        containerFromUrl,
        expectedContainer: this.containerName,
        blobName,
        accountName: this.accountName
      });

      // Verify container name matches
      if (containerFromUrl !== this.containerName) {
        console.warn(`Container name mismatch: URL has '${containerFromUrl}', expected '${this.containerName}'`);
      }

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

      // Construct base URL without query parameters
      const baseUrl = blobUrl.split('?')[0];

      // Return URL with SAS token
      return `${baseUrl}?${sasToken}`;
    } catch (error) {
      console.error('Error generating SAS URL:', error);
      if (error instanceof Error) {
        console.error('Error details:', {
          message: error.message,
          stack: error.stack,
          blobUrl
        });
      }
      throw new Error('Failed to generate secure document URL');
    }
  }

  async downloadDocumentBuffer(blobUrl: string): Promise<Buffer> {
    try {
      // Parse the blob URL to extract blob name (without query parameters)
      const baseUrl = blobUrl.split('?')[0]; // Remove SAS token if present
      const url = new URL(baseUrl);

      // The pathname is automatically decoded by the URL parser
      let pathname = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
      const pathParts = pathname.split('/');

      if (pathParts.length < 2) {
        throw new Error(`Invalid blob URL format: ${blobUrl}`);
      }

      // Join all parts after container name to form blob name
      const blobName = pathParts.slice(1).join('/');

      console.log('Downloading blob:', {
        originalUrl: baseUrl,
        pathname,
        blobName,
        container: this.containerName
      });

      const containerClient = this.blobServiceClient.getContainerClient(this.containerName);
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Download blob content
      const downloadResponse = await blockBlobClient.download(0, undefined, {
        abortSignal: createTimeoutSignal(TIMEOUT_CONFIG.BLOB_STORAGE_MS)
      });

      if (!downloadResponse.readableStreamBody) {
        throw new Error('No content in blob');
      }

      // Convert stream to buffer
      const chunks: Buffer[] = [];
      for await (const chunk of downloadResponse.readableStreamBody) {
        chunks.push(Buffer.from(chunk));
      }

      return Buffer.concat(chunks);
    } catch (error) {
      console.error('Error downloading blob:', error);
      throw new Error(`Failed to download document: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
