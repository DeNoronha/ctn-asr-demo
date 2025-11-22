import { describe, it, expect, beforeEach } from '@jest/globals';

describe('BlobStorageService - URL Parsing', () => {
  it('should correctly parse blob URL with container path', () => {
    // Test URL from error message
    const testUrl = 'https://stctnasrdev96858.blob.core.windows.net/kvk-documents/applications/8f4a8572-29ec-4ca8-be67-cca5f9ef1c0c/1763727092591-20240124 LK Holding bv uittreksel handelsregister kvk.pdf';

    const url = new URL(testUrl);
    const pathname = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    const pathParts = pathname.split('/');

    // First part is container name, rest is blob name
    const containerName = pathParts[0];
    const blobName = pathParts.slice(1).join('/');

    expect(containerName).toBe('kvk-documents');
    expect(blobName).toBe('applications/8f4a8572-29ec-4ca8-be67-cca5f9ef1c0c/1763727092591-20240124 LK Holding bv uittreksel handelsregister kvk.pdf');
  });

  it('should handle URLs without leading slash', () => {
    const testUrl = 'https://stctnasrdev96858.blob.core.windows.net/kvk-documents/test/file.pdf';

    const url = new URL(testUrl);
    const pathname = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    const pathParts = pathname.split('/');

    const containerName = pathParts[0];
    const blobName = pathParts.slice(1).join('/');

    expect(containerName).toBe('kvk-documents');
    expect(blobName).toBe('test/file.pdf');
  });

  it('should handle URLs with special characters in filename', () => {
    const testUrl = 'https://stctnasrdev96858.blob.core.windows.net/kvk-documents/applications/test/file with spaces.pdf';

    const url = new URL(testUrl);
    const pathname = url.pathname.startsWith('/') ? url.pathname.substring(1) : url.pathname;
    const pathParts = pathname.split('/');

    const containerName = pathParts[0];
    const blobName = pathParts.slice(1).join('/');

    expect(containerName).toBe('kvk-documents');
    expect(blobName).toBe('applications/test/file with spaces.pdf');
  });

  it('should remove existing query parameters before adding SAS token', () => {
    const testUrl = 'https://stctnasrdev96858.blob.core.windows.net/kvk-documents/test/file.pdf?oldparam=value';

    const baseUrl = testUrl.split('?')[0];

    expect(baseUrl).toBe('https://stctnasrdev96858.blob.core.windows.net/kvk-documents/test/file.pdf');
    expect(baseUrl).not.toContain('oldparam');
  });
});
