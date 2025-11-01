// Production index with all critical functions
console.log('Starting production API...');

// Health and monitoring
import './functions/healthCheck';
import './functions/bdiJwks';

// Member portal functions
import './functions/GetAuthenticatedMember';
import './functions/UpdateMemberProfile';
import './functions/GetMemberContacts';
import './functions/CreateMemberContact';
import './functions/UpdateMemberContact';
import './functions/GetMemberEndpoints';
import './functions/CreateMemberEndpoint';
import './functions/GetMemberTokens';

// Admin portal - Member management
import './functions/GetMembers';
import './functions/GetMember';
import './functions/CreateMember';
import './functions/IssueToken';

// Admin portal - Legal entity management
import './functions/GetLegalEntity';
import './functions/UpdateLegalEntity';

// Admin portal - Contact management
import './functions/GetContacts';
import './functions/CreateContact';
import './functions/UpdateContact';
import './functions/DeleteContact';

// Admin portal - KvK verification
import './functions/uploadKvkDocument';
import './functions/getKvkVerificationStatus';
import './functions/reviewKvkVerification';
import './functions/getFlaggedEntities';

// Multi-system endpoint management
import './functions/getEndpointsByEntity';
import './functions/createEndpoint';
import './functions/updateEndpoint';
import './functions/issueEndpointToken';
import './functions/getEndpointTokens';

// BDI integration
import './functions/generateBvad';
import './functions/validateBvod';

// Admin portal expansion
import './functions/getTasks';
import './functions/createTask';
import './functions/updateTask';

// API documentation
import './functions/swagger';

// Event Grid
import './functions/EventGridHandler';

console.log('✓ All production functions loaded successfully');
