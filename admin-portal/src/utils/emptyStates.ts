/**
 * Standardized Empty State Messages (DA-009)
 *
 * Provides consistent, helpful empty state messaging across all manager components
 * Includes primary message, helpful hint, and actionable next steps
 *
 * Last updated: October 29, 2025
 */

export interface EmptyStateConfig {
  message: string;
  hint?: string;
  action?: {
    label: string;
    suggestion: string; // What this action will do
  };
}

/**
 * Empty states for member management
 */
export const memberEmptyStates = {
  noMembers: {
    message: 'No members yet',
    hint: 'Add your first member to get started with the Association Register',
    action: {
      label: 'Add Member',
      suggestion: 'Create a new member organization',
    },
  },
  noSearchResults: {
    message: 'No members found',
    hint: 'Try adjusting your search terms or filters',
  },
  noFilterResults: {
    message: 'No members match these filters',
    hint: 'Try removing some filters or broadening your search criteria',
    action: {
      label: 'Clear Filters',
      suggestion: 'Reset all active filters',
    },
  },
} as const;

/**
 * Empty states for contact management
 */
export const contactEmptyStates = {
  noContacts: {
    message: 'No contacts added yet',
    hint: 'Add contacts to manage communication with this organization',
    action: {
      label: 'Add Contact',
      suggestion: 'Create a new contact person',
    },
  },
  noSearchResults: {
    message: 'No contacts found',
    hint: 'Try a different search term',
  },
} as const;

/**
 * Empty states for identifier management
 */
export const identifierEmptyStates = {
  noIdentifiers: {
    message: 'No identifiers configured',
    hint: 'Add identifiers like EUID, LEI, or DUNS to uniquely identify this organization',
    action: {
      label: 'Add Identifier',
      suggestion: 'Configure an organization identifier',
    },
  },
  noVerificationRecords: {
    message: 'No verification records',
    hint: 'Upload verification documents to validate organization identifiers',
  },
} as const;

/**
 * Empty states for endpoint management
 */
export const endpointEmptyStates = {
  noEndpoints: {
    message: 'No API endpoints configured',
    hint: 'Add endpoints to enable API communication with this organization',
    action: {
      label: 'Add Endpoint',
      suggestion: 'Configure an API endpoint',
    },
  },
} as const;

/**
 * Empty states for token management
 */
export const tokenEmptyStates = {
  noTokens: {
    message: 'No API tokens generated',
    hint: 'Generate an API token to enable secure API access',
    action: {
      label: 'Generate Token',
      suggestion: 'Create a new API access token',
    },
  },
  noM2MClients: {
    message: 'No machine-to-machine clients',
    hint: 'Create M2M clients for automated API integrations',
    action: {
      label: 'Add M2M Client',
      suggestion: 'Configure a service account',
    },
  },
} as const;

/**
 * Empty states for task/workflow management
 */
export const taskEmptyStates = {
  noTasks: {
    message: 'No tasks pending',
    hint: 'All caught up! New tasks will appear here when actions are required',
  },
  noReviewItems: {
    message: 'No items awaiting review',
    hint: 'New submissions will appear here for your approval',
  },
  noKvkDocuments: {
    message: 'No KvK documents uploaded',
    hint: 'Upload Chamber of Commerce (KvK) documents for verification',
    action: {
      label: 'Upload Document',
      suggestion: 'Add a KvK registration document',
    },
  },
} as const;

/**
 * Empty states for audit/logging
 */
export const auditEmptyStates = {
  noAuditLogs: {
    message: 'No audit logs',
    hint: 'Activity logs will appear here as users perform actions',
  },
  noFilteredLogs: {
    message: 'No logs match these criteria',
    hint: 'Try adjusting your filters or date range',
    action: {
      label: 'Clear Filters',
      suggestion: 'Reset all active filters',
    },
  },
} as const;

/**
 * Empty states for user management
 */
export const userEmptyStates = {
  noUsers: {
    message: 'No users configured',
    hint: 'Invite users to collaborate on the Association Register',
    action: {
      label: 'Invite User',
      suggestion: 'Send an invitation email',
    },
  },
} as const;

/**
 * Generic empty states for reuse
 */
export const genericEmptyStates = {
  noData: {
    message: 'No data available',
    hint: 'Data will appear here once added',
  },
  loadingError: {
    message: 'Unable to load data',
    hint: 'Please try refreshing the page or contact support if the problem persists',
    action: {
      label: 'Retry',
      suggestion: 'Attempt to reload the data',
    },
  },
  noPermission: {
    message: 'Access restricted',
    hint: "You don't have permission to view this content. Contact your administrator if you need access",
  },
  comingSoon: {
    message: 'Feature coming soon',
    hint: 'This functionality is currently under development',
  },
} as const;

/**
 * Helper function to get empty state configuration
 * Provides type-safe access to empty state messages
 */
export const getEmptyState = (
  category:
    | 'member'
    | 'contact'
    | 'identifier'
    | 'endpoint'
    | 'token'
    | 'task'
    | 'audit'
    | 'user'
    | 'generic',
  type: string
): EmptyStateConfig => {
  const categoryMap = {
    member: memberEmptyStates,
    contact: contactEmptyStates,
    identifier: identifierEmptyStates,
    endpoint: endpointEmptyStates,
    token: tokenEmptyStates,
    task: taskEmptyStates,
    audit: auditEmptyStates,
    user: userEmptyStates,
    generic: genericEmptyStates,
  };

  const states = categoryMap[category];
  return states[type as keyof typeof states] || genericEmptyStates.noData;
};
