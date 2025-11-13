/**
 * ARIA Accessibility Utilities (DA-002)
 *
 * Provides consistent ARIA labels for common interactive elements
 * Ensures screen reader users can understand the purpose of icon-only buttons
 *
 * Last updated: October 29, 2025
 */

/**
 * ARIA label generator for common grid action buttons
 */
export const gridActionLabels = {
  edit: (itemName?: string) => (itemName ? `Edit ${itemName}` : 'Edit'),
  delete: (itemName?: string) => (itemName ? `Delete ${itemName}` : 'Delete'),
  view: (itemName?: string) => (itemName ? `View details for ${itemName}` : 'View details'),
  download: (itemName?: string) => (itemName ? `Download ${itemName}` : 'Download'),
  upload: () => 'Upload file',
  add: (itemType?: string) => (itemType ? `Add ${itemType}` : 'Add'),
  close: () => 'Close',
  save: () => 'Save changes',
  cancel: () => 'Cancel',
  refresh: () => 'Refresh data',
  filter: () => 'Filter results',
  search: () => 'Search',
  export: () => 'Export data',
  import: () => 'Import data',
  copy: () => 'Copy to clipboard',
  share: () => 'Share',
  print: () => 'Print',
  settings: () => 'Settings',
} as const;

/**
 * ARIA label generator for status-specific actions
 */
export const statusActionLabels = {
  approve: (itemName?: string) => (itemName ? `Approve ${itemName}` : 'Approve'),
  reject: (itemName?: string) => (itemName ? `Reject ${itemName}` : 'Reject'),
  suspend: (itemName?: string) => (itemName ? `Suspend ${itemName}` : 'Suspend'),
  activate: (itemName?: string) => (itemName ? `Activate ${itemName}` : 'Activate'),
  archive: (itemName?: string) => (itemName ? `Archive ${itemName}` : 'Archive'),
  restore: (itemName?: string) => (itemName ? `Restore ${itemName}` : 'Restore'),
} as const;

/**
 * ARIA label generator for form actions
 */
export const formActionLabels = {
  submit: (formName?: string) => (formName ? `Submit ${formName}` : 'Submit form'),
  reset: () => 'Reset form',
  clear: () => 'Clear all fields',
  previous: () => 'Previous step',
  next: () => 'Next step',
  finish: () => 'Finish and submit',
} as const;

/**
 * ARIA label generator for navigation actions
 */
export const navigationLabels = {
  menu: () => 'Open menu',
  back: () => 'Go back',
  forward: () => 'Go forward',
  home: () => 'Go to home page',
  profile: () => 'View profile',
  logout: () => 'Log out',
  help: () => 'Open help',
  notifications: (count?: number) => (count ? `Notifications (${count} unread)` : 'Notifications'),
} as const;

/**
 * Generates ARIA label for grid cell actions based on context
 *
 * @param action - The action type (edit, delete, view, etc.)
 * @param context - Optional context object with itemName or other details
 * @returns The appropriate ARIA label string
 *
 * @example
 * ```tsx
 * <Button aria-label={getGridActionLabel('edit', { itemName: member.legal_name })}>
 *   <Pencil size={16} />
 * </Button>
 * ```
 */
export const getGridActionLabel = (
  action: keyof typeof gridActionLabels,
  context?: { itemName?: string }
): string => {
  const labelFn = gridActionLabels[action];
  return labelFn(context?.itemName);
};

/**
 * Generates ARIA label for status actions based on context
 */
export const getStatusActionLabel = (
  action: keyof typeof statusActionLabels,
  context?: { itemName?: string }
): string => {
  const labelFn = statusActionLabels[action];
  return labelFn(context?.itemName);
};

/**
 * Generates ARIA label for form actions
 */
export const getFormActionLabel = (
  action: keyof typeof formActionLabels,
  context?: { formName?: string }
): string => {
  const labelFn = formActionLabels[action];
  return typeof labelFn === 'function' ? labelFn(context?.formName) : labelFn;
};

/**
 * Generates ARIA label for navigation actions
 */
export const getNavigationLabel = (
  action: keyof typeof navigationLabels,
  context?: { count?: number }
): string => {
  const labelFn = navigationLabels[action];
  return typeof labelFn === 'function' ? labelFn(context?.count) : labelFn;
};

/**
 * Common ARIA live region announcer for dynamic content updates
 * Use this for announcing status changes, data updates, etc. to screen readers
 */
export const announceToScreenReader = (
  message: string,
  priority: 'polite' | 'assertive' = 'polite'
): void => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only'; // Visually hidden but announced to screen readers
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement (give screen readers time to read it)
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * ARIA describedby ID generator for form field hints
 * Ensures unique IDs for ARIA relationships
 *
 * @example
 * ```tsx
 * <Input
 *   id="email"
 *   aria-describedby={getDescribedById('email', 'hint')}
 * />
 * <span id={getDescribedById('email', 'hint')}>
 *   Enter your business email address
 * </span>
 * ```
 */
export const getDescribedById = (fieldId: string, type: 'hint' | 'error' | 'success'): string => {
  return `${fieldId}-${type}`;
};

/**
 * ARIA invalid state handler for form validation
 * Returns appropriate aria-invalid and aria-describedby attributes
 */
export const getValidationProps = (
  fieldId: string,
  error?: string
): {
  'aria-invalid'?: boolean;
  'aria-describedby'?: string;
} => {
  if (error) {
    return {
      'aria-invalid': true,
      'aria-describedby': getDescribedById(fieldId, 'error'),
    };
  }
  return {};
};
