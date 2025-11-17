# TASK-SEC-005: CSP Inline Style Risk Analysis

**Generated:** 2025-11-17T07:14:16.342Z
**Total Files Analyzed:** 70
**Total Inline Styles:** 278

## Risk Summary

| Risk Level | Count | Priority | Impact |
|------------|-------|----------|--------|
| HIGH       | 109 | P1 (Critical) | User data in styles = XSS/IDOR risk |
| MEDIUM     | 98 | P2 (High) | Refactorable to utilities |
| LOW        | 32 | P3 (Low) | Static layout, minimal risk |
| UNKNOWN    | 39 | P2 (High) | Needs manual review |

## HIGH RISK FILES (Priority 1)

### components/AllEndpointsView.tsx

- **Count:** 2
- **Risk:** Rendering user/member data (XSS vector)
- **Lines:** 132, 175
- **Action Required:** Refactor before removing 'unsafe-inline'

### components/ContactsManager.tsx

- **Count:** 1
- **Risk:** Dynamic color based on user data (IDOR risk)
- **Lines:** 128
- **Action Required:** Refactor before removing 'unsafe-inline'

### components/IdentifierVerificationManager.tsx

- **Count:** 6
- **Risk:** Dynamic color based on user data (IDOR risk)
- **Lines:** 104, 226, 257, 259, 262, 265
- **Action Required:** Refactor before removing 'unsafe-inline'

### components/KvkReviewQueue.tsx

- **Count:** 28
- **Risk:** Rendering user/member data (XSS vector)
- **Lines:** 149, 245, 257, 258, 265, 267, 269, 270, 273, 276, 294, 298, 301, 305, 310, 312, 318, 322, 324, 327, 331, 336, 338, 347, 349, 365, 378, 384
- **Action Required:** Refactor before removing 'unsafe-inline'

### components/M2MClientsManager.tsx

- **Count:** 6
- **Risk:** Rendering user/member data (XSS vector)
- **Lines:** 243, 376, 377, 382, 441, 455
- **Action Required:** Refactor before removing 'unsafe-inline'

### components/MemberDetailView.tsx

- **Count:** 3
- **Risk:** Dynamic color based on user data (IDOR risk)
- **Lines:** 101, 109, 133
- **Action Required:** Refactor before removing 'unsafe-inline'

### components/MembersGrid.tsx

- **Count:** 4
- **Risk:** Dynamic color based on user data (IDOR risk)
- **Lines:** 225, 283, 384, 454
- **Action Required:** Refactor before removing 'unsafe-inline'

### components/ReviewTasks.tsx

- **Count:** 30
- **Risk:** Rendering user/member data (XSS vector)
- **Lines:** 197, 233, 325, 337, 338, 345, 347, 349, 350, 353, 356, 374, 378, 381, 385, 390, 392, 398, 402, 404, 407, 411, 414, 416, 425, 435, 437, 453, 466, 472
- **Action Required:** Refactor before removing 'unsafe-inline'

### components/audit/AuditLogViewer.tsx

- **Count:** 4
- **Risk:** Rendering user/member data (XSS vector)
- **Lines:** 369, 373, 538, 540
- **Action Required:** Refactor before removing 'unsafe-inline'

### components/identifiers/IdentifierDialogs.tsx

- **Count:** 3
- **Risk:** Dynamic color based on user data (IDOR risk)
- **Lines:** 40, 51, 59
- **Action Required:** Refactor before removing 'unsafe-inline'

### components/identifiers/IdentifiersTable.tsx

- **Count:** 3
- **Risk:** Rendering user/member data (XSS vector)
- **Lines:** 52, 71, 101
- **Action Required:** Refactor before removing 'unsafe-inline'

### components/member/MemberDetailSections.tsx

- **Count:** 3
- **Risk:** Rendering user/member data (XSS vector)
- **Lines:** 71, 85, 158
- **Action Required:** Refactor before removing 'unsafe-inline'

### components/member/MemberDetailTabs.tsx

- **Count:** 2
- **Risk:** Dynamic color based on user data (IDOR risk)
- **Lines:** 19, 30
- **Action Required:** Refactor before removing 'unsafe-inline'

### components/members/MembersGridColumns.tsx

- **Count:** 2
- **Risk:** Dynamic color based on user data (IDOR risk)
- **Lines:** 77, 148
- **Action Required:** Refactor before removing 'unsafe-inline'

### components/users/UserManagement.tsx

