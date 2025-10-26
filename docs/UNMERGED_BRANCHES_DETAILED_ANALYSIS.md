# Detailed Unmerged Branches Analysis
**Generated:** 2025-10-26 21:00 UTC
**Current Main:** fc7048a (fix: Add missing npm install steps and Rollup Linux binary)
**Purpose:** Complete audit of all unmerged feature branch commits for safe merge planning

---

## 🚨 CRITICAL CONTEXT

### Recent Fixes on Main (DO NOT OVERWRITE!)
```
fc7048a - Pipeline fixes: npm install + Rollup Linux binary
45a7b08 - audit_logs wrapped in try-catch + last verified date display
ac8c14d - getEndpoints wrapped in try-catch for KvK tab visibility
254acfa - Lesson #34 documentation (cascading failures)
db84b14 - KvK Registry deployment trigger
```

### Folder Renames (October 25-26, 2025)
- Oct 25: `web/` → `admin-portal/` (commit 3ece9db)
- Oct 26: `portal/` → `member-portal/` (commit d1ccd9e)

### Why This Matters
Feature branches were created BEFORE renames but were updated during recovery.
Check each commit carefully for conflicts with recent fixes.

---

# Branch 1: feature/week2-high-priority-fixes

**Last Updated:** 2025-10-23 23:10:44 +0200
**Commits Not on Main:** 59
**Base Branch:** Contains all Week 2 HIGH priority work

## Summary
This branch contains booking portal improvements, admin portal fixes, security updates, 
and KvK verification work. **HIGH RISK** - contains changes to files we just fixed.

---

## All Commits (Reverse Chronological)

### 42bccbb - docs: Add portal-specific branch strategy and workflow
**Date:** 2025-10-22 11:05:36 +0200
**Author:** Ramon


### 9c15f74 - Merge branch 'feature/admin-portal'
**Date:** 2025-10-22 11:41:55 +0200
**Author:** Ramon


### 65e65fb - chore: Repository cleanup - remove compiled files and debug artifacts
**Date:** 2025-10-22 11:54:53 +0200
**Author:** Ramon


### c5fd877 - refactor: Rename portals for consistency and standardize workspace configuration
**Date:** 2025-10-22 12:02:03 +0200
**Author:** Ramon


### 332b731 - chore: Remove debug artifacts and prevent future tracking
**Date:** 2025-10-22 12:06:25 +0200
**Author:** Ramon


### ea49cab - docs: Aggressive documentation cleanup - 92% reduction
**Date:** 2025-10-22 12:11:33 +0200
**Author:** Ramon


### e01bc9c - docs: Comprehensive recursive cleanup - Remove 53 scattered documentation files
**Date:** 2025-10-22 12:19:02 +0200
**Author:** Ramon


### 05b57dd - fix: Reorder sidebar menu and simplify Subscriptions page
**Date:** 2025-10-22 12:37:44 +0200
**Author:** Ramon


### 6ab5ce7 - fix: Remove unused subscription/newsletter/task features and consolidate audit tables
**Date:** 2025-10-22 12:43:08 +0200
**Author:** Ramon


### 4139b18 - docs: Document admin portal fixes completed on 2025-10-22
**Date:** 2025-10-22 12:45:47 +0200
**Author:** Ramon


### 27c049a - fix: Move Subscriptions and Newsletters just above About in sidebar
**Date:** 2025-10-22 12:46:59 +0200
**Author:** Ramon


### 6cca978 - fix: Convert result values to lowercase in audit table migration
**Date:** 2025-10-22 13:26:11 +0200
**Author:** Ramon


### 29ab94c - fix: Map all audit result values to success/failure in migration
**Date:** 2025-10-22 13:29:22 +0200
**Author:** Ramon


### 6b1b48a - fix: Update admin portal pipeline to use admin-portal directory
**Date:** 2025-10-22 13:41:25 +0200
**Author:** Ramon


### de8a9e2 - fix: Update member portal pipeline to use member-portal directory
**Date:** 2025-10-22 13:43:01 +0200
**Author:** Ramon


### 9dc2a85 - fix: Replace lucide-react icons with emojis in member portal
**Date:** 2025-10-22 13:52:09 +0200
**Author:** Ramon


### efa55f6 - fix: Add @remix-run/router and archive old migrations
**Date:** 2025-10-22 13:54:37 +0200
**Author:** Ramon


### bd73017 - fix: Add @progress/kendo-draggable-common to member portal
**Date:** 2025-10-22 13:55:58 +0200
**Author:** Ramon


### 008aa51 - fix: Correct kendo-draggable-common version and update lock file
**Date:** 2025-10-22 13:58:24 +0200
**Author:** Ramon


### a030bc0 - fix: Match Subscriptions page styling to Newsletters page
**Date:** 2025-10-22 14:15:37 +0200
**Author:** Ramon


### e086ad5 - docs: Update COMPLETED_ACTIONS.md with tasks from October 22, 2025
**Date:** 2025-10-22 14:21:28 +0200
**Author:** Ramon


### 5eb0c32 - fix: Add SQL scripts to investigate and fix referential integrity issues
**Date:** 2025-10-22 14:29:59 +0200
**Author:** Ramon


### 7b94dea - fix: Replace migration with tested version from archive
**Date:** 2025-10-22 14:30:18 +0200
**Author:** Ramon


### f0ff952 - fix: Add script to cleanup unused party_reference records
**Date:** 2025-10-22 14:32:24 +0200
**Author:** Ramon


### dd0e0a8 - fix: Add script to sync KVK/LEI from members to legal_entity_number
**Date:** 2025-10-22 14:32:51 +0200
**Author:** Ramon


### a6df33e - fix: Add script to drop remaining unused tables from removed features
**Date:** 2025-10-22 14:34:24 +0200
**Author:** Ramon


### 1998a1f - fix: Allow admin access to getEndpointsByEntity endpoint
**Date:** 2025-10-22 14:46:36 +0200
**Author:** Ramon


### fe68d56 - fix: Improve KvK verification error messages
**Date:** 2025-10-22 14:51:13 +0200
**Author:** Ramon


### 12d3918 - fix: Improve About page environment display and badge positioning
**Date:** 2025-10-22 14:53:40 +0200
**Author:** Ramon


### 61d5389 - chore: Reorganize database files and sanitize documentation
**Date:** 2025-10-22 15:15:14 +0200
**Author:** Ramon


### 88bdaed - fix: Add version.json copy to API build script for manual deployments
**Date:** 2025-10-22 15:32:13 +0200
**Author:** Ramon


### bbf74e1 - fix: Replace Kendo Badge with custom styled badge to prevent header positioning
**Date:** 2025-10-22 15:34:38 +0200
**Author:** Ramon


### 5b52345 - fix: Check permissions in GetLegalEntity handler for admin access
**Date:** 2025-10-22 15:49:08 +0200
**Author:** Ramon


### edf5b39 - fix: KvK API integration - map Dutch field names to English data structure
**Date:** 2025-10-22 16:00:11 +0200
**Author:** Ramon


### 1e6b2f8 - feat: Add comprehensive KvK registry data storage and display
**Date:** 2025-10-22 16:10:47 +0200
**Author:** Ramon


### 3258004 - fix: Add MapPin icon for KvK Registry component
**Date:** 2025-10-22 16:14:10 +0200
**Author:** Ramon


### 68c4dce - docs: Update CLAUDE.md with correct deployment process
**Date:** 2025-10-22 16:31:19 +0200
**Author:** Ramon


### 4295b86 - fix: Extract and store all KvK registry fields from API response
**Date:** 2025-10-22 16:55:19 +0200
**Author:** Ramon


### de08c6e - fix: Separate backend and frontend deployments to prevent 404s
**Date:** 2025-10-22 17:13:11 +0200
**Author:** Ramon


### 07eb8f2 - fix: Correct Claude API model name for booking portal extraction
**Date:** 2025-10-22 17:22:47 +0200
**Author:** Ramon


### acf0ba5 - fix: Add diagnostic endpoint and enhance error logging for booking portal
**Date:** 2025-10-22 17:36:00 +0200
**Author:** Ramon


### 42cb965 - fix: Booking portal Claude API and deployment issues
**Date:** 2025-10-22 17:57:02 +0200
**Author:** Ramon


### 8639e90 - fix: Replace pdf-parse with pdfjs-dist to fix canvas dependency issues
**Date:** 2025-10-22 18:21:54 +0200
**Author:** Ramon


### 16acd81 - fix: Use correct pdfjs-dist legacy path - TESTED AND WORKING
**Date:** 2025-10-22 19:20:09 +0200
**Author:** Ramon


### 1fa7f7c - fix: Complete Document Intelligence implementation and validation page
**Date:** 2025-10-22 20:22:37 +0200
**Author:** Ramon


### 8eac804 - feat: Add Kendo UI components and fix booking display issues
**Date:** 2025-10-22 20:39:12 +0200
**Author:** Ramon


### b4612e1 - fix: Remove TypeScript checking from build script to bypass type errors
**Date:** 2025-10-22 20:41:38 +0200
**Author:** Ramon


### ebc3920 - fix: Update pipeline to handle npm workspace structure
**Date:** 2025-10-22 20:46:29 +0200
**Author:** Ramon


### b8a3699 - fix: Correct Kendo Grid column field names for Confidence and Actions
**Date:** 2025-10-22 22:35:52 +0200
**Author:** Ramon


### fa4ea20 - fix: Remove field attribute from Actions column to display buttons
**Date:** 2025-10-22 22:48:58 +0200
**Author:** Ramon


### bfea1d9 - feat: Add return URL support for authentication flow
**Date:** 2025-10-22 23:10:34 +0200
**Author:** Ramon


### 613232c - fix: Update Kendo Grid to use cells API (v9.4.0+) instead of deprecated cell prop
**Date:** 2025-10-22 23:31:19 +0200
**Author:** Ramon


### 2974e42 - feat: Add dynamic form rendering for transport orders
**Date:** 2025-10-23 08:36:12 +0200
**Author:** Ramon


### a36ace8 - feat: Add DCSA Booking 2.0.2 multimodal transport and inland terminal extensions
**Date:** 2025-10-23 08:54:12 +0200
**Author:** Ramon


### ad53f93 - feat: Add comprehensive UI/UX improvements to booking portal
**Date:** 2025-10-23 09:10:15 +0200
**Author:** Ramon


### b22d11f - feat: Add multi-leg transport journey support and fix document labels
**Date:** 2025-10-23 09:28:07 +0200
**Author:** Ramon


### 148e733 - rebrand: Transform Booking Portal to CTN DocuFlow
**Date:** 2025-10-23 09:38:03 +0200
**Author:** Ramon


### b732f70 - fix: Remove accidentally committed deployment .zip files
**Date:** 2025-10-23 09:44:07 +0200
**Author:** Ramon


### fe29627 - feat: Add comprehensive quality validation and agent reviews for CTN DocuFlow
**Date:** 2025-10-23 10:30:26 +0200
**Author:** Ramon


### 0c5754b - fix: Critical security fixes for booking portal API (Week 1 CRITICAL issues)
**Date:** 2025-10-23 23:10:44 +0200
**Author:** Ramon



---

## Files Modified by This Branch

