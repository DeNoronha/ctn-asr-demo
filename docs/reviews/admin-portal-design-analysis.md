# UI/UX Design Analysis - CTN Admin Portal

**Analysis Date:** October 25, 2025
**Analyst:** Design Analyst (DA)
**Scope:** Admin Portal Components (LoginPage, AdminPortal, AdminSidebar, Dashboard, MembersGrid)

---

## UI/UX Review Summary

This comprehensive analysis examines the CTN Admin Portal's user experience, accessibility compliance (WCAG 2.1 AA), responsive design, and Kendo UI implementation. The portal demonstrates **solid enterprise UX foundations** with consistent branding, professional aesthetics, and functional component library usage. However, several **critical accessibility violations** and **important UX improvements** are needed before production deployment.

**Overall Assessment:**
- **Design Quality:** 7.5/10 - Strong visual design with accessibility gaps
- **Accessibility Compliance:** 5/10 - Multiple WCAG 2.1 AA violations identified
- **Responsive Design:** 7/10 - Good mobile considerations but incomplete
- **Component Library Usage:** 8/10 - Appropriate Kendo UI implementation
- **i18n/Localization:** 6/10 - Partial implementation, needs completion
- **Readiness:** **Needs Revision** - Critical accessibility issues must be addressed

---

## Critical Issues 🔴

### A1. Keyboard Navigation - Sidebar Menu Items (WCAG 2.1.1)

**Location:** `admin-portal/src/components/AdminSidebar.tsx` (Lines 68-80)

**Problem:** Sidebar menu items use `<div>` elements with `onClick` handlers instead of semantic interactive elements, making them **completely inaccessible via keyboard navigation**. Users cannot tab to menu items or activate them with Enter/Space keys.

```tsx
// CURRENT (INACCESSIBLE):
<div
  key={index}
  className={`drawer-item ${isSelected ? 'selected' : ''}`}
  onClick={() => handleItemClick(item)}
>
```

**User Impact:**
- Screen reader users cannot navigate the application
- Keyboard-only users (mobility impairments) cannot access any features
- **WCAG 2.1.1 Level A violation** (Critical)
- Fails automated accessibility audits

**Solution:**
```tsx
// RECOMMENDED FIX:
<button
  key={index}
  type="button"
  className={`drawer-item ${isSelected ? 'selected' : ''}`}
  onClick={() => handleItemClick(item)}
  aria-current={isSelected ? 'page' : undefined}
  aria-label={item.text}
>
  {IconComponent && (
    <span className="item-icon" aria-hidden="true">
      <IconComponent size={20} />
    </span>
  )}
  <span className="item-text">{item.text}</span>
</button>
```

**Additional Requirements:**
- Add `:focus-visible` styles in `AdminSidebar.css` with visible focus ring
- Test with keyboard navigation (Tab, Enter, Arrow keys)
- Verify screen reader announces "Dashboard, button, current page"

