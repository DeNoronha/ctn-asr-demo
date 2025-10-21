"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitPdfIntoPages = splitPdfIntoPages;
exports.getPdfPageCount = getPdfPageCount;
const pdf_lib_1 = require("pdf-lib");
/**
 * Splits a PDF into individual pages
 * @param pdfBuffer The original PDF as a Buffer
 * @returns Array of individual page PDFs with their page numbers
 */
async function splitPdfIntoPages(pdfBuffer) {
    // Load PDF with ignoreEncryption to handle secured/encrypted PDFs
    const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBuffer, {
        ignoreEncryption: true
    });
    const pageCount = pdfDoc.getPageCount();
    const splitPages = [];
    for (let i = 0; i < pageCount; i++) {
        // Create a new PDF document for this page
        const newPdf = await pdf_lib_1.PDFDocument.create();
        // Copy the page from the original PDF
        const [copiedPage] = await newPdf.copyPages(pdfDoc, [i]);
        newPdf.addPage(copiedPage);
        // Save as buffer
        const pdfBytes = await newPdf.save();
        const buffer = Buffer.from(pdfBytes);
        splitPages.push({
            pageNumber: i + 1, // 1-indexed for human readability
            pdfBuffer: buffer
        });
    }
    return splitPages;
}
/**
 * Gets the page count of a PDF without splitting it
 * @param pdfBuffer The PDF as a Buffer
 * @returns Number of pages in the PDF
 */
async function getPdfPageCount(pdfBuffer) {
    const pdfDoc = await pdf_lib_1.PDFDocument.load(pdfBuffer, {
        ignoreEncryption: true
    });
    return pdfDoc.getPageCount();
}
//# sourceMappingURL=pdfSplitter.js.map