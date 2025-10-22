"use strict";
/**
 * PDF Text Extraction Service
 *
 * Extracts text from PDFs using pdf-parse library.
 * Replaces previous PDF splitter functionality with text-based approach.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTextFromPDF = extractTextFromPDF;
exports.extractTextByPage = extractTextByPage;
exports.getPdfPageCount = getPdfPageCount;
exports.detectDocumentStart = detectDocumentStart;
exports.groupPagesIntoDocuments = groupPagesIntoDocuments;
exports.cleanExtractedText = cleanExtractedText;
exports.extractSnippet = extractSnippet;
// pdf-parse v2 uses class-based API
const { PDFParse } = require('pdf-parse');
/**
 * Extracts text from entire PDF
 */
async function extractTextFromPDF(buffer) {
    try {
        // pdf-parse v2 API
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        return {
            text: result.text,
            pages: [], // Will populate with page-by-page extraction if needed
            metadata: {
                totalPages: result.pages.length,
                // pdf-parse v2 doesn't expose metadata in getText(), would need getInfo()
                title: undefined,
                author: undefined,
                producer: undefined,
                creationDate: undefined
            }
        };
    }
    catch (error) {
        throw new Error(`Failed to extract text from PDF: ${error.message}`);
    }
}
/**
 * Extracts text page by page
 * Useful for multi-page PDFs where each page is a different document
 */
async function extractTextByPage(buffer) {
    try {
        // pdf-parse v2 API - getText() already returns pages array
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        const totalPages = result.pages.length;
        // Convert pdf-parse v2 page format to our PDFPage interface
        const pages = result.pages.map((page) => ({
            pageNumber: page.num,
            text: page.text,
            totalPages
        }));
        return pages;
    }
    catch (error) {
        throw new Error(`Failed to extract text by page: ${error.message}`);
    }
}
/**
 * Detects page boundaries in extracted text
 * Looks for common patterns like headers, footers, page numbers
 */
function detectPageBoundaries(text, expectedPages) {
    const boundaries = [0]; // Always start at 0
    // Common patterns that indicate new page
    const pageIndicators = [
        /Page \d+ of \d+/gi,
        /\d+\/\d+/g, // Page numbers like 1/3
        /^\s*\d+\s*$/gm, // Standalone numbers on a line
        /BOOKING CONFIRMATION/gi,
        /DELIVERY ORDER/gi,
        /BILL OF LADING/gi,
        /TRANSPORT ORDER/gi
    ];
    // Find all potential boundaries
    const potentialBoundaries = new Set();
    for (const pattern of pageIndicators) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            potentialBoundaries.add(match.index);
        }
    }
    // Sort and filter boundaries
    const sortedBoundaries = Array.from(potentialBoundaries).sort((a, b) => a - b);
    // Only keep boundaries that are reasonably spaced
    const minPageLength = 500; // Minimum characters per page
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
async function getPdfPageCount(buffer) {
    try {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        return result.pages.length;
    }
    catch (error) {
        throw new Error(`Failed to get PDF page count: ${error.message}`);
    }
}
/**
 * Detects if a new document starts in the text
 * Useful for identifying document boundaries in multi-document PDFs
 */
function detectDocumentStart(text) {
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
async function groupPagesIntoDocuments(buffer) {
    const pages = await extractTextByPage(buffer);
    const groups = [];
    let currentGroup = [];
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
        }
        else {
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
function cleanExtractedText(text) {
    return text
        .replace(/\r\n/g, '\n') // Normalize line endings
        .replace(/\n{3,}/g, '\n\n') // Collapse multiple newlines
        .replace(/[ \t]{2,}/g, ' ') // Collapse multiple spaces
        .replace(/^\s+|\s+$/gm, '') // Trim lines
        .trim();
}
/**
 * Extracts snippet from text (first N characters)
 * Used for knowledge base examples
 */
function extractSnippet(text, maxLength = 2000) {
    const cleaned = cleanExtractedText(text);
    if (cleaned.length <= maxLength) {
        return cleaned;
    }
    return cleaned.substring(0, maxLength) + '...';
}
//# sourceMappingURL=pdfExtractor.js.map