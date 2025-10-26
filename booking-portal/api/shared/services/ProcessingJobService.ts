/**
 * ProcessingJobService - Manage async processing jobs
 *
 * Responsibilities:
 * - CRUD operations for processing jobs
 * - Update job status and progress
 * - Query jobs by user
 */

import { CosmosClient, Container, Database } from "@azure/cosmos";
import { ProcessingJob, ProcessingStage, STAGE_PROGRESS_MAP, getStatusFromStage } from "../processingJobSchemas";

export class ProcessingJobService {
  private container: Container;
  private database: Database;

  constructor(
    endpoint: string,
    key: string,
    databaseName: string,
    containerName: string = 'processing-jobs'
  ) {
    if (!endpoint || !key) {
      throw new Error('Cosmos DB endpoint and key are required');
    }

    const cosmosClient = new CosmosClient({ endpoint, key });
    this.database = cosmosClient.database(databaseName);
    this.container = this.database.container(containerName);
  }

  /**
   * Create a new processing job
   */
  async createJob(job: ProcessingJob): Promise<ProcessingJob> {
    const { resource } = await this.container.items.create(job);
    return resource as ProcessingJob;
  }

  /**
   * Get job by ID
   */
  async getJob(jobId: string, tenantId: string): Promise<ProcessingJob | null> {
    try {
      const { resource } = await this.container.item(jobId, tenantId).read<ProcessingJob>();
      return resource || null;
    } catch (error: any) {
      if (error.code === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Update job stage and progress
   */
  async updateJobStage(
    jobId: string,
    tenantId: string,
    stage: ProcessingStage,
    metadata?: Partial<ProcessingJob['metadata']>
  ): Promise<ProcessingJob> {
    const job = await this.getJob(jobId, tenantId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const status = getStatusFromStage(stage);
    const progress = STAGE_PROGRESS_MAP[stage];

    const updated: ProcessingJob = {
      ...job,
      stage,
      status,
      progress,
      updatedAt: new Date().toISOString(),
      completedAt: stage === 'completed' ? new Date().toISOString() : job.completedAt,
      metadata: metadata ? { ...job.metadata, ...metadata } : job.metadata
    };

    const { resource } = await this.container.item(jobId, tenantId).replace(updated);
    return resource as ProcessingJob;
  }

  /**
   * Mark job as completed with result
   */
  async completeJob(
    jobId: string,
    tenantId: string,
    result: ProcessingJob['result']
  ): Promise<ProcessingJob> {
    const job = await this.getJob(jobId, tenantId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const updated: ProcessingJob = {
      ...job,
      status: 'completed',
      stage: 'completed',
      progress: 100,
      result,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const { resource } = await this.container.item(jobId, tenantId).replace(updated);
    return resource as ProcessingJob;
  }

  /**
   * Mark job as failed with error
   */
  async failJob(
    jobId: string,
    tenantId: string,
    errorMessage: string,
    stage: ProcessingStage
  ): Promise<ProcessingJob> {
    const job = await this.getJob(jobId, tenantId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const updated: ProcessingJob = {
      ...job,
      status: 'failed',
      stage: 'failed',
      progress: 0,
      error: {
        message: errorMessage,
        stage,
        timestamp: new Date().toISOString()
      },
      updatedAt: new Date().toISOString()
    };

    const { resource } = await this.container.item(jobId, tenantId).replace(updated);
    return resource as ProcessingJob;
  }

  /**
   * Get all jobs for a user
   */
  async getUserJobs(tenantId: string, userId: string, limit: number = 50): Promise<ProcessingJob[]> {
    const query = {
      query: 'SELECT * FROM c WHERE c.tenantId = @tenantId AND c.userId = @userId ORDER BY c.createdAt DESC OFFSET 0 LIMIT @limit',
      parameters: [
        { name: '@tenantId', value: tenantId },
        { name: '@userId', value: userId },
        { name: '@limit', value: limit }
      ]
    };

    const { resources } = await this.container.items.query<ProcessingJob>(query).fetchAll();
    return resources;
  }
}