**Reference:** [WAI-ARIA Authoring Practices - Navigation](https://www.w3.org/WAI/ARIA/apg/patterns/navigation/)

---

### A2. Missing Form Labels - Search Input (WCAG 1.3.1, 3.3.2)

**Location:** `admin-portal/src/components/MembersGrid.tsx` (Lines 576-581)

**Problem:** Search input lacks a proper `<label>` element. While it has a `placeholder`, this does not meet WCAG requirements as placeholders are not read consistently by screen readers and disappear on focus.

```tsx
// CURRENT (WCAG VIOLATION):
<Input
  value={searchValue}
  onChange={handleSearchChange}
  placeholder={t('members.searchMembers')}
  style={{ width: '300px' }}
/>
```

**User Impact:**
- Screen reader users don't know the input's purpose
- Voice control users can't target "Search members" label
- **WCAG 1.3.1 Level A violation** (Critical)
- **WCAG 3.3.2 Level A violation** (Critical)

**Solution:**
```tsx
// RECOMMENDED FIX:
<div className="search-input-container">
  <label htmlFor="members-search" className="visually-hidden">
    {t('members.searchMembers')}
  </label>
  <Input
    id="members-search"
    value={searchValue}
    onChange={handleSearchChange}
    placeholder={t('members.searchMembers')}
    style={{ width: '300px' }}
    aria-label={t('members.searchMembers')}
  />
</div>
```

Add to CSS:
```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

**Reference:** [WCAG 1.3.1 - Info and Relationships](https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html)

---

### A3. Color Contrast Violations - Partner Logos

**Location:** `admin-portal/src/components/auth/LoginPage.css` (Lines 160-165)

**Problem:** Partner logos have `opacity: 0.7` applied, which may reduce color contrast below WCAG AA threshold of **4.5:1 for normal text** and **3:1 for large text/graphics**.

```css
/* CURRENT (POTENTIAL WCAG 1.4.3 VIOLATION): */
.partner-logos-login img {
  height: 28px;
  width: auto;
  opacity: 0.7;
  transition: opacity 0.2s;
}
```

**User Impact:**
- Low vision users struggle to identify partner brands
- **WCAG 1.4.3 Level AA violation** if contrast falls below 3:1
- Poor perception on low-quality displays

**Solution:**
```css
/* RECOMMENDED FIX: */
.partner-logos-login img {
  height: 28px;
  width: auto;
  opacity: 0.85; /* Increased from 0.7 for better contrast */
  transition: opacity 0.2s;
  filter: contrast(1.1); /* Enhance contrast */
}

.partner-logos-login img:hover,
.partner-logos-login img:focus {
  opacity: 1;
}
```

**Testing Required:**
- Use Chrome DevTools Lighthouse to verify contrast ratios
- Test with greyscale filter to ensure visibility
- Verify logos remain recognizable at reduced opacity

**Reference:** [WCAG 1.4.3 - Contrast (Minimum)](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

---

### A4. Missing Skip Navigation Link (WCAG 2.4.1)

**Location:** `admin-portal/src/components/AdminPortal.tsx` (Missing)

**Problem:** Application lacks a "Skip to main content" link, forcing keyboard users to tab through the entire sidebar menu (12+ items) on every page load to reach the main content area.

**User Impact:**
- Keyboard users waste significant time on every navigation
- **WCAG 2.4.1 Level A violation** (Bypass Blocks)
- Poor experience for screen reader users

**Solution:**

Add to `AdminPortal.tsx` after opening `<div className="app-container">`:

```tsx
return (
  <div className="app-container">
    <a href="#main-content" className="skip-link">
      {t('accessibility.skipToMain', 'Skip to main content')}
    </a>
    {/* Rest of component... */}
    <main id="main-content" className="content-area" tabIndex={-1}>
      {renderContent()}
    </main>
  </div>
);
```

Add to `App.css`:
```css
/* Skip link - visible only on keyboard focus */
.skip-link {
  position: absolute;
  top: -40px;
  left: 0;
  background: var(--ctn-orange);
  color: white;
  padding: 12px 24px;
  text-decoration: none;
  font-weight: 600;
  z-index: 1000;
  border-radius: 0 0 4px 0;
  transition: top 0.2s;
}

.skip-link:focus {
  top: 0;
  outline: 3px solid var(--ctn-dark-blue);
  outline-offset: 2px;
}
```

**Reference:** [WCAG 2.4.1 - Bypass Blocks](https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html)

---

### A5. Insufficient Focus Indicators (WCAG 2.4.7)

**Location:** `admin-portal/src/components/AdminSidebar.css`, `admin-portal/src/App.css`

**Problem:** Custom buttons and interactive elements lack visible keyboard focus indicators. The default browser focus outline is often removed without replacement.

**User Impact:**
- Keyboard users cannot track their position in the interface
- **WCAG 2.4.7 Level AA violation** (Critical)
- Unusable for users with cognitive disabilities who need visual focus tracking

**Solution:**

Add to `App.css`:
```css
/* Global focus indicator - WCAG 2.4.7 compliant */
*:focus-visible {
  outline: 3px solid var(--ctn-orange);
  outline-offset: 2px;
  border-radius: 2px;
}

/* Enhanced focus for sidebar items */
.drawer-item:focus-visible {
  outline: 3px solid var(--ctn-orange);
  outline-offset: -3px;
  background: rgba(255, 140, 0, 0.15);
}

/* Focus for Kendo UI buttons */
.k-button:focus-visible {
  outline: 3px solid var(--ctn-orange);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px rgba(255, 140, 0, 0.2);
}
```

**Testing Required:**
- Tab through entire interface with keyboard
- Verify focus indicator is always visible (minimum 3px solid)
- Ensure contrast ratio of focus indicator meets 3:1 against background

**Reference:** [WCAG 2.4.7 - Focus Visible](https://www.w3.org/WAI/WCAG21/Understanding/focus-visible.html)

---

### A6. Checkboxes Missing Labels - Grid Selection (WCAG 1.3.1)

**Location:** `admin-portal/src/components/MembersGrid.tsx` (Lines 448-468)

**Problem:** Checkbox inputs in grid rows lack associated `<label>` elements or `aria-label` attributes. Screen readers announce only "checkbox unchecked" without context.

```tsx
// CURRENT (INACCESSIBLE):
<td>
  <input
    type="checkbox"
    checked={isSelected}
    onChange={() => handleSelectRow(props.dataItem.org_id)}
  />
</td>
```

**User Impact:**
- Screen reader users don't know what the checkbox selects
- Voice control users can't target specific row checkboxes
- **WCAG 1.3.1 Level A violation**

**Solution:**
```tsx
// RECOMMENDED FIX:
const SelectionCell = (props: any) => {
  const isSelected = selectedIds.includes(props.dataItem.org_id);
  const memberName = props.dataItem.legal_name;
  return (
    <td>
      <input
        type="checkbox"
        id={`select-${props.dataItem.org_id}`}
        checked={isSelected}
        onChange={() => handleSelectRow(props.dataItem.org_id)}
        aria-label={t('members.selectMember', { name: memberName })}
      />
    </td>
  );
};

const SelectionHeaderCell = () => {
  const allSelected = gridData.length > 0 && selectedIds.length === gridData.length;
  return (
    <th>
      <input
        type="checkbox"
        checked={allSelected}
        onChange={handleSelectAll}
        aria-label={t('members.selectAllMembers', 'Select all members')}
      />
    </th>
  );
};
```

Add to translation files:
```json
{
  "members": {
    "selectMember": "Select {{name}}",
    "selectAllMembers": "Select all members"
  }
}
```

---

### A7. Error Message Not Announced - Login Error (WCAG 4.1.3)

**Location:** `admin-portal/src/components/auth/LoginPage.tsx` (Lines 57-62)

**Problem:** Login error message is visually displayed but not announced to screen readers. Users with visual impairments won't know authentication failed.

```tsx
// CURRENT (NOT ANNOUNCED TO SCREEN READERS):
{error && (
  <div className="login-error">
    <AlertCircle size={20} />
    <span>{error}</span>
  </div>
)}
```

**User Impact:**
- Screen reader users don't receive error feedback
- **WCAG 4.1.3 Level AA violation** (Status Messages)
- Authentication failures go unnoticed by blind users

**Solution:**
```tsx
// RECOMMENDED FIX:
{error && (
  <div
    className="login-error"
    role="alert"
    aria-live="assertive"
    aria-atomic="true"
  >
    <AlertCircle size={20} aria-hidden="true" />
    <span>{error}</span>
  </div>
)}
```

**Reference:** [WCAG 4.1.3 - Status Messages](https://www.w3.org/WAI/WCAG21/Understanding/status-messages.html)

---

## Important Improvements 🟡

### B1. Menu Button Toggle - Inconsistent Icon Direction

**Location:** `admin-portal/src/components/AdminPortal.tsx` (Lines 338-345)

**Current Approach:**
```tsx
<Button
  icon="menu"
  fillMode="flat"
  onClick={() => setDrawerExpanded(!drawerExpanded)}
  className="menu-button"
>
  {drawerExpanded ? '◀' : '▶'}
</Button>
```

**Issue:** Using Unicode arrow characters (`◀ ▶`) is inconsistent with the icon-based design system and may not render consistently across browsers/fonts.

**Recommended Approach:**
```tsx
import { ChevronLeft, ChevronRight, Menu } from './icons';

<Button
  fillMode="flat"
  onClick={() => setDrawerExpanded(!drawerExpanded)}
  className="menu-button"
  aria-label={drawerExpanded ? t('navigation.collapseSidebar') : t('navigation.expandSidebar')}
  aria-expanded={drawerExpanded}
>
  {drawerExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
</Button>
```

**Rationale:**
- Consistent icon usage from icon library
- Better accessibility with `aria-label` and `aria-expanded`
- Clearer visual metaphor with chevrons

**Example:** See Material-UI Drawer: [Persistent drawer](https://mui.com/material-ui/react-drawer/#persistent-drawer)

---

### B2. Partner Logo Layout - Fixed Height Issues

**Location:** `admin-portal/src/components/Dashboard.tsx` (Lines 261-277), `admin-portal/src/components/auth/LoginPage.tsx` (Lines 79-86)

**Current Approach:**
```tsx
// Dashboard has 4 logos: Portbase, Contargo, Inland Terminals, VanBerkel
// LoginPage has 3 logos: Contargo, Inland Terminals, VanBerkel
```

**Issue:** Inconsistent logo sets across pages and fixed-height images may distort logos with different aspect ratios.

**Recommended Approach:**

1. **Standardize logo set** across all pages (decide which logos to show)
2. **Use object-fit for consistent sizing:**

```css
/* admin-portal/src/components/Dashboard.css */
.logo-container {
  padding: 16px 24px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  transition: all 0.2s ease;
  width: 140px; /* Fixed width for consistency */
  height: 80px; /* Fixed height */
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-container img {
  max-height: 32px;
  max-width: 100%;
  width: auto;
  height: auto;
  display: block;
  object-fit: contain; /* Maintain aspect ratio */
}
```

**Enhancement:** Add tooltip with partner name on hover:
```tsx
<div className="logo-container" title="Contargo">
  <img src="/assets/logos/contargo.png" alt="Contargo" />
</div>
```

**Value:** Consistent branding, better visual hierarchy, improved mobile display

---

### B3. Loading States - Grid Pagination Feedback

**Location:** `admin-portal/src/components/MembersGrid.tsx` (Lines 630)

**Current Approach:**
```tsx
{loading && <span className="loading-indicator">⏳ {t('common.loading')}</span>}
```

**Issue:**
- Emoji-based loading indicator is not professional for enterprise UI
- Loading state in toolbar is easy to miss during pagination
- No loading overlay prevents accidental interactions during data fetch

**Recommended Approach:**

Add Kendo UI Loader component with overlay:

```tsx
import { Loader } from '@progress/kendo-react-indicators';

// In render:
<div className="members-grid-container" style={{ position: 'relative' }}>
  {loading && (
    <div className="grid-loading-overlay">
      <Loader size="large" type="converging-spinner" />
      <span className="sr-only">{t('common.loading')}</span>
    </div>
  )}

  {/* Advanced Filter Panel */}
  {showAdvancedFilter && (
    <AdvancedFilter onApply={handleAdvancedFilterApply} onClear={handleAdvancedFilterClear} />
  )}

  <Grid
    // ... grid props
  >
    {/* Grid content */}
  </Grid>
</div>
```

Add to CSS:
```css
.grid-loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 100;
  gap: 16px;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
```

**Rationale:** Professional loading indicator, prevents interaction during load, screen reader accessible

---

### B4. Empty State Consistency

**Location:** `admin-portal/src/components/AdminPortal.tsx` (Lines 187-203, 224-240, 301-322)

**Current Approach:** Multiple empty state implementations with inline styles and inconsistent messaging.

**Recommended Approach:**

Create reusable `EmptyState` component (already exists at `/admin-portal/src/components/EmptyState.tsx`):

```tsx
// Refactor all empty states to use:
import EmptyState from './EmptyState';

// Endpoints view empty state:
<EmptyState
  icon={<Plug size={48} />}
  title={t('endpoints.title')}
  message={t('endpoints.selectMemberFirst')}
  action={{
    label: t('navigation.members'),
    onClick: () => setSelectedView('members'),
    themeColor: 'primary'
  }}
/>

// Tokens view empty state:
<EmptyState
  icon={<Key size={48} />}
  title={t('tokens.noTokensYet')}
  message={t('tokens.noTokensGenerated')}
  action={{
    label: t('navigation.members'),
    onClick: () => setSelectedView('members'),
    themeColor: 'primary'
  }}
/>

// 404 Not Found:
<EmptyState
  icon="404"
  title={t('errors.pageNotFound')}
  message={t('errors.pageNotFoundMessage')}
  action={{
    label: t('common.goToDashboard'),
    onClick: () => setSelectedView('dashboard'),
    themeColor: 'primary'
  }}
/>
```

**Value:**
- Consistent UX across all empty states
- Centralized styling and behavior
- Easier to maintain and update
- Better mobile responsiveness

---

### B5. Status Badge Accessibility - Color + Text

**Location:** `admin-portal/src/components/MembersGrid.tsx` (Lines 392-416)

**Current Approach:** Status badges rely solely on color to convey meaning (green = active, orange = pending, red = suspended).

```tsx
const StatusCell = (props: any) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return '#10b981';
      case 'PENDING':
        return '#f59e0b';
      case 'SUSPENDED':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  return (
    <td>
      <span
        className="status-badge"
        style={{ backgroundColor: getStatusColor(props.dataItem.status) }}
      >
        {props.dataItem.status}
      </span>
    </td>
  );
};
```

**Issue:** Users with color blindness (8% of males, 0.5% of females) cannot distinguish status by color alone. WCAG 1.4.1 requires information not be conveyed by color only.

**Recommended Approach:**

Add icons to status badges:

```tsx
import { CheckCircle, Clock, XCircle, AlertCircle } from './icons';

const StatusCell = (props: any) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return { color: '#10b981', icon: CheckCircle, label: 'Active' };
      case 'PENDING':
        return { color: '#f59e0b', icon: Clock, label: 'Pending' };
      case 'SUSPENDED':
        return { color: '#ef4444', icon: XCircle, label: 'Suspended' };
      default:
        return { color: '#6b7280', icon: AlertCircle, label: 'Unknown' };
    }
  };

  const config = getStatusConfig(props.dataItem.status);
  const Icon = config.icon;

  return (
    <td>
      <span
        className="status-badge"
        style={{ backgroundColor: config.color }}
        role="status"
        aria-label={`Status: ${config.label}`}
      >
        <Icon size={14} aria-hidden="true" />
        <span>{props.dataItem.status}</span>
      </span>
    </td>
  );
};
```

Update CSS:
```css
.status-badge,
.membership-badge {
  padding: 4px 12px;
  border-radius: 12px;
  color: white;
  font-size: 12px;
  font-weight: 500;
  text-transform: uppercase;
  display: inline-flex; /* Changed from inline-block */
  align-items: center;
  gap: 6px; /* Space between icon and text */
}
```

**Rationale:**
- Complies with WCAG 1.4.1 (Use of Color)
- Better UX for colorblind users
- More scannable in dense data grids
- Professional enterprise aesthetic

---

### B6. Sidebar Collapse - State Persistence

**Location:** `admin-portal/src/components/AdminPortal.tsx` (Line 47)

**Current Approach:**
```tsx
const [drawerExpanded, setDrawerExpanded] = useState(true);
```

**Issue:** Sidebar collapse state resets on every page refresh, frustrating users who prefer a collapsed sidebar for screen real estate.

**Recommended Approach:**

Persist sidebar state in localStorage:

```tsx
const [drawerExpanded, setDrawerExpanded] = useState(() => {
  const saved = localStorage.getItem('sidebarExpanded');
  return saved !== null ? JSON.parse(saved) : true;
});