```
A	admin-portal/src/components/KvkRegistryDetails.css
A	admin-portal/src/components/KvkRegistryDetails.tsx
A	admin-portal/src/components/SubscriptionsGrid.tsx
A	admin-portal/src/components/TasksGrid.tsx
A	admin-portal/vite.config.ts
A	api/src/functions/getKvkRegistryData.ts
A	api/src/version.json
A	booking-portal/api/.gitignore
A	booking-portal/api/DiagnosticTest/function.json
A	booking-portal/api/DiagnosticTest/index.ts
A	booking-portal/api/tests/.gitignore
A	booking-portal/api/tests/api-bookings-test.sh
A	booking-portal/api/tests/api-diagnostics-test.sh
A	booking-portal/api/tests/api-upload-test.sh
A	booking-portal/api/tests/api-validation-test.sh
A	booking-portal/api/tests/README.md
A	booking-portal/api/tests/run-all-api-tests.sh
A	booking-portal/e2e/bookings-grid-journey-timeline.spec.ts
A	booking-portal/e2e/document-upload-progress.spec.ts
A	booking-portal/e2e/transport-order-validation.spec.ts
A	booking-portal/playwright.config.ts
A	booking-portal/TEST_COVERAGE_REPORT.md
A	booking-portal/TEST_SUITE_SUMMARY.md
A	booking-portal/tests/TRANSPORT_ORDER_VALIDATION_TEST_REPORT.md
A	booking-portal/tests/transport-order-validation-test.sh
A	booking-portal/web/e2e/pdf-viewer-diagnosis.spec.ts
A	booking-portal/web/e2e/screenshots/pdf-viewer-diagnosis.png
A	booking-portal/web/src/components/validation/TransportJourneyTimeline.tsx
A	booking-portal/web/src/components/validation/TransportOrderForm.tsx
A	database/current_schema.csv
A	database/get_schema.sql
A	database/migrations/013_fix_referential_integrity_v2.sql
A	database/migrations/014_kvk_registry_data.sql
A	database/migrations/archive/012_consolidate_audit_tables.sql
A	database/migrations/archive/013_ensure_legal_entities_exist_FIXED.sql
A	database/migrations/cleanup_unused_party_references.sql
A	database/migrations/drop_unused_tables.sql
A	database/migrations/investigate_integrity.sql
A	database/migrations/INVESTIGATION_QUERIES.sql
A	database/migrations/QUICK_START_GUIDE.md
A	database/migrations/sync_member_identifiers.sql
A	docs/archive/ADMIN_PORTAL_FIXES_2025-10-22.md
A	docs/CTN_DOCUFLOW_COMPREHENSIVE_REVIEW_2025-10-23.md
A	docs/CTN_DOCUFLOW_EXECUTIVE_SUMMARY.md
A	docs/database/COSMOS_DB_REVIEW_2025-10-23.md
A	docs/database/COSMOS_DB_REVIEW_SUMMARY.md
A	docs/database/DATABASE_REVIEW_2025-10-22.md
D	.github/workflows/SETUP_INSTRUCTIONS.md
D	api/docs/logging.md
D	api/docs/rate-limiting.md
D	api/src/functions/createNewsletter.ts
D	api/src/functions/createSubscription.ts
D	api/src/functions/createTask.ts
D	api/src/functions/getNewsletters.ts
D	api/src/functions/getSubscriptions.ts
D	api/src/functions/getTasks.ts
D	api/src/functions/updateSubscription.ts
D	api/src/functions/updateTask.ts
D	api/tests/ORCHESTRATION_SECURITY_TEST_REPORT.md
D	api/tests/QUICK_START.md
D	api/tests/README.md
D	api/tests/TEST_SUITE_SUMMARY.md
D	booking-portal/api/AddToKnowledgeBase/index.js
D	booking-portal/api/AddToKnowledgeBase/index.js.map
D	booking-portal/api/GetBookingById/index.js
D	booking-portal/api/GetBookingById/index.js.map
D	booking-portal/api/GetBookings/index.js
D	booking-portal/api/GetBookings/index.js.map
D	booking-portal/api/GetDocumentSasUrl/index.js
D	booking-portal/api/GetDocumentSasUrl/index.js.map
D	booking-portal/api/GetTenants/index.js
D	booking-portal/api/GetTenants/index.js.map
D	booking-portal/api/shared/auth.js
D	booking-portal/api/shared/auth.js.map
D	booking-portal/api/shared/claudeExtractor.js
D	booking-portal/api/shared/claudeExtractor.js.map
D	booking-portal/api/shared/dcsaSchemas.js
D	booking-portal/api/shared/dcsaSchemas.js.map
D	booking-portal/api/shared/documentClassifier.js
D	booking-portal/api/shared/documentClassifier.js.map
D	booking-portal/api/shared/knowledgeBase.js
D	booking-portal/api/shared/knowledgeBase.js.map
D	booking-portal/api/shared/multipart.js
D	booking-portal/api/shared/multipart.js.map
D	booking-portal/api/shared/pdfExtractor.js
D	booking-portal/api/shared/pdfExtractor.js.map
D	booking-portal/api/shared/pdfSplitter.js
D	booking-portal/api/shared/pdfSplitter.js.map
D	booking-portal/api/UploadDocument/index.js
D	booking-portal/api/UploadDocument/index.js.map
D	booking-portal/api/ValidateBooking/index.js
D	booking-portal/api/ValidateBooking/index.js.map
D	booking-portal/BUG_REPORT_VALIDATION_PAGE.md
D	booking-portal/docs/database/COSMOS_DB_PERFORMANCE_REVIEW.md
D	booking-portal/docs/database/QUICK_FIX_GUIDE.md
D	booking-portal/IMPLEMENTATION_PLAN.md
D	booking-portal/README.md
D	booking-portal/web/e2e/debug/ANALYSIS_REPORT.md
D	booking-portal/web/package-lock.json
D	ctn-mcp-server/DEPLOYMENT_INFO.md
D	ctn-mcp-server/HOWTO_GUIDE_FOR_DOCS_PORTAL.md
D	ctn-mcp-server/README.md
D	database/DATABASE_SCHEMA_MANAGEMENT.md
D	database/migrations/archive_2025-10-20/010_performance_indexes_README.md
D	database/migrations/archive_2025-10-20/DEPLOYMENT_INSTRUCTIONS.md
D	database/migrations/archive_2025-10-20/README_MIGRATIONS.md
D	database/NEXT_STEPS.md
D	database/README.md
D	database/SCHEMA_REVIEW_2025-10-20.md
D	docs/AIKIDO_KEY_ROTATION.md
D	docs/API_DEPLOYMENT_FIX.md
D	docs/API_VERSIONING_STRATEGY.md
D	docs/APPLICATION_INSIGHTS_SETUP.md
D	docs/archive/AUDIT_TRAIL_IMPLEMENTATION_SUMMARY.md
D	docs/archive/AUTONOMOUS_WORK_SESSION_SUMMARY.md
D	docs/archive/BUG-008-IMPLEMENTATION-SUMMARY.md
D	docs/archive/IDENTIFIER_CRUD_IMPLEMENTATION_COMPLETE.md
D	docs/archive/IMPLEMENTATION_COMPLETE.md
D	docs/archive/SESSION_SUMMARY_2025-10-13.md
D	docs/archive/SESSION_SUMMARY_2025-10-16_AUTONOMOUS_BUG_FIXES.md
D	docs/archive/SESSION_SUMMARY_20251016_quality_scan_analysis.md
D	docs/archive/URGENT_ADD_KVK_TO_CONTARGO.md
D	docs/archive/URGENT_PRODUCTION_DIAGNOSTIC_REPORT.md
D	docs/AUTH_FIX_INSTRUCTIONS.md
D	docs/backend-requirements/IDENTIFIER_VERIFICATION_API.md
D	docs/BDI_INTEGRATION.md
D	docs/BIOME_CONTINUEONERROR_EXPLAINED.md
D	docs/BOOKING_PORTAL_PIPELINE_FIXES_2025-10-20.md
D	docs/bugs/BUG_FIX_REPORT_2025-10-15.md
D	docs/bugs/BUG_REPORT_IDENTIFIER_ISSUE.md
D	docs/bugs/IDENTIFIER_CRUD_BUG_FIX_REPORT.md
D	docs/CODE_QUALITY_SUMMARY.md
D	docs/CRITICAL_SECURITY_FIXES_COMPLETED.md
D	docs/DEPLOYMENT_ARCHITECTURE_BOOKING_PORTAL.md
D	docs/DEPLOYMENT_GUIDE.md
D	docs/DOCUMENTATION_UPDATE_2025-10-21.md
D	docs/HEALTH_MONITORING.md
D	docs/KVK_DOCUMENT_VERIFICATION_FEATURE.md
D	docs/LOGGING_GUIDE.md
D	docs/MIGRATION_SESSION_2025-10-20.md
D	docs/migrations/v1-to-v2-example.md
D	docs/ORCHESTRATION_API_IMPLEMENTATION_PLAN.md
D	docs/orchestrator-portal-security.md
D	docs/PORTAL_STATUS_REPORT.md
D	docs/PRODUCTION_READINESS_CHECKLIST.md
D	docs/QUICK_DIAGNOSTIC_GUIDE.md
D	docs/RELEASE_INSTRUCTIONS.md
D	docs/SECRET_ROTATION_GUIDE.md
D	docs/SECURITY_AUDIT_REPORT.md
D	docs/SECURITY_ROTATION_REQUIRED.md
D	docs/SESSION_SUMMARY_2025-10-18_SECURITY_AND_ORCHESTRATION.md
D	docs/SESSION_SUMMARY_2025-10-20.md
D	docs/STABLE_RELEASE_INFO.md
D	docs/TELEMETRY_IMPLEMENTATION_SUMMARY.md
D	docs/TELEMETRY_QUICK_REFERENCE.md
D	docs/testing/AZURE_DEVOPS_TEST_CASES.md
D	docs/testing/CI_CD_INTEGRATION.md
D	docs/testing/IDENTIFIER_ENDPOINTS_TEST_REPORT.md
D	docs/testing/PLAYWRIGHT_SETUP.md
D	docs/testing/PLAYWRIGHT_SUCCESS.md
D	docs/testing/PRODUCTION_TEST_REPORT.md
D	docs/testing/TEST_EXECUTION_REPORT.md
D	docs/testing/TEST_EXECUTION_SUMMARY.md
D	docs/testing/TEST_QUICK_START.md
D	docs/testing/TEST_REPORT_KVK_VERIFICATION.md
D	docs/testing/TEST_REPORT_SECURITY_HEADERS.md
D	docs/VITE_CONFIG_CENTRALIZATION.md
D	infrastructure/bicep/README.md
D	infrastructure/logic-apps/README.md
D	infrastructure/readme.md
D	orchestrator-portal/docs/ARCHITECTURE.md
D	orchestrator-portal/docs/archive/ROADMAP_UPDATES.md
D	orchestrator-portal/docs/archive/TONIGHT_SUMMARY.md
D	orchestrator-portal/docs/testing/PORTAL_TESTING_REPORT.md
D	orchestrator-portal/docs/testing/TEST_REPORT.md
D	orchestrator-portal/docs/testing/TESTING_SUMMARY.md
D	orchestrator-portal/e2e/README.md
D	orchestrator-portal/mock-api/API_SPECIFICATION.md
D	orchestrator-portal/mock-api/INTEGRATION_EXAMPLES.md
D	orchestrator-portal/mock-api/QUICKSTART.md
D	orchestrator-portal/mock-api/README.md
D	orchestrator-portal/README.md
D	packages/api-client/IMPLEMENTATION_SUMMARY.md
D	packages/api-client/README.md
D	packages/api-client/USAGE_EXAMPLES.md
D	portal/README.md
D	portal/web/e2e/MEMBER_PORTAL_BUG_REPORT.md
D	portal/web/e2e/MEMBER_PORTAL_TEST_DELIVERABLES.md
D	portal/web/e2e/MEMBER_PORTAL_TEST_RESULTS.md
D	portal/web/e2e/README.md
D	portal/web/e2e/VITE_MIGRATION_TEST_RESULTS.md
D	shared/vite-config-base/README.md
D	web/diagnostic-01-entity-loaded.png
D	web/diagnostic-02-before-add.png
D	web/diagnostic-03-dialog-open.png
D	web/diagnostic-error-no-add-button.png
D	web/docs/LOKALISE_INTEGRATION.md
D	web/e2e/MFA_WORKAROUND.md
D	web/e2e/QUICK_START.md
D	web/e2e/README.md
D	web/package-lock.json
D	web/README.md
D	web/src/components/SubscriptionsGrid.tsx
D	web/src/components/TasksGrid.tsx
D	web/src/react-dom-server-stub.js
D	web/test-identifier-api.js
D	web/vite.config.ts
M	.azure-pipelines/admin-portal.yml
M	.azure-pipelines/member-portal.yml
M	.azure-pipelines/playwright-tests.yml
M	.github/workflows/playwright-tests.yml
M	.gitignore
M	api/package.json
M	api/src/essential-index.ts
M	api/src/functions/getEndpointsByEntity.ts
M	api/src/functions/GetLegalEntity.ts
M	api/src/functions/uploadKvkDocument.ts
M	api/src/services/kvkService.ts
M	booking-portal/api/GetBookingById/index.ts
M	booking-portal/api/GetBookings/index.ts
M	booking-portal/api/GetDocumentSasUrl/index.ts
M	booking-portal/api/package.json
M	booking-portal/api/shared/auth.ts
M	booking-portal/api/shared/claudeExtractor.ts
M	booking-portal/api/shared/dcsaSchemas.ts
M	booking-portal/api/shared/documentClassifier.ts
M	booking-portal/api/shared/pdfExtractor.ts
M	booking-portal/api/tsconfig.json
M	booking-portal/api/UploadDocument/index.ts
M	booking-portal/azure-pipelines.yml
M	booking-portal/web/index.html
M	booking-portal/web/package.json
M	booking-portal/web/src/auth/ProtectedRoute.tsx
M	booking-portal/web/src/components/auth/LoginPage.tsx
M	booking-portal/web/src/components/Header.tsx
M	booking-portal/web/src/main.tsx
M	booking-portal/web/src/pages/Bookings.tsx
M	booking-portal/web/src/pages/Upload.tsx
M	booking-portal/web/src/pages/Validation.tsx
M	CLAUDE.md
M	database/get_indexes.sql
M	docs/COMPLETED_ACTIONS.md
M	package-lock.json
M	package.json
M	README.md
R090	web/src/components/MemberDetailView.tsx	admin-portal/src/components/MemberDetailView.tsx
R091	portal/src/components/NotFound.tsx	member-portal/src/components/NotFound.tsx
R091	web/src/components/About.css	admin-portal/src/components/About.css
R093	web/src/components/About.tsx	admin-portal/src/components/About.tsx
R097	web/src/services/apiV2.ts	admin-portal/src/services/apiV2.ts
R098	portal/package.json	member-portal/package.json
R098	web/package.json	admin-portal/package.json
R098	web/src/components/icons.tsx	admin-portal/src/components/icons.tsx
R099	portal/src/App.tsx	member-portal/src/App.tsx
R100	"web/.\\90f32498-5b71-4100-8774-f3ed70ed0a20-app.zip"	"admin-portal/.\\90f32498-5b71-4100-8774-f3ed70ed0a20-app.zip"
R100	"web/.\\e4e6be2f-4298-4549-a6ec-04ae788be7c9-app.zip"	"admin-portal/.\\e4e6be2f-4298-4549-a6ec-04ae788be7c9-app.zip"
R100	database/current_schema.sql	database/create_schema.sql
R100	database/migrations/archive_2025-10-20/001-enhanced-schema.sql	database/migrations/archive/001-enhanced-schema.sql
R100	database/migrations/archive_2025-10-20/002_add_contact_fields.sql	database/migrations/archive/002_add_contact_fields.sql
R100	database/migrations/archive_2025-10-20/003_link_members_to_legal_entities.sql	database/migrations/archive/003_link_members_to_legal_entities.sql
R100	database/migrations/archive_2025-10-20/004-migrate-members-data.sql	database/migrations/archive/004-migrate-members-data.sql
R100	database/migrations/archive_2025-10-20/007_kvk_verification.sql	database/migrations/archive/007_kvk_verification.sql
R100	database/migrations/archive_2025-10-20/008_admin_portal_expansion.sql	database/migrations/archive/008_admin_portal_expansion.sql
R100	database/migrations/archive_2025-10-20/009_create_audit_log_table.sql	database/migrations/archive/009_create_audit_log_table.sql
R100	database/migrations/archive_2025-10-20/010_performance_indexes.sql	database/migrations/archive/010_performance_indexes.sql
R100	database/migrations/archive_2025-10-20/011_bdi_orchestration_support.sql	database/migrations/archive/011_bdi_orchestration_support.sql
R100	database/migrations/archive_2025-10-20/012_international_registry_support.sql	database/migrations/archive/012_international_registry_support.sql
R100	database/migrations/archive_2025-10-20/013_ensure_legal_entities_exist_FIXED.sql	database/migrations/013_fix_referential_integrity.sql
R100	database/migrations/archive_2025-10-20/013_ensure_legal_entities_exist.sql	database/migrations/archive/013_ensure_legal_entities_exist.sql
R100	database/migrations/archive_2025-10-20/014_fix_members_without_legal_entity_id.sql	database/migrations/archive/014_fix_members_without_legal_entity_id.sql
R100	database/migrations/archive_2025-10-20/014_standardize_timestamp_types_DO_NOT_USE.sql	database/migrations/archive/014_standardize_timestamp_types_DO_NOT_USE.sql
R100	database/migrations/archive_2025-10-20/015_add_azure_ad_object_id.sql	database/migrations/archive/015_add_azure_ad_object_id.sql
R100	database/migrations/archive_2025-10-20/016_standardize_timestamp_types_FIXED.sql	database/migrations/archive/016_standardize_timestamp_types_FIXED.sql
R100	database/migrations/archive_2025-10-20/check_migration_014_status.sql	database/migrations/archive/check_migration_014_status.sql
R100	database/migrations/archive_2025-10-20/check_table_columns.sql	database/migrations/archive/check_table_columns.sql
R100	database/migrations/archive_2025-10-20/verify_015_migration.sql	database/migrations/archive/verify_015_migration.sql
R100	database/schema_indexes.csv	database/migrations/schema_indexes.csv
R100	portal/.env.example	member-portal/.env.example
R100	portal/.env.production	member-portal/.env.production
R100	portal/.env.production.template	member-portal/.env.production.template
R100	portal/.gitignore	admin-portal/.gitignore
R100	portal/aikido.config.js	admin-portal/aikido.config.js
R100	portal/api/tests/api-smoke-test.sh	member-portal/api/tests/api-smoke-test.sh
R100	portal/api/tests/member-portal-api-tests.sh	member-portal/api/tests/member-portal-api-tests.sh
R100	portal/biome.json	admin-portal/biome.json
R100	portal/e2e/security-headers.spec.ts	member-portal/e2e/security-headers.spec.ts
R100	portal/index.html	member-portal/index.html
R100	portal/package-lock.json	member-portal/package-lock.json
R100	portal/playwright.config.ts	member-portal/playwright.config.ts
R100	portal/public/assets/logos/contargo.png	admin-portal/public/assets/logos/contargo.png
R100	portal/public/assets/logos/ctn small.png	admin-portal/public/assets/logos/ctn small.png
R100	portal/public/assets/logos/ctn.png	admin-portal/public/assets/logos/ctn.png
R100	portal/public/assets/logos/DIL.png	admin-portal/public/assets/logos/DIL.png
R100	portal/public/assets/logos/Inland Terminals Group.png	admin-portal/public/assets/logos/Inland Terminals Group.png
R100	portal/public/assets/logos/portbase.png	admin-portal/public/assets/logos/portbase.png
R100	portal/public/assets/logos/VanBerkel.png	admin-portal/public/assets/logos/VanBerkel.png
R100	portal/public/favicon.ico	admin-portal/public/favicon.ico
R100	portal/public/logo192.png	member-portal/public/logo192.png
R100	portal/public/logo512.png	admin-portal/public/logo512.png
R100	portal/public/staticwebapp.config.json	admin-portal/public/staticwebapp.config.json
R100	portal/reports/.gitignore	admin-portal/reports/.gitignore
R100	portal/reports/.gitkeep	admin-portal/reports/.gitkeep
R100	portal/src/App.css	member-portal/src/App.css
R100	portal/src/auth/authConfig.ts	member-portal/src/auth/authConfig.ts
R100	portal/src/components/ContactsView.tsx	member-portal/src/components/ContactsView.tsx
R100	portal/src/components/Dashboard.tsx	member-portal/src/components/Dashboard.tsx
R100	portal/src/components/Endpoints.tsx	member-portal/src/components/Endpoints.tsx
R100	portal/src/components/EndpointsView.tsx	member-portal/src/components/EndpointsView.tsx
R100	portal/src/components/LanguageSwitcher.css	member-portal/src/components/LanguageSwitcher.css
R100	portal/src/components/LanguageSwitcher.tsx	admin-portal/src/components/LanguageSwitcher.tsx
R100	portal/src/components/ProfileView.tsx	member-portal/src/components/ProfileView.tsx
R100	portal/src/components/Support.tsx	member-portal/src/components/Support.tsx
R100	portal/src/components/Tokens.tsx	member-portal/src/components/Tokens.tsx
R100	portal/src/components/TokensView.tsx	member-portal/src/components/TokensView.tsx
R100	portal/src/i18n.ts	member-portal/src/i18n.ts
R100	portal/src/index.css	member-portal/src/index.css
R100	portal/src/index.tsx	member-portal/src/index.tsx
R100	portal/src/kendoLicense.ts	member-portal/src/kendoLicense.ts
R100	portal/src/locales/de/translation.json	admin-portal/src/locales/de/translation.json
R100	portal/src/locales/en/translation.json	admin-portal/src/locales/en/translation.json
R100	portal/src/locales/nl/translation.json	admin-portal/src/locales/nl/translation.json
R100	portal/src/react-app-env.d.ts	admin-portal/src/react-app-env.d.ts
R100	portal/src/services/apiClient.ts	member-portal/src/services/apiClient.ts
R100	portal/src/types.ts	member-portal/src/types.ts
R100	portal/src/vite-env.d.ts	admin-portal/src/vite-env.d.ts
R100	portal/tsconfig.json	admin-portal/tsconfig.json
R100	portal/vite.config.ts	member-portal/vite.config.ts
R100	portal/web/e2e/member-portal.spec.ts	member-portal/web/e2e/member-portal.spec.ts
R100	portal/web/e2e/vite-migration/admin-portal.spec.ts	member-portal/web/e2e/vite-migration/admin-portal.spec.ts
R100	portal/web/e2e/vite-migration/member-portal.spec.ts	member-portal/web/e2e/vite-migration/member-portal.spec.ts
R100	web/.env.example	admin-portal/.env.example
R100	web/.env.production	admin-portal/.env.production
R100	web/.env.production.template	admin-portal/.env.production.template
R100	web/.env.template	admin-portal/.env.template
R100	web/.gitignore	member-portal/.gitignore
R100	web/.pipeline-test	admin-portal/.pipeline-test
R100	web/aikido.config.js	member-portal/aikido.config.js
R100	web/biome.json	member-portal/biome.json
R100	web/e2e/admin-portal-improved.spec.ts	admin-portal/e2e/admin-portal-improved.spec.ts
R100	web/e2e/admin-portal.spec.ts	admin-portal/e2e/admin-portal.spec.ts
R100	web/e2e/admin-portal/accessibility.spec.ts	admin-portal/e2e/admin-portal/accessibility.spec.ts
R100	web/e2e/admin-portal/authentication.spec.ts	admin-portal/e2e/admin-portal/authentication.spec.ts
R100	web/e2e/admin-portal/bug-investigation-identifier-404.spec.ts	admin-portal/e2e/admin-portal/bug-investigation-identifier-404.spec.ts
R100	web/e2e/admin-portal/grid-pagination.spec.ts	admin-portal/e2e/admin-portal/grid-pagination.spec.ts
R100	web/e2e/admin-portal/identifier-workflow-production.spec.ts	admin-portal/e2e/admin-portal/identifier-workflow-production.spec.ts
R100	web/e2e/admin-portal/identifier-workflow-simple.spec.ts	admin-portal/e2e/admin-portal/identifier-workflow-simple.spec.ts
R100	web/e2e/admin-portal/identifiers-crud.spec.ts	admin-portal/e2e/admin-portal/identifiers-crud.spec.ts
R100	web/e2e/admin-portal/identifiers-manager.spec.ts	admin-portal/e2e/admin-portal/identifiers-manager.spec.ts
R100	web/e2e/admin-portal/managers-crud.spec.ts	admin-portal/e2e/admin-portal/managers-crud.spec.ts
R100	web/e2e/admin-portal/member-management.spec.ts	admin-portal/e2e/admin-portal/member-management.spec.ts
R100	web/e2e/auth.setup.ts	admin-portal/e2e/auth.setup.ts
R100	web/e2e/bug-investigation/contargo-kvk-visibility-check.spec.ts	admin-portal/e2e/bug-investigation/contargo-kvk-visibility-check.spec.ts
R100	web/e2e/debug-identifier-500.spec.ts	admin-portal/e2e/debug-identifier-500.spec.ts
R100	web/e2e/help-system.spec.ts	admin-portal/e2e/help-system.spec.ts
R100	web/e2e/kvk-verification.spec.ts	admin-portal/e2e/kvk-verification.spec.ts
R100	web/e2e/portal-smoke-test.spec.ts	admin-portal/e2e/portal-smoke-test.spec.ts
R100	web/e2e/progressive-disclosure.spec.ts	admin-portal/e2e/progressive-disclosure.spec.ts
R100	web/e2e/quick-test.spec.ts	admin-portal/e2e/quick-test.spec.ts
R100	web/e2e/security-headers.spec.ts	admin-portal/e2e/security-headers.spec.ts
R100	web/e2e/urgent-production-diagnostic.spec.ts	admin-portal/e2e/urgent-production-diagnostic.spec.ts
R100	web/e2e/urgent/add-kvk-95944192-fixed.spec.ts	admin-portal/e2e/urgent/add-kvk-95944192-fixed.spec.ts
R100	web/e2e/urgent/add-kvk-to-contargo.spec.ts	admin-portal/e2e/urgent/add-kvk-to-contargo.spec.ts
R100	web/e2e/urgent/contargo-kvk-simple.spec.ts	admin-portal/e2e/urgent/contargo-kvk-simple.spec.ts
R100	web/index.html	admin-portal/index.html
R100	web/install-kendo-form.sh	admin-portal/install-kendo-form.sh
R100	web/install-kendo.sh	admin-portal/install-kendo.sh
R100	web/install-notifications.sh	admin-portal/install-notifications.sh
R100	web/kendo-ui-license.txt	admin-portal/kendo-ui-license.txt
R100	web/playwright.config.ts	admin-portal/playwright.config.ts
R100	web/playwright/fixtures.ts	admin-portal/playwright/fixtures.ts
R100	web/playwright/global-setup.ts	admin-portal/playwright/global-setup.ts
R100	web/public/assets/logos/contargo.png	member-portal/public/assets/logos/contargo.png
R100	web/public/assets/logos/ctn small.png	member-portal/public/assets/logos/ctn small.png
R100	web/public/assets/logos/ctn.png	member-portal/public/assets/logos/ctn.png
R100	web/public/assets/logos/DIL.png	member-portal/public/assets/logos/DIL.png
R100	web/public/assets/logos/Inland Terminals Group.png	member-portal/public/assets/logos/Inland Terminals Group.png
R100	web/public/assets/logos/portbase.png	member-portal/public/assets/logos/portbase.png
R100	web/public/assets/logos/VanBerkel.png	member-portal/public/assets/logos/VanBerkel.png
R100	web/public/favicon.ico	member-portal/public/favicon.ico
R100	web/public/logo192.png	admin-portal/public/logo192.png
R100	web/public/logo512.png	member-portal/public/logo512.png
R100	web/public/manifest.json	admin-portal/public/manifest.json
R100	web/public/robots.txt	admin-portal/public/robots.txt
R100	web/public/staticwebapp.config.json	member-portal/public/staticwebapp.config.json
R100	web/public/version.json	admin-portal/public/version.json
R100	web/reports/.gitignore	member-portal/reports/.gitignore
R100	web/reports/.gitkeep	member-portal/reports/.gitkeep
R100	web/scripts/add-kvk-to-contargo.js	admin-portal/scripts/add-kvk-to-contargo.js
R100	web/scripts/capture-auth-auto.js	admin-portal/scripts/capture-auth-auto.js
R100	web/scripts/capture-auth-final.js	admin-portal/scripts/capture-auth-final.js
R100	web/scripts/capture-auth-manual.js	admin-portal/scripts/capture-auth-manual.js
R100	web/src/App.css	admin-portal/src/App.css
R100	web/src/App.test.tsx	admin-portal/src/App.test.tsx
R100	web/src/App.tsx	admin-portal/src/App.tsx
R100	web/src/auth/authConfig.ts	admin-portal/src/auth/authConfig.ts
R100	web/src/auth/AuthContext.tsx	admin-portal/src/auth/AuthContext.tsx
R100	web/src/auth/ProtectedRoute.tsx	admin-portal/src/auth/ProtectedRoute.tsx
R100	web/src/components/AdminPortal.css	admin-portal/src/components/AdminPortal.css
R100	web/src/components/AdminPortal.tsx	admin-portal/src/components/AdminPortal.tsx
R100	web/src/components/AdminSidebar.css	admin-portal/src/components/AdminSidebar.css
R100	web/src/components/AdminSidebar.tsx	admin-portal/src/components/AdminSidebar.tsx
R100	web/src/components/AdvancedFilter.css	admin-portal/src/components/AdvancedFilter.css
R100	web/src/components/AdvancedFilter.tsx	admin-portal/src/components/AdvancedFilter.tsx
R100	web/src/components/audit/AuditLogViewer.css	admin-portal/src/components/audit/AuditLogViewer.css
R100	web/src/components/audit/AuditLogViewer.tsx	admin-portal/src/components/audit/AuditLogViewer.tsx
R100	web/src/components/auth/LoginPage.css	admin-portal/src/components/auth/LoginPage.css
R100	web/src/components/auth/LoginPage.tsx	admin-portal/src/components/auth/LoginPage.tsx
R100	web/src/components/auth/MFARequired.css	admin-portal/src/components/auth/MFARequired.css
R100	web/src/components/auth/MFARequired.tsx	admin-portal/src/components/auth/MFARequired.tsx
R100	web/src/components/auth/Unauthorized.css	admin-portal/src/components/auth/Unauthorized.css
R100	web/src/components/auth/Unauthorized.tsx	admin-portal/src/components/auth/Unauthorized.tsx
R100	web/src/components/ComingSoonPlaceholder.tsx	admin-portal/src/components/ComingSoonPlaceholder.tsx
R100	web/src/components/CompanyDetails.css	admin-portal/src/components/CompanyDetails.css
R100	web/src/components/CompanyDetails.tsx	admin-portal/src/components/CompanyDetails.tsx
R100	web/src/components/CompanyForm.css	admin-portal/src/components/CompanyForm.css
R100	web/src/components/CompanyForm.tsx	admin-portal/src/components/CompanyForm.tsx
R100	web/src/components/ConfirmDialog.css	admin-portal/src/components/ConfirmDialog.css
R100	web/src/components/ConfirmDialog.tsx	admin-portal/src/components/ConfirmDialog.tsx
R100	web/src/components/ContactForm.css	admin-portal/src/components/ContactForm.css
R100	web/src/components/ContactForm.tsx	admin-portal/src/components/ContactForm.tsx
R100	web/src/components/ContactsManager.css	admin-portal/src/components/ContactsManager.css
R100	web/src/components/ContactsManager.tsx	admin-portal/src/components/ContactsManager.tsx
R100	web/src/components/Dashboard.css	admin-portal/src/components/Dashboard.css
R100	web/src/components/Dashboard.tsx	admin-portal/src/components/Dashboard.tsx
R100	web/src/components/EmptyState.css	admin-portal/src/components/EmptyState.css
R100	web/src/components/EmptyState.tsx	admin-portal/src/components/EmptyState.tsx
R100	web/src/components/EndpointManagement.css	admin-portal/src/components/EndpointManagement.css
R100	web/src/components/EndpointManagement.tsx	admin-portal/src/components/EndpointManagement.tsx
R100	web/src/components/ErrorBoundary.css	admin-portal/src/components/ErrorBoundary.css
R100	web/src/components/ErrorBoundary.tsx	admin-portal/src/components/ErrorBoundary.tsx
R100	web/src/components/ExampleUsage.tsx	admin-portal/src/components/ExampleUsage.tsx
R100	web/src/components/forms/ConditionalField.tsx	admin-portal/src/components/forms/ConditionalField.tsx
R100	web/src/components/forms/ProgressiveSection.tsx	admin-portal/src/components/forms/ProgressiveSection.tsx
R100	web/src/components/forms/StepperForm.tsx	admin-portal/src/components/forms/StepperForm.tsx
R100	web/src/components/HealthDashboard.css	admin-portal/src/components/HealthDashboard.css
R100	web/src/components/HealthDashboard.tsx	admin-portal/src/components/HealthDashboard.tsx
R100	web/src/components/help/FieldHelp.tsx	admin-portal/src/components/help/FieldHelp.tsx
R100	web/src/components/help/FieldLabel.tsx	admin-portal/src/components/help/FieldLabel.tsx
R100	web/src/components/help/help.css	admin-portal/src/components/help/help.css
R100	web/src/components/help/HelpPanel.tsx	admin-portal/src/components/help/HelpPanel.tsx
R100	web/src/components/help/HelpTooltip.tsx	admin-portal/src/components/help/HelpTooltip.tsx
R100	web/src/components/help/index.ts	admin-portal/src/components/help/index.ts
R100	web/src/components/IdentifiersManager.css	admin-portal/src/components/IdentifiersManager.css
R100	web/src/components/IdentifiersManager.tsx	admin-portal/src/components/IdentifiersManager.tsx
R100	web/src/components/IdentifierVerificationManager.css	admin-portal/src/components/IdentifierVerificationManager.css
R100	web/src/components/IdentifierVerificationManager.tsx	admin-portal/src/components/IdentifierVerificationManager.tsx
R100	web/src/components/KvkDocumentUpload.tsx	admin-portal/src/components/KvkDocumentUpload.tsx
R100	web/src/components/KvkReviewQueue.tsx	admin-portal/src/components/KvkReviewQueue.tsx
R100	web/src/components/LanguageSwitcher.css	admin-portal/src/components/LanguageSwitcher.css
R100	web/src/components/LanguageSwitcher.tsx	member-portal/src/components/LanguageSwitcher.tsx
R100	web/src/components/LoadingSpinner.css	admin-portal/src/components/LoadingSpinner.css
R100	web/src/components/LoadingSpinner.tsx	admin-portal/src/components/LoadingSpinner.tsx
R100	web/src/components/MemberDetailDialog.css	admin-portal/src/components/MemberDetailDialog.css
R100	web/src/components/MemberDetailDialog.tsx	admin-portal/src/components/MemberDetailDialog.tsx
R100	web/src/components/MemberDetailView.css	admin-portal/src/components/MemberDetailView.css
R100	web/src/components/MemberForm.css	admin-portal/src/components/MemberForm.css
R100	web/src/components/MemberForm.tsx	admin-portal/src/components/MemberForm.tsx
R100	web/src/components/MembersGrid.css	admin-portal/src/components/MembersGrid.css
R100	web/src/components/MembersGrid.tsx	admin-portal/src/components/MembersGrid.tsx
R100	web/src/components/NewslettersGrid.css	admin-portal/src/components/NewslettersGrid.css
R100	web/src/components/NewslettersGrid.tsx	admin-portal/src/components/NewslettersGrid.tsx
R100	web/src/components/NotFound.css	admin-portal/src/components/NotFound.css
R100	web/src/components/NotFound.tsx	admin-portal/src/components/NotFound.tsx
R100	web/src/components/ProgressIndicator.css	admin-portal/src/components/ProgressIndicator.css
R100	web/src/components/ProgressIndicator.tsx	admin-portal/src/components/ProgressIndicator.tsx
R100	web/src/components/ReviewTasks.tsx	admin-portal/src/components/ReviewTasks.tsx
R100	web/src/components/Settings.css	admin-portal/src/components/Settings.css
R100	web/src/components/Settings.tsx	admin-portal/src/components/Settings.tsx
R100	web/src/components/SubscriptionsGrid.css	admin-portal/src/components/SubscriptionsGrid.css
R100	web/src/components/TasksGrid.css	admin-portal/src/components/TasksGrid.css
R100	web/src/components/TokensManager.css	admin-portal/src/components/TokensManager.css
R100	web/src/components/TokensManager.tsx	admin-portal/src/components/TokensManager.tsx
R100	web/src/components/users/EditUserDialog.tsx	admin-portal/src/components/users/EditUserDialog.tsx
R100	web/src/components/users/InviteUserDialog.tsx	admin-portal/src/components/users/InviteUserDialog.tsx
R100	web/src/components/users/UserManagement.css	admin-portal/src/components/users/UserManagement.css
R100	web/src/components/users/UserManagement.tsx	admin-portal/src/components/users/UserManagement.tsx
R100	web/src/config/helpContent.ts	admin-portal/src/config/helpContent.ts
R100	web/src/contexts/NotificationContext.tsx	admin-portal/src/contexts/NotificationContext.tsx
R100	web/src/hooks/useAsync.ts	admin-portal/src/hooks/useAsync.ts
R100	web/src/hooks/useGridState.ts	admin-portal/src/hooks/useGridState.ts
R100	web/src/i18n.ts	admin-portal/src/i18n.ts
R100	web/src/index.css	admin-portal/src/index.css
R100	web/src/index.tsx	admin-portal/src/index.tsx
R100	web/src/kendoLicense.ts	admin-portal/src/kendoLicense.ts
R100	web/src/locales/de/translation.json	member-portal/src/locales/de/translation.json
R100	web/src/locales/en/translation.json	member-portal/src/locales/en/translation.json
R100	web/src/locales/nl/translation.json	member-portal/src/locales/nl/translation.json
R100	web/src/logo.svg	admin-portal/src/logo.svg
R100	web/src/pages/MemberRegistrationWizard.css	admin-portal/src/pages/MemberRegistrationWizard.css
R100	web/src/pages/MemberRegistrationWizard.tsx	admin-portal/src/pages/MemberRegistrationWizard.tsx
R100	web/src/react-app-env.d.ts	member-portal/src/react-app-env.d.ts
R100	web/src/reportWebVitals.ts	admin-portal/src/reportWebVitals.ts
R100	web/src/services/api.ts	admin-portal/src/services/api.ts
R100	web/src/services/apiClient.ts	admin-portal/src/services/apiClient.ts
R100	web/src/services/auditLogService.ts	admin-portal/src/services/auditLogService.ts
R100	web/src/setupTests.ts	admin-portal/src/setupTests.ts
R100	web/src/styles/progressive-forms.css	admin-portal/src/styles/progressive-forms.css
R100	web/src/utils/dateUtils.ts	admin-portal/src/utils/dateUtils.ts
R100	web/src/utils/exportUtils.ts	admin-portal/src/utils/exportUtils.ts
R100	web/src/utils/genericExportUtils.ts	admin-portal/src/utils/genericExportUtils.ts
R100	web/src/utils/validation.ts	admin-portal/src/utils/validation.ts
R100	web/src/vite-env.d.ts	member-portal/src/vite-env.d.ts
R100	web/tsconfig.json	member-portal/tsconfig.json
```

## ⚠️ CRITICAL CONFLICTS - Week 2 Branch

### Files That Will Overwrite Recent Fixes:

1. **api/src/functions/uploadKvkDocument.ts**
   - ❌ Main (fc7048a): audit_logs wrapped in try-catch (SAFE)
   - ⚠️ Branch: audit_logs NOT wrapped (WILL BREAK VERIFICATION)
   - Impact: Brings back the bug we spent 3 hours fixing tonight

2. **admin-portal/src/components/KvkDocumentUpload.tsx**
   - ❌ Main (45a7b08): Shows last verified date
   - ⚠️ Branch: Missing last verified date display
   - Impact: User complaint "Last verified date missing" returns

### Risk Assessment:
- 🔴 **CRITICAL RISK** - Do NOT merge without manual resolution
- If merged as-is: All tonight's KvK fixes will be undone
- Recommendation: Cherry-pick safe commits only, skip KvK changes

---

# Branch 2: feature/week3-ux-improvements

**Last Updated:** 2025-10-23 23:30:01 +0200
**Commits Not on Main:** 65
**Base Branch:** Built on top of week2 (includes all week2 commits)

## All Commits (Reverse Chronological)

### 42bccbb - docs: Add portal-specific branch strategy and workflow
**Date:** 2025-10-22 11:05:36 +0200
**Author:** Ramon


