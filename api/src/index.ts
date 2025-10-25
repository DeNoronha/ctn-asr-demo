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

// Member portal (critical)
import './functions/GetAuthenticatedMember';
import './functions/UpdateMemberProfile';

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
import './functions/IssueToken';

// Legal Entity Identifiers (KvK, LEI, EORI, etc.) - CRITICAL for admin portal
import './functions/GetIdentifiers';
import './functions/CreateIdentifier';
import './functions/UpdateIdentifier';
import './functions/DeleteIdentifier';
import './functions/GenerateEUID';
import './functions/FetchLEI';

// Endpoint management
import './functions/getEndpointsByEntity';
import './functions/createEndpoint';
import './functions/updateEndpoint';
import './functions/issueEndpointToken';
import './functions/getEndpointTokens';

// Authentication & Party Resolution
import './functions/ResolveParty';

// Audit Logs
import './functions/GetAuditLogs';

// Orchestration (graph database - Cosmos DB Gremlin API)
import './functions/GetOrchestrations';
import './functions/GetOrchestrationDetails';
import './functions/GetEvents';
import './functions/GetWebhooks';

// KvK verification
import './functions/getFlaggedEntities';
import './functions/uploadKvkDocument';
import './functions/getKvkVerificationStatus';
import './functions/reviewKvkVerification';

// Diagnostics
import './functions/DiagnosticCheck';
import './functions/CreateIdentifierSimple';

// API Documentation
import './functions/swagger';

console.log('✓ Essential functions loaded');