const handleDrawerToggle = useCallback(() => {
  setDrawerExpanded((prev) => {
    const newState = !prev;
    localStorage.setItem('sidebarExpanded', JSON.stringify(newState));
    return newState;
  });
}, []);

// Update button handler:
<Button
  fillMode="flat"
  onClick={handleDrawerToggle}
  className="menu-button"
  aria-label={drawerExpanded ? t('navigation.collapseSidebar') : t('navigation.expandSidebar')}
>
  {drawerExpanded ? '◀' : '▶'}
</Button>
```

**Enhancement:** Respect `prefers-reduced-motion` for sidebar transition:

```css
/* admin-portal/src/components/AdminSidebar.css */
.admin-sidebar {
  width: 280px;
  min-width: 280px;
  background: #1a4d6d;
  border-right: 3px solid #ff8c00;
  transition: width 0.3s ease, min-width 0.3s ease;
}

@media (prefers-reduced-motion: reduce) {
  .admin-sidebar {
    transition: none;
  }
}
```

**Value:** Better UX, respects user preferences, accessible motion handling

---

### B7. Grid Export - Filename Convention

**Location:** `admin-portal/src/components/MembersGrid.tsx` (Lines 347-361)

**Current Approach:**
```tsx
const fileName = exportToPDF(dataToExport, {
  title:
    selectedIds.length > 0
      ? `CTN Members Export (${selectedIds.length} selected)`
      : `CTN Members Export (All ${gridData.length} records)`,
  orientation: 'landscape',
  includeTimestamp: true,
});
```

**Issue:** Generated filename may not include timestamp or be predictable for batch exports.

**Recommended Approach:**

Standardize export filenames with timestamp:

```tsx
const handlePDFExport = () => {
  const dataToExport =
    selectedIds.length > 0 ? gridData.filter((m) => selectedIds.includes(m.org_id)) : gridData;

  const timestamp = new Date().toISOString().split('T')[0]; // 2025-10-25
  const recordCount = selectedIds.length > 0 ? `${selectedIds.length}_selected` : `${gridData.length}_all`;

  const fileName = exportToPDF(dataToExport, {
    filename: `CTN_Members_${recordCount}_${timestamp}.pdf`,
    title: `CTN Members Export`,
    subtitle: `${dataToExport.length} records | Generated: ${new Date().toLocaleDateString()}`,
    orientation: 'landscape',
    includeTimestamp: false, // Already in filename
  });

  notification.showSuccess(
    t('export.pdfSuccess', { count: dataToExport.length, filename: fileName })
  );
};