### 9c15f74 - Merge branch 'feature/admin-portal'
**Date:** 2025-10-22 11:41:55 +0200
**Author:** Ramon


### 65e65fb - chore: Repository cleanup - remove compiled files and debug artifacts
**Date:** 2025-10-22 11:54:53 +0200
**Author:** Ramon


### c5fd877 - refactor: Rename portals for consistency and standardize workspace configuration
**Date:** 2025-10-22 12:02:03 +0200
**Author:** Ramon


### 332b731 - chore: Remove debug artifacts and prevent future tracking
**Date:** 2025-10-22 12:06:25 +0200
**Author:** Ramon


### ea49cab - docs: Aggressive documentation cleanup - 92% reduction
**Date:** 2025-10-22 12:11:33 +0200
**Author:** Ramon


### e01bc9c - docs: Comprehensive recursive cleanup - Remove 53 scattered documentation files
**Date:** 2025-10-22 12:19:02 +0200
**Author:** Ramon


### 05b57dd - fix: Reorder sidebar menu and simplify Subscriptions page
**Date:** 2025-10-22 12:37:44 +0200
**Author:** Ramon


### 6ab5ce7 - fix: Remove unused subscription/newsletter/task features and consolidate audit tables
**Date:** 2025-10-22 12:43:08 +0200
**Author:** Ramon


### 4139b18 - docs: Document admin portal fixes completed on 2025-10-22
**Date:** 2025-10-22 12:45:47 +0200
**Author:** Ramon


### 27c049a - fix: Move Subscriptions and Newsletters just above About in sidebar
**Date:** 2025-10-22 12:46:59 +0200
**Author:** Ramon


### 6cca978 - fix: Convert result values to lowercase in audit table migration
**Date:** 2025-10-22 13:26:11 +0200
**Author:** Ramon


### 29ab94c - fix: Map all audit result values to success/failure in migration
**Date:** 2025-10-22 13:29:22 +0200
**Author:** Ramon


### 6b1b48a - fix: Update admin portal pipeline to use admin-portal directory
**Date:** 2025-10-22 13:41:25 +0200
**Author:** Ramon


### de8a9e2 - fix: Update member portal pipeline to use member-portal directory
**Date:** 2025-10-22 13:43:01 +0200
**Author:** Ramon


### 9dc2a85 - fix: Replace lucide-react icons with emojis in member portal
**Date:** 2025-10-22 13:52:09 +0200
**Author:** Ramon


### efa55f6 - fix: Add @remix-run/router and archive old migrations
**Date:** 2025-10-22 13:54:37 +0200
**Author:** Ramon


### bd73017 - fix: Add @progress/kendo-draggable-common to member portal
**Date:** 2025-10-22 13:55:58 +0200
**Author:** Ramon


### 008aa51 - fix: Correct kendo-draggable-common version and update lock file
**Date:** 2025-10-22 13:58:24 +0200
**Author:** Ramon


### a030bc0 - fix: Match Subscriptions page styling to Newsletters page
**Date:** 2025-10-22 14:15:37 +0200
**Author:** Ramon


### e086ad5 - docs: Update COMPLETED_ACTIONS.md with tasks from October 22, 2025
**Date:** 2025-10-22 14:21:28 +0200
**Author:** Ramon


### 5eb0c32 - fix: Add SQL scripts to investigate and fix referential integrity issues
**Date:** 2025-10-22 14:29:59 +0200
**Author:** Ramon


### 7b94dea - fix: Replace migration with tested version from archive
**Date:** 2025-10-22 14:30:18 +0200
**Author:** Ramon


### f0ff952 - fix: Add script to cleanup unused party_reference records
**Date:** 2025-10-22 14:32:24 +0200
**Author:** Ramon


### dd0e0a8 - fix: Add script to sync KVK/LEI from members to legal_entity_number
**Date:** 2025-10-22 14:32:51 +0200
**Author:** Ramon


### a6df33e - fix: Add script to drop remaining unused tables from removed features
**Date:** 2025-10-22 14:34:24 +0200
**Author:** Ramon


### 1998a1f - fix: Allow admin access to getEndpointsByEntity endpoint
**Date:** 2025-10-22 14:46:36 +0200
**Author:** Ramon


### fe68d56 - fix: Improve KvK verification error messages
**Date:** 2025-10-22 14:51:13 +0200
**Author:** Ramon


### 12d3918 - fix: Improve About page environment display and badge positioning
**Date:** 2025-10-22 14:53:40 +0200
**Author:** Ramon


### 61d5389 - chore: Reorganize database files and sanitize documentation
**Date:** 2025-10-22 15:15:14 +0200
**Author:** Ramon


### 88bdaed - fix: Add version.json copy to API build script for manual deployments
**Date:** 2025-10-22 15:32:13 +0200
**Author:** Ramon


### bbf74e1 - fix: Replace Kendo Badge with custom styled badge to prevent header positioning
**Date:** 2025-10-22 15:34:38 +0200
**Author:** Ramon


### 5b52345 - fix: Check permissions in GetLegalEntity handler for admin access
**Date:** 2025-10-22 15:49:08 +0200
**Author:** Ramon


### edf5b39 - fix: KvK API integration - map Dutch field names to English data structure
**Date:** 2025-10-22 16:00:11 +0200
**Author:** Ramon


### 1e6b2f8 - feat: Add comprehensive KvK registry data storage and display
**Date:** 2025-10-22 16:10:47 +0200
**Author:** Ramon


### 3258004 - fix: Add MapPin icon for KvK Registry component
**Date:** 2025-10-22 16:14:10 +0200
**Author:** Ramon


### 68c4dce - docs: Update CLAUDE.md with correct deployment process
**Date:** 2025-10-22 16:31:19 +0200
**Author:** Ramon


### 4295b86 - fix: Extract and store all KvK registry fields from API response
**Date:** 2025-10-22 16:55:19 +0200
**Author:** Ramon


### de08c6e - fix: Separate backend and frontend deployments to prevent 404s
**Date:** 2025-10-22 17:13:11 +0200
**Author:** Ramon


### 07eb8f2 - fix: Correct Claude API model name for booking portal extraction
**Date:** 2025-10-22 17:22:47 +0200
**Author:** Ramon


### acf0ba5 - fix: Add diagnostic endpoint and enhance error logging for booking portal
**Date:** 2025-10-22 17:36:00 +0200
**Author:** Ramon


### 42cb965 - fix: Booking portal Claude API and deployment issues
**Date:** 2025-10-22 17:57:02 +0200
**Author:** Ramon


### 8639e90 - fix: Replace pdf-parse with pdfjs-dist to fix canvas dependency issues
**Date:** 2025-10-22 18:21:54 +0200
**Author:** Ramon


### 16acd81 - fix: Use correct pdfjs-dist legacy path - TESTED AND WORKING
**Date:** 2025-10-22 19:20:09 +0200
**Author:** Ramon


### 1fa7f7c - fix: Complete Document Intelligence implementation and validation page
**Date:** 2025-10-22 20:22:37 +0200
**Author:** Ramon


### 8eac804 - feat: Add Kendo UI components and fix booking display issues
**Date:** 2025-10-22 20:39:12 +0200
**Author:** Ramon


### b4612e1 - fix: Remove TypeScript checking from build script to bypass type errors
**Date:** 2025-10-22 20:41:38 +0200
**Author:** Ramon


### ebc3920 - fix: Update pipeline to handle npm workspace structure
**Date:** 2025-10-22 20:46:29 +0200
**Author:** Ramon


### b8a3699 - fix: Correct Kendo Grid column field names for Confidence and Actions
**Date:** 2025-10-22 22:35:52 +0200
**Author:** Ramon


### fa4ea20 - fix: Remove field attribute from Actions column to display buttons
**Date:** 2025-10-22 22:48:58 +0200
**Author:** Ramon


### bfea1d9 - feat: Add return URL support for authentication flow
**Date:** 2025-10-22 23:10:34 +0200
**Author:** Ramon


### 613232c - fix: Update Kendo Grid to use cells API (v9.4.0+) instead of deprecated cell prop
**Date:** 2025-10-22 23:31:19 +0200
**Author:** Ramon


### 2974e42 - feat: Add dynamic form rendering for transport orders
**Date:** 2025-10-23 08:36:12 +0200
**Author:** Ramon


### a36ace8 - feat: Add DCSA Booking 2.0.2 multimodal transport and inland terminal extensions
**Date:** 2025-10-23 08:54:12 +0200
**Author:** Ramon


### ad53f93 - feat: Add comprehensive UI/UX improvements to booking portal
**Date:** 2025-10-23 09:10:15 +0200
**Author:** Ramon


### b22d11f - feat: Add multi-leg transport journey support and fix document labels
**Date:** 2025-10-23 09:28:07 +0200
**Author:** Ramon


### 148e733 - rebrand: Transform Booking Portal to CTN DocuFlow
**Date:** 2025-10-23 09:38:03 +0200
**Author:** Ramon


### b732f70 - fix: Remove accidentally committed deployment .zip files
**Date:** 2025-10-23 09:44:07 +0200
**Author:** Ramon


### fe29627 - feat: Add comprehensive quality validation and agent reviews for CTN DocuFlow
**Date:** 2025-10-23 10:30:26 +0200
**Author:** Ramon


### 0c5754b - fix: Critical security fixes for booking portal API (Week 1 CRITICAL issues)
**Date:** 2025-10-23 23:10:44 +0200
**Author:** Ramon


### b11782f - refactor: Extract service classes and implement pagination
**Date:** 2025-10-23 23:14:46 +0200
**Author:** Ramon


### 74214ee - perf: Fix duplicate PDF processing and add constants
**Date:** 2025-10-23 23:17:41 +0200
**Author:** Ramon


### 3d441d9 - feat: Update API routes and refactor ValidateBooking endpoint
**Date:** 2025-10-23 23:20:01 +0200
**Author:** Ramon


### af06161 - docs: Mark all Week 2 HIGH priority stages complete
**Date:** 2025-10-23 23:20:27 +0200
**Author:** Ramon


### a8c16dd - feat: Add Week 3 UX improvements to booking portal
**Date:** 2025-10-23 23:30:01 +0200
**Author:** Ramon



## Files Modified
```
A	admin-portal/src/components/KvkRegistryDetails.css
A	admin-portal/src/components/KvkRegistryDetails.tsx
A	admin-portal/src/components/SubscriptionsGrid.tsx
A	admin-portal/src/components/TasksGrid.tsx
A	admin-portal/vite.config.ts
A	api/src/functions/getKvkRegistryData.ts
A	api/src/version.json
A	booking-portal/api/.gitignore
A	booking-portal/api/DiagnosticTest/function.json
A	booking-portal/api/DiagnosticTest/index.ts
A	booking-portal/api/shared/constants.ts
A	booking-portal/api/shared/services/BlobStorageService.ts
A	booking-portal/api/shared/services/CosmosDbService.ts
A	booking-portal/api/shared/services/DocumentProcessor.ts
A	booking-portal/api/shared/services/index.ts
A	booking-portal/api/tests/.gitignore
A	booking-portal/api/tests/api-bookings-test.sh
A	booking-portal/api/tests/api-diagnostics-test.sh
A	booking-portal/api/tests/api-upload-test.sh
A	booking-portal/api/tests/api-validation-test.sh
A	booking-portal/api/tests/README.md
A	booking-portal/api/tests/run-all-api-tests.sh
A	booking-portal/api/tests/security-code-validation.sh
A	booking-portal/api/tests/security-validation-test.sh
A	booking-portal/e2e/bookings-grid-journey-timeline.spec.ts
A	booking-portal/e2e/document-upload-progress.spec.ts
A	booking-portal/e2e/transport-order-validation.spec.ts
A	booking-portal/playwright.config.ts
A	booking-portal/TEST_COVERAGE_REPORT.md
A	booking-portal/TEST_SUITE_SUMMARY.md
A	booking-portal/tests/TRANSPORT_ORDER_VALIDATION_TEST_REPORT.md
A	booking-portal/tests/transport-order-validation-test.sh
A	booking-portal/web/e2e/pdf-viewer-diagnosis.spec.ts
A	booking-portal/web/e2e/screenshots/pdf-viewer-diagnosis.png
A	booking-portal/web/src/components/Breadcrumb.tsx
A	booking-portal/web/src/components/EmptyState.tsx
A	booking-portal/web/src/components/validation/TransportJourneyTimeline.tsx
A	booking-portal/web/src/components/validation/TransportOrderForm.tsx
A	database/current_schema.csv
A	database/get_schema.sql
A	database/migrations/013_fix_referential_integrity_v2.sql
A	database/migrations/014_kvk_registry_data.sql
A	database/migrations/archive/012_consolidate_audit_tables.sql
A	database/migrations/archive/013_ensure_legal_entities_exist_FIXED.sql
A	database/migrations/cleanup_unused_party_references.sql
A	database/migrations/drop_unused_tables.sql
A	database/migrations/investigate_integrity.sql
A	database/migrations/INVESTIGATION_QUERIES.sql
A	database/migrations/QUICK_START_GUIDE.md
A	database/migrations/sync_member_identifiers.sql
A	docs/archive/ADMIN_PORTAL_FIXES_2025-10-22.md
A	docs/CTN_DOCUFLOW_COMPREHENSIVE_REVIEW_2025-10-23.md
A	docs/CTN_DOCUFLOW_EXECUTIVE_SUMMARY.md
A	docs/database/COSMOS_DB_REVIEW_2025-10-23.md
A	docs/database/COSMOS_DB_REVIEW_SUMMARY.md
A	docs/database/DATABASE_REVIEW_2025-10-22.md
A	IMPLEMENTATION_PLAN.md
D	.github/workflows/SETUP_INSTRUCTIONS.md
D	api/docs/logging.md
D	api/docs/rate-limiting.md
D	api/src/functions/createNewsletter.ts
D	api/src/functions/createSubscription.ts
D	api/src/functions/createTask.ts
D	api/src/functions/getNewsletters.ts
D	api/src/functions/getSubscriptions.ts
D	api/src/functions/getTasks.ts
D	api/src/functions/updateSubscription.ts
D	api/src/functions/updateTask.ts
D	api/tests/ORCHESTRATION_SECURITY_TEST_REPORT.md
D	api/tests/QUICK_START.md
D	api/tests/README.md
D	api/tests/TEST_SUITE_SUMMARY.md
D	booking-portal/api/AddToKnowledgeBase/index.js
D	booking-portal/api/AddToKnowledgeBase/index.js.map
D	booking-portal/api/GetBookingById/index.js
D	booking-portal/api/GetBookingById/index.js.map
D	booking-portal/api/GetBookings/index.js
D	booking-portal/api/GetBookings/index.js.map
D	booking-portal/api/GetDocumentSasUrl/index.js
D	booking-portal/api/GetDocumentSasUrl/index.js.map
D	booking-portal/api/GetTenants/index.js
D	booking-portal/api/GetTenants/index.js.map
D	booking-portal/api/shared/auth.js
D	booking-portal/api/shared/auth.js.map
D	booking-portal/api/shared/claudeExtractor.js
D	booking-portal/api/shared/claudeExtractor.js.map
D	booking-portal/api/shared/dcsaSchemas.js
D	booking-portal/api/shared/dcsaSchemas.js.map
D	booking-portal/api/shared/documentClassifier.js
D	booking-portal/api/shared/documentClassifier.js.map
D	booking-portal/api/shared/knowledgeBase.js
D	booking-portal/api/shared/knowledgeBase.js.map
D	booking-portal/api/shared/multipart.js
D	booking-portal/api/shared/multipart.js.map
D	booking-portal/api/shared/pdfExtractor.js
D	booking-portal/api/shared/pdfExtractor.js.map
D	booking-portal/api/shared/pdfSplitter.js
D	booking-portal/api/shared/pdfSplitter.js.map
D	booking-portal/api/UploadDocument/index.js
D	booking-portal/api/UploadDocument/index.js.map
```

## Risk Assessment
- 🟡 **MEDIUM-HIGH RISK** - Inherits all week2 conflicts
- Contains additional booking portal UX improvements
- Recommendation: Review after week2 resolution

---

# Branch 3: feature/week4-ux-improvements

**Last Updated:** 2025-10-24 09:16:46 +0200
**Commits Not on Main:** 76
**Focus:** Async processing, rate limiting, confidence scores

## All Commits (Reverse Chronological)

### 42bccbb - docs: Add portal-specific branch strategy and workflow
**Date:** 2025-10-22 11:05:36 +0200


### 9c15f74 - Merge branch 'feature/admin-portal'
**Date:** 2025-10-22 11:41:55 +0200


### 65e65fb - chore: Repository cleanup - remove compiled files and debug artifacts
**Date:** 2025-10-22 11:54:53 +0200


### c5fd877 - refactor: Rename portals for consistency and standardize workspace configuration
**Date:** 2025-10-22 12:02:03 +0200


### 332b731 - chore: Remove debug artifacts and prevent future tracking
**Date:** 2025-10-22 12:06:25 +0200


### ea49cab - docs: Aggressive documentation cleanup - 92% reduction
**Date:** 2025-10-22 12:11:33 +0200


### e01bc9c - docs: Comprehensive recursive cleanup - Remove 53 scattered documentation files
**Date:** 2025-10-22 12:19:02 +0200


### 05b57dd - fix: Reorder sidebar menu and simplify Subscriptions page
**Date:** 2025-10-22 12:37:44 +0200


### 6ab5ce7 - fix: Remove unused subscription/newsletter/task features and consolidate audit tables
**Date:** 2025-10-22 12:43:08 +0200


### 4139b18 - docs: Document admin portal fixes completed on 2025-10-22
**Date:** 2025-10-22 12:45:47 +0200


### 27c049a - fix: Move Subscriptions and Newsletters just above About in sidebar
**Date:** 2025-10-22 12:46:59 +0200


### 6cca978 - fix: Convert result values to lowercase in audit table migration
**Date:** 2025-10-22 13:26:11 +0200


### 29ab94c - fix: Map all audit result values to success/failure in migration
**Date:** 2025-10-22 13:29:22 +0200


### 6b1b48a - fix: Update admin portal pipeline to use admin-portal directory
**Date:** 2025-10-22 13:41:25 +0200


### de8a9e2 - fix: Update member portal pipeline to use member-portal directory
**Date:** 2025-10-22 13:43:01 +0200


### 9dc2a85 - fix: Replace lucide-react icons with emojis in member portal
**Date:** 2025-10-22 13:52:09 +0200


### efa55f6 - fix: Add @remix-run/router and archive old migrations
**Date:** 2025-10-22 13:54:37 +0200


### bd73017 - fix: Add @progress/kendo-draggable-common to member portal
**Date:** 2025-10-22 13:55:58 +0200


### 008aa51 - fix: Correct kendo-draggable-common version and update lock file
**Date:** 2025-10-22 13:58:24 +0200


### a030bc0 - fix: Match Subscriptions page styling to Newsletters page
**Date:** 2025-10-22 14:15:37 +0200


### e086ad5 - docs: Update COMPLETED_ACTIONS.md with tasks from October 22, 2025
**Date:** 2025-10-22 14:21:28 +0200


### 5eb0c32 - fix: Add SQL scripts to investigate and fix referential integrity issues
**Date:** 2025-10-22 14:29:59 +0200


### 7b94dea - fix: Replace migration with tested version from archive
**Date:** 2025-10-22 14:30:18 +0200


### f0ff952 - fix: Add script to cleanup unused party_reference records
**Date:** 2025-10-22 14:32:24 +0200


### dd0e0a8 - fix: Add script to sync KVK/LEI from members to legal_entity_number
**Date:** 2025-10-22 14:32:51 +0200


### a6df33e - fix: Add script to drop remaining unused tables from removed features
**Date:** 2025-10-22 14:34:24 +0200


### 1998a1f - fix: Allow admin access to getEndpointsByEntity endpoint
**Date:** 2025-10-22 14:46:36 +0200


### fe68d56 - fix: Improve KvK verification error messages
**Date:** 2025-10-22 14:51:13 +0200


### 12d3918 - fix: Improve About page environment display and badge positioning
**Date:** 2025-10-22 14:53:40 +0200


### 61d5389 - chore: Reorganize database files and sanitize documentation
**Date:** 2025-10-22 15:15:14 +0200


### 88bdaed - fix: Add version.json copy to API build script for manual deployments
**Date:** 2025-10-22 15:32:13 +0200


### bbf74e1 - fix: Replace Kendo Badge with custom styled badge to prevent header positioning
**Date:** 2025-10-22 15:34:38 +0200


### 5b52345 - fix: Check permissions in GetLegalEntity handler for admin access
**Date:** 2025-10-22 15:49:08 +0200


### edf5b39 - fix: KvK API integration - map Dutch field names to English data structure
**Date:** 2025-10-22 16:00:11 +0200


### 1e6b2f8 - feat: Add comprehensive KvK registry data storage and display
**Date:** 2025-10-22 16:10:47 +0200


### 3258004 - fix: Add MapPin icon for KvK Registry component
**Date:** 2025-10-22 16:14:10 +0200


### 68c4dce - docs: Update CLAUDE.md with correct deployment process
**Date:** 2025-10-22 16:31:19 +0200


### 4295b86 - fix: Extract and store all KvK registry fields from API response
**Date:** 2025-10-22 16:55:19 +0200


### de08c6e - fix: Separate backend and frontend deployments to prevent 404s
**Date:** 2025-10-22 17:13:11 +0200


### 07eb8f2 - fix: Correct Claude API model name for booking portal extraction
**Date:** 2025-10-22 17:22:47 +0200


### acf0ba5 - fix: Add diagnostic endpoint and enhance error logging for booking portal
**Date:** 2025-10-22 17:36:00 +0200


### 42cb965 - fix: Booking portal Claude API and deployment issues
**Date:** 2025-10-22 17:57:02 +0200


### 8639e90 - fix: Replace pdf-parse with pdfjs-dist to fix canvas dependency issues
**Date:** 2025-10-22 18:21:54 +0200


### 16acd81 - fix: Use correct pdfjs-dist legacy path - TESTED AND WORKING
**Date:** 2025-10-22 19:20:09 +0200


### 1fa7f7c - fix: Complete Document Intelligence implementation and validation page
**Date:** 2025-10-22 20:22:37 +0200


### 8eac804 - feat: Add Kendo UI components and fix booking display issues
**Date:** 2025-10-22 20:39:12 +0200


### b4612e1 - fix: Remove TypeScript checking from build script to bypass type errors
**Date:** 2025-10-22 20:41:38 +0200


### ebc3920 - fix: Update pipeline to handle npm workspace structure
**Date:** 2025-10-22 20:46:29 +0200


### b8a3699 - fix: Correct Kendo Grid column field names for Confidence and Actions
**Date:** 2025-10-22 22:35:52 +0200


### fa4ea20 - fix: Remove field attribute from Actions column to display buttons
**Date:** 2025-10-22 22:48:58 +0200


### bfea1d9 - feat: Add return URL support for authentication flow
**Date:** 2025-10-22 23:10:34 +0200


### 613232c - fix: Update Kendo Grid to use cells API (v9.4.0+) instead of deprecated cell prop
**Date:** 2025-10-22 23:31:19 +0200


### 2974e42 - feat: Add dynamic form rendering for transport orders
**Date:** 2025-10-23 08:36:12 +0200


### a36ace8 - feat: Add DCSA Booking 2.0.2 multimodal transport and inland terminal extensions
**Date:** 2025-10-23 08:54:12 +0200


### ad53f93 - feat: Add comprehensive UI/UX improvements to booking portal
**Date:** 2025-10-23 09:10:15 +0200


### b22d11f - feat: Add multi-leg transport journey support and fix document labels
**Date:** 2025-10-23 09:28:07 +0200


### 148e733 - rebrand: Transform Booking Portal to CTN DocuFlow
**Date:** 2025-10-23 09:38:03 +0200


### b732f70 - fix: Remove accidentally committed deployment .zip files
**Date:** 2025-10-23 09:44:07 +0200


### fe29627 - feat: Add comprehensive quality validation and agent reviews for CTN DocuFlow
**Date:** 2025-10-23 10:30:26 +0200


### 0c5754b - fix: Critical security fixes for booking portal API (Week 1 CRITICAL issues)
**Date:** 2025-10-23 23:10:44 +0200


### b11782f - refactor: Extract service classes and implement pagination
**Date:** 2025-10-23 23:14:46 +0200


### 74214ee - perf: Fix duplicate PDF processing and add constants
**Date:** 2025-10-23 23:17:41 +0200


### 3d441d9 - feat: Update API routes and refactor ValidateBooking endpoint
**Date:** 2025-10-23 23:20:01 +0200


### af06161 - docs: Mark all Week 2 HIGH priority stages complete
**Date:** 2025-10-23 23:20:27 +0200


### a8c16dd - feat: Add Week 3 UX improvements to booking portal
**Date:** 2025-10-23 23:30:01 +0200


### 5432843 - docs: Update documentation after Week 1-3 completion
**Date:** 2025-10-23 23:38:48 +0200


### bbc6603 - feat: Implement async document processing to fix Claude timeout issue
**Date:** 2025-10-24 00:07:26 +0200


### f0b9387 - docs: Add async processing implementation documentation
**Date:** 2025-10-24 00:08:38 +0200


### c0f60c0 - docs: Update async processing docs with correct database and resource names
**Date:** 2025-10-24 00:14:06 +0200


### e22b4ec - feat: Implement rate limiting middleware for DoS protection
**Date:** 2025-10-24 00:19:04 +0200


### 91fea02 - feat: Add strict CORS configuration to prevent unauthorized access
**Date:** 2025-10-24 00:20:08 +0200


### 241c3f9 - docs: Add comprehensive improvements summary for October 24 session
**Date:** 2025-10-24 08:31:52 +0200


### bff3b10 - feat: Add ConfidenceScore reusable component
**Date:** 2025-10-24 09:06:43 +0200


### cd45f69 - feat: Add form field validation indicators to Validation.tsx
**Date:** 2025-10-24 09:07:36 +0200


