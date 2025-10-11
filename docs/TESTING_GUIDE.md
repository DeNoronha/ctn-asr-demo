# Testing Guide

## Overview

This guide covers testing procedures for the CTN Association Register application.

## Local Testing

### Frontend Testing

**1. Start Development Server:**
```bash
cd web
npm start
```
Access: http://localhost:3000

**2. Test Authentication:**
- [ ] Login redirects to Azure Entra ID
- [ ] Successful login redirects back to app
- [ ] User info displays correctly
- [ ] Logout works

**3. Test Member Management:**
- [ ] Members grid loads and displays data
- [ ] Search functionality works
- [ ] Sorting works on all columns
- [ ] Create new member form works
- [ ] Member detail tabs load correctly
- [ ] Contact CRUD operations work
- [ ] Endpoint CRUD operations work

**4. Test KvK Verification:**
- [ ] Upload PDF shows file picker
- [ ] PDF uploads successfully
- [ ] Verification status displays
- [ ] View document link works
- [ ] Admin review queue loads
- [ ] Review actions work (approve/reject)

**5. Test Dashboard:**
- [ ] All stat cards display correct data
- [ ] Charts render properly
- [ ] Data updates after member changes

**6. Test Responsive Design:**
- [ ] Desktop view (1920x1080)
- [ ] Tablet view (768x1024)
- [ ] Mobile view (375x667)
- [ ] Sidebar collapses on mobile

### Backend Testing

**1. Start Function App:**
```bash
cd api
func start --cors http://localhost:3000
```

**2. Test API Endpoints:**

Using curl or Postman:

```bash
# Get members
curl http://localhost:7071/api/v1/members

# Get specific member
curl http://localhost:7071/api/v1/members/{orgId}

# Create member
curl -X POST http://localhost:7071/api/v1/members \
  -H "Content-Type: application/json" \
  -d '{"legal_name":"Test Company","domain":"test.com"}'

# Issue token
curl -X POST http://localhost:7071/api/v1/endpoints/{endpointId}/tokens
```

**3. Test Database Connectivity:**
```bash
psql "host=psql-ctn-demo-asr-dev.postgres.database.azure.com port=5432 dbname=asr_dev user=asradmin password=[REDACTED] sslmode=require"
```

Run sample queries:
```sql
SELECT COUNT(*) FROM legal_entity;
SELECT COUNT(*) FROM contact;
SELECT COUNT(*) FROM token;
```

**4. Test File Upload:**
- [ ] Upload small PDF (< 1MB)
- [ ] Upload large PDF (5-10MB)
- [ ] Upload non-PDF (should fail)
- [ ] Check blob storage contains file
- [ ] Check database updated with URL

## Production Testing

### Pre-Deployment Checklist

**Code Quality:**
- [ ] TypeScript compiles without errors
- [ ] No console.error in code
- [ ] Environment variables configured
- [ ] Secrets not in code

**Configuration:**
- [ ] `.env.production` has production URLs
- [ ] `staticwebapp.config.json` present
- [ ] CORS configured for production domain
- [ ] Database connection strings correct

### Post-Deployment Verification

**1. Verify Deployments:**
```bash
# Frontend
curl -I https://calm-tree-03352ba03.1.azurestaticapps.net
# Should return 200

# API
curl https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/members
# Should return JSON array
```

**2. Test Authentication Flow:**
- [ ] Navigate to app
- [ ] Login with Azure Entra ID
- [ ] Verify redirect to correct URL
- [ ] Check token in browser storage
- [ ] Logout and verify session cleared

**3. Test Core Functionality:**
- [ ] Dashboard loads with real data
- [ ] Members grid displays data
- [ ] Create new member
- [ ] View member details
- [ ] Add contact
- [ ] Add endpoint
- [ ] Issue token
- [ ] Upload KvK document
- [ ] Verify document status

**4. Test Admin Features:**
- [ ] KvK review queue loads
- [ ] Review flagged document
- [ ] Approve/reject actions work
- [ ] Email notifications sent

**5. Browser Compatibility:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

**6. Performance Check:**
- [ ] Page load < 3 seconds
- [ ] API response < 1 second
- [ ] No console errors
- [ ] No 404 errors in Network tab

## Integration Testing

### KvK Document Verification Flow

**Complete end-to-end test:**

1. **Member uploads document:**
   - Login as member
   - Navigate to KvK Verification tab
   - Upload valid KvK PDF
   - Verify "Uploading..." indicator