const handleCSVExport = () => {
  const dataToExport =
    selectedIds.length > 0 ? gridData.filter((m) => selectedIds.includes(m.org_id)) : gridData;

  const timestamp = new Date().toISOString().split('T')[0];
  const recordCount = selectedIds.length > 0 ? `${selectedIds.length}_selected` : `${gridData.length}_all`;

  exportToCSV(dataToExport, `CTN_Members_${recordCount}_${timestamp}.csv`);
  notification.showSuccess(
    t('export.csvSuccess', { count: dataToExport.length })
  );
};
```

**Value:**
- Predictable filenames for archival
- Easy to sort exports by date
- Clear record counts in filename
- Professional naming convention

---

### B8. Responsive Grid Toolbar

**Location:** `admin-portal/src/components/MembersGrid.css` (Lines 66-85)

**Current Approach:** Toolbar stacks vertically on mobile but loses horizontal alignment of stats.

**Issue:** On mobile devices (< 768px), toolbar becomes very tall with stacked buttons, reducing available grid space.

**Recommended Approach:**

Improve mobile toolbar layout:

```css
/* MembersGrid.css - Enhanced mobile responsiveness */
@media (max-width: 768px) {
  .grid-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .toolbar-left {
    flex-direction: column;
    width: 100%;
    gap: 8px;
  }

  .toolbar-left > * {
    width: 100%;
  }

  /* Search input full width on mobile */
  .toolbar-left .k-input {
    width: 100% !important;
  }

  /* Stack buttons in 2-column grid on mobile */
  .toolbar-left > .k-button,
  .toolbar-left > .k-dropdown-button {
    flex: 1 1 calc(50% - 4px);
    min-width: 0;
  }

  .toolbar-stats {
    justify-content: space-between;
    width: 100%;
    flex-wrap: wrap;
    gap: 8px;
  }

  .toolbar-stats span {
    flex: 1 1 auto;
    text-align: center;
    font-size: 12px;
    padding: 6px 8px;
  }
}

