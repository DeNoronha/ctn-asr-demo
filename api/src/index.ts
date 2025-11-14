// Essential functions for demo - member and admin portals
console.log('Loading essential functions for demo...');

// Initialize Application Insights telemetry
import { initializeTelemetry } from './utils/telemetry';
initializeTelemetry();

// Run startup diagnostics to detect configuration/deployment issues
import { performStartupDiagnostics } from './utils/startup-diagnostics';
performStartupDiagnostics();

// Health check and BDI
import './functions/healthCheck';
import './functions/GetVersion';
import './functions/bdiJwks';
import './functions/generateBvad';

// Public endpoints
import './functions/registerMember';

// Application management (admin)
import './functions/GetApplications';
import './functions/ApproveApplication';
import './functions/RejectApplication';

// Member portal (critical)
import './functions/GetAuthenticatedMember';
import './functions/UpdateMemberProfile';
import './functions/GetMemberContacts';
import './functions/GetMemberEndpoints';
import './functions/GetMemberTokens';

// Admin portal (critical)
import './functions/GetMembers';
import './functions/GetMember';
import './functions/GetLegalEntity';
import './functions/UpdateLegalEntity';
import './functions/GetContacts';
import './functions/CreateContact';
import './functions/UpdateContact';
import './functions/DeleteContact';
import './functions/CreateMember';
import './functions/UpdateMemberStatus';
import './functions/IssueToken';

// Legal Entity Identifiers (KvK, LEI, EORI, etc.) - CRITICAL for admin portal
import './functions/GetIdentifiers';
import './functions/CreateIdentifier';
import './functions/UpdateIdentifier';
import './functions/DeleteIdentifier';
import './functions/GenerateEUID';
import './functions/FetchLEI';

// Endpoint management
import './functions/ManageEndpoints'; // Merged GET/POST endpoints (was createEndpoint + getEndpointsByEntity)
import './functions/updateEndpoint';
import './functions/issueEndpointToken';
import './functions/getEndpointTokens';
import './functions/EndpointRegistrationWorkflow';

// M2M Client Management
import './functions/ManageM2MClients';

// Authentication & Party Resolution
import './functions/ResolveParty';

// Audit Logs
import './functions/GetAuditLogs';

// Task Management
import './functions/getTasks';
import './functions/createTask';
import './functions/updateTask';

// Event management
import './functions/GetEvents';
import './functions/GetWebhooks';

// KvK verification
import './functions/getFlaggedEntities';
import './functions/uploadKvkDocument';
import './functions/getKvkVerificationStatus';
import './functions/reviewKvkVerification';
import './functions/getKvkRegistryData';

// Generic Identifier Verification (LEI, EORI, DUNS, etc.)
import './functions/GetIdentifierVerifications';
import './functions/UploadIdentifierVerification';

// Diagnostics
import './functions/DiagnosticCheck';
import './functions/CreateIdentifierSimple';

// API Documentation
import './functions/swagger';

// M2M Authentication Endpoints (external systems)
import './functions/GetETAUpdates';
import './functions/GetContainerStatus';
import './functions/ManageBookings';

// Three-Tier Authentication System
import './functions/TierManagement';

// Event Grid Handler for email notifications
import './functions/EventGridHandler';

console.log('✓ Essential functions loaded');
