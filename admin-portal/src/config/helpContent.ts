/**
 * Centralized help content for contextual tooltips and panels
 * Used throughout the application to provide consistent user assistance
 */

export const helpContent = {
  // ==========================================
  // Member Registration & Management
  // ==========================================

  legalName:
    'The official registered name of your organization as it appears on legal documents and government registrations.',

  lei: 'Legal Entity Identifier - A unique 20-character alphanumeric code (ISO 17442) that identifies your legal entity globally. Required for financial and regulatory reporting.',

  kvk: 'Chamber of Commerce number (KvK-nummer) - An 8-digit number required for Dutch companies. Used to verify company registration in the Netherlands.',

  domain:
    "Your organization's email domain (e.g., example.com). Used for user authentication and email validation. All users must have email addresses within this domain.",

  orgId:
    'Organization identifier in the format "org:company-name". This is auto-generated from your legal name and used as a unique key throughout the system.',

  authenticationTier:
    'Authentication tier determines data access level:\n\n' +
    'Tier 1 (eHerkenning): Full access - read, write, publish sensitive data. Requires eHerkenning EH3/EH4 authentication.\n\n' +
    'Tier 2 (DNS Verification): Sensitive data read + webhook configuration. Requires DNS TXT record verification. Re-verification every 90 days.\n\n' +
    'Tier 3 (Email + KvK): Public data only. Default tier for email-verified members with KvK document upload.\n\n' +
    'Members can upgrade their tier after registration by completing additional verification steps.',

  // ==========================================
  // Contact Management
  // ==========================================

  contactType:
    'Primary contacts receive important notifications and system updates. Technical contacts handle API integration and technical issues. Billing contacts receive invoices and payment notices.',

  isPrimaryContact:
    'Mark this as the primary contact for your organization. There should be at least one primary contact who serves as the main point of communication.',

  emailFormat:
    "Must be a valid email address within your organization's verified domain. Used for notifications and authentication.",

  contactPhone:
    'Business phone number including country code (e.g., +31 20 1234567). Used for urgent communications.',

  contactMobile:
    'Mobile phone number for SMS notifications and urgent alerts. Optional but recommended for critical updates.',

  jobTitle:
    "The contact's role within your organization (e.g., IT Manager, Supply Chain Director). Helps us route communications appropriately.",

  department:
    'The organizational department this contact belongs to (e.g., IT, Operations, Finance). Used for better communication routing.',

  // ==========================================
  // Identifier Management
  // ==========================================

  identifierType:
    'EORI: Economic Operators Registration and Identification (EU customs)\nSCAC: Standard Carrier Alpha Code (shipping)\nUNLOC: UN Location Code (ports and terminals)\nOther: Custom identifier types',

  identifierValue:
    'The unique identifier value. Format depends on the type selected. EORI: NL123456789000, SCAC: ABCD, UNLOC: NLRTM',

  identifierCountry:
    'The country that issued this identifier. Required for EORI numbers and helps with validation.',

  identifierVerification:
    'Verified identifiers have been validated against authoritative sources and can be trusted by other parties. Unverified identifiers require manual review.',

  // ==========================================
  // Endpoint Management
  // ==========================================

  endpointUrl:
    'HTTPS URL where your system receives webhook notifications. Must be publicly accessible and return 2xx status codes. We recommend using a dedicated endpoint for CTN webhooks.',

  endpointAuth:
    'Bearer token used to authenticate incoming webhook requests to your endpoint. Include this in your Authorization header validation. Keep this secret secure.',

  endpointEvents:
    'Select which event types trigger notifications to this endpoint. You can subscribe to booking updates, status changes, document submissions, etc.',

  endpointRetry:
    'Webhooks are automatically retried up to 5 times with exponential backoff (1s, 2s, 4s, 8s, 16s) if delivery fails. Check your endpoint logs if you experience delivery issues.',

  // ==========================================
  // BVAD (Business Verified API Data)
  // ==========================================

  bvadPurpose:
    'BVAD provides cryptographically signed, verified legal entity data for API consumers. This reduces verification overhead, improves trust, and accelerates onboarding.',

  bvadTerms:
    'By generating BVAD, you agree that the data will be shared with authorized API consumers who request verified information about your organization. The data is read-only and time-limited.',

  bvadExpiration:
    'BVADs expire after 90 days for security. Expired tokens cannot be validated. Generate a fresh BVAD when needed.',

  bvadFormat:
    'BVADs are JSON Web Tokens (JWT) signed with RS256. They contain your legal entity data, identifiers, and contacts in a standardized format.',

  // ==========================================
  // User Management
  // ==========================================

  userRole:
    'Association Admin: Full access to all features\nMember Admin: Manage own organization\nMember User: Read-only access\nAPI User: Programmatic access only',

  userEmail:
    "Must match your organization's verified domain. Used for authentication and notifications.",

  userMFA:
    'Multi-factor authentication adds an extra security layer. Required for admin users. Recommended for all users handling sensitive data.',

  // ==========================================
  // Orchestration
  // ==========================================

  orchestrationFlow:
    'An orchestration represents a complete workflow from booking to delivery, involving multiple parties (shipper, carrier, terminal, customs) and systems.',

  orchestrationParty:
    'Each party in the orchestration has a specific role (shipper, carrier, consignee) and contributes data at different stages of the process.',

  orchestrationStatus:
    'Tracks the current state: Draft, Active, Completed, Cancelled. Status updates trigger webhook notifications to subscribed endpoints.',

  webhookRetry:
    'Failed webhook deliveries are automatically retried up to 5 times with exponential backoff. Check the delivery log for retry history and error details.',

  // ==========================================
  // Document Upload
  // ==========================================

  kvkDocument:
    'Upload an official KvK extract (Uittreksel Kamer van Koophandel) dated within the last 3 months. Accepted formats: PDF, JPEG, PNG. Maximum size: 5MB.',

  documentVerification:
    'Documents are reviewed by CTN staff within 2 business days. You will receive email notification when verification is complete.',
};

export type HelpContentKey = keyof typeof helpContent;