@media (max-width: 480px) {
  /* Single column on very small screens */
  .toolbar-left > .k-button,
  .toolbar-left > .k-dropdown-button {
    flex: 1 1 100%;
  }

  .toolbar-stats {
    font-size: 11px;
  }
}
```

**Value:** Better mobile usability, more grid space, professional mobile layout

---

## Suggestions 🟢

### C1. Add Keyboard Shortcuts for Power Users

**Location:** `admin-portal/src/components/AdminPortal.tsx`

**Enhancement:** Implement keyboard shortcuts for common actions:

- `Alt+D` - Go to Dashboard
- `Alt+M` - Go to Members
- `Alt+S` - Open Search
- `Alt+N` - New Member (if permission)
- `Esc` - Close dialogs/modals
- `?` - Show keyboard shortcut help

**Implementation:**

```tsx
// Add to AdminPortal.tsx
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Ignore if typing in input fields
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    if (e.altKey) {
      switch (e.key.toLowerCase()) {
        case 'd':
          e.preventDefault();
          setSelectedView('dashboard');
          break;
        case 'm':
          e.preventDefault();
          setSelectedView('members');
          break;
        // ... more shortcuts
      }
    }

    if (e.key === '?') {
      e.preventDefault();
      // Show keyboard shortcuts dialog
    }
  };

  document.addEventListener('keydown', handleKeyPress);
  return () => document.removeEventListener('keydown', handleKeyPress);
}, []);
```

**Value:** Increased efficiency for experienced users, better accessibility

---

### C2. Dashboard Chart Interactivity

**Location:** `admin-portal/src/components/Dashboard.tsx`

**Enhancement:** Make charts interactive with click-to-filter functionality.

**Example:**

```tsx
// Click on pie chart segment to filter members by status
const handleStatusChartClick = (data: any) => {
  if (data && data.name) {
    setSelectedView('members');
    // Pass filter to MembersGrid via URL params or context
    navigate(`/members?status=${data.name}`);
  }
};

<PieChart onClick={handleStatusChartClick}>
  {/* Chart content */}
</PieChart>
```

**Value:**
- More engaging dashboard
- Quick navigation to filtered data
- Better data exploration

---

### C3. Dark Mode Support

**Location:** `admin-portal/src/App.css`

**Enhancement:** Implement dark mode toggle respecting system preferences.

Add to root CSS variables:

```css
/* Light mode (default) */
:root {
  --ctn-dark-blue: #1a4d6d;
  --ctn-orange: #ff8c00;
  --ctn-light-blue: #00a3e0;
  --ctn-bg: #f8fafc;
  --ctn-text: #1e293b;
  --ctn-text-light: #64748b;
  --ctn-card-bg: #ffffff;
  --ctn-border: #e2e8f0;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --ctn-dark-blue: #00a3e0;
    --ctn-orange: #ff9f40;
    --ctn-light-blue: #60c9f0;
    --ctn-bg: #0f172a;
    --ctn-text: #f1f5f9;
    --ctn-text-light: #cbd5e1;
    --ctn-card-bg: #1e293b;
    --ctn-border: #334155;
  }
}

/* Manual dark mode override */
[data-theme="dark"] {
  --ctn-dark-blue: #00a3e0;
  --ctn-orange: #ff9f40;
  --ctn-light-blue: #60c9f0;
  --ctn-bg: #0f172a;
  --ctn-text: #f1f5f9;
  --ctn-text-light: #cbd5e1;
  --ctn-card-bg: #1e293b;
  --ctn-border: #334155;
}
```

**Value:**
- Better user experience in low-light environments
- Reduces eye strain for extended use
- Modern enterprise feature

---

### C4. Optimistic UI Updates

**Location:** `admin-portal/src/components/MembersGrid.tsx`

**Enhancement:** Show immediate feedback for bulk operations before API response.

```tsx
const executeBulkAction = async () => {
  setIsBulkProcessing(true);

  // Optimistic update - show "Processing..." badges immediately
  const updatedMembers = members.map((m) =>
    selectedIds.includes(m.org_id) ? { ...m, _processing: true } : m
  );
  setMembers(updatedMembers);

  try {
    // Perform actual operation
    const result = await performBulkOperation(selectedIds, bulkAction);

    // Update with real results
    await loadMembersData();

  } catch (error) {
    // Revert optimistic update on error
    setMembers(members);
    notification.showError(`Bulk action failed: ${error.message}`);
  } finally {
    setIsBulkProcessing(false);
  }
};
```

**Value:** Perceived performance improvement, better UX for slow connections

---

### C5. Advanced Export Options

**Location:** `admin-portal/src/components/MembersGrid.tsx`

**Enhancement:** Add export customization dialog:

- Select specific columns to export
- Choose date format
- Include/exclude filtered rows
- Email export to user

**Value:** More flexible reporting, better data portability

---

### C6. Recent Searches / Saved Filters

**Enhancement:** Allow users to save commonly used filter combinations.

```tsx
const [savedFilters, setSavedFilters] = useState<FilterPreset[]>([]);

interface FilterPreset {
  id: string;
  name: string;
  filter: CompositeFilterDescriptor;
  createdAt: Date;
}

// Save filter button
<Button onClick={() => saveCurrentFilter()}>
  Save Current Filter
</Button>

// Load saved filter
<DropDownButton
  text="Saved Filters"
  items={savedFilters.map(f => ({
    text: f.name,
    click: () => setFilter(f.filter)
  }))}
