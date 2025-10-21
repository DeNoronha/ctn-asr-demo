import { PDFDocument } from 'pdf-lib';

export interface SplitPDFPage {
    pageNumber: number;
    pdfBuffer: Buffer;
}

/**
 * Splits a PDF into individual pages
 * @param pdfBuffer The original PDF as a Buffer
 * @returns Array of individual page PDFs with their page numbers
 */
export async function splitPdfIntoPages(pdfBuffer: Buffer): Promise<SplitPDFPage[]> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const pageCount = pdfDoc.getPageCount();

    const splitPages: SplitPDFPage[] = [];

    for (let i = 0; i < pageCount; i++) {
        // Create a new PDF document for this page
        const newPdf = await PDFDocument.create();

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
export async function getPdfPageCount(pdfBuffer: Buffer): Promise<number> {
    const pdfDoc = await PDFDocument.load(pdfBuffer);
    return pdfDoc.getPageCount();
}
