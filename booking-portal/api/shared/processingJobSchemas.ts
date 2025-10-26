/**
 * Processing Job Schemas - Async Document Processing
 *
 * Handles asynchronous document processing to prevent timeout issues
 * Users poll job status while Claude processes document in background
 */

export type ProcessingStage =
  | 'queued'
  | 'uploading'
  | 'extracting_text'
  | 'classifying'
  | 'analyzing_with_claude'
  | 'storing'
  | 'completed'
  | 'failed';

export type ProcessingStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface ProcessingJob {
  id: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  documentId?: string;  // Set after document is stored
  status: ProcessingStatus;
  stage: ProcessingStage;
  progress: number;  // 0-100

  // Job details
  originalFilename: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;

  // Result (set when completed)
  result?: {
    success: boolean;
    message: string;
    totalPages: number;
    documentsFound: number;
    successCount: number;
    errorCount: number;
    documents: any[];
  };

  // Error (set when failed)
  error?: {
    message: string;
    stage: ProcessingStage;
    timestamp: string;
  };

  // Processing metadata
  metadata?: {
    classificationTime?: number;
    claudeTime?: number;
    totalTime?: number;
  };
}

/**
 * Stage to progress mapping
 */
export const STAGE_PROGRESS_MAP: Record<ProcessingStage, number> = {
  'queued': 0,
  'uploading': 10,
  'extracting_text': 30,
  'classifying': 50,
  'analyzing_with_claude': 70,
  'storing': 90,
  'completed': 100,
  'failed': 0
};

/**
 * Stage to status mapping
 */
export function getStatusFromStage(stage: ProcessingStage): ProcessingStatus {
  switch (stage) {
    case 'queued':
      return 'queued';
    case 'completed':
      return 'completed';
    case 'failed':
      return 'failed';
    default:
      return 'processing';
  }
}