/>
```

**Value:** Efficiency for recurring analysis tasks

---

## Positive Highlights ✅

### What Was Done Well

1. **Consistent CTN Branding** - Excellent use of brand colors (#1a4d6d, #ff8c00, #00a3e0) throughout the interface. CSS custom properties make theming maintainable.

2. **Professional Enterprise Aesthetics** - Clean, modern design with appropriate use of white space, subtle shadows, and smooth transitions. The interface feels trustworthy and authoritative.

3. **Kendo UI Integration** - Proper use of Kendo React Grid with sorting, filtering, pagination, and column customization. The grid component is enterprise-grade.

4. **Responsive Design Foundation** - Media queries at appropriate breakpoints (768px, 480px) with thoughtful mobile considerations (hiding user details, stacking layouts).

5. **Loading State Management** - useAsync hook pattern for consistent loading state handling across the application.

6. **Translation Infrastructure** - i18next integration with proper namespace organization (`common`, `members`, `navigation`, `dashboard`).

7. **Component Modularity** - Well-separated concerns with dedicated components for EmptyState, LoadingSpinner, ConfirmDialog, etc.

8. **Print Stylesheet** - Comprehensive @media print styles in AdminPortal.css (lines 218-306) that hide interactive elements and optimize layout for printing.

9. **Icon Library** - Consistent use of custom icon components (instead of font icons) for better bundle size and accessibility potential.

10. **Form Validation** - Proper validation utilities in `/admin-portal/src/utils/validation.ts` for email, phone, KVK, LEI, EUID formats.

11. **Error Boundary** - Proper error boundary implementation prevents entire app crashes from component errors.

12. **Grid State Persistence** - useGridState hook persists pagination state in URL parameters, allowing users to bookmark filtered/paginated views.

13. **Bulk Operations** - Well-implemented bulk action pattern with confirmation dialogs and progress indicators.

14. **Partner Logo Section** - Professional presentation of partner brands with hover effects and proper spacing.

15. **Dashboard Visualizations** - Recharts integration with CTN-branded color scheme provides clear data visualization with pie, bar, and line charts.

---

## Accessibility Checklist ♿

### WCAG 2.1 AA Compliance Status

- [ ] **2.1.1 Keyboard** - Sidebar menu items not keyboard accessible (CRITICAL)
- [ ] **1.3.1 Info and Relationships** - Missing form labels on search input, checkboxes (CRITICAL)
- [ ] **2.4.1 Bypass Blocks** - No skip navigation link (CRITICAL)
- [ ] **2.4.7 Focus Visible** - Insufficient focus indicators on interactive elements (CRITICAL)
- [ ] **4.1.3 Status Messages** - Error messages not announced to screen readers (CRITICAL)
- [ ] **1.4.3 Contrast (Minimum)** - Partner logos may fail contrast at 0.7 opacity (REVIEW NEEDED)
- [x] **1.3.5 Identify Input Purpose** - Form inputs use appropriate autocomplete attributes
- [x] **2.4.2 Page Titled** - Page has descriptive title "CTN Association Register"
- [x] **2.5.3 Label in Name** - Button labels match visible text
- [x] **3.2.3 Consistent Navigation** - Sidebar navigation consistent across all views
- [x] **4.1.2 Name, Role, Value** - Most components use semantic HTML (buttons, nav, main)
- [ ] **1.4.1 Use of Color** - Status badges rely on color alone (needs icons)
- [ ] **2.4.6 Headings and Labels** - Some headings missing or non-hierarchical
- [ ] **3.3.1 Error Identification** - Form errors need better identification
- [x] **3.3.2 Labels or Instructions** - Most form fields have labels (except search)
- [x] **4.1.1 Parsing** - Valid HTML structure (React generates valid markup)

**Current Compliance Score:** ~60% - Needs significant accessibility work before production

**Priority Fixes Required:**
1. Fix sidebar keyboard navigation (A1)
2. Add skip navigation link (A4)
3. Add visible focus indicators (A5)
4. Label all form inputs properly (A2)
5. Add aria-live regions for dynamic content (A7)
6. Add icons to color-coded status badges (B5)

---

## Multi-Language Support 🌍

### i18n Implementation Status

- [x] **i18next configured** with language detection and backend
- [x] **Translation namespaces** organized by feature area
- [x] **LanguageSwitcher component** allows EN/NL/DE selection
- [x] **useTranslation hook** used consistently across components
- [ ] **Incomplete translation coverage** - Many hardcoded strings remain
- [ ] **RTL support** not implemented (if needed for future languages)
- [ ] **Number/date formatting** not localized
- [ ] **Pluralization rules** not consistently applied
- [ ] **Text expansion accommodation** - German strings may overflow containers

**Missing Translations Found:**

1. LoginPage.tsx - Line 42: "Secure Authentication Portal" (hardcoded)
2. AdminPortal.tsx - Line 189: "Select a member from the Members view..." (partially translated)
3. MembersGrid.tsx - Line 219: "Excel export temporarily disabled" (hardcoded alert)
4. Dashboard.tsx - Line 154: "Registered organizations" (fallback translation)

**Recommendations:**

1. **Complete translation audit** - Use grep to find all hardcoded strings:
   ```bash
   grep -r "\".*\"" admin-portal/src/components --include="*.tsx" | grep -v "t(" | grep -v "className"
   ```

2. **Add missing translation keys:**
   ```json
   {
     "auth": {
       "securePortal": "Secure Authentication Portal"
     },
     "members": {
       "selectMemberForEndpoints": "Select a member from the Members view to manage their endpoints."
     },
     "export": {
       "excelTemporarilyDisabled": "Excel export temporarily disabled"
     }
   }
   ```

3. **Test German translations** - Allocate +35% space for German text expansion:
   ```css
   .drawer-item .item-text {
     font-size: 14px;
     white-space: nowrap;
     overflow: hidden;
     text-overflow: ellipsis;
     max-width: 200px; /* Prevent overflow in German */
   }
   ```

4. **Localize dates and numbers:**
   ```tsx
   import { useTranslation } from 'react-i18next';

   const DateCell = (props: any) => {
     const { i18n } = useTranslation();
     const locale = i18n.language; // 'en', 'nl', 'de'

     return (
       <td>
         {new Date(props.dataItem[props.field || '']).toLocaleDateString(locale, {
           year: 'numeric',
           month: 'short',
           day: 'numeric'
         })}
       </td>
     );
   };
   ```

5. **Currency formatting:**
   ```tsx
   const formatCurrency = (amount: number, currency = 'EUR') => {
     const { i18n } = useTranslation();
     return new Intl.NumberFormat(i18n.language, {
       style: 'currency',
       currency: currency
     }).format(amount);
   };
   ```

**Translation Coverage:** ~70% - Good foundation but needs completion

---

## Responsive Design Testing 📱

### Breakpoint Analysis

| Breakpoint | Width | Status | Issues |
|------------|-------|--------|---------|
| Desktop | >1200px | ✅ Excellent | None - optimal experience |
| Tablet Landscape | 768px-1199px | ✅ Good | Charts stack appropriately |
| Tablet Portrait | 480px-767px | ⚠️ Fair | User details hidden, toolbar very tall |
| Mobile | <480px | ⚠️ Fair | App title hidden, logo size issues |

### Mobile-Specific Issues

1. **Header overcrowding** (< 480px):
   - Title "CTN Association Register" hidden
   - User name/role hidden
   - Only logo and logout button visible
   - **Fix:** Consider hamburger menu for user profile on mobile

2. **Sidebar behavior** on tablet:
   - Sidebar should auto-collapse on tablet portrait
   - Consider overlay sidebar instead of push-content on mobile
   - **Fix:** Add responsive sidebar mode

3. **Grid pagination** on mobile:
   - Kendo Grid pagination controls too wide for small screens
   - Page size selector overlaps with navigation buttons
   - **Fix:** Test Kendo Grid responsive mode, possibly hide page size selector on mobile

4. **Partner logos** on mobile:
   - 3-4 logos stacking causes very tall section
   - Consider carousel or grid layout on mobile
   - **Fix:** Implement 2-column grid on mobile instead of row

### Touch Target Sizes

**WCAG 2.5.5 requires minimum 44x44 CSS pixels for touch targets.**

| Element | Current Size | Compliant? | Fix Needed |
|---------|--------------|------------|------------|
| Sidebar menu items | 48px height | ✅ Yes | None |
| Action buttons (View/Edit) | ~32px | ❌ No | Increase to 44px |
| Grid checkboxes | 18px | ❌ No | Increase to 24px |
| Menu toggle button | ~40px | ⚠️ Borderline | Increase to 48px |
| Language switcher | ~36px | ❌ No | Increase to 44px |

**Recommended Fix:**

```css
/* Ensure touch-friendly sizes on mobile */
@media (max-width: 768px) {
  /* Increase button touch targets */
  .k-button {
    min-height: 44px;
    min-width: 44px;
    padding: 12px 16px;
  }

  /* Grid checkboxes */
  .k-grid td input[type="checkbox"],
  .k-grid th input[type="checkbox"] {
    width: 24px;
    height: 24px;
  }

  /* Sidebar items */
  .drawer-item {
    padding: 16px 20px; /* Increased from 14px */
    min-height: 48px;
  }

  /* Language switcher */
  .language-switcher button {
    min-height: 44px;
    padding: 10px 14px;
  }
}
```

---

## Overall Assessment

### Design Quality: 7.5/10

**Strengths:**
- Professional, clean, enterprise-appropriate design
- Consistent CTN branding throughout
- Good use of Kendo UI component library
- Solid responsive foundation
- Well-organized component structure

**Weaknesses:**
- Critical accessibility violations prevent production deployment
- Incomplete i18n coverage
- Some mobile UX refinements needed
- Missing advanced enterprise features (dark mode, keyboard shortcuts)

---

### Readiness: **Needs Revision**

**Before Production Deployment:**

**MUST FIX (Blockers):**
1. ✅ Fix sidebar keyboard navigation (A1) - **2-3 hours**
2. ✅ Add skip navigation link (A4) - **1 hour**
3. ✅ Add visible focus indicators (A5) - **2 hours**
4. ✅ Label all form inputs properly (A2, A6) - **3 hours**
5. ✅ Add ARIA live regions for status messages (A7) - **1 hour**
6. ✅ Test and fix color contrast issues (A3) - **2 hours**

**SHOULD FIX (Important):**
7. ⚠️ Add icons to status badges (B5) - **2 hours**
8. ⚠️ Improve loading state UX (B3) - **2 hours**
9. ⚠️ Standardize empty states (B4) - **3 hours**
10. ⚠️ Complete i18n translation coverage - **4-6 hours**
11. ⚠️ Increase touch target sizes on mobile - **2 hours**
12. ⚠️ Test with screen reader (NVDA, JAWS, VoiceOver) - **4 hours**

**NICE TO HAVE:**
- Dark mode support (C3)
- Keyboard shortcuts (C1)
- Interactive dashboard charts (C2)
- Saved filters (C6)

**Estimated Time to Production-Ready:** **20-25 hours** (blockers only), **35-45 hours** (including important fixes)

---

### Priority Issues (Top 3)

1. **Keyboard Navigation** (A1, A4, A5) - Critical accessibility blocker affecting ~15-20% of enterprise users who rely on keyboard navigation (mobility impairments, screen reader users, power users).

2. **Form Labels and ARIA** (A2, A6, A7) - Screen reader users cannot use the application effectively. This is a legal compliance risk under ADA/Section 508.

3. **Color Contrast** (A3) - Potential WCAG violation that affects low vision users and creates legal risk. Must be verified with automated tools.

---

### Next Steps

**Immediate Actions:**

1. **Run Automated Accessibility Audit**
   ```bash
   # Install axe-core CLI
   npm install -g @axe-core/cli

   # Run against deployed admin portal
   axe https://calm-tree-03352ba03.1.azurestaticapps.net --save results.json
   ```

2. **Manual Keyboard Testing**
   - Unplug mouse, navigate entire app with keyboard only
   - Document any unreachable elements
   - Verify focus order is logical

3. **Screen Reader Testing**
   - macOS VoiceOver: Cmd+F5, navigate admin portal
   - Windows NVDA: Download free, test member grid
   - Document announcements that are confusing/missing

4. **Color Contrast Verification**
   - Use Chrome DevTools Lighthouse
   - WebAIM Contrast Checker for all text/background combinations
   - Fix any ratios below 4.5:1 (text) or 3:1 (graphics)

5. **Create Accessibility Remediation Plan**
   - Assign issues to developers
   - Set target completion dates
   - Schedule accessibility QA before next release

**Long-term:**

- Establish accessibility testing in CI/CD pipeline
- Add axe-core React integration for dev-time checking
- Train team on WCAG 2.1 AA requirements
- Conduct annual accessibility audits

---

## Testing Recommendations

### Accessibility Testing Tools

**Automated:**
- **axe DevTools** (Chrome extension) - Free, comprehensive WCAG checks
- **Lighthouse** (Chrome DevTools) - Built-in accessibility audit
- **WAVE** (WebAIM) - Visual feedback on accessibility issues
- **Pa11y** - CI/CD integration for automated testing

**Manual:**
- **NVDA** (Windows) - Free screen reader
- **JAWS** (Windows) - Industry-standard screen reader (paid)
- **VoiceOver** (macOS/iOS) - Built-in screen reader
- **TalkBack** (Android) - Built-in screen reader
- **Keyboard-only navigation** - Unplug mouse, test all functionality

**Contrast:**
- **WebAIM Contrast Checker** - https://webaim.org/resources/contrastchecker/
- **Stark** (Figma/Browser) - Colorblindness simulator
- **Chrome DevTools** - Built-in contrast checker in Inspect Element

### Browser Testing Matrix

| Browser | Version | Platform | Priority |
|---------|---------|----------|----------|
| Chrome | Latest | Windows/Mac | High |
| Edge | Latest | Windows | High |
| Firefox | Latest | Windows/Mac | Medium |
| Safari | Latest | macOS/iOS | Medium |
| Chrome | Latest | Android | Low |

### Device Testing

- **Desktop:** 1920x1080, 1366x768 (common enterprise)
- **Tablet:** iPad Pro (1024x1366), Surface Pro (1368x912)
- **Mobile:** iPhone 13 (390x844), Samsung Galaxy (360x800)

---

## Recommended Design System Enhancements

Based on this analysis, consider creating:

1. **Accessibility Guidelines Document** - WCAG compliance checklist for developers
2. **Component Accessibility Specs** - Required ARIA attributes for each component
3. **Color Palette with Contrast Ratios** - Pre-approved color combinations
4. **Focus Indicator Standards** - Consistent focus styles across components
5. **Mobile Touch Target Guidelines** - Minimum sizes for all interactive elements
6. **i18n Best Practices** - Translation key naming, text expansion rules
7. **Responsive Breakpoint Guide** - When to stack/hide/transform layouts

---

## Resources and References

**WCAG 2.1 Guidelines:**
- https://www.w3.org/WAI/WCAG21/quickref/
- https://webaim.org/standards/wcag/checklist

**Kendo UI Accessibility:**
- https://www.telerik.com/kendo-react-ui/components/accessibility/
- https://www.telerik.com/kendo-react-ui/components/accessibility/keyboard-navigation/

**React Accessibility:**
- https://react.dev/learn/accessibility
- https://github.com/jsx-eslint/eslint-plugin-jsx-a11y

**Enterprise UX Patterns:**
- https://www.nngroup.com/articles/enterprise-ux/
- https://material.io/design/usability/accessibility.html

**Color Contrast Tools:**
- https://webaim.org/resources/contrastchecker/
- https://colorable.jxnblk.com/

---

**Report Generated:** October 25, 2025
**Next Review Recommended:** After accessibility fixes implementation (estimated 3-4 weeks)

---

## Appendix: Code Examples

### A. Complete Accessible Sidebar Example

```tsx
// admin-portal/src/components/AdminSidebar.tsx
import {
  Activity,
  CheckSquare,
  CreditCard,
  FileText,
  Info,
  Key,
  LayoutDashboard,
  Mail,
  Plug,
  Settings,
  Shield,
  Users,
} from './icons';
import type React from 'react';
import './AdminSidebar.css';

