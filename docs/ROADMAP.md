# 🗺️ CTN ASR Roadmap

**Version:** 1.7.0 | **Updated:** October 12, 2025

---

## 🚨 TO DO

### To Do 1: Email Notifications (HIGH) ⚡
- [ ] Setup Azure Communication Services
- [ ] Configure Azure Event Grid
- [ ] Create email templates (approval, rejection, token issued, etc.)
- [ ] Test notification workflows

### To Do 2: KvK Document Verification (HIGH)
- [ ] PDF upload for KvK statement
- [ ] Extract company name and KvK number
- [ ] Validate against KvK API
- [ ] Flag suspicious cases (bankrupt, dissolved, mismatch)
- [ ] Admin review queue

### To Do 3: Multi-System Endpoint Management (MEDIUM-HIGH)
- [ ] UI for members to register multiple systems/endpoints
- [ ] Generate separate BVAD tokens per endpoint
- [ ] Enable/disable endpoints independently
- [ ] Track endpoint usage per system

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

---

## 📊 Current Status

**Admin Portal:** Production-ready, all features working  
**Member Portal:** Infrastructure complete, authentication working  
**Database:** 6 tables + 2 views deployed  
**API v2:** 20+ endpoints operational  
**Deployment:** Azure DevOps + manual workflow

---

**Target Production Date:** November 1, 2025