### c903b4f - docs: Add comprehensive Week 4 UX implementation plan
**Date:** 2025-10-24 09:09:51 +0200


### 18d660f - feat: Implement Week 4 UX improvements for booking portal
**Date:** 2025-10-24 09:16:46 +0200


## Files Modified
```
A	admin-portal/src/components/KvkRegistryDetails.css
A	admin-portal/src/components/KvkRegistryDetails.tsx
A	admin-portal/src/components/SubscriptionsGrid.tsx
A	admin-portal/src/components/TasksGrid.tsx
A	admin-portal/vite.config.ts
A	api/src/functions/getKvkRegistryData.ts
A	api/src/version.json
A	booking-portal/api/.gitignore
A	booking-portal/api/DiagnosticTest/function.json
A	booking-portal/api/DiagnosticTest/index.ts
A	booking-portal/api/GetProcessingJob/function.json
A	booking-portal/api/GetProcessingJob/index.ts
A	booking-portal/api/shared/constants.ts
A	booking-portal/api/shared/processingJobSchemas.ts
A	booking-portal/api/shared/rateLimit.ts
A	booking-portal/api/shared/services/BlobStorageService.ts
A	booking-portal/api/shared/services/CosmosDbService.ts
A	booking-portal/api/shared/services/DocumentProcessor.ts
A	booking-portal/api/shared/services/index.ts
A	booking-portal/api/shared/services/ProcessingJobService.ts
A	booking-portal/api/tests/.gitignore
A	booking-portal/api/tests/api-bookings-test.sh
A	booking-portal/api/tests/api-diagnostics-test.sh
A	booking-portal/api/tests/api-upload-test.sh
A	booking-portal/api/tests/api-validation-test.sh
A	booking-portal/api/tests/README.md
A	booking-portal/api/tests/run-all-api-tests.sh
A	booking-portal/api/tests/security-code-validation.sh
A	booking-portal/api/tests/security-validation-test.sh
A	booking-portal/ASYNC_PROCESSING_IMPLEMENTATION.md
A	booking-portal/COMPREHENSIVE_IMPROVEMENTS_SUMMARY.md
A	booking-portal/e2e/bookings-grid-journey-timeline.spec.ts
A	booking-portal/e2e/document-upload-progress.spec.ts
A	booking-portal/e2e/transport-order-validation.spec.ts
A	booking-portal/e2e/WEEK3_UX_TEST_RESULTS.md
A	booking-portal/e2e/week3-ux-improvements.spec.ts
A	booking-portal/playwright.config.ts
A	booking-portal/SECURITY_VALIDATION_REPORT.md
A	booking-portal/TEST_COVERAGE_REPORT.md
A	booking-portal/TEST_SUITE_SUMMARY.md
A	booking-portal/tests/TRANSPORT_ORDER_VALIDATION_TEST_REPORT.md
A	booking-portal/tests/transport-order-validation-test.sh
A	booking-portal/tests/week2-security-fixes-test.sh
A	booking-portal/web/e2e/pdf-viewer-diagnosis.spec.ts
A	booking-portal/web/e2e/screenshots/pdf-viewer-diagnosis.png
A	booking-portal/web/src/components/Breadcrumb.tsx
A	booking-portal/web/src/components/ConfidenceScore.tsx
A	booking-portal/web/src/components/EmptyState.tsx
A	booking-portal/web/src/components/ThemeToggle.tsx
A	booking-portal/web/src/components/validation/TransportJourneyTimeline.tsx
A	booking-portal/web/src/components/validation/TransportOrderForm.tsx
A	booking-portal/WEEK3_TEST_RESULTS.txt
A	booking-portal/WEEK3_UX_SUMMARY.md
A	booking-portal/WEEK4_UX_IMPLEMENTATION_PLAN.md
A	database/current_schema.csv
A	database/get_schema.sql
A	database/migrations/013_fix_referential_integrity_v2.sql
A	database/migrations/014_kvk_registry_data.sql
A	database/migrations/archive/012_consolidate_audit_tables.sql
A	database/migrations/archive/013_ensure_legal_entities_exist_FIXED.sql
A	database/migrations/cleanup_unused_party_references.sql
A	database/migrations/drop_unused_tables.sql
A	database/migrations/investigate_integrity.sql
A	database/migrations/INVESTIGATION_QUERIES.sql
A	database/migrations/QUICK_START_GUIDE.md
A	database/migrations/sync_member_identifiers.sql
A	docs/archive/ADMIN_PORTAL_FIXES_2025-10-22.md
A	docs/CTN_DOCUFLOW_COMPREHENSIVE_REVIEW_2025-10-23.md
A	docs/CTN_DOCUFLOW_DEPLOYMENT_SUMMARY_2025-10-24.md
A	docs/CTN_DOCUFLOW_EXECUTIVE_SUMMARY.md
A	docs/database/COSMOS_DB_REVIEW_2025-10-23.md
A	docs/database/COSMOS_DB_REVIEW_SUMMARY.md
A	docs/database/DATABASE_REVIEW_2025-10-22.md
A	docs/IMPLEMENTATION_PLAN.md
D	.github/workflows/SETUP_INSTRUCTIONS.md
D	api/docs/logging.md
D	api/docs/rate-limiting.md
D	api/src/functions/createNewsletter.ts
D	api/src/functions/createSubscription.ts
D	api/src/functions/createTask.ts
D	api/src/functions/getNewsletters.ts
D	api/src/functions/getSubscriptions.ts
D	api/src/functions/getTasks.ts
D	api/src/functions/updateSubscription.ts
D	api/src/functions/updateTask.ts
D	api/tests/ORCHESTRATION_SECURITY_TEST_REPORT.md
D	api/tests/QUICK_START.md
D	api/tests/README.md
D	api/tests/TEST_SUITE_SUMMARY.md
D	booking-portal/api/AddToKnowledgeBase/index.js
D	booking-portal/api/AddToKnowledgeBase/index.js.map
D	booking-portal/api/GetBookingById/index.js
D	booking-portal/api/GetBookingById/index.js.map
D	booking-portal/api/GetBookings/index.js
D	booking-portal/api/GetBookings/index.js.map
D	booking-portal/api/GetDocumentSasUrl/index.js
D	booking-portal/api/GetDocumentSasUrl/index.js.map
D	booking-portal/api/GetTenants/index.js
D	booking-portal/api/GetTenants/index.js.map
D	booking-portal/api/shared/auth.js
```

## Risk Assessment
- 🟡 **MEDIUM RISK** - Mostly booking portal improvements
- Contains async processing features (valuable)
- Contains rate limiting middleware (important for security)
- Recommendation: Safe to cherry-pick booking-portal changes

---

# Branch 4: feature/booking-portal-security-fixes

**Last Updated:** 2025-10-23 23:20:27 +0200
**Commits Not on Main:** 64
**Focus:** Security vulnerabilities, API fixes, IDOR prevention

## All Commits

### 42bccbb - docs: Add portal-specific branch strategy and workflow
**Date:** 2025-10-22 11:05:36 +0200


### 9c15f74 - Merge branch 'feature/admin-portal'
**Date:** 2025-10-22 11:41:55 +0200


### 65e65fb - chore: Repository cleanup - remove compiled files and debug artifacts
**Date:** 2025-10-22 11:54:53 +0200


### c5fd877 - refactor: Rename portals for consistency and standardize workspace configuration
**Date:** 2025-10-22 12:02:03 +0200


### 332b731 - chore: Remove debug artifacts and prevent future tracking
**Date:** 2025-10-22 12:06:25 +0200


### ea49cab - docs: Aggressive documentation cleanup - 92% reduction
**Date:** 2025-10-22 12:11:33 +0200


### e01bc9c - docs: Comprehensive recursive cleanup - Remove 53 scattered documentation files
**Date:** 2025-10-22 12:19:02 +0200


### 05b57dd - fix: Reorder sidebar menu and simplify Subscriptions page
**Date:** 2025-10-22 12:37:44 +0200


### 6ab5ce7 - fix: Remove unused subscription/newsletter/task features and consolidate audit tables
**Date:** 2025-10-22 12:43:08 +0200


### 4139b18 - docs: Document admin portal fixes completed on 2025-10-22
**Date:** 2025-10-22 12:45:47 +0200


### 27c049a - fix: Move Subscriptions and Newsletters just above About in sidebar
**Date:** 2025-10-22 12:46:59 +0200


### 6cca978 - fix: Convert result values to lowercase in audit table migration
**Date:** 2025-10-22 13:26:11 +0200


### 29ab94c - fix: Map all audit result values to success/failure in migration
**Date:** 2025-10-22 13:29:22 +0200


### 6b1b48a - fix: Update admin portal pipeline to use admin-portal directory
**Date:** 2025-10-22 13:41:25 +0200


### de8a9e2 - fix: Update member portal pipeline to use member-portal directory
**Date:** 2025-10-22 13:43:01 +0200


### 9dc2a85 - fix: Replace lucide-react icons with emojis in member portal
**Date:** 2025-10-22 13:52:09 +0200


### efa55f6 - fix: Add @remix-run/router and archive old migrations
**Date:** 2025-10-22 13:54:37 +0200


### bd73017 - fix: Add @progress/kendo-draggable-common to member portal
**Date:** 2025-10-22 13:55:58 +0200


### 008aa51 - fix: Correct kendo-draggable-common version and update lock file
**Date:** 2025-10-22 13:58:24 +0200


### a030bc0 - fix: Match Subscriptions page styling to Newsletters page
**Date:** 2025-10-22 14:15:37 +0200


### e086ad5 - docs: Update COMPLETED_ACTIONS.md with tasks from October 22, 2025
**Date:** 2025-10-22 14:21:28 +0200


### 5eb0c32 - fix: Add SQL scripts to investigate and fix referential integrity issues
**Date:** 2025-10-22 14:29:59 +0200


### 7b94dea - fix: Replace migration with tested version from archive
**Date:** 2025-10-22 14:30:18 +0200


### f0ff952 - fix: Add script to cleanup unused party_reference records
**Date:** 2025-10-22 14:32:24 +0200


### dd0e0a8 - fix: Add script to sync KVK/LEI from members to legal_entity_number
**Date:** 2025-10-22 14:32:51 +0200


### a6df33e - fix: Add script to drop remaining unused tables from removed features
**Date:** 2025-10-22 14:34:24 +0200


### 1998a1f - fix: Allow admin access to getEndpointsByEntity endpoint
**Date:** 2025-10-22 14:46:36 +0200


### fe68d56 - fix: Improve KvK verification error messages
**Date:** 2025-10-22 14:51:13 +0200


### 12d3918 - fix: Improve About page environment display and badge positioning
**Date:** 2025-10-22 14:53:40 +0200


### 61d5389 - chore: Reorganize database files and sanitize documentation
**Date:** 2025-10-22 15:15:14 +0200


### 88bdaed - fix: Add version.json copy to API build script for manual deployments
**Date:** 2025-10-22 15:32:13 +0200


### bbf74e1 - fix: Replace Kendo Badge with custom styled badge to prevent header positioning
**Date:** 2025-10-22 15:34:38 +0200


### 5b52345 - fix: Check permissions in GetLegalEntity handler for admin access
**Date:** 2025-10-22 15:49:08 +0200


### edf5b39 - fix: KvK API integration - map Dutch field names to English data structure
**Date:** 2025-10-22 16:00:11 +0200


### 1e6b2f8 - feat: Add comprehensive KvK registry data storage and display
**Date:** 2025-10-22 16:10:47 +0200


### 3258004 - fix: Add MapPin icon for KvK Registry component
**Date:** 2025-10-22 16:14:10 +0200


### 68c4dce - docs: Update CLAUDE.md with correct deployment process
**Date:** 2025-10-22 16:31:19 +0200


### 4295b86 - fix: Extract and store all KvK registry fields from API response
**Date:** 2025-10-22 16:55:19 +0200


### de08c6e - fix: Separate backend and frontend deployments to prevent 404s
**Date:** 2025-10-22 17:13:11 +0200


### 07eb8f2 - fix: Correct Claude API model name for booking portal extraction
**Date:** 2025-10-22 17:22:47 +0200


### acf0ba5 - fix: Add diagnostic endpoint and enhance error logging for booking portal
**Date:** 2025-10-22 17:36:00 +0200


### 42cb965 - fix: Booking portal Claude API and deployment issues
**Date:** 2025-10-22 17:57:02 +0200


### 8639e90 - fix: Replace pdf-parse with pdfjs-dist to fix canvas dependency issues
**Date:** 2025-10-22 18:21:54 +0200


### 16acd81 - fix: Use correct pdfjs-dist legacy path - TESTED AND WORKING
**Date:** 2025-10-22 19:20:09 +0200


### 1fa7f7c - fix: Complete Document Intelligence implementation and validation page
**Date:** 2025-10-22 20:22:37 +0200


### 8eac804 - feat: Add Kendo UI components and fix booking display issues
**Date:** 2025-10-22 20:39:12 +0200


### b4612e1 - fix: Remove TypeScript checking from build script to bypass type errors
**Date:** 2025-10-22 20:41:38 +0200


### ebc3920 - fix: Update pipeline to handle npm workspace structure
**Date:** 2025-10-22 20:46:29 +0200


### b8a3699 - fix: Correct Kendo Grid column field names for Confidence and Actions
**Date:** 2025-10-22 22:35:52 +0200


### fa4ea20 - fix: Remove field attribute from Actions column to display buttons
**Date:** 2025-10-22 22:48:58 +0200


### bfea1d9 - feat: Add return URL support for authentication flow
**Date:** 2025-10-22 23:10:34 +0200


### 613232c - fix: Update Kendo Grid to use cells API (v9.4.0+) instead of deprecated cell prop
**Date:** 2025-10-22 23:31:19 +0200


### 2974e42 - feat: Add dynamic form rendering for transport orders
**Date:** 2025-10-23 08:36:12 +0200


### a36ace8 - feat: Add DCSA Booking 2.0.2 multimodal transport and inland terminal extensions
**Date:** 2025-10-23 08:54:12 +0200


### ad53f93 - feat: Add comprehensive UI/UX improvements to booking portal
**Date:** 2025-10-23 09:10:15 +0200


### b22d11f - feat: Add multi-leg transport journey support and fix document labels
**Date:** 2025-10-23 09:28:07 +0200


### 148e733 - rebrand: Transform Booking Portal to CTN DocuFlow
**Date:** 2025-10-23 09:38:03 +0200


### b732f70 - fix: Remove accidentally committed deployment .zip files
**Date:** 2025-10-23 09:44:07 +0200


### fe29627 - feat: Add comprehensive quality validation and agent reviews for CTN DocuFlow
**Date:** 2025-10-23 10:30:26 +0200


### 0c5754b - fix: Critical security fixes for booking portal API (Week 1 CRITICAL issues)
**Date:** 2025-10-23 23:10:44 +0200


### b11782f - refactor: Extract service classes and implement pagination
**Date:** 2025-10-23 23:14:46 +0200


### 74214ee - perf: Fix duplicate PDF processing and add constants
**Date:** 2025-10-23 23:17:41 +0200


### 3d441d9 - feat: Update API routes and refactor ValidateBooking endpoint
**Date:** 2025-10-23 23:20:01 +0200


### af06161 - docs: Mark all Week 2 HIGH priority stages complete
**Date:** 2025-10-23 23:20:27 +0200


## Files Modified
```
A	admin-portal/src/components/KvkRegistryDetails.css
A	admin-portal/src/components/KvkRegistryDetails.tsx
A	admin-portal/src/components/SubscriptionsGrid.tsx
A	admin-portal/src/components/TasksGrid.tsx
A	admin-portal/vite.config.ts
A	api/src/functions/getKvkRegistryData.ts
A	api/src/version.json
A	booking-portal/api/.gitignore
A	booking-portal/api/DiagnosticTest/function.json
A	booking-portal/api/DiagnosticTest/index.ts
A	booking-portal/api/shared/constants.ts
A	booking-portal/api/shared/services/BlobStorageService.ts
A	booking-portal/api/shared/services/CosmosDbService.ts
A	booking-portal/api/shared/services/DocumentProcessor.ts
A	booking-portal/api/shared/services/index.ts
A	booking-portal/api/tests/.gitignore
A	booking-portal/api/tests/api-bookings-test.sh
A	booking-portal/api/tests/api-diagnostics-test.sh
A	booking-portal/api/tests/api-upload-test.sh
A	booking-portal/api/tests/api-validation-test.sh
A	booking-portal/api/tests/README.md
A	booking-portal/api/tests/run-all-api-tests.sh
A	booking-portal/api/tests/security-code-validation.sh
A	booking-portal/api/tests/security-validation-test.sh
A	booking-portal/e2e/bookings-grid-journey-timeline.spec.ts
A	booking-portal/e2e/document-upload-progress.spec.ts
A	booking-portal/e2e/transport-order-validation.spec.ts
A	booking-portal/playwright.config.ts
A	booking-portal/TEST_COVERAGE_REPORT.md
A	booking-portal/TEST_SUITE_SUMMARY.md
A	booking-portal/tests/TRANSPORT_ORDER_VALIDATION_TEST_REPORT.md
A	booking-portal/tests/transport-order-validation-test.sh
A	booking-portal/web/e2e/pdf-viewer-diagnosis.spec.ts
A	booking-portal/web/e2e/screenshots/pdf-viewer-diagnosis.png
A	booking-portal/web/src/components/validation/TransportJourneyTimeline.tsx
A	booking-portal/web/src/components/validation/TransportOrderForm.tsx
A	database/current_schema.csv
A	database/get_schema.sql
A	database/migrations/013_fix_referential_integrity_v2.sql
A	database/migrations/014_kvk_registry_data.sql
A	database/migrations/archive/012_consolidate_audit_tables.sql
A	database/migrations/archive/013_ensure_legal_entities_exist_FIXED.sql
A	database/migrations/cleanup_unused_party_references.sql
A	database/migrations/drop_unused_tables.sql
A	database/migrations/investigate_integrity.sql
A	database/migrations/INVESTIGATION_QUERIES.sql
A	database/migrations/QUICK_START_GUIDE.md
A	database/migrations/sync_member_identifiers.sql
A	docs/archive/ADMIN_PORTAL_FIXES_2025-10-22.md
A	docs/CTN_DOCUFLOW_COMPREHENSIVE_REVIEW_2025-10-23.md
A	docs/CTN_DOCUFLOW_EXECUTIVE_SUMMARY.md
A	docs/database/COSMOS_DB_REVIEW_2025-10-23.md
A	docs/database/COSMOS_DB_REVIEW_SUMMARY.md
A	docs/database/DATABASE_REVIEW_2025-10-22.md
A	IMPLEMENTATION_PLAN.md
D	.github/workflows/SETUP_INSTRUCTIONS.md
D	api/docs/logging.md
D	api/docs/rate-limiting.md
D	api/src/functions/createNewsletter.ts
D	api/src/functions/createSubscription.ts
D	api/src/functions/createTask.ts
D	api/src/functions/getNewsletters.ts
D	api/src/functions/getSubscriptions.ts
D	api/src/functions/getTasks.ts
D	api/src/functions/updateSubscription.ts
D	api/src/functions/updateTask.ts
D	api/tests/ORCHESTRATION_SECURITY_TEST_REPORT.md
D	api/tests/QUICK_START.md
D	api/tests/README.md
D	api/tests/TEST_SUITE_SUMMARY.md
D	booking-portal/api/AddToKnowledgeBase/index.js
D	booking-portal/api/AddToKnowledgeBase/index.js.map
D	booking-portal/api/GetBookingById/index.js
D	booking-portal/api/GetBookingById/index.js.map
D	booking-portal/api/GetBookings/index.js
D	booking-portal/api/GetBookings/index.js.map
D	booking-portal/api/GetDocumentSasUrl/index.js
D	booking-portal/api/GetDocumentSasUrl/index.js.map
D	booking-portal/api/GetTenants/index.js
D	booking-portal/api/GetTenants/index.js.map
D	booking-portal/api/shared/auth.js
D	booking-portal/api/shared/auth.js.map
D	booking-portal/api/shared/claudeExtractor.js
D	booking-portal/api/shared/claudeExtractor.js.map
D	booking-portal/api/shared/dcsaSchemas.js
D	booking-portal/api/shared/dcsaSchemas.js.map
D	booking-portal/api/shared/documentClassifier.js
D	booking-portal/api/shared/documentClassifier.js.map
D	booking-portal/api/shared/knowledgeBase.js
D	booking-portal/api/shared/knowledgeBase.js.map
D	booking-portal/api/shared/multipart.js
D	booking-portal/api/shared/multipart.js.map
D	booking-portal/api/shared/pdfExtractor.js
D	booking-portal/api/shared/pdfExtractor.js.map
D	booking-portal/api/shared/pdfSplitter.js
D	booking-portal/api/shared/pdfSplitter.js.map
D	booking-portal/api/UploadDocument/index.js
D	booking-portal/api/UploadDocument/index.js.map
D	booking-portal/api/ValidateBooking/index.js
D	booking-portal/api/ValidateBooking/index.js.map
```

## Risk Assessment
- 🟢 **LOW-MEDIUM RISK** - Mostly isolated to booking portal
- Contains critical security fixes (IDOR, input validation)
- Minimal overlap with admin portal / API changes
- Recommendation: HIGH VALUE - Cherry-pick security commits

---

# Branch 5: feature/async-document-processing

**Last Updated:** 2025-10-24 00:14:06 +0200
**Commits Not on Main:** 69
**Focus:** Fix Claude API timeout with async processing queue

## All Commits

### 42bccbb - docs: Add portal-specific branch strategy and workflow
**Date:** 2025-10-22 11:05:36 +0200


### 9c15f74 - Merge branch 'feature/admin-portal'
**Date:** 2025-10-22 11:41:55 +0200


### 65e65fb - chore: Repository cleanup - remove compiled files and debug artifacts
**Date:** 2025-10-22 11:54:53 +0200


### c5fd877 - refactor: Rename portals for consistency and standardize workspace configuration
**Date:** 2025-10-22 12:02:03 +0200


### 332b731 - chore: Remove debug artifacts and prevent future tracking
**Date:** 2025-10-22 12:06:25 +0200


### ea49cab - docs: Aggressive documentation cleanup - 92% reduction
**Date:** 2025-10-22 12:11:33 +0200


### e01bc9c - docs: Comprehensive recursive cleanup - Remove 53 scattered documentation files
**Date:** 2025-10-22 12:19:02 +0200


### 05b57dd - fix: Reorder sidebar menu and simplify Subscriptions page
**Date:** 2025-10-22 12:37:44 +0200


### 6ab5ce7 - fix: Remove unused subscription/newsletter/task features and consolidate audit tables
**Date:** 2025-10-22 12:43:08 +0200


### 4139b18 - docs: Document admin portal fixes completed on 2025-10-22
**Date:** 2025-10-22 12:45:47 +0200


### 27c049a - fix: Move Subscriptions and Newsletters just above About in sidebar
**Date:** 2025-10-22 12:46:59 +0200


### 6cca978 - fix: Convert result values to lowercase in audit table migration
**Date:** 2025-10-22 13:26:11 +0200


### 29ab94c - fix: Map all audit result values to success/failure in migration
**Date:** 2025-10-22 13:29:22 +0200


### 6b1b48a - fix: Update admin portal pipeline to use admin-portal directory
**Date:** 2025-10-22 13:41:25 +0200


### de8a9e2 - fix: Update member portal pipeline to use member-portal directory
**Date:** 2025-10-22 13:43:01 +0200


### 9dc2a85 - fix: Replace lucide-react icons with emojis in member portal
**Date:** 2025-10-22 13:52:09 +0200


### efa55f6 - fix: Add @remix-run/router and archive old migrations
**Date:** 2025-10-22 13:54:37 +0200


### bd73017 - fix: Add @progress/kendo-draggable-common to member portal
**Date:** 2025-10-22 13:55:58 +0200


### 008aa51 - fix: Correct kendo-draggable-common version and update lock file
**Date:** 2025-10-22 13:58:24 +0200


### a030bc0 - fix: Match Subscriptions page styling to Newsletters page
**Date:** 2025-10-22 14:15:37 +0200


### e086ad5 - docs: Update COMPLETED_ACTIONS.md with tasks from October 22, 2025
**Date:** 2025-10-22 14:21:28 +0200


### 5eb0c32 - fix: Add SQL scripts to investigate and fix referential integrity issues
**Date:** 2025-10-22 14:29:59 +0200


### 7b94dea - fix: Replace migration with tested version from archive
**Date:** 2025-10-22 14:30:18 +0200


### f0ff952 - fix: Add script to cleanup unused party_reference records
**Date:** 2025-10-22 14:32:24 +0200


### dd0e0a8 - fix: Add script to sync KVK/LEI from members to legal_entity_number
**Date:** 2025-10-22 14:32:51 +0200


### a6df33e - fix: Add script to drop remaining unused tables from removed features
**Date:** 2025-10-22 14:34:24 +0200


### 1998a1f - fix: Allow admin access to getEndpointsByEntity endpoint
**Date:** 2025-10-22 14:46:36 +0200


### fe68d56 - fix: Improve KvK verification error messages
**Date:** 2025-10-22 14:51:13 +0200


### 12d3918 - fix: Improve About page environment display and badge positioning
**Date:** 2025-10-22 14:53:40 +0200


### 61d5389 - chore: Reorganize database files and sanitize documentation
**Date:** 2025-10-22 15:15:14 +0200


### 88bdaed - fix: Add version.json copy to API build script for manual deployments
**Date:** 2025-10-22 15:32:13 +0200


### bbf74e1 - fix: Replace Kendo Badge with custom styled badge to prevent header positioning
**Date:** 2025-10-22 15:34:38 +0200


### 5b52345 - fix: Check permissions in GetLegalEntity handler for admin access
**Date:** 2025-10-22 15:49:08 +0200


### edf5b39 - fix: KvK API integration - map Dutch field names to English data structure
**Date:** 2025-10-22 16:00:11 +0200


### 1e6b2f8 - feat: Add comprehensive KvK registry data storage and display
**Date:** 2025-10-22 16:10:47 +0200


