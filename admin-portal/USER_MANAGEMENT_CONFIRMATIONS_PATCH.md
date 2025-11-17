# User Management - Confirmation Dialogs Integration

## Summary

This document describes the changes needed to integrate confirmation dialogs into the User Management component to prevent accidental destructive actions.

## Files Modified

### 1. `/admin-portal/src/components/common/ConfirmDialog.tsx` (NEW - COMPLETED)

✅ **Status: CREATED**

A reusable confirmation dialog component with the following features:
- Three variants: `danger` (red), `warning` (yellow), `info` (blue)
- Loading state during async operations
- Keyboard support (Enter = confirm, Esc = cancel)
- Focus trap for WCAG 2.1 AA accessibility compliance
- Customizable title, message, and button labels

### 2. `/admin-portal/src/components/users/UserManagement.tsx` (REQUIRES MANUAL INTEGRATION)

Add the following changes:

#### Step 1: Add Import (Line 26)
```typescript
import { ConfirmDialog } from '../common/ConfirmDialog';
```

#### Step 2: Add State (After line 48, after `actionInProgress` state)
```typescript
  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    opened: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    onConfirm: () => void | Promise<void>;
    variant: 'danger' | 'warning' | 'info';
  }>({
    opened: false,
    title: '',
    message: '',
    confirmLabel: '',
    onConfirm: () => {},
    variant: 'danger',
  });
```

#### Step 3: Add Helper Functions (After line 175, after `handleUpdateUser`)
```typescript
  const showConfirmation = (
    title: string,
    message: string,
    confirmLabel: string,
    onConfirm: () => void | Promise<void>,
    variant: 'danger' | 'warning' | 'info' = 'danger'
  ) => {
    setConfirmDialog({
      opened: true,
      title,
      message,
      confirmLabel,
      onConfirm,
      variant,
    });
  };

  const closeConfirmation = () => {
    setConfirmDialog((prev) => ({ ...prev, opened: false }));
  };

  const handleToggleUserStatusClick = (user: User, newStatus: boolean) => {
    const action = newStatus ? 'enable' : 'disable';
    showConfirmation(
      t(`userManagement.confirmations.${action}User.title`),
      t(`userManagement.confirmations.${action}User.message`, { userName: user.name }),
      t(`userManagement.confirmations.${action}User.confirm`),
      async () => {
        await handleToggleUserStatus(user.id, newStatus);
      },
      'danger'
    );
  };
```

#### Step 4: Update Mobile View (Line ~300)
**CHANGE FROM:**
```typescript
onClick={() => handleToggleUserStatus(user.id, !user.enabled)}
```

**CHANGE TO:**
```typescript
onClick={() => handleToggleUserStatusClick(user, !user.enabled)}
```

#### Step 5: Update Desktop View (Line ~428)
**CHANGE FROM:**
```typescript
onClick={(e: React.MouseEvent) => {
  e.stopPropagation();
  handleToggleUserStatus(record.id, !record.enabled);
}}
```

**CHANGE TO:**
```typescript
onClick={(e: React.MouseEvent) => {
  e.stopPropagation();
  handleToggleUserStatusClick(record, !record.enabled);
}}
```

#### Step 6: Add Dialog Component (Before closing `</RoleGuard>`, around line 582)
```typescript
        {/* Confirmation Dialog */}
        <ConfirmDialog
          opened={confirmDialog.opened}
          onClose={closeConfirmation}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          variant={confirmDialog.variant}
        />
```

### 3. Translation Files (COMPLETED)

✅ **Status: ALL UPDATED**

#### `/admin-portal/src/locales/en/translation.json`
Added `userManagement.confirmations` section with:
- `disableUser`: Title, message, and confirm button label
- `enableUser`: Title, message, and confirm button label

#### `/admin-portal/src/locales/nl/translation.json`
Added complete `userManagement` section (was missing) including confirmations in Dutch.

#### `/admin-portal/src/locales/de/translation.json`
Added complete `userManagement` section (was missing) including confirmations in German.

## Confirmation Dialogs Implemented

### 1. Disable User Confirmation
- **When**: User clicks "Disable" button on an active user account
- **Title**: "Disable User Account" (translated)
- **Message**: "Are you sure you want to disable {{userName}}? They will no longer be able to sign in to the application." (translated)
- **Confirm Button**: "Disable User" (red, danger variant)
- **Cancel Button**: "Cancel"

### 2. Enable User Confirmation
- **When**: User clicks "Enable" button on a disabled user account
- **Title**: "Enable User Account" (translated)
- **Message**: "Are you sure you want to enable {{userName}}? They will be able to sign in to the application." (translated)
- **Confirm Button**: "Enable User" (red, danger variant)
- **Cancel Button**: "Cancel"

## UX Improvements

1. **Safety Net**: Prevents accidental clicks from immediately disabling user accounts
2. **Clear Communication**: Users see exactly what will happen before confirming
3. **Contextual Information**: User's name is shown in the confirmation message
4. **Consistent Experience**: Same confirmation pattern across mobile and desktop views
5. **Accessibility**: Full keyboard support (Enter/Esc), focus management, screen reader support
6. **Loading States**: Buttons show loading indicator during async operations
7. **Multi-language Support**: All text fully translated (EN/NL/DE)

## Testing Checklist

- [ ] Disable user - Desktop view shows confirmation dialog
- [ ] Disable user - Mobile view shows confirmation dialog
- [ ] Enable user - Desktop view shows confirmation dialog
- [ ] Enable user - Mobile view shows confirmation dialog
- [ ] Click "Cancel" - Dialog closes without action
- [ ] Click "Disable User" - User is disabled after confirmation
- [ ] Click "Enable User" - User is enabled after confirmation
- [ ] Press ESC - Dialog closes
- [ ] Press Enter - Confirms action
- [ ] Loading state shown during API call
- [ ] Error handling if API call fails
- [ ] Confirmation messages shown in English
- [ ] Confirmation messages shown in Dutch
- [ ] Confirmation messages shown in German
- [ ] Keyboard navigation works (Tab, Enter, Esc)
- [ ] Screen reader announces dialog title and message

## Next Steps

To complete the integration:

1. Apply the changes from Steps 1-6 above to `UserManagement.tsx`
2. Run `npm run build` to verify TypeScript compilation
3. Test in browser with all scenarios from testing checklist
4. Verify translations in all three languages (EN/NL/DE)
5. Test keyboard navigation and screen reader support

## Notes

- The linter may auto-format code after saving - verify imports remain intact
- All translations follow the same pattern as existing userManagement strings
- ConfirmDialog component is reusable for other destructive actions in the future
- Component follows WCAG 2.1 AA standards for accessibility
