# Keyboard Shortcuts & Navigation Guide

**Last Updated:** October 29, 2025

This document outlines keyboard navigation patterns and shortcuts implemented in the Admin Portal for WCAG 2.1 AA compliance (DA-003).

---

## Global Navigation

### Skip Navigation
- **Tab** (on page load) → Reveals "Skip to main content" link
- **Enter** (on skip link) → Jumps directly to main content area

### Focus Management
- **Tab** → Move focus forward through interactive elements
- **Shift + Tab** → Move focus backward through interactive elements
- **Escape** → Close modals, dialogs, and dropdowns

---

## Dialog & Modal Navigation

### Confirm Dialogs
- **Tab / Shift + Tab** → Navigate between Cancel and Confirm buttons (focus trapped within dialog)
- **Escape** → Cancel and close dialog
- **Enter** (on focused button) → Activate button
- **Auto-focus** → Cancel button focused by default (safe for destructive actions)

### Form Dialogs
- **Tab** → Navigate through form fields
- **Escape** → Close dialog without saving
- **Enter** (in text input) → Submit form (if valid)

---

## Grid & Table Navigation

### Members Grid
- **Arrow Keys** → Navigate between cells (Kendo Grid default)
- **Tab** → Move to next focusable element (action buttons, filters)
- **Enter** (on action button) → View member details or perform action
- **Space** (on checkbox) → Select/deselect row

### Filter & Search
- **Ctrl + F** → Focus on search input (global shortcut)
- **Enter** (in search field) → Apply search filter
- **Escape** (in search field) → Clear search

---

## Form Validation

### Inline Validation
- **Blur** (leaving field) → Triggers validation for that field
- **Invalid field** → Shows error message immediately
- **Valid field** → Shows checkmark indicator

### Keyboard-Accessible Validation Patterns
- First/Last Name: Minimum 2 characters
- Email: Standard email format (name@company.com)
- Phone: International format (+XX XX XXX XXXX)

---

## Dropdown & Select Lists

### Kendo DropDownList
- **Arrow Down** → Open dropdown list
- **Arrow Up/Down** → Navigate through options
- **Enter** → Select highlighted option and close
- **Escape** → Close dropdown without selecting
- **Home** → Jump to first option
- **End** → Jump to last option
- **Type character** → Jump to first option starting with that character

---

## Screen Reader Announcements

### ARIA Live Regions
- **Empty States** → Announced with `role="status"` and `aria-live="polite"`
- **Progress Indicators** → Announced with progress percentage (`aria-valuenow`, `aria-valuetext`)
- **Status Changes** → Status badges use `role="status"` for automatic announcements

### Descriptive Labels
- **Action Buttons** → Include context in aria-label (e.g., "Delete John Doe contact")
- **Form Fields** → Clear labels with validation hints
- **Icons** → Decorative icons marked with `aria-hidden="true"`

---

## Tooltips & Help

### Tooltip Activation
- **Hover** → Shows tooltip after short delay
- **Focus** → Shows tooltip immediately (keyboard users)
- **Escape** → Hides tooltip

### Help Icons
- **Tab** to focus on help icon (?)
- **Enter** or **Space** → Shows expanded help content
- **Escape** → Hides help content

---

## Accessibility Utilities

### Focus Trap Hook (`useFocusTrap`)
Traps keyboard focus within modal dialogs to prevent navigation behind the modal.

```typescript
const dialogRef = useRef<HTMLDivElement>(null);
useFocusTrap(dialogRef, isDialogOpen, handleClose);
```

### Arrow Key Navigation (`useArrowKeyNav`)
Enables arrow key navigation through lists and menus.

```typescript
const listRef = useRef<HTMLUListElement>(null);
useArrowKeyNav(listRef, 'li[role="option"]', handleSelect);
```

### Keyboard Shortcuts Hook (`useKeyboardShortcuts`)
Registers global keyboard shortcuts.

```typescript
useKeyboardShortcuts({
  'ctrl+s': handleSave,
  'ctrl+f': handleSearch,
  'escape': handleClose
}, isEnabled);
```

### Skip to Main Content (`useSkipToMain`)
Provides skip navigation functionality.

```typescript
const skipToMain = useSkipToMain('main-content');
```

---

## Testing Keyboard Navigation

### Manual Testing Checklist
1. **Unplug mouse** and use only keyboard for 5 minutes
2. **Tab through entire page** - ensure all interactive elements are focusable
3. **Test modals** - ensure focus is trapped and Escape works
4. **Test forms** - ensure validation works without mouse
5. **Test grids** - ensure arrow keys and Tab work as expected

### Screen Reader Testing
1. **Windows:** NVDA (free, recommended)
2. **macOS:** VoiceOver (built-in, Cmd+F5 to toggle)
3. **Test patterns:**
   - Skip links announced correctly
   - Status changes announced
   - Form errors announced
   - Progress indicators announced

### Automated Testing
```bash
# Run axe-core accessibility tests
npm run test:a11y

# Run Playwright tests with keyboard navigation
npm run test:e2e -- --grep "@keyboard"
```

---

## Common Keyboard Patterns (ARIA Authoring Practices)

### Dialog Pattern
- Focus moves to dialog when opened
- Tab/Shift+Tab cycles through interactive elements within dialog
- Escape closes dialog
- Focus returns to trigger element on close

### Menu Pattern
- Arrow keys navigate menu items
- Enter activates menu item
- Escape closes menu

### Combobox Pattern
- Arrow Down opens dropdown
- Arrow Up/Down navigates options
- Enter selects option
- Escape closes without selecting

---

## Browser Support

Keyboard navigation is tested and supported in:
- **Chrome/Edge:** Full support
- **Firefox:** Full support
- **Safari:** Full support (macOS requires "Tab highlights all items" in System Preferences)

---

## Resources

- [WCAG 2.1 Keyboard Accessible (2.1)](https://www.w3.org/WAI/WCAG21/Understanding/keyboard)
- [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Keyboard Accessibility](https://webaim.org/articles/keyboard/)
- [Kendo UI Accessibility](https://www.telerik.com/kendo-react-ui/components/accessibility/)

---

## Implementation Status

✅ **Completed (DA-003):**
- Skip to main content link
- Dialog keyboard navigation (ConfirmDialog)
- Focus management utilities
- ARIA roles and labels for key components
- Keyboard shortcuts documentation

⏳ **Pending:**
- Additional dialog components (EditUserDialog, InviteUserDialog, MemberDetailDialog)
- Grid keyboard shortcuts (Ctrl+F for search)
- Custom dropdown keyboard enhancements

---

## Support & Feedback

If you encounter keyboard navigation issues:
1. **Report issue:** Include browser, screen reader (if applicable), and steps to reproduce
2. **Priority:** Keyboard navigation bugs are classified as accessibility blockers (P1)
3. **Testing:** All keyboard navigation changes require manual keyboard-only testing before merge