### 3258004 - fix: Add MapPin icon for KvK Registry component
**Date:** 2025-10-22 16:14:10 +0200


### 68c4dce - docs: Update CLAUDE.md with correct deployment process
**Date:** 2025-10-22 16:31:19 +0200


### 4295b86 - fix: Extract and store all KvK registry fields from API response
**Date:** 2025-10-22 16:55:19 +0200


### de08c6e - fix: Separate backend and frontend deployments to prevent 404s
**Date:** 2025-10-22 17:13:11 +0200


### 07eb8f2 - fix: Correct Claude API model name for booking portal extraction
**Date:** 2025-10-22 17:22:47 +0200


### acf0ba5 - fix: Add diagnostic endpoint and enhance error logging for booking portal
**Date:** 2025-10-22 17:36:00 +0200


### 42cb965 - fix: Booking portal Claude API and deployment issues
**Date:** 2025-10-22 17:57:02 +0200


### 8639e90 - fix: Replace pdf-parse with pdfjs-dist to fix canvas dependency issues
**Date:** 2025-10-22 18:21:54 +0200


### 16acd81 - fix: Use correct pdfjs-dist legacy path - TESTED AND WORKING
**Date:** 2025-10-22 19:20:09 +0200


### 1fa7f7c - fix: Complete Document Intelligence implementation and validation page
**Date:** 2025-10-22 20:22:37 +0200


### 8eac804 - feat: Add Kendo UI components and fix booking display issues
**Date:** 2025-10-22 20:39:12 +0200


### b4612e1 - fix: Remove TypeScript checking from build script to bypass type errors
**Date:** 2025-10-22 20:41:38 +0200


### ebc3920 - fix: Update pipeline to handle npm workspace structure
**Date:** 2025-10-22 20:46:29 +0200


### b8a3699 - fix: Correct Kendo Grid column field names for Confidence and Actions
**Date:** 2025-10-22 22:35:52 +0200


### fa4ea20 - fix: Remove field attribute from Actions column to display buttons
**Date:** 2025-10-22 22:48:58 +0200


### bfea1d9 - feat: Add return URL support for authentication flow
**Date:** 2025-10-22 23:10:34 +0200


### 613232c - fix: Update Kendo Grid to use cells API (v9.4.0+) instead of deprecated cell prop
**Date:** 2025-10-22 23:31:19 +0200


### 2974e42 - feat: Add dynamic form rendering for transport orders
**Date:** 2025-10-23 08:36:12 +0200


### a36ace8 - feat: Add DCSA Booking 2.0.2 multimodal transport and inland terminal extensions
**Date:** 2025-10-23 08:54:12 +0200


### ad53f93 - feat: Add comprehensive UI/UX improvements to booking portal
**Date:** 2025-10-23 09:10:15 +0200


### b22d11f - feat: Add multi-leg transport journey support and fix document labels
**Date:** 2025-10-23 09:28:07 +0200


### 148e733 - rebrand: Transform Booking Portal to CTN DocuFlow
**Date:** 2025-10-23 09:38:03 +0200


### b732f70 - fix: Remove accidentally committed deployment .zip files
**Date:** 2025-10-23 09:44:07 +0200


### fe29627 - feat: Add comprehensive quality validation and agent reviews for CTN DocuFlow
**Date:** 2025-10-23 10:30:26 +0200


### 0c5754b - fix: Critical security fixes for booking portal API (Week 1 CRITICAL issues)
**Date:** 2025-10-23 23:10:44 +0200


### b11782f - refactor: Extract service classes and implement pagination
**Date:** 2025-10-23 23:14:46 +0200


### 74214ee - perf: Fix duplicate PDF processing and add constants
**Date:** 2025-10-23 23:17:41 +0200


### 3d441d9 - feat: Update API routes and refactor ValidateBooking endpoint
**Date:** 2025-10-23 23:20:01 +0200


### af06161 - docs: Mark all Week 2 HIGH priority stages complete
**Date:** 2025-10-23 23:20:27 +0200


### a8c16dd - feat: Add Week 3 UX improvements to booking portal
**Date:** 2025-10-23 23:30:01 +0200


### 5432843 - docs: Update documentation after Week 1-3 completion
**Date:** 2025-10-23 23:38:48 +0200


### bbc6603 - feat: Implement async document processing to fix Claude timeout issue
**Date:** 2025-10-24 00:07:26 +0200


### f0b9387 - docs: Add async processing implementation documentation
**Date:** 2025-10-24 00:08:38 +0200


### c0f60c0 - docs: Update async processing docs with correct database and resource names
**Date:** 2025-10-24 00:14:06 +0200


## Files Modified
```
A	admin-portal/src/components/KvkRegistryDetails.css
A	admin-portal/src/components/KvkRegistryDetails.tsx
A	admin-portal/src/components/SubscriptionsGrid.tsx
A	admin-portal/src/components/TasksGrid.tsx
A	admin-portal/vite.config.ts
A	api/src/functions/getKvkRegistryData.ts
A	api/src/version.json
A	booking-portal/api/.gitignore
A	booking-portal/api/DiagnosticTest/function.json
A	booking-portal/api/DiagnosticTest/index.ts
A	booking-portal/api/GetProcessingJob/function.json
A	booking-portal/api/GetProcessingJob/index.ts
A	booking-portal/api/shared/constants.ts
A	booking-portal/api/shared/processingJobSchemas.ts
A	booking-portal/api/shared/services/BlobStorageService.ts
A	booking-portal/api/shared/services/CosmosDbService.ts
A	booking-portal/api/shared/services/DocumentProcessor.ts
A	booking-portal/api/shared/services/index.ts
A	booking-portal/api/shared/services/ProcessingJobService.ts
A	booking-portal/api/tests/.gitignore
A	booking-portal/api/tests/api-bookings-test.sh
A	booking-portal/api/tests/api-diagnostics-test.sh
A	booking-portal/api/tests/api-upload-test.sh
A	booking-portal/api/tests/api-validation-test.sh
A	booking-portal/api/tests/README.md
A	booking-portal/api/tests/run-all-api-tests.sh
A	booking-portal/api/tests/security-code-validation.sh
A	booking-portal/api/tests/security-validation-test.sh
A	booking-portal/ASYNC_PROCESSING_IMPLEMENTATION.md
A	booking-portal/e2e/bookings-grid-journey-timeline.spec.ts
A	booking-portal/e2e/document-upload-progress.spec.ts
A	booking-portal/e2e/transport-order-validation.spec.ts
A	booking-portal/e2e/WEEK3_UX_TEST_RESULTS.md
A	booking-portal/e2e/week3-ux-improvements.spec.ts
A	booking-portal/playwright.config.ts
A	booking-portal/SECURITY_VALIDATION_REPORT.md
A	booking-portal/TEST_COVERAGE_REPORT.md
A	booking-portal/TEST_SUITE_SUMMARY.md
A	booking-portal/tests/TRANSPORT_ORDER_VALIDATION_TEST_REPORT.md
A	booking-portal/tests/transport-order-validation-test.sh
A	booking-portal/tests/week2-security-fixes-test.sh
A	booking-portal/web/e2e/pdf-viewer-diagnosis.spec.ts
A	booking-portal/web/e2e/screenshots/pdf-viewer-diagnosis.png
A	booking-portal/web/src/components/Breadcrumb.tsx
A	booking-portal/web/src/components/EmptyState.tsx
A	booking-portal/web/src/components/validation/TransportJourneyTimeline.tsx
A	booking-portal/web/src/components/validation/TransportOrderForm.tsx
A	booking-portal/WEEK3_TEST_RESULTS.txt
A	booking-portal/WEEK3_UX_SUMMARY.md
A	database/current_schema.csv
A	database/get_schema.sql
A	database/migrations/013_fix_referential_integrity_v2.sql
A	database/migrations/014_kvk_registry_data.sql
A	database/migrations/archive/012_consolidate_audit_tables.sql
A	database/migrations/archive/013_ensure_legal_entities_exist_FIXED.sql
A	database/migrations/cleanup_unused_party_references.sql
A	database/migrations/drop_unused_tables.sql
A	database/migrations/investigate_integrity.sql
A	database/migrations/INVESTIGATION_QUERIES.sql
A	database/migrations/QUICK_START_GUIDE.md
A	database/migrations/sync_member_identifiers.sql
A	docs/archive/ADMIN_PORTAL_FIXES_2025-10-22.md
A	docs/CTN_DOCUFLOW_COMPREHENSIVE_REVIEW_2025-10-23.md
A	docs/CTN_DOCUFLOW_DEPLOYMENT_SUMMARY_2025-10-24.md
A	docs/CTN_DOCUFLOW_EXECUTIVE_SUMMARY.md
A	docs/database/COSMOS_DB_REVIEW_2025-10-23.md
A	docs/database/COSMOS_DB_REVIEW_SUMMARY.md
A	docs/database/DATABASE_REVIEW_2025-10-22.md
A	docs/IMPLEMENTATION_PLAN.md
D	.github/workflows/SETUP_INSTRUCTIONS.md
D	api/docs/logging.md
D	api/docs/rate-limiting.md
D	api/src/functions/createNewsletter.ts
D	api/src/functions/createSubscription.ts
D	api/src/functions/createTask.ts
D	api/src/functions/getNewsletters.ts
D	api/src/functions/getSubscriptions.ts
D	api/src/functions/getTasks.ts
D	api/src/functions/updateSubscription.ts
D	api/src/functions/updateTask.ts
D	api/tests/ORCHESTRATION_SECURITY_TEST_REPORT.md
D	api/tests/QUICK_START.md
D	api/tests/README.md
D	api/tests/TEST_SUITE_SUMMARY.md
D	booking-portal/api/AddToKnowledgeBase/index.js
D	booking-portal/api/AddToKnowledgeBase/index.js.map
D	booking-portal/api/GetBookingById/index.js
D	booking-portal/api/GetBookingById/index.js.map
D	booking-portal/api/GetBookings/index.js
D	booking-portal/api/GetBookings/index.js.map
D	booking-portal/api/GetDocumentSasUrl/index.js
D	booking-portal/api/GetDocumentSasUrl/index.js.map
D	booking-portal/api/GetTenants/index.js
D	booking-portal/api/GetTenants/index.js.map
D	booking-portal/api/shared/auth.js
D	booking-portal/api/shared/auth.js.map
D	booking-portal/api/shared/claudeExtractor.js
D	booking-portal/api/shared/claudeExtractor.js.map
D	booking-portal/api/shared/dcsaSchemas.js
D	booking-portal/api/shared/dcsaSchemas.js.map
D	booking-portal/api/shared/documentClassifier.js
D	booking-portal/api/shared/documentClassifier.js.map
D	booking-portal/api/shared/knowledgeBase.js
D	booking-portal/api/shared/knowledgeBase.js.map
D	booking-portal/api/shared/multipart.js
D	booking-portal/api/shared/multipart.js.map
D	booking-portal/api/shared/pdfExtractor.js
D	booking-portal/api/shared/pdfExtractor.js.map
D	booking-portal/api/shared/pdfSplitter.js
D	booking-portal/api/shared/pdfSplitter.js.map
D	booking-portal/api/UploadDocument/index.js
D	booking-portal/api/UploadDocument/index.js.map
D	booking-portal/api/ValidateBooking/index.js
D	booking-portal/api/ValidateBooking/index.js.map
D	booking-portal/BUG_REPORT_VALIDATION_PAGE.md
D	booking-portal/docs/database/COSMOS_DB_PERFORMANCE_REVIEW.md
D	booking-portal/docs/database/QUICK_FIX_GUIDE.md
D	booking-portal/IMPLEMENTATION_PLAN.md
D	booking-portal/README.md
D	booking-portal/web/e2e/debug/ANALYSIS_REPORT.md
D	booking-portal/web/package-lock.json
D	ctn-mcp-server/DEPLOYMENT_INFO.md
D	ctn-mcp-server/HOWTO_GUIDE_FOR_DOCS_PORTAL.md
D	ctn-mcp-server/README.md
D	database/DATABASE_SCHEMA_MANAGEMENT.md
D	database/migrations/archive_2025-10-20/010_performance_indexes_README.md
D	database/migrations/archive_2025-10-20/DEPLOYMENT_INSTRUCTIONS.md
D	database/migrations/archive_2025-10-20/README_MIGRATIONS.md
D	database/NEXT_STEPS.md
D	database/README.md
D	database/SCHEMA_REVIEW_2025-10-20.md
D	docs/AIKIDO_KEY_ROTATION.md
D	docs/API_DEPLOYMENT_FIX.md
D	docs/API_VERSIONING_STRATEGY.md
D	docs/APPLICATION_INSIGHTS_SETUP.md
D	docs/archive/AUDIT_TRAIL_IMPLEMENTATION_SUMMARY.md
D	docs/archive/AUTONOMOUS_WORK_SESSION_SUMMARY.md
D	docs/archive/BUG-008-IMPLEMENTATION-SUMMARY.md
D	docs/archive/IDENTIFIER_CRUD_IMPLEMENTATION_COMPLETE.md
D	docs/archive/IMPLEMENTATION_COMPLETE.md
D	docs/archive/SESSION_SUMMARY_2025-10-13.md
D	docs/archive/SESSION_SUMMARY_2025-10-16_AUTONOMOUS_BUG_FIXES.md
D	docs/archive/SESSION_SUMMARY_20251016_quality_scan_analysis.md
D	docs/archive/URGENT_ADD_KVK_TO_CONTARGO.md
D	docs/archive/URGENT_PRODUCTION_DIAGNOSTIC_REPORT.md
D	docs/AUTH_FIX_INSTRUCTIONS.md
D	docs/backend-requirements/IDENTIFIER_VERIFICATION_API.md
D	docs/BDI_INTEGRATION.md
D	docs/BIOME_CONTINUEONERROR_EXPLAINED.md
D	docs/BOOKING_PORTAL_PIPELINE_FIXES_2025-10-20.md
D	docs/bugs/BUG_FIX_REPORT_2025-10-15.md
D	docs/bugs/BUG_REPORT_IDENTIFIER_ISSUE.md
D	docs/bugs/IDENTIFIER_CRUD_BUG_FIX_REPORT.md
D	docs/CODE_QUALITY_SUMMARY.md
D	docs/CRITICAL_SECURITY_FIXES_COMPLETED.md
D	docs/DEPLOYMENT_ARCHITECTURE_BOOKING_PORTAL.md
D	docs/DEPLOYMENT_GUIDE.md
D	docs/DOCUMENTATION_UPDATE_2025-10-21.md
D	docs/HEALTH_MONITORING.md
D	docs/KVK_DOCUMENT_VERIFICATION_FEATURE.md
D	docs/LOGGING_GUIDE.md
D	docs/MIGRATION_SESSION_2025-10-20.md
D	docs/migrations/v1-to-v2-example.md
D	docs/ORCHESTRATION_API_IMPLEMENTATION_PLAN.md
D	docs/orchestrator-portal-security.md
D	docs/PORTAL_STATUS_REPORT.md
D	docs/PRODUCTION_READINESS_CHECKLIST.md
D	docs/QUICK_DIAGNOSTIC_GUIDE.md
D	docs/RELEASE_INSTRUCTIONS.md
D	docs/SECRET_ROTATION_GUIDE.md
D	docs/SECURITY_AUDIT_REPORT.md
D	docs/SECURITY_ROTATION_REQUIRED.md
D	docs/SESSION_SUMMARY_2025-10-18_SECURITY_AND_ORCHESTRATION.md
D	docs/SESSION_SUMMARY_2025-10-20.md
D	docs/STABLE_RELEASE_INFO.md
D	docs/TELEMETRY_IMPLEMENTATION_SUMMARY.md
D	docs/TELEMETRY_QUICK_REFERENCE.md
D	docs/testing/AZURE_DEVOPS_TEST_CASES.md
D	docs/testing/CI_CD_INTEGRATION.md
D	docs/testing/IDENTIFIER_ENDPOINTS_TEST_REPORT.md
D	docs/testing/PLAYWRIGHT_SETUP.md
D	docs/testing/PLAYWRIGHT_SUCCESS.md
D	docs/testing/PRODUCTION_TEST_REPORT.md
D	docs/testing/TEST_EXECUTION_REPORT.md
D	docs/testing/TEST_EXECUTION_SUMMARY.md
D	docs/testing/TEST_QUICK_START.md
D	docs/testing/TEST_REPORT_KVK_VERIFICATION.md
D	docs/testing/TEST_REPORT_SECURITY_HEADERS.md
D	docs/VITE_CONFIG_CENTRALIZATION.md
D	infrastructure/bicep/README.md
D	infrastructure/logic-apps/README.md
D	infrastructure/readme.md
D	orchestrator-portal/docs/ARCHITECTURE.md
D	orchestrator-portal/docs/archive/ROADMAP_UPDATES.md
D	orchestrator-portal/docs/archive/TONIGHT_SUMMARY.md
D	orchestrator-portal/docs/testing/PORTAL_TESTING_REPORT.md
D	orchestrator-portal/docs/testing/TEST_REPORT.md
D	orchestrator-portal/docs/testing/TESTING_SUMMARY.md
D	orchestrator-portal/e2e/README.md
D	orchestrator-portal/mock-api/API_SPECIFICATION.md
D	orchestrator-portal/mock-api/INTEGRATION_EXAMPLES.md
D	orchestrator-portal/mock-api/QUICKSTART.md
D	orchestrator-portal/mock-api/README.md
D	orchestrator-portal/README.md
D	packages/api-client/IMPLEMENTATION_SUMMARY.md
D	packages/api-client/README.md
D	packages/api-client/USAGE_EXAMPLES.md
D	portal/README.md
D	portal/web/e2e/MEMBER_PORTAL_BUG_REPORT.md
D	portal/web/e2e/MEMBER_PORTAL_TEST_DELIVERABLES.md
D	portal/web/e2e/MEMBER_PORTAL_TEST_RESULTS.md
D	portal/web/e2e/README.md
D	portal/web/e2e/VITE_MIGRATION_TEST_RESULTS.md
D	shared/vite-config-base/README.md
D	web/diagnostic-01-entity-loaded.png
D	web/diagnostic-02-before-add.png
D	web/diagnostic-03-dialog-open.png
D	web/diagnostic-error-no-add-button.png
D	web/docs/LOKALISE_INTEGRATION.md
D	web/e2e/MFA_WORKAROUND.md
D	web/e2e/QUICK_START.md
D	web/e2e/README.md
D	web/package-lock.json
D	web/README.md
D	web/src/components/SubscriptionsGrid.tsx
D	web/src/components/TasksGrid.tsx
D	web/src/react-dom-server-stub.js
D	web/test-identifier-api.js
D	web/vite.config.ts
M	.azure-pipelines/admin-portal.yml
M	.azure-pipelines/member-portal.yml
M	.azure-pipelines/playwright-tests.yml
M	.github/workflows/playwright-tests.yml
M	.gitignore
M	api/package.json
M	api/src/essential-index.ts
M	api/src/functions/getEndpointsByEntity.ts
M	api/src/functions/GetLegalEntity.ts
M	api/src/functions/uploadKvkDocument.ts
M	api/src/services/kvkService.ts
M	booking-portal/api/GetBookingById/index.ts
M	booking-portal/api/GetBookings/index.ts
M	booking-portal/api/GetDocumentSasUrl/index.ts
M	booking-portal/api/package.json
M	booking-portal/api/shared/auth.ts
M	booking-portal/api/shared/claudeExtractor.ts
M	booking-portal/api/shared/dcsaSchemas.ts
M	booking-portal/api/shared/documentClassifier.ts
M	booking-portal/api/shared/pdfExtractor.ts
M	booking-portal/api/tsconfig.json
M	booking-portal/api/UploadDocument/function.json
M	booking-portal/api/UploadDocument/index.ts
M	booking-portal/api/ValidateBooking/function.json
M	booking-portal/api/ValidateBooking/index.ts
M	booking-portal/azure-pipelines.yml
M	booking-portal/web/index.html
M	booking-portal/web/package.json
M	booking-portal/web/src/auth/ProtectedRoute.tsx
M	booking-portal/web/src/components/auth/LoginPage.tsx
M	booking-portal/web/src/components/Header.tsx
M	booking-portal/web/src/main.tsx
M	booking-portal/web/src/pages/Bookings.tsx
M	booking-portal/web/src/pages/Dashboard.tsx
M	booking-portal/web/src/pages/Upload.tsx
M	booking-portal/web/src/pages/Validation.tsx
M	booking-portal/web/src/styles/index.css
M	CLAUDE.md
M	ctn-docs-portal
M	database/get_indexes.sql
M	docs/COMPLETED_ACTIONS.md
M	package-lock.json
M	package.json
M	README.md
R090	web/src/components/MemberDetailView.tsx	admin-portal/src/components/MemberDetailView.tsx
R091	portal/src/components/NotFound.tsx	member-portal/src/components/NotFound.tsx
R091	web/src/components/About.css	admin-portal/src/components/About.css
R093	web/src/components/About.tsx	admin-portal/src/components/About.tsx
R097	web/src/services/apiV2.ts	admin-portal/src/services/apiV2.ts
R098	portal/package.json	member-portal/package.json
R098	web/package.json	admin-portal/package.json
R098	web/src/components/icons.tsx	admin-portal/src/components/icons.tsx
R099	portal/src/App.tsx	member-portal/src/App.tsx
R100	"web/.\\90f32498-5b71-4100-8774-f3ed70ed0a20-app.zip"	"admin-portal/.\\90f32498-5b71-4100-8774-f3ed70ed0a20-app.zip"
R100	"web/.\\e4e6be2f-4298-4549-a6ec-04ae788be7c9-app.zip"	"admin-portal/.\\e4e6be2f-4298-4549-a6ec-04ae788be7c9-app.zip"
R100	database/current_schema.sql	database/create_schema.sql
R100	database/migrations/archive_2025-10-20/001-enhanced-schema.sql	database/migrations/archive/001-enhanced-schema.sql
R100	database/migrations/archive_2025-10-20/002_add_contact_fields.sql	database/migrations/archive/002_add_contact_fields.sql
R100	database/migrations/archive_2025-10-20/003_link_members_to_legal_entities.sql	database/migrations/archive/003_link_members_to_legal_entities.sql
R100	database/migrations/archive_2025-10-20/004-migrate-members-data.sql	database/migrations/archive/004-migrate-members-data.sql
R100	database/migrations/archive_2025-10-20/007_kvk_verification.sql	database/migrations/archive/007_kvk_verification.sql
R100	database/migrations/archive_2025-10-20/008_admin_portal_expansion.sql	database/migrations/archive/008_admin_portal_expansion.sql
R100	database/migrations/archive_2025-10-20/009_create_audit_log_table.sql	database/migrations/archive/009_create_audit_log_table.sql
R100	database/migrations/archive_2025-10-20/010_performance_indexes.sql	database/migrations/archive/010_performance_indexes.sql
R100	database/migrations/archive_2025-10-20/011_bdi_orchestration_support.sql	database/migrations/archive/011_bdi_orchestration_support.sql
R100	database/migrations/archive_2025-10-20/012_international_registry_support.sql	database/migrations/archive/012_international_registry_support.sql
R100	database/migrations/archive_2025-10-20/013_ensure_legal_entities_exist_FIXED.sql	database/migrations/013_fix_referential_integrity.sql
R100	database/migrations/archive_2025-10-20/013_ensure_legal_entities_exist.sql	database/migrations/archive/013_ensure_legal_entities_exist.sql
R100	database/migrations/archive_2025-10-20/014_fix_members_without_legal_entity_id.sql	database/migrations/archive/014_fix_members_without_legal_entity_id.sql
R100	database/migrations/archive_2025-10-20/014_standardize_timestamp_types_DO_NOT_USE.sql	database/migrations/archive/014_standardize_timestamp_types_DO_NOT_USE.sql
R100	database/migrations/archive_2025-10-20/015_add_azure_ad_object_id.sql	database/migrations/archive/015_add_azure_ad_object_id.sql
R100	database/migrations/archive_2025-10-20/016_standardize_timestamp_types_FIXED.sql	database/migrations/archive/016_standardize_timestamp_types_FIXED.sql
R100	database/migrations/archive_2025-10-20/check_migration_014_status.sql	database/migrations/archive/check_migration_014_status.sql
R100	database/migrations/archive_2025-10-20/check_table_columns.sql	database/migrations/archive/check_table_columns.sql
R100	database/migrations/archive_2025-10-20/verify_015_migration.sql	database/migrations/archive/verify_015_migration.sql
R100	database/schema_indexes.csv	database/migrations/schema_indexes.csv
R100	portal/.env.example	member-portal/.env.example
R100	portal/.env.production	member-portal/.env.production
R100	portal/.env.production.template	member-portal/.env.production.template
R100	portal/.gitignore	admin-portal/.gitignore
R100	portal/aikido.config.js	admin-portal/aikido.config.js
R100	portal/api/tests/api-smoke-test.sh	member-portal/api/tests/api-smoke-test.sh
R100	portal/api/tests/member-portal-api-tests.sh	member-portal/api/tests/member-portal-api-tests.sh
R100	portal/biome.json	admin-portal/biome.json
R100	portal/e2e/security-headers.spec.ts	member-portal/e2e/security-headers.spec.ts
R100	portal/index.html	member-portal/index.html
R100	portal/package-lock.json	member-portal/package-lock.json
R100	portal/playwright.config.ts	member-portal/playwright.config.ts
R100	portal/public/assets/logos/contargo.png	admin-portal/public/assets/logos/contargo.png
R100	portal/public/assets/logos/ctn small.png	admin-portal/public/assets/logos/ctn small.png
R100	portal/public/assets/logos/ctn.png	admin-portal/public/assets/logos/ctn.png
R100	portal/public/assets/logos/DIL.png	admin-portal/public/assets/logos/DIL.png
R100	portal/public/assets/logos/Inland Terminals Group.png	admin-portal/public/assets/logos/Inland Terminals Group.png
R100	portal/public/assets/logos/portbase.png	admin-portal/public/assets/logos/portbase.png
R100	portal/public/assets/logos/VanBerkel.png	admin-portal/public/assets/logos/VanBerkel.png
R100	portal/public/favicon.ico	admin-portal/public/favicon.ico
R100	portal/public/logo192.png	member-portal/public/logo192.png
R100	portal/public/logo512.png	admin-portal/public/logo512.png
R100	portal/public/staticwebapp.config.json	admin-portal/public/staticwebapp.config.json
R100	portal/reports/.gitignore	admin-portal/reports/.gitignore
R100	portal/reports/.gitkeep	admin-portal/reports/.gitkeep
R100	portal/src/App.css	member-portal/src/App.css
R100	portal/src/auth/authConfig.ts	member-portal/src/auth/authConfig.ts
R100	portal/src/components/ContactsView.tsx	member-portal/src/components/ContactsView.tsx
R100	portal/src/components/Dashboard.tsx	member-portal/src/components/Dashboard.tsx
R100	portal/src/components/Endpoints.tsx	member-portal/src/components/Endpoints.tsx
R100	portal/src/components/EndpointsView.tsx	member-portal/src/components/EndpointsView.tsx
R100	portal/src/components/LanguageSwitcher.css	member-portal/src/components/LanguageSwitcher.css
R100	portal/src/components/LanguageSwitcher.tsx	admin-portal/src/components/LanguageSwitcher.tsx
R100	portal/src/components/ProfileView.tsx	member-portal/src/components/ProfileView.tsx
R100	portal/src/components/Support.tsx	member-portal/src/components/Support.tsx
R100	portal/src/components/Tokens.tsx	member-portal/src/components/Tokens.tsx
R100	portal/src/components/TokensView.tsx	member-portal/src/components/TokensView.tsx
R100	portal/src/i18n.ts	member-portal/src/i18n.ts
R100	portal/src/index.css	member-portal/src/index.css
R100	portal/src/index.tsx	member-portal/src/index.tsx
R100	portal/src/kendoLicense.ts	member-portal/src/kendoLicense.ts
R100	portal/src/locales/de/translation.json	admin-portal/src/locales/de/translation.json
R100	portal/src/locales/en/translation.json	admin-portal/src/locales/en/translation.json
R100	portal/src/locales/nl/translation.json	admin-portal/src/locales/nl/translation.json
R100	portal/src/react-app-env.d.ts	admin-portal/src/react-app-env.d.ts
R100	portal/src/services/apiClient.ts	member-portal/src/services/apiClient.ts
R100	portal/src/types.ts	member-portal/src/types.ts
R100	portal/src/vite-env.d.ts	admin-portal/src/vite-env.d.ts
R100	portal/tsconfig.json	admin-portal/tsconfig.json
R100	portal/vite.config.ts	member-portal/vite.config.ts
R100	portal/web/e2e/member-portal.spec.ts	member-portal/web/e2e/member-portal.spec.ts
R100	portal/web/e2e/vite-migration/admin-portal.spec.ts	member-portal/web/e2e/vite-migration/admin-portal.spec.ts
R100	portal/web/e2e/vite-migration/member-portal.spec.ts	member-portal/web/e2e/vite-migration/member-portal.spec.ts
R100	web/.env.example	admin-portal/.env.example
R100	web/.env.production	admin-portal/.env.production
R100	web/.env.production.template	admin-portal/.env.production.template
R100	web/.env.template	admin-portal/.env.template
R100	web/.gitignore	member-portal/.gitignore
R100	web/.pipeline-test	admin-portal/.pipeline-test
R100	web/aikido.config.js	member-portal/aikido.config.js
R100	web/biome.json	member-portal/biome.json
R100	web/e2e/admin-portal-improved.spec.ts	admin-portal/e2e/admin-portal-improved.spec.ts
R100	web/e2e/admin-portal.spec.ts	admin-portal/e2e/admin-portal.spec.ts
R100	web/e2e/admin-portal/accessibility.spec.ts	admin-portal/e2e/admin-portal/accessibility.spec.ts
R100	web/e2e/admin-portal/authentication.spec.ts	admin-portal/e2e/admin-portal/authentication.spec.ts
R100	web/e2e/admin-portal/bug-investigation-identifier-404.spec.ts	admin-portal/e2e/admin-portal/bug-investigation-identifier-404.spec.ts
R100	web/e2e/admin-portal/grid-pagination.spec.ts	admin-portal/e2e/admin-portal/grid-pagination.spec.ts
R100	web/e2e/admin-portal/identifier-workflow-production.spec.ts	admin-portal/e2e/admin-portal/identifier-workflow-production.spec.ts
R100	web/e2e/admin-portal/identifier-workflow-simple.spec.ts	admin-portal/e2e/admin-portal/identifier-workflow-simple.spec.ts
R100	web/e2e/admin-portal/identifiers-crud.spec.ts	admin-portal/e2e/admin-portal/identifiers-crud.spec.ts
R100	web/e2e/admin-portal/identifiers-manager.spec.ts	admin-portal/e2e/admin-portal/identifiers-manager.spec.ts
R100	web/e2e/admin-portal/managers-crud.spec.ts	admin-portal/e2e/admin-portal/managers-crud.spec.ts
R100	web/e2e/admin-portal/member-management.spec.ts	admin-portal/e2e/admin-portal/member-management.spec.ts
R100	web/e2e/auth.setup.ts	admin-portal/e2e/auth.setup.ts
R100	web/e2e/bug-investigation/contargo-kvk-visibility-check.spec.ts	admin-portal/e2e/bug-investigation/contargo-kvk-visibility-check.spec.ts
R100	web/e2e/debug-identifier-500.spec.ts	admin-portal/e2e/debug-identifier-500.spec.ts
R100	web/e2e/help-system.spec.ts	admin-portal/e2e/help-system.spec.ts
R100	web/e2e/kvk-verification.spec.ts	admin-portal/e2e/kvk-verification.spec.ts
R100	web/e2e/portal-smoke-test.spec.ts	admin-portal/e2e/portal-smoke-test.spec.ts
R100	web/e2e/progressive-disclosure.spec.ts	admin-portal/e2e/progressive-disclosure.spec.ts
R100	web/e2e/quick-test.spec.ts	admin-portal/e2e/quick-test.spec.ts
R100	web/e2e/security-headers.spec.ts	admin-portal/e2e/security-headers.spec.ts
R100	web/e2e/urgent-production-diagnostic.spec.ts	admin-portal/e2e/urgent-production-diagnostic.spec.ts
R100	web/e2e/urgent/add-kvk-95944192-fixed.spec.ts	admin-portal/e2e/urgent/add-kvk-95944192-fixed.spec.ts
R100	web/e2e/urgent/add-kvk-to-contargo.spec.ts	admin-portal/e2e/urgent/add-kvk-to-contargo.spec.ts
R100	web/e2e/urgent/contargo-kvk-simple.spec.ts	admin-portal/e2e/urgent/contargo-kvk-simple.spec.ts
R100	web/index.html	admin-portal/index.html
R100	web/install-kendo-form.sh	admin-portal/install-kendo-form.sh
R100	web/install-kendo.sh	admin-portal/install-kendo.sh
R100	web/install-notifications.sh	admin-portal/install-notifications.sh
R100	web/kendo-ui-license.txt	admin-portal/kendo-ui-license.txt
R100	web/playwright.config.ts	admin-portal/playwright.config.ts
R100	web/playwright/fixtures.ts	admin-portal/playwright/fixtures.ts
R100	web/playwright/global-setup.ts	admin-portal/playwright/global-setup.ts
R100	web/public/assets/logos/contargo.png	member-portal/public/assets/logos/contargo.png
R100	web/public/assets/logos/ctn small.png	member-portal/public/assets/logos/ctn small.png
R100	web/public/assets/logos/ctn.png	member-portal/public/assets/logos/ctn.png
R100	web/public/assets/logos/DIL.png	member-portal/public/assets/logos/DIL.png
R100	web/public/assets/logos/Inland Terminals Group.png	member-portal/public/assets/logos/Inland Terminals Group.png
R100	web/public/assets/logos/portbase.png	member-portal/public/assets/logos/portbase.png
R100	web/public/assets/logos/VanBerkel.png	member-portal/public/assets/logos/VanBerkel.png
R100	web/public/favicon.ico	member-portal/public/favicon.ico
R100	web/public/logo192.png	admin-portal/public/logo192.png
R100	web/public/logo512.png	member-portal/public/logo512.png
R100	web/public/manifest.json	admin-portal/public/manifest.json
R100	web/public/robots.txt	admin-portal/public/robots.txt
R100	web/public/staticwebapp.config.json	member-portal/public/staticwebapp.config.json
R100	web/public/version.json	admin-portal/public/version.json
R100	web/reports/.gitignore	member-portal/reports/.gitignore
R100	web/reports/.gitkeep	member-portal/reports/.gitkeep
R100	web/scripts/add-kvk-to-contargo.js	admin-portal/scripts/add-kvk-to-contargo.js
R100	web/scripts/capture-auth-auto.js	admin-portal/scripts/capture-auth-auto.js
R100	web/scripts/capture-auth-final.js	admin-portal/scripts/capture-auth-final.js
R100	web/scripts/capture-auth-manual.js	admin-portal/scripts/capture-auth-manual.js
R100	web/src/App.css	admin-portal/src/App.css
R100	web/src/App.test.tsx	admin-portal/src/App.test.tsx
R100	web/src/App.tsx	admin-portal/src/App.tsx
R100	web/src/auth/authConfig.ts	admin-portal/src/auth/authConfig.ts
R100	web/src/auth/AuthContext.tsx	admin-portal/src/auth/AuthContext.tsx
R100	web/src/auth/ProtectedRoute.tsx	admin-portal/src/auth/ProtectedRoute.tsx
R100	web/src/components/AdminPortal.css	admin-portal/src/components/AdminPortal.css
R100	web/src/components/AdminPortal.tsx	admin-portal/src/components/AdminPortal.tsx
R100	web/src/components/AdminSidebar.css	admin-portal/src/components/AdminSidebar.css
R100	web/src/components/AdminSidebar.tsx	admin-portal/src/components/AdminSidebar.tsx
R100	web/src/components/AdvancedFilter.css	admin-portal/src/components/AdvancedFilter.css
R100	web/src/components/AdvancedFilter.tsx	admin-portal/src/components/AdvancedFilter.tsx
R100	web/src/components/audit/AuditLogViewer.css	admin-portal/src/components/audit/AuditLogViewer.css
R100	web/src/components/audit/AuditLogViewer.tsx	admin-portal/src/components/audit/AuditLogViewer.tsx
R100	web/src/components/auth/LoginPage.css	admin-portal/src/components/auth/LoginPage.css
R100	web/src/components/auth/LoginPage.tsx	admin-portal/src/components/auth/LoginPage.tsx
R100	web/src/components/auth/MFARequired.css	admin-portal/src/components/auth/MFARequired.css
R100	web/src/components/auth/MFARequired.tsx	admin-portal/src/components/auth/MFARequired.tsx
R100	web/src/components/auth/Unauthorized.css	admin-portal/src/components/auth/Unauthorized.css
R100	web/src/components/auth/Unauthorized.tsx	admin-portal/src/components/auth/Unauthorized.tsx
R100	web/src/components/ComingSoonPlaceholder.tsx	admin-portal/src/components/ComingSoonPlaceholder.tsx
R100	web/src/components/CompanyDetails.css	admin-portal/src/components/CompanyDetails.css
R100	web/src/components/CompanyDetails.tsx	admin-portal/src/components/CompanyDetails.tsx
R100	web/src/components/CompanyForm.css	admin-portal/src/components/CompanyForm.css
R100	web/src/components/CompanyForm.tsx	admin-portal/src/components/CompanyForm.tsx
R100	web/src/components/ConfirmDialog.css	admin-portal/src/components/ConfirmDialog.css
R100	web/src/components/ConfirmDialog.tsx	admin-portal/src/components/ConfirmDialog.tsx
R100	web/src/components/ContactForm.css	admin-portal/src/components/ContactForm.css
R100	web/src/components/ContactForm.tsx	admin-portal/src/components/ContactForm.tsx
R100	web/src/components/ContactsManager.css	admin-portal/src/components/ContactsManager.css
R100	web/src/components/ContactsManager.tsx	admin-portal/src/components/ContactsManager.tsx
R100	web/src/components/Dashboard.css	admin-portal/src/components/Dashboard.css
R100	web/src/components/Dashboard.tsx	admin-portal/src/components/Dashboard.tsx
R100	web/src/components/EmptyState.css	admin-portal/src/components/EmptyState.css
R100	web/src/components/EmptyState.tsx	admin-portal/src/components/EmptyState.tsx
R100	web/src/components/EndpointManagement.css	admin-portal/src/components/EndpointManagement.css
R100	web/src/components/EndpointManagement.tsx	admin-portal/src/components/EndpointManagement.tsx
R100	web/src/components/ErrorBoundary.css	admin-portal/src/components/ErrorBoundary.css
R100	web/src/components/ErrorBoundary.tsx	admin-portal/src/components/ErrorBoundary.tsx
R100	web/src/components/ExampleUsage.tsx	admin-portal/src/components/ExampleUsage.tsx
R100	web/src/components/forms/ConditionalField.tsx	admin-portal/src/components/forms/ConditionalField.tsx
R100	web/src/components/forms/ProgressiveSection.tsx	admin-portal/src/components/forms/ProgressiveSection.tsx
R100	web/src/components/forms/StepperForm.tsx	admin-portal/src/components/forms/StepperForm.tsx
R100	web/src/components/HealthDashboard.css	admin-portal/src/components/HealthDashboard.css
R100	web/src/components/HealthDashboard.tsx	admin-portal/src/components/HealthDashboard.tsx
R100	web/src/components/help/FieldHelp.tsx	admin-portal/src/components/help/FieldHelp.tsx
R100	web/src/components/help/FieldLabel.tsx	admin-portal/src/components/help/FieldLabel.tsx
R100	web/src/components/help/help.css	admin-portal/src/components/help/help.css
R100	web/src/components/help/HelpPanel.tsx	admin-portal/src/components/help/HelpPanel.tsx
R100	web/src/components/help/HelpTooltip.tsx	admin-portal/src/components/help/HelpTooltip.tsx
R100	web/src/components/help/index.ts	admin-portal/src/components/help/index.ts
R100	web/src/components/IdentifiersManager.css	admin-portal/src/components/IdentifiersManager.css
R100	web/src/components/IdentifiersManager.tsx	admin-portal/src/components/IdentifiersManager.tsx
R100	web/src/components/IdentifierVerificationManager.css	admin-portal/src/components/IdentifierVerificationManager.css
R100	web/src/components/IdentifierVerificationManager.tsx	admin-portal/src/components/IdentifierVerificationManager.tsx
R100	web/src/components/KvkDocumentUpload.tsx	admin-portal/src/components/KvkDocumentUpload.tsx
R100	web/src/components/KvkReviewQueue.tsx	admin-portal/src/components/KvkReviewQueue.tsx
R100	web/src/components/LanguageSwitcher.css	admin-portal/src/components/LanguageSwitcher.css
R100	web/src/components/LanguageSwitcher.tsx	member-portal/src/components/LanguageSwitcher.tsx
R100	web/src/components/LoadingSpinner.css	admin-portal/src/components/LoadingSpinner.css
R100	web/src/components/LoadingSpinner.tsx	admin-portal/src/components/LoadingSpinner.tsx
R100	web/src/components/MemberDetailDialog.css	admin-portal/src/components/MemberDetailDialog.css
R100	web/src/components/MemberDetailDialog.tsx	admin-portal/src/components/MemberDetailDialog.tsx
R100	web/src/components/MemberDetailView.css	admin-portal/src/components/MemberDetailView.css
R100	web/src/components/MemberForm.css	admin-portal/src/components/MemberForm.css
R100	web/src/components/MemberForm.tsx	admin-portal/src/components/MemberForm.tsx
R100	web/src/components/MembersGrid.css	admin-portal/src/components/MembersGrid.css
R100	web/src/components/MembersGrid.tsx	admin-portal/src/components/MembersGrid.tsx
R100	web/src/components/NewslettersGrid.css	admin-portal/src/components/NewslettersGrid.css
R100	web/src/components/NewslettersGrid.tsx	admin-portal/src/components/NewslettersGrid.tsx
R100	web/src/components/NotFound.css	admin-portal/src/components/NotFound.css
R100	web/src/components/NotFound.tsx	admin-portal/src/components/NotFound.tsx
R100	web/src/components/ProgressIndicator.css	admin-portal/src/components/ProgressIndicator.css
R100	web/src/components/ProgressIndicator.tsx	admin-portal/src/components/ProgressIndicator.tsx
R100	web/src/components/ReviewTasks.tsx	admin-portal/src/components/ReviewTasks.tsx
R100	web/src/components/Settings.css	admin-portal/src/components/Settings.css
R100	web/src/components/Settings.tsx	admin-portal/src/components/Settings.tsx
R100	web/src/components/SubscriptionsGrid.css	admin-portal/src/components/SubscriptionsGrid.css
R100	web/src/components/TasksGrid.css	admin-portal/src/components/TasksGrid.css
R100	web/src/components/TokensManager.css	admin-portal/src/components/TokensManager.css
R100	web/src/components/TokensManager.tsx	admin-portal/src/components/TokensManager.tsx
R100	web/src/components/users/EditUserDialog.tsx	admin-portal/src/components/users/EditUserDialog.tsx
R100	web/src/components/users/InviteUserDialog.tsx	admin-portal/src/components/users/InviteUserDialog.tsx
R100	web/src/components/users/UserManagement.css	admin-portal/src/components/users/UserManagement.css
R100	web/src/components/users/UserManagement.tsx	admin-portal/src/components/users/UserManagement.tsx
R100	web/src/config/helpContent.ts	admin-portal/src/config/helpContent.ts
R100	web/src/contexts/NotificationContext.tsx	admin-portal/src/contexts/NotificationContext.tsx
R100	web/src/hooks/useAsync.ts	admin-portal/src/hooks/useAsync.ts
R100	web/src/hooks/useGridState.ts	admin-portal/src/hooks/useGridState.ts
R100	web/src/i18n.ts	admin-portal/src/i18n.ts
R100	web/src/index.css	admin-portal/src/index.css
R100	web/src/index.tsx	admin-portal/src/index.tsx
R100	web/src/kendoLicense.ts	admin-portal/src/kendoLicense.ts
R100	web/src/locales/de/translation.json	member-portal/src/locales/de/translation.json
R100	web/src/locales/en/translation.json	member-portal/src/locales/en/translation.json
R100	web/src/locales/nl/translation.json	member-portal/src/locales/nl/translation.json
R100	web/src/logo.svg	admin-portal/src/logo.svg
R100	web/src/pages/MemberRegistrationWizard.css	admin-portal/src/pages/MemberRegistrationWizard.css
R100	web/src/pages/MemberRegistrationWizard.tsx	admin-portal/src/pages/MemberRegistrationWizard.tsx
R100	web/src/react-app-env.d.ts	member-portal/src/react-app-env.d.ts
R100	web/src/reportWebVitals.ts	admin-portal/src/reportWebVitals.ts
R100	web/src/services/api.ts	admin-portal/src/services/api.ts
R100	web/src/services/apiClient.ts	admin-portal/src/services/apiClient.ts
R100	web/src/services/auditLogService.ts	admin-portal/src/services/auditLogService.ts
R100	web/src/setupTests.ts	admin-portal/src/setupTests.ts
R100	web/src/styles/progressive-forms.css	admin-portal/src/styles/progressive-forms.css
R100	web/src/utils/dateUtils.ts	admin-portal/src/utils/dateUtils.ts
R100	web/src/utils/exportUtils.ts	admin-portal/src/utils/exportUtils.ts
R100	web/src/utils/genericExportUtils.ts	admin-portal/src/utils/genericExportUtils.ts
R100	web/src/utils/validation.ts	admin-portal/src/utils/validation.ts
R100	web/src/vite-env.d.ts	member-portal/src/vite-env.d.ts
R100	web/tsconfig.json	member-portal/tsconfig.json
```

