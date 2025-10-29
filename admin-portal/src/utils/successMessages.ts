/**
 * Success Confirmation Messages (DA-010)
 *
 * Provides consistent, informative success messages for CRUD operations
 * Helps users understand what action was completed and its result
 *
 * Last updated: October 29, 2025
 */

export interface SuccessMessageConfig {
  title: string;
  message: string;
  duration?: number; // milliseconds, defaults to 3000
  action?: {
    label: string;
    description: string;
  };
}

/**
 * Success messages for member operations
 */
export const memberSuccessMessages = {
  created: (name: string): SuccessMessageConfig => ({
    title: 'Member created successfully',
    message: `${name} has been added to the Association Register`,
    duration: 4000,
  }),
  updated: (name: string): SuccessMessageConfig => ({
    title: 'Member updated',
    message: `Changes to ${name} have been saved`,
    duration: 3000,
  }),
  deleted: (name: string): SuccessMessageConfig => ({
    title: 'Member deleted',
    message: `${name} has been removed from the register`,
    duration: 4000,
  }),
  statusChanged: (name: string, newStatus: string): SuccessMessageConfig => ({
    title: 'Status updated',
    message: `${name} is now ${newStatus.toLowerCase()}`,
    duration: 3000,
  }),
  bulkExported: (count: number, format: string): SuccessMessageConfig => ({
    title: 'Export completed',
    message: `${count} member${count !== 1 ? 's' : ''} exported to ${format.toUpperCase()}`,
    duration: 3000,
  }),
} as const;

/**
 * Success messages for contact operations
 */
export const contactSuccessMessages = {
  created: (name: string): SuccessMessageConfig => ({
    title: 'Contact added',
    message: `${name} has been added as a contact`,
    duration: 3000,
  }),
  updated: (name: string): SuccessMessageConfig => ({
    title: 'Contact updated',
    message: `Changes to ${name} have been saved`,
    duration: 3000,
  }),
  deleted: (name: string): SuccessMessageConfig => ({
    title: 'Contact removed',
    message: `${name} has been removed from contacts`,
    duration: 3000,
  }),
  setPrimary: (name: string): SuccessMessageConfig => ({
    title: 'Primary contact updated',
    message: `${name} is now the primary contact`,
    duration: 3000,
  }),
} as const;

/**
 * Success messages for identifier operations
 */
export const identifierSuccessMessages = {
  created: (type: string, value: string): SuccessMessageConfig => ({
    title: 'Identifier added',
    message: `${type}: ${value} has been configured`,
    duration: 3000,
  }),
  updated: (type: string): SuccessMessageConfig => ({
    title: 'Identifier updated',
    message: `${type} has been updated successfully`,
    duration: 3000,
  }),
  deleted: (type: string): SuccessMessageConfig => ({
    title: 'Identifier removed',
    message: `${type} has been removed`,
    duration: 3000,
  }),
  verified: (type: string): SuccessMessageConfig => ({
    title: 'Verification complete',
    message: `${type} has been verified successfully`,
    duration: 4000,
  }),
  documentUploaded: (type: string): SuccessMessageConfig => ({
    title: 'Document uploaded',
    message: `Verification document for ${type} uploaded successfully`,
    duration: 3000,
  }),
} as const;

/**
 * Success messages for endpoint operations
 */
export const endpointSuccessMessages = {
  created: (url: string): SuccessMessageConfig => ({
    title: 'Endpoint added',
    message: `Endpoint ${url} has been configured`,
    duration: 3000,
  }),
  updated: (url: string): SuccessMessageConfig => ({
    title: 'Endpoint updated',
    message: `Changes to ${url} have been saved`,
    duration: 3000,
  }),
  deleted: (url: string): SuccessMessageConfig => ({
    title: 'Endpoint removed',
    message: `${url} has been removed`,
    duration: 3000,
  }),
  tested: (url: string, success: boolean): SuccessMessageConfig => ({
    title: success ? 'Connection successful' : 'Connection failed',
    message: success
      ? `Successfully connected to ${url}`
      : `Unable to connect to ${url}. Please check the endpoint configuration`,
    duration: 4000,
  }),
} as const;

/**
 * Success messages for token/API operations
 */
export const tokenSuccessMessages = {
  generated: (): SuccessMessageConfig => ({
    title: 'API token generated',
    message: 'Your new API token is ready. Make sure to copy it now - you won\'t be able to see it again',
    duration: 6000,
    action: {
      label: 'Copy Token',
      description: 'Copy to clipboard',
    },
  }),
  copied: (): SuccessMessageConfig => ({
    title: 'Token copied',
    message: 'API token copied to clipboard',
    duration: 2000,
  }),
  revoked: (name: string): SuccessMessageConfig => ({
    title: 'Token revoked',
    message: `API token "${name}" has been revoked and is no longer valid`,
    duration: 4000,
  }),
  m2mCreated: (name: string): SuccessMessageConfig => ({
    title: 'M2M client created',
    message: `Service account "${name}" has been configured successfully`,
    duration: 3000,
  }),
} as const;

