# Async Document Processing Implementation

**Date:** October 24, 2025
**Branch:** `feature/async-document-processing`
**Status:** ✅ Implemented, Ready for Testing

---

## Problem Statement

Claude API processing takes ~2 minutes per document, causing:
- HTTP request timeout at 230 seconds
- User blocked during processing with no real feedback
- Poor user experience with simulated progress
- Production-blocking timeout issue

---

## Solution: Background Processing with Real-Time Status Updates

Implemented asynchronous document processing with job status polling:

1. **Immediate Response:** Upload returns jobId immediately (202 Accepted)
2. **Background Processing:** Document processing happens async
3. **Real-Time Updates:** Frontend polls job status every 2 seconds
4. **Progress Tracking:** Actual processing stages (not simulated)

---

## Architecture

```
User Upload → Create Job (202) → Return jobId
                    ↓
              Background Processing (async)
                    ↓
              Update Job Status (Cosmos DB)
                    ↓
Frontend Polls ← Job Status Updates ← Processing Stages
```

---

## Implementation Details

### 1. Processing Job Schema

**File:** `booking-portal/api/shared/processingJobSchemas.ts`

```typescript
export type ProcessingStage =
  | 'queued'
  | 'uploading'
  | 'extracting_text'
  | 'classifying'
  | 'analyzing_with_claude'
  | 'storing'
  | 'completed'
  | 'failed';

export interface ProcessingJob {
  id: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  stage: ProcessingStage;
  progress: number;  // 0-100
  originalFilename: string;
  fileSize: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  result?: ProcessDocumentResult;  // Set when completed
  error?: {
    message: string;
    stage: ProcessingStage;
  };
}
```

**Progress Mapping:**
- `queued`: 0%
- `uploading`: 10%
- `extracting_text`: 30%
- `classifying`: 50%
- `analyzing_with_claude`: 70%
- `storing`: 90%
- `completed`: 100%

---

### 2. Processing Job Service

**File:** `booking-portal/api/shared/services/ProcessingJobService.ts`

**Methods:**
- `createJob(job)` - Create new processing job
- `getJob(jobId, tenantId)` - Get job by ID
- `updateJobStage(jobId, tenantId, stage)` - Update processing stage
- `completeJob(jobId, tenantId, result)` - Mark job completed
- `failJob(jobId, tenantId, error, stage)` - Mark job failed
- `getUserJobs(tenantId, userId)` - Get all jobs for user

**Storage:** Cosmos DB container `processing-jobs`

---

### 3. GetProcessingJob Endpoint

**Route:** `GET /api/v1/jobs/{jobid}`

**Security:**
- Authentication required
- IDOR protection: Verify user owns job
- Returns 404 (not 403) to prevent information disclosure
- Logs IDOR attempts

**Response:**
```json
{
  "id": "job-1729778400000-abc123",
  "status": "processing",
  "stage": "analyzing_with_claude",
  "progress": 70,
  "originalFilename": "booking.pdf",
  "createdAt": "2025-10-24T12:00:00Z",
  "updatedAt": "2025-10-24T12:01:30Z"
}
```

---

### 4. Refactored UploadDocument Endpoint

**Changes:**
1. Creates processing job immediately
2. Returns 202 Accepted with jobId
3. Starts background processing (non-blocking)
4. Background processing updates job status

**Upload Response:**
```json
{
  "jobId": "job-1729778400000-abc123",
  "status": "queued",
  "message": "Document upload accepted. Processing started in background.",
  "pollUrl": "/api/v1/jobs/job-1729778400000-abc123"
}
```

