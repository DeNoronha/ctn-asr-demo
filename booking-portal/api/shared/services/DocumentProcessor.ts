/**
 * DocumentProcessor - Orchestrate document processing workflow
 *
 * Responsibilities:
 * - Coordinate extraction, classification, and storage
 * - Manage processing pipeline
 * - Handle multi-page PDF splitting
 */

import { Context } from "@azure/functions";
import { BlobStorageService } from "./BlobStorageService";
import { CosmosDbService } from "./CosmosDbService";
import { ProcessingJobService } from "./ProcessingJobService";
import { AuthenticatedUser } from "../auth";
import { DocumentRecord } from "../dcsaSchemas";
import { ProcessingStage } from "../processingJobSchemas";
import { extractTextFromPDF, detectDocumentStart, PDFExtractionResult, PDFPage } from "../pdfExtractor";
import { classifyDocument } from "../documentClassifier";
import { extractWithClaude } from "../claudeExtractor";
import { getFewShotExamples } from "../knowledgeBase";
import { CLAUDE_CONFIG } from "../constants";

export interface ProcessDocumentRequest {
    fileBuffer: Buffer;
    originalFilename: string;
    user: AuthenticatedUser;
    jobId?: string;  // Optional jobId for async processing
}

export interface ProcessedDocument {
    id: string;
    documentType: string;
    documentNumber: string;
    carrier: string;
    confidenceScore: number;
    processingStatus: string;
    pageRange: string;
    validationWarnings: string[];
    validationErrors: string[];
    uncertainFields: string[];
}

export interface ProcessDocumentResult {
    success: boolean;
    message: string;
    originalFilename: string;
    totalPages: number;
    documentsFound: number;
    successCount: number;
    errorCount: number;
    documents: (ProcessedDocument | { error: true; documentId: string; message: string })[];
}

interface DocumentGroup {
    startPage: number;
    endPage: number;
    pages: PDFPage[];
    combinedText: string;
}

export class DocumentProcessor {
    constructor(
        private blobService: BlobStorageService,
        private cosmosService: CosmosDbService,
        private context: Context,
        private jobService?: ProcessingJobService
    ) {}

    /**
     * Process uploaded document through the entire pipeline
     *
     * @param request - Document processing request
     * @returns Processing result
     */
    async processDocument(request: ProcessDocumentRequest): Promise<ProcessDocumentResult> {
        const { fileBuffer, originalFilename, user, jobId } = request;

        this.context.log(`Processing document: ${originalFilename} (${fileBuffer.length} bytes)`);

        // Update job status: uploading
        await this.updateJobStage(jobId, user.tenantId || 'default', 'uploading');

        // Ensure blob container exists
        await this.blobService.ensureContainerExists();

        // Update job status: extracting text
        await this.updateJobStage(jobId, user.tenantId || 'default', 'extracting_text');

        // PERFORMANCE FIX: Extract text from PDF ONCE (not 3 times)
        this.context.log('Extracting text from PDF...');
        const extractionStartTime = Date.now();
        const pdfResult: PDFExtractionResult = await extractTextFromPDF(fileBuffer);
        const extractionTime = Date.now() - extractionStartTime;

        const pageCount = pdfResult.metadata.totalPages;
        this.context.log(`PDF extraction complete in ${extractionTime}ms - ${pageCount} page(s)`);

        // Update job status: classifying
        await this.updateJobStage(jobId, user.tenantId || 'default', 'classifying');

        // Group pages into logical documents (reuse extracted pages)
        this.context.log('Grouping pages into documents...');
        const documentGroups = this.groupPagesIntoDocuments(pdfResult.pages);
        this.context.log(`Found ${documentGroups.length} document(s) in PDF`);

        const processedDocuments: ProcessDocumentResult['documents'] = [];

        // Update job status: analyzing with Claude
        await this.updateJobStage(jobId, user.tenantId || 'default', 'analyzing_with_claude');

        // Process each document group
        for (const group of documentGroups) {
            try {
                const processedDoc = await this.processDocumentGroup(
                    group,
                    fileBuffer,
                    user,
                    jobId
                );
                processedDocuments.push(processedDoc);
            } catch (error: any) {
                this.context.log.error(`Error processing document group:`, error);
                processedDocuments.push({
                    error: true,
                    documentId: `doc-${Date.now()}-p${group.startPage}`,
                    message: `Failed to process document: ${error.message}`
                });
            }
        }

        // Update job status: storing
        await this.updateJobStage(jobId, user.tenantId || 'default', 'storing');

        // Determine overall status
        const successCount = processedDocuments.filter(d => !('error' in d)).length;
        const errorCount = processedDocuments.filter(d => 'error' in d).length;

        const result = {
            success: successCount > 0,
            message: `Processed ${successCount}/${documentGroups.length} document(s) successfully`,
            originalFilename,
            totalPages: pageCount,
            documentsFound: documentGroups.length,
            successCount,
            errorCount,
            documents: processedDocuments
        };

        // Update job status: completed
        await this.updateJobStage(jobId, user.tenantId || 'default', 'completed');

        return result;
    }