/**
 * Success messages for task/workflow operations
 */
export const taskSuccessMessages = {
  approved: (itemName: string): SuccessMessageConfig => ({
    title: 'Approved',
    message: `${itemName} has been approved`,
    duration: 3000,
  }),
  rejected: (itemName: string, reason?: string): SuccessMessageConfig => ({
    title: 'Rejected',
    message: reason ? `${itemName} rejected: ${reason}` : `${itemName} has been rejected`,
    duration: 4000,
  }),
  completed: (taskName: string): SuccessMessageConfig => ({
    title: 'Task completed',
    message: `${taskName} has been marked as complete`,
    duration: 3000,
  }),
} as const;

/**
 * Success messages for user management
 */
export const userSuccessMessages = {
  invited: (email: string): SuccessMessageConfig => ({
    title: 'Invitation sent',
    message: `An invitation email has been sent to ${email}`,
    duration: 4000,
  }),
  updated: (name: string): SuccessMessageConfig => ({
    title: 'User updated',
    message: `Changes to ${name} have been saved`,
    duration: 3000,
  }),
  roleChanged: (name: string, newRole: string): SuccessMessageConfig => ({
    title: 'Role updated',
    message: `${name} is now a ${newRole}`,
    duration: 3000,
  }),
  deactivated: (name: string): SuccessMessageConfig => ({
    title: 'User deactivated',
    message: `${name} has been deactivated and can no longer access the system`,
    duration: 4000,
  }),
  reactivated: (name: string): SuccessMessageConfig => ({
    title: 'User reactivated',
    message: `${name} has been reactivated and can now access the system`,
    duration: 3000,
  }),
} as const;

/**
 * Success messages for document operations
 */
export const documentSuccessMessages = {
  uploaded: (filename: string): SuccessMessageConfig => ({
    title: 'Document uploaded',
    message: `${filename} uploaded successfully`,
    duration: 3000,
  }),
  downloaded: (filename: string): SuccessMessageConfig => ({
    title: 'Download started',
    message: `Downloading ${filename}`,
    duration: 2000,
  }),
  deleted: (filename: string): SuccessMessageConfig => ({
    title: 'Document deleted',
    message: `${filename} has been removed`,
    duration: 3000,
  }),
} as const;

/**
 * Success messages for settings/configuration
 */
export const settingsSuccessMessages = {
  saved: (): SuccessMessageConfig => ({
    title: 'Settings saved',
    message: 'Your changes have been saved successfully',
    duration: 3000,
  }),
  reset: (): SuccessMessageConfig => ({
    title: 'Settings reset',
    message: 'Settings have been reset to default values',
    duration: 3000,
  }),
  languageChanged: (language: string): SuccessMessageConfig => ({
    title: 'Language updated',
    message: `Interface language changed to ${language}`,
    duration: 3000,
  }),
} as const;

/**
 * Generic success messages
 */
export const genericSuccessMessages = {
  saved: (): SuccessMessageConfig => ({
    title: 'Saved',
    message: 'Your changes have been saved',
    duration: 3000,
  }),
  created: (itemType: string): SuccessMessageConfig => ({
    title: `${itemType} created`,
    message: `New ${itemType.toLowerCase()} created successfully`,
    duration: 3000,
  }),
  updated: (itemType: string): SuccessMessageConfig => ({
    title: `${itemType} updated`,
    message: `${itemType} updated successfully`,
    duration: 3000,
  }),
  deleted: (itemType: string): SuccessMessageConfig => ({
    title: `${itemType} deleted`,
    message: `${itemType} deleted successfully`,
    duration: 3000,
  }),
} as const;

/**
 * Helper function to get success message configuration
 * Provides type-safe access to success messages
 */
export const getSuccessMessage = (
  category: 'member' | 'contact' | 'identifier' | 'endpoint' | 'token' | 'task' | 'user' | 'document' | 'settings' | 'generic',
  operation: string,
  ...args: any[]
): SuccessMessageConfig => {
  const categoryMap = {
    member: memberSuccessMessages,
    contact: contactSuccessMessages,
    identifier: identifierSuccessMessages,
    endpoint: endpointSuccessMessages,
    token: tokenSuccessMessages,
    task: taskSuccessMessages,
    user: userSuccessMessages,
    document: documentSuccessMessages,
    settings: settingsSuccessMessages,
    generic: genericSuccessMessages,
  };

  const messages = categoryMap[category];
  const messageFn = messages[operation as keyof typeof messages];

  if (typeof messageFn === 'function') {
    return messageFn(...args);
  }

  return genericSuccessMessages.saved();
};
