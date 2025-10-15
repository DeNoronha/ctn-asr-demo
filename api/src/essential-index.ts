// Essential functions for demo - member and admin portals
console.log('Loading essential functions for demo...');

// Health check and BDI
import './functions/healthCheck';
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

// KvK verification
import './functions/getFlaggedEntities';

console.log('✓ Essential functions loaded');