- **Count:** 12
- **Risk:** Rendering user/member data (XSS vector)
- **Lines:** 227, 232, 236, 244, 288, 302, 449, 464, 482, 484, 541, 543
- **Action Required:** Refactor before removing 'unsafe-inline'

## MEDIUM RISK FILES (Priority 2 - Top 20)

### components/TasksGrid.tsx

- **Count:** 39
- **Common Pattern:** Spacing (can use utility class)
- **Recommendation:** Extend security-utilities.css

### components/kvk/KvkVerificationDisplay.tsx

- **Count:** 26
- **Common Pattern:** Font size (can use text utility class)
- **Recommendation:** Extend security-utilities.css

### components/TierManagement.tsx

- **Count:** 12
- **Common Pattern:** Spacing (can use utility class)
- **Recommendation:** Extend security-utilities.css

### components/forms/MemberFormSections.tsx

- **Count:** 4
- **Common Pattern:** Hardcoded color (can use CSS variable or class)
- **Recommendation:** Extend security-utilities.css

### components/About.tsx

- **Count:** 3
- **Common Pattern:** Hardcoded color (can use CSS variable or class)
- **Recommendation:** Extend security-utilities.css

### components/AdminPortal.tsx

- **Count:** 2
- **Common Pattern:** Font size (can use text utility class)
- **Recommendation:** Extend security-utilities.css

### components/NotFound.tsx

- **Count:** 2
- **Common Pattern:** Spacing (can use utility class)
- **Recommendation:** Extend security-utilities.css

### components/auth/Unauthorized.tsx

- **Count:** 2
- **Common Pattern:** Spacing (can use utility class)
- **Recommendation:** Extend security-utilities.css

### components/kvk/KvkDocumentDropzone.tsx

- **Count:** 2
- **Common Pattern:** Spacing (can use utility class)
- **Recommendation:** Extend security-utilities.css

### pages/MemberRegistrationWizard.tsx

- **Count:** 2
- **Common Pattern:** Hardcoded color (can use CSS variable or class)
- **Recommendation:** Extend security-utilities.css

### App.tsx

- **Count:** 1
- **Common Pattern:** Spacing (can use utility class)
- **Recommendation:** Extend security-utilities.css

### components/APIAccessManager.tsx

- **Count:** 1
- **Common Pattern:** Spacing (can use utility class)
- **Recommendation:** Extend security-utilities.css

### components/help/FieldLabel.tsx

- **Count:** 1
- **Common Pattern:** Spacing (can use utility class)
- **Recommendation:** Extend security-utilities.css

### components/members/MembersGridActions.tsx

- **Count:** 1
- **Common Pattern:** Font size (can use text utility class)
- **Recommendation:** Extend security-utilities.css

## Remediation Plan

### Phase 1: HIGH RISK (Critical)
- **Files:** 15
- **Effort:** 11 hours
- **Action:** Refactor all files with user-controlled data in styles
- **Blocker:** Cannot remove 'unsafe-inline' until complete

### Phase 2: MEDIUM RISK (High Impact)
- **Files:** 14
- **Effort:** 5 hours
- **Action:** Create utility classes, bulk refactor
- **Nice-to-have:** Improves CSP posture significantly

### Phase 3: LOW RISK (Optional)
- **Files:** 7
- **Effort:** 2 hours
- **Action:** Defer or document as accepted risk
- **Note:** Static layouts pose minimal XSS risk

## Security Impact

### Current CSP (with 'unsafe-inline'):
```
style-src 'self' 'unsafe-inline'
```

**Risk:** Any XSS vulnerability allows attacker to inject malicious styles:
- Data exfiltration via CSS injection
- UI redressing attacks
- Phishing overlays

### Target CSP (without 'unsafe-inline'):
```
style-src 'self'
```

**Benefit:** Blocks ALL inline styles, including malicious ones
**Requirement:** Zero inline style attributes in DOM

## Merge Gate Recommendation

**Status:** 🛑 BLOCK

**Rationale:**
- 109 HIGH risk inline styles with user data
- Cannot safely remove 'unsafe-inline' in current state
- XSS risk if attacker controls member status, verification status, etc.

**Conditions for APPROVE:**
1. Refactor all HIGH risk files (15 files)
2. Validate and sanitize all user data used in dynamic styles
3. Test with CSP 'unsafe-inline' removed
4. No console CSP violations

**Post-Merge Actions:**
1. Create tracking issue for MEDIUM risk refactoring
2. Document LOW risk as accepted technical debt
3. Add CSP monitoring to detect new violations