## Risk Assessment
- 🟢 **LOW RISK** - Isolated to booking portal async processing
- Fixes critical timeout issue with Claude API
- Adds Azure Queue Storage integration
- Recommendation: HIGH VALUE - Safe to merge

---

# Branch 6: feature/rate-limiting

**Last Updated:** 2025-10-24 00:20:08 +0200
**Commits Not on Main:** 71
**Focus:** DoS protection, rate limiting middleware

## All Commits

### 42bccbb - docs: Add portal-specific branch strategy and workflow
**Date:** 2025-10-22 11:05:36 +0200


### 9c15f74 - Merge branch 'feature/admin-portal'
**Date:** 2025-10-22 11:41:55 +0200


### 65e65fb - chore: Repository cleanup - remove compiled files and debug artifacts
**Date:** 2025-10-22 11:54:53 +0200


### c5fd877 - refactor: Rename portals for consistency and standardize workspace configuration
**Date:** 2025-10-22 12:02:03 +0200


### 332b731 - chore: Remove debug artifacts and prevent future tracking
**Date:** 2025-10-22 12:06:25 +0200


### ea49cab - docs: Aggressive documentation cleanup - 92% reduction
**Date:** 2025-10-22 12:11:33 +0200


### e01bc9c - docs: Comprehensive recursive cleanup - Remove 53 scattered documentation files
**Date:** 2025-10-22 12:19:02 +0200


### 05b57dd - fix: Reorder sidebar menu and simplify Subscriptions page
**Date:** 2025-10-22 12:37:44 +0200


### 6ab5ce7 - fix: Remove unused subscription/newsletter/task features and consolidate audit tables
**Date:** 2025-10-22 12:43:08 +0200


### 4139b18 - docs: Document admin portal fixes completed on 2025-10-22
**Date:** 2025-10-22 12:45:47 +0200


### 27c049a - fix: Move Subscriptions and Newsletters just above About in sidebar
**Date:** 2025-10-22 12:46:59 +0200


### 6cca978 - fix: Convert result values to lowercase in audit table migration
**Date:** 2025-10-22 13:26:11 +0200


### 29ab94c - fix: Map all audit result values to success/failure in migration
**Date:** 2025-10-22 13:29:22 +0200


### 6b1b48a - fix: Update admin portal pipeline to use admin-portal directory
**Date:** 2025-10-22 13:41:25 +0200


### de8a9e2 - fix: Update member portal pipeline to use member-portal directory
**Date:** 2025-10-22 13:43:01 +0200


### 9dc2a85 - fix: Replace lucide-react icons with emojis in member portal
**Date:** 2025-10-22 13:52:09 +0200


### efa55f6 - fix: Add @remix-run/router and archive old migrations
**Date:** 2025-10-22 13:54:37 +0200


### bd73017 - fix: Add @progress/kendo-draggable-common to member portal
**Date:** 2025-10-22 13:55:58 +0200


### 008aa51 - fix: Correct kendo-draggable-common version and update lock file
**Date:** 2025-10-22 13:58:24 +0200


### a030bc0 - fix: Match Subscriptions page styling to Newsletters page
**Date:** 2025-10-22 14:15:37 +0200


### e086ad5 - docs: Update COMPLETED_ACTIONS.md with tasks from October 22, 2025
**Date:** 2025-10-22 14:21:28 +0200


### 5eb0c32 - fix: Add SQL scripts to investigate and fix referential integrity issues
**Date:** 2025-10-22 14:29:59 +0200


### 7b94dea - fix: Replace migration with tested version from archive
**Date:** 2025-10-22 14:30:18 +0200


### f0ff952 - fix: Add script to cleanup unused party_reference records
**Date:** 2025-10-22 14:32:24 +0200


### dd0e0a8 - fix: Add script to sync KVK/LEI from members to legal_entity_number
**Date:** 2025-10-22 14:32:51 +0200


### a6df33e - fix: Add script to drop remaining unused tables from removed features
**Date:** 2025-10-22 14:34:24 +0200


### 1998a1f - fix: Allow admin access to getEndpointsByEntity endpoint
**Date:** 2025-10-22 14:46:36 +0200


### fe68d56 - fix: Improve KvK verification error messages
**Date:** 2025-10-22 14:51:13 +0200


### 12d3918 - fix: Improve About page environment display and badge positioning
**Date:** 2025-10-22 14:53:40 +0200


### 61d5389 - chore: Reorganize database files and sanitize documentation
**Date:** 2025-10-22 15:15:14 +0200


### 88bdaed - fix: Add version.json copy to API build script for manual deployments
**Date:** 2025-10-22 15:32:13 +0200


### bbf74e1 - fix: Replace Kendo Badge with custom styled badge to prevent header positioning
**Date:** 2025-10-22 15:34:38 +0200


### 5b52345 - fix: Check permissions in GetLegalEntity handler for admin access
**Date:** 2025-10-22 15:49:08 +0200


### edf5b39 - fix: KvK API integration - map Dutch field names to English data structure
**Date:** 2025-10-22 16:00:11 +0200


### 1e6b2f8 - feat: Add comprehensive KvK registry data storage and display
**Date:** 2025-10-22 16:10:47 +0200


### 3258004 - fix: Add MapPin icon for KvK Registry component
**Date:** 2025-10-22 16:14:10 +0200


### 68c4dce - docs: Update CLAUDE.md with correct deployment process
**Date:** 2025-10-22 16:31:19 +0200


### 4295b86 - fix: Extract and store all KvK registry fields from API response
**Date:** 2025-10-22 16:55:19 +0200


### de08c6e - fix: Separate backend and frontend deployments to prevent 404s
**Date:** 2025-10-22 17:13:11 +0200


### 07eb8f2 - fix: Correct Claude API model name for booking portal extraction
**Date:** 2025-10-22 17:22:47 +0200


### acf0ba5 - fix: Add diagnostic endpoint and enhance error logging for booking portal
**Date:** 2025-10-22 17:36:00 +0200


### 42cb965 - fix: Booking portal Claude API and deployment issues
**Date:** 2025-10-22 17:57:02 +0200


### 8639e90 - fix: Replace pdf-parse with pdfjs-dist to fix canvas dependency issues
**Date:** 2025-10-22 18:21:54 +0200


