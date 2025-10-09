# 🗺️ Roadmap - Future Enhancements

> **Strategic plan for evolving the CTN Association Register**

---

## 🎯 Current State (v1.2.0)

**✅ Completed (October 2025)**
- Admin sidebar with navigation
- Advanced members grid (search, sort, filter, paginate, column management)
- Dashboard with statistics
- Token management view
- Toast notifications and loading indicators
- Form validation and auto-save
- Member detail view with editing
- Responsive design
- Production deployment ready

---

## 🚨 CRITICAL TASKS FOR TOMORROW (October 9, 2025)

### Priority 1: Database Schema Analysis ⚡
**MUST DO FIRST - Everything depends on this**
- [ ] Analyze Navicat DDL file (your version in `/navicat` directory)
- [ ] Compare with generated schema in `/repo/ASR/`
- [ ] Identify discrepancies and determine correct schema
- [ ] Document differences and decisions
- [ ] Update application to match correct schema if needed

### Priority 2: Fix Authentication (Step 4.1) ✅ RESOLVED
- [x] Debug login redirect issue at http://localhost:3000
- [x] Use Chrome DevTools screenshots for error diagnosis
- [x] Fix Azure AD B2C redirect URI / CORS issues
- [x] Test login for Admin Portal
- [x] Test login for Member Portal
- [x] Verify session management works

### Priority 3: Complete Member Portal (Step 8.1) ⚡
- [ ] Integrate fixed authentication
- [ ] Test member self-service features
- [ ] Verify token download works

---

## 📅 Development Steps (In Execution Order)

### Step 1: Foundation (COMPLETE ✅)
**Completion Date:** October 7, 2025

- [x] Kendo React integration
- [x] Admin sidebar (Kendo Drawer)
- [x] Members grid (Kendo Grid)
- [x] Dashboard view
- [x] Token management
- [x] Documentation

---

### Step 2: Polish & UX Improvements (COMPLETE ✅)
**Completion Date:** October 8, 2025

#### 2.1 Loading & Feedback ✅
- [x] Toast notifications (Kendo Notification)
- [x] Loading spinners
- [x] Progress indicators
- [x] Error boundaries with retry
- [x] Success confirmations

#### 2.2 Advanced Grid Features ✅
- [x] Column visibility toggle
- [x] Column resizing
- [x] Row selection (checkboxes)
- [x] Grid state persistence (localStorage)
- [x] Bulk actions (export, tokens)
- [x] Multi-column sorting
- [x] Per-column filtering

#### 2.3 Form Enhancements ✅
- [x] Real-time validation
- [x] Auto-formatting (org_id, domain, LEI, KVK)
- [x] Input masks
- [x] Auto-save draft (localStorage)
- [x] Confirmation dialogs
- [x] Field-level error messages

#### 2.4 Data Export (PARTIAL ✅)
- [x] Export to Excel (Kendo Excel Export)
- [ ] Export to PDF
- [ ] Custom export templates

---

### Step 3: Advanced Features (IN PROGRESS 🔄)
**Status:** Partial completion

#### 3.1 Member Detail View ✅
**Completion Date:** October 8, 2025
- [x] Modal dialog for member details
- [x] Three-tab interface (Overview, Activity, Tokens)
- [x] Inline editing with validation
- [x] Activity timeline
- [x] Token issuance from detail view

#### 3.2 Advanced Search & Filtering
- [ ] Kendo MultiSelect for status filtering
- [ ] Date range picker
- [ ] Advanced filter builder
- [ ] Saved search filters
- [ ] Filter presets

#### 3.3 Bulk Operations (PARTIAL ✅)
- [x] Multi-select members (checkboxes)
- [x] Bulk export
- [ ] Bulk status change
- [ ] Bulk membership level update
- [ ] Bulk delete

---

### Step 4: Authentication & Security 🔐
**Priority:** CRITICAL - COMPLETE ✅
**Completion Date:** October 9, 2025

#### 4.1 User Authentication ✅
- [x] Login/logout functionality
- [x] Azure AD B2C integration
- [x] Session management
- [x] Fix redirect URI / CORS issues
- [x] Test with both Admin and Member portals