export interface MenuItem {
  text: string;
  iconComponent?: React.ComponentType<{ size?: number; className?: string }>;
  route?: string;
  separator?: boolean;
}

interface AdminSidebarProps {
  expanded: boolean;
  onSelect: (item: MenuItem) => void;
  selectedItem: string;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ expanded, onSelect, selectedItem }) => {
  const items: MenuItem[] = [
    { text: 'Dashboard', iconComponent: LayoutDashboard, route: 'dashboard' },
    { text: 'Members', iconComponent: Users, route: 'members' },
    { text: 'Endpoints', iconComponent: Plug, route: 'endpoints' },
    { text: 'Token Management', iconComponent: Key, route: 'tokens' },
    { separator: true, text: '' },
    { text: 'User Management', iconComponent: Shield, route: 'settings' },
    { text: 'Audit Logs', iconComponent: FileText, route: 'audit' },
    { text: 'Health Monitor', iconComponent: Activity, route: 'health' },
    { text: 'Settings', iconComponent: Settings, route: 'docs' },
    { text: 'About', iconComponent: Info, route: 'about' },
  ];

  const handleItemClick = (item: MenuItem) => {
    if (!item.separator) {
      onSelect(item);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, item: MenuItem) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleItemClick(item);
    }
  };

  return (
    <nav className={`admin-sidebar ${expanded ? '' : 'collapsed'}`} aria-label="Main navigation">
      <div className="sidebar-nav" role="list">
        {items.map((item, index) => {
          if (item.separator) {
            return <div key={`separator-${index}`} className="drawer-item separator" role="separator" aria-hidden="true" />;
          }

          const IconComponent = item.iconComponent;
          const isSelected = item.route === selectedItem;

          return (
            <button
              key={item.route}
              type="button"
              className={`drawer-item ${isSelected ? 'selected' : ''}`}
              onClick={() => handleItemClick(item)}
              onKeyDown={(e) => handleKeyDown(e, item)}
              aria-current={isSelected ? 'page' : undefined}
              aria-label={item.text}
              role="listitem"
            >
              {IconComponent && (
                <span className="item-icon" aria-hidden="true">
                  <IconComponent size={20} />
                </span>
              )}
              <span className="item-text">{item.text}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default AdminSidebar;
```

### B. Accessible Search Input Example

```tsx
// admin-portal/src/components/MembersGrid.tsx (excerpt)
<div className="search-input-group">
  <label htmlFor="members-search" className="visually-hidden">
    {t('members.searchMembers', 'Search members by name, ID, or identifier')}
  </label>
  <Input
    id="members-search"
    value={searchValue}
    onChange={handleSearchChange}
    placeholder={t('members.searchMembers')}
    style={{ width: '300px' }}
    aria-describedby="search-help"
  />
  <span id="search-help" className="visually-hidden">
    Search across legal name, organization ID, domain, LEI, EUID, and KVK number
  </span>
</div>
```

### C. Enhanced Status Badge with Icon

```tsx
import { CheckCircle, Clock, XCircle, AlertCircle } from './icons';

const StatusCell = (props: any) => {
  const getStatusConfig = (status: string) => {
    const configs = {
      ACTIVE: {
        color: '#10b981',
        icon: CheckCircle,
        label: 'Active',
        description: 'Member is active and in good standing'
      },
      PENDING: {
        color: '#f59e0b',
        icon: Clock,
        label: 'Pending',
        description: 'Application awaiting approval'
      },
      SUSPENDED: {
        color: '#ef4444',
        icon: XCircle,
        label: 'Suspended',
        description: 'Member access temporarily suspended'
      },
      TERMINATED: {
        color: '#6b7280',
        icon: AlertCircle,
        label: 'Terminated',
        description: 'Membership terminated'
      }
    };
    return configs[status] || configs.TERMINATED;
  };

  const config = getStatusConfig(props.dataItem.status);
  const Icon = config.icon;

  return (
    <td>
      <span
        className="status-badge"
        style={{ backgroundColor: config.color }}
        role="status"
        aria-label={`Status: ${config.label}`}
        title={config.description}
      >
        <Icon size={14} aria-hidden="true" />
        <span>{props.dataItem.status}</span>
      </span>
    </td>
  );
};
```

---

**End of Design Analysis Report**
