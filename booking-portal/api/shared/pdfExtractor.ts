/**
 * PDF Text Extraction Service
 *
 * Extracts text from PDFs using pdf-parse library.
 * Replaces previous PDF splitter functionality with text-based approach.
 */

const pdfParse = require('pdf-parse');

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
 * Extracts text from entire PDF
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<PDFExtractionResult> {
  try {
    const data = await pdfParse(buffer);

    return {
      text: data.text,
      pages: [],  // Will populate with page-by-page extraction if needed
      metadata: {
        totalPages: data.numpages,
        title: data.info?.Title,
        author: data.info?.Author,
        producer: data.info?.Producer,
        creationDate: data.info?.CreationDate ? new Date(data.info.CreationDate) : undefined
      }
    };
  } catch (error: any) {
    throw new Error(`Failed to extract text from PDF: ${error.message}`);
  }
}

/**
 * Extracts text page by page
 * Useful for multi-page PDFs where each page is a different document
 */
export async function extractTextByPage(buffer: Buffer): Promise<PDFPage[]> {
  try {
    const result = await extractTextFromPDF(buffer);
    const totalPages = result.metadata.totalPages;

    // pdf-parse doesn't directly support page-by-page extraction
    // We'll split the text based on page markers or use full text
    // For now, we'll use full text with page detection
    const pages: PDFPage[] = [];

    // Try to detect page boundaries in the text
    const pageMarkers = detectPageBoundaries(result.text, totalPages);

    if (pageMarkers.length > 0) {
      for (let i = 0; i < pageMarkers.length; i++) {
        const start = pageMarkers[i];
        const end = i < pageMarkers.length - 1 ? pageMarkers[i + 1] : result.text.length;
        const pageText = result.text.substring(start, end).trim();

        if (pageText) {
          pages.push({
            pageNumber: i + 1,
            text: pageText,
            totalPages
          });
        }
      }
    } else {
      // If can't detect boundaries, return full text as single page
      pages.push({
        pageNumber: 1,
        text: result.text,
        totalPages
      });
    }

    return pages;
  } catch (error: any) {
    throw new Error(`Failed to extract text by page: ${error.message}`);
  }
}

/**
 * Detects page boundaries in extracted text
 * Looks for common patterns like headers, footers, page numbers
 */
function detectPageBoundaries(text: string, expectedPages: number): number[] {
  const boundaries: number[] = [0]; // Always start at 0

  // Common patterns that indicate new page
  const pageIndicators = [
    /Page \d+ of \d+/gi,
    /\d+\/\d+/g,  // Page numbers like 1/3
    /^\s*\d+\s*$/gm,  // Standalone numbers on a line
    /BOOKING CONFIRMATION/gi,
    /DELIVERY ORDER/gi,
    /BILL OF LADING/gi,
    /TRANSPORT ORDER/gi
  ];

  // Find all potential boundaries
  const potentialBoundaries = new Set<number>();

  for (const pattern of pageIndicators) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      potentialBoundaries.add(match.index);
    }
  }

  // Sort and filter boundaries
  const sortedBoundaries = Array.from(potentialBoundaries).sort((a, b) => a - b);

  // Only keep boundaries that are reasonably spaced
  const minPageLength = 500;  // Minimum characters per page
  for (const boundary of sortedBoundaries) {
    const lastBoundary = boundaries[boundaries.length - 1];
    if (boundary - lastBoundary > minPageLength) {
      boundaries.push(boundary);
    }
  }

  return boundaries;
}

/**
 * Checks if PDF has multiple pages
 */
export async function getPdfPageCount(buffer: Buffer): Promise<number> {
  try {
    const data = await pdfParse(buffer);
    return data.numpages;
  } catch (error: any) {
    throw new Error(`Failed to get PDF page count: ${error.message}`);
  }
}

/**
 * Detects if a new document starts in the text
 * Useful for identifying document boundaries in multi-document PDFs
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
 * Handles multi-page PDFs where each page or group of pages is a different document
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
    // Check if this page starts a new document
    if (currentGroup.length > 0 && detectDocumentStart(page.text)) {
      // Save current group
      groups.push({
        startPage,
        endPage: startPage + currentGroup.length - 1,
        pages: currentGroup,
        combinedText: currentGroup.map(p => p.text).join('\n\n')
      });

      // Start new group
      currentGroup = [page];
      startPage = page.pageNumber;
    } else {
      currentGroup.push(page);
    }
  }

  // Add last group
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
 * Removes excessive whitespace, control characters, etc.
 */
export function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')  // Normalize line endings
    .replace(/\n{3,}/g, '\n\n')  // Collapse multiple newlines
    .replace(/[ \t]{2,}/g, ' ')  // Collapse multiple spaces
    .replace(/^\s+|\s+$/gm, '')  // Trim lines
    .trim();
}

/**
 * Extracts snippet from text (first N characters)
 * Used for knowledge base examples
 */
export function extractSnippet(text: string, maxLength: number = 2000): string {
  const cleaned = cleanExtractedText(text);
  if (cleaned.length <= maxLength) {
    return cleaned;
  }
  return cleaned.substring(0, maxLength) + '...';
}