#### 4.2 Role-Based Access Control (RBAC) ✅
**Completion Date:** October 9, 2025
- [x] User roles (System Admin, Association Admin, Member)
- [x] Permission checks in API (RoleGuard component)
- [x] Role-based UI components
- [x] User management UI (System Admin only)
- [x] User listing screen with Kendo Grid
- [x] Invite user dialog with role selection
- [x] Edit user dialog (change roles, enable/disable users)
- [x] User statistics dashboard
- [x] Role assignment interface for System Admin

**Implementation Details:**
- Full user management grid with sorting, filtering, pagination
- Invite/Edit dialogs with validation
- Action logging integration
- CTN brand styling applied
- Role badges and status indicators
- Three-tier hierarchy: SystemAdmin → AssociationAdmin → Member

#### 4.3 Audit Logging ✅
**Completion Date:** October 9, 2025
- [x] Log all CRUD operations
- [x] Activity tracking per user (11 action types)
- [x] Audit log viewer for admins with Kendo Grid
- [x] Export audit logs to JSON
- [x] Advanced filtering (action type, target type)
- [x] Statistics panel (total/filtered/today counts)
- [x] LocalStorage persistence

**Implementation Details:**
- AuditLogService with comprehensive logging
- Action types: USER_INVITED, USER_UPDATED, USER_ENABLED, USER_DISABLED, USER_ROLE_CHANGED, MEMBER_CREATED, MEMBER_UPDATED, MEMBER_DELETED, TOKEN_ISSUED, USER_LOGIN, USER_LOGOUT
- Grid view with sorting, filtering, pagination
- Color-coded action badges
- Target info display
- Export functionality for compliance

---

### Step 8: Member Portal 🔐
**Priority:** HIGH - 90% COMPLETE
**Status:** Finish after schema analysis

#### 8.1 Separate Member-Facing Portal (FINISH AFTER PRIORITY 1)
- [x] New React application setup ✅
- [x] Member Portal running on port 3001 ✅
- [x] Kendo React integration working ✅
- [x] Basic structure and navigation ✅
- [ ] Member self-service login (needs Step 4.1) ⚡
- [ ] View own profile
- [ ] Request membership changes
- [ ] Download tokens
- [ ] Support ticket system

**Status:** Portal infrastructure complete, only authentication integration needed  
**Dependencies:** Step 4.1 complete ✅, Priority 1 schema analysis pending ⚡

---

### Step 2.5: Portal Branding & Visual Polish (NEW)
**Priority:** MEDIUM  
**Timeline:** 1 day
**Execute After:** Step 8.1 complete

#### 2.5.1 Logo Integration & Branding
- [ ] Add CTN logo to both portals (header/sidebar)
- [ ] Add partner logos: Portbase, Contargo
- [ ] Create logo asset directory structure
- [ ] Implement logo carousel/grid on landing pages
- [ ] Add "Powered by" or "Partners" section
- [ ] Ensure responsive logo sizing
- [ ] Brand colors consistency check

**Technical:**
- Store logos in `/public/assets/logos/`
- Support SVG and PNG formats
- Lazy load partner logos

---

### Step 6: Dashboard Analytics & Visualizations (NEW)
**Priority:** MEDIUM  
**Timeline:** 2 days
**Execute After:** Step 2.5 complete

#### 6.1 Admin Dashboard Graphs
- [ ] Pie chart: Member status distribution (Active/Pending/Suspended/Terminated)
- [ ] Bar chart: New members over time (monthly/quarterly)
- [ ] Line chart: Member growth trend over 12 months
- [ ] Metric cards: Total members, active members, pending applications
- [ ] Refresh dashboard data automatically
- [ ] Export dashboard as PDF

**Technical:**
- Use Recharts library (already installed)
- Create analytics API endpoints
- Cache aggregated data (refresh hourly)
- Real-time updates via WebSocket (optional)

---

### Step 7: Event-Driven Email Notifications (NEW)
**Priority:** HIGH  
**Timeline:** 2-3 days
**Execute After:** Step 6.1 complete

#### 7.1 Azure Communication Services Integration
- [ ] Setup Azure Communication Services (Email)
- [ ] Configure Azure Event Grid for member events
- [ ] Create email templates:
  - New member application received (to admin + applicant)
  - Application approved (to member)
  - Application rejected (to applicant)
  - Token issued (to member)
  - Membership suspended (to member)
  - Membership terminated (to member)