2. **System processes:**
   - Check Function App logs for processing
   - Verify blob storage contains file
   - Check database status = 'pending'
   - Wait for processing to complete

3. **Verification completes:**
   - Refresh page
   - Verify status updated (verified/failed/flagged)
   - Check extracted data displayed
   - Verify any flags shown

4. **Admin reviews (if flagged):**
   - Login as admin
   - Navigate to KvK Review Queue
   - Find flagged document
   - Review details
   - Approve or reject
   - Add notes

5. **Verify notification:**
   - Check member receives email
   - Email contains correct info
   - Links work correctly

### Token Issuance Flow

1. **Request token:**
   - Login as member
   - Navigate to Tokens tab
   - Click "Request Token"
   - Fill in form

2. **Admin issues token:**
   - Login as admin
   - Navigate to Members
   - Find member
   - Click "Issue Token"

3. **Verify token:**
   - Check token displays correctly
   - Copy token
   - Verify JWT structure
   - Check expiration date

4. **Use token:**
   - Call API with token in Authorization header
   - Verify API accepts token
   - Verify API rejects invalid token

## Load Testing (Optional)

Use Azure Load Testing or similar tool:

```bash
# Example with Apache Bench
ab -n 1000 -c 10 https://func-ctn-demo-asr-dev.azurewebsites.net/api/v1/members
```

**Targets:**
- 100 concurrent users
- < 2 second response time
- 99.9% success rate

## Security Testing

### Authentication
- [ ] Cannot access app without login
- [ ] Cannot access API without valid token
- [ ] Tokens expire correctly
- [ ] Refresh tokens work

### Authorization
- [ ] Members cannot access admin features
- [ ] Members can only see their own data
- [ ] Admin can see all data

### Data Protection
- [ ] SQL injection prevented (parameterized queries)
- [ ] XSS prevented (React escapes by default)
- [ ] CSRF tokens in forms
- [ ] HTTPS enforced
- [ ] Sensitive data encrypted in transit

### File Upload Security
- [ ] Only PDF files accepted
- [ ] File size limits enforced (10MB)
- [ ] Malicious files rejected
- [ ] Files stored with private access

## Database Testing

### Data Integrity
```sql
-- Check for orphaned records
SELECT COUNT(*) FROM contact WHERE legal_entity_id NOT IN (SELECT legal_entity_id FROM legal_entity);

-- Check for missing required fields
SELECT COUNT(*) FROM legal_entity WHERE primary_legal_name IS NULL;

-- Verify audit logs capture all changes
SELECT COUNT(*) FROM audit_logs WHERE created_at > NOW() - INTERVAL '1 day';
```

### Migration Testing
1. Backup database
2. Run migration on test database
3. Verify schema changes
4. Test rollback if needed
5. Apply to production

## Monitoring

### Application Insights (Future)
- Response times
- Error rates
- User flows
- Custom events

### Function App Logs
```bash
func azure functionapp logstream func-ctn-demo-asr-dev
```

Check for:
- Errors
- Performance issues
- Failed requests

### Database Monitoring
- Query performance
- Connection pool usage
- Slow queries
- Lock waits

## Regression Testing

After each deployment, run quick regression test:

**5-Minute Smoke Test:**
1. [ ] Login works
2. [ ] Dashboard loads
3. [ ] Members grid displays
4. [ ] Create member works
5. [ ] API returns 200

**Full Regression (30 minutes):**
- All authentication flows
- All CRUD operations
- All integrations (KvK, email)
- All admin features
- All member features

## Test Data

### Sample Members
```sql
INSERT INTO legal_entity (org_id, primary_legal_name, domain, membership_type, status)
VALUES 
  ('org:test1', 'Test Company 1', 'test1.com', 'full', 'active'),
  ('org:test2', 'Test Company 2', 'test2.com', 'associate', 'active');
```

### Sample Contacts
```sql
INSERT INTO contact (legal_entity_id, first_name, last_name, email, phone)
VALUES 
  ((SELECT legal_entity_id FROM legal_entity WHERE org_id = 'org:test1'), 
   'John', 'Doe', 'john@test1.com', '+31612345678');
```

### Cleanup Test Data
```sql
DELETE FROM legal_entity WHERE org_id LIKE 'org:test%';
```

## Issue Tracking

Report issues to:
- Azure DevOps Boards: https://dev.azure.com/ctn-demo/ASR/_workitems
- Tag: `bug`, `test-failure`, priority level

---

**Last Updated:** October 12, 2025