    /**
     * Update job stage (if jobService available)
     */
    private async updateJobStage(jobId: string | undefined, tenantId: string, stage: ProcessingStage): Promise<void> {
        if (!jobId || !this.jobService) {
            return;
        }

        try {
            await this.jobService.updateJobStage(jobId, tenantId, stage);
            this.context.log(`Job ${jobId} stage updated: ${stage}`);
        } catch (error: any) {
            this.context.log.warn(`Failed to update job stage: ${error.message}`);
            // Don't fail the entire processing if job update fails
        }
    }

    /**
     * Group pages into logical documents (without re-extracting)
     *
     * @param pages - Extracted PDF pages
     * @returns Document groups
     */
    private groupPagesIntoDocuments(pages: PDFPage[]): DocumentGroup[] {
        const groups: DocumentGroup[] = [];
        let currentGroup: PDFPage[] = [];
        let startPage = 1;

        for (const page of pages) {
            if (currentGroup.length > 0 && detectDocumentStart(page.text)) {
                // New document detected - save current group
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

        // Add final group
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
     * Process a single document group
     *
     * @param group - Document group (pages)
     * @param fileBuffer - Original PDF buffer
     * @param user - Authenticated user
     * @returns Processed document
     */
    private async processDocumentGroup(
        group: DocumentGroup,
        fileBuffer: Buffer,
        user: AuthenticatedUser,
        jobId?: string
    ): Promise<ProcessedDocument> {
        const documentId = `doc-${Date.now()}-p${group.startPage}`;
        const fileName = `${documentId}.pdf`;

        this.context.log(`Processing document ${group.startPage}-${group.endPage}: ${documentId}`);

        // 1. Classify document type and carrier
        this.context.log('Classifying document...');
        const classification = classifyDocument(group.combinedText);

        if (classification.documentType === 'unknown') {
            this.context.log.warn(`Could not classify document ${documentId}`);
            throw new Error('Could not classify document type');
        }

        this.context.log(
            `Classified as ${classification.documentType} from ${classification.carrier} ` +
            `(confidence: ${classification.confidence.toFixed(2)})`
        );

        // 2. Upload to Blob Storage
        const uploadResult = await this.blobService.uploadDocument(
            fileName,
            fileBuffer,
            'application/pdf'
        );
        this.context.log(`Document uploaded: ${uploadResult.url}`);

        // 3. Get few-shot examples from knowledge base
        this.context.log('Retrieving few-shot examples...');
        const fewShotExamples = await getFewShotExamples(
            classification.documentType,
            classification.carrier,
            CLAUDE_CONFIG.DEFAULT_FEW_SHOT_EXAMPLES
        );
        this.context.log(`Retrieved ${fewShotExamples.length} few-shot examples`);

        // 4. Extract structured data with Claude
        this.context.log('Extracting structured data with Claude...');
        const claudeStartTime = Date.now();

        const extraction = await extractWithClaude({
            text: group.combinedText,
            documentType: classification.documentType,
            carrier: classification.carrier,
            fewShotExamples
        });

        const claudeTime = Date.now() - claudeStartTime;
        this.context.log(
            `Claude extraction complete in ${claudeTime}ms ` +
            `(confidence: ${extraction.confidenceScore.toFixed(2)})`
        );

        // 5. Create document record
        const documentRecord: DocumentRecord = {
            id: documentId,
            tenantId: user.tenantId || 'default',
            documentType: classification.documentType,
            documentNumber: this.extractDocumentNumber(extraction.data, documentId),
            carrier: classification.carrier,
            uploadedBy: user.email,
            uploadTimestamp: new Date().toISOString(),
            processingStatus: extraction.confidenceScore >= CLAUDE_CONFIG.AUTO_VALIDATE_THRESHOLD ? 'validated' : 'pending',
            data: extraction.data,
            extractionMetadata: {
                modelUsed: 'claude-sonnet-4.5',
                tokensUsed: extraction.metadata.tokensUsed,
                processingTimeMs: extraction.metadata.processingTimeMs,
                confidenceScore: extraction.confidenceScore,
                fewShotExamplesUsed: extraction.metadata.fewShotExamplesUsed,
                uncertainFields: extraction.metadata.uncertainFields,
                extractionTimestamp: extraction.metadata.extractionTimestamp
            },
            documentUrl: uploadResult.url,
            pageNumber: group.startPage,
            totalPages: group.endPage - group.startPage + 1,
            validationHistory: []
        };

        // 6. Store in Cosmos DB
        await this.cosmosService.createDocument(documentRecord);
        this.context.log(`Document ${documentId} stored successfully`);

        // Return processed document result
        return {
            id: documentId,
            documentType: classification.documentType,
            documentNumber: documentRecord.documentNumber,
            carrier: classification.carrier,
            confidenceScore: extraction.confidenceScore,
            processingStatus: documentRecord.processingStatus,
            pageRange: `${group.startPage}-${group.endPage}`,
            validationWarnings: extraction.validation.warnings,
            validationErrors: extraction.validation.errors,
            uncertainFields: extraction.metadata.uncertainFields
        };
    }

    /**
     * Extract document number from extracted data
     *
     * @param data - Extracted document data
     * @param fallback - Fallback value if no number found
     * @returns Document number
     */
    private extractDocumentNumber(data: any, fallback: string): string {
        return (
            data.carrierBookingReference ||
            data.billOfLadingNumber ||
            data.deliveryOrderNumber ||
            data.transportOrderNumber ||
            fallback
        );
    }
}