- [ ] Event triggers:
  - `member.application.created` → Email notifications
  - `member.activated` → Welcome email
  - `member.suspended` → Notification
  - `token.issued` → Token delivery email
- [ ] Email delivery logging and retry logic
- [ ] Unsubscribe functionality

**Architecture:**
```
Member Action → Event Grid → Azure Function → Communication Services → Email
```

**Technical:**
- Azure Event Grid for event routing
- Azure Communication Services for email
- Store email logs in database for audit
- Template system for email content

---

### Step 5: Enhanced Verification & Compliance (NEW)
**Priority:** HIGH  
**Timeline:** 3-4 days
**Execute After:** Step 7.1 complete

#### 5.1 KvK Document Verification
- [ ] PDF upload component for KvK statement (uittreksel)
- [ ] Extract company name and KvK number from PDF
- [ ] Validate against KvK API (company exists, name matches)
- [ ] Check company status (active/bankrupt/dissolved/inactive)
- [ ] Flag suspicious/problematic cases:
  - Status: Bankrupt → RED flag
  - Status: Dissolved → RED flag
  - Name mismatch → ORANGE flag
  - KvK number not found → RED flag
- [ ] Admin review queue for flagged cases
- [ ] Store verification results with timestamp
- [ ] Display verification status badge in member detail
- [ ] Re-verification workflow (annual or on-demand)

**Technical:**
- Azure AI Document Intelligence (Form Recognizer) for PDF extraction
- KvK API integration: https://developers.kvk.nl/
- Add fields to `legal_entity` table:
  - `kvk_verification_status` (verified/pending/failed/flagged)
  - `kvk_verified_at` (timestamp)
  - `kvk_document_url` (blob storage reference)
- Admin notification system for flagged cases
- Store original PDF in Azure Blob Storage

---

### Step 9: Multi-System Endpoint Management (NEW)
**Priority:** MEDIUM-HIGH  
**Timeline:** 2-3 days
**Execute After:** Step 5.1 complete

#### 9.1 System Endpoint Registration
- [ ] UI for members to register multiple systems/endpoints
- [ ] Each endpoint includes:
  - System name
  - Endpoint URL
  - Description
  - Data type/category (container data, customs, warehouse, etc.)
  - Status (active/inactive)
- [ ] Generate separate BVAD tokens per system/endpoint
- [ ] View/manage all registered systems in table
- [ ] Enable/disable endpoints independently
- [ ] Track endpoint usage/activity per system
- [ ] Test endpoint connectivity
- [ ] Endpoint health monitoring

**Database Notes:**
- ✅ `legal_entity_endpoint` table already exists in Navicat schema
- ✅ `endpoint_authorization` table already exists
- Schema already supports this - just need UI implementation

**Technical:**
- Leverage existing database schema
- Create endpoint management UI components
- Token generation per endpoint
- Activity logging per endpoint

---

### Step 3.2 & 3.3: Polish Advanced Features
**Timeline:** Execute after Step 4.2 & 4.3
- Complete Step 3.2 (Advanced Search & Filtering)
- Complete Step 3.3 (Remaining Bulk Operations)
- Complete Step 2.4 (PDF Export)

---

### Step 10: Real-Time & Collaboration (Future)
**Priority:** Low  
**Status:** Planned for later

- WebSocket integration for real-time updates
- Collaborative editing
- Real-time notifications

---

### Step 11: Advanced Analytics (Future)
**Priority:** Low  
**Status:** Planned for later

- Member analytics dashboard
- Token usage analytics
- Trend analysis and predictions

---

### Step 12: Integration & Automation (Future)
**Priority:** Low  
**Status:** Planned for later

- External system integrations
- Automated workflows
- API expansion

---

## 🎯 Execution Timeline

### **Week 1: October 9-11, 2025**
**Focus:** Schema Resolution & Core Functionality

- **Day 1 (Oct 9):**
  - Morning: Database schema analysis & resolution (PRIORITY 1)
  - Afternoon: Complete Member Portal auth integration (PRIORITY 3)

- **Day 2 (Oct 10):**
  - Portal branding & logos (Step 2.5)
  - Dashboard analytics implementation (Step 6.1)

- **Day 3 (Oct 11):**
  - Dashboard graphs completion
  - Start email notifications (Step 7.1)

### **Week 2: October 14-18, 2025**
**Focus:** Notifications & Verification

