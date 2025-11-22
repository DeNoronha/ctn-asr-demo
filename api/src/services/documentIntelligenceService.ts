import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';
import { TIMEOUT_CONFIG, withTimeout } from '../utils/timeoutConfig';

interface ExtractedKvKData {
  companyName: string | null;
  kvkNumber: string | null;
  confidence: number;
  rawText: string;
}

export class DocumentIntelligenceService {
  private client: DocumentAnalysisClient;

  constructor() {
    const endpoint = process.env.DOC_INTELLIGENCE_ENDPOINT || '';
    const key = process.env.DOC_INTELLIGENCE_KEY || '';
    
    if (!endpoint || !key) {
      throw new Error('Document Intelligence credentials not configured');
    }
    
    this.client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
  }

  async extractKvKData(documentInput: string | Buffer): Promise<ExtractedKvKData> {
    if (!documentInput) {
      throw new Error('Document URL or buffer is required');
    }

    try {
      // Use prebuilt-document model for general document analysis with timeout
      const analysisPromise = (async () => {
        let poller;

        if (Buffer.isBuffer(documentInput)) {
          // Use buffer approach (more reliable for storage access)
          console.log('Analyzing document from buffer (size:', documentInput.length, 'bytes)');
          poller = await this.client.beginAnalyzeDocument(
            'prebuilt-document',
            documentInput,
            {
              onProgress: (state) => {
                console.log(`Document analysis progress: ${state.status}`);
              }
            }
          );
        } else {
          // Fallback to URL approach
          console.log('Analyzing document from URL');
          poller = await this.client.beginAnalyzeDocumentFromUrl(
            'prebuilt-document',
            documentInput,
            {
              onProgress: (state) => {
                console.log(`Document analysis progress: ${state.status}`);
              }
            }
          );
        }

        // Wait for analysis to complete
        return await poller.pollUntilDone();
      })();

      // Wrap with timeout
      const result = await withTimeout(
        analysisPromise,
        TIMEOUT_CONFIG.DOCUMENT_INTELLIGENCE_MS,
        `Document analysis timeout exceeded (${TIMEOUT_CONFIG.DOCUMENT_INTELLIGENCE_MS / 1000} seconds)`
      );

      if (!result) {
        throw new Error('Document analysis failed to produce results');
      }
      
      let companyName: string | null = null;
      let kvkNumber: string | null = null;
      let confidence = 0;
      const rawText = result.content || '';

      // Extract text and search for patterns
      if (rawText) {
        // Pattern for KvK number: 8 digits
        const kvkPattern = /\b\d{8}\b/g;
        const kvkMatches = rawText.match(kvkPattern);
        if (kvkMatches && kvkMatches.length > 0) {
          kvkNumber = kvkMatches[0];
          confidence += 0.5;
        }

        // Extract company name (heuristic: look for lines before KvK number)
        const lines = rawText.split('\n').filter(l => l.trim().length > 3);
        
        // Look for common indicators
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          
          // Skip lines that are just KvK numbers or dates
          if (/^\d+$/.test(line) || /^\d{2}[-\/]\d{2}[-\/]\d{4}$/.test(line)) {
            continue;
          }
          
          // If line contains "Handelsnaam" or "Bedrijfsnaam", next line might be company name
          if (line.toLowerCase().includes('handelsnaam') || line.toLowerCase().includes('bedrijfsnaam')) {
            if (i + 1 < lines.length) {
              companyName = lines[i + 1].trim();
              confidence += 0.3;
              break;
            }
          }
          
          // If line contains KvK number, previous line might be company name
          if (kvkNumber && line.includes(kvkNumber) && i > 0) {
            companyName = lines[i - 1].trim();
            confidence += 0.2;
            break;
          }
        }
        
        // If still no company name, take first substantial line (>10 chars, not a number)
        if (!companyName) {
          for (const line of lines) {
            if (line.length > 10 && !/^\d+$/.test(line)) {
              companyName = line;
              confidence += 0.1;
              break;
            }
          }
        }
      }

      return {
        companyName,
        kvkNumber,
        confidence: Math.min(confidence, 1.0),
        rawText,
      };
    } catch (error: any) {
      console.error('Document Intelligence error:', error);

      // Provide specific error messages
      if (error.message?.includes('timeout')) {
        throw new Error('Document analysis timeout - please try again or contact support');
      }

      if (error.code === 'InvalidRequest') {
        throw new Error('Invalid document format - please ensure file is a valid PDF');
      }

      if (error.code === 'InvalidImage') {
        throw new Error('Document could not be read - please ensure PDF is not corrupted or password-protected');
      }

      if (error.statusCode === 401 || error.statusCode === 403) {
        throw new Error('Document Intelligence service authentication failed - please contact administrator');
      }

      if (error.statusCode === 429) {
        throw new Error('Service rate limit exceeded - please try again in a few minutes');
      }

      // Generic error
      throw new Error(`Failed to extract data from document: ${error.message || 'Unknown error'}`);
    }
  }
}
