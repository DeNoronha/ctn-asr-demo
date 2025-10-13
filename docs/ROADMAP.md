# CTN ASR Roadmap

**Last Updated:** October 13, 2025

## Remaining Action Items

### Security (CRITICAL)
- [ ] Rotate PostgreSQL password and remove from Git history
- [ ] Move all secrets to Azure Key Vault
- [ ] Configure KvK API key in Function App Settings (blocked: waiting for key)

### Code Quality
- [ ] Refactor language switcher to remove page reload
- [ ] Remove remaining TypeScript 'any' types

### Post-Launch Enhancements
- [x] ~~Enable Swagger/OpenAPI documentation~~ ✅ Completed
- [x] ~~Add health check endpoint~~ ✅ Completed
- [x] ~~Add pagination to list endpoints~~ ✅ Completed (3 endpoints)
- [x] ~~Add database indexes for performance~~ ✅ Completed (52 indexes)
- [x] ~~Configure timeouts for external API calls~~ ✅ Completed
- [ ] Configure Application Insights telemetry
- [ ] Implement database transactions for multi-step operations
- [ ] Define API versioning strategy
- [ ] Standardize naming conventions
- [ ] Handle locale/timezone consistently

### Testing
- [ ] Add E2E tests with Playwright
- [ ] Add comprehensive unit tests
- [ ] Performance testing and optimization

### Future Features
- [ ] Keycloak integration for member-facing APIs
- [ ] DNS verification for onboarding
- [ ] International KvK support
- [ ] WAF/Firewall configuration
- [ ] Additional agents: Performance Tuner, Technical Writer, Database Expert, Architecture Reviewer, Quality Auditor, Research Manager