- **Days 1-2 (Oct 14-15):**
  - Complete email notifications (Step 7.1)
  - Test event-driven workflows

- **Days 3-5 (Oct 16-18):**
  - KvK document verification (Step 5.1)
  - Admin review queue for flagged cases

### **Week 3: October 21-25, 2025**
**Focus:** Endpoint Management & Polish

- **Days 1-3 (Oct 21-23):**
  - Multi-system endpoint management (Step 9.1)
  - Token generation per endpoint

- **Days 4-5 (Oct 24-25):**
  - Polish remaining Step 3 features
  - Advanced search & filtering

### **Week 4: October 28-31, 2025**
**Focus:** Production Prep & Testing

- **Days 1-2 (Oct 28-29):**
  - Complete remaining Step 3 features
  - Bulk operations completion

- **Days 3-4 (Oct 30-31):**
  - Production hardening
  - Security review
  - Performance testing

---

## 📊 Progress Summary

| Step | Status | Completion | Priority | Notes |
|------|--------|------------|----------|-------|
| Step 1 | ✅ Complete | 100% | - | Foundation solid |
| Step 2 | ✅ Complete | 95% | - | PDF export pending |
| Step 2.5 | 📋 Planned | 0% | MEDIUM | Logos & branding (NEW) |
| Step 3 | 🔄 In Progress | 50% | MEDIUM | Advanced features |
| Step 4.1 | ✅ Complete | 100% | - | Auth complete ✅ |
| Step 4.2 | ✅ Complete | 100% | - | RBAC & User Management ✅ |
| Step 4.3 | ✅ Complete | 100% | - | Audit logging ✅ |
| Step 5 | 📋 Planned | 0% | HIGH | KvK verification (NEW) |
| Step 6 | 📋 Planned | 0% | MEDIUM | Dashboard graphs (NEW) |
| Step 7 | 📋 Planned | 0% | HIGH | Email notifications (NEW) |
| Step 8.1 | 🔄 In Progress | 90% | CRITICAL | Member portal - needs Priority 1 ⚡ |
| Step 9 | 📋 Planned | 0% | MEDIUM-HIGH | Endpoint management (NEW) |
| Step 10-12 | 📋 Future | 0% | LOW | Advanced features |

---

## 🎉 Recent Achievements

**October 9, 2025:**
- ✅ Authentication resolved (Step 4.1)
- ✅ RBAC & User Management complete (Step 4.2)
  - User listing with Kendo Grid
  - Invite/Edit user dialogs
  - Role assignment interface
  - User statistics dashboard
- ✅ Audit Logging complete (Step 4.3)
  - 11 action types tracked
  - Audit log viewer with filtering
  - Export to JSON
  - Statistics panel
- ✅ Admin Portal fully functional
- ✅ Member Portal infrastructure 90% complete

**October 8, 2025:**
- ✅ Notification system with 4 types
- ✅ Loading spinners (3 sizes)
- ✅ Column management (show/hide, resize)
- ✅ Row selection and bulk actions
- ✅ Form validation with auto-save
- ✅ Member detail modal with tabs
- ✅ Activity timeline visualization
- ✅ Member Portal infrastructure (90% complete)

---

## 📝 Notes

**Admin Portal Status:** Production-ready, feature-rich, authentication working  
**Member Portal Status:** Infrastructure complete, awaiting schema analysis (Priority 1)  
**Critical Task:** Database schema analysis must be completed before continuing with Member Portal  
**Database Schema:** Needs analysis and alignment between Navicat and generated versions  
**Timeline Estimates:** Based on actual Claude collaboration pace (hours/days, not weeks)

---

## 🔑 Key Dependencies

- **PRIORITY 1** (Schema Analysis) blocks → Everything
- **Step 8.1** depends on → Priority 1 completion
- **Step 2.5** depends on → Step 8.1 (both portals functional)
- **Step 6** depends on → Step 2.5 (visual consistency)
- **Step 7** depends on → Step 6 (core features complete)
- **Step 5** depends on → Step 7 (event system in place)
- **Step 9** depends on → Step 5 (verification workflows ready)
- **Step 4.2-4.3** → ✅ Complete

---

**Current Version:** 1.2.0  
**Last Updated:** October 8, 2025  
**Next Critical Milestone:** October 9 - Database schema analysis (PRIORITY 1)  
**Target Production Date:** November 1, 2025
