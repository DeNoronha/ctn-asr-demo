/**
 * PDF Text Extraction Service
 *
 * Extracts text from PDFs using Azure Document Intelligence (Form Recognizer).
 * Uses prebuilt-layout model for OCR and table extraction.
 */

import { DocumentAnalysisClient, AzureKeyCredential } from '@azure/ai-form-recognizer';

export interface PDFPage {
  pageNumber: number;
  text: string;
  totalPages: number;
}

export interface PDFExtractionResult {
  text: string;
  pages: PDFPage[];
  metadata: {
    totalPages: number;
    title?: string;
    author?: string;
    producer?: string;
    creationDate?: Date;
  };
}

/**
 * Get Document Intelligence client
 */
function getDocumentClient(): DocumentAnalysisClient {
  const endpoint = process.env.DOCUMENT_INTELLIGENCE_ENDPOINT;
  const key = process.env.DOCUMENT_INTELLIGENCE_KEY;

  if (!endpoint || !key) {
    throw new Error('DOCUMENT_INTELLIGENCE_ENDPOINT and DOCUMENT_INTELLIGENCE_KEY must be set');
  }

  return new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key));
}

/**
 * Extracts text from entire PDF using Azure Document Intelligence
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<PDFExtractionResult> {
  try {
    const client = getDocumentClient();

    // Analyze document with prebuilt-layout model
    const poller = await client.beginAnalyzeDocument('prebuilt-layout', buffer);
    const result = await poller.pollUntilDone();

    if (!result) {
      throw new Error('No result from Document Intelligence');
    }

    // Extract full text
    const fullText = result.content || '';

    // Extract pages
    const pages: PDFPage[] = [];
    const totalPages = result.pages?.length || 1;

    if (result.pages) {
      for (let i = 0; i < result.pages.length; i++) {
        const page = result.pages[i];

        // Extract text from this page by finding content in page span
        const pageText = extractPageText(fullText, page.spans);

        pages.push({
          pageNumber: i + 1,
          text: pageText,
          totalPages
        });
      }
    } else {
      // Fallback: single page with all text
      pages.push({
        pageNumber: 1,
        text: fullText,
        totalPages: 1
      });
    }

    return {
      text: fullText.trim(),
      pages,
      metadata: {
        totalPages,
        title: undefined,
        author: undefined,
        producer: 'Azure Document Intelligence',
        creationDate: new Date()
      }
    };
  } catch (error: any) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Extract text for a specific page using span information
 */
function extractPageText(fullText: string, spans: any[] | undefined): string {
  if (!spans || spans.length === 0) {
    return fullText;
  }

  let pageText = '';
  for (const span of spans) {
    pageText += fullText.substring(span.offset, span.offset + span.length);
  }

  return pageText;
}

/**
 * Extracts text page by page
 */
export async function extractTextByPage(buffer: Buffer): Promise<PDFPage[]> {
  const result = await extractTextFromPDF(buffer);
  return result.pages;
}

/**
 * Checks if PDF has multiple pages
 */
export async function getPdfPageCount(buffer: Buffer): Promise<number> {
  try {
    const result = await extractTextFromPDF(buffer);
    return result.metadata.totalPages;
  } catch (error: any) {
    throw new Error(`Failed to get PDF page count: ${error.message}`);
  }
}

/**
 * Detects if a new document starts in the text
 */
export function detectDocumentStart(text: string): boolean {
  const documentHeaders = [
    /BOOKING CONFIRMATION/i,
    /BILL OF LADING/i,
    /DELIVERY ORDER/i,
    /TRANSPORT ORDER/i,
    /SHIPPING INSTRUCTION/i,
    /CARGO MANIFEST/i
  ];

  return documentHeaders.some(pattern => pattern.test(text));
}

/**
 * Groups pages into logical documents
 */
export interface DocumentGroup {
  startPage: number;
  endPage: number;
  pages: PDFPage[];
  combinedText: string;
}

export async function groupPagesIntoDocuments(buffer: Buffer): Promise<DocumentGroup[]> {
  const pages = await extractTextByPage(buffer);
  const groups: DocumentGroup[] = [];

  let currentGroup: PDFPage[] = [];
  let startPage = 1;

  for (const page of pages) {
    if (currentGroup.length > 0 && detectDocumentStart(page.text)) {
      groups.push({
        startPage,
        endPage: startPage + currentGroup.length - 1,
        pages: currentGroup,
        combinedText: currentGroup.map(p => p.text).join('\n\n')
      });

      currentGroup = [page];
      startPage = page.pageNumber;
    } else {
      currentGroup.push(page);
    }
  }

  if (currentGroup.length > 0) {
    groups.push({
      startPage,
      endPage: startPage + currentGroup.length - 1,
      pages: currentGroup,
      combinedText: currentGroup.map(p => p.text).join('\n\n')
    });
  }

  return groups;
}

/**
 * Cleans extracted text
 */
export function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/^\s+|\s+$/gm, '')
    .trim();
}

/**
 * Extracts snippet from text
 */
export function extractSnippet(text: string, maxLength: number = 2000): string {
  const cleaned = cleanExtractedText(text);
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return cleaned.substring(0, maxLength) + '...';
}
