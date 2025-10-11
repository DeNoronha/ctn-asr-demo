// Import all functions to register them with Azure Functions runtime
import './functions/GetMembers';
import './functions/GetMember';
import './functions/GetAuthenticatedMember';
import './functions/CreateMember';
import './functions/IssueToken';
import './functions/EndpointManagement';
import './functions/GetLegalEntity';
import './functions/UpdateLegalEntity';
import './functions/GetContacts';
import './functions/CreateContact';
import './functions/UpdateContact';
import './functions/DeleteContact';

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
