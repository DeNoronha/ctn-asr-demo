# Accessibility Testing Guide

**Last Updated:** October 29, 2025
**Target:** WCAG 2.1 AA Compliance
**Scope:** CTN Association Register Admin Portal

---

## Table of Contents

1. [Overview](#overview)
2. [Automated Testing](#automated-testing)
3. [Screen Reader Testing](#screen-reader-testing)
4. [Keyboard Navigation Testing](#keyboard-navigation-testing)
5. [Mobile Touch Testing](#mobile-touch-testing)
6. [Color Contrast Verification](#color-contrast-verification)
7. [WCAG 2.1 Compliance Checklist](#wcag-21-compliance-checklist)

---

## Overview

### Testing Strategy

**Three-Layer Approach:**
1. **Automated Testing** - axe DevTools, Playwright tests (catches 30-40% of issues)
2. **Manual Testing** - Screen readers, keyboard navigation (catches 40-50% of issues)
3. **User Testing** - Real users with disabilities (catches remaining 10-30%)

### Success Criteria

- Zero WCAG 2.1 AA violations in automated tools
- All interactive elements keyboard accessible
- All content announced correctly by screen readers
- Touch targets ≥44x44px on mobile devices
- Color contrast ratio ≥4.5:1 for normal text, ≥3:1 for large text

---

## Automated Testing

### 1. axe DevTools Browser Extension

**Installation:**
- Chrome: https://chrome.google.com/webstore/detail/axe-devtools/lhdoppojpmngadmnindnejefpokejbdd
- Firefox: https://addons.mozilla.org/en-US/firefox/addon/axe-devtools/
- Edge: https://microsoftedge.microsoft.com/addons/detail/axe-devtools/kcenlimkmjjkdfcaleembgmldmnnlfkn

**Testing Procedure:**

```bash
# 1. Open admin portal in browser
https://calm-tree-03352ba03.1.azurestaticapps.net

# 2. Open DevTools (F12)
# 3. Navigate to "axe DevTools" tab
# 4. Click "Scan ALL of my page"
# 5. Review violations by severity:
#    - Critical (must fix)
#    - Serious (should fix)
#    - Moderate (nice to fix)
#    - Minor (optional)
```

**Expected Results:**
- **Before implementation:** 20-30 violations
- **After Phase 1:** <10 violations
- **After Phase 2:** <5 violations
- **After Phase 3:** 0 violations (WCAG 2.1 AA compliant)

**Common Violations to Check:**

| Rule ID | Description | DA Task |
|---------|-------------|---------|
| color-contrast | Color contrast <4.5:1 | DA-001 |
| button-name | Buttons missing accessible name | DA-002 |
| link-name | Links missing accessible name | DA-002 |
| label | Form inputs missing labels | DA-002 |
| image-alt | Images missing alt text | DA-002 |
| aria-required-children | ARIA roles missing required children | DA-004 |
| region | Page missing landmark regions | DA-004 |
| heading-order | Heading levels skipped | DA-004 |

---

### 2. Playwright Accessibility Tests

**Installation:**
```bash
cd admin-portal
npm install --save-dev @axe-core/playwright
```

**Test Suite:**

Create `admin-portal/e2e/accessibility.spec.ts`:

```typescript
import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login to admin portal
    await page.goto('/');
    // Add login steps...
  });

  test('Members Grid - WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/members');
    await injectAxe(page);

    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true
      },
      // Only fail on critical and serious issues
      includedImpacts: ['critical', 'serious']
    });
  });

  test('Member Detail Dialog - WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/members');
    await page.click('button[aria-label*="Edit"]').first();
    await injectAxe(page);
    await checkA11y(page.locator('.k-dialog'));
  });

  test('Dashboard - WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/dashboard');
    await injectAxe(page);
    await checkA11y(page);
  });

  test('Contacts Manager - WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/members');
    await page.click('text=View Details').first();
    await page.click('text=Contacts');
    await injectAxe(page);
    await checkA11y(page);
  });

  test('Identifiers Manager - WCAG 2.1 AA', async ({ page }) => {
    await page.goto('/members');
    await page.click('text=View Details').first();
    await page.click('text=Identifiers');
    await injectAxe(page);
    await checkA11y(page);
  });
});
```

**Run Tests:**
```bash
npx playwright test accessibility.spec.ts --headed
```

**Expected Results:**
- All tests passing = WCAG 2.1 AA compliant
- Any failures = accessibility issues need fixing

---

### 3. WAVE Browser Extension

**Installation:**
- Chrome: https://chrome.google.com/webstore/detail/wave-evaluation-tool/jbbplnpkjmmeebjpijfedlgcdilocofh
- Firefox: https://addons.mozilla.org/en-US/firefox/addon/wave-accessibility-tool/

**Testing Procedure:**

```bash
# 1. Navigate to any admin portal page
# 2. Click WAVE extension icon
# 3. Review report:
#    - Errors (red) - must fix
#    - Alerts (yellow) - should review
#    - Features (green) - good accessibility features
#    - Structural elements (blue) - page structure
#    - Contrast errors (pink) - color contrast issues
```

**Focus Areas:**
- **Errors tab** - Zero errors expected after implementation
- **Contrast tab** - All text ≥4.5:1 ratio
- **Structure tab** - Proper heading hierarchy (h1 → h2 → h3)
- **ARIA tab** - Correct ARIA usage

---

## Screen Reader Testing

### 1. NVDA (Windows) - Free

**Installation:**
```bash
# Download from https://www.nvaccess.org/download/
# Install and launch NVDA
# NVDA will start reading immediately
```

**Testing Procedure:**

**A. MembersGrid Screen Reader Test**

```bash
# 1. Launch NVDA (Ctrl+Alt+N)
# 2. Navigate to https://calm-tree-03352ba03.1.azurestaticapps.net/members
# 3. Press H to jump between headings
#    Expected: "Members heading level 1"
# 4. Press T to jump to table
#    Expected: "Members grid with X rows"
# 5. Press Tab to navigate to first Edit button
#    Expected: "Edit [Member Name] button"
# 6. Press Tab to Delete button
#    Expected: "Delete [Member Name] button"
# 7. Press Tab to View Details button
#    Expected: "View Details for [Member Name] button"
```

**Expected Announcements:**

| Element | Expected Announcement |
|---------|----------------------|
| Page heading | "Members heading level 1" |
| Grid | "Members grid with X rows, navigate with arrow keys" |
| Edit button | "Edit [Company Name] button" |
| Delete button | "Delete [Company Name] button" |
| View Details | "View Details for [Company Name] button" |
| Search field | "Search members edit, blank" |
| Filter dropdown | "Filter by status combobox collapsed" |

**B. Form Field Screen Reader Test**

```bash
# 1. Open Member Detail Dialog
# 2. Press Tab to navigate through form fields
#    Expected announcements for each field:
#    - "Legal Name edit required, blank"
#    - "Email Address edit required, blank"
#    - "KvK Number edit, 8 digits required"
#    - "Membership Status combobox, Active selected"
```

**Expected Form Announcements:**

| Field | Expected Announcement |
|-------|----------------------|
| Legal Name | "Legal Name edit required, blank" |
| Email | "Email Address edit required, blank" |
| KvK Number | "KvK Number edit, 8 digits required" |
| Status | "Membership Status combobox, Active selected" |
| Submit button | "Save Member button" |
| Cancel button | "Cancel button" |

**C. Empty State Screen Reader Test**

```bash
# 1. Navigate to grid with no data (e.g., new member with no contacts)
# 2. Press Tab to empty state message
#    Expected: "No contacts registered. Add contact persons for this
#              organization to enable communication and access management.
#              Add Contact button"
```

---

### 2. VoiceOver (macOS/iOS) - Built-in

**Activation:**
- **macOS:** Cmd+F5 or System Preferences → Accessibility → VoiceOver
- **iOS:** Settings → Accessibility → VoiceOver → On

**Testing Procedure (macOS):**

```bash
# 1. Launch Safari
# 2. Navigate to admin portal
# 3. Press Cmd+F5 to enable VoiceOver
# 4. Press VO+Right Arrow to navigate (VO = Ctrl+Option)
# 5. Listen to announcements for each element
```

**VoiceOver Navigation Commands:**

| Command | Action |
|---------|--------|
| VO+Right Arrow | Move to next element |
| VO+Left Arrow | Move to previous element |
| VO+Space | Activate button/link |
| VO+Shift+Down | Enter table/grid |
| VO+Shift+Up | Exit table/grid |
| VO+A | Read all from current position |

**Expected VoiceOver Announcements:**

| Element | Expected Announcement |
|---------|----------------------|
| Heading | "Members, heading level 1" |
| Button | "Edit [Name], button" |
| Link | "View Details, link" |
| Form field | "Legal Name, required, edit text" |
| Grid | "Members grid, table with X rows" |
| Empty state | "No items, heading. Description text. Add button, button" |

---

### 3. JAWS (Windows) - Commercial

**Installation:** https://www.freedomscientific.com/products/software/jaws/
**Free Trial:** 40 minutes per session

**Testing Focus:**
- Table navigation (Ctrl+Alt+Arrow keys)
- Form mode (F5 to toggle)
- Heading navigation (H key)
- Link navigation (Tab key)

---

## Keyboard Navigation Testing

### 1. Full Keyboard Navigation Test

**Goal:** Navigate entire admin portal using only keyboard (no mouse)

**Testing Procedure:**

```bash
# 1. Close/disconnect mouse
# 2. Navigate to https://calm-tree-03352ba03.1.azurestaticapps.net
# 3. Test every page and component
```

**Keyboard Navigation Checklist:**

**A. Global Navigation**

| Action | Key | Expected Behavior |
|--------|-----|-------------------|
| Move forward | Tab | Focus moves to next interactive element |
| Move backward | Shift+Tab | Focus moves to previous element |
| Activate button/link | Enter or Space | Button/link activates |
| Close modal | Esc | Modal closes, focus returns to trigger |
| Skip to content | Tab (first) | Skip link appears and works |

**B. Grids (Kendo Grid)**

| Action | Key | Expected Behavior |
|--------|-----|-------------------|
| Enter grid | Tab | Focus enters grid header |
| Navigate headers | Arrow keys | Move between column headers |
| Enter grid body | Down arrow | Focus enters first data cell |
| Navigate cells | Arrow keys | Move between cells |
| Select row | Space | Row selected |
| Open row actions | Enter | Action menu opens |
| Exit grid | Tab | Focus moves to next element after grid |

**C. Forms**

| Action | Key | Expected Behavior |
|--------|-----|-------------------|
| Navigate fields | Tab | Focus moves to next field |
| Open dropdown | Alt+Down | Dropdown opens |
| Select option | Arrow keys, Enter | Option selected, dropdown closes |
| Toggle checkbox | Space | Checkbox toggles |
| Submit form | Enter (on button) | Form submits |
| Cancel form | Esc | Form closes, changes discarded |

**D. Modal Dialogs**

| Action | Key | Expected Behavior |
|--------|-----|-------------------|
| Open dialog | Enter (on trigger) | Dialog opens, focus moves to first field |
| Navigate in dialog | Tab | Focus stays trapped in dialog |
| Close dialog | Esc | Dialog closes, focus returns to trigger |
| Submit dialog | Enter (on Save) | Dialog submits and closes |

---

### 2. Focus Indicator Visibility Test

**Goal:** Verify all focused elements have visible focus indicators

**Testing Procedure:**

```bash
# 1. Navigate admin portal with Tab key
# 2. Observe focus indicator on each element
# 3. Verify indicator meets WCAG requirements:
#    - 2px solid outline
#    - 2px offset from element
#    - High contrast color (#1976D2 blue)
```

**Expected CSS (from accessibility.css):**

```css
.k-button:focus-visible,
.k-grid-edit-button:focus-visible,
.k-grid-remove-button:focus-visible {
  outline: 2px solid #1976D2;
  outline-offset: 2px;
}
```

**Focus Indicator Checklist:**

- [ ] Buttons have visible focus outline (2px blue)
- [ ] Links have visible focus outline
- [ ] Form fields have visible focus outline
- [ ] Grid cells have visible focus outline
- [ ] Menu items have visible focus outline
- [ ] Modal close button has visible focus outline
- [ ] All focus indicators ≥3:1 contrast against background

---

### 3. Focus Trap Testing

**Goal:** Ensure focus stays trapped in modal dialogs

**Testing Procedure:**

```bash
# 1. Open Member Detail Dialog (click Edit on any member)
# 2. Press Tab repeatedly
# 3. Verify focus cycles through dialog elements only:
#    - First field
#    - Second field
#    - ...
#    - Save button
#    - Cancel button
#    - Close X button
#    - BACK TO first field (cycles)
# 4. Press Shift+Tab to navigate backwards
# 5. Verify focus cycles in reverse order
# 6. Press Esc to close dialog
# 7. Verify focus returns to Edit button that opened dialog
```

**Focus Trap Checklist:**

- [ ] Focus stays within dialog (no escaping to background)
- [ ] Tab cycles through all dialog elements
- [ ] Shift+Tab cycles backwards
- [ ] Esc closes dialog
- [ ] Focus returns to trigger element after close
- [ ] Background content is inert (cannot be focused)

---

## Mobile Touch Testing

### 1. iOS Testing (Safari)

**Devices to Test:**
- iPhone 12/13/14 (390x844px)
- iPhone 12/13/14 Pro Max (428x926px)
- iPad (810x1080px)

**Testing Procedure:**

```bash
# 1. Open Safari on iOS device
# 2. Navigate to https://calm-tree-03352ba03.1.azurestaticapps.net
# 3. Test touch targets on all grids
```

**Touch Target Checklist:**

**A. Members Grid Touch Targets**

| Element | Target Size | Pass/Fail |
|---------|------------|-----------|
| Edit button | ≥44x44px | [ ] |
| Delete button | ≥44x44px | [ ] |
| View Details button | ≥44x44px | [ ] |
| Search field | ≥44px height | [ ] |
| Filter dropdown | ≥44px height | [ ] |
| Row selection | ≥44px height | [ ] |

**B. Form Touch Targets**

| Element | Target Size | Pass/Fail |
|---------|------------|-----------|
| Input fields | ≥44px height | [ ] |
| Dropdown buttons | ≥44x44px | [ ] |
| Save button | ≥44x44px | [ ] |
| Cancel button | ≥44x44px | [ ] |
| Close X button | ≥44x44px | [ ] |

**C. Navigation Touch Targets**

| Element | Target Size | Pass/Fail |
|---------|------------|-----------|
| Menu toggle | ≥44x44px | [ ] |
| Sidebar links | ≥44px height | [ ] |
| Tab buttons | ≥44px height | [ ] |
| Breadcrumb links | ≥44px height | [ ] |

---

### 2. Android Testing (Chrome)

**Devices to Test:**
- Samsung Galaxy S21 (360x800px)
- Google Pixel 6 (412x915px)

**Testing Procedure:**

```bash
# 1. Open Chrome on Android device
# 2. Navigate to admin portal
# 3. Repeat touch target tests from iOS section
# 4. Test gesture support:
#    - Swipe to scroll grids
#    - Tap to select rows
#    - Pinch to zoom (should work)
```

---

### 3. Chrome DevTools Device Simulation

**For quick testing without physical devices:**

```bash
# 1. Open admin portal in Chrome
# 2. Press F12 to open DevTools
# 3. Click device toggle icon (Ctrl+Shift+M)
# 4. Select device from dropdown:
#    - iPhone 12 Pro
#    - Samsung Galaxy S20
#    - iPad
# 5. Enable "Show tap targets" overlay
# 6. Click elements and verify ≥44x44px hit area
```

**DevTools Touch Target Verification:**

```bash
# 1. Select element in DevTools
# 2. View Computed tab
# 3. Verify:
#    min-width: 44px
#    min-height: 44px
#    padding sufficient for touch area
```

---

## Color Contrast Verification

### 1. WebAIM Contrast Checker

**Tool:** https://webaim.org/resources/contrastchecker/

**Testing Procedure:**

```bash
# 1. Navigate to WebAIM Contrast Checker
# 2. Enter foreground color (text color)
# 3. Enter background color
# 4. Verify contrast ratio:
#    - Normal text: ≥4.5:1 (WCAG AA)
#    - Large text (18pt+): ≥3:1 (WCAG AA)
```

**Color Combinations to Test:**

| Element | Foreground | Background | Expected Ratio | Pass/Fail |
|---------|-----------|------------|----------------|-----------|
| Active status | #2E7D32 | #FFFFFF | ≥4.5:1 | [ ] |
| Pending status | #F57C00 | #FFFFFF | ≥4.5:1 | [ ] |
| Suspended status | #D32F2F | #FFFFFF | ≥4.5:1 | [ ] |
| Inactive status | #757575 | #FFFFFF | ≥4.5:1 | [ ] |
| Primary button text | #FFFFFF | #1976D2 | ≥4.5:1 | [ ] |
| Warning message | #D32F2F | #FFEBEE | ≥4.5:1 | [ ] |
| Success message | #2E7D32 | #E8F5E9 | ≥4.5:1 | [ ] |

---

### 2. Browser DevTools Contrast Check

**Chrome DevTools:**

```bash
# 1. Inspect element with text
# 2. In Styles panel, click color swatch
# 3. Color picker shows contrast ratio
# 4. Verify green checkmarks for AA/AAA compliance
```

**Firefox DevTools:**

```bash
# 1. Inspect element
# 2. Accessibility panel shows contrast ratio
# 3. Verify "Contrast: Pass" indicator
```

---

## WCAG 2.1 Compliance Checklist

### Perceivable

**1.1 Text Alternatives**
- [ ] All images have alt text (DA-002)
- [ ] Decorative images have alt=""
- [ ] Icon buttons have aria-label

**1.3 Adaptable**
- [ ] Proper heading hierarchy (h1 → h2 → h3)
- [ ] Form inputs have associated labels
- [ ] Tables have <th> headers
- [ ] Semantic HTML (nav, main, section)

**1.4 Distinguishable**
- [ ] Color contrast ≥4.5:1 (DA-001)
- [ ] Text resizable to 200% without loss of function
- [ ] No information conveyed by color alone
- [ ] Focus visible on all interactive elements

---

### Operable

**2.1 Keyboard Accessible**
- [ ] All functionality keyboard accessible (DA-003)
- [ ] No keyboard traps (except modals)
- [ ] Focus indicators visible (2px outline)
- [ ] Skip navigation link available

**2.4 Navigable**
- [ ] Descriptive page titles
- [ ] Logical focus order
- [ ] Clear link text (no "click here")
- [ ] Multiple ways to find pages (menu, search)

**2.5 Input Modalities**
- [ ] Touch targets ≥44x44px (DA-006)
- [ ] Pointer cancellation (click on mouseup)
- [ ] Label in name matches accessible name

---

### Understandable

**3.1 Readable**
- [ ] Page language declared (lang="en")
- [ ] Section language changes marked
- [ ] Unusual words have definitions

**3.2 Predictable**
- [ ] Navigation consistent across pages
- [ ] Components behave consistently
- [ ] Forms have clear labels and instructions

**3.3 Input Assistance**
- [ ] Form errors identified clearly (DA-007)
- [ ] Labels or instructions for inputs
- [ ] Error suggestions provided
- [ ] Error prevention for critical actions (confirmations)

---

### Robust

**4.1 Compatible**
- [ ] Valid HTML (no parse errors)
- [ ] ARIA attributes used correctly (DA-002, DA-004)
- [ ] Status messages announced to screen readers
- [ ] Name, role, value for all custom components

---

## Testing Frequency

### Daily (During Development)
- Run axe DevTools on changed components
- Test keyboard navigation on new forms
- Verify focus indicators visible

### Weekly (During Sprint)
- Full Playwright accessibility test suite
- NVDA screen reader testing on critical paths
- Color contrast verification on new components

### Monthly (Pre-Release)
- Comprehensive WCAG 2.1 checklist review
- User testing with people with disabilities
- Mobile touch testing on real devices
- VoiceOver testing on iOS/macOS

### Quarterly (Continuous Improvement)
- WCAG 2.1 compliance audit
- Update test suite with new accessibility patterns
- Review and update accessibility documentation

---

## Resources

### Tools
- **axe DevTools:** https://www.deque.com/axe/devtools/
- **WAVE:** https://wave.webaim.org/
- **NVDA:** https://www.nvaccess.org/
- **Contrast Checker:** https://webaim.org/resources/contrastchecker/

### Documentation
- **WCAG 2.1 Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Authoring Practices:** https://www.w3.org/WAI/ARIA/apg/
- **MDN Accessibility:** https://developer.mozilla.org/en-US/docs/Web/Accessibility

### Training
- **WebAIM Articles:** https://webaim.org/articles/
- **Deque University:** https://dequeuniversity.com/
- **A11ycasts (YouTube):** https://www.youtube.com/playlist?list=PLNYkxOF6rcICWx0C9LVWWVqvHlYJyqw7g

---

**Next Steps:**
1. Run automated tests with axe DevTools
2. Test keyboard navigation on all components
3. Verify screen reader announcements with NVDA
4. Test touch targets on mobile devices
5. Document all findings in test report
6. Create GitHub/Azure DevOps issues for failures
7. Retest after fixes until 100% compliant