### 16acd81 - fix: Use correct pdfjs-dist legacy path - TESTED AND WORKING
**Date:** 2025-10-22 19:20:09 +0200


### 1fa7f7c - fix: Complete Document Intelligence implementation and validation page
**Date:** 2025-10-22 20:22:37 +0200


### 8eac804 - feat: Add Kendo UI components and fix booking display issues
**Date:** 2025-10-22 20:39:12 +0200


### b4612e1 - fix: Remove TypeScript checking from build script to bypass type errors
**Date:** 2025-10-22 20:41:38 +0200


### ebc3920 - fix: Update pipeline to handle npm workspace structure
**Date:** 2025-10-22 20:46:29 +0200


### b8a3699 - fix: Correct Kendo Grid column field names for Confidence and Actions
**Date:** 2025-10-22 22:35:52 +0200


### fa4ea20 - fix: Remove field attribute from Actions column to display buttons
**Date:** 2025-10-22 22:48:58 +0200


### bfea1d9 - feat: Add return URL support for authentication flow
**Date:** 2025-10-22 23:10:34 +0200


### 613232c - fix: Update Kendo Grid to use cells API (v9.4.0+) instead of deprecated cell prop
**Date:** 2025-10-22 23:31:19 +0200


### 2974e42 - feat: Add dynamic form rendering for transport orders
**Date:** 2025-10-23 08:36:12 +0200


### a36ace8 - feat: Add DCSA Booking 2.0.2 multimodal transport and inland terminal extensions
**Date:** 2025-10-23 08:54:12 +0200


### ad53f93 - feat: Add comprehensive UI/UX improvements to booking portal
**Date:** 2025-10-23 09:10:15 +0200


### b22d11f - feat: Add multi-leg transport journey support and fix document labels
**Date:** 2025-10-23 09:28:07 +0200


### 148e733 - rebrand: Transform Booking Portal to CTN DocuFlow
**Date:** 2025-10-23 09:38:03 +0200


### b732f70 - fix: Remove accidentally committed deployment .zip files
**Date:** 2025-10-23 09:44:07 +0200


### fe29627 - feat: Add comprehensive quality validation and agent reviews for CTN DocuFlow
**Date:** 2025-10-23 10:30:26 +0200


### 0c5754b - fix: Critical security fixes for booking portal API (Week 1 CRITICAL issues)
**Date:** 2025-10-23 23:10:44 +0200


### b11782f - refactor: Extract service classes and implement pagination
**Date:** 2025-10-23 23:14:46 +0200


### 74214ee - perf: Fix duplicate PDF processing and add constants
**Date:** 2025-10-23 23:17:41 +0200


### 3d441d9 - feat: Update API routes and refactor ValidateBooking endpoint
**Date:** 2025-10-23 23:20:01 +0200


### af06161 - docs: Mark all Week 2 HIGH priority stages complete
**Date:** 2025-10-23 23:20:27 +0200


### a8c16dd - feat: Add Week 3 UX improvements to booking portal
**Date:** 2025-10-23 23:30:01 +0200


### 5432843 - docs: Update documentation after Week 1-3 completion
**Date:** 2025-10-23 23:38:48 +0200


### bbc6603 - feat: Implement async document processing to fix Claude timeout issue
**Date:** 2025-10-24 00:07:26 +0200


### f0b9387 - docs: Add async processing implementation documentation
**Date:** 2025-10-24 00:08:38 +0200


### c0f60c0 - docs: Update async processing docs with correct database and resource names
**Date:** 2025-10-24 00:14:06 +0200


### e22b4ec - feat: Implement rate limiting middleware for DoS protection
**Date:** 2025-10-24 00:19:04 +0200


### 91fea02 - feat: Add strict CORS configuration to prevent unauthorized access
**Date:** 2025-10-24 00:20:08 +0200


## Files Modified
```
A	admin-portal/src/components/KvkRegistryDetails.css
A	admin-portal/src/components/KvkRegistryDetails.tsx
A	admin-portal/src/components/SubscriptionsGrid.tsx
A	admin-portal/src/components/TasksGrid.tsx
A	admin-portal/vite.config.ts
A	api/src/functions/getKvkRegistryData.ts
A	api/src/version.json
A	booking-portal/api/.gitignore
A	booking-portal/api/DiagnosticTest/function.json
A	booking-portal/api/DiagnosticTest/index.ts
A	booking-portal/api/GetProcessingJob/function.json
A	booking-portal/api/GetProcessingJob/index.ts
A	booking-portal/api/shared/constants.ts
A	booking-portal/api/shared/processingJobSchemas.ts
A	booking-portal/api/shared/rateLimit.ts
A	booking-portal/api/shared/services/BlobStorageService.ts
A	booking-portal/api/shared/services/CosmosDbService.ts
A	booking-portal/api/shared/services/DocumentProcessor.ts
A	booking-portal/api/shared/services/index.ts
A	booking-portal/api/shared/services/ProcessingJobService.ts
A	booking-portal/api/tests/.gitignore
A	booking-portal/api/tests/api-bookings-test.sh
A	booking-portal/api/tests/api-diagnostics-test.sh
A	booking-portal/api/tests/api-upload-test.sh
A	booking-portal/api/tests/api-validation-test.sh
A	booking-portal/api/tests/README.md
A	booking-portal/api/tests/run-all-api-tests.sh
A	booking-portal/api/tests/security-code-validation.sh
A	booking-portal/api/tests/security-validation-test.sh
A	booking-portal/ASYNC_PROCESSING_IMPLEMENTATION.md
A	booking-portal/e2e/bookings-grid-journey-timeline.spec.ts
A	booking-portal/e2e/document-upload-progress.spec.ts
A	booking-portal/e2e/transport-order-validation.spec.ts
A	booking-portal/e2e/WEEK3_UX_TEST_RESULTS.md
A	booking-portal/e2e/week3-ux-improvements.spec.ts
A	booking-portal/playwright.config.ts
A	booking-portal/SECURITY_VALIDATION_REPORT.md
A	booking-portal/TEST_COVERAGE_REPORT.md
A	booking-portal/TEST_SUITE_SUMMARY.md
A	booking-portal/tests/TRANSPORT_ORDER_VALIDATION_TEST_REPORT.md
A	booking-portal/tests/transport-order-validation-test.sh
A	booking-portal/tests/week2-security-fixes-test.sh
A	booking-portal/web/e2e/pdf-viewer-diagnosis.spec.ts
A	booking-portal/web/e2e/screenshots/pdf-viewer-diagnosis.png
A	booking-portal/web/src/components/Breadcrumb.tsx
A	booking-portal/web/src/components/EmptyState.tsx
A	booking-portal/web/src/components/validation/TransportJourneyTimeline.tsx
A	booking-portal/web/src/components/validation/TransportOrderForm.tsx
A	booking-portal/WEEK3_TEST_RESULTS.txt
A	booking-portal/WEEK3_UX_SUMMARY.md
A	database/current_schema.csv
A	database/get_schema.sql
A	database/migrations/013_fix_referential_integrity_v2.sql
A	database/migrations/014_kvk_registry_data.sql
A	database/migrations/archive/012_consolidate_audit_tables.sql
A	database/migrations/archive/013_ensure_legal_entities_exist_FIXED.sql
A	database/migrations/cleanup_unused_party_references.sql
A	database/migrations/drop_unused_tables.sql
A	database/migrations/investigate_integrity.sql
A	database/migrations/INVESTIGATION_QUERIES.sql
A	database/migrations/QUICK_START_GUIDE.md
A	database/migrations/sync_member_identifiers.sql
A	docs/archive/ADMIN_PORTAL_FIXES_2025-10-22.md
A	docs/CTN_DOCUFLOW_COMPREHENSIVE_REVIEW_2025-10-23.md
A	docs/CTN_DOCUFLOW_DEPLOYMENT_SUMMARY_2025-10-24.md
A	docs/CTN_DOCUFLOW_EXECUTIVE_SUMMARY.md
A	docs/database/COSMOS_DB_REVIEW_2025-10-23.md
A	docs/database/COSMOS_DB_REVIEW_SUMMARY.md
A	docs/database/DATABASE_REVIEW_2025-10-22.md
A	docs/IMPLEMENTATION_PLAN.md
D	.github/workflows/SETUP_INSTRUCTIONS.md
D	api/docs/logging.md
D	api/docs/rate-limiting.md
D	api/src/functions/createNewsletter.ts
D	api/src/functions/createSubscription.ts
D	api/src/functions/createTask.ts
D	api/src/functions/getNewsletters.ts
D	api/src/functions/getSubscriptions.ts
D	api/src/functions/getTasks.ts
D	api/src/functions/updateSubscription.ts
D	api/src/functions/updateTask.ts
D	api/tests/ORCHESTRATION_SECURITY_TEST_REPORT.md
D	api/tests/QUICK_START.md
D	api/tests/README.md
D	api/tests/TEST_SUITE_SUMMARY.md
D	booking-portal/api/AddToKnowledgeBase/index.js
D	booking-portal/api/AddToKnowledgeBase/index.js.map
D	booking-portal/api/GetBookingById/index.js
D	booking-portal/api/GetBookingById/index.js.map
D	booking-portal/api/GetBookings/index.js
D	booking-portal/api/GetBookings/index.js.map
D	booking-portal/api/GetDocumentSasUrl/index.js
D	booking-portal/api/GetDocumentSasUrl/index.js.map
D	booking-portal/api/GetTenants/index.js
D	booking-portal/api/GetTenants/index.js.map
D	booking-portal/api/shared/auth.js
D	booking-portal/api/shared/auth.js.map
D	booking-portal/api/shared/claudeExtractor.js
D	booking-portal/api/shared/claudeExtractor.js.map
D	booking-portal/api/shared/dcsaSchemas.js
D	booking-portal/api/shared/dcsaSchemas.js.map
D	booking-portal/api/shared/documentClassifier.js
D	booking-portal/api/shared/documentClassifier.js.map
D	booking-portal/api/shared/knowledgeBase.js
D	booking-portal/api/shared/knowledgeBase.js.map
D	booking-portal/api/shared/multipart.js
D	booking-portal/api/shared/multipart.js.map
D	booking-portal/api/shared/pdfExtractor.js
D	booking-portal/api/shared/pdfExtractor.js.map
D	booking-portal/api/shared/pdfSplitter.js
D	booking-portal/api/shared/pdfSplitter.js.map
D	booking-portal/api/UploadDocument/index.js
D	booking-portal/api/UploadDocument/index.js.map
D	booking-portal/api/ValidateBooking/index.js
D	booking-portal/api/ValidateBooking/index.js.map
D	booking-portal/BUG_REPORT_VALIDATION_PAGE.md
D	booking-portal/docs/database/COSMOS_DB_PERFORMANCE_REVIEW.md
D	booking-portal/docs/database/QUICK_FIX_GUIDE.md
D	booking-portal/IMPLEMENTATION_PLAN.md
D	booking-portal/README.md
D	booking-portal/web/e2e/debug/ANALYSIS_REPORT.md
D	booking-portal/web/package-lock.json
D	ctn-mcp-server/DEPLOYMENT_INFO.md
D	ctn-mcp-server/HOWTO_GUIDE_FOR_DOCS_PORTAL.md
D	ctn-mcp-server/README.md
D	database/DATABASE_SCHEMA_MANAGEMENT.md
D	database/migrations/archive_2025-10-20/010_performance_indexes_README.md
D	database/migrations/archive_2025-10-20/DEPLOYMENT_INSTRUCTIONS.md
D	database/migrations/archive_2025-10-20/README_MIGRATIONS.md
D	database/NEXT_STEPS.md
D	database/README.md
D	database/SCHEMA_REVIEW_2025-10-20.md
D	docs/AIKIDO_KEY_ROTATION.md
D	docs/API_DEPLOYMENT_FIX.md
D	docs/API_VERSIONING_STRATEGY.md
D	docs/APPLICATION_INSIGHTS_SETUP.md
D	docs/archive/AUDIT_TRAIL_IMPLEMENTATION_SUMMARY.md
D	docs/archive/AUTONOMOUS_WORK_SESSION_SUMMARY.md
D	docs/archive/BUG-008-IMPLEMENTATION-SUMMARY.md
D	docs/archive/IDENTIFIER_CRUD_IMPLEMENTATION_COMPLETE.md
D	docs/archive/IMPLEMENTATION_COMPLETE.md
D	docs/archive/SESSION_SUMMARY_2025-10-13.md
D	docs/archive/SESSION_SUMMARY_2025-10-16_AUTONOMOUS_BUG_FIXES.md
D	docs/archive/SESSION_SUMMARY_20251016_quality_scan_analysis.md
D	docs/archive/URGENT_ADD_KVK_TO_CONTARGO.md
D	docs/archive/URGENT_PRODUCTION_DIAGNOSTIC_REPORT.md
D	docs/AUTH_FIX_INSTRUCTIONS.md
D	docs/backend-requirements/IDENTIFIER_VERIFICATION_API.md
D	docs/BDI_INTEGRATION.md
D	docs/BIOME_CONTINUEONERROR_EXPLAINED.md
D	docs/BOOKING_PORTAL_PIPELINE_FIXES_2025-10-20.md
D	docs/bugs/BUG_FIX_REPORT_2025-10-15.md
D	docs/bugs/BUG_REPORT_IDENTIFIER_ISSUE.md
D	docs/bugs/IDENTIFIER_CRUD_BUG_FIX_REPORT.md
D	docs/CODE_QUALITY_SUMMARY.md
D	docs/CRITICAL_SECURITY_FIXES_COMPLETED.md
D	docs/DEPLOYMENT_ARCHITECTURE_BOOKING_PORTAL.md
D	docs/DEPLOYMENT_GUIDE.md
D	docs/DOCUMENTATION_UPDATE_2025-10-21.md
D	docs/HEALTH_MONITORING.md
D	docs/KVK_DOCUMENT_VERIFICATION_FEATURE.md
D	docs/LOGGING_GUIDE.md
D	docs/MIGRATION_SESSION_2025-10-20.md
D	docs/migrations/v1-to-v2-example.md
D	docs/ORCHESTRATION_API_IMPLEMENTATION_PLAN.md
D	docs/orchestrator-portal-security.md
D	docs/PORTAL_STATUS_REPORT.md
D	docs/PRODUCTION_READINESS_CHECKLIST.md
D	docs/QUICK_DIAGNOSTIC_GUIDE.md
D	docs/RELEASE_INSTRUCTIONS.md
D	docs/SECRET_ROTATION_GUIDE.md
D	docs/SECURITY_AUDIT_REPORT.md
D	docs/SECURITY_ROTATION_REQUIRED.md
D	docs/SESSION_SUMMARY_2025-10-18_SECURITY_AND_ORCHESTRATION.md
D	docs/SESSION_SUMMARY_2025-10-20.md
D	docs/STABLE_RELEASE_INFO.md
D	docs/TELEMETRY_IMPLEMENTATION_SUMMARY.md
D	docs/TELEMETRY_QUICK_REFERENCE.md
D	docs/testing/AZURE_DEVOPS_TEST_CASES.md
D	docs/testing/CI_CD_INTEGRATION.md
D	docs/testing/IDENTIFIER_ENDPOINTS_TEST_REPORT.md
D	docs/testing/PLAYWRIGHT_SETUP.md
D	docs/testing/PLAYWRIGHT_SUCCESS.md
D	docs/testing/PRODUCTION_TEST_REPORT.md
D	docs/testing/TEST_EXECUTION_REPORT.md
D	docs/testing/TEST_EXECUTION_SUMMARY.md
D	docs/testing/TEST_QUICK_START.md
D	docs/testing/TEST_REPORT_KVK_VERIFICATION.md
D	docs/testing/TEST_REPORT_SECURITY_HEADERS.md
D	docs/VITE_CONFIG_CENTRALIZATION.md
D	infrastructure/bicep/README.md
D	infrastructure/logic-apps/README.md
D	infrastructure/readme.md
D	orchestrator-portal/docs/ARCHITECTURE.md
D	orchestrator-portal/docs/archive/ROADMAP_UPDATES.md
D	orchestrator-portal/docs/archive/TONIGHT_SUMMARY.md
D	orchestrator-portal/docs/testing/PORTAL_TESTING_REPORT.md
D	orchestrator-portal/docs/testing/TEST_REPORT.md
D	orchestrator-portal/docs/testing/TESTING_SUMMARY.md
D	orchestrator-portal/e2e/README.md
D	orchestrator-portal/mock-api/API_SPECIFICATION.md
D	orchestrator-portal/mock-api/INTEGRATION_EXAMPLES.md
D	orchestrator-portal/mock-api/QUICKSTART.md
D	orchestrator-portal/mock-api/README.md
D	orchestrator-portal/README.md
D	packages/api-client/IMPLEMENTATION_SUMMARY.md
D	packages/api-client/README.md
D	packages/api-client/USAGE_EXAMPLES.md
D	portal/README.md
D	portal/web/e2e/MEMBER_PORTAL_BUG_REPORT.md
D	portal/web/e2e/MEMBER_PORTAL_TEST_DELIVERABLES.md
D	portal/web/e2e/MEMBER_PORTAL_TEST_RESULTS.md
D	portal/web/e2e/README.md
D	portal/web/e2e/VITE_MIGRATION_TEST_RESULTS.md
D	shared/vite-config-base/README.md
D	web/diagnostic-01-entity-loaded.png
D	web/diagnostic-02-before-add.png
D	web/diagnostic-03-dialog-open.png
D	web/diagnostic-error-no-add-button.png
D	web/docs/LOKALISE_INTEGRATION.md
D	web/e2e/MFA_WORKAROUND.md
D	web/e2e/QUICK_START.md
D	web/e2e/README.md
D	web/package-lock.json
D	web/README.md
D	web/src/components/SubscriptionsGrid.tsx
D	web/src/components/TasksGrid.tsx
D	web/src/react-dom-server-stub.js
D	web/test-identifier-api.js
D	web/vite.config.ts
M	.azure-pipelines/admin-portal.yml
M	.azure-pipelines/member-portal.yml
M	.azure-pipelines/playwright-tests.yml
M	.github/workflows/playwright-tests.yml
M	.gitignore
M	api/package.json
M	api/src/essential-index.ts
M	api/src/functions/getEndpointsByEntity.ts
M	api/src/functions/GetLegalEntity.ts
M	api/src/functions/uploadKvkDocument.ts
M	api/src/services/kvkService.ts
M	booking-portal/api/GetBookingById/index.ts
M	booking-portal/api/GetBookings/index.ts
M	booking-portal/api/GetDocumentSasUrl/index.ts
M	booking-portal/api/host.json
M	booking-portal/api/package.json
M	booking-portal/api/shared/auth.ts
M	booking-portal/api/shared/claudeExtractor.ts
M	booking-portal/api/shared/dcsaSchemas.ts
M	booking-portal/api/shared/documentClassifier.ts
M	booking-portal/api/shared/pdfExtractor.ts
M	booking-portal/api/tsconfig.json
M	booking-portal/api/UploadDocument/function.json
M	booking-portal/api/UploadDocument/index.ts
M	booking-portal/api/ValidateBooking/function.json
M	booking-portal/api/ValidateBooking/index.ts
M	booking-portal/azure-pipelines.yml
M	booking-portal/web/index.html
M	booking-portal/web/package.json
M	booking-portal/web/src/auth/ProtectedRoute.tsx
M	booking-portal/web/src/components/auth/LoginPage.tsx
M	booking-portal/web/src/components/Header.tsx
M	booking-portal/web/src/main.tsx
M	booking-portal/web/src/pages/Bookings.tsx
M	booking-portal/web/src/pages/Dashboard.tsx
M	booking-portal/web/src/pages/Upload.tsx
M	booking-portal/web/src/pages/Validation.tsx
M	booking-portal/web/src/styles/index.css
M	CLAUDE.md
M	ctn-docs-portal
M	database/get_indexes.sql
M	docs/COMPLETED_ACTIONS.md
M	package-lock.json
M	package.json
M	README.md
R090	web/src/components/MemberDetailView.tsx	admin-portal/src/components/MemberDetailView.tsx
R091	portal/src/components/NotFound.tsx	member-portal/src/components/NotFound.tsx
R091	web/src/components/About.css	admin-portal/src/components/About.css
R093	web/src/components/About.tsx	admin-portal/src/components/About.tsx
R097	web/src/services/apiV2.ts	admin-portal/src/services/apiV2.ts
R098	portal/package.json	member-portal/package.json
R098	web/package.json	admin-portal/package.json
R098	web/src/components/icons.tsx	admin-portal/src/components/icons.tsx
R099	portal/src/App.tsx	member-portal/src/App.tsx
R100	"web/.\\90f32498-5b71-4100-8774-f3ed70ed0a20-app.zip"	"admin-portal/.\\90f32498-5b71-4100-8774-f3ed70ed0a20-app.zip"
R100	"web/.\\e4e6be2f-4298-4549-a6ec-04ae788be7c9-app.zip"	"admin-portal/.\\e4e6be2f-4298-4549-a6ec-04ae788be7c9-app.zip"
R100	database/current_schema.sql	database/create_schema.sql
R100	database/migrations/archive_2025-10-20/001-enhanced-schema.sql	database/migrations/archive/001-enhanced-schema.sql
R100	database/migrations/archive_2025-10-20/002_add_contact_fields.sql	database/migrations/archive/002_add_contact_fields.sql
R100	database/migrations/archive_2025-10-20/003_link_members_to_legal_entities.sql	database/migrations/archive/003_link_members_to_legal_entities.sql
R100	database/migrations/archive_2025-10-20/004-migrate-members-data.sql	database/migrations/archive/004-migrate-members-data.sql
R100	database/migrations/archive_2025-10-20/007_kvk_verification.sql	database/migrations/archive/007_kvk_verification.sql
R100	database/migrations/archive_2025-10-20/008_admin_portal_expansion.sql	database/migrations/archive/008_admin_portal_expansion.sql
R100	database/migrations/archive_2025-10-20/009_create_audit_log_table.sql	database/migrations/archive/009_create_audit_log_table.sql
R100	database/migrations/archive_2025-10-20/010_performance_indexes.sql	database/migrations/archive/010_performance_indexes.sql
R100	database/migrations/archive_2025-10-20/011_bdi_orchestration_support.sql	database/migrations/archive/011_bdi_orchestration_support.sql
R100	database/migrations/archive_2025-10-20/012_international_registry_support.sql	database/migrations/archive/012_international_registry_support.sql
R100	database/migrations/archive_2025-10-20/013_ensure_legal_entities_exist_FIXED.sql	database/migrations/013_fix_referential_integrity.sql
R100	database/migrations/archive_2025-10-20/013_ensure_legal_entities_exist.sql	database/migrations/archive/013_ensure_legal_entities_exist.sql
R100	database/migrations/archive_2025-10-20/014_fix_members_without_legal_entity_id.sql	database/migrations/archive/014_fix_members_without_legal_entity_id.sql
R100	database/migrations/archive_2025-10-20/014_standardize_timestamp_types_DO_NOT_USE.sql	database/migrations/archive/014_standardize_timestamp_types_DO_NOT_USE.sql
R100	database/migrations/archive_2025-10-20/015_add_azure_ad_object_id.sql	database/migrations/archive/015_add_azure_ad_object_id.sql
R100	database/migrations/archive_2025-10-20/016_standardize_timestamp_types_FIXED.sql	database/migrations/archive/016_standardize_timestamp_types_FIXED.sql
R100	database/migrations/archive_2025-10-20/check_migration_014_status.sql	database/migrations/archive/check_migration_014_status.sql
R100	database/migrations/archive_2025-10-20/check_table_columns.sql	database/migrations/archive/check_table_columns.sql
R100	database/migrations/archive_2025-10-20/verify_015_migration.sql	database/migrations/archive/verify_015_migration.sql
R100	database/schema_indexes.csv	database/migrations/schema_indexes.csv
R100	portal/.env.example	member-portal/.env.example
R100	portal/.env.production	member-portal/.env.production
R100	portal/.env.production.template	member-portal/.env.production.template
R100	portal/.gitignore	admin-portal/.gitignore
R100	portal/aikido.config.js	admin-portal/aikido.config.js
R100	portal/api/tests/api-smoke-test.sh	member-portal/api/tests/api-smoke-test.sh
R100	portal/api/tests/member-portal-api-tests.sh	member-portal/api/tests/member-portal-api-tests.sh
R100	portal/biome.json	admin-portal/biome.json
R100	portal/e2e/security-headers.spec.ts	member-portal/e2e/security-headers.spec.ts
R100	portal/index.html	member-portal/index.html
R100	portal/package-lock.json	member-portal/package-lock.json
R100	portal/playwright.config.ts	member-portal/playwright.config.ts
R100	portal/public/assets/logos/contargo.png	admin-portal/public/assets/logos/contargo.png
R100	portal/public/assets/logos/ctn small.png	admin-portal/public/assets/logos/ctn small.png
R100	portal/public/assets/logos/ctn.png	admin-portal/public/assets/logos/ctn.png
R100	portal/public/assets/logos/DIL.png	admin-portal/public/assets/logos/DIL.png
R100	portal/public/assets/logos/Inland Terminals Group.png	admin-portal/public/assets/logos/Inland Terminals Group.png
R100	portal/public/assets/logos/portbase.png	admin-portal/public/assets/logos/portbase.png
R100	portal/public/assets/logos/VanBerkel.png	admin-portal/public/assets/logos/VanBerkel.png
R100	portal/public/favicon.ico	admin-portal/public/favicon.ico
R100	portal/public/logo192.png	member-portal/public/logo192.png
R100	portal/public/logo512.png	admin-portal/public/logo512.png
R100	portal/public/staticwebapp.config.json	admin-portal/public/staticwebapp.config.json
R100	portal/reports/.gitignore	admin-portal/reports/.gitignore
R100	portal/reports/.gitkeep	admin-portal/reports/.gitkeep
R100	portal/src/App.css	member-portal/src/App.css
R100	portal/src/auth/authConfig.ts	member-portal/src/auth/authConfig.ts
R100	portal/src/components/ContactsView.tsx	member-portal/src/components/ContactsView.tsx
R100	portal/src/components/Dashboard.tsx	member-portal/src/components/Dashboard.tsx
R100	portal/src/components/Endpoints.tsx	member-portal/src/components/Endpoints.tsx
R100	portal/src/components/EndpointsView.tsx	member-portal/src/components/EndpointsView.tsx
R100	portal/src/components/LanguageSwitcher.css	member-portal/src/components/LanguageSwitcher.css
R100	portal/src/components/LanguageSwitcher.tsx	admin-portal/src/components/LanguageSwitcher.tsx
R100	portal/src/components/ProfileView.tsx	member-portal/src/components/ProfileView.tsx
R100	portal/src/components/Support.tsx	member-portal/src/components/Support.tsx
R100	portal/src/components/Tokens.tsx	member-portal/src/components/Tokens.tsx
R100	portal/src/components/TokensView.tsx	member-portal/src/components/TokensView.tsx
R100	portal/src/i18n.ts	member-portal/src/i18n.ts
R100	portal/src/index.css	member-portal/src/index.css
R100	portal/src/index.tsx	member-portal/src/index.tsx
R100	portal/src/kendoLicense.ts	member-portal/src/kendoLicense.ts
R100	portal/src/locales/de/translation.json	admin-portal/src/locales/de/translation.json
R100	portal/src/locales/en/translation.json	admin-portal/src/locales/en/translation.json
R100	portal/src/locales/nl/translation.json	admin-portal/src/locales/nl/translation.json
R100	portal/src/react-app-env.d.ts	admin-portal/src/react-app-env.d.ts
R100	portal/src/services/apiClient.ts	member-portal/src/services/apiClient.ts
R100	portal/src/types.ts	member-portal/src/types.ts
R100	portal/src/vite-env.d.ts	admin-portal/src/vite-env.d.ts
R100	portal/tsconfig.json	admin-portal/tsconfig.json
R100	portal/vite.config.ts	member-portal/vite.config.ts
R100	portal/web/e2e/member-portal.spec.ts	member-portal/web/e2e/member-portal.spec.ts
R100	portal/web/e2e/vite-migration/admin-portal.spec.ts	member-portal/web/e2e/vite-migration/admin-portal.spec.ts
R100	portal/web/e2e/vite-migration/member-portal.spec.ts	member-portal/web/e2e/vite-migration/member-portal.spec.ts
R100	web/.env.example	admin-portal/.env.example
R100	web/.env.production	admin-portal/.env.production
R100	web/.env.production.template	admin-portal/.env.production.template
R100	web/.env.template	admin-portal/.env.template
R100	web/.gitignore	member-portal/.gitignore
R100	web/.pipeline-test	admin-portal/.pipeline-test
R100	web/aikido.config.js	member-portal/aikido.config.js
R100	web/biome.json	member-portal/biome.json
R100	web/e2e/admin-portal-improved.spec.ts	admin-portal/e2e/admin-portal-improved.spec.ts
R100	web/e2e/admin-portal.spec.ts	admin-portal/e2e/admin-portal.spec.ts
R100	web/e2e/admin-portal/accessibility.spec.ts	admin-portal/e2e/admin-portal/accessibility.spec.ts
R100	web/e2e/admin-portal/authentication.spec.ts	admin-portal/e2e/admin-portal/authentication.spec.ts
R100	web/e2e/admin-portal/bug-investigation-identifier-404.spec.ts	admin-portal/e2e/admin-portal/bug-investigation-identifier-404.spec.ts
R100	web/e2e/admin-portal/grid-pagination.spec.ts	admin-portal/e2e/admin-portal/grid-pagination.spec.ts
R100	web/e2e/admin-portal/identifier-workflow-production.spec.ts	admin-portal/e2e/admin-portal/identifier-workflow-production.spec.ts
R100	web/e2e/admin-portal/identifier-workflow-simple.spec.ts	admin-portal/e2e/admin-portal/identifier-workflow-simple.spec.ts
R100	web/e2e/admin-portal/identifiers-crud.spec.ts	admin-portal/e2e/admin-portal/identifiers-crud.spec.ts
R100	web/e2e/admin-portal/identifiers-manager.spec.ts	admin-portal/e2e/admin-portal/identifiers-manager.spec.ts
R100	web/e2e/admin-portal/managers-crud.spec.ts	admin-portal/e2e/admin-portal/managers-crud.spec.ts
R100	web/e2e/admin-portal/member-management.spec.ts	admin-portal/e2e/admin-portal/member-management.spec.ts
R100	web/e2e/auth.setup.ts	admin-portal/e2e/auth.setup.ts
R100	web/e2e/bug-investigation/contargo-kvk-visibility-check.spec.ts	admin-portal/e2e/bug-investigation/contargo-kvk-visibility-check.spec.ts
R100	web/e2e/debug-identifier-500.spec.ts	admin-portal/e2e/debug-identifier-500.spec.ts
R100	web/e2e/help-system.spec.ts	admin-portal/e2e/help-system.spec.ts
R100	web/e2e/kvk-verification.spec.ts	admin-portal/e2e/kvk-verification.spec.ts
R100	web/e2e/portal-smoke-test.spec.ts	admin-portal/e2e/portal-smoke-test.spec.ts
R100	web/e2e/progressive-disclosure.spec.ts	admin-portal/e2e/progressive-disclosure.spec.ts
R100	web/e2e/quick-test.spec.ts	admin-portal/e2e/quick-test.spec.ts
R100	web/e2e/security-headers.spec.ts	admin-portal/e2e/security-headers.spec.ts
R100	web/e2e/urgent-production-diagnostic.spec.ts	admin-portal/e2e/urgent-production-diagnostic.spec.ts
R100	web/e2e/urgent/add-kvk-95944192-fixed.spec.ts	admin-portal/e2e/urgent/add-kvk-95944192-fixed.spec.ts
R100	web/e2e/urgent/add-kvk-to-contargo.spec.ts	admin-portal/e2e/urgent/add-kvk-to-contargo.spec.ts
R100	web/e2e/urgent/contargo-kvk-simple.spec.ts	admin-portal/e2e/urgent/contargo-kvk-simple.spec.ts
R100	web/index.html	admin-portal/index.html
R100	web/install-kendo-form.sh	admin-portal/install-kendo-form.sh
R100	web/install-kendo.sh	admin-portal/install-kendo.sh
R100	web/install-notifications.sh	admin-portal/install-notifications.sh
R100	web/kendo-ui-license.txt	admin-portal/kendo-ui-license.txt
R100	web/playwright.config.ts	admin-portal/playwright.config.ts
R100	web/playwright/fixtures.ts	admin-portal/playwright/fixtures.ts
R100	web/playwright/global-setup.ts	admin-portal/playwright/global-setup.ts
R100	web/public/assets/logos/contargo.png	member-portal/public/assets/logos/contargo.png
R100	web/public/assets/logos/ctn small.png	member-portal/public/assets/logos/ctn small.png
R100	web/public/assets/logos/ctn.png	member-portal/public/assets/logos/ctn.png
R100	web/public/assets/logos/DIL.png	member-portal/public/assets/logos/DIL.png
R100	web/public/assets/logos/Inland Terminals Group.png	member-portal/public/assets/logos/Inland Terminals Group.png
R100	web/public/assets/logos/portbase.png	member-portal/public/assets/logos/portbase.png
R100	web/public/assets/logos/VanBerkel.png	member-portal/public/assets/logos/VanBerkel.png
R100	web/public/favicon.ico	member-portal/public/favicon.ico
R100	web/public/logo192.png	admin-portal/public/logo192.png
R100	web/public/logo512.png	member-portal/public/logo512.png
R100	web/public/manifest.json	admin-portal/public/manifest.json
R100	web/public/robots.txt	admin-portal/public/robots.txt
R100	web/public/staticwebapp.config.json	member-portal/public/staticwebapp.config.json
R100	web/public/version.json	admin-portal/public/version.json
R100	web/reports/.gitignore	member-portal/reports/.gitignore
R100	web/reports/.gitkeep	member-portal/reports/.gitkeep
R100	web/scripts/add-kvk-to-contargo.js	admin-portal/scripts/add-kvk-to-contargo.js
R100	web/scripts/capture-auth-auto.js	admin-portal/scripts/capture-auth-auto.js
R100	web/scripts/capture-auth-final.js	admin-portal/scripts/capture-auth-final.js
R100	web/scripts/capture-auth-manual.js	admin-portal/scripts/capture-auth-manual.js
R100	web/src/App.css	admin-portal/src/App.css
R100	web/src/App.test.tsx	admin-portal/src/App.test.tsx
R100	web/src/App.tsx	admin-portal/src/App.tsx
R100	web/src/auth/authConfig.ts	admin-portal/src/auth/authConfig.ts
R100	web/src/auth/AuthContext.tsx	admin-portal/src/auth/AuthContext.tsx
R100	web/src/auth/ProtectedRoute.tsx	admin-portal/src/auth/ProtectedRoute.tsx
R100	web/src/components/AdminPortal.css	admin-portal/src/components/AdminPortal.css
R100	web/src/components/AdminPortal.tsx	admin-portal/src/components/AdminPortal.tsx
R100	web/src/components/AdminSidebar.css	admin-portal/src/components/AdminSidebar.css
R100	web/src/components/AdminSidebar.tsx	admin-portal/src/components/AdminSidebar.tsx
R100	web/src/components/AdvancedFilter.css	admin-portal/src/components/AdvancedFilter.css
R100	web/src/components/AdvancedFilter.tsx	admin-portal/src/components/AdvancedFilter.tsx
R100	web/src/components/audit/AuditLogViewer.css	admin-portal/src/components/audit/AuditLogViewer.css
R100	web/src/components/audit/AuditLogViewer.tsx	admin-portal/src/components/audit/AuditLogViewer.tsx
R100	web/src/components/auth/LoginPage.css	admin-portal/src/components/auth/LoginPage.css
R100	web/src/components/auth/LoginPage.tsx	admin-portal/src/components/auth/LoginPage.tsx
R100	web/src/components/auth/MFARequired.css	admin-portal/src/components/auth/MFARequired.css
R100	web/src/components/auth/MFARequired.tsx	admin-portal/src/components/auth/MFARequired.tsx
R100	web/src/components/auth/Unauthorized.css	admin-portal/src/components/auth/Unauthorized.css
R100	web/src/components/auth/Unauthorized.tsx	admin-portal/src/components/auth/Unauthorized.tsx
R100	web/src/components/ComingSoonPlaceholder.tsx	admin-portal/src/components/ComingSoonPlaceholder.tsx
R100	web/src/components/CompanyDetails.css	admin-portal/src/components/CompanyDetails.css
R100	web/src/components/CompanyDetails.tsx	admin-portal/src/components/CompanyDetails.tsx
R100	web/src/components/CompanyForm.css	admin-portal/src/components/CompanyForm.css
R100	web/src/components/CompanyForm.tsx	admin-portal/src/components/CompanyForm.tsx
R100	web/src/components/ConfirmDialog.css	admin-portal/src/components/ConfirmDialog.css
R100	web/src/components/ConfirmDialog.tsx	admin-portal/src/components/ConfirmDialog.tsx
R100	web/src/components/ContactForm.css	admin-portal/src/components/ContactForm.css
R100	web/src/components/ContactForm.tsx	admin-portal/src/components/ContactForm.tsx
R100	web/src/components/ContactsManager.css	admin-portal/src/components/ContactsManager.css
R100	web/src/components/ContactsManager.tsx	admin-portal/src/components/ContactsManager.tsx
R100	web/src/components/Dashboard.css	admin-portal/src/components/Dashboard.css
R100	web/src/components/Dashboard.tsx	admin-portal/src/components/Dashboard.tsx
R100	web/src/components/EmptyState.css	admin-portal/src/components/EmptyState.css
R100	web/src/components/EmptyState.tsx	admin-portal/src/components/EmptyState.tsx
R100	web/src/components/EndpointManagement.css	admin-portal/src/components/EndpointManagement.css
R100	web/src/components/EndpointManagement.tsx	admin-portal/src/components/EndpointManagement.tsx
R100	web/src/components/ErrorBoundary.css	admin-portal/src/components/ErrorBoundary.css
R100	web/src/components/ErrorBoundary.tsx	admin-portal/src/components/ErrorBoundary.tsx
R100	web/src/components/ExampleUsage.tsx	admin-portal/src/components/ExampleUsage.tsx
R100	web/src/components/forms/ConditionalField.tsx	admin-portal/src/components/forms/ConditionalField.tsx
R100	web/src/components/forms/ProgressiveSection.tsx	admin-portal/src/components/forms/ProgressiveSection.tsx
R100	web/src/components/forms/StepperForm.tsx	admin-portal/src/components/forms/StepperForm.tsx
R100	web/src/components/HealthDashboard.css	admin-portal/src/components/HealthDashboard.css
R100	web/src/components/HealthDashboard.tsx	admin-portal/src/components/HealthDashboard.tsx
R100	web/src/components/help/FieldHelp.tsx	admin-portal/src/components/help/FieldHelp.tsx
R100	web/src/components/help/FieldLabel.tsx	admin-portal/src/components/help/FieldLabel.tsx
R100	web/src/components/help/help.css	admin-portal/src/components/help/help.css
R100	web/src/components/help/HelpPanel.tsx	admin-portal/src/components/help/HelpPanel.tsx
R100	web/src/components/help/HelpTooltip.tsx	admin-portal/src/components/help/HelpTooltip.tsx
R100	web/src/components/help/index.ts	admin-portal/src/components/help/index.ts
R100	web/src/components/IdentifiersManager.css	admin-portal/src/components/IdentifiersManager.css
R100	web/src/components/IdentifiersManager.tsx	admin-portal/src/components/IdentifiersManager.tsx
R100	web/src/components/IdentifierVerificationManager.css	admin-portal/src/components/IdentifierVerificationManager.css
R100	web/src/components/IdentifierVerificationManager.tsx	admin-portal/src/components/IdentifierVerificationManager.tsx
R100	web/src/components/KvkDocumentUpload.tsx	admin-portal/src/components/KvkDocumentUpload.tsx
R100	web/src/components/KvkReviewQueue.tsx	admin-portal/src/components/KvkReviewQueue.tsx
R100	web/src/components/LanguageSwitcher.css	admin-portal/src/components/LanguageSwitcher.css
R100	web/src/components/LanguageSwitcher.tsx	member-portal/src/components/LanguageSwitcher.tsx
R100	web/src/components/LoadingSpinner.css	admin-portal/src/components/LoadingSpinner.css
R100	web/src/components/LoadingSpinner.tsx	admin-portal/src/components/LoadingSpinner.tsx
R100	web/src/components/MemberDetailDialog.css	admin-portal/src/components/MemberDetailDialog.css
R100	web/src/components/MemberDetailDialog.tsx	admin-portal/src/components/MemberDetailDialog.tsx
R100	web/src/components/MemberDetailView.css	admin-portal/src/components/MemberDetailView.css
R100	web/src/components/MemberForm.css	admin-portal/src/components/MemberForm.css
R100	web/src/components/MemberForm.tsx	admin-portal/src/components/MemberForm.tsx
R100	web/src/components/MembersGrid.css	admin-portal/src/components/MembersGrid.css
R100	web/src/components/MembersGrid.tsx	admin-portal/src/components/MembersGrid.tsx
R100	web/src/components/NewslettersGrid.css	admin-portal/src/components/NewslettersGrid.css
R100	web/src/components/NewslettersGrid.tsx	admin-portal/src/components/NewslettersGrid.tsx
R100	web/src/components/NotFound.css	admin-portal/src/components/NotFound.css
R100	web/src/components/NotFound.tsx	admin-portal/src/components/NotFound.tsx
R100	web/src/components/ProgressIndicator.css	admin-portal/src/components/ProgressIndicator.css
R100	web/src/components/ProgressIndicator.tsx	admin-portal/src/components/ProgressIndicator.tsx
R100	web/src/components/ReviewTasks.tsx	admin-portal/src/components/ReviewTasks.tsx
R100	web/src/components/Settings.css	admin-portal/src/components/Settings.css
R100	web/src/components/Settings.tsx	admin-portal/src/components/Settings.tsx
R100	web/src/components/SubscriptionsGrid.css	admin-portal/src/components/SubscriptionsGrid.css
R100	web/src/components/TasksGrid.css	admin-portal/src/components/TasksGrid.css
R100	web/src/components/TokensManager.css	admin-portal/src/components/TokensManager.css
R100	web/src/components/TokensManager.tsx	admin-portal/src/components/TokensManager.tsx
R100	web/src/components/users/EditUserDialog.tsx	admin-portal/src/components/users/EditUserDialog.tsx
R100	web/src/components/users/InviteUserDialog.tsx	admin-portal/src/components/users/InviteUserDialog.tsx
R100	web/src/components/users/UserManagement.css	admin-portal/src/components/users/UserManagement.css
R100	web/src/components/users/UserManagement.tsx	admin-portal/src/components/users/UserManagement.tsx
R100	web/src/config/helpContent.ts	admin-portal/src/config/helpContent.ts
R100	web/src/contexts/NotificationContext.tsx	admin-portal/src/contexts/NotificationContext.tsx
R100	web/src/hooks/useAsync.ts	admin-portal/src/hooks/useAsync.ts
R100	web/src/hooks/useGridState.ts	admin-portal/src/hooks/useGridState.ts
R100	web/src/i18n.ts	admin-portal/src/i18n.ts
R100	web/src/index.css	admin-portal/src/index.css
R100	web/src/index.tsx	admin-portal/src/index.tsx
R100	web/src/kendoLicense.ts	admin-portal/src/kendoLicense.ts
R100	web/src/locales/de/translation.json	member-portal/src/locales/de/translation.json
R100	web/src/locales/en/translation.json	member-portal/src/locales/en/translation.json
R100	web/src/locales/nl/translation.json	member-portal/src/locales/nl/translation.json
R100	web/src/logo.svg	admin-portal/src/logo.svg
R100	web/src/pages/MemberRegistrationWizard.css	admin-portal/src/pages/MemberRegistrationWizard.css
R100	web/src/pages/MemberRegistrationWizard.tsx	admin-portal/src/pages/MemberRegistrationWizard.tsx
R100	web/src/react-app-env.d.ts	member-portal/src/react-app-env.d.ts
R100	web/src/reportWebVitals.ts	admin-portal/src/reportWebVitals.ts
R100	web/src/services/api.ts	admin-portal/src/services/api.ts
R100	web/src/services/apiClient.ts	admin-portal/src/services/apiClient.ts
R100	web/src/services/auditLogService.ts	admin-portal/src/services/auditLogService.ts
R100	web/src/setupTests.ts	admin-portal/src/setupTests.ts
R100	web/src/styles/progressive-forms.css	admin-portal/src/styles/progressive-forms.css
R100	web/src/utils/dateUtils.ts	admin-portal/src/utils/dateUtils.ts
R100	web/src/utils/exportUtils.ts	admin-portal/src/utils/exportUtils.ts
R100	web/src/utils/genericExportUtils.ts	admin-portal/src/utils/genericExportUtils.ts
R100	web/src/utils/validation.ts	admin-portal/src/utils/validation.ts
R100	web/src/vite-env.d.ts	member-portal/src/vite-env.d.ts
R100	web/tsconfig.json	member-portal/tsconfig.json
```