**Background Processing:**
- Runs async (doesn't block HTTP response)
- Updates job stages throughout processing
- Handles errors gracefully
- Stores result in job when complete

---

### 5. Updated DocumentProcessor

**Changes:**
- Added optional `jobService` parameter
- Updates job stage at each processing step:
  - `uploading` → Blob container creation
  - `extracting_text` → PDF text extraction
  - `classifying` → Document classification
  - `analyzing_with_claude` → Claude API call
  - `storing` → Cosmos DB storage
  - `completed` → Final result stored

**Error Handling:**
- If job update fails, logs warning but continues processing
- Don't fail entire pipeline if job status update fails

---

### 6. Frontend Polling (Upload.tsx)

**Changes:**
1. Upload returns jobId immediately
2. Start polling every 2 seconds
3. Update UI with real progress
4. Stop polling when completed/failed
5. Show final result or error

**Polling Logic:**
```typescript
useEffect(() => {
  if (!jobId) return;

  const pollJobStatus = async () => {
    const response = await axios.get(`/api/v1/jobs/${jobId}`);
    const job = response.data;

    setProcessingStage(job.stage);
    setProgress(job.progress);

    if (job.status === 'completed') {
      // Show result, stop polling
    } else if (job.status === 'failed') {
      // Show error, stop polling
    }
  };

  pollJobStatus();  // Immediate
  const interval = setInterval(pollJobStatus, 2000);  // Every 2s

  return () => clearInterval(interval);
}, [jobId]);
```

**UI Updates:**
- Shows actual stage names (not simulated)
- Real progress percentage from backend
- Clear error messages if processing fails

---

## Files Modified

**Backend:**
- `booking-portal/api/shared/processingJobSchemas.ts` (NEW)
- `booking-portal/api/shared/services/ProcessingJobService.ts` (NEW)
- `booking-portal/api/shared/services/index.ts` (export new service)
- `booking-portal/api/shared/services/DocumentProcessor.ts` (stage updates)
- `booking-portal/api/UploadDocument/index.ts` (async processing)
- `booking-portal/api/GetProcessingJob/index.ts` (NEW endpoint)
- `booking-portal/api/GetProcessingJob/function.json` (NEW route)

**Frontend:**
- `booking-portal/web/src/pages/Upload.tsx` (polling logic)

---

## Security Considerations

### IDOR Protection
- GetProcessingJob verifies user ownership
- Checks `job.userId === user.userId` AND `job.userEmail === user.email`
- Returns 404 (not 403) to prevent information disclosure
- Logs unauthorized access attempts

### Error Handling
- Sanitized error messages to client
- Detailed server-side logging
- Graceful degradation if job updates fail

---

## Testing Requirements

### 1. API Tests (curl)
```bash
# Upload document (get jobId)
curl -X POST https://func-ctn-booking-prod.azurewebsites.net/api/v1/documents \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test-booking.pdf"

# Poll job status
curl https://func-ctn-booking-prod.azurewebsites.net/api/v1/jobs/{jobId} \
  -H "Authorization: Bearer $TOKEN"
```

### 2. E2E Tests (Playwright)
- Upload document → Verify jobId returned
- Poll job status → Verify stages progress
- Wait for completion → Verify result
- Test error handling → Verify failed status
- Test IDOR protection → Verify 404 on other user's job

### 3. Performance Tests
- Verify no HTTP timeout (upload returns immediately)
- Measure background processing time (~2 minutes)
- Test multiple concurrent uploads
- Verify polling doesn't overload backend

### 4. UX Tests
- Real-time progress updates
- Stage descriptions accurate
- Error messages clear
- Polling stops when complete
- File input resets correctly

---

## Deployment Steps

### 1. Database Setup
Create Cosmos DB container `processing-jobs`:
```bash
# Via Azure Portal or CLI
az cosmosdb sql container create \
  --resource-group rg-ctn-booking-prod \
  --account-name cosmos-ctn-booking-prod \
  --database-name ctn-bookings-db \
  --name processing-jobs \
  --partition-key-path /tenantId \
  --throughput 400
```

### 2. Deploy API
```bash
# Trigger booking portal pipeline
az pipelines run \
  --org https://dev.azure.com/ctn-demo \
  --project ASR \
  --name "ASR-Booking-Portal" \
  --branch feature/async-document-processing
```

### 3. Deploy Frontend
Frontend builds/deploys with API (same pipeline)

### 4. Verify Deployment
```bash
# Check API version
curl https://func-ctn-booking-prod.azurewebsites.net/api/v1/version

# Test job endpoint
curl https://func-ctn-booking-prod.azurewebsites.net/api/v1/jobs/test-job-id \
  -H "Authorization: Bearer $TOKEN"
```

---

## Rollback Plan

If issues occur:
1. **Switch back to main branch** (synchronous processing)
2. **Keep processing-jobs container** (no data loss)
3. **Investigate issue** on feature branch
4. **Re-deploy when fixed**

No data migration required - backwards compatible.

---

## Performance Benefits

### Before (Synchronous)
- HTTP request blocks for ~2 minutes
- Risk of timeout at 230 seconds
- User sees simulated progress (inaccurate)
- Single-threaded processing

### After (Asynchronous)
- HTTP request returns in <1 second
- No timeout risk
- User sees real progress
- Multiple documents can process concurrently
- Better server resource utilization

---

## Future Enhancements

### 1. Azure Queue Storage (Optional)
Replace in-function async with Azure Queue:
- More robust job queue
- Automatic retry logic
- Poison message handling
- Better for high volume

### 2. Job Retention Policy
Auto-delete old jobs:
- Keep completed jobs for 7 days
- Keep failed jobs for 30 days
- Reduce Cosmos DB storage costs

### 3. Webhooks (Optional)
Notify client when job completes:
- Reduce polling overhead
- Faster notification
- Better for integrations

### 4. Batch Processing
Process multiple documents in one job:
- Upload ZIP file
- Process all PDFs inside
- Single job for batch

---

## Monitoring

### Key Metrics
1. **Job Creation Rate** - Jobs created per hour
2. **Processing Time** - Average time from queued → completed
3. **Success Rate** - % jobs completed vs failed
4. **Polling Rate** - Frontend poll requests per minute
5. **Stage Duration** - Time spent in each stage

### Alerts
- Job processing time >5 minutes (investigate)
- Job failure rate >10% (investigate)
- Processing-jobs container >10,000 items (cleanup)

---

## Summary

✅ **Implemented:** Async document processing with real-time status updates
✅ **Security:** IDOR protection, sanitized errors
✅ **UX:** Real progress tracking, no timeout
✅ **Performance:** Non-blocking uploads, concurrent processing
✅ **Testing:** Ready for TE agent validation

**Next Steps:**
1. Create `processing-jobs` Cosmos DB container
2. Deploy to dev environment via Azure DevOps
3. Run E2E tests with TE agent
4. Merge to main if tests pass

---

**Branch:** `feature/async-document-processing`
**Commit:** `bbc6603` - feat: Implement async document processing to fix Claude timeout issue
