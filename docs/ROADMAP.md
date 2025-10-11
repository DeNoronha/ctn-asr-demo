# 🗺️ CTN ASR Roadmap

**Version:** 1.8.0 | **Updated:** October 12, 2025

---

## 🚨 TO DO

### To Do 1: KvK Document Verification - Complete Implementation (HIGH)
- [x] PDF upload for KvK statement
- [x] Extract company name and KvK number
- [x] Validate against KvK API
- [x] Flag suspicious cases (bankrupt, dissolved, mismatch)
- [x] Admin review queue
- [x] Azure Blob Storage with private access
- [x] Multipart file upload working
- [ ] **Fix blob URL access (SAS token generation required)**
- [ ] **Get KvK API key from website (maintenance until Monday)**
- [ ] **Test full verification flow with real KvK documents**
- [ ] **Error handling improvements**

### To Do 2: Multi-System Endpoint Management (MEDIUM-HIGH)
- [ ] UI for members to register multiple systems/endpoints
- [ ] Generate separate BVAD tokens per endpoint
- [ ] Enable/disable endpoints independently
- [ ] Track endpoint usage per system

### To Do 3: Email Template Management (MEDIUM)
- [ ] Move templates to separate HTML files
- [ ] Add company logo/branding
- [ ] Support multiple languages
- [ ] Use a template engine

### To Do 4: Workflow Automation with Logic Apps (MEDIUM-HIGH)
- [ ] Setup Azure Logic Apps orchestrator
- [ ] Build member registration workflow
- [ ] Human-in-the-loop approval steps
- [ ] Error handling and retry logic

### To Do 5: Polish Advanced Features (MEDIUM)
- [ ] Advanced search & filtering (MultiSelect, date range, filter builder)
- [ ] Bulk operations (status change, membership update, delete)
- [ ] PDF export

### To Do 6: Localization (MEDIUM)
- [ ] Setup Lokalise integration
- [ ] Extract hardcoded strings
- [ ] Implement language switcher
- [ ] Support Dutch, English, German

### To Do 7: Admin Portal Menu Expansion (MEDIUM)
- [ ] Subscriptions section
- [ ] Newsletters section
- [ ] Tasks section (pending verifications, approvals, tickets)

### To Do 8: Portal Branding Polish (LOW)
- [ ] Verify logos display correctly in all browsers
- [ ] Add hover effects and animations
- [ ] Ensure responsive logo sizing

### To Do 9: Future Features (LOW)
- [ ] Real-time & Collaboration (WebSocket, collaborative editing)
- [ ] Advanced Analytics (trends, predictions)
- [ ] Integration & Automation (external systems, API expansion)

---

## ✅ COMPLETED WORK

### October 2025 Milestones

**Week 1 (Oct 7-8):**
- Foundation: Kendo React, Admin sidebar, Members grid, Token management
- UX: Toast notifications, Loading spinners, Column management, Form validation
- Member detail view with tabs
- Dashboard with Recharts (Pie, Bar, Line charts)

**Week 2 (Oct 9):**
- Database schema migration (6 tables + 2 views)
- Backend API v2 (20+ endpoints)
- Authentication & RBAC
- User management UI
- Audit logging

**Week 2 (Oct 10):**
- API v2 deployed and tested
- React components integrated with API v2
- Deployment workflow established
- Critical bug fixes

**Week 2 (Oct 11):**
- Azure Functions routing fixed
- CTN and partner logos added
- Member Portal deployed

**Week 2 (Oct 12):**
- Dashboard analytics complete
- Email notifications infrastructure:
  - Communication Services deployed
  - Event Grid Topic and subscription created
  - EventGridHandler function deployed
  - Event publishing service created
  - 5 email templates (Application Created, Activated, Suspended, Terminated, Token Issued)
- **KvK Document Verification (85% complete):**
  - Azure Blob Storage deployed (stctnasrdev96858) with private access
  - Azure AI Document Intelligence deployed (doc-intel-ctn-asr-dev)
  - Database migration 007 applied (11 new columns)
  - API services created: BlobStorageService, DocumentIntelligenceService, KvKService
  - API endpoints deployed: upload, status check, admin review, flagged list
  - React components: KvkDocumentUpload, KvkReviewQueue
  - UI integration: KvK Verification tab in Member Detail, KvK Review Queue in admin menu
  - File upload working with multipart form data
  - **Remaining:** SAS token generation for secure document viewing, KvK API key configuration, real-world testing

---

## 📊 Current Status

**Admin Portal:** Production-ready, all features working  
**Member Portal:** Infrastructure complete, authentication working  
**Database:** 11 tables + 2 views deployed (incl. KvK verification fields)  
**API v2:** 28+ endpoints operational  
**Email Notifications:** Configured and tested  
**KvK Verification:** Deployed, awaiting testing  
**Deployment:** Azure DevOps + manual workflow

---

**Target Production Date:** November 1, 2025
