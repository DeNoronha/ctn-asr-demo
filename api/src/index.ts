// ========================================
// Azure Functions App Entry Point
// ========================================

// Startup validation - ensures all required secrets are configured
import { enforceStartupValidation } from './utils/startupValidation';

// Temporarily disabled to debug deployment issue
// try {
//   enforceStartupValidation();
// } catch (error) {
//   console.error('Failed to start API:', error);
//   throw error; // Fail fast if validation fails
// }
console.log('⚠️  Startup validation temporarily disabled for debugging');

// Test function first
import './functions/simpleTest';

// Import all functions to register them with Azure Functions runtime
import './functions/GetMembers';
import './functions/GetMember';
import './functions/GetAuthenticatedMember';
import './functions/CreateMember';
import './functions/IssueToken';
// import './functions/EndpointManagement';  // Disabled - replaced by individual endpoint functions
import './functions/GetLegalEntity';
import './functions/UpdateLegalEntity';
import './functions/GetContacts';
import './functions/CreateContact';
import './functions/UpdateContact';
import './functions/DeleteContact';

// Legal Entity Identifiers (KvK, LEI, EORI, etc.)
import './functions/GetIdentifiers';
import './functions/CreateIdentifier';
import './functions/UpdateIdentifier';
import './functions/DeleteIdentifier';
import './functions/CreateIdentifierSimple';

// Member self-service functions
import './functions/UpdateMemberProfile';
import './functions/GetMemberContacts';
import './functions/CreateMemberContact';
import './functions/UpdateMemberContact';
import './functions/GetMemberEndpoints';
import './functions/CreateMemberEndpoint';
import './functions/GetMemberTokens';

// Event Grid and notifications
import './functions/EventGridHandler';

// KvK Document Verification
import './functions/uploadKvkDocument';
import './functions/getKvkVerificationStatus';
import './functions/reviewKvkVerification';
import './functions/getFlaggedEntities';

// Multi-System Endpoint Management
import './functions/getEndpointsByEntity';
import './functions/createEndpoint';
import './functions/updateEndpoint';
import './functions/issueEndpointToken';
import './functions/getEndpointTokens';

// API Documentation
import './functions/swagger';

// Health Check
import './functions/healthCheck';

// Admin Portal Expansion (Subscriptions, Newsletters, Tasks)
import './functions/getSubscriptions';
import './functions/createSubscription';
import './functions/updateSubscription';
import './functions/getNewsletters';
import './functions/createNewsletter';
import './functions/getTasks';
import './functions/createTask';
import './functions/updateTask';

// BDI Integration (BVAD & BVOD)
import './functions/bdiJwks';
import './functions/generateBvad';
import './functions/validateBvod';