## Risk Assessment
- 🟢 **LOW RISK** - Isolated security middleware
- Adds rate limiting to prevent DoS attacks
- Minimal code changes, well-isolated
- Recommendation: HIGH VALUE for production - Safe to merge

---

# Comprehensive Merge Strategy

## 🚨 DO NOT DO - Full Branch Merges

**NEVER run these commands:**
```bash
# ❌ DANGEROUS - Will overwrite tonight's fixes
git merge feature/week2-high-priority-fixes
git merge feature/week3-ux-improvements
git merge feature/week4-ux-improvements
```

**Why?** These branches contain old versions of:
- `api/src/functions/uploadKvkDocument.ts` (without audit_logs try-catch)
- `admin-portal/src/components/KvkDocumentUpload.tsx` (without last verified date)

---

## ✅ RECOMMENDED - Surgical Cherry-Pick Strategy

### Phase 1: Safe Booking Portal Improvements (LOW RISK)

**From feature/booking-portal-security-fixes:**
```bash
# Cherry-pick security fixes (safe - isolated to booking portal)
git cherry-pick 0c5754b  # Critical security fixes
git cherry-pick fe29627  # Quality validation
git cherry-pick b22d11f  # Multi-leg journey support
git cherry-pick ad53f93  # UI/UX improvements
```

**From feature/async-document-processing:**
```bash
# All commits safe - fixes Claude timeout issue
git cherry-pick bbc6603  # Async document processing
git cherry-pick f0b9387  # Documentation
```

**From feature/rate-limiting:**
```bash
# Safe - DoS protection middleware
git cherry-pick e22b4ec  # Rate limiting implementation
git cherry-pick 91fea02  # CORS configuration
```

### Phase 2: Booking Portal UX (MEDIUM RISK)

**From feature/week4-ux-improvements:**
```bash
# Week 4 improvements (verify each before cherry-picking)
git cherry-pick 18d660f  # Week 4 UX improvements
git cherry-pick cd45f69  # Form validation indicators
git cherry-pick bff3b10  # Confidence score component
```

### Phase 3: SKIP - Conflicts with Main

**DO NOT Cherry-Pick from Week 2/3:**
- Skip ALL commits touching `uploadKvkDocument.ts`
- Skip ALL commits touching `KvkDocumentUpload.tsx`
- Skip ALL commits touching `getEndpointsByEntity.ts`

These files were just fixed tonight and cherry-picking will create conflicts.

---

## Alternative: Feature-by-Feature Reimplementation

Instead of cherry-picking, consider:

1. **Review the branch analysis document**
2. **Identify valuable features** (multi-leg journeys, async processing, etc.)
3. **Re-implement clean** on current main
4. **Test immediately** after each feature

This is safer than trying to resolve 59+ commits worth of conflicts.

---

# Quick Decision Matrix

| Branch | Commits | Risk Level | Value | Recommendation |
|--------|---------|------------|-------|----------------|
| week2-high-priority-fixes | 59 | 🔴 CRITICAL | High | Skip KvK changes, cherry-pick booking portal only |
| week3-ux-improvements | 10 | 🟡 MEDIUM-HIGH | Medium | Review after week2 resolution |
| week4-ux-improvements | 10 | 🟡 MEDIUM | High | Cherry-pick booking portal UX features |
| booking-portal-security-fixes | 11 | 🟢 LOW-MEDIUM | Very High | Cherry-pick all security fixes |
| async-document-processing | 3 | 🟢 LOW | Very High | Cherry-pick all (fixes critical timeout) |
| rate-limiting | 2 | 🟢 LOW | High | Cherry-pick all (DoS protection) |

## Priority Order for Cherry-Picking

**1. High Value, Low Risk (Do First):**
- ✅ feature/async-document-processing (fixes Claude timeout)
- ✅ feature/rate-limiting (security)
- ✅ feature/booking-portal-security-fixes (security)

**2. Medium Value, Medium Risk (Review Carefully):**
- ⚠️ feature/week4-ux-improvements (UX improvements)

**3. High Risk, Do NOT Merge:**
- ❌ feature/week2-high-priority-fixes (conflicts with tonight's fixes)
- ❌ feature/week3-ux-improvements (inherits week2 conflicts)

---

# Specific File Conflicts to Watch

## Critical Files Modified by Multiple Branches

### api/src/functions/uploadKvkDocument.ts
- **Modified by:** week2, week3
- **Main version:** Has try-catch around audit_logs (commit 45a7b08)
- **Branch versions:** Missing try-catch
- **Action:** DO NOT merge any commits touching this file

### admin-portal/src/components/KvkDocumentUpload.tsx  
- **Modified by:** week2, week3
- **Main version:** Shows last verified date (commit 45a7b08)
- **Branch versions:** Missing last verified date
- **Action:** DO NOT merge any commits touching this file

### admin-portal/src/components/MemberDetailView.tsx
- **Modified by:** week2
- **Main version:** getEndpoints wrapped in try-catch (commit ac8c14d)
- **Branch versions:** Not wrapped
- **Action:** DO NOT merge any commits touching this file

---

# Safe Files (No Conflicts)

These files can be safely cherry-picked:

## Booking Portal Only
- `booking-portal/web/**` (all UX improvements safe)
- `booking-portal/api/**` (security fixes, async processing)
- `booking-portal/infrastructure/**` (deployment configs)

## Documentation
- `docs/**` (documentation updates always safe)
- `*.md` files (safe to merge or skip)

## Independent Features
- Rate limiting middleware (new files)
- Async processing queue (new files)
- Multi-leg journey components (booking portal)

---

# Final Recommendations

## What to Do Now

1. **Read this entire document carefully**
2. **Decide which features you actually need:**
   - Do you need async document processing? (Recommended: YES)
   - Do you need rate limiting? (Recommended: YES)  
   - Do you need multi-leg journey support? (Your call)
   - Do you need Week 3/4 UX improvements? (Your call)

3. **Follow the surgical cherry-pick strategy above**
4. **Test after EACH cherry-pick** - don't batch them
5. **If conflict occurs:** Skip that commit and move on

## What NOT to Do

- ❌ Don't merge entire branches
- ❌ Don't cherry-pick anything touching KvK files
- ❌ Don't cherry-pick anything touching getEndpoints
- ❌ Don't batch cherry-picks without testing
- ❌ Don't delete branches yet (keep for reference)

## When You're Done

After safely cherry-picking what you need:

1. **Test everything thoroughly**
2. **Run the admin portal** - verify KvK Registry tab still works
3. **Run the booking portal** - verify async processing works
4. **Delete this analysis file** (or archive it)
5. **Consider deleting old feature branches** (after confirming everything works)

---

**Document Generated:** 2025-10-26 21:00 UTC
**Analysis Tool:** Claude Code
**Total Branches Analyzed:** 6
**Total Commits Analyzed:** ~95
**Estimated Risk if Merged Without Review:** CRITICAL - Will break production

